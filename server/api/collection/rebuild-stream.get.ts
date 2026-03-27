import { mcpCallTool, resetMcpSession, getMcpLog } from '~/server/utils/collectionConfig';
import { rawQsProperties } from '~/server/utils/collectionConfig';
import { setCachedCollection } from '~/server/api/collection/bootstrap.get';
import {
    getGuideDocumentNameByNeid,
    getGuideRelationshipOccurrencesByEndpoints,
    isGuideEventName,
    resolveCitationToDocumentNeid,
} from '~/server/utils/bnyGuide';
import {
    BNY_DOCUMENTS,
    BNY_DOCUMENT_NEIDS,
    HOP1_FLAVORS,
    EVENT_HUB_NEIDS,
    PROPERTY_BEARING_NEIDS,
    type EntityRecord,
    type RelationshipRecord,
    type EventRecord,
    type PropertySeriesRecord,
    type CollectionState,
} from '~/utils/collectionTypes';

// Probes derived from the ground-truth graph (recordeval_graph_extracted.json).
// Directions and source flavors match what the document-KG agent extracted.
// Ground truth directions:
//   fund_account   --fund_of-->             financial_instrument  (bond)
//   financial_instrument --issuer_of-->     organization
//   financial_instrument --trustee_of-->    organization
//   financial_instrument --beneficiary_of-> organization
//   financial_instrument --borrower_of-->   organization
//   fund_account   --holds_investment-->    financial_instrument
//   organization   --advisor_to-->          organization | legal_agreement
//   organization   --located_at-->          location
//   organization   --sponsor_of-->          organization
//   organization   --predecessor_of-->      organization
//   organization   --successor_to-->        organization
//   organization   --party_to-->            legal_agreement
//   person         --works_at-->            organization
// direction:'both' lets MCP find edges regardless of which end we query from.
const RELATIONSHIP_PROBE_GROUPS: Array<{
    sourceFlav: string;
    targetFlav: string;
    relTypes: string[];
}> = [
    // GT: fund_account --fund_of/holds_investment--> financial_instrument
    {
        sourceFlav: 'fund_account',
        targetFlav: 'financial_instrument',
        relTypes: ['fund_of', 'holds_investment'],
    },
    // GT: financial_instrument --issuer/trustee/beneficiary/borrower_of--> organization
    {
        sourceFlav: 'financial_instrument',
        targetFlav: 'organization',
        relTypes: ['issuer_of', 'trustee_of', 'beneficiary_of', 'borrower_of'],
    },
    // GT: organization --advisor_to/sponsor_of/predecessor_of/successor_to--> organization
    {
        sourceFlav: 'organization',
        targetFlav: 'organization',
        relTypes: ['advisor_to', 'sponsor_of', 'predecessor_of', 'successor_to'],
    },
    // GT: organization --advisor_to/party_to--> legal_agreement
    {
        sourceFlav: 'organization',
        targetFlav: 'legal_agreement',
        relTypes: ['advisor_to', 'party_to'],
    },
    { sourceFlav: 'organization', targetFlav: 'location', relTypes: ['located_at'] },
    { sourceFlav: 'person', targetFlav: 'organization', relTypes: ['works_at'] },
];

const FUND_ACCOUNT_HISTORY_PROPERTIES = [
    'current_fund_status',
    'computation_date_valuation',
    'gross_earnings',
    'internal_rate_of_return',
    'excess_earnings',
] as const;

