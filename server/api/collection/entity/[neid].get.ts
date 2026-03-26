import { mcpCallTool } from '~/server/utils/collectionConfig';

export default defineEventHandler(async (event) => {
    const neid = getRouterParam(event, 'neid');
    if (!neid) {
        throw createError({ statusCode: 400, statusMessage: 'Missing entity NEID' });
    }

    try {
        const result = await mcpCallTool('elemental_get_entity', {
            entity_id: { id_type: 'neid', id: neid },
        });
        return result;
    } catch (e: any) {
        throw createError({
            statusCode: 502,
            statusMessage: e.message || 'Failed to fetch entity detail',
        });
    }
});
