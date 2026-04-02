import rebuildStreamGetHandler from '~/server/api/collection/rebuild-stream.get';

interface RebuildStreamBody {
    projectId?: string;
    projectType?: 'document' | 'entity' | 'mixed';
    seedNeids?: string[];
    seedSourceCount?: number;
    project?: {
        type?: 'document' | 'entity' | 'mixed';
        seedDocuments?: Array<{ neid?: string }>;
        seedEntities?: Array<{ neid?: string }>;
    };
}

function normalizeNeid(neid: string): string {
    const value = String(neid ?? '').trim();
    const digitsOnly = value.replace(/\D/g, '');
    const unpadded = digitsOnly.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

export default defineEventHandler(async (event) => {
    const body = ((await readBody(event).catch(() => ({}))) ?? {}) as RebuildStreamBody;
    const url = new URL(event.node.req.url || '/api/collection/rebuild-stream', 'http://localhost');

    const requestSeedNeids = Array.isArray(body.seedNeids)
        ? body.seedNeids
              .map((neid) => String(neid ?? '').trim())
              .filter(Boolean)
              .map((neid) => normalizeNeid(neid))
        : [];
    const documentSeedNeids = Array.isArray(body.project?.seedDocuments)
        ? body.project.seedDocuments
              .map((document) => String(document?.neid ?? '').trim())
              .filter(Boolean)
              .map((neid) => normalizeNeid(neid))
        : [];
    const entitySeedNeids = Array.isArray(body.project?.seedEntities)
        ? body.project.seedEntities
              .map((entity) => String(entity?.neid ?? '').trim())
              .filter(Boolean)
              .map((neid) => normalizeNeid(neid))
        : [];

    const projectType = body.projectType ?? body.project?.type;
    const mergedSeedNeids = [
        ...new Set(
            projectType === 'entity'
                ? entitySeedNeids.length
                    ? entitySeedNeids
                    : requestSeedNeids
                : projectType === 'document'
                  ? documentSeedNeids.length
                      ? documentSeedNeids
                      : requestSeedNeids
                  : [...requestSeedNeids, ...documentSeedNeids, ...entitySeedNeids]
        ),
    ];

    const explicitProjectId = body.projectId?.trim();
    if (explicitProjectId) {
        url.searchParams.set('projectId', explicitProjectId);
    } else if (mergedSeedNeids.length > 0) {
        // Avoid accidentally defaulting to preset rebuild mode when a custom seed is supplied.
        url.searchParams.set('projectId', 'custom-seeded-project');
    }
    if (projectType) {
        url.searchParams.set('projectType', projectType);
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
