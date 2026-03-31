interface TenantAgentConfig {
    name: string;
    display_name?: string;
    engine_id: string;
}

interface TenantConfigResponse {
    agents?: TenantAgentConfig[];
}

function normalize(value: string | undefined): string {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}

function parseMaybeJson<T>(text: string): T | null {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
    const candidates = [trimmed, fenced ?? ''].filter(Boolean);
    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate) as T;
        } catch {
            // try next
        }
    }
    return null;
}

function extractTextFromEventStream(events: any[]): string {
    let lastText = '';
    for (const raw of events) {
        const evt = typeof raw === 'string' ? parseMaybeJson<any>(raw) : raw;
        if (!evt || typeof evt !== 'object') continue;
        const parts = Array.isArray(evt.content?.parts) ? evt.content.parts : [];
        for (const part of parts) {
            if (
                part?.text &&
                !part?.functionCall &&
                !part?.function_call &&
                !part?.functionResponse &&
                !part?.function_response
            ) {
                lastText = String(part.text);
            }
        }
    }
    return lastText;
}

function extractAgentText(output: any): string {
    if (typeof output === 'string') return output;
    if (Array.isArray(output)) {
        const text = extractTextFromEventStream(output);
        if (text) return text;
    }
    if (output?.content?.parts) {
        const text = extractTextFromEventStream([output]);
        if (text) return text;
    }
    if (output?.text) return String(output.text);
    if (output?.content) {
        return typeof output.content === 'string'
            ? output.content
            : JSON.stringify(output.content, null, 2);
    }
    if (output?.output) return extractAgentText(output.output);
    return JSON.stringify(output ?? {}, null, 2);
}

function resolveAgentByName(
    agents: TenantAgentConfig[],
    preferredName: string
): TenantAgentConfig | null {
    const wanted = normalize(preferredName);
    if (!wanted) return null;
    return (
        agents.find((agent) => normalize(agent.name) === wanted) ||
        agents.find((agent) => normalize(agent.display_name) === wanted) ||
        agents.find((agent) => normalize(agent.name).includes(wanted)) ||
        agents.find((agent) => normalize(agent.display_name).includes(wanted)) ||
        null
    );
}

async function fetchTenantAgents(): Promise<TenantAgentConfig[]> {
    const config = useRuntimeConfig();
    const gatewayUrl = String((config.public as any).gatewayUrl ?? '').trim();
    const orgId = String((config.public as any).tenantOrgId ?? '').trim();
    if (!gatewayUrl || !orgId) return [];
    const response = await fetch(`${gatewayUrl}/api/config/${orgId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as TenantConfigResponse;
    return Array.isArray(payload?.agents) ? payload.agents : [];
}

export async function resolveAskYottaAgentIds(): Promise<{
    planningAgentId: string | null;
    contextAgentId: string | null;
    compositionAgentId: string | null;
}> {
    const runtime = useRuntimeConfig();
    const publicConfig = runtime.public as any;
    const planningName = String(publicConfig.askYottaPlanningAgentName ?? 'planning_agent');
    const contextName = String(publicConfig.askYottaContextAgentName ?? 'context_agent');
    const contextFallbackName = String(
        publicConfig.askYottaContextAgentFallbackName ?? 'example_agent'
    );
    const compositionName = String(
        publicConfig.askYottaCompositionAgentName ?? 'composition_agent'
    );

    const agents = await fetchTenantAgents();
    const planning = resolveAgentByName(agents, planningName);
    const context =
        resolveAgentByName(agents, contextName) || resolveAgentByName(agents, contextFallbackName);
    const composition = resolveAgentByName(agents, compositionName);
    return {
        planningAgentId: planning?.engine_id ?? null,
        contextAgentId: context?.engine_id ?? null,
        compositionAgentId: composition?.engine_id ?? null,
    };
}

export async function callAgentQuery(args: {
    agentId: string;
    message: string;
    sessionId?: string;
}): Promise<{ text: string; sessionId: string | null; raw: any }> {
    const config = useRuntimeConfig();
    const gatewayUrl = String((config.public as any).gatewayUrl ?? '').trim();
    const orgId = String((config.public as any).tenantOrgId ?? '').trim();
    if (!gatewayUrl || !orgId) {
        throw createError({ statusCode: 503, statusMessage: 'Agent gateway is not configured.' });
    }
    const response = await fetch(`${gatewayUrl}/api/agents/${orgId}/${args.agentId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: args.message,
            input: args.message,
            ...(args.sessionId ? { session_id: args.sessionId } : {}),
        }),
    });
    const body = await response.text();
    if (!response.ok) {
        throw createError({
            statusCode: response.status,
            statusMessage: body || `Agent query failed (${response.status})`,
        });
    }
    const parsed = parseMaybeJson<any>(body);
    const output = parsed?.output ?? parsed?.result ?? parsed;
    return {
        text: extractAgentText(output),
        sessionId: parsed?.session_id ?? null,
        raw: parsed,
    };
}

export function parseAgentJson<T>(text: string): T | null {
    return parseMaybeJson<T>(text);
}