const BOND_HISTORY_PROPERTIES = [
    'sources_of_funds_par_amount_bond_proceeds',
    'sources_of_funds_par_amount_prior_bond_proceeds',
    'sources_of_funds_par_amount_other_sources',
    'sources_of_funds_par_amount_total',
    'sources_of_funds_+_original_issue_premium_bond_proceeds',
    'sources_of_funds_+_original_issue_premium_prior_bond_proceeds',
    'sources_of_funds_+_original_issue_premium_other_sources',
    'sources_of_funds_+_original_issue_premium_total',
    'sources_of_funds_original_issue_discount_bond_proceeds',
    'sources_of_funds_original_issue_discount_prior_bond_proceeds',
    'sources_of_funds_original_issue_discount_other_sources',
    'sources_of_funds_original_issue_discount_total',
    'sources_of_funds_net_production_bond_proceeds',
    'sources_of_funds_net_production_prior_bond_proceeds',
    'sources_of_funds_net_production_other_sources',
    'sources_of_funds_net_production_total',
    'sources_of_funds_agency_contribution_bond_proceeds',
    'sources_of_funds_agency_contribution_prior_bond_proceeds',
    'sources_of_funds_agency_contribution_other_sources',
    'sources_of_funds_agency_contribution_total',
    'sources_of_funds_prior_bond_proceeds_bond_proceeds',
    'sources_of_funds_prior_bond_proceeds_prior_bond_proceeds',
    'sources_of_funds_prior_bond_proceeds_other_sources',
    'sources_of_funds_prior_bond_proceeds_total',
    'sources_of_funds_total_sources:_bond_proceeds',
    'sources_of_funds_total_sources:_prior_bond_proceeds',
    'sources_of_funds_total_sources:_other_sources',
    'sources_of_funds_total_sources:_total',
    'uses_of_funds_redemption_of_refunded_bonds_bond_proceeds',
    'uses_of_funds_redemption_of_refunded_bonds_prior_bond_proceeds',
    'uses_of_funds_redemption_of_refunded_bonds_other_sources',
    'uses_of_funds_redemption_of_refunded_bonds_total',
    'uses_of_funds_costs_of_issuance_other_sources',
    'uses_of_funds_costs_of_issuance_total',
    'uses_of_funds_debt_service_reserve_account_prior_bond_proceeds',
    'uses_of_funds_debt_service_reserve_account_total',
    'uses_of_funds_revenue_account_bond_proceeds',
    'uses_of_funds_revenue_account_total',
    "uses_of_funds_underwriter's_discount_other_sources",
    "uses_of_funds_underwriter's_discount_total",
    'uses_of_funds_total_uses:_bond_proceeds',
    'uses_of_funds_total_uses:_prior_bond_proceeds',
    'uses_of_funds_total_uses:_other_sources',
    'uses_of_funds_total_uses:_total',
] as const;

/** Strip leading zeros from NEIDs for consistent comparison across API responses. */
function normalizeNeid(neid: string): string {
    if (!neid) return neid;
    return neid.replace(/^0+(?=\d)/, '') || '0';
}

