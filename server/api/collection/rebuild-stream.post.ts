import rebuildStreamGetHandler from '~/server/api/collection/rebuild-stream.get';

interface RebuildStreamBody {
    projectId?: string;
    seedNeids?: string[];
}

export default defineEventHandler(async (event) => {
    const body = ((await readBody(event).catch(() => ({}))) ?? {}) as RebuildStreamBody;
    const url = new URL(event.node.req.url || '/api/collection/rebuild-stream', 'http://localhost');

    // Reuse the established GET SSE implementation by projecting POST body fields
    // into query params and delegating to the same handler.
    if (body.projectId?.trim()) {
        url.searchParams.set('projectId', body.projectId.trim());
    }
    if (Array.isArray(body.seedNeids) && body.seedNeids.length > 0) {
        url.searchParams.set('seedNeids', body.seedNeids.join(','));
    }

    event.node.req.url = `${url.pathname}?${url.searchParams.toString()}`;
    return rebuildStreamGetHandler(event);
});
