import { mcpCallTool } from '~/server/utils/collectionConfig';
import type { EntityRecord, RelationshipRecord } from '~/utils/collectionTypes';

interface EnrichRequest {
    anchorNeids: string[];
    hops?: number;
}

interface EnrichResult {
    entities: EntityRecord[];
    relationships: RelationshipRecord[];
}

const ENRICHMENT_FLAVORS = ['organization', 'person', 'financial_instrument', 'location'] as const;

export default defineEventHandler(async (event): Promise<EnrichResult> => {
    const body = await readBody<EnrichRequest>(event);
    if (!body?.anchorNeids?.length) {
        throw createError({ statusCode: 400, statusMessage: 'anchorNeids required' });
    }

    const hops = Math.min(body.hops ?? 1, 2);
    const entities: EntityRecord[] = [];
    const relationships: RelationshipRecord[] = [];
    const seen = new Set<string>();

    async function expandOneHop(sourceNeids: string[]): Promise<string[]> {
        const discovered: string[] = [];
        for (const neid of sourceNeids) {
            for (const flavor of ENRICHMENT_FLAVORS) {
                try {
                    const result = await mcpCallTool('elemental_get_related', {
                        entity_id: { id_type: 'neid', id: neid },
                        related_flavor: flavor,
                        limit: 50,
                        direction: 'both',
                    });

                    for (const rel of result?.relationships ?? []) {
                        if (!rel.neid || seen.has(rel.neid)) continue;
                        seen.add(rel.neid);

                        entities.push({
                            neid: rel.neid,
                            name: rel.name || rel.neid,
                            flavor: rel.flavor || flavor,
                            sourceDocuments: [],
                            origin: 'enriched',
                        });

                        relationships.push({
                            sourceNeid: neid,
                            targetNeid: rel.neid,
                            type: 'related',
                            origin: 'enriched',
                        });

                        discovered.push(rel.neid);
                    }
                } catch {
                    // Non-critical: skip flavors that error
                }
            }
        }
        return discovered;
    }

    for (const neid of body.anchorNeids) seen.add(neid);

    const hop1 = await expandOneHop(body.anchorNeids);

    if (hops >= 2 && hop1.length > 0) {
        const topHop1 = hop1.slice(0, 5);
        await expandOneHop(topHop1);
    }

    return { entities, relationships };
});
