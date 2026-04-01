import type { CollectionMeta, CollectionState } from '~/utils/collectionTypes';
import { getRedis } from '~/server/utils/redis';

export type CollectionCacheSource = 'memory' | 'redis' | 'none';

interface InMemoryCollectionCache {
    state: CollectionState;
    cachedAt: string;
}

interface CollectionCachePayload {
    cachedAt: string;
    state: CollectionState;
}

export interface CollectionCacheReadResult {
    state: CollectionState | null;
    source: CollectionCacheSource;
    cachedAt?: string;
    cacheVersion: string;
}

const COLLECTION_CACHE_VERSION = 'v1';
const COLLECTION_CACHE_NAMESPACE = 'document-intelligence';

let inMemoryCache: InMemoryCollectionCache | null = null;
const inMemoryCacheByProject = new Map<string, InMemoryCollectionCache>();

function normalizedProjectId(projectId?: string | null): string {
    const raw = String(projectId ?? '').trim();
    return raw || 'default-project';
}

function appIdForCacheKey(): string {
    const raw = String(process.env.NUXT_PUBLIC_APP_ID ?? '').trim();
    return raw || 'default-app';
}

function collectionCacheKey(projectId?: string | null): string {
    return `collection:graph:${appIdForCacheKey()}:${COLLECTION_CACHE_NAMESPACE}:${normalizedProjectId(projectId)}:${COLLECTION_CACHE_VERSION}`;
}

function cloneCollectionState(state: CollectionState): CollectionState {
    return JSON.parse(JSON.stringify(state)) as CollectionState;
}

function withCacheMeta(
    state: CollectionState,
    source: CollectionCacheSource,
    cachedAt: string
): CollectionState {
    const cloned = cloneCollectionState(state);
    cloned.meta = {
        ...cloned.meta,
        cacheSource: source,
        cachedAt,
        cacheVersion: COLLECTION_CACHE_VERSION,
    };
    return cloned;
}

function asCachePayload(raw: unknown): CollectionCachePayload | null {
    if (!raw) return null;
    if (typeof raw === 'string') {
        try {
            return asCachePayload(JSON.parse(raw));
        } catch {
            return null;
        }
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    const cachedAt = typeof row.cachedAt === 'string' ? row.cachedAt : '';
    const state = row.state as CollectionState | undefined;
    if (!cachedAt || !state || typeof state !== 'object') return null;
    return { cachedAt, state };
}

export function getInMemoryCollectionCache(projectId?: string | null): CollectionState | null {
    const normalizedProject = normalizedProjectId(projectId);
    const scoped = inMemoryCacheByProject.get(normalizedProject);
    if (scoped) return withCacheMeta(scoped.state, 'memory', scoped.cachedAt);
    return null;
}

export function getCollectionCacheMeta(meta: CollectionMeta): {
    source: CollectionCacheSource;
    cachedAt?: string;
    cacheVersion?: string;
} {
    return {
        source: meta.cacheSource ?? 'none',
        cachedAt: meta.cachedAt,
        cacheVersion: meta.cacheVersion,
    };
}

export function setInMemoryCollectionCache(
    state: CollectionState,
    cachedAt = new Date().toISOString(),
    projectId?: string | null
): CollectionState {
    const memoryState = withCacheMeta(state, 'memory', cachedAt);
    const normalizedProject = normalizedProjectId(projectId ?? state.meta.projectId);
    inMemoryCacheByProject.set(normalizedProject, {
        state: memoryState,
        cachedAt,
    });
    inMemoryCache = {
        state: memoryState,
        cachedAt,
    };
    return cloneCollectionState(memoryState);
}

export async function readCollectionCache(
    projectId?: string | null
): Promise<CollectionCacheReadResult> {
    const normalizedProject = normalizedProjectId(projectId);
    const scoped = inMemoryCacheByProject.get(normalizedProject);
    if (scoped) {
        return {
            state: withCacheMeta(scoped.state, 'memory', scoped.cachedAt),
            source: 'memory',
            cachedAt: scoped.cachedAt,
            cacheVersion: COLLECTION_CACHE_VERSION,
        };
    }
    const redis = getRedis();
    if (!redis) {
        return {
            state: null,
            source: 'none',
            cacheVersion: COLLECTION_CACHE_VERSION,
        };
    }

    try {
        const key = collectionCacheKey(projectId);
        const payload = asCachePayload(await redis.get(key));
        if (!payload?.state) {
            return {
                state: null,
                source: 'none',
                cacheVersion: COLLECTION_CACHE_VERSION,
            };
        }
        // Warm in-memory cache after a shared-cache hit.
        setInMemoryCollectionCache(payload.state, payload.cachedAt, normalizedProject);
        return {
            state: withCacheMeta(payload.state, 'redis', payload.cachedAt),
            source: 'redis',
            cachedAt: payload.cachedAt,
            cacheVersion: COLLECTION_CACHE_VERSION,
        };
    } catch {
        return {
            state: null,
            source: 'none',
            cacheVersion: COLLECTION_CACHE_VERSION,
        };
    }
}

export async function writeCollectionCache(
    state: CollectionState,
    projectId?: string | null
): Promise<CollectionState> {
    const cachedAt = new Date().toISOString();
    const normalizedProject = normalizedProjectId(projectId ?? state.meta.projectId);
    const memoryState = setInMemoryCollectionCache(state, cachedAt, normalizedProject);
    const redis = getRedis();
    if (!redis) return memoryState;

    try {
        const key = collectionCacheKey(normalizedProject);
        const payload: CollectionCachePayload = {
            cachedAt,
            state: withCacheMeta(state, 'redis', cachedAt),
        };
        await redis.set(key, payload);
    } catch {
        // Memory cache remains the fallback when shared cache write fails.
    }
    return memoryState;
}
