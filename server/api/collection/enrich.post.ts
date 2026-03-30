import {
    runEnrichmentExpansion,
    type EnrichmentExpandRequest,
    type EnrichmentExpandResult,
} from '~/server/utils/enrichmentExpand';

export default defineEventHandler(async (event): Promise<EnrichmentExpandResult> => {
    const body = await readBody<EnrichmentExpandRequest>(event);
    if (!body?.anchorNeids?.length) {
        throw createError({ statusCode: 400, statusMessage: 'anchorNeids required' });
    }
    return await runEnrichmentExpansion(body);
});
