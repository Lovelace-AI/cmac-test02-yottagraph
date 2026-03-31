import { mcpCallTool } from '~/server/utils/collectionConfig';
import type { EntityRecord, EventRecord, RelationshipRecord } from '~/utils/collectionTypes';

export interface EnrichmentExpandRequest {
    anchorNeids: string[];
    includeEvents?: boolean;
    maxEntities?: number;
    maxRelationships?: number;
    maxEvents?: number;
    maxEventHubs?: number;
}

export interface EnrichmentExpandProgress {
    phase: 'relationships' | 'events';
    detail: string;
    elapsedMs: number;
    depth?: number;
    completedTasks: number;
    totalTasks: number;
    entityCount: number;
    relationshipCount: number;
    eventCount: number;
}

export interface EnrichmentExpandOptions {
    onProgress?: (update: EnrichmentExpandProgress) => void;
}

export interface EnrichmentExpandResult {
    entities: EntityRecord[];
    relationships: RelationshipRecord[];
    events: EventRecord[];
    caps: {
        maxHops: number;
        maxEntities: number;
        maxRelationships: number;
        maxEvents: number;
        maxEventHubs: number;
        perCallRelatedLimit: number;
        perCallEventsLimit: number;
    };
    truncated: {
        entities: boolean;
        relationships: boolean;
        events: boolean;
        eventHubs: boolean;
    };
    diagnostics: {
        totalMs: number;
        relatedCalls: number;
        relatedErrors: number;
        eventCalls: number;
        eventErrors: number;
        hopMs: Array<{ depth: number; ms: number; sourceCount: number; discoveredCount: number }>;
        eventsMs: number;
    };
    counts: {
        raw: {
            entityCount: number;
            eventCount: number;
            relationshipCount: number;
            propertyCount: number;
        };
        rawByDepth: {
            degree1: {
                entityCount: number;
                relationshipCount: number;
                eventCount: number;
                propertyCount: number;
            };
        };
        curated: {
            entityCount: number;
            relationshipCount: number;
            eventCount: number;
            propertyCount: number;
        };
        byDepth: {
            degree1: {
                entityCount: number;
                relationshipCount: number;
                eventCount: number;
                propertyCount: number;
            };
        };
    };
    kgTotals: {
        oneHop: {
            entityCount: number;
            relationshipCount: number;
            eventCount: number;
            propertyCount: number;
        };
        perEntity: Array<{
            neid: string;
            relationshipCount: number;
            eventCount: number;
        }>;
    };
}

const ENRICHMENT_FLAVORS = [
    'organization',
    'person',
    'financial_instrument',
    'fund_account',
    'legal_agreement',
    'location',
    'cusip_number',
    'event',
] as const;
const MAX_RELATIONSHIPS_PER_CALL = 500;
const MAX_HOPS = 1;
const DEFAULT_MAX_EVENT_HUBS = 250;
const MAX_EVENTS_PER_HUB = 500;
const DEFAULT_MAX_ENTITIES = 100_000;
const DEFAULT_MAX_RELATIONSHIPS = 100_000;
const DEFAULT_MAX_EVENTS = 50_000;
const RELATED_TOOL_TIMEOUT_MS = 8_000;
const EVENTS_TOOL_TIMEOUT_MS = 8_000;
const RELATED_CALL_CONCURRENCY = 10;
const EVENT_CALL_CONCURRENCY = 4;
const PROGRESS_REPORT_INTERVAL_MS = 12_000;
const EVENT_TIME_WINDOWS: Array<{ time_range?: { after?: string; before?: string } }> = [
    { time_range: { after: '2018-01-01', before: '2026-12-31' } },
    { time_range: { before: '2018-01-01' } },
];
const CURATED_NODE_FLAVORS = new Set<string>([
    'organization',
    'person',
    'financial_instrument',
    'fund_account',
    'legal_agreement',
    'location',
    'event',
    'cusip_number',
]);
const EXCLUDED_RELATIONSHIP_KEYWORDS = [
    'born_in',
    'died_in',
    'wikidata',
    'wikipedia',
    'instance_of',
];
const INCLUDED_RELATIONSHIP_KEYWORDS = [
    'participant',
    'issuer',
    'beneficiary',
    'borrower',
    'trustee',
    'advisor',
    'party',
    'location',
    'located',
    'parent',
    'subsidiary',
    'owner',
    'ownership',
    'predecessor',
    'successor',
    'sponsor',
    'fund_of',
    'holds_investment',
    'works_at',
    'board_member',
    'officer',
    'underwriter',
    'counterparty',
    'guarantor',
];

