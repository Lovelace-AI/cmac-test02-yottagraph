import { mcpCallTool, resetMcpSession } from '~/server/utils/collectionConfig';
import { setCachedCollection } from '~/server/api/collection/bootstrap.get';
import { runEnrichmentExpansion } from '~/server/utils/enrichmentExpand';
import {
    loadExtractedSeedGraph,
    loadSeedGraphHints,
    seedIdForKey,
    seedKeyFromNameAndFlavor,
    citationToDocumentNeid,
} from '~/server/utils/extractedSeedGraph';
import { loadQuadOneHopAuditCounts } from '~/server/utils/quadSeedGraph';
import {
    BNY_DOCUMENTS,
    HOP1_FLAVORS,
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

const EVENT_TIME_WINDOWS: Array<{ time_range?: { after?: string; before?: string } }> = [
    { time_range: { after: '2018-01-01', before: '2026-12-31' } },
    { time_range: { before: '2018-01-01' } },
];

function normalizeNeid(neid: string): string {
    const unpadded = neid.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

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

function citationDocumentNeidsFromValue(value: unknown): string[] {
    if (!value) return [];
    if (typeof value === 'string') {
        const mapped = citationToDocumentNeid(value);
        return mapped ? [mapped] : [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((item) => citationDocumentNeidsFromValue(item));
    }
    if (typeof value === 'object') {
        const citation = (value as Record<string, unknown>).citation;
        if (typeof citation === 'string') {
            const mapped = citationToDocumentNeid(citation);
            return mapped ? [mapped] : [];
        }
    }
    return [];
}

export default defineEventHandler(async (): Promise<CollectionState> => {
    resetMcpSession();

    const seed = loadExtractedSeedGraph();
    const auditCounts = loadQuadOneHopAuditCounts();
    const seedHints = loadSeedGraphHints();
    const strictDocumentNeids =
        seedHints.documentNeids.length > 0
            ? seedHints.documentNeids
            : BNY_DOCUMENTS.map((doc) => normalizeNeid(doc.neid));
    const strictDocumentNeidSet = new Set(strictDocumentNeids);
    const extractedEntityKeys = new Set(
        seed.entities.map((entity) => seedKeyFromNameAndFlavor(entity.name, entity.flavor))
    );
    const shouldFilterToSeed = extractedEntityKeys.size > 0;
    const entityMap = new Map<string, EntityRecord>();
    const relationships: RelationshipRecord[] = [];
    const relSeen = new Set<string>();
    const eventMap = new Map<string, EventRecord>();
    const entityNeidBySeedKey = new Map<string, string>();
    const eventNeidBySeedKey = new Map<string, string>();

    // Baseline from extracted/quad seed so the app can load document-derived
    // graph content even when MCP lookups are degraded.
    for (const seedEntity of seed.entities) {
        const neid = seedEntity.canonicalNeid ? normalizeNeid(seedEntity.canonicalNeid) : '';
        if (!neid) continue;
        entityMap.set(neid, {
            neid,
            name: seedEntity.name || neid,
            flavor: seedEntity.flavor,
            sourceDocuments: [
                ...new Set(seedEntity.sourceDocumentNeids.map((doc) => normalizeNeid(doc))),
            ],
            origin: 'document',
            extractedSeed: true,
            mcpConfirmed: false,
            properties: seedEntity.properties ?? undefined,
        });
        entityNeidBySeedKey.set(seedEntity.key, neid);
    }
    for (const seedEvent of seed.events) {
        const syntheticNeid = seedIdForKey('event', seedEvent.key);
        const seededDocs = [
            ...new Set(seedEvent.sourceDocumentNeids.map((doc) => normalizeNeid(doc))),
        ];
        const seedProps = (seedEvent.properties ?? {}) as Record<string, unknown>;
        eventMap.set(syntheticNeid, {
            neid: syntheticNeid,
            name: seedEvent.name || syntheticNeid,
            category: (seedProps.event_category as { value?: string } | undefined)?.value,
            date:
                (seedProps.event_date as { value?: string } | undefined)?.value ??
                (seedProps.date as { value?: string } | undefined)?.value,
            description:
                (seedProps.event_description as { value?: string } | undefined)?.value ??
                (seedProps.description as { value?: string } | undefined)?.value,
            likelihood:
                (seedProps.event_likelihood as { value?: string } | undefined)?.value ??
                (seedProps.likelihood as { value?: string } | undefined)?.value,
            participantNeids: [],
            sourceDocuments: seededDocs,
            origin: 'document',
            extractedSeed: true,
            mcpConfirmed: false,
            properties: seedEvent.properties ?? undefined,
        });
        eventNeidBySeedKey.set(seedEvent.key, syntheticNeid);
    }
    for (const edge of seed.relationships) {
        const sourceNeid =
            entityNeidBySeedKey.get(edge.sourceKey) ?? eventNeidBySeedKey.get(edge.sourceKey);
        const targetNeid =
            entityNeidBySeedKey.get(edge.targetKey) ?? eventNeidBySeedKey.get(edge.targetKey);
        if (!sourceNeid || !targetNeid) continue;
        addRelationship(relationships, relSeen, {
            sourceNeid,
            targetNeid,
            type: edge.type,
            sourceDocumentNeid: edge.sourceDocumentNeids[0]
                ? normalizeNeid(edge.sourceDocumentNeids[0])
                : undefined,
            origin: 'document',
            extractedSeed: true,
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Phase 1: Fan out from each document NEID across all hop-1 flavors.
    // Produces the canonical document-derived entity set.
    // Expected: ~127 unique non-document entities.
    // ─────────────────────────────────────────────────────────────
    for (const docNeid of strictDocumentNeids) {
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
    const strictEventHubNeids = seedHints.eventHubNeids.filter((hubNeid) => entityMap.has(hubNeid));
    for (const hubNeid of strictEventHubNeids) {
        try {
            const eventsByNeid = new Map<string, any>();
            for (const window of EVENT_TIME_WINDOWS) {
                const result = await mcpCallTool('elemental_get_events', {
                    entity_id: { id_type: 'neid', id: hubNeid },
                    limit: 500,
                    include_participants: true,
                    ...(window.time_range ? { time_range: window.time_range } : {}),
                });
                for (const evt of result?.events ?? []) {
                    if (!evt?.neid) continue;
                    eventsByNeid.set(String(evt.neid), evt);
                }
            }
            for (const evt of eventsByNeid.values()) {
                const evtNeid = evt.neid as string;
                if (!evtNeid || eventMap.has(evtNeid)) continue;

                const props = evt.properties ?? {};
                const eventKey = seedKeyFromNameAndFlavor((evt.name as string) || '', 'event');
                const participantNeids: string[] = [];

                if (Array.isArray(evt.participants)) {
                    for (const p of evt.participants) {
                        if (p.neid) {
                            participantNeids.push(p.neid);
                        }
                    }
                }

                const citedDocNeids = Object.values(props)
                    .flatMap((value) => citationDocumentNeidsFromValue(value))
                    .map((docNeid) => normalizeNeid(docNeid))
                    .filter((docNeid): docNeid is string => strictDocumentNeidSet.has(docNeid));
                const seededSyntheticNeid = eventNeidBySeedKey.get(eventKey);
                const seededDocNeids = Array.from(
                    new Set(
                        (seededSyntheticNeid
                            ? (eventMap.get(seededSyntheticNeid)?.sourceDocuments ?? [])
                            : []
                        )
                            .map((docNeid) => normalizeNeid(docNeid))
                            .filter((docNeid) => strictDocumentNeidSet.has(docNeid))
                    )
                );
                const appears =
                    citedDocNeids.length === 0 && seededDocNeids.length === 0
                        ? await mcpCallTool(
                              'elemental_get_related',
                              {
                                  entity_id: { id_type: 'neid', id: evtNeid },
                                  related_flavor: 'document',
                                  direction: 'both',
                                  limit: 50,
                              },
                              { timeoutMs: 12_000 }
                          ).catch(() => null)
                        : null;
                const appearsInDocNeids = (appears?.relationships ?? [])
                    .map((relationship: any) => normalizeNeid(String(relationship?.neid ?? '')))
                    .filter((docNeid: string) => strictDocumentNeidSet.has(docNeid));
                const sourceDocuments = Array.from(
                    new Set([...seededDocNeids, ...citedDocNeids, ...appearsInDocNeids])
                );
                if (sourceDocuments.length === 0) continue;

                // Record participant → event relationships (only for known entities)
                for (const p of evt.participants ?? []) {
                    if (p.neid && entityMap.has(p.neid)) {
                        addRelationship(relationships, relSeen, {
                            sourceNeid: p.neid,
                            targetNeid: evtNeid,
                            type: 'schema::relationship::participant',
                            sourceDocumentNeid: sourceDocuments[0],
                            origin: 'document',
                            extractedSeed: true,
                        });
                    }
                }
                for (const sourceDocumentNeid of sourceDocuments) {
                    addRelationship(relationships, relSeen, {
                        sourceNeid: evtNeid,
                        targetNeid: sourceDocumentNeid,
                        type: 'appears_in',
                        sourceDocumentNeid,
                        origin: 'document',
                        extractedSeed: true,
                    });
                }

                eventMap.set(evtNeid, {
                    neid: evtNeid,
                    name: (evt.name as string) || evtNeid,
                    category: props.event_category?.value as string | undefined,
                    date: props.event_date?.value as string | undefined,
                    description: props.event_description?.value as string | undefined,
                    likelihood: props.event_likelihood?.value as string | undefined,
                    participantNeids,
                    sourceDocuments: [...new Set(sourceDocuments)],
                    extractedSeed: true,
                    mcpConfirmed: true,
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

    for (const neid of seedHints.propertyBearingNeids) {
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

    const documentEntities = Array.from(entityMap.values());
    const documentEvents = Array.from(eventMap.values());
    const enrichmentResult = await runEnrichmentExpansion({
        anchorNeids: documentEntities.map((entity) => entity.neid),
        hops: 1,
        includeEvents: true,
        maxEntities: 6000,
        maxRelationships: 24000,
        maxEvents: 6000,
        maxEventHubs: 24,
    });
    for (const relationship of enrichmentResult.relationships) {
        addRelationship(relationships, relSeen, relationship);
    }
    const entities = mergeEntities(documentEntities, enrichmentResult.entities);
    const events = mergeEvents(documentEvents, enrichmentResult.events);
    const agreements = entities.filter((e) => e.flavor === 'legal_agreement');
    const curatedOneHopEntityCount = entities.filter(
        (entity) => entity.origin === 'enriched'
    ).length;
    const curatedOneHopRelationshipCount = relationships.filter(
        (relationship) => relationship.origin === 'enriched'
    ).length;
    const curatedOneHopEventCount = events.filter(
        (eventItem) => eventItem.extractedSeed === false
    ).length;

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
            rawOneHopCounts: { ...auditCounts.rawOneHop },
            curatedOneHopCounts: {
                entityCount: curatedOneHopEntityCount,
                eventCount: curatedOneHopEventCount,
                relationshipCount: curatedOneHopRelationshipCount,
            },
            lastRebuilt: new Date().toISOString(),
        },
        documents: [...BNY_DOCUMENTS],
        entities,
        relationships,
        events,
        propertySeries,
        status: 'ready',
    };

    const cachedState = await setCachedCollection(state);
    return cachedState;
});
