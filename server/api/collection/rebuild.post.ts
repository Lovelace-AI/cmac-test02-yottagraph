import { mcpCallTool, resetMcpSession } from '~/server/utils/collectionConfig';
import { setCachedCollection } from '~/server/api/collection/bootstrap.get';
import {
    loadExtractedSeedGraph,
    seedKeyFromNameAndFlavor,
} from '~/server/utils/extractedSeedGraph';
import {
    BNY_DOCUMENTS,
    BNY_DOCUMENT_NEIDS,
    HOP1_FLAVORS,
    PROPERTY_BEARING_NEIDS,
    EVENT_HUB_NEIDS,
    type EntityRecord,
    type RelationshipRecord,
    type EventRecord,
    type PropertySeriesRecord,
    type CollectionState,
} from '~/utils/collectionTypes';

// Relationship types to probe, each specifying source and target flavor.
// Both endpoints must be in the document-derived entity set for the edge to be kept.
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
        maxSources: 20,
    },
    {
        sourceFlav: 'financial_instrument',
        relType: 'issuer_of',
        targetFlav: 'organization',
        maxSources: 20,
    },
    {
        sourceFlav: 'financial_instrument',
        relType: 'trustee_of',
        targetFlav: 'organization',
        maxSources: 20,
    },
    {
        sourceFlav: 'financial_instrument',
        relType: 'beneficiary_of',
        targetFlav: 'organization',
        maxSources: 20,
    },
    {
        sourceFlav: 'financial_instrument',
        relType: 'borrower_of',
        targetFlav: 'organization',
        maxSources: 20,
    },
    {
        sourceFlav: 'fund_account',
        relType: 'holds_investment',
        targetFlav: 'financial_instrument',
        maxSources: 30,
    },
    {
        sourceFlav: 'organization',
        relType: 'advisor_to',
        targetFlav: 'organization',
        maxSources: 21,
    },
    { sourceFlav: 'organization', relType: 'located_at', targetFlav: 'location', maxSources: 21 },
    {
        sourceFlav: 'organization',
        relType: 'sponsor_of',
        targetFlav: 'organization',
        maxSources: 21,
    },
    {
        sourceFlav: 'organization',
        relType: 'successor_to',
        targetFlav: 'organization',
        maxSources: 21,
    },
    {
        sourceFlav: 'organization',
        relType: 'predecessor_of',
        targetFlav: 'organization',
        maxSources: 21,
    },
    {
        sourceFlav: 'organization',
        relType: 'party_to',
        targetFlav: 'legal_agreement',
        maxSources: 21,
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

    const seed = loadExtractedSeedGraph();
    const extractedEntityKeys = new Set(
        seed.entities.map((entity) => seedKeyFromNameAndFlavor(entity.name, entity.flavor))
    );
    const shouldFilterToSeed = extractedEntityKeys.size > 0;
    const entityMap = new Map<string, EntityRecord>();
    const relationships: RelationshipRecord[] = [];
    const relSeen = new Set<string>();
    const eventMap = new Map<string, EventRecord>();

    // ─────────────────────────────────────────────────────────────
    // Phase 1: Fan out from each document NEID across all hop-1 flavors.
    // Produces the canonical document-derived entity set.
    // Expected: ~127 unique non-document entities.
    // ─────────────────────────────────────────────────────────────
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
                    const relName = (rel.name as string) || '';
                    const relFlavor = (rel.flavor as string) || flavor;
                    const seedKey = seedKeyFromNameAndFlavor(relName, relFlavor);
                    if (shouldFilterToSeed && !extractedEntityKeys.has(seedKey)) continue;
                    const existing = entityMap.get(neid);
                    if (existing) {
                        if (!existing.sourceDocuments.includes(docNeid)) {
                            existing.sourceDocuments.push(docNeid);
                        }
                    } else {
                        entityMap.set(neid, {
                            neid,
                            name: relName || neid,
                            flavor: relFlavor,
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
                console.error(
                    `Phase 1: get_related failed doc=${docNeid} flavor=${flavor}:`,
                    e.message
                );
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Phase 2: Discover events from the exact BNY event hub NEIDs.
    // Filter events to document-derived scope: at least one participant
    // must be in the hop-1 entity set.
    // Expected: ~53 unique event NEIDs.
    // ─────────────────────────────────────────────────────────────
    for (const hubNeid of EVENT_HUB_NEIDS) {
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
                let hasDocumentParticipant = false;

                if (Array.isArray(evt.participants)) {
                    for (const p of evt.participants) {
                        if (p.neid) {
                            participantNeids.push(p.neid);
                            if (entityMap.has(p.neid)) {
                                hasDocumentParticipant = true;
                            }
                        }
                    }
                }

                // Also accept if the hub itself is in our entity set
                if (!hasDocumentParticipant && entityMap.has(hubNeid)) {
                    hasDocumentParticipant = true;
                }

                if (!hasDocumentParticipant) continue;

                // Record participant → event relationships (only for known entities)
                for (const p of evt.participants ?? []) {
                    if (p.neid && entityMap.has(p.neid)) {
                        addRelationship(relationships, relSeen, {
                            sourceNeid: p.neid,
                            targetNeid: evtNeid,
                            type: 'schema::relationship::participant',
                            origin: 'document',
                        });
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
            console.error(`Phase 2: get_events failed hub=${hubNeid}:`, e.message);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Phase 3: Typed relationship probes.
    // For each probe, both source and target must be in the
    // document-derived entity set (entityMap) for the edge to be kept.
    // This prevents the blowup from MCP returning broader-graph edges.
    // ─────────────────────────────────────────────────────────────
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
                    limit: 500,
                    direction: 'both',
                });

                const related = result?.relationships ?? [];
                for (const rel of related) {
                    if (!rel.neid) continue;
                    // Scope filter: target must be in document-derived set
                    if (!entityMap.has(rel.neid)) continue;
                    addRelationship(relationships, relSeen, {
                        sourceNeid: source.neid,
                        targetNeid: rel.neid,
                        type: probe.relType,
                        origin: 'document',
                    });
                }
            } catch {
                // Not all relationship types exist for all entities — expected
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Phase 4: Historical property series via elemental_get_entity.
    // Call for each property-bearing entity with history: {} to get
    // full temporal series across all 4 report dates.
    // ─────────────────────────────────────────────────────────────
    const propertySeries: PropertySeriesRecord[] = [];

    for (const neid of PROPERTY_BEARING_NEIDS) {
        try {
            const result = await mcpCallTool('elemental_get_entity', {
                entity_id: { id_type: 'neid', id: neid },
                history: {},
            });

            const entity = result?.entity ?? result;
            const historicalProps = entity?.historical_properties ?? {};

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
        } catch (e: any) {
            console.error(`Phase 4: get_entity history failed neid=${neid}:`, e.message);
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
        propertySeries,
        status: 'ready',
    };

    setCachedCollection(state);
    return state;
});
