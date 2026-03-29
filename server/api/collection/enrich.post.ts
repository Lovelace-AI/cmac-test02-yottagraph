import { mcpCallTool } from '~/server/utils/collectionConfig';
import type { EntityRecord, EventRecord, RelationshipRecord } from '~/utils/collectionTypes';

interface EnrichRequest {
    anchorNeids: string[];
    hops?: number;
    includeEvents?: boolean;
    maxEntities?: number;
    maxRelationships?: number;
    maxEvents?: number;
    maxEventHubs?: number;
}

interface EnrichResult {
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
}

const ENRICHMENT_FLAVORS = ['organization', 'person', 'financial_instrument', 'location'] as const;
const MAX_RELATIONSHIPS_PER_CALL = 500;
const MAX_HOPS = 2;
const DEFAULT_MAX_EVENT_HUBS = 12;
const MAX_EVENTS_PER_HUB = 500;
const DEFAULT_MAX_ENTITIES = 6000;
const DEFAULT_MAX_RELATIONSHIPS = 20000;
const DEFAULT_MAX_EVENTS = 6000;
const RELATED_TOOL_TIMEOUT_MS = 8_000;
const EVENTS_TOOL_TIMEOUT_MS = 8_000;

function normalizeNeid(neid: string): string {
    const unpadded = neid.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function sortedUniqueNeids(neids: string[]): string[] {
    return Array.from(new Set(neids.map((neid) => normalizeNeid(neid)))).sort();
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

export default defineEventHandler(async (event): Promise<EnrichResult> => {
    const body = await readBody<EnrichRequest>(event);
    if (!body?.anchorNeids?.length) {
        throw createError({ statusCode: 400, statusMessage: 'anchorNeids required' });
    }

    const hops = Math.max(1, Math.min(body.hops ?? 1, MAX_HOPS));
    const includeEvents = body.includeEvents !== false;
    const maxEntities = Math.max(1, Math.min(body.maxEntities ?? DEFAULT_MAX_ENTITIES, 50000));
    const maxRelationships = Math.max(
        1,
        Math.min(body.maxRelationships ?? DEFAULT_MAX_RELATIONSHIPS, 200000)
    );
    const maxEvents = Math.max(1, Math.min(body.maxEvents ?? DEFAULT_MAX_EVENTS, 50000));
    const maxEventHubs = Math.max(1, Math.min(body.maxEventHubs ?? DEFAULT_MAX_EVENT_HUBS, 1000));
    const entities: EntityRecord[] = [];
    const relationships: RelationshipRecord[] = [];
    const events: EventRecord[] = [];
    const seenEntities = new Set<string>();
    const seenRelationships = new Set<string>();
    const seenEvents = new Set<string>();
    const participantRelationshipType = 'schema::relationship::participant';
    let entitiesTruncated = false;
    let relationshipsTruncated = false;
    let eventsTruncated = false;
    let eventHubsTruncated = false;

    function upsertEntity(row: any, fallbackFlavor: string): string | null {
        if (!row?.neid) return null;
        const normalizedNeid = normalizeNeid(String(row.neid));
        if (seenEntities.has(normalizedNeid)) return normalizedNeid;
        if (entities.length >= maxEntities) {
            entitiesTruncated = true;
            return null;
        }
        seenEntities.add(normalizedNeid);
        entities.push({
            neid: normalizedNeid,
            name: row.name || normalizedNeid,
            flavor: row.flavor || fallbackFlavor,
            sourceDocuments: [],
            origin: 'enriched',
        });
        return normalizedNeid;
    }

    function upsertRelationship(
        sourceNeid: string,
        targetNeid: string,
        relationshipType: string,
        row: any
    ): void {
        const normalizedSourceNeid = normalizeNeid(sourceNeid);
        const normalizedTargetNeid = normalizeNeid(targetNeid);
        const key = `${normalizedSourceNeid}|${normalizedTargetNeid}|${relationshipType}`;
        if (seenRelationships.has(key)) return;
        if (relationships.length >= maxRelationships) {
            relationshipsTruncated = true;
            return;
        }
        seenRelationships.add(key);
        relationships.push({
            sourceNeid: normalizedSourceNeid,
            targetNeid: normalizedTargetNeid,
            type: relationshipType,
            origin: 'enriched',
            properties: row?.properties ?? {},
            citations: Array.isArray(row?.citations) ? row.citations : [],
        });
    }

    function upsertEvent(evt: any): string | null {
        if (!evt?.neid) return null;
        const eventNeid = normalizeNeid(String(evt.neid));
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
        events.push({
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
        });
        return eventNeid;
    }

    async function expandOneHop(sourceNeids: string[]): Promise<string[]> {
        const discovered = new Set<string>();
        for (const neid of sortedUniqueNeids(sourceNeids)) {
            for (const flavor of ENRICHMENT_FLAVORS) {
                try {
                    const result = await mcpCallTool(
                        'elemental_get_related',
                        {
                            entity_id: { id_type: 'neid', id: neid },
                            related_flavor: flavor,
                            limit: MAX_RELATIONSHIPS_PER_CALL,
                            direction: 'both',
                        },
                        { timeoutMs: RELATED_TOOL_TIMEOUT_MS }
                    );

                    const sortedRelationships = Array.from(result?.relationships ?? []).sort(
                        (a: any, b: any) => {
                            const aNeid = normalizeNeid(String(a?.neid ?? ''));
                            const bNeid = normalizeNeid(String(b?.neid ?? ''));
                            return aNeid.localeCompare(bNeid);
                        }
                    );
                    for (const rel of sortedRelationships) {
                        const targetNeid = upsertEntity(rel, flavor);
                        if (!targetNeid) continue;
                        const relationshipTypes = relationshipTypesFromRow(rel);
                        for (const relationshipType of relationshipTypes) {
                            upsertRelationship(neid, targetNeid, relationshipType, rel);
                        }
                        discovered.add(targetNeid);
                    }
                } catch {
                    // Non-critical: skip flavors that error
                }
            }
        }
        return Array.from(discovered).sort();
    }

    const frontierVisited = new Set<string>();
    let frontier = sortedUniqueNeids(body.anchorNeids);
    for (const neid of frontier) {
        seenEntities.add(neid);
        frontierVisited.add(neid);
    }
    for (let depth = 1; depth <= hops && frontier.length > 0; depth += 1) {
        if (entities.length >= maxEntities && relationships.length >= maxRelationships) break;
        const discovered = await expandOneHop(frontier);
        frontier = discovered.filter((neid) => {
            if (frontierVisited.has(neid)) return false;
            frontierVisited.add(neid);
            return true;
        });
    }

    if (includeEvents) {
        const sortedHubNeids = Array.from(frontierVisited).sort();
        const eventHubNeids = sortedHubNeids.slice(0, maxEventHubs);
        eventHubsTruncated = sortedHubNeids.length > eventHubNeids.length;
        for (const hubNeid of eventHubNeids) {
            if (events.length >= maxEvents) break;
            try {
                const result = await mcpCallTool(
                    'elemental_get_events',
                    {
                        entity_id: { id_type: 'neid', id: hubNeid },
                        limit: MAX_EVENTS_PER_HUB,
                        include_participants: true,
                    },
                    { timeoutMs: EVENTS_TOOL_TIMEOUT_MS }
                );
                const sortedEvents = Array.from(result?.events ?? []).sort((a: any, b: any) =>
                    normalizeNeid(String(a?.neid ?? '')).localeCompare(
                        normalizeNeid(String(b?.neid ?? ''))
                    )
                );
                for (const evt of sortedEvents) {
                    if (events.length >= maxEvents) {
                        eventsTruncated = true;
                        break;
                    }
                    const eventNeid = upsertEvent(evt);
                    if (!eventNeid) continue;
                    for (const participant of evt.participants ?? []) {
                        if (!participant?.neid) continue;
                        const participantNeid = upsertEntity(
                            {
                                neid: participant.neid,
                                name: participant.name,
                                flavor: participant.flavor ?? 'organization',
                                properties: participant.properties ?? {},
                            },
                            'organization'
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
                            }
                        );
                    }
                }
            } catch {
                // Non-critical: skip hubs that error
            }
        }
    }

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
    };
});
