import { mcpCallTool, resetMcpSession, getMcpLog } from '~/server/utils/collectionConfig';
import { setCachedCollection } from '~/server/api/collection/bootstrap.get';
import {
    loadExtractedSeedGraph,
    seedIdForKey,
    seedKeyFromNameAndFlavor,
    citationToDocumentNeid,
} from '~/server/utils/extractedSeedGraph';
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

/**
 * Canonical NEID format for app state: 20-digit, left-padded with zeros.
 * This keeps stored IDs consistent with MCP outputs that are commonly padded.
 */
function normalizeNeid(neid: string): string {
    if (!neid) return neid;
    const unpadded = neid.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function relationshipKey(rel: RelationshipRecord): string {
    return `${rel.sourceNeid}|${rel.targetNeid}|${rel.type}|${rel.sourceDocumentNeid ?? ''}|${rel.recordedAt ?? ''}`;
}

function upsertRelationship(
    relationshipMap: Map<string, RelationshipRecord>,
    rel: RelationshipRecord
): void {
    const key = relationshipKey(rel);
    const existing = relationshipMap.get(key);
    if (!existing) {
        relationshipMap.set(key, {
            ...rel,
            citations: rel.citations ? [...new Set(rel.citations)] : undefined,
            properties: rel.properties ? { ...rel.properties } : undefined,
        });
        return;
    }
    const citations = [
        ...new Set([...(existing.citations ?? []), ...(rel.citations ?? [])].filter(Boolean)),
    ];
    existing.citations = citations.length ? citations : undefined;
    existing.extractedSeed = Boolean(existing.extractedSeed || rel.extractedSeed);
    existing.mcpConfirmed = Boolean(existing.mcpConfirmed || rel.mcpConfirmed);
    existing.mcpOnly = Boolean(existing.mcpOnly || rel.mcpOnly);
    if (!existing.sourceDocumentNeid && rel.sourceDocumentNeid) {
        existing.sourceDocumentNeid = rel.sourceDocumentNeid;
    }
    if (!existing.recordedAt && rel.recordedAt) {
        existing.recordedAt = rel.recordedAt;
    }
    if (rel.properties) {
        existing.properties = {
            ...(existing.properties ?? {}),
            ...rel.properties,
        };
    }
}

function uniqueStrings(values: Array<string | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function countRecordProperties(record: { properties?: Record<string, unknown> }): number {
    return Object.keys(record.properties ?? {}).length;
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

function bnyDocumentNeidFromDocumentName(name: string | undefined): string | undefined {
    if (!name) return undefined;
    const match = name.match(/^bny_document_id\|(\d+)$/i);
    if (!match) return undefined;
    const documentId = match[1];
    return BNY_DOCUMENTS.find((doc) => doc.documentId === documentId)?.neid;
}

function formatMs(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

const CANONICAL_ENTITY_NEID_OVERRIDES: Record<string, string> = {
    // The extracted bond label resolves to the same canonical instrument hub NEID
    // used elsewhere in the BNY collection workflow.
    [seedKeyFromNameAndFlavor(
        '$142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond',
        'financial_instrument'
    )]: '08242646876499346416',
};

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

    const seed = loadExtractedSeedGraph();
    const entityByKey = new Map<string, EntityRecord>();
    const eventByKey = new Map<string, EventRecord>();
    const seedEntityDocsByKey = new Map<string, Set<string>>();
    const seedEventDocsByKey = new Map<string, Set<string>>();
    const relationshipMap = new Map<string, RelationshipRecord>();
    const baselineExtractedPropertyCount =
        seed.entities.reduce((sum, entity) => sum + countRecordProperties(entity), 0) +
        seed.events.reduce((sum, eventItem) => sum + countRecordProperties(eventItem), 0);
    const baselineExtractedPropertyRecordCount =
        seed.entities.filter((entity) => countRecordProperties(entity) > 0).length +
        seed.events.filter((eventItem) => countRecordProperties(eventItem) > 0).length;
    let t0 = Date.now();

    try {
        // ─── Phase 1: Load extracted JSON baseline ────────────────────
        t0 = Date.now();
        sendStep(
            1,
            'working',
            'Baseline Load',
            'Loading extracted entity/event baseline from JSON...'
        );

        for (const seedEntity of seed.entities) {
            const seededDocs = [
                ...new Set(seedEntity.sourceDocumentNeids.map((d) => normalizeNeid(d))),
            ];
            seedEntityDocsByKey.set(seedEntity.key, new Set(seededDocs));
            const canonicalNeid =
                CANONICAL_ENTITY_NEID_OVERRIDES[seedEntity.key] ??
                seedEntity.canonicalNeid ??
                seedIdForKey('entity', seedEntity.key);
            entityByKey.set(seedEntity.key, {
                neid: canonicalNeid,
                name: seedEntity.name,
                flavor: seedEntity.flavor,
                sourceDocuments: seededDocs,
                extraSourceDocuments: [],
                origin: 'document',
                extractedSeed: true,
                mcpConfirmed: canonicalNeid !== seedIdForKey('entity', seedEntity.key),
                properties: seedEntity.properties,
            });
        }
        for (const seedEvent of seed.events) {
            const seededDocs = [
                ...new Set(seedEvent.sourceDocumentNeids.map((d) => normalizeNeid(d))),
            ];
            seedEventDocsByKey.set(seedEvent.key, new Set(seededDocs));
            eventByKey.set(seedEvent.key, {
                neid: seedIdForKey('event', seedEvent.key),
                name: seedEvent.name,
                participantNeids: [],
                sourceDocuments: seededDocs,
                extraSourceDocuments: [],
                extractedSeed: true,
                mcpConfirmed: false,
                properties: seedEvent.properties,
            });
        }

        sendStep(
            1,
            'completed',
            'Baseline Load',
            `Loaded ${entityByKey.size} entities and ${eventByKey.size} events extractions from documents`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 2: Resolve seeded entities to NEIDs via docs ───────
        t0 = Date.now();
        sendStep(2, 'working', 'Loading Entities', 'Loading entities from source documents...');

        const unresolvedFlavors = HOP1_FLAVORS.filter((flavor) =>
            Array.from(entityByKey.values()).some(
                (entity) => entity.flavor === flavor && !entity.mcpConfirmed
            )
        );
        const phase1Tasks = BNY_DOCUMENT_NEIDS.flatMap((docNeid) =>
            unresolvedFlavors.map((flavor) => ({ docNeid, flavor }))
        );
        let phase2Resolved = 0;
        let phase2Rows = 0;
        if (phase1Tasks.length > 0) {
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
                            { timeoutMs: 45_000, attempts: 2 }
                        );
                        const related = result?.relationships ?? [];
                        phase2Rows += related.length;
                        for (const rel of related) {
                            const key = seedKeyFromNameAndFlavor(
                                (rel.name as string) || '',
                                (rel.flavor as string) || flavor
                            );
                            const seeded = entityByKey.get(key);
                            if (!seeded || !rel.neid) continue;
                            const canonicalNeid = normalizeNeid(rel.neid as string);
                            if (seeded.neid !== canonicalNeid) seeded.neid = canonicalNeid;
                            seeded.name = (rel.name as string) || seeded.name;
                            seeded.mcpConfirmed = true;
                            seeded.properties = rel.properties ?? seeded.properties;
                            const seedDocSet = seedEntityDocsByKey.get(key) ?? new Set<string>();
                            if (!seeded.sourceDocuments.includes(docNeid)) {
                                seeded.sourceDocuments.push(docNeid);
                                if (!seedDocSet.has(docNeid)) {
                                    seeded.extraSourceDocuments = [
                                        ...new Set([
                                            ...(seeded.extraSourceDocuments ?? []),
                                            docNeid,
                                        ]),
                                    ];
                                }
                            }
                            upsertRelationship(relationshipMap, {
                                sourceNeid: seeded.neid,
                                targetNeid: docNeid,
                                type: 'appears_in',
                                sourceDocumentNeid: docNeid,
                                origin: 'document',
                                extractedSeed: seedDocSet.has(docNeid),
                                mcpConfirmed: true,
                                mcpOnly: !seedDocSet.has(docNeid),
                            });
                            phase2Resolved += 1;
                        }
                    } catch (error: any) {
                        console.error(
                            `Phase 2 resolve failed doc=${docNeid} flavor=${flavor}:`,
                            error?.message
                        );
                    }
                },
                8
            );
        }
        console.log(
            `[Phase2] entity resolution stats: calls=${phase1Tasks.length}, rows=${phase2Rows}, matchedRows=${phase2Resolved}`
        );

        sendStep(
            2,
            'completed',
            'Loading Entities',
            phase1Tasks.length > 0
                ? 'Entities loaded and validated.'
                : 'Entities loaded from seeded canonical NEIDs.',
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 3: Seeded event enrichment ──────────────────────────
        t0 = Date.now();
        sendStep(3, 'working', 'Loading Events', 'Loading events and participant links...');

        const getEntityByNeid = (neid: string) =>
            Array.from(entityByKey.values()).find((entity) => entity.neid === neid);
        let phase3MatchedEvents = 0;
        let phase3ReturnedEvents = 0;

        await pMap(
            EVENT_HUB_NEIDS,
            async (hubNeidRaw) => {
                const hubNeid = normalizeNeid(hubNeidRaw);
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
                    const events = result?.events ?? [];
                    phase3ReturnedEvents += events.length;
                    for (const evt of events) {
                        const eventKey = seedKeyFromNameAndFlavor(
                            (evt.name as string) || '',
                            'event'
                        );
                        const seededEvent = eventByKey.get(eventKey);
                        if (!seededEvent || !evt.neid) continue;

                        const eventNeid = normalizeNeid(evt.neid as string);
                        seededEvent.neid = eventNeid;
                        seededEvent.name = (evt.name as string) || seededEvent.name;
                        seededEvent.mcpConfirmed = true;
                        phase3MatchedEvents += 1;

                        const props = evt.properties ?? {};
                        seededEvent.category = (props.category?.value ??
                            props.event_category?.value) as string | undefined;
                        seededEvent.date = (props.date?.value ?? props.event_date?.value) as
                            | string
                            | undefined;
                        seededEvent.description = (props.description?.value ??
                            props.event_description?.value) as string | undefined;
                        seededEvent.likelihood = (props.likelihood?.value ??
                            props.event_likelihood?.value) as string | undefined;
                        seededEvent.properties = {
                            ...(seededEvent.properties ?? {}),
                            ...(props as Record<string, unknown>),
                        };

                        const citations = [
                            ...new Set(
                                Object.values(props as Record<string, { citation?: string }>)
                                    .map((item) => item?.citation)
                                    .filter((citation): citation is string => Boolean(citation))
                            ),
                        ];
                        const citedDocNeids = [
                            ...new Set(
                                citations
                                    .map((citation) => citationToDocumentNeid(citation))
                                    .filter((neid): neid is string => Boolean(neid))
                            ),
                        ];
                        let appearsInDocNeids: string[] = [];
                        try {
                            const eventDocResult = await callToolWithRetry<any>(
                                'elemental_get_related',
                                {
                                    entity_id: { id_type: 'neid', id: eventNeid },
                                    related_flavor: 'document',
                                    direction: 'both',
                                    limit: 100,
                                },
                                { timeoutMs: 30_000, attempts: 1 }
                            );
                            const rows = eventDocResult?.relationships ?? [];
                            appearsInDocNeids = [
                                ...new Set(
                                    rows
                                        .map((row: any) => {
                                            if (row?.neid) return normalizeNeid(String(row.neid));
                                            return bnyDocumentNeidFromDocumentName(row?.name);
                                        })
                                        .filter((neid: string | undefined): neid is string =>
                                            Boolean(neid)
                                        )
                                ),
                            ];
                        } catch {
                            appearsInDocNeids = [];
                        }
                        const docNeids = [
                            ...new Set(
                                [...citedDocNeids, ...appearsInDocNeids].map((neid) =>
                                    normalizeNeid(neid)
                                )
                            ),
                        ];
                        const baselineDocSet =
                            seedEventDocsByKey.get(eventKey) ?? new Set<string>();
                        for (const docNeid of docNeids) {
                            if (!seededEvent.sourceDocuments.includes(docNeid)) {
                                seededEvent.sourceDocuments.push(docNeid);
                            }
                            if (!baselineDocSet.has(docNeid)) {
                                seededEvent.extraSourceDocuments = [
                                    ...new Set([
                                        ...(seededEvent.extraSourceDocuments ?? []),
                                        docNeid,
                                    ]),
                                ];
                            }
                        }
                        seededEvent.citations = [
                            ...new Set([...(seededEvent.citations ?? []), ...citations]),
                        ];

                        for (const participant of evt.participants ?? []) {
                            if (!participant.neid) continue;
                            const participantNeid = normalizeNeid(participant.neid as string);
                            const participantEntity = getEntityByNeid(participantNeid);
                            if (!participantEntity) continue;
                            if (!seededEvent.participantNeids.includes(participantEntity.neid)) {
                                seededEvent.participantNeids.push(participantEntity.neid);
                            }
                            upsertRelationship(relationshipMap, {
                                sourceNeid: participantEntity.neid,
                                targetNeid: seededEvent.neid,
                                type: 'schema::relationship::participant',
                                sourceDocumentNeid:
                                    docNeids[0] ?? participantEntity.sourceDocuments[0],
                                citations,
                                properties: {
                                    participantProperties: participant.properties ?? {},
                                    participantRelationshipTypes:
                                        participant.relationship_types ?? [],
                                },
                                origin: 'document',
                                mcpConfirmed: true,
                                extractedSeed: false,
                                mcpOnly: true,
                            });
                        }
                        for (const docNeid of docNeids) {
                            upsertRelationship(relationshipMap, {
                                sourceNeid: seededEvent.neid,
                                targetNeid: docNeid,
                                type: 'appears_in',
                                sourceDocumentNeid: docNeid,
                                citations,
                                origin: 'document',
                                mcpConfirmed: true,
                                extractedSeed: false,
                                mcpOnly: true,
                            });
                        }
                    }
                } catch (error: any) {
                    console.error(
                        `Phase 3 event enrichment failed hub=${hubNeid}:`,
                        error?.message
                    );
                }
            },
            4
        );
        console.log(
            `[Phase3] event resolution stats: hubs=${EVENT_HUB_NEIDS.length}, returned=${phase3ReturnedEvents}, matchedRows=${phase3MatchedEvents}`
        );

        sendStep(
            3,
            'completed',
            'Loading Events',
            'Events loaded and linked to participants/documents.',
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 4: Relationship assembly ────────────────────────────
        t0 = Date.now();
        sendStep(
            4,
            'working',
            'Loading Relationships',
            'Building document links, participant links, and extracted baseline edges...'
        );

        // Add extracted baseline appears_in edges for entities/events.
        for (const [key, entity] of entityByKey.entries()) {
            const docs = seedEntityDocsByKey.get(key) ?? new Set<string>();
            for (const docNeid of docs) {
                upsertRelationship(relationshipMap, {
                    sourceNeid: entity.neid,
                    targetNeid: docNeid,
                    type: 'appears_in',
                    sourceDocumentNeid: docNeid,
                    origin: 'document',
                    extractedSeed: true,
                });
            }
        }
        for (const [key, eventItem] of eventByKey.entries()) {
            const docs = seedEventDocsByKey.get(key) ?? new Set<string>();
            for (const docNeid of docs) {
                upsertRelationship(relationshipMap, {
                    sourceNeid: eventItem.neid,
                    targetNeid: docNeid,
                    type: 'appears_in',
                    sourceDocumentNeid: docNeid,
                    origin: 'document',
                    extractedSeed: true,
                });
            }
        }

        // Add extracted baseline non-document relationships.
        for (const edge of seed.relationships) {
            const sourceEntity = entityByKey.get(edge.sourceKey);
            const sourceEvent = eventByKey.get(edge.sourceKey);
            const targetEntity = entityByKey.get(edge.targetKey);
            const targetEvent = eventByKey.get(edge.targetKey);
            const sourceNeid = sourceEntity?.neid ?? sourceEvent?.neid;
            const targetNeid = targetEntity?.neid ?? targetEvent?.neid;
            if (!sourceNeid || !targetNeid) continue;
            const sourceDocNeids = edge.sourceDocumentNeids.map((d) => normalizeNeid(d));
            if (sourceDocNeids.length === 0) {
                upsertRelationship(relationshipMap, {
                    sourceNeid,
                    targetNeid,
                    type: edge.type,
                    citations: edge.citations,
                    recordedAt: edge.recordedAt,
                    properties: {
                        extractedTimestamp: edge.recordedAt,
                        citationCount: edge.citations.length,
                    },
                    origin: 'document',
                    extractedSeed: true,
                });
                continue;
            }
            for (const sourceDocumentNeid of sourceDocNeids) {
                upsertRelationship(relationshipMap, {
                    sourceNeid,
                    targetNeid,
                    type: edge.type,
                    citations: edge.citations,
                    recordedAt: edge.recordedAt,
                    sourceDocumentNeid,
                    properties: {
                        extractedTimestamp: edge.recordedAt,
                        citationCount: edge.citations.length,
                    },
                    origin: 'document',
                    extractedSeed: true,
                });
            }
        }

        sendStep(
            4,
            'completed',
            'Loading Relationships',
            'Relationships loaded from extracted and confirmed graph data.',
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 5: Property coverage ───────────────────────────────
        t0 = Date.now();
        sendStep(
            5,
            'working',
            'Loading Properties',
            `Loading extracted properties and historical series...`
        );

        // First, get latest properties for all resolved entity NEIDs so
        // the extracted entity set has broad property coverage.
        const resolvedEntityNeids = [
            ...new Set(
                Array.from(entityByKey.values())
                    .map((entity) => normalizeNeid(entity.neid))
                    .filter((neid) => !neid.startsWith('seed:'))
            ),
        ];
        let phase4EntitySuccess = 0;
        await pMap(
            resolvedEntityNeids,
            async (neid) => {
                try {
                    const result = await callToolWithRetry<any>(
                        'elemental_get_entity',
                        {
                            entity_id: { id_type: 'neid', id: neid },
                        },
                        { timeoutMs: 45_000, attempts: 2 }
                    );
                    const entity = result?.entity ?? result;
                    const target = Array.from(entityByKey.values()).find(
                        (item) => normalizeNeid(item.neid) === neid
                    );
                    if (!target) return;
                    target.mcpConfirmed = true;
                    target.name = (entity?.name as string | undefined) ?? target.name;
                    target.properties = {
                        ...(target.properties ?? {}),
                        ...((entity?.properties as Record<string, unknown> | undefined) ?? {}),
                    };
                    phase4EntitySuccess += 1;
                } catch (error: any) {
                    console.error(`Phase 5: get_entity failed neid=${neid}:`, error?.message);
                }
            },
            4
        );

        const bondNeid = normalizeNeid('08242646876499346416');
        const propResults = await pMap(
            PROPERTY_BEARING_NEIDS,
            async (rawNeid) => {
                const neid = normalizeNeid(rawNeid);
                const properties =
                    neid === bondNeid
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
                    const resolvedName = (entity?.name as string | undefined) ?? neid;
                    const targetEntity = Array.from(entityByKey.values()).find(
                        (item) => item.neid === neid
                    );
                    if (targetEntity) {
                        targetEntity.name = resolvedName;
                        targetEntity.mcpConfirmed = true;
                    }
                    return {
                        neid,
                        name: resolvedName,
                        historicalProps: entity?.historical_properties ?? {},
                    };
                } catch (e: any) {
                    console.error(`Phase 5: get_entity history failed neid=${neid}:`, e.message);
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
            5,
            'completed',
            'Loading Properties',
            'Properties and history loaded.',
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 6: Finalize ───────────────────────────────────────
        t0 = Date.now();
        sendStep(6, 'working', 'Finalizing', 'Building collection state...');

        const entities = Array.from(entityByKey.values());
        const events = Array.from(eventByKey.values());
        const agreements = entities.filter((e) => e.flavor === 'legal_agreement');
        const relationships = Array.from(relationshipMap.values());

        const state: CollectionState = {
            meta: {
                name: 'BNY Rebate Analysis Collection',
                description:
                    '$142M NJHMFA Multifamily Housing Revenue Refunding Bonds — Presidential Plaza at Newport Project',
                documentCount: BNY_DOCUMENTS.length,
                entityCount: entities.length,
                eventCount: events.length,
                relationshipCount: relationships.length,
                agreementCount: agreements.length,
                extractedPropertyCount: baselineExtractedPropertyCount,
                extractedPropertyRecordCount: baselineExtractedPropertyRecordCount,
                lastRebuilt: new Date().toISOString(),
            },
            documents: [...BNY_DOCUMENTS],
            entities,
            relationships,
            events,
            propertySeries,
            status: 'ready',
        };

        setCachedCollection(state);

        sendStep(
            6,
            'completed',
            'Finalizing',
            `Graph complete: ${entities.length} entities, ${events.length} events, ${relationships.length} edges, ${baselineExtractedPropertyCount} extracted baseline properties across ${baselineExtractedPropertyRecordCount} records, ${propertySeries.length} property series`,
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
