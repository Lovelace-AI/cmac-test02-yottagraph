const MCP_SERVER_NAME = 'elemental';

export interface McpLogEntry {
    id: number;
    tool: string;
    argsSummary: string;
    responseSummary: string;
    durationMs: number;
    status: 'success' | 'error';
    timestamp: string;
    args?: Record<string, unknown>;
    response?: unknown;
}

let _mcpLog: McpLogEntry[] = [];
let _logIdCounter = 0;

export function getMcpLog(): McpLogEntry[] {
    return _mcpLog;
}

export function clearMcpLog(): void {
    _mcpLog = [];
    _logIdCounter = 0;
}

function summarizeArgs(tool: string, args: Record<string, unknown>): string {
    const neid = (args.entity_id as any)?.id ?? (args.entity as string) ?? '';
    const flavor = (args.related_flavor as string) ?? '';
    const relTypes = (args.relationship_types as string[])?.join(',') ?? '';
    if (tool === 'elemental_get_related')
        return `${neid} → ${flavor}${relTypes ? ` [${relTypes}]` : ''}`;
    if (tool === 'elemental_get_events') return `hub: ${neid}`;
    if (tool === 'elemental_get_entity')
        return `${neid}${args.history !== undefined ? ' +history' : ''}`;
    return neid || JSON.stringify(args).slice(0, 80);
}

function summarizeResponse(tool: string, result: unknown): string {
    if (!result || typeof result !== 'object') return String(result ?? '').slice(0, 80);
    const r = result as Record<string, unknown>;
    if (tool === 'elemental_get_related') {
        const count = (r.relationships as unknown[])?.length ?? 0;
        return `${count} relationships`;
    }
    if (tool === 'elemental_get_events') {
        const count = (r.events as unknown[])?.length ?? 0;
        return `${count} events`;
    }
    if (tool === 'elemental_get_entity') {
        const name = (r.entity as any)?.name ?? '';
        const histKeys = Object.keys((r.entity as any)?.historical_properties ?? {}).length;
        return name + (histKeys ? ` (${histKeys} props)` : '');
    }
    return JSON.stringify(r).slice(0, 80);
}

function getGatewayConfig() {
    const config = useRuntimeConfig();
    const gatewayUrl = (config.public as any).gatewayUrl as string;
    const orgId = (config.public as any).tenantOrgId as string;
    const qsApiKey = (config as any).qsApiKey as string;
    return { gatewayUrl, orgId, qsApiKey };
}

let mcpSessionId: string | null = null;
let mcpInitialized = false;
let mcpInitPromise: Promise<void> | null = null;

async function mcpRpc(method: string, params?: any, timeoutMs = 20_000): Promise<any> {
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

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
    });

    const returnedSession = res.headers.get('mcp-session-id');
    if (returnedSession) mcpSessionId = returnedSession;

    const raw = await res.text();
    if (!raw.trim()) return {};

    if (!res.ok) {
        throw new Error(`MCP gateway returned ${res.status}: ${raw.slice(0, 200)}`);
    }

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
    if (mcpInitPromise) {
        await mcpInitPromise;
        return;
    }
    mcpInitPromise = (async () => {
        await mcpRpc('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'collection-server', version: '1.0.0' },
        });
        await mcpRpc('notifications/initialized', {});
        mcpInitialized = true;
    })();
    try {
        await mcpInitPromise;
    } finally {
        mcpInitPromise = null;
    }
}

export async function mcpCallTool(
    toolName: string,
    args: Record<string, any>,
    options?: { timeoutMs?: number }
): Promise<any> {
    await ensureMcpSession();
    const startMs = Date.now();
    let result: unknown;
    let status: 'success' | 'error' = 'success';

    try {
        const response = await mcpRpc(
            'tools/call',
            { name: toolName, arguments: args },
            options?.timeoutMs ?? 20_000
        );
        const content = response?.result?.content;
        if (Array.isArray(content) && content.length > 0) {
            const textItem = content.find((c: any) => c.type === 'text');
            if (textItem?.text) {
                try {
                    result = JSON.parse(textItem.text);
                } catch {
                    result = textItem.text;
                }
            }
        }
        if (result === undefined) result = response?.result ?? response;
    } catch (e) {
        status = 'error';
        result = null;
        throw e;
    } finally {
        const durationMs = Date.now() - startMs;
        const entry: McpLogEntry = {
            id: ++_logIdCounter,
            tool: toolName,
            argsSummary: summarizeArgs(toolName, args),
            responseSummary: status === 'error' ? 'error' : summarizeResponse(toolName, result),
            durationMs,
            status,
            timestamp: new Date().toISOString(),
            args,
            response: result,
        };
        _mcpLog.push(entry);
    }

    return result;
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
    mcpInitPromise = null;
    clearMcpLog();
}
