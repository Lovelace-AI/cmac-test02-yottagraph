export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const gatewayUrl = (config.public as any).gatewayUrl as string | undefined;
    const orgId = (config.public as any).tenantOrgId as string | undefined;
    const serverName = getRouterParam(event, 'serverName');

    if (!gatewayUrl || !orgId) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Gateway URL or tenant org ID not configured',
        });
    }

    if (!serverName) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing MCP server name',
        });
    }

    const requestBody = await readBody(event);
    const authHeader = getHeader(event, 'authorization');
    const mcpSessionId = getHeader(event, 'mcp-session-id');

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
    };

    if (authHeader) {
        headers.Authorization = authHeader;
    }
    if (mcpSessionId) {
        headers['Mcp-Session-Id'] = mcpSessionId;
    }

    const upstreamUrl = `${gatewayUrl}/api/mcp/${orgId}/${serverName}/mcp`;
    const upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody ?? {}),
    });

    const upstreamSessionId = upstream.headers.get('mcp-session-id');
    const upstreamContentType = upstream.headers.get('content-type');
    const body = await upstream.text();

    if (upstreamSessionId) {
        setHeader(event, 'mcp-session-id', upstreamSessionId);
    }
    if (upstreamContentType) {
        setHeader(event, 'content-type', upstreamContentType);
    }
    setResponseStatus(event, upstream.status);

    return body;
});
