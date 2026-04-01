import { mcpCallTool, resetMcpSession, getMcpLog } from '~/server/utils/collectionConfig';
import { setCachedCollection } from '~/server/api/collection/bootstrap.get';
import {
    loadSeedGraphHints,
    seedKeyFromNameAndFlavor,
    citationToDocumentNeid,
} from '~/server/utils/extractedSeedGraph';
import { runEnrichmentExpansion } from '~/server/utils/enrichmentExpand';
import { runCorporateLineageInvestigation } from '~/server/utils/lineageInvestigation';
import {
    BNY_DOCUMENTS,
    BNY_PRESET_PROJECT,
    HOP1_FLAVORS,
    type DocumentRecord,
    type EntityRecord,
    type RelationshipRecord,
    type EventRecord,
    type PropertySeriesRecord,
    type CollectionState,
} from '~/utils/collectionTypes';

interface StreamRebuildQuery {
    projectId?: string;
    seedNeids?: string | string[];
    seedDocumentCount?: string;
    seedEntityCount?: string;
}

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

const CORE_ENTITY_PROPERTIES_BY_FLAVOR: Record<string, readonly string[]> = {
    organization: [
        'name',
        'alias',
        'company_cik',
        'ticker',
        'ein',
        'lei',
        'address',
        'mailing_address',
        'physical_address',
        'headquarters_address',
        'legal_address',
        'wikibase_shortdesc',
        'wikipedia_summary',
        'wikipedia_extended_summary',
        'notes',
        'jurisdiction',
        'legal_entity_status',
        'entity_creation_date',
        'registered_as',
        'legal_form_code',
        'business_phone',
        'website',
        'industry',
        'sector',
        'sic_code',
        'sic_description',
        'state_of_incorporation',
        'headquarters_country',
        'legal_address_country',
    ],
    person: [
        'name',
        'alias',
        'person_cik',
        'position',
        'change_type',
        'birth_date',
        'nationality',
        'notes',
        'job_title',
        'wikibase_shortdesc',
        'wikipedia_summary',
        'wikipedia_extended_summary',
    ],
    financial_instrument: [
        'name',
        'alias',
        'ticker_symbol',
        'company_name',
        'security_type',
        'exchange',
        'cusip_number',
        'instrument_type',
        'put_call',
        'sector',
        'industry',
        'position_value',
        'shares_held',
        'voting_authority_sole',
        'voting_authority_shared',
        'voting_authority_none',
    ],
    location: [
        'name',
        'alias',
        'wikibase_shortdesc',
        'wikipedia_summary',
        'wikipedia_extended_summary',
    ],
    fund_account: [
        'name',
        'current_fund_status',
        'computation_date_valuation',
        'gross_earnings',
        'internal_rate_of_return',
        'excess_earnings',
    ],
    event: ['name', 'alias', 'category', 'likelihood', 'date', 'description'],
};

const EVENT_TIME_WINDOWS: Array<{
    label: string;
    time_range?: { after?: string; before?: string };
}> = [
    { label: 'recent', time_range: { after: '2018-01-01', before: '2026-12-31' } },
    { label: 'historical', time_range: { before: '2018-01-01' } },
];
const ENRICHMENT_MAX_ENTITIES = 50_000;
const ENRICHMENT_MAX_RELATIONSHIPS = 200_000;
const ENRICHMENT_MAX_EVENTS = 50_000;
const ENRICHMENT_MAX_EVENT_HUBS = 250;
const PHASE3_DEADLINE_MS = 150_000;
let strictDocumentNeidSet = new Set(BNY_DOCUMENTS.map((doc) => normalizeNeid(doc.neid)));

function propertyValueFromRecord(record: unknown): unknown {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
    const row = record as Record<string, unknown>;
    if ('value' in row) return row.value;
    return record;
}