function normalizeNeid(neid: string): string {
    const unpadded = neid.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function sortedUniqueNeids(neids: string[]): string[] {
    return Array.from(new Set(neids.map((neid) => normalizeNeid(neid)))).sort();
}

function uniqueOrderedNeids(neids: string[]): string[] {
    const ordered: string[] = [];
    const seen = new Set<string>();
    for (const neid of neids) {
        const normalized = normalizeNeid(neid);
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        ordered.push(normalized);
    }
    return ordered;
}

function relationshipTypesFromRow(row: any): string[] {
    const types = Array.isArray(row?.relationship_types) ? row.relationship_types : [];
    if (!types.length) return ['related'];
    return Array.from(
        new Set(
            types
                .map((item) => String(item ?? '').trim())
                .filter((item) => item.length > 0)
                .sort()
        )
    );
}

function normalizeRelationshipLabel(type: string): string {
    return String(type ?? '')
        .trim()
        .replace(/^schema::relationship::/, '')
        .toLowerCase();
}

function shouldKeepRelationshipType(type: string): boolean {
    const normalized = normalizeRelationshipLabel(type);
    if (!normalized) return false;
    if (EXCLUDED_RELATIONSHIP_KEYWORDS.some((keyword) => normalized.includes(keyword)))
        return false;
    return INCLUDED_RELATIONSHIP_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function shouldKeepEntityFlavor(flavor: string): boolean {
    const normalized = String(flavor ?? '')
        .trim()
        .replace(/^schema::flavor::/, '')
        .toLowerCase();
    return CURATED_NODE_FLAVORS.has(normalized);
}

function countRecordProperties(record: { properties?: Record<string, unknown> }): number {
    return Object.keys(record.properties ?? {}).length;
}

function normalizeTotalCount(value: unknown, fallbackCount: number): number {
    const parsed =
        typeof value === 'number'
            ? value
            : typeof value === 'string'
              ? Number.parseInt(value, 10)
              : Number.NaN;
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    return fallbackCount;
}

async function pMap<T>(
    items: T[],
    fn: (item: T) => Promise<void>,
    concurrency: number
): Promise<void> {
    let nextIndex = 0;
    async function worker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++;
            await fn(items[currentIndex]);
        }
    }
    const workerCount = Math.max(1, Math.min(concurrency, items.length));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

export async function runEnrichmentExpansion(
    body: EnrichmentExpandRequest,
    options: EnrichmentExpandOptions = {}
): Promise<EnrichmentExpandResult> {
    const hops = 1;
    const includeEvents = body.includeEvents !== false;
    const maxEntities = Math.max(1, Math.min(body.maxEntities ?? DEFAULT_MAX_ENTITIES, 100000));
    const maxRelationships = Math.max(
        1,
        Math.min(body.maxRelationships ?? DEFAULT_MAX_RELATIONSHIPS, 100000)
    );
    const maxEvents = Math.max(1, Math.min(body.maxEvents ?? DEFAULT_MAX_EVENTS, 50000));
    const maxEventHubs = Math.max(1, Math.min(body.maxEventHubs ?? DEFAULT_MAX_EVENT_HUBS, 1000));
    const entities: EntityRecord[] = [];
    const relationships: RelationshipRecord[] = [];
    const events: EventRecord[] = [];
    const seenEntities = new Set<string>();
    const seenRelationships = new Set<string>();
    const seenEvents = new Set<string>();
    const entityByNeid = new Map<string, EntityRecord>();
    const relationshipByKey = new Map<string, RelationshipRecord>();
    const eventByNeid = new Map<string, EventRecord>();
    const entityDepthByNeid = new Map<string, number>();
    const eventDepthByNeid = new Map<string, number>();
    const participantRelationshipType = 'schema::relationship::participant';
    const runStartedAt = Date.now();
    const hopMs: Array<{
        depth: number;
        ms: number;
        sourceCount: number;
        discoveredCount: number;
    }> = [];
    let relatedCalls = 0;
    let relatedErrors = 0;
    let eventCalls = 0;
    let eventErrors = 0;
    let entitiesTruncated = false;
    let relationshipsTruncated = false;
    let eventsTruncated = false;
    let eventHubsTruncated = false;
    const rawEntityCandidates = new Set<string>();
    const rawEntityCandidatesByDepth = new Map<number, Set<string>>();
    const rawEventCandidates = new Set<string>();
    const rawEventCandidatesByDepth = new Map<number, Set<string>>();
    let rawRelationshipCandidates = 0;
    const rawRelationshipCandidatesByDepth = new Map<number, number>();
    const rawPropertyCandidatesByDepth = new Map<number, number>();
    const kgRelatedTotalByDepth = new Map<number, number>();
    const kgRelatedTotalByNeid = new Map<string, number>();
    const kgEventTotalByNeid = new Map<string, number>();
    const capsReached = () =>
        entities.length >= maxEntities || relationships.length >= maxRelationships;
    const eventPhaseCapsReached = () => capsReached() || events.length >= maxEvents;
    let lastProgressReportAt = 0;

    function reportProgress(
        update: Omit<
            EnrichmentExpandProgress,
            'elapsedMs' | 'entityCount' | 'relationshipCount' | 'eventCount'
        >,
        force = false
    ): void {
        if (!options.onProgress) return;
        const now = Date.now();
        if (!force && now - lastProgressReportAt < PROGRESS_REPORT_INTERVAL_MS) return;
        lastProgressReportAt = now;
        options.onProgress({
            ...update,
            elapsedMs: now - runStartedAt,
            entityCount: entities.length,
            relationshipCount: relationships.length,
            eventCount: events.length,
        });
    }

    function addRawEntityCandidate(neid: string, depth: number): void {
        const normalized = normalizeNeid(neid);
        rawEntityCandidates.add(normalized);
        const boundedDepth = Math.max(1, Math.min(depth, MAX_HOPS));
        if (!rawEntityCandidatesByDepth.has(boundedDepth)) {
            rawEntityCandidatesByDepth.set(boundedDepth, new Set<string>());
        }
        rawEntityCandidatesByDepth.get(boundedDepth)?.add(normalized);
    }

    function addRawEventCandidate(neid: string, depth: number): void {
        const normalized = normalizeNeid(neid);
        rawEventCandidates.add(normalized);
        const boundedDepth = Math.max(1, Math.min(depth, MAX_HOPS));
        if (!rawEventCandidatesByDepth.has(boundedDepth)) {
            rawEventCandidatesByDepth.set(boundedDepth, new Set<string>());
        }
        rawEventCandidatesByDepth.get(boundedDepth)?.add(normalized);
    }

    function addRawRelationshipCandidate(count: number, depth: number): void {
        rawRelationshipCandidates += count;
        const boundedDepth = Math.max(1, Math.min(depth, MAX_HOPS));
        rawRelationshipCandidatesByDepth.set(
            boundedDepth,
            (rawRelationshipCandidatesByDepth.get(boundedDepth) ?? 0) + count
        );
    }

    function addRawPropertyCandidate(count: number, depth: number): void {
        const boundedDepth = Math.max(1, Math.min(depth, MAX_HOPS));
        rawPropertyCandidatesByDepth.set(
            boundedDepth,
            (rawPropertyCandidatesByDepth.get(boundedDepth) ?? 0) + count
        );
    }

    function addKgRelatedTotal(sourceNeid: string, depth: number, count: number): void {
        const normalizedSourceNeid = normalizeNeid(sourceNeid);
        const boundedDepth = Math.max(1, Math.min(depth, MAX_HOPS));
        kgRelatedTotalByDepth.set(
            boundedDepth,
            (kgRelatedTotalByDepth.get(boundedDepth) ?? 0) + count
        );
        kgRelatedTotalByNeid.set(
            normalizedSourceNeid,
            (kgRelatedTotalByNeid.get(normalizedSourceNeid) ?? 0) + count
        );
    }

    function addKgEventTotal(sourceNeid: string, count: number): void {
        const normalizedSourceNeid = normalizeNeid(sourceNeid);
        kgEventTotalByNeid.set(
            normalizedSourceNeid,
            (kgEventTotalByNeid.get(normalizedSourceNeid) ?? 0) + count
        );
    }

    function upsertEntity(row: any, fallbackFlavor: string, depth: number): string | null {
        if (!row?.neid) return null;
        const normalizedNeid = normalizeNeid(String(row.neid));
        const resolvedFlavor = String(row.flavor || fallbackFlavor || '').replace(
            /^schema::flavor::/,
            ''
        );
        if (!shouldKeepEntityFlavor(resolvedFlavor)) return null;
        const existingDepth = entityDepthByNeid.get(normalizedNeid);
        if (existingDepth === undefined || depth < existingDepth) {
            entityDepthByNeid.set(normalizedNeid, depth);
            const existingEntity = entityByNeid.get(normalizedNeid);
            if (existingEntity) existingEntity.enrichmentDepth = depth;
        }
        if (seenEntities.has(normalizedNeid)) return normalizedNeid;
        if (entities.length >= maxEntities) {
            entitiesTruncated = true;
            return null;
        }
        seenEntities.add(normalizedNeid);
        const entityRecord: EntityRecord = {
            neid: normalizedNeid,
            name: row.name || normalizedNeid,
            flavor: resolvedFlavor || fallbackFlavor,
            sourceDocuments: [],
            origin: 'enriched',
            extractedSeed: false,
            mcpConfirmed: true,
            properties: row.properties ?? undefined,
            enrichmentDepth: depth,
        };
        entities.push(entityRecord);
        entityByNeid.set(normalizedNeid, entityRecord);
        return normalizedNeid;
    }

    function upsertRelationship(
        sourceNeid: string,
        targetNeid: string,
        relationshipType: string,
        row: any,
        depth: number
    ): void {
        if (!shouldKeepRelationshipType(relationshipType)) return;
        const normalizedSourceNeid = normalizeNeid(sourceNeid);
        const normalizedTargetNeid = normalizeNeid(targetNeid);
        const key = `${normalizedSourceNeid}|${normalizedTargetNeid}|${relationshipType}`;
        const existingRelationship = relationshipByKey.get(key);
        if (existingRelationship) {
            if (
                typeof existingRelationship.enrichmentDepth !== 'number' ||
                depth < existingRelationship.enrichmentDepth
            ) {
                existingRelationship.enrichmentDepth = depth;
            }
            return;
        }
        if (relationships.length >= maxRelationships) {
            relationshipsTruncated = true;
            return;
        }
        seenRelationships.add(key);
        const relationshipRecord: RelationshipRecord = {
            sourceNeid: normalizedSourceNeid,
            targetNeid: normalizedTargetNeid,
            type: relationshipType,
            recordedAt:
                (row?.timestamp as string | undefined) ?? (row?.recorded_at as string | undefined),
            origin: 'enriched',
            properties: row?.properties ?? {},
            citations: Array.isArray(row?.citations) ? row.citations : [],
            extractedSeed: false,
            mcpConfirmed: true,
            enrichmentDepth: depth,
        };
        relationships.push(relationshipRecord);
        relationshipByKey.set(key, relationshipRecord);
    }

    function upsertEvent(evt: any, depth: number): string | null {
        if (!evt?.neid) return null;
        const eventNeid = normalizeNeid(String(evt.neid));
        const existingDepth = eventDepthByNeid.get(eventNeid);
        if (existingDepth === undefined || depth < existingDepth) {
            eventDepthByNeid.set(eventNeid, depth);
            const existingEvent = eventByNeid.get(eventNeid);
            if (existingEvent) existingEvent.enrichmentDepth = depth;
        }
        if (seenEvents.has(eventNeid)) return eventNeid;
        if (events.length >= maxEvents) {
            eventsTruncated = true;
            return null;
        }
        seenEvents.add(eventNeid);
        const props = evt.properties ?? {};
        const participantNeids = Array.isArray(evt.participants)
            ? sortedUniqueNeids(
                  evt.participants
                      .map((participant: any) => participant?.neid)
                      .filter((participantNeid: string | undefined): participantNeid is string =>
                          Boolean(participantNeid)
                      )
              )
            : [];
        const eventRecord: EventRecord = {
            neid: eventNeid,
            name: (evt.name as string) || eventNeid,
            category: (props.event_category?.value ?? props.category?.value) as string | undefined,
            date: (props.event_date?.value ?? props.date?.value) as string | undefined,
            description: (props.event_description?.value ?? props.description?.value) as
                | string
                | undefined,
            likelihood: (props.event_likelihood?.value ?? props.likelihood?.value) as
                | string
                | undefined,
            participantNeids,
            sourceDocuments: [],
            citations: Array.isArray(evt?.citations) ? evt.citations : [],
            properties: props,
            extractedSeed: false,
            mcpConfirmed: true,
            enrichmentDepth: depth,
        };
        events.push(eventRecord);
        eventByNeid.set(eventNeid, eventRecord);
        return eventNeid;
    }

    async function expandOneHop(sourceNeids: string[], depth: number): Promise<string[]> {
        const discovered = new Set<string>();
        const tasks = sortedUniqueNeids(sourceNeids).flatMap((neid) =>
            ENRICHMENT_FLAVORS.map((flavor) => ({ neid, flavor }))
        );
        let completedTasks = 0;
        reportProgress(
            {
                phase: 'relationships',
                depth,
                completedTasks,
                totalTasks: tasks.length,
                detail: `Hop ${depth}/${hops}: starting ${tasks.length.toLocaleString()} related lookups from ${sourceNeids.length.toLocaleString()} anchors.`,
            },
            true
        );
        await pMap(
            tasks,
            async ({ neid, flavor }) => {
                try {
                    relatedCalls += 1;
                    const allowRowProcessing = !capsReached();
                    const result = await mcpCallTool(
                        'elemental_get_related',
                        {
                            entity_id: { id_type: 'neid', id: neid },
                            related_flavor: flavor,
                            limit: allowRowProcessing ? MAX_RELATIONSHIPS_PER_CALL : 1,
                            direction: 'both',
                        },
                        { timeoutMs: RELATED_TOOL_TIMEOUT_MS }
                    );
                    const totalRelated = normalizeTotalCount(
                        result?.total,
                        Array.isArray(result?.relationships) ? result.relationships.length : 0
                    );
                    addKgRelatedTotal(neid, depth, totalRelated);
                    if (!allowRowProcessing) {
                        if (entities.length >= maxEntities) entitiesTruncated = true;
                        if (relationships.length >= maxRelationships) relationshipsTruncated = true;
                        return;
                    }

                    const sortedRelationships = Array.from(result?.relationships ?? []).sort(
                        (a: any, b: any) => {
                            const aNeid = normalizeNeid(String(a?.neid ?? ''));
                            const bNeid = normalizeNeid(String(b?.neid ?? ''));
                            return aNeid.localeCompare(bNeid);
                        }
                    );
                    for (const rel of sortedRelationships) {
                        if (capsReached()) break;
                        if (rel?.neid) addRawEntityCandidate(String(rel.neid), depth);
                        const relationshipTypeCount = relationshipTypesFromRow(rel).length;
                        addRawRelationshipCandidate(relationshipTypeCount, depth);
                        addRawPropertyCandidate(countRecordProperties(rel), depth);
                        const targetNeid = upsertEntity(rel, flavor, depth);
                        if (!targetNeid) continue;
                        const relationshipTypes = relationshipTypesFromRow(rel);
                        for (const relationshipType of relationshipTypes) {
                            upsertRelationship(neid, targetNeid, relationshipType, rel, depth);
                        }
                        discovered.add(targetNeid);
                    }
                } catch {
                    relatedErrors += 1;
                } finally {
                    completedTasks += 1;
                    reportProgress({
                        phase: 'relationships',
                        depth,
                        completedTasks,
                        totalTasks: tasks.length,
                        detail:
                            `Hop ${depth}/${hops}: processed ${completedTasks.toLocaleString()}/${tasks.length.toLocaleString()} related lookups, discovered ` +
                            `${discovered.size.toLocaleString()} candidates so far.`,
                    });
                }
            },
            RELATED_CALL_CONCURRENCY
        );
        reportProgress(
            {
                phase: 'relationships',
                depth,
                completedTasks,
                totalTasks: tasks.length,
                detail: `Hop ${depth}/${hops}: finished ${tasks.length.toLocaleString()} related lookups, discovered ${discovered.size.toLocaleString()} candidates.`,
            },
            true
        );
        return Array.from(discovered).sort();
    }

    const frontierVisited = new Set<string>();
    let frontier = sortedUniqueNeids(body.anchorNeids);
    for (const neid of frontier) {
        seenEntities.add(neid);
        entityDepthByNeid.set(neid, 0);
        frontierVisited.add(neid);
    }
    for (let depth = 1; depth <= hops && frontier.length > 0; depth += 1) {
        if (capsReached()) break;
        const hopStartedAt = Date.now();
        const sourceCount = frontier.length;
        const discovered = await expandOneHop(frontier, depth);
        const hopElapsed = Date.now() - hopStartedAt;
        hopMs.push({ depth, ms: hopElapsed, sourceCount, discoveredCount: discovered.length });
        frontier = discovered.filter((neid) => {
            if (frontierVisited.has(neid)) return false;
            frontierVisited.add(neid);
            return true;
        });
    }

    let eventsMs = 0;
    if (includeEvents) {
        const eventsStartedAt = Date.now();
        const sortedHubNeids = Array.from(frontierVisited).sort();
        const prioritizedHubNeids = uniqueOrderedNeids([...body.anchorNeids, ...sortedHubNeids]);
        const eventHubNeids = prioritizedHubNeids.slice(0, maxEventHubs);
        eventHubsTruncated = sortedHubNeids.length > eventHubNeids.length;
        let completedEventTasks = 0;
        reportProgress(
            {
                phase: 'events',
                completedTasks: completedEventTasks,
                totalTasks: eventHubNeids.length,
                detail:
                    `Events: starting ${eventHubNeids.length.toLocaleString()} event hub lookups` +
                    (eventHubsTruncated
                        ? ` (trimmed from ${sortedHubNeids.length.toLocaleString()} hubs).`
                        : '.'),
            },
            true
        );
        await pMap(
            eventHubNeids,
            async (hubNeid) => {
                const hubDepth = entityDepthByNeid.get(hubNeid) ?? 0;
                const eventDepth = Math.max(1, Math.min(hops, hubDepth || 1));
                try {
                    eventCalls += 1;
                    const allowRowProcessing = !eventPhaseCapsReached();
                    const eventsByNeid = new Map<string, any>();
                    for (const window of EVENT_TIME_WINDOWS) {
                        const result = await mcpCallTool(
                            'elemental_get_events',
                            {
                                entity_id: { id_type: 'neid', id: hubNeid },
                                limit: allowRowProcessing ? MAX_EVENTS_PER_HUB : 1,
                                include_participants: true,
                                ...(window.time_range ? { time_range: window.time_range } : {}),
                            },
                            { timeoutMs: EVENTS_TOOL_TIMEOUT_MS }
                        );
                        const totalEvents = normalizeTotalCount(
                            result?.total,
                            Array.isArray(result?.events) ? result.events.length : 0
                        );
                        addKgEventTotal(hubNeid, totalEvents);
                        if (!allowRowProcessing) {
                            if (events.length >= maxEvents) eventsTruncated = true;
                            continue;
                        }
                        for (const evt of result?.events ?? []) {
                            if (!evt?.neid) continue;
                            const normalizedEventNeid = normalizeNeid(String(evt.neid));
                            addRawEventCandidate(normalizedEventNeid, eventDepth);
                            addRawPropertyCandidate(countRecordProperties(evt), eventDepth);
                            eventsByNeid.set(normalizedEventNeid, evt);
                        }
                    }
                    const sortedEvents = Array.from(eventsByNeid.values()).sort((a: any, b: any) =>
                        normalizeNeid(String(a?.neid ?? '')).localeCompare(
                            normalizeNeid(String(b?.neid ?? ''))
                        )
                    );
                    for (const evt of sortedEvents) {
                        if (eventPhaseCapsReached()) {
                            eventsTruncated = true;
                            break;
                        }
                        const eventNeid = upsertEvent(evt, eventDepth);
                        if (!eventNeid) continue;
                        for (const participant of evt.participants ?? []) {
                            if (capsReached()) {
                                entitiesTruncated = true;
                                relationshipsTruncated = true;
                                break;
                            }
                            if (!participant?.neid) continue;
                            addRawEntityCandidate(String(participant.neid), eventDepth);
                            addRawRelationshipCandidate(1, eventDepth);
                            addRawPropertyCandidate(
                                countRecordProperties({
                                    properties: participant?.properties ?? {},
                                }),
                                eventDepth
                            );
                            const participantNeid = upsertEntity(
                                {
                                    neid: participant.neid,
                                    name: participant.name,
                                    flavor: participant.flavor ?? 'organization',
                                    properties: participant.properties ?? {},
                                },
                                'organization',
                                eventDepth
                            );
                            if (!participantNeid) continue;
                            upsertRelationship(
                                participantNeid,
                                eventNeid,
                                participantRelationshipType,
                                {
                                    properties: participant?.properties ?? {},
                                    citations: Array.isArray(participant?.citations)
                                        ? participant.citations
                                        : [],
                                },
                                eventDepth
                            );
                        }
                    }
                } catch {
                    eventErrors += 1;
                } finally {
                    completedEventTasks += 1;
                    reportProgress({
                        phase: 'events',
                        completedTasks: completedEventTasks,
                        totalTasks: eventHubNeids.length,
                        detail:
                            `Events: processed ${completedEventTasks.toLocaleString()}/${eventHubNeids.length.toLocaleString()} event hubs, collected ` +
                            `${events.length.toLocaleString()} curated events so far.`,
                    });
                }
            },
            EVENT_CALL_CONCURRENCY
        );
        eventsMs = Date.now() - eventsStartedAt;
        reportProgress(
            {
                phase: 'events',
                completedTasks: completedEventTasks,
                totalTasks: eventHubNeids.length,
                detail: `Events: finished ${eventHubNeids.length.toLocaleString()} event hub lookups, collected ${events.length.toLocaleString()} curated events.`,
            },
            true
        );
    }

    const summarizeByDepth = (maxDepth: number) => {
        const depthEntities = entities.filter(
            (entity) => (entity.enrichmentDepth ?? Number.POSITIVE_INFINITY) <= maxDepth
        );
        const depthRelationships = relationships.filter(
            (relationship) => (relationship.enrichmentDepth ?? Number.POSITIVE_INFINITY) <= maxDepth
        );
        const depthEvents = events.filter(
            (eventItem) => (eventItem.enrichmentDepth ?? Number.POSITIVE_INFINITY) <= maxDepth
        );
        const propertyCount =
            depthEntities.reduce((sum, entity) => sum + countRecordProperties(entity), 0) +
            depthEvents.reduce((sum, eventItem) => sum + countRecordProperties(eventItem), 0);
        return {
            entityCount: depthEntities.length,
            relationshipCount: depthRelationships.length,
            eventCount: depthEvents.length,
            propertyCount,
        };
    };

    const degree1Summary = summarizeByDepth(1);
    const summarizeRawByDepth = (maxDepth: number) => {
        const boundedDepth = Math.max(1, Math.min(maxDepth, MAX_HOPS));
        const entityNeids = new Set<string>();
        const eventNeids = new Set<string>();
        let relationshipCount = 0;
        let propertyCount = 0;
        for (let depth = 1; depth <= boundedDepth; depth += 1) {
            for (const neid of rawEntityCandidatesByDepth.get(depth) ?? []) entityNeids.add(neid);
            for (const neid of rawEventCandidatesByDepth.get(depth) ?? []) eventNeids.add(neid);
            relationshipCount += rawRelationshipCandidatesByDepth.get(depth) ?? 0;
            propertyCount += rawPropertyCandidatesByDepth.get(depth) ?? 0;
        }
        return {
            entityCount: entityNeids.size,
            relationshipCount,
            eventCount: eventNeids.size,
            propertyCount,
        };
    };
    const rawDegree1Summary = summarizeRawByDepth(1);
    const oneHopRelationshipCount = kgRelatedTotalByDepth.get(1) ?? 0;
    const oneHopEventCount = Array.from(kgEventTotalByNeid.entries()).reduce(
        (sum, [neid, count]) => {
            if ((entityDepthByNeid.get(neid) ?? Number.POSITIVE_INFINITY) > 0) return sum;
            return sum + count;
        },
        0
    );
    const oneHopEntityCount = oneHopRelationshipCount;
    const perEntity = Array.from(kgRelatedTotalByNeid.entries())
        .map(([neid, relationshipCount]) => ({
            neid,
            relationshipCount,
            eventCount: kgEventTotalByNeid.get(neid) ?? 0,
        }))
        .sort((a, b) => {
            const relDelta = b.relationshipCount - a.relationshipCount;
            if (relDelta !== 0) return relDelta;
            const eventDelta = b.eventCount - a.eventCount;
            if (eventDelta !== 0) return eventDelta;
            return a.neid.localeCompare(b.neid);
        });

    return {
        entities,
        relationships,
        events,
        caps: {
            maxHops: MAX_HOPS,
            maxEntities,
            maxRelationships,
            maxEvents,
            maxEventHubs,
            perCallRelatedLimit: MAX_RELATIONSHIPS_PER_CALL,
            perCallEventsLimit: MAX_EVENTS_PER_HUB,
        },
        truncated: {
            entities: entitiesTruncated,
            relationships: relationshipsTruncated,
            events: eventsTruncated,
            eventHubs: eventHubsTruncated,
        },
        diagnostics: {
            totalMs: Date.now() - runStartedAt,
            relatedCalls,
            relatedErrors,
            eventCalls,
            eventErrors,
            hopMs,
            eventsMs,
        },
        counts: {
            raw: {
                entityCount: rawEntityCandidates.size,
                eventCount: rawEventCandidates.size,
                relationshipCount: rawRelationshipCandidates,
                propertyCount: rawDegree1Summary.propertyCount,
            },
            rawByDepth: {
                degree1: rawDegree1Summary,
            },
            curated: {
                entityCount: entities.length,
                relationshipCount: relationships.length,
                eventCount: events.length,
                propertyCount: degree1Summary.propertyCount,
            },
            byDepth: {
                degree1: degree1Summary,
            },
        },
        kgTotals: {
            oneHop: {
                entityCount: oneHopEntityCount,
                relationshipCount: oneHopRelationshipCount,
                eventCount: oneHopEventCount,
                propertyCount: 0,
            },
            perEntity,
        },
    };
}
