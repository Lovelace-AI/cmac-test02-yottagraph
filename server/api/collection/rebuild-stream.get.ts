import { mcpCallTool, resetMcpSession, getMcpLog } from '~/server/utils/collectionConfig';
import { setCachedCollection } from '~/server/api/collection/bootstrap.get';
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

// Each probe is limited to maxSources entities to keep total MCP calls bounded.
// With ~13 probes × avg 8 sources = ~104 calls max, well within 3-4 minute window.
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
        maxSources: 10,
    },
    {
        sourceFlav: 'organization',
        relType: 'advisor_to',
        targetFlav: 'organization',
        maxSources: 8,
    },
    { sourceFlav: 'organization', relType: 'located_at', targetFlav: 'location', maxSources: 8 },
    {
        sourceFlav: 'organization',
        relType: 'sponsor_of',
        targetFlav: 'organization',
        maxSources: 8,
    },
    {
        sourceFlav: 'organization',
        relType: 'successor_to',
        targetFlav: 'organization',
        maxSources: 8,
    },
    {
        sourceFlav: 'organization',
        relType: 'predecessor_of',
        targetFlav: 'organization',
        maxSources: 8,
    },
    {
        sourceFlav: 'organization',
        relType: 'party_to',
        targetFlav: 'legal_agreement',
        maxSources: 8,
    },
    { sourceFlav: 'person', relType: 'works_at', targetFlav: 'organization', maxSources: 5 },
];

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
    const key = `${rel.sourceNeid}|${rel.targetNeid}|${rel.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    relationships.push(rel);
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

    resetMcpSession();

    const entityMap = new Map<string, EntityRecord>();
    const relationships: RelationshipRecord[] = [];
    const relSeen = new Set<string>();
    const eventMap = new Map<string, EventRecord>();
    let t0 = Date.now();

    // ─── Phase 1: Entity Discovery ────────────────────────────────
    t0 = Date.now();
    sendStep(1, 'working', 'Entity Discovery', 'Scanning 5 BNY documents across 6 entity types...');

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

    sendStep(
        1,
        'completed',
        'Entity Discovery',
        `Found ${entityMap.size} entities across ${HOP1_FLAVORS.length} types`,
        Date.now() - t0
    );

    // ─── Phase 2: Event Discovery ─────────────────────────────────
    t0 = Date.now();
    sendStep(
        2,
        'working',
        'Event Discovery',
        `Traversing ${EVENT_HUB_NEIDS.length} hub entities for events...`
    );

    for (const hubNeid of EVENT_HUB_NEIDS) {
        try {
            const result = await mcpCallTool('elemental_get_events', {
                entity_id: { id_type: 'neid', id: hubNeid },
                limit: 500,
                include_participants: true,
            });

            const events = result?.events ?? [];
            for (const evt of events) {
                const evtNeid = normalizeNeid(evt.neid as string);
                if (!evtNeid || eventMap.has(evtNeid)) continue;

                const props = evt.properties ?? {};
                const participantNeids: string[] = [];
                let hasDocumentParticipant = false;

                if (Array.isArray(evt.participants)) {
                    for (const p of evt.participants) {
                        if (p.neid) {
                            const pNeid = normalizeNeid(p.neid);
                            participantNeids.push(pNeid);
                            if (entityMap.has(pNeid)) hasDocumentParticipant = true;
                        }
                    }
                }
                const normalHubNeid = normalizeNeid(hubNeid);
                if (!hasDocumentParticipant && entityMap.has(normalHubNeid))
                    hasDocumentParticipant = true;
                if (!hasDocumentParticipant) continue;

                for (const p of evt.participants ?? []) {
                    if (p.neid) {
                        const pNeid = normalizeNeid(p.neid);
                        if (entityMap.has(pNeid)) {
                            addRelationship(relationships, relSeen, {
                                sourceNeid: pNeid,
                                targetNeid: evtNeid,
                                type: 'schema::relationship::participant',
                                origin: 'document',
                            });
                        }
                    }
                }

                const hub = entityMap.get(normalHubNeid);
                eventMap.set(evtNeid, {
                    neid: evtNeid,
                    name: (evt.name as string) || evtNeid,
                    category: props.event_category?.value as string | undefined,
                    date: props.event_date?.value as string | undefined,
                    description: props.event_description?.value as string | undefined,
                    likelihood: props.event_likelihood?.value as string | undefined,
                    participantNeids,
                    sourceDocuments: hub ? [...hub.sourceDocuments] : [],
                });
            }
        } catch (e: any) {
            console.error(`Phase 2: get_events failed hub=${hubNeid}:`, e.message);
        }
    }

    sendStep(
        2,
        'completed',
        'Event Discovery',
        `Found ${eventMap.size} events from ${EVENT_HUB_NEIDS.length} hubs`,
        Date.now() - t0
    );

    // ─── Phase 3: Typed Relationship Assembly ─────────────────────
    t0 = Date.now();

    // Count total probe calls upfront so we can show progress
    let totalProbes = 0;
    for (const probe of RELATIONSHIP_PROBES) {
        const sources = Array.from(entityMap.values()).filter((e) => e.flavor === probe.sourceFlav);
        totalProbes += Math.min(sources.length, probe.maxSources ?? sources.length);
    }

    sendStep(
        3,
        'working',
        'Relationship Assembly',
        `Probing ${RELATIONSHIP_PROBES.length} relationship types (~${totalProbes} calls)...`
    );

    let probesDone = 0;
    for (const probe of RELATIONSHIP_PROBES) {
        const sources = Array.from(entityMap.values()).filter((e) => e.flavor === probe.sourceFlav);
        const toProbe = sources.slice(0, probe.maxSources ?? sources.length);

        // Send sub-step progress at start of each probe type
        sendStep(
            3,
            'working',
            'Relationship Assembly',
            `[${probesDone}/${totalProbes}] Probing ${probe.relType} (${toProbe.length} ${probe.sourceFlav} sources)...`
        );

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
                let added = 0;
                for (const rel of related) {
                    if (!rel.neid) continue;
                    const targetNeid = normalizeNeid(rel.neid);
                    if (!entityMap.has(targetNeid)) continue;
                    addRelationship(relationships, relSeen, {
                        sourceNeid: source.neid,
                        targetNeid,
                        type: probe.relType,
                        origin: 'document',
                    });
                    added++;
                }
                if (related.length > 0) {
                    console.log(
                        `[Phase3] ${probe.relType} from ${source.name} (${source.neid}): ${related.length} returned, ${added} in entityMap`
                    );
                }
            } catch (e: any) {
                console.error(
                    `[Phase3] ${probe.relType} from ${source.neid} FAILED:`,
                    e?.message ?? String(e)
                );
            }
            probesDone++;
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

    sendStep(
        3,
        'completed',
        'Relationship Assembly',
        `Assembled ${filteredRelationships.length} typed edges`,
        Date.now() - t0
    );

    // ─── Phase 4: Property History ────────────────────────────────
    t0 = Date.now();
    sendStep(
        4,
        'working',
        'Property History',
        `Loading historical properties for ${PROPERTY_BEARING_NEIDS.length} key entities...`
    );

    const propertySeries: PropertySeriesRecord[] = [];

    for (const rawNeid of PROPERTY_BEARING_NEIDS) {
        const neid = normalizeNeid(rawNeid);
        try {
            const result = await mcpCallTool('elemental_get_entity', {
                entity_id: { id_type: 'neid', id: neid },
                history: { after: '2010-01-01', before: '2026-12-31', limit: 100 },
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
            if (Object.keys(historicalProps).length === 0) {
                console.log(`[Phase4] No historical_properties for ${entity?.name ?? neid}`);
            } else {
                console.log(
                    `[Phase4] ${entity?.name}: ${Object.keys(historicalProps).length} property series`
                );
            }
        } catch (e: any) {
            console.error(`Phase 4: get_entity history failed neid=${neid}:`, e.message);
        }
    }

    sendStep(
        4,
        'completed',
        'Property History',
        `Loaded ${propertySeries.length} property series across ${PROPERTY_BEARING_NEIDS.length} entities`,
        Date.now() - t0
    );

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
            relationshipCount: filteredRelationships.length,
            agreementCount: agreements.length,
            lastRebuilt: new Date().toISOString(),
        },
        documents: [...BNY_DOCUMENTS],
        entities,
        relationships: filteredRelationships,
        events,
        propertySeries,
        status: 'ready',
    };

    setCachedCollection(state);

    sendStep(
        5,
        'completed',
        'Finalizing',
        `Graph complete: ${entities.length} entities, ${events.length} events, ${filteredRelationships.length} edges, ${propertySeries.length} property series`,
        Date.now() - t0
    );

    // Send full state and MCP log as final events
    send('state', { state });
    send('mcplog', { entries: getMcpLog() });
    send('done', {});

    event.node.res.end();
});
