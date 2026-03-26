const MCP_SERVER_NAME = 'lovelace-elemental';

function getGatewayConfig() {
    const config = useRuntimeConfig();
    const gatewayUrl = (config.public as any).gatewayUrl as string;
    const orgId = (config.public as any).tenantOrgId as string;
    const qsApiKey = (config as any).qsApiKey as string;
    return { gatewayUrl, orgId, qsApiKey };
}

let mcpSessionId: string | null = null;
let mcpInitialized = false;

async function mcpRpc(method: string, params?: any): Promise<any> {
    const { gatewayUrl, orgId } = getGatewayConfig();
    const url = `${gatewayUrl}/api/mcp/${orgId}/${MCP_SERVER_NAME}/mcp`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
    };
    if (mcpSessionId) {
        headers['Mcp-Session-Id'] = mcpSessionId;
    }

    const isNotification = method.startsWith('notifications/');
    const body: Record<string, any> = { jsonrpc: '2.0', method, ...(params ? { params } : {}) };
    if (!isNotification) body.id = Date.now();

    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

    const returnedSession = res.headers.get('mcp-session-id');
    if (returnedSession) mcpSessionId = returnedSession;

    const raw = await res.text();
    if (!raw.trim()) return {};

    const ct = res.headers.get('content-type')?.toLowerCase() ?? '';
    if (ct.includes('application/json')) return JSON.parse(raw);

    // SSE extraction
    const blocks = raw.split(/\r?\n\r?\n/);
    for (const block of blocks) {
        const lines = block.split(/\r?\n/);
        const dataLines: string[] = [];
        for (const line of lines) {
            if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
        }
        if (!dataLines.length) continue;
        const payload = dataLines.join('\n').trim();
        if (!payload || payload === '[DONE]') continue;
        try {
            const parsed = JSON.parse(payload);
            if (parsed?.jsonrpc || parsed?.result !== undefined) return parsed;
            if (parsed?.data?.jsonrpc || parsed?.data?.result !== undefined) return parsed.data;
        } catch {
            continue;
        }
    }

    return JSON.parse(raw);
}

async function ensureMcpSession(): Promise<void> {
    if (mcpInitialized) return;
    await mcpRpc('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'collection-server', version: '1.0.0' },
    });
    await mcpRpc('notifications/initialized', {});
    mcpInitialized = true;
}

export async function mcpCallTool(toolName: string, args: Record<string, any>): Promise<any> {
    await ensureMcpSession();
    const response = await mcpRpc('tools/call', { name: toolName, arguments: args });
    const content = response?.result?.content;
    if (Array.isArray(content) && content.length > 0) {
        const textItem = content.find((c: any) => c.type === 'text');
        if (textItem?.text) {
            try {
                return JSON.parse(textItem.text);
            } catch {
                return textItem.text;
            }
        }
    }
    return response?.result ?? response;
}

export async function rawQsProperties(eids: string[], pids?: number[]): Promise<any> {
    const { gatewayUrl, orgId, qsApiKey } = getGatewayConfig();
    const url = `${gatewayUrl}/api/qs/${orgId}/elemental/entities/properties`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    if (qsApiKey) headers['X-Api-Key'] = qsApiKey;

    const params = new URLSearchParams();
    params.set('eids', JSON.stringify(eids));
    if (pids) params.set('pids', JSON.stringify(pids));
    params.set('include_attributes', 'true');

    const res = await fetch(url, { method: 'POST', headers, body: params.toString() });
    if (!res.ok) {
        throw new Error(`Raw QS call failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
}

export function resetMcpSession(): void {
    mcpSessionId = null;
    mcpInitialized = false;
}
