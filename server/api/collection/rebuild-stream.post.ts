import rebuildStreamGetHandler from '~/server/api/collection/rebuild-stream.get';

interface RebuildStreamBody {
    projectId?: string;
    seedNeids?: string[];
    seedSourceCount?: number;
    project?: {
        seedDocuments?: Array<{ neid?: string }>;
        seedEntities?: Array<{ neid?: string }>;
    };
}

export default defineEventHandler(async (event) => {
    const body = ((await readBody(event).catch(() => ({}))) ?? {}) as RebuildStreamBody;
    const url = new URL(event.node.req.url || '/api/collection/rebuild-stream', 'http://localhost');

    const requestSeedNeids = Array.isArray(body.seedNeids)
        ? body.seedNeids.map((neid) => String(neid ?? '').trim()).filter(Boolean)
        : [];
    const documentSeedNeids = Array.isArray(body.project?.seedDocuments)
        ? body.project.seedDocuments
              .map((document) => String(document?.neid ?? '').trim())
              .filter(Boolean)
        : [];
    const entitySeedNeids = Array.isArray(body.project?.seedEntities)
        ? body.project.seedEntities
              .map((entity) => String(entity?.neid ?? '').trim())
              .filter(Boolean)
        : [];

    const mergedSeedNeids = [
        ...new Set([...requestSeedNeids, ...documentSeedNeids, ...entitySeedNeids]),
    ];

    if (body.projectId?.trim()) {
        url.searchParams.set('projectId', body.projectId.trim());
    }
    if (mergedSeedNeids.length > 0) {
        url.searchParams.set('seedNeids', mergedSeedNeids.join(','));
    }

    const clientSeedSourceCount = Number(body.seedSourceCount) || mergedSeedNeids.length;
    if (clientSeedSourceCount > 0) {
        url.searchParams.set('seedSourceCount', String(clientSeedSourceCount));
    }

    event.node.req.url = `${url.pathname}?${url.searchParams.toString()}`;
    return rebuildStreamGetHandler(event);
});
