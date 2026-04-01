import {
    emptyCollectionState,
    resolvePresetProject,
    type CollectionState,
    type Project,
} from '~/utils/collectionTypes';
import {
    getInMemoryCollectionCache,
    readCollectionCache,
    writeCollectionCache,
} from '~/server/utils/collectionCache';

export function getCachedCollection(projectId?: string | null): CollectionState | null {
    return getInMemoryCollectionCache(projectId);
}

export async function setCachedCollection(
    state: CollectionState,
    projectId?: string | null
): Promise<CollectionState> {
    return writeCollectionCache(state, projectId);
}

export default defineEventHandler(async (event): Promise<CollectionState> => {
    const query = getQuery(event);
    const projectId = typeof query.projectId === 'string' ? query.projectId : undefined;
    const memoryState = getInMemoryCollectionCache(projectId);
    if (memoryState) return memoryState;

    const cached = await readCollectionCache(projectId);
    if (cached.state) return cached.state;

    const resolvedProject: Project | null =
        resolvePresetProject(projectId) ??
        (projectId
            ? {
                  id: projectId,
                  name: 'Custom Network',
                  description: 'User-seeded graph project',
                  type: 'mixed',
                  seedNeids: [],
                  createdAt: 'unknown',
              }
            : null);
    const emptyState = emptyCollectionState(resolvedProject);
    return {
        ...emptyState,
        meta: {
            ...emptyState.meta,
            projectId: projectId || emptyState.meta.projectId,
            cacheSource: 'none',
            cacheVersion: cached.cacheVersion,
        },
    };
});
