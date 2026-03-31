import { emptyCollectionState, type CollectionState } from '~/utils/collectionTypes';
import {
    getInMemoryCollectionCache,
    readCollectionCache,
    writeCollectionCache,
} from '~/server/utils/collectionCache';

export function getCachedCollection(): CollectionState | null {
    return getInMemoryCollectionCache();
}

export async function setCachedCollection(state: CollectionState): Promise<CollectionState> {
    return writeCollectionCache(state);
}

export default defineEventHandler(async (): Promise<CollectionState> => {
    const memoryState = getInMemoryCollectionCache();
    if (memoryState) return memoryState;

    const cached = await readCollectionCache();
    if (cached.state) return cached.state;

    const emptyState = emptyCollectionState();
    return {
        ...emptyState,
        meta: {
            ...emptyState.meta,
            cacheSource: 'none',
            cacheVersion: cached.cacheVersion,
        },
    };
});