function addRelationship(
    relationships: RelationshipRecord[],
    seen: Set<string>,
    rel: RelationshipRecord
): void {
    const key = `${rel.sourceNeid}|${rel.targetNeid}|${rel.type}|${rel.sourceDocumentNeid ?? ''}|${rel.recordedAt ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    relationships.push(rel);
}

function normalizeName(name: string | undefined): string {
    return (name ?? '')
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\b(the|inc|llc|ltd|corp|corporation|co|company|na|assoc|association)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function uniqueStrings(values: Array<string | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

/**
 * Bounded-concurrency map — runs up to `concurrency` tasks in parallel.
 * JS single-threaded event loop means merges after each await are race-free.
 */
async function pMap<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency = 8): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let idx = 0;
    async function worker() {
        while (idx < items.length) {
            const i = idx++;
            results[i] = await fn(items[i]);
        }
    }
    const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
    await Promise.all(workers);
    return results;
}

async function callToolWithRetry<T>(
    toolName: string,
    args: Record<string, any>,
    options?: { timeoutMs?: number; attempts?: number }
): Promise<T> {
    const attempts = options?.attempts ?? 2;
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return (await mcpCallTool(toolName, args, {
                timeoutMs: options?.timeoutMs,
            })) as T;
        } catch (error) {
            lastError = error;
            if (attempt >= attempts) break;
        }
    }
    throw lastError;
}

export default defineEventHandler(async (event) => {
    setResponseHeaders(event, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    const send = (type: string, data: Record<string, unknown>) => {
        const payload = JSON.stringify({ type, ...data });
        event.node.res.write(`data: ${payload}\n\n`);
    };

    const sendStep = (
        step: number,
        status: 'working' | 'completed',
        label: string,
        detail?: string,
        durationMs?: number
    ) => {
        send('step', { step, status, label, detail, durationMs });
    };
    const sendMcpLogSnapshot = () => {
        send('mcplog', { entries: getMcpLog() });
    };

    // Keep SSE connection active in deployed environments that enforce idle timeouts.
    const heartbeat = setInterval(() => {
        send('heartbeat', { ts: new Date().toISOString() });
    }, 10_000);

    resetMcpSession();

    const entityMap = new Map<string, EntityRecord>();
    const relationships: RelationshipRecord[] = [];
    const relSeen = new Set<string>();
    const eventMap = new Map<string, EventRecord>();
    let t0 = Date.now();

    try {
        // ─── Phase 1: Entity Discovery (parallel) ─────────────────────
        // 5 docs × 6 flavors = 30 independent MCP calls — fan out in parallel.
        t0 = Date.now();
        sendStep(
            1,
            'working',
            'Entity Discovery',
            'Scanning 5 BNY documents across 6 entity types (parallel)...'
        );

        const phase1Tasks = BNY_DOCUMENT_NEIDS.flatMap((docNeid) =>
            HOP1_FLAVORS.map((flavor) => ({ docNeid, flavor }))
        );
        const phase1Failures: Array<{ docNeid: string; flavor: string }> = [];
        let phase1Completed = 0;

        await pMap(
            phase1Tasks,
            async ({ docNeid, flavor }) => {
                try {
                    const result = await callToolWithRetry<any>(
                        'elemental_get_related',
                        {
                            entity_id: { id_type: 'neid', id: docNeid },
                            related_flavor: flavor,
                            limit: 500,
                            direction: 'both',
                        },
                        { timeoutMs: 45_000, attempts: 1 }
                    );

                    const related = result?.relationships ?? [];
                    for (const rel of related) {
                        const rawNeid = rel.neid as string;
                        if (!rawNeid) continue;
                        const neid = normalizeNeid(rawNeid);
                        const existing = entityMap.get(neid);
                        if (existing) {
                            if (!existing.sourceDocuments.includes(docNeid)) {
                                existing.sourceDocuments.push(docNeid);
                            }
                        } else {
                            entityMap.set(neid, {
                                neid,
                                name: (rel.name as string) || neid,
                                flavor: (rel.flavor as string) || flavor,
                                sourceDocuments: [docNeid],
                                origin: 'document',
                                properties: rel.properties ?? undefined,
                            });
                        }
                        addRelationship(relationships, relSeen, {
                            sourceNeid: neid,
                            targetNeid: docNeid,
                            type: 'appears_in',
                            sourceDocumentNeid: docNeid,
                            origin: 'document',
                        });
                    }
                } catch (e: any) {
                    phase1Failures.push({ docNeid, flavor });
                    console.error(
                        `Phase 1: get_related failed doc=${docNeid} flavor=${flavor}:`,
                        e.message
                    );
                } finally {
                    phase1Completed += 1;
                    if (phase1Completed % 5 === 0 || phase1Completed === phase1Tasks.length) {
                        sendStep(
                            1,
                            'working',
                            'Entity Discovery',
                            `Completed ${phase1Completed}/${phase1Tasks.length} entity probes...`
                        );
                        sendMcpLogSnapshot();
                    }
                }
            },
            8
        );

        for (const { docNeid, flavor } of phase1Failures) {
            try {
                const result = await callToolWithRetry<any>(
                    'elemental_get_related',
                    {
                        entity_id: { id_type: 'neid', id: docNeid },
                        related_flavor: flavor,
                        limit: 500,
                        direction: 'both',
                    },
                    { timeoutMs: 45_000, attempts: 1 }
                );
                for (const rel of result?.relationships ?? []) {
                    const rawNeid = rel.neid as string;
                    if (!rawNeid) continue;
                    const neid = normalizeNeid(rawNeid);
                    const existing = entityMap.get(neid);
                    if (existing) {
                        if (!existing.sourceDocuments.includes(docNeid))
                            existing.sourceDocuments.push(docNeid);
                    } else {
                        entityMap.set(neid, {
                            neid,
                            name: (rel.name as string) || neid,
                            flavor: (rel.flavor as string) || flavor,
                            sourceDocuments: [docNeid],
                            origin: 'document',
                            properties: rel.properties ?? undefined,
                        });
                    }
                    addRelationship(relationships, relSeen, {
                        sourceNeid: neid,
                        targetNeid: docNeid,
                        type: 'appears_in',
                        sourceDocumentNeid: docNeid,
                        origin: 'document',
                    });
                }
            } catch (e: any) {
                console.error(`Phase 1 retry failed doc=${docNeid} flavor=${flavor}:`, e.message);
            }
        }

        sendStep(
            1,
            'completed',
            'Entity Discovery',
            `Found ${entityMap.size} entities across ${HOP1_FLAVORS.length} types`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        const entityNameToNeid = new Map<string, string>();
        for (const entity of entityMap.values()) {
            entityNameToNeid.set(normalizeName(entity.name), entity.neid);
        }

        // ─── Phase 2: Event Discovery (parallel) ──────────────────────
        // 7 hub NEIDs — all independent, fan out in parallel.
        t0 = Date.now();
        sendStep(
            2,
            'working',
            'Event Discovery',
            `Traversing ${EVENT_HUB_NEIDS.length} hub entities for events...`
        );

        let phase2Completed = 0;
        const eventResults = await pMap(
            EVENT_HUB_NEIDS,
            async (hubNeid) => {
                try {
                    const result = await callToolWithRetry<any>(
                        'elemental_get_events',
                        {
                            entity_id: { id_type: 'neid', id: hubNeid },
                            limit: 500,
                            include_participants: true,
                        },
                        { timeoutMs: 60_000, attempts: 2 }
                    );
                    return { hubNeid, events: result?.events ?? [] };
                } catch (e: any) {
                    console.error(`Phase 2: get_events failed hub=${hubNeid}:`, e.message);
                    return { hubNeid, events: [] };
                } finally {
                    phase2Completed += 1;
                    sendStep(
                        2,
                        'working',
                        'Event Discovery',
                        `Processed ${phase2Completed}/${EVENT_HUB_NEIDS.length} event hubs...`
                    );
                    if (phase2Completed % 2 === 0 || phase2Completed === EVENT_HUB_NEIDS.length) {
                        sendMcpLogSnapshot();
                    }
                }
            },
            4
        );

        for (const { hubNeid, events } of eventResults) {
            const normalHubNeid = normalizeNeid(hubNeid);
            const hub = entityMap.get(normalHubNeid);

            for (const evt of events) {
                const evtNeid = normalizeNeid(evt.neid as string);
                if (!evtNeid || eventMap.has(evtNeid)) continue;
                if (!isGuideEventName((evt.name as string) || evtNeid)) continue;

                const props = evt.properties ?? {};
                const participantNeids: string[] = [];
                let hasDocumentParticipant = false;
                const eventCitations = uniqueStrings(
                    Object.values(props as Record<string, { citation?: string }>).map(
                        (value) => value?.citation
                    )
                );
                const eventSourceDocuments = uniqueStrings([
                    ...eventCitations.map((citation) => resolveCitationToDocumentNeid(citation)),
                    ...(hub ? hub.sourceDocuments : []),
                ]);

                if (Array.isArray(evt.participants)) {
                    for (const p of evt.participants) {
                        const matchedNeid =
                            (p.neid && entityMap.has(normalizeNeid(p.neid))
                                ? normalizeNeid(p.neid)
                                : entityNameToNeid.get(normalizeName(p.name as string))) ?? null;
                        if (!matchedNeid) continue;
                        participantNeids.push(matchedNeid);
                        hasDocumentParticipant = true;
                    }
                }
                if (!hasDocumentParticipant) continue;

                // Add participant edges for all known entities
                for (const p of evt.participants ?? []) {
                    const matchedNeid =
                        (p.neid && entityMap.has(normalizeNeid(p.neid))
                            ? normalizeNeid(p.neid)
                            : entityNameToNeid.get(normalizeName(p.name as string))) ?? null;
                    if (!matchedNeid) continue;
                    addRelationship(relationships, relSeen, {
                        sourceNeid: matchedNeid,
                        targetNeid: evtNeid,
                        type: 'schema::relationship::participant',
                        sourceDocumentNeid: eventSourceDocuments[0],
                        citations: eventCitations,
                        origin: 'document',
                    });
                }

                eventMap.set(evtNeid, {
                    neid: evtNeid,
                    name: (evt.name as string) || evtNeid,
                    category: (props.category?.value ?? props.event_category?.value) as
                        | string
                        | undefined,
                    date: (props.date?.value ?? props.event_date?.value) as string | undefined,
                    description: (props.description?.value ?? props.event_description?.value) as
                        | string
                        | undefined,
                    likelihood: (props.likelihood?.value ?? props.event_likelihood?.value) as
                        | string
                        | undefined,
                    participantNeids,
                    sourceDocuments: eventSourceDocuments,
                    citations: eventCitations,
                });
            }
        }

        sendStep(
            2,
            'completed',
            'Event Discovery',
            `Found ${eventMap.size} events from ${EVENT_HUB_NEIDS.length} hubs`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 3: Typed Relationship Assembly (parallel) ──────────
        // Primary source of typed edges: MCP get_related with grouped relationship_types.
        // Secondary source: raw QS rows to add repeated document-scoped occurrences.
        t0 = Date.now();

        const probeTasks = RELATIONSHIP_PROBE_GROUPS.flatMap((group) =>
            Array.from(entityMap.values())
                .filter((entity) => entity.flavor === group.sourceFlav)
                .map((source) => ({ group, source }))
        );

        sendStep(
            3,
            'working',
            'Relationship Assembly',
            `Probing ${RELATIONSHIP_PROBE_GROUPS.length} grouped relationship sets (${probeTasks.length} calls)...`
        );

        let phase3Completed = 0;
        const phase3Results = await pMap(
            probeTasks,
            async ({ group, source }) => {
                try {
                    const result = await callToolWithRetry<any>(
                        'elemental_get_related',
                        {
                            entity_id: { id_type: 'neid', id: source.neid },
                            related_flavor: group.targetFlav,
                            relationship_types: group.relTypes,
                            limit: 100,
                            direction: 'both',
                        },
                        { timeoutMs: 45_000, attempts: 2 }
                    );
                    return { group, source, relationships: result?.relationships ?? [] };
                } catch (e: any) {
                    console.error(
                        `[Phase3] ${group.relTypes.join(',')} from ${source.neid} FAILED:`,
                        e?.message ?? String(e)
                    );
                    return { group, source, relationships: [] };
                } finally {
                    phase3Completed += 1;
                    if (phase3Completed % 15 === 0 || phase3Completed === probeTasks.length) {
                        sendStep(
                            3,
                            'working',
                            'Relationship Assembly',
                            `Processed ${phase3Completed}/${probeTasks.length} relationship probes...`
                        );
                        sendMcpLogSnapshot();
                    }
                }
            },
            6
        );

        for (const { group, source, relationships: related } of phase3Results) {
            for (const rel of related) {
                if (!rel.neid) continue;
                const targetNeid = normalizeNeid(rel.neid as string);
                if (!entityMap.has(targetNeid)) continue;
                if (targetNeid === source.neid) continue;

                const responseTypes = Array.isArray(rel.relationship_types)
                    ? (rel.relationship_types as string[])
                    : [];
                const typedMatches = responseTypes.filter((type) => group.relTypes.includes(type));
                const typesToAdd =
                    typedMatches.length > 0
                        ? typedMatches
                        : group.relTypes.length === 1
                          ? [group.relTypes[0]]
                          : [];

                for (const relType of typesToAdd) {
                    addRelationship(relationships, relSeen, {
                        sourceNeid: source.neid,
                        targetNeid,
                        type: relType,
                        origin: 'document',
                    });
                }
            }
        }

        // Scope filter: allow edges where endpoints are documents, entities, or events
        const docNeidSet = new Set(BNY_DOCUMENT_NEIDS);
        const filteredRelationships = relationships.filter(
            (r) =>
                docNeidSet.has(r.sourceNeid) ||
                docNeidSet.has(r.targetNeid) ||
                (entityMap.has(r.sourceNeid) && entityMap.has(r.targetNeid)) ||
                // Allow participant edges: entity → event (event NEIDs are in eventMap, not entityMap)
                (r.type === 'schema::relationship::participant' &&
                    entityMap.has(r.sourceNeid) &&
                    eventMap.has(r.targetNeid))
        );

        function resolveNodeName(neid: string): string {
            return (
                entityMap.get(neid)?.name ??
                eventMap.get(neid)?.name ??
                getGuideDocumentNameByNeid(neid) ??
                neid
            );
        }

        function getGuideMatchesEitherDirection(
            sourceNeid: string,
            targetNeid: string,
            recordedAt?: string
        ) {
            const direct = getGuideRelationshipOccurrencesByEndpoints(
                resolveNodeName(sourceNeid),
                resolveNodeName(targetNeid),
                recordedAt
            );
            const reverse = getGuideRelationshipOccurrencesByEndpoints(
                resolveNodeName(targetNeid),
                resolveNodeName(sourceNeid),
                recordedAt
            );
            return { direct, reverse };
        }

        const finalRelationships: RelationshipRecord[] = [];
        const finalSeen = new Set<string>();
        for (const rel of filteredRelationships) {
            addRelationship(finalRelationships, finalSeen, rel);
        }

        // Recover repeated document-scoped relationship occurrences from raw property rows.
        // These rows carry recorded_at timestamps and let us distinguish multiple
        // occurrences of the same semantic relationship across the 5 BNY documents.
        const rawEntityIds = Array.from(entityMap.keys());
        const rawChunks: string[][] = [];
        for (let i = 0; i < rawEntityIds.length; i += 25)
            rawChunks.push(rawEntityIds.slice(i, i + 25));

        const rawResults = await pMap(
            rawChunks,
            async (chunk) => {
                try {
                    return await rawQsProperties(chunk);
                } catch (e: any) {
                    console.error(`[Phase3 raw] chunk failed:`, e.message);
                    return { values: [] };
                }
            },
            4
        );

        const rawRows = rawResults.flatMap((result) => result?.values ?? []);
        for (const row of rawRows) {
            const sourceNeid = normalizeNeid(String(row.eid ?? ''));
            const targetRaw = String(row.value ?? '');
            if (!sourceNeid || !/^\d+$/.test(targetRaw)) continue;
            const targetNeid = normalizeNeid(targetRaw);

            const targetExists =
                entityMap.has(targetNeid) || eventMap.has(targetNeid) || docNeidSet.has(targetNeid);
            if (!targetExists) continue;

            const sourceName = resolveNodeName(sourceNeid);
            const targetName = resolveNodeName(targetNeid);
            const { direct: matches, reverse: reverseMatches } = getGuideMatchesEitherDirection(
                sourceNeid,
                targetNeid,
                row.recorded_at as string | undefined
            );
            const effectiveMatches = matches.length ? matches : reverseMatches;
            if (!effectiveMatches.length) continue;

            for (const match of effectiveMatches) {
                if (match.type === 'schema::relationship::participant') continue;
                const docNeids = uniqueStrings(
                    match.citations.map((citation) => resolveCitationToDocumentNeid(citation))
                );
                for (const docNeid of docNeids.length ? docNeids : [undefined]) {
                    addRelationship(finalRelationships, finalSeen, {
                        sourceNeid:
                            normalizeName(match.sourceName) === normalizeName(sourceName)
                                ? sourceNeid
                                : targetNeid,
                        targetNeid:
                            normalizeName(match.targetName) === normalizeName(targetName)
                                ? targetNeid
                                : sourceNeid,
                        type: match.type,
                        recordedAt: (row.recorded_at as string | undefined) ?? match.timestamp,
                        sourceDocumentNeid: docNeid,
                        citations: match.citations,
                        origin: 'document',
                    });
                }
            }
        }

        sendStep(
            3,
            'completed',
            'Relationship Assembly',
            `Assembled ${finalRelationships.length} typed edges`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 4: Property History ────────────────────────────────
        // For each entity discovered in Phase 1 that is known to carry financial
        // properties (fund accounts, the bond), ask the live graph for its full
        // temporal property history via elemental_get_entity(history: ...).
        // We return whatever the graph has — no pre-loading or guessing from the
        // ground truth. The Validation tab compares what we get against the ground truth.
        t0 = Date.now();
        sendStep(
            4,
            'working',
            'Property History',
            `Loading historical properties for ${PROPERTY_BEARING_NEIDS.length} key entities...`
        );

        // Phase 4 — all 6 property-bearing entities are independent, fan out in parallel.
        const propResults = await pMap(
            PROPERTY_BEARING_NEIDS,
            async (rawNeid) => {
                const neid = normalizeNeid(rawNeid);
                const properties =
                    neid === '8242646876499346416'
                        ? [...BOND_HISTORY_PROPERTIES]
                        : [...FUND_ACCOUNT_HISTORY_PROPERTIES];
                try {
                    const result = await callToolWithRetry<any>(
                        'elemental_get_entity',
                        {
                            entity_id: { id_type: 'neid', id: neid },
                            properties,
                            history: { after: '2010-01-01', before: '2026-12-31', limit: 100 },
                        },
                        { timeoutMs: 60_000, attempts: 2 }
                    );
                    const entity = result?.entity ?? result;
                    return {
                        neid,
                        name: entity?.name ?? neid,
                        historicalProps: entity?.historical_properties ?? {},
                    };
                } catch (e: any) {
                    console.error(`Phase 4: get_entity history failed neid=${neid}:`, e.message);
                    return { neid, name: neid, historicalProps: {} };
                }
            },
            2
        );

        const propertySeries: PropertySeriesRecord[] = [];
        for (const { neid, name, historicalProps } of propResults) {
            const propCount = Object.keys(historicalProps).length;
            if (propCount > 0) {
                console.log(`[Phase4] ${name}: ${propCount} property series`);
            } else {
                console.log(`[Phase4] ${name}: no historical_properties in live graph`);
            }
            for (const [propName, points] of Object.entries(historicalProps)) {
                if (!Array.isArray(points) || points.length === 0) continue;
                propertySeries.push({
                    neid,
                    pid: 0,
                    propertyName: propName,
                    points: (points as any[])
                        .filter((p) => p.recorded_at)
                        .map((p) => ({
                            recordedAt: p.recorded_at as string,
                            value: p.value ?? null,
                            citation: p.citation as string | undefined,
                        }))
                        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)),
                });
            }
        }

        console.log(
            `[Phase4] Total: ${propertySeries.length} property series across ${new Set(propertySeries.map((s) => s.neid)).size} entities`
        );

        sendStep(
            4,
            'completed',
            'Property History',
            `Loaded ${propertySeries.length} property series across ${new Set(propertySeries.map((s) => s.neid)).size} entities`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Finalize ────────────────────────────────────────────────
        t0 = Date.now();
        sendStep(5, 'working', 'Finalizing', 'Building final collection state...');

        const entities = Array.from(entityMap.values());
        const events = Array.from(eventMap.values());
        const agreements = entities.filter((e) => e.flavor === 'legal_agreement');

        const state: CollectionState = {
            meta: {
                name: 'BNY Rebate Analysis Collection',
                description:
                    '$142M NJHMFA Multifamily Housing Revenue Refunding Bonds — Presidential Plaza at Newport Project',
                documentCount: BNY_DOCUMENTS.length,
                entityCount: entities.length,
                eventCount: events.length,
                relationshipCount: finalRelationships.length,
                agreementCount: agreements.length,
                lastRebuilt: new Date().toISOString(),
            },
            documents: [...BNY_DOCUMENTS],
            entities,
            relationships: finalRelationships,
            events,
            propertySeries,
            status: 'ready',
        };

        setCachedCollection(state);

        sendStep(
            5,
            'completed',
            'Finalizing',
            `Graph complete: ${entities.length} entities, ${events.length} events, ${finalRelationships.length} edges, ${propertySeries.length} property series`,
            Date.now() - t0
        );

        // Send full state and MCP log as final events
        send('state', { state });
        sendMcpLogSnapshot();
        send('done', {});
    } catch (error: any) {
        send('error', {
            message: error?.message || 'Rebuild stream failed unexpectedly',
        });
        sendMcpLogSnapshot();
        send('done', {});
    } finally {
        clearInterval(heartbeat);
        event.node.res.end();
    }
});
