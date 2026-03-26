import { BNY_DOCUMENTS, emptyCollectionState, type CollectionState } from '~/utils/collectionTypes';

let cachedState: CollectionState | null = null;

export function getCachedCollection(): CollectionState | null {
    return cachedState;
}

export function setCachedCollection(state: CollectionState): void {
    cachedState = state;
}

export default defineEventHandler((): CollectionState => {
    if (cachedState) return cachedState;
    return emptyCollectionState();
});
