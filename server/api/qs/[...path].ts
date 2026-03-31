export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const gatewayUrl = (config.public as any).gatewayUrl as string | undefined;
    const orgId = (config.public as any).tenantOrgId as string | undefined;
    const qsApiKey = (config as any).qsApiKey as string | undefined;
    const path = getRouterParam(event, 'path');

    if (!gatewayUrl || !orgId) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Gateway URL or tenant org ID not configured',
        });
    }

    if (!qsApiKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'QS API key not configured',
        });
    }

    if (!path) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing Query Server path',
        });
    }

    const requestUrl = getRequestURL(event);
    const upstreamUrl = `${gatewayUrl}/api/qs/${orgId}/${path}${requestUrl.search}`;
    const method = getMethod(event);
    const authHeader = getHeader(event, 'authorization');
    const contentType = getHeader(event, 'content-type');
    const accept = getHeader(event, 'accept');
    const rawBody =
        method === 'GET' || method === 'HEAD' ? undefined : await readRawBody(event, 'utf8');

    const headers: Record<string, string> = {
        'X-Api-Key': qsApiKey,
        Accept: accept || 'application/json',
    };

    if (contentType) {
        headers['Content-Type'] = contentType;
    }
    if (authHeader) {
        headers.Authorization = authHeader;
    }

    const upstream = await fetch(upstreamUrl, {
        method,
        headers,
        body: rawBody,
    });

    const upstreamContentType = upstream.headers.get('content-type');
    const upstreamCacheControl = upstream.headers.get('cache-control');
    const body = await upstream.text();

    if (upstreamContentType) {
        setHeader(event, 'content-type', upstreamContentType);
    }
    if (upstreamCacheControl) {
        setHeader(event, 'cache-control', upstreamCacheControl);
    }
    setResponseStatus(event, upstream.status);

    return body;
});
