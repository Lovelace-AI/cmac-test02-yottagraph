import { ref, computed } from 'vue';
import { useUserState } from './useUserState';

export interface McpTool {
    name: string;
    description?: string;
    inputSchema?: Record<string, any>;
}

export interface ToolResult {
    toolName: string;
    result: any;
    error?: string;
    timestamp: number;
}

const toolsCache = ref<Record<string, McpTool[]>>({});
const toolsLoading = ref<Record<string, boolean>>({});
const toolsError = ref<Record<string, string | null>>({});
const lastResult = ref<ToolResult | null>(null);
const callLoading = ref(false);

// Per-server MCP session IDs for citation tracking continuity.
const sessionIds = ref<Record<string, string>>({});
const initializedServers = ref<Record<string, boolean>>({});
const initPromises = new Map<string, Promise<void>>();

export function useMcpExplorer() {
    const { accessToken } = useUserState();

    function extractJsonFromSse(raw: string): any | null {
        const blocks = raw.split(/\r?\n\r?\n/);
        let fallbackPayload: any | null = null;

        for (const block of blocks) {
            if (!block.trim()) continue;

            const lines = block.split(/\r?\n/);
            let eventName = '';
            const dataLines: string[] = [];

            for (const line of lines) {
                if (line.startsWith('event:')) {
                    eventName = line.slice('event:'.length).trim();
                    continue;
                }
                if (line.startsWith('data:')) {
                    dataLines.push(line.slice('data:'.length).trimStart());
                }
            }

            if (!dataLines.length) continue;
            const dataPayload = dataLines.join('\n').trim();
            if (!dataPayload || dataPayload === '[DONE]') continue;

            let parsed: any;
            try {
                parsed = JSON.parse(dataPayload);
            } catch {
                // Some SSE events (for example endpoint/session metadata) are plain text.
                continue;
            }

            if (parsed?.jsonrpc || parsed?.result !== undefined || parsed?.error !== undefined) {
                return parsed;
            }

            if (parsed?.data?.jsonrpc || parsed?.data?.result !== undefined) {
                return parsed.data;
            }

            if (eventName === 'message') {
                fallbackPayload = parsed;
            }
        }

        return fallbackPayload;
    }

    async function parseRpcPayload(res: Response): Promise<any> {
        const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';
        const raw = await res.text();

        if (!raw.trim()) {
            return {};
        }

        if (contentType.includes('application/json')) {
            return JSON.parse(raw);
        }

        const ssePayload = extractJsonFromSse(raw);
        if (ssePayload) {
            return ssePayload;
        }

        return JSON.parse(raw);
    }

    async function sendMcpRequest(serverName: string, method: string, params?: any): Promise<any> {
        const url = `/api/mcp/${encodeURIComponent(serverName)}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken.value) {
            headers['Authorization'] = `Bearer ${accessToken.value}`;
        }
        const existingSessionId = sessionIds.value[serverName];
        if (existingSessionId) {
            headers['Mcp-Session-Id'] = existingSessionId;
        }

        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                ...(params ? { params } : {}),
            }),
        });

        // Persist the session ID returned by the MCP server (via the gateway).
        const returnedSessionId = res.headers.get('mcp-session-id');
        if (returnedSessionId) {
            sessionIds.value = { ...sessionIds.value, [serverName]: returnedSessionId };
        }

        let payload: any = null;
        let parseError: unknown = null;

        try {
            payload = await parseRpcPayload(res);
        } catch (error) {
            parseError = error;
        }

        if (!res.ok) {
            const statusMessage =
                payload?.message ||
                payload?.error?.message ||
                (parseError instanceof Error ? parseError.message : null) ||
                `MCP RPC failed (${res.status})`;
            throw new Error(statusMessage);
        }

        if (parseError) {
            throw parseError instanceof Error
                ? parseError
                : new Error('Failed to parse MCP RPC response');
        }

        if (payload?.error?.message) {
            throw new Error(payload.error.message);
        }

        return payload;
    }

    async function ensureInitialized(serverName: string): Promise<void> {
        if (initializedServers.value[serverName]) {
            return;
        }

        const existingInit = initPromises.get(serverName);
        if (existingInit) {
            await existingInit;
            return;
        }

        const initPromise = (async () => {
            const protocolVersion = '2024-11-05';
            await sendMcpRequest(serverName, 'initialize', {
                protocolVersion,
                capabilities: {},
                clientInfo: {
                    name: 'cmac-test02-yottagraph',
                    version: '1.0.0',
                },
            });

            // Required MCP lifecycle notification after initialize.
            await sendMcpRequest(serverName, 'notifications/initialized', {});
            initializedServers.value = { ...initializedServers.value, [serverName]: true };
        })();

        initPromises.set(serverName, initPromise);

        try {
            await initPromise;
        } catch (error) {
            delete sessionIds.value[serverName];
            delete initializedServers.value[serverName];
            throw error;
        } finally {
            initPromises.delete(serverName);
        }
    }

    async function rpc(serverName: string, method: string, params?: any): Promise<any> {
        const isInitMethod = method === 'initialize' || method === 'notifications/initialized';
        if (!isInitMethod) {
            await ensureInitialized(serverName);
        }
        return await sendMcpRequest(serverName, method, params);
    }

    async function listTools(serverName: string): Promise<McpTool[]> {
        toolsLoading.value = { ...toolsLoading.value, [serverName]: true };
        toolsError.value = { ...toolsError.value, [serverName]: null };
        try {
            const response: any = await rpc(serverName, 'tools/list');
            const tools: McpTool[] = (response?.result?.tools ?? []).map((t: any) => ({
                name: t.name,
                description: t.description,
                inputSchema: t.inputSchema,
            }));
            toolsCache.value = { ...toolsCache.value, [serverName]: tools };
            return tools;
        } catch (e: any) {
            const msg = e.data?.statusMessage || e.message || 'Failed to list tools';
            toolsError.value = { ...toolsError.value, [serverName]: msg };
            return [];
        } finally {
            toolsLoading.value = { ...toolsLoading.value, [serverName]: false };
        }
    }

    async function callTool(
        serverName: string,
        toolName: string,
        args: Record<string, any>
    ): Promise<ToolResult> {
        callLoading.value = true;
        try {
            const response: any = await rpc(serverName, 'tools/call', {
                name: toolName,
                arguments: args,
            });
            const result: ToolResult = {
                toolName,
                result: response?.result ?? response,
                timestamp: Date.now(),
            };
            lastResult.value = result;
            return result;
        } catch (e: any) {
            const result: ToolResult = {
                toolName,
                result: null,
                error: e.data?.statusMessage || e.message || 'Tool call failed',
                timestamp: Date.now(),
            };
            lastResult.value = result;
            return result;
        } finally {
            callLoading.value = false;
        }
    }

    function getTools(serverName: string): McpTool[] {
        return toolsCache.value[serverName] ?? [];
    }

    function isLoadingTools(serverName: string): boolean {
        return toolsLoading.value[serverName] ?? false;
    }

    function getToolsError(serverName: string): string | null {
        return toolsError.value[serverName] ?? null;
    }

    return {
        toolsCache: computed(() => toolsCache.value),
        lastResult: computed(() => lastResult.value),
        callLoading: computed(() => callLoading.value),
        listTools,
        callTool,
        getTools,
        isLoadingTools,
        getToolsError,
    };
}
