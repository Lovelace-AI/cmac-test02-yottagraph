import { mcpCallTool } from '~/server/utils/collectionConfig';

interface NeighborhoodBody {
    neid?: string;
    size?: number;
}

export default defineEventHandler(async (event) => {
    const body = (await readBody(event)) as NeighborhoodBody;
    const neid = body.neid?.trim();
    if (!neid) {
        throw createError({ statusCode: 400, statusMessage: 'Missing neid' });
    }

    try {
        const result = await mcpCallTool('elemental_graph_neighborhood', {
            entity_id: { id_type: 'neid', id: neid },
            size: Math.min(Math.max(body.size ?? 20, 1), 100),
        });

        const neighbors = Array.isArray(result?.neighbors)
            ? result.neighbors.map((entry: any) => ({
                  neid: entry.neid,
                  name: entry.name,
                  flavor: entry.type,
                  influence: entry.influence,
                  relationships: Array.isArray(entry.relationships) ? entry.relationships : [],
              }))
            : [];

        return {
            resolved: result?.resolved
                ? {
                      neid: result.resolved.neid,
                      name: result.resolved.name,
                      flavor: result.resolved.flavor,
                  }
                : null,
            neighbors,
            message: result?.message,
        };
    } catch (e: any) {
        throw createError({
            statusCode: 502,
            statusMessage: e.message || 'Neighborhood lookup failed',
        });
    }
});
