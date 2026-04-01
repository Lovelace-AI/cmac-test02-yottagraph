import { mcpCallTool } from '~/server/utils/collectionConfig';

interface SearchBody {
    query?: string;
    flavor?: string;
}

function normalizeFlavor(value: unknown): string | undefined {
    const text = String(value ?? '')
        .trim()
        .replace(/^schema::flavor::/, '');
    return text || undefined;
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
        const resolvedEntity = result?.entity ?? result?.resolved ?? null;
        const resolvedFlavor = normalizeFlavor(
            result?.entity?.flavor ?? result?.resolved?.flavor ?? result?.resolution?.flavor
        );

        return {
            entity: resolvedEntity
                ? {
                      neid: resolvedEntity.neid,
                      name: resolvedEntity.name,
                      flavor: resolvedFlavor,
                      date:
                          result?.entity?.date ??
                          result?.resolved?.date ??
                          result?.resolution?.date ??
                          null,
                      score: resolvedEntity.score,
                  }
                : null,
            resolution: result?.resolution ?? result?.resolved ?? null,
            message: result?.message,
        };
    } catch (e: any) {
        throw createError({
            statusCode: 502,
            statusMessage: e.message || 'Entity lookup failed',
        });
    }
});
