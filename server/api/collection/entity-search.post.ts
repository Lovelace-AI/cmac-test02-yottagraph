import { mcpCallTool } from '~/server/utils/collectionConfig';

interface SearchBody {
    query?: string;
    flavor?: string;
}

export default defineEventHandler(async (event) => {
    const body = (await readBody(event)) as SearchBody;
    const query = body.query?.trim();
    if (!query) {
        throw createError({ statusCode: 400, statusMessage: 'Missing query' });
    }

    try {
        const result = await mcpCallTool('elemental_get_entity', {
            entity: query,
            ...(body.flavor ? { flavor: body.flavor } : {}),
        });

        return {
            entity: result?.entity
                ? {
                      neid: result.entity.neid,
                      name: result.entity.name,
                      flavor: result.entity.flavor,
                      score: result.entity.score,
                  }
                : null,
            resolution: result?.resolution ?? null,
            message: result?.message,
        };
    } catch (e: any) {
        throw createError({
            statusCode: 502,
            statusMessage: e.message || 'Entity lookup failed',
        });
    }
});
