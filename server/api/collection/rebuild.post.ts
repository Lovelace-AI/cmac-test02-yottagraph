import { mcpCallTool, resetMcpSession } from '~/server/utils/collectionConfig';
import { setCachedCollection } from '~/server/api/collection/bootstrap.get';
import {
    BNY_DOCUMENTS,
    BNY_DOCUMENT_NEIDS,
    HOP1_FLAVORS,
    type EntityRecord,
    type RelationshipRecord,
    type EventRecord,
    type CollectionState,
} from '~/utils/collectionTypes';

const EVENT_HUB_FLAVORS = ['financial_instrument', 'organization', 'fund_account'] as const;
const MAX_EVENT_HUBS = 15;

const RELATIONSHIP_PROBES: Array<{
    sourceFlav: string;
    relType: string;
    targetFlav: string;
    maxSources?: number;
}> = [
    {
        sourceFlav: 'financial_instrument',
        relType: 'fund_of',
        targetFlav: 'fund_account',
        maxSources: 10,
    },
    {
        sourceFlav: 'financial_instrument',
        relType: 'issuer_of',
        targetFlav: 'organization',
        maxSources: 10,
    },
    {
        sourceFlav: 'financial_instrument',
        relType: 'trustee_of',
        targetFlav: 'organization',
        maxSources: 10,
    },
    {
        sourceFlav: 'financial_instrument',
        relType: 'beneficiary_of',
        targetFlav: 'organization',
        maxSources: 10,
    },
    {
        sourceFlav: 'financial_instrument',
        relType: 'borrower_of',
        targetFlav: 'organization',
        maxSources: 10,
    },
    {
        sourceFlav: 'fund_account',
        relType: 'holds_investment',
        targetFlav: 'financial_instrument',
        maxSources: 15,
    },
    {
        sourceFlav: 'organization',
        relType: 'advisor_to',
        targetFlav: 'organization',
        maxSources: 10,
    },
    { sourceFlav: 'organization', relType: 'located_at', targetFlav: 'location', maxSources: 10 },
    {
        sourceFlav: 'organization',
        relType: 'sponsor_of',
        targetFlav: 'organization',
        maxSources: 5,
    },
    {
        sourceFlav: 'organization',
        relType: 'successor_to',
        targetFlav: 'organization',
        maxSources: 5,
    },
    { sourceFlav: 'person', relType: 'works_at', targetFlav: 'organization', maxSources: 5 },
];

function addRelationship(
    relationships: RelationshipRecord[],
    seen: Set<string>,
    rel: RelationshipRecord
): void {
    const key = `${rel.sourceNeid}|${rel.targetNeid}|${rel.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    relationships.push(rel);
}

export default defineEventHandler(async (): Promise<CollectionState> => {
    resetMcpSession();

    const entityMap = new Map<string, EntityRecord>();
    const relationships: RelationshipRecord[] = [];
    const relSeen = new Set<string>();
    const eventMap = new Map<string, EventRecord>();

    // Phase 1: Fan out from each document NEID across all hop-1 flavors
    for (const docNeid of BNY_DOCUMENT_NEIDS) {
        for (const flavor of HOP1_FLAVORS) {
            try {
                const result = await mcpCallTool('elemental_get_related', {
                    entity_id: { id_type: 'neid', id: docNeid },
                    related_flavor: flavor,
                    limit: 500,
                    direction: 'both',
                });

                const related = result?.relationships ?? [];
                for (const rel of related) {
                    const neid = rel.neid as string;
                    if (!neid) continue;
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
                        sourceNeid: docNeid,
                        targetNeid: neid,
                        type: 'appears_in',
                        sourceDocumentNeid: docNeid,
                        origin: 'document',
                    });
                }
            } catch (e: any) {
                console.error(`get_related failed for doc=${docNeid} flavor=${flavor}:`, e.message);
            }
        }
    }

    // Phase 2: Discover events at hop 2 from hub entities
    const hubNeids: string[] = [];
    for (const entity of entityMap.values()) {
        if (
            (EVENT_HUB_FLAVORS as readonly string[]).includes(entity.flavor) &&
            hubNeids.length < MAX_EVENT_HUBS
        ) {
            hubNeids.push(entity.neid);
        }
    }

    for (const hubNeid of hubNeids) {
        try {
            const result = await mcpCallTool('elemental_get_events', {
                entity_id: { id_type: 'neid', id: hubNeid },
                limit: 500,
                include_participants: true,
            });

            const events = result?.events ?? [];
            for (const evt of events) {
                const evtNeid = evt.neid as string;
                if (!evtNeid || eventMap.has(evtNeid)) continue;

                const props = evt.properties ?? {};
                const participantNeids: string[] = [];
                if (Array.isArray(evt.participants)) {
                    for (const p of evt.participants) {
                        if (p.neid) {
                            participantNeids.push(p.neid);
                            addRelationship(relationships, relSeen, {
                                sourceNeid: p.neid,
                                targetNeid: evtNeid,
                                type: 'participant',
                                origin: 'document',
                            });
                        }
                    }
                }

                const sourceDocuments: string[] = [];
                const hub = entityMap.get(hubNeid);
                if (hub) sourceDocuments.push(...hub.sourceDocuments);

                eventMap.set(evtNeid, {
                    neid: evtNeid,
                    name: (evt.name as string) || evtNeid,
                    category: props.event_category?.value as string | undefined,
                    date: props.event_date?.value as string | undefined,
                    description: props.event_description?.value as string | undefined,
                    likelihood: props.event_likelihood?.value as string | undefined,
                    participantNeids,
                    sourceDocuments: [...new Set(sourceDocuments)],
                });
            }
        } catch (e: any) {
            console.error(`get_events failed for hub=${hubNeid}:`, e.message);
        }
    }

    // Phase 3: Typed relationship discovery
    // Probe each (source_flavor, relationship_type, target_flavor) combination
    // from discovered entities matching the source flavor.
    for (const probe of RELATIONSHIP_PROBES) {
        const sources = Array.from(entityMap.values()).filter((e) => e.flavor === probe.sourceFlav);
        const limit = probe.maxSources ?? sources.length;
        const toProbe = sources.slice(0, limit);

        for (const source of toProbe) {
            try {
                const result = await mcpCallTool('elemental_get_related', {
                    entity_id: { id_type: 'neid', id: source.neid },
                    related_flavor: probe.targetFlav,
                    relationship_types: [probe.relType],
                    limit: 100,
                    direction: 'both',
                });

                const related = result?.relationships ?? [];
                for (const rel of related) {
                    if (!rel.neid) continue;
                    addRelationship(relationships, relSeen, {
                        sourceNeid: source.neid,
                        targetNeid: rel.neid,
                        type: probe.relType,
                        origin: 'document',
                    });
                    if (!entityMap.has(rel.neid)) {
                        entityMap.set(rel.neid, {
                            neid: rel.neid,
                            name: (rel.name as string) || rel.neid,
                            flavor: (rel.flavor as string) || probe.targetFlav,
                            sourceDocuments: source.sourceDocuments,
                            origin: 'document',
                        });
                    }
                }
            } catch {
                // Typed relationship probe — not all types exist for all entities
            }
        }
    }

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
            relationshipCount: relationships.length,
            agreementCount: agreements.length,
            lastRebuilt: new Date().toISOString(),
        },
        documents: [...BNY_DOCUMENTS],
        entities,
        relationships,
        events,
        propertySeries: [],
        status: 'ready',
    };

    setCachedCollection(state);
    return state;
});
