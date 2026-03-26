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

export default defineEventHandler(async (): Promise<CollectionState> => {
    resetMcpSession();

    const entityMap = new Map<string, EntityRecord>();
    const relationships: RelationshipRecord[] = [];
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
                    relationships.push({
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
                        if (p.neid) participantNeids.push(p.neid);
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

    // Phase 3: Typed relationship discovery for key relationship types
    const typedRelTypes = [
        'issuer_of',
        'trustee_of',
        'borrower_of',
        'advisor_to',
        'beneficiary_of',
        'fund_of',
        'holds_investment',
        'located_at',
        'works_at',
        'sponsor_of',
    ];

    const sampleHubs = hubNeids.slice(0, 5);
    for (const hubNeid of sampleHubs) {
        for (const relType of typedRelTypes) {
            try {
                const result = await mcpCallTool('elemental_get_related', {
                    entity_id: { id_type: 'neid', id: hubNeid },
                    related_flavor: 'organization',
                    relationship_types: [relType],
                    limit: 100,
                    direction: 'both',
                });

                const related = result?.relationships ?? [];
                for (const rel of related) {
                    if (!rel.neid) continue;
                    const exists = relationships.some(
                        (r) =>
                            r.sourceNeid === hubNeid &&
                            r.targetNeid === rel.neid &&
                            r.type === relType
                    );
                    if (!exists) {
                        relationships.push({
                            sourceNeid: hubNeid,
                            targetNeid: rel.neid,
                            type: relType,
                            origin: 'document',
                        });
                    }
                }
            } catch {
                // Typed relationship probe; failures are expected for non-matching types
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
