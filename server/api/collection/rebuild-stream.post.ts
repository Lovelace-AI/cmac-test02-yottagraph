import rebuildStreamGetHandler from '~/server/api/collection/rebuild-stream.get';

interface RebuildStreamBody {
    projectId?: string;
    seedNeids?: string[];
    project?: {
        seedDocuments?: Array<{ neid?: string }>;
        seedEntities?: Array<{ neid?: string }>;
    };
}

export default defineEventHandler(async (event) => {
    const body = ((await readBody(event).catch(() => ({}))) ?? {}) as RebuildStreamBody;
    const url = new URL(event.node.req.url || '/api/collection/rebuild-stream', 'http://localhost');
    const seedNeids = Array.isArray(body.seedNeids)
        ? body.seedNeids.map((neid) => String(neid ?? '').trim()).filter(Boolean)
        : [];
    const seedDocumentNeids = Array.isArray(body.project?.seedDocuments)
        ? body.project.seedDocuments
              .map((document) => String(document?.neid ?? '').trim())
              .filter(Boolean)
        : [];
    const explicitSeedEntityNeids = Array.isArray(body.project?.seedEntities)
        ? body.project.seedEntities
              .map((entity) => String(entity?.neid ?? '').trim())
              .filter(Boolean)
        : [];
    const inferredSeedEntityNeids =
        explicitSeedEntityNeids.length > 0
            ? explicitSeedEntityNeids
            : seedNeids.filter((neid) => !seedDocumentNeids.includes(neid));

    if (body.projectId?.trim()) {
        url.searchParams.set('projectId', body.projectId.trim());
    }
    if (seedNeids.length > 0) {
        url.searchParams.set('seedNeids', seedNeids.join(','));
    }
    if (seedDocumentNeids.length > 0) {
        url.searchParams.set('seedDocumentNeids', seedDocumentNeids.join(','));
    }
    if (inferredSeedEntityNeids.length > 0) {
        url.searchParams.set('seedEntityNeids', inferredSeedEntityNeids.join(','));
    }

    event.node.req.url = `${url.pathname}?${url.searchParams.toString()}`;
    return rebuildStreamGetHandler(event);
});
