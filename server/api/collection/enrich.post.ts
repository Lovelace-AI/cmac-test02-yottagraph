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
const MAX_RELATIONSHIPS_PER_CALL = 75;

function relationshipTypesFromRow(row: any): string[] {
    const types = Array.isArray(row?.relationship_types) ? row.relationship_types : [];
    if (!types.length) return ['related'];
    return types.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0);
}

export default defineEventHandler(async (event): Promise<EnrichResult> => {
    const body = await readBody<EnrichRequest>(event);
    if (!body?.anchorNeids?.length) {
        throw createError({ statusCode: 400, statusMessage: 'anchorNeids required' });
    }

    const hops = Math.min(body.hops ?? 1, 2);
    const entities: EntityRecord[] = [];
    const relationships: RelationshipRecord[] = [];
    const seenEntities = new Set<string>();
    const seenRelationships = new Set<string>();

    function upsertEntity(row: any, fallbackFlavor: string): string | null {
        if (!row?.neid) return null;
        if (seenEntities.has(row.neid)) return row.neid;
        seenEntities.add(row.neid);
        entities.push({
            neid: row.neid,
            name: row.name || row.neid,
            flavor: row.flavor || fallbackFlavor,
            sourceDocuments: [],
            origin: 'enriched',
        });
        return row.neid;
    }

    function upsertRelationship(
        sourceNeid: string,
        targetNeid: string,
        relationshipType: string,
        row: any
    ): void {
        const key = `${sourceNeid}|${targetNeid}|${relationshipType}`;
        if (seenRelationships.has(key)) return;
        seenRelationships.add(key);
        relationships.push({
            sourceNeid,
            targetNeid,
            type: relationshipType,
            origin: 'enriched',
            properties: row?.properties ?? {},
            citations: Array.isArray(row?.citations) ? row.citations : [],
        });
    }

    async function expandOneHop(sourceNeids: string[]): Promise<string[]> {
        const discovered: string[] = [];
        for (const neid of sourceNeids) {
            for (const flavor of ENRICHMENT_FLAVORS) {
                try {
                    const result = await mcpCallTool('elemental_get_related', {
                        entity_id: { id_type: 'neid', id: neid },
                        related_flavor: flavor,
                        limit: MAX_RELATIONSHIPS_PER_CALL,
                        direction: 'both',
                    });

                    for (const rel of result?.relationships ?? []) {
                        const targetNeid = upsertEntity(rel, flavor);
                        if (!targetNeid) continue;
                        const relationshipTypes = relationshipTypesFromRow(rel);
                        for (const relationshipType of relationshipTypes) {
                            upsertRelationship(neid, targetNeid, relationshipType, rel);
                        }
                        if (!sourceNeids.includes(targetNeid)) discovered.push(targetNeid);
                    }
                } catch {
                    // Non-critical: skip flavors that error
                }
            }
        }
        return Array.from(new Set(discovered));
    }

    for (const neid of body.anchorNeids) seenEntities.add(neid);

    const hop1 = await expandOneHop(body.anchorNeids);

    if (hops >= 2 && hop1.length > 0) {
        const topHop1 = hop1.slice(0, 5);
        await expandOneHop(topHop1);
    }

    return { entities, relationships };
});