function stringProperty(
    properties: Record<string, unknown> | undefined,
    keys: string[]
): string | undefined {
    if (!properties) return undefined;
    for (const key of keys) {
        if (!(key in properties)) continue;
        const scalar = propertyValueFromRecord(properties[key]);
        const value = String(scalar ?? '').trim();
        if (value) return value;
    }
    return undefined;
}

function corePropertiesForFlavor(flavor: string): readonly string[] {
    return CORE_ENTITY_PROPERTIES_BY_FLAVOR[flavor] ?? [];
}

function isStrictDocumentNeid(neid: string | undefined): boolean {
    if (!neid) return false;
    return strictDocumentNeidSet.has(normalizeNeid(neid));
}

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

function mergeEntities(base: EntityRecord[], enrichment: EntityRecord[]): EntityRecord[] {
    const byNeid = new Map(base.map((entity) => [entity.neid, entity]));
    for (const entity of enrichment) {
        if (byNeid.has(entity.neid)) continue;
        byNeid.set(entity.neid, entity);
    }
    return Array.from(byNeid.values());
}

function mergeEvents(base: EventRecord[], enrichment: EventRecord[]): EventRecord[] {
    const byNeid = new Map(base.map((eventItem) => [eventItem.neid, eventItem]));
    for (const eventItem of enrichment) {
        if (byNeid.has(eventItem.neid)) continue;
        byNeid.set(eventItem.neid, eventItem);
    }
    return Array.from(byNeid.values());
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

function formatCount(value: number): string {
    return value.toLocaleString();
}

function parseCountParam(value: string | undefined): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatSeedSummary(seedDocumentCount: number, seedEntityCount: number): string {
    const parts: string[] = [];
    if (seedDocumentCount > 0) {
        parts.push(
            `${formatCount(seedDocumentCount)} seeded document${seedDocumentCount === 1 ? '' : 's'}`
        );
    }
    if (seedEntityCount > 0) {
        parts.push(
            `${formatCount(seedEntityCount)} seed entit${seedEntityCount === 1 ? 'y' : 'ies'}`
        );
    }
    if (!parts.length) return 'project seeds';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} and ${parts[1]}`;
}

export default defineEventHandler(async (event) => {
    const query = getQuery(event) as StreamRebuildQuery;
    const requestProjectId = query.projectId?.trim() || BNY_PRESET_PROJECT.id;
    const querySeedRaw = Array.isArray(query.seedNeids)
        ? query.seedNeids.join(',')
        : query.seedNeids || '';
    const requestSeedNeids = querySeedRaw
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
        .map((neid) => normalizeNeid(neid));
    const seedDocumentCount = parseCountParam(query.seedDocumentCount);
    const seedEntityCount = parseCountParam(query.seedEntityCount);
    const isPresetProject = requestProjectId === BNY_PRESET_PROJECT.id;

    setResponseHeaders(event, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });

    let clientDisconnected = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    const send = (type: string, data: Record<string, unknown>) => {
        if (clientDisconnected || event.node.res.destroyed || event.node.res.writableEnded) return;
        try {
            const payload = JSON.stringify({ type, ...data });
            event.node.res.write(`data: ${payload}\n\n`);
        } catch {
            clientDisconnected = true;
        }
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
    heartbeat = setInterval(() => {
        send('heartbeat', { ts: new Date().toISOString() });
    }, 10_000);
    event.node.res.on('close', () => {
        clientDisconnected = true;
        if (heartbeat) clearInterval(heartbeat);
    });

    resetMcpSession();

    const auditCounts = {
        rawOneHop: { entityCount: 0, relationshipCount: 0, eventCount: 0 },
    };
    const seedHints = loadSeedGraphHints();
    const documentRootNeids =
        requestSeedNeids.length > 0
            ? requestSeedNeids
            : isPresetProject
              ? BNY_DOCUMENTS.map((doc) => normalizeNeid(doc.neid))
              : [];
    strictDocumentNeidSet = new Set(documentRootNeids);
    let baselineExtractedPropertyCount = 0;
    let baselineExtractedPropertyRecordCount = 0;
    const entityByKey = new Map<string, EntityRecord>();
    const eventByKey = new Map<string, EventRecord>();
    const seedEntityDocsByKey = new Map<string, Set<string>>();
    const seedEventDocsByKey = new Map<string, Set<string>>();
    const relationshipMap = new Map<string, RelationshipRecord>();
    let t0 = Date.now();

    try {
        // ─── Phase 1: Load project seed documents ─────────────────────
        t0 = Date.now();
        sendStep(
            1,
            'working',
            'Loading Seed Documents',
            `Traversing ${formatSeedSummary(seedDocumentCount || documentRootNeids.length, seedEntityCount)}...`
        );

        const seedTraversalTasks = documentRootNeids.flatMap((docNeid) =>
            HOP1_FLAVORS.map((flavor) => ({ docNeid, flavor }))
        );
        let phase1Resolved = 0;
        for (const { docNeid, flavor } of seedTraversalTasks) {
            if (clientDisconnected) break;
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
                for (const rel of related) {
                    if (!rel?.neid) continue;
                    const key = seedKeyFromNameAndFlavor(
                        (rel.name as string) || '',
                        (rel.flavor as string) || flavor
                    );
                    const seededDocs = seedEntityDocsByKey.get(key) ?? new Set<string>();
                    seededDocs.add(docNeid);
                    seedEntityDocsByKey.set(key, seededDocs);
                    const canonicalNeid = normalizeNeid(String(rel.neid));
                    const existing = entityByKey.get(key);
                    if (existing) {
                        existing.neid = canonicalNeid;
                        existing.name = (rel.name as string) || existing.name;
                        existing.mcpConfirmed = true;
                        existing.properties = rel.properties ?? existing.properties;
                        if (!existing.sourceDocuments.includes(docNeid)) {
                            existing.sourceDocuments.push(docNeid);
                        }
                    } else {
                        entityByKey.set(key, {
                            neid: canonicalNeid,
                            name: (rel.name as string) || canonicalNeid,
                            flavor: (rel.flavor as string) || flavor,
                            sourceDocuments: [docNeid],
                            extraSourceDocuments: [],
                            origin: 'document',
                            extractedSeed: false,
                            mcpConfirmed: true,
                            properties: rel.properties ?? undefined,
                        });
                    }
                    upsertRelationship(relationshipMap, {
                        sourceNeid: canonicalNeid,
                        targetNeid: docNeid,
                        type: 'appears_in',
                        sourceDocumentNeid: docNeid,
                        origin: 'document',
                        mcpConfirmed: true,
                    });
                    phase1Resolved += 1;
                }
            } catch (error: any) {
                console.error(
                    `Phase 1 seed traversal failed doc=${docNeid} flavor=${flavor}:`,
                    error?.message
                );
            }
        }

        sendStep(
            1,
            'completed',
            'Loading Seed Documents',
            `Resolved ${formatCount(entityByKey.size)} entities from ${formatSeedSummary(seedDocumentCount || documentRootNeids.length, seedEntityCount)}.`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 2: Confirm entity profiles ──────────────────────────
        t0 = Date.now();
        sendStep(2, 'working', 'Confirming Entity Profiles', 'Confirming entity profiles...');

        const unresolvedFlavors = HOP1_FLAVORS.filter((flavor) =>
            Array.from(entityByKey.values()).some(
                (entity) => entity.flavor === flavor && !entity.mcpConfirmed
            )
        );
        const phase1Tasks = documentRootNeids.flatMap((docNeid) =>
            unresolvedFlavors.map((flavor) => ({ docNeid, flavor }))
        );
        let phase2Resolved = 0;
        let phase2Rows = 0;
        let phase2ProcessedTasks = 0;
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
                    } finally {
                        phase2ProcessedTasks += 1;
                        if (
                            phase2ProcessedTasks === phase1Tasks.length ||
                            phase2ProcessedTasks % 4 === 0
                        ) {
                            sendStep(
                                2,
                                'working',
                                'Validating Graph Entities',
                                `Validated ${phase2Resolved} entity matches across ${phase2ProcessedTasks}/${phase1Tasks.length} live graph lookups...`
                            );
                        }
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
            'Confirming Entity Profiles',
            phase1Tasks.length > 0
                ? `Confirmed ${formatCount(phase2Resolved)} entity matches across ${formatCount(phase1Tasks.length)} live graph lookups.`
                : `Using ${formatCount(entityByKey.size)} canonical graph identifiers discovered from seeded documents.`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 3: Seeded event enrichment ──────────────────────────
        t0 = Date.now();
        sendStep(3, 'working', 'Loading Document Events', 'Loading document events...');

        const getEntityByNeid = (neid: string) =>
            Array.from(entityByKey.values()).find((entity) => entity.neid === neid);
        const strictEventHubNeids = seedHints.eventHubNeids
            .map((hubNeidRaw) => normalizeNeid(hubNeidRaw))
            .filter((hubNeid) => {
                const hubEntity = getEntityByNeid(hubNeid);
                if (!hubEntity) return false;
                return hubEntity.sourceDocuments.some((docNeid) => isStrictDocumentNeid(docNeid));
            })
            .filter((hubNeid, idx, arr) => arr.indexOf(hubNeid) === idx);
        let phase3MatchedEvents = 0;
        let phase3ReturnedEvents = 0;
        let phase3ProcessedHubs = 0;
        let phase3ProcessedEvents = 0;
        const phase3StartedAt = Date.now();
        let phase3DeadlineReached = false;
        const activeHubLabels = new Set<string>();
        const activeHubSummary = () => {
            const labels = Array.from(activeHubLabels);
            if (!labels.length) return '';
            const preview = labels.slice(0, 3).join(', ');
            return labels.length > 3
                ? ` Active: ${preview}, +${labels.length - 3} more.`
                : ` Active: ${preview}.`;
        };

        await pMap(
            strictEventHubNeids,
            async (hubNeid) => {
                if (clientDisconnected) return;
                if (Date.now() - phase3StartedAt > PHASE3_DEADLINE_MS) {
                    phase3DeadlineReached = true;
                    return;
                }
                const hubLabel = getEntityByNeid(hubNeid)?.name || hubNeid;
                activeHubLabels.add(hubLabel);
                sendStep(
                    3,
                    'working',
                    'Loading Document Events',
                    `Starting ${hubLabel}. ${formatCount(phase3ProcessedHubs)}/${formatCount(strictEventHubNeids.length)} hubs complete.${activeHubSummary()}`
                );
                try {
                    const eventsByNeid = new Map<string, any>();
                    for (const window of EVENT_TIME_WINDOWS) {
                        if (clientDisconnected) return;
                        if (Date.now() - phase3StartedAt > PHASE3_DEADLINE_MS) {
                            phase3DeadlineReached = true;
                            break;
                        }
                        const result = await callToolWithRetry<any>(
                            'elemental_get_events',
                            {
                                entity_id: { id_type: 'neid', id: hubNeid },
                                limit: 500,
                                include_participants: true,
                                ...(window.time_range ? { time_range: window.time_range } : {}),
                            },
                            // Keep the streaming path responsive. The fallback rebuild already
                            // handles slow or flaky MCP hubs without pinning the UI indefinitely.
                            { timeoutMs: 25_000, attempts: 2 }
                        );
                        const rows = result?.events ?? [];
                        phase3ReturnedEvents += rows.length;
                        for (const evt of rows) {
                            if (!evt?.neid) continue;
                            eventsByNeid.set(normalizeNeid(String(evt.neid)), evt);
                        }
                    }
                    for (const evt of eventsByNeid.values()) {
                        if (clientDisconnected) return;
                        if (Date.now() - phase3StartedAt > PHASE3_DEADLINE_MS) {
                            phase3DeadlineReached = true;
                            break;
                        }
                        const eventNeid = normalizeNeid(String(evt.neid));
                        const eventKey = seedKeyFromNameAndFlavor(
                            (evt.name as string) || '',
                            'event'
                        );
                        let seededEvent = eventByKey.get(eventKey);
                        if (!seededEvent) {
                            const mcpOnlyKey = `mcp:${eventNeid}`;
                            seededEvent = eventByKey.get(mcpOnlyKey);
                            if (!seededEvent) {
                                seededEvent = {
                                    neid: eventNeid,
                                    name: (evt.name as string) || eventNeid,
                                    participantNeids: [],
                                    sourceDocuments: [],
                                    extraSourceDocuments: [],
                                    extractedSeed: false,
                                    mcpConfirmed: true,
                                    properties: {},
                                };
                                eventByKey.set(mcpOnlyKey, seededEvent);
                            }
                        } else {
                            phase3MatchedEvents += 1;
                        }

                        seededEvent.neid = eventNeid;
                        seededEvent.name = (evt.name as string) || seededEvent.name;
                        seededEvent.mcpConfirmed = true;

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
                        const baselineDocSet =
                            seedEventDocsByKey.get(eventKey) ?? new Set<string>();
                        const citedDocNeids = [
                            ...new Set(
                                citations
                                    .map((citation) => citationToDocumentNeid(citation))
                                    .filter((neid): neid is string => Boolean(neid))
                            ),
                        ];
                        const baselineDocNeids = Array.from(baselineDocSet.values()).map(
                            (docNeid) => normalizeNeid(docNeid)
                        );
                        let appearsInDocNeids: string[] = [];
                        if (citedDocNeids.length === 0 && baselineDocNeids.length === 0) {
                            try {
                                const eventDocResult = await callToolWithRetry<any>(
                                    'elemental_get_related',
                                    {
                                        entity_id: { id_type: 'neid', id: eventNeid },
                                        related_flavor: 'document',
                                        direction: 'both',
                                        limit: 100,
                                    },
                                    { timeoutMs: 15_000, attempts: 2 }
                                );
                                const rows = eventDocResult?.relationships ?? [];
                                appearsInDocNeids = [
                                    ...new Set(
                                        rows
                                            .map((row: any) => {
                                                if (row?.neid)
                                                    return normalizeNeid(String(row.neid));
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
                        }
                        const docNeids = [
                            ...new Set(
                                [...baselineDocNeids, ...citedDocNeids, ...appearsInDocNeids].map(
                                    (neid) => normalizeNeid(neid)
                                )
                            ),
                        ].filter((docNeid) => isStrictDocumentNeid(docNeid));
                        const hasStrictDocumentEvidence = docNeids.length > 0;
                        if (!hasStrictDocumentEvidence) continue;
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
                                extractedSeed: true,
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
                                extractedSeed: true,
                                mcpOnly: true,
                            });
                        }
                        phase3ProcessedEvents += 1;
                        if (phase3ProcessedEvents % 10 === 0) {
                            sendStep(
                                3,
                                'working',
                                'Loading Document Events',
                                `Processing ${hubLabel}... ${formatCount(phase3ProcessedHubs)}/${formatCount(strictEventHubNeids.length)} hubs complete, kept ${formatCount(phase3ProcessedEvents)} document-backed events so far.${activeHubSummary()}`
                            );
                        }
                    }
                } catch (error: any) {
                    console.error(
                        `Phase 3 event enrichment failed hub=${hubNeid}:`,
                        error?.message
                    );
                } finally {
                    activeHubLabels.delete(hubLabel);
                    phase3ProcessedHubs += 1;
                    if (
                        phase3ProcessedHubs === strictEventHubNeids.length ||
                        phase3ProcessedHubs % 2 === 0
                    ) {
                        sendStep(
                            3,
                            'working',
                            'Loading Document Events',
                            `Completed ${hubLabel}. ${formatCount(phase3ProcessedHubs)}/${formatCount(strictEventHubNeids.length)} hubs complete, reviewed ${formatCount(phase3ReturnedEvents)} graph events, kept ${formatCount(phase3ProcessedEvents)} document-backed events so far.${activeHubSummary()}`
                        );
                    }
                }
            },
            4
        );
        console.log(
            `[Phase3] event resolution stats: hubs=${strictEventHubNeids.length}, returned=${phase3ReturnedEvents}, matchedRows=${phase3MatchedEvents}`
        );
        if (phase3DeadlineReached) {
            sendStep(
                3,
                'working',
                'Loading Document Events',
                `Event loading hit the ${Math.round(PHASE3_DEADLINE_MS / 1000)}s phase budget; continuing with ${formatCount(phase3ProcessedEvents)} document-backed events.`
            );
        }

        sendStep(
            3,
            'completed',
            'Loading Document Events',
            `Loaded ${formatCount(eventByKey.size)} document-backed events and linked them to participants and documents.`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 4: Relationship assembly ────────────────────────────
        t0 = Date.now();
        sendStep(4, 'working', 'Linking Graph', 'Linking graph...');

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

        sendStep(
            4,
            'completed',
            'Linking Graph',
            `Built ${formatCount(relationshipMap.size)} document-graph relationships and evidence links.`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 5: Property coverage ───────────────────────────────
        t0 = Date.now();
        sendStep(
            5,
            'working',
            'Loading Property History',
            'Hydrating core profiles and property history...'
        );

        // First, get latest core properties for all resolved entity NEIDs so
        // the extracted entity set has canonical IDs, addresses, descriptions,
        // and other flavor-specific profile fields in app state.
        const resolvedEntityTargets = Array.from(
            Array.from(entityByKey.values())
                .reduce((acc, entity) => {
                    if (entity.neid.startsWith('seed:')) return acc;
                    const neid = normalizeNeid(entity.neid);
                    if (!acc.has(neid)) {
                        acc.set(neid, { neid, flavor: entity.flavor });
                    }
                    return acc;
                }, new Map<string, { neid: string; flavor: string }>())
                .values()
        );
        let phase4EntitySuccess = 0;
        await pMap(
            resolvedEntityTargets,
            async ({ neid, flavor }) => {
                try {
                    const requestedProperties = corePropertiesForFlavor(flavor);
                    const result = await callToolWithRetry<any>(
                        'elemental_get_entity',
                        requestedProperties.length > 0
                            ? {
                                  entity_id: { id_type: 'neid', id: neid },
                                  properties: [...requestedProperties],
                              }
                            : {
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

        const resolvedEventNeids = [
            ...new Set(
                Array.from(eventByKey.values())
                    .map((eventItem) => eventItem.neid)
                    .filter((neid) => !neid.startsWith('seed:'))
                    .map((neid) => normalizeNeid(neid))
            ),
        ];
        let phase4EventSuccess = 0;
        await pMap(
            resolvedEventNeids,
            async (neid) => {
                try {
                    const result = await callToolWithRetry<any>(
                        'elemental_get_entity',
                        {
                            entity_id: { id_type: 'neid', id: neid },
                            properties: [...corePropertiesForFlavor('event')],
                        },
                        { timeoutMs: 45_000, attempts: 2 }
                    );
                    const entity = result?.entity ?? result;
                    const target = Array.from(eventByKey.values()).find(
                        (item) => normalizeNeid(item.neid) === neid
                    );
                    if (!target) return;
                    const props = (entity?.properties as Record<string, unknown> | undefined) ?? {};
                    target.name = (entity?.name as string | undefined) ?? target.name;
                    target.mcpConfirmed = true;
                    target.category =
                        stringProperty(props, ['category', 'event_category']) ?? target.category;
                    target.date = stringProperty(props, ['date', 'event_date']) ?? target.date;
                    target.description =
                        stringProperty(props, ['description', 'event_description']) ??
                        target.description;
                    target.likelihood =
                        stringProperty(props, ['likelihood', 'event_likelihood']) ??
                        target.likelihood;
                    target.properties = {
                        ...(target.properties ?? {}),
                        ...props,
                    };
                    phase4EventSuccess += 1;
                } catch (error: any) {
                    console.error(`Phase 5: get_entity event failed neid=${neid}:`, error?.message);
                }
            },
            4
        );

        const propertyBearingNeids = seedHints.propertyBearingNeids
            .map((neid) => normalizeNeid(neid))
            .filter((neid) =>
                Array.from(entityByKey.values()).some(
                    (entity) => normalizeNeid(entity.neid) === neid
                )
            );
        const bondNeid = normalizeNeid('08242646876499346416');
        const propResults = await pMap(
            propertyBearingNeids,
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
            'Loading Property History',
            `Hydrated ${formatCount(phase4EntitySuccess)} entity profiles, ${formatCount(phase4EventSuccess)} event profiles, and loaded ${formatCount(propertySeries.length)} historical property series.`,
            Date.now() - t0
        );
        sendMcpLogSnapshot();

        // ─── Phase 6: Finalize ───────────────────────────────────────
        t0 = Date.now();
        sendStep(
            6,
            'working',
            'Preparing Workspace',
            'Merging the document graph with curated 1-hop context...'
        );

        const documentEntities = Array.from(entityByKey.values());
        const documentEvents = Array.from(eventByKey.values());
        const documentRelationshipCount = relationshipMap.size;
        const enrichmentResult = await runEnrichmentExpansion(
            {
                anchorNeids: documentEntities.map((entity) => entity.neid),
                includeEvents: true,
                maxEntities: ENRICHMENT_MAX_ENTITIES,
                maxRelationships: ENRICHMENT_MAX_RELATIONSHIPS,
                maxEvents: ENRICHMENT_MAX_EVENTS,
                maxEventHubs: ENRICHMENT_MAX_EVENT_HUBS,
            },
            {
                onProgress: (progress) => {
                    sendStep(
                        6,
                        'working',
                        'Preparing Workspace',
                        `${progress.detail} Current graph: ${formatCount(progress.entityCount)} entities, ${formatCount(progress.relationshipCount)} edges, ${formatCount(progress.eventCount)} events.`
                    );
                },
            }
        );
        for (const relationship of enrichmentResult.relationships) {
            upsertRelationship(relationshipMap, relationship);
        }
        const entities = mergeEntities(documentEntities, enrichmentResult.entities);
        const events = mergeEvents(documentEvents, enrichmentResult.events);
        const agreements = entities.filter((e) => e.flavor === 'legal_agreement');
        const relationships = Array.from(relationshipMap.values());
        const selectedDocuments: DocumentRecord[] =
            requestSeedNeids.length > 0 || !isPresetProject
                ? documentRootNeids.map((neid) => ({
                      neid,
                      documentId: neid,
                      title: `Seed ${neid}`,
                      kind: 'User selected seed',
                  }))
                : BNY_DOCUMENTS;
        const projectName = isPresetProject ? BNY_PRESET_PROJECT.name : 'Custom Network';
        const projectDescription = isPresetProject
            ? BNY_PRESET_PROJECT.description
            : 'User-seeded graph project';
        const baseState: CollectionState = {
            meta: {
                projectId: requestProjectId,
                name: projectName,
                description: projectDescription,
                documentCount: selectedDocuments.length,
                entityCount: entities.length,
                eventCount: events.length,
                relationshipCount: relationships.length,
                agreementCount: agreements.length,
                extractedPropertyCount: baselineExtractedPropertyCount,
                extractedPropertyRecordCount: baselineExtractedPropertyRecordCount,
                rawOneHopCounts: { ...auditCounts.rawOneHop },
                curatedOneHopCounts: {
                    entityCount: enrichmentResult.counts.byDepth.degree1.entityCount,
                    eventCount: enrichmentResult.counts.byDepth.degree1.eventCount,
                    relationshipCount: enrichmentResult.counts.byDepth.degree1.relationshipCount,
                },
                enrichmentCounts: {
                    document: {
                        entityCount: documentEntities.length,
                        eventCount: documentEvents.length,
                        relationshipCount: documentRelationshipCount,
                        propertyCount: baselineExtractedPropertyCount,
                    },
                    raw1Degree: {
                        ...enrichmentResult.counts.rawByDepth.degree1,
                    },
                    kgOneHop: {
                        entityCount: auditCounts.rawOneHop.entityCount,
                        eventCount: auditCounts.rawOneHop.eventCount,
                        relationshipCount: auditCounts.rawOneHop.relationshipCount,
                        propertyCount: enrichmentResult.kgTotals.oneHop.propertyCount,
                    },
                },
                kgPerEntity: enrichmentResult.kgTotals.perEntity,
                enrichmentCaps: {
                    maxEntities: enrichmentResult.caps.maxEntities,
                    maxRelationships: enrichmentResult.caps.maxRelationships,
                    maxEvents: enrichmentResult.caps.maxEvents,
                    maxEventHubs: enrichmentResult.caps.maxEventHubs,
                },
                enrichmentTruncated: {
                    entities: enrichmentResult.truncated.entities,
                    relationships: enrichmentResult.truncated.relationships,
                    events: enrichmentResult.truncated.events,
                    eventHubs: enrichmentResult.truncated.eventHubs,
                },
                lastRebuilt: new Date().toISOString(),
            },
            documents: [...selectedDocuments],
            entities,
            relationships,
            events,
            propertySeries,
            status: 'ready',
        };
        sendStep(6, 'working', 'Preparing Workspace', 'Running corporate lineage investigation...');
        const lineageInvestigation = await runCorporateLineageInvestigation(baseState, {
            maxHops: 6,
            maxOrganizations: 250,
            onProgress: (progress) => {
                sendStep(
                    6,
                    'working',
                    'Preparing Workspace',
                    `${progress.detail} Roots: ${formatCount(progress.roots)}, scanned: ${formatCount(progress.scannedOrganizations)}, queue: ${formatCount(progress.queueSize)}, edges: ${formatCount(progress.relationshipCount)}.`
                );
                sendMcpLogSnapshot();
            },
        }).catch((error: any) => ({
            status: 'error' as const,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            roots: [],
            scannedRelationshipTypes: [],
            matchedRelationshipTypes: [],
            scannedOrganizations: 0,
            traversedHops: 0,
            relationships: [],
            chains: [],
            error: error?.message || 'Lineage investigation failed during rebuild.',
        }));
        const state: CollectionState = {
            ...baseState,
            lineageInvestigation,
        };
        const cachedState = await setCachedCollection(state, requestProjectId);

        sendStep(
            6,
            'completed',
            'Preparing Workspace',
            `Graph complete: ${entities.length} entities, ${events.length} events, ${relationships.length} edges, ${baselineExtractedPropertyCount} extracted baseline properties across ${baselineExtractedPropertyRecordCount} records, ${propertySeries.length} property series`,
            Date.now() - t0
        );

        // Send full state and MCP log as final events
        send('state', { state: cachedState });
        sendMcpLogSnapshot();
        send('done', {});
    } catch (error: any) {
        send('error', {
            message: error?.message || 'Rebuild stream failed unexpectedly',
        });
        sendMcpLogSnapshot();
        send('done', {});
    } finally {
        if (heartbeat) clearInterval(heartbeat);
        if (!event.node.res.writableEnded && !event.node.res.destroyed) {
            event.node.res.end();
        }
    }
});
