export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const gatewayUrl = (config.public as any).gatewayUrl as string | undefined;
    const orgId = (config.public as any).tenantOrgId as string | undefined;

    if (!gatewayUrl || !orgId) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Gateway URL or tenant org ID not configured',
        });
    }

    const upstreamUrl = `${gatewayUrl}/api/config/${orgId}`;
    const upstream = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    });

    const body = await upstream.text();

    if (!upstream.ok) {
        throw createError({
            statusCode: upstream.status,
            statusMessage: body || `Gateway config request failed (${upstream.status})`,
        });
    }

    try {
        return JSON.parse(body);
    } catch {
        throw createError({
            statusCode: 502,
            statusMessage: 'Invalid JSON returned from gateway config endpoint',
        });
    }
});
