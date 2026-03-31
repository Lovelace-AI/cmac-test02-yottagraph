import { getCachedCollection } from '~/server/api/collection/bootstrap.get';
import { readCollectionCache } from '~/server/utils/collectionCache';
import { runCorporateLineageInvestigation } from '~/server/utils/lineageInvestigation';
import type { LineageInvestigationResult } from '~/utils/collectionTypes';

export default defineEventHandler(async (event): Promise<LineageInvestigationResult> => {
    const body = (await readBody(event).catch(() => ({}))) as {
        maxHops?: number;
        maxOrganizations?: number;
    };
    const inMemoryCollection = getCachedCollection();
    const collection =
        inMemoryCollection ?? (await readCollectionCache()).state ?? inMemoryCollection;
    if (!collection || collection.status !== 'ready') {
        throw createError({
            statusCode: 409,
            statusMessage: 'Collection not ready. Run analysis before lineage investigation.',
        });
    }

    return runCorporateLineageInvestigation(collection, {
        maxHops: body.maxHops,
        maxOrganizations: body.maxOrganizations,
    });
});
