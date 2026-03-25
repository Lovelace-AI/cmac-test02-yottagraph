<template>
    <div class="d-flex flex-column fill-height">
        <div class="flex-shrink-0 pa-4">
            <PageHeader title="MCP Server Health & Entity Tools" icon="mdi-server-network" />
        </div>

        <div class="flex-grow-1 overflow-y-auto px-4 pb-4">
            <v-card class="mb-4">
                <v-card-text class="d-flex align-center justify-space-between ga-4 flex-wrap">
                    <div>
                        <div class="text-h6 mb-1">{{ appName }}</div>
                        <div class="text-body-2 text-medium-emphasis">
                            Check Lovelace MCP health and run entity lookup tools.
                        </div>
                    </div>
                    <v-btn
                        :loading="refreshingServers"
                        prepend-icon="mdi-refresh"
                        @click="refreshServerHealth"
                    >
                        Refresh Status
                    </v-btn>
                </v-card-text>
            </v-card>

            <v-alert
                v-if="topLevelError"
                type="warning"
                variant="tonal"
                class="mb-4"
                prepend-icon="mdi-alert"
            >
                {{ topLevelError }}
            </v-alert>

            <v-row class="mb-2">
                <v-col v-for="name in serverNames" :key="name" cols="12" md="6" xl="3">
                    <v-card height="100%">
                        <v-card-item>
                            <v-card-title class="d-flex align-center justify-space-between ga-2">
                                <span class="text-body-1">{{ name }}</span>
                                <v-chip
                                    size="small"
                                    :color="statusColor(serverHealth[name]?.status)"
                                    variant="tonal"
                                >
                                    {{ serverHealth[name]?.status ?? 'checking' }}
                                </v-chip>
                            </v-card-title>
                            <v-card-subtitle>
                                {{ serverHealth[name]?.details ?? 'Checking server...' }}
                            </v-card-subtitle>
                        </v-card-item>

                        <v-card-text class="pt-0">
                            <div class="text-body-2 mb-2">
                                Tools:
                                <strong>{{ serverHealth[name]?.toolsCount ?? 0 }}</strong>
                            </div>
                            <div class="text-body-2 mb-2">
                                `health` tool:
                                <strong>{{
                                    serverHealth[name]?.healthToolName
                                        ? serverHealth[name].healthToolName
                                        : 'not found'
                                }}</strong>
                            </div>
                            <div class="text-body-2">
                                `get_entity` tool:
                                <strong>{{
                                    serverHealth[name]?.getEntityToolName
                                        ? serverHealth[name].getEntityToolName
                                        : 'not found'
                                }}</strong>
                            </div>
                            <v-alert
                                v-if="serverHealth[name]?.error"
                                type="error"
                                density="compact"
                                variant="tonal"
                                class="mt-3"
                            >
                                {{ serverHealth[name].error }}
                            </v-alert>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>

            <v-card>
                <v-card-item>
                    <v-card-title>Run Entity Tool</v-card-title>
                    <v-card-subtitle>
                        Search any entity and run the detected `get_entity` style MCP tool.
                    </v-card-subtitle>
                </v-card-item>
                <v-card-text>
                    <v-row>
                        <v-col cols="12" md="4">
                            <v-select
                                v-model="selectedServer"
                                :items="serverNames"
                                label="Server"
                                hint="Choose a server with a get_entity tool"
                                persistent-hint
                            />
                        </v-col>
                        <v-col cols="12" md="8">
                            <v-text-field
                                v-model="entityQuery"
                                label="Entity name or NEID"
                                placeholder="Example: Microsoft"
                                :disabled="entityLoading"
                                @keydown.enter="runEntityTool"
                            />
                        </v-col>
                    </v-row>

                    <v-textarea
                        v-model="customArgsJson"
                        label="Custom JSON arguments (optional)"
                        hint="Leave blank to auto-map your search text to tool schema"
                        persistent-hint
                        rows="4"
                        auto-grow
                    />

                    <div class="d-flex align-center ga-3 flex-wrap">
                        <v-btn
                            color="primary"
                            prepend-icon="mdi-play"
                            :loading="entityLoading"
                            @click="runEntityTool"
                        >
                            Run get_entity Tool
                        </v-btn>
                        <v-chip v-if="lastEntityToolName" size="small" variant="tonal">
                            Tool: {{ lastEntityToolName }}
                        </v-chip>
                    </div>

                    <v-alert
                        v-if="entityError"
                        type="error"
                        variant="tonal"
                        class="mt-4"
                        prepend-icon="mdi-close-circle"
                    >
                        {{ entityError }}
                    </v-alert>

                    <div v-if="lastEntityArgs" class="mt-4">
                        <div class="text-subtitle-2 mb-2">Arguments Used</div>
                        <pre class="result-block">{{ formatJson(lastEntityArgs) }}</pre>
                    </div>

                    <div v-if="entityResult" class="mt-4">
                        <div class="text-subtitle-2 mb-2">Tool Result</div>
                        <pre class="result-block">{{ formatJson(entityResult) }}</pre>
                    </div>
                </v-card-text>
            </v-card>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { onMounted, ref, computed, watch } from 'vue';
    import type { McpTool } from '~/composables/useMcpExplorer';

    type HealthState = 'checking' | 'healthy' | 'degraded' | 'unavailable';

    interface ServerHealth {
        status: HealthState;
        details: string;
        toolsCount: number;
        healthToolName: string | null;
        getEntityToolName: string | null;
        error: string | null;
    }

    const { appName } = useAppInfo();
    const { config: tenantConfig, fetchConfig } = useTenantConfig();
    const { listTools, getTools, getToolsError, callTool } = useMcpExplorer();

    const defaultServerNames = [
        'lovelace-elemental',
        'lovelace-stocks',
        'lovelace-wiki',
        'lovelace-polymarket',
    ];
    const serverHealth = ref<Record<string, ServerHealth>>({});
    const refreshingServers = ref(false);
    const topLevelError = ref<string | null>(null);

    const selectedServer = ref('lovelace-elemental');
    const entityQuery = ref('');
    const customArgsJson = ref('');
    const entityLoading = ref(false);
    const entityError = ref<string | null>(null);
    const entityResult = ref<unknown>(null);
    const lastEntityToolName = ref<string | null>(null);
    const lastEntityArgs = ref<Record<string, unknown> | null>(null);

    const configuredServers = computed(
        () => tenantConfig.value?.mcp_servers?.map((server) => server.name) ?? []
    );
    const serverNames = computed(() =>
        configuredServers.value.length ? configuredServers.value : defaultServerNames
    );

    watch(
        serverNames,
        (names) => {
            if (!names.length) return;
            if (!names.includes(selectedServer.value)) {
                selectedServer.value = names[0];
            }
        },
        { immediate: true }
    );

    function normalizeToolName(name: string): string {
        return name.toLowerCase().replace(/-/g, '_');
    }

    function findHealthTool(tools: McpTool[]): McpTool | null {
        const exact = tools.find((tool) =>
            ['health', 'elemental_health'].includes(normalizeToolName(tool.name))
        );
        if (exact) return exact;
        return tools.find((tool) => normalizeToolName(tool.name).includes('health')) ?? null;
    }

    function findGetEntityTool(tools: McpTool[]): McpTool | null {
        const exact = tools.find((tool) =>
            ['get_entity', 'elemental_get_entity', 'getentity'].includes(
                normalizeToolName(tool.name)
            )
        );
        if (exact) return exact;
        return (
            tools.find((tool) => {
                const normalized = normalizeToolName(tool.name);
                return (
                    normalized.includes('entity') &&
                    (normalized.includes('get') ||
                        normalized.includes('lookup') ||
                        normalized.includes('search'))
                );
            }) ?? null
        );
    }

    function isObject(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    function buildDefaultForSchemaType(schemaType: unknown): unknown {
        if (schemaType === 'boolean') return false;
        if (schemaType === 'number' || schemaType === 'integer') return 0;
        if (schemaType === 'array') return [];
        if (schemaType === 'object') return {};
        return '';
    }

    function buildEntityArgs(tool: McpTool, queryText: string): Record<string, unknown> {
        const schema = tool.inputSchema;
        if (!isObject(schema)) {
            return { query: queryText };
        }

        const properties = isObject(schema.properties) ? schema.properties : {};
        const required = Array.isArray(schema.required)
            ? schema.required.filter((v): v is string => typeof v === 'string')
            : [];

        const args: Record<string, unknown> = {};
        const queryKeyPriority = [
            'entity_name',
            'entityName',
            'name',
            'query',
            'search',
            'entity',
            'neid',
            'entity_id',
            'entityId',
        ];

        for (const key of queryKeyPriority) {
            if (key in properties) {
                args[key] = queryText;
                break;
            }
        }

        if (Object.keys(args).length === 0) {
            const firstStringProp = Object.entries(properties).find(
                ([, value]) => isObject(value) && value.type === 'string'
            );
            if (firstStringProp) {
                args[firstStringProp[0]] = queryText;
            }
        }

        if ('maxResults' in properties && !('maxResults' in args)) args.maxResults = 5;
        if ('max_results' in properties && !('max_results' in args)) args.max_results = 5;
        if ('limit' in properties && !('limit' in args)) args.limit = 5;

        for (const key of required) {
            if (key in args) continue;
            const descriptor = properties[key];
            if (isObject(descriptor)) {
                args[key] = buildDefaultForSchemaType(descriptor.type);
            } else {
                args[key] = '';
            }
        }

        return args;
    }

    function statusColor(status: HealthState | undefined): string {
        if (status === 'healthy') return 'success';
        if (status === 'degraded') return 'warning';
        if (status === 'unavailable') return 'error';
        return 'info';
    }

    async function inspectServer(serverName: string): Promise<void> {
        serverHealth.value[serverName] = {
            status: 'checking',
            details: 'Checking connectivity and tools...',
            toolsCount: 0,
            healthToolName: null,
            getEntityToolName: null,
            error: null,
        };

        await listTools(serverName);

        const tools = getTools(serverName);
        const toolError = getToolsError(serverName);
        const healthTool = findHealthTool(tools);
        const getEntityTool = findGetEntityTool(tools);

        if (toolError) {
            serverHealth.value[serverName] = {
                status: 'unavailable',
                details: 'Unable to list tools',
                toolsCount: tools.length,
                healthToolName: healthTool?.name ?? null,
                getEntityToolName: getEntityTool?.name ?? null,
                error: toolError,
            };
            return;
        }

        if (!healthTool) {
            serverHealth.value[serverName] = {
                status: 'degraded',
                details: 'Connected, but no health tool found',
                toolsCount: tools.length,
                healthToolName: null,
                getEntityToolName: getEntityTool?.name ?? null,
                error: null,
            };
            return;
        }

        const healthResult = await callTool(serverName, healthTool.name, {});
        if (healthResult.error) {
            serverHealth.value[serverName] = {
                status: 'degraded',
                details: 'Health tool failed',
                toolsCount: tools.length,
                healthToolName: healthTool.name,
                getEntityToolName: getEntityTool?.name ?? null,
                error: healthResult.error,
            };
            return;
        }

        serverHealth.value[serverName] = {
            status: 'healthy',
            details: 'Healthy and responding to tool calls',
            toolsCount: tools.length,
            healthToolName: healthTool.name,
            getEntityToolName: getEntityTool?.name ?? null,
            error: null,
        };
    }

    async function refreshServerHealth() {
        refreshingServers.value = true;
        topLevelError.value = null;
        try {
            await fetchConfig();
            for (const serverName of serverNames.value) {
                await inspectServer(serverName);
            }
            if (!serverNames.value.length) {
                topLevelError.value = 'No MCP servers are configured for this tenant.';
            }
        } catch (error) {
            topLevelError.value = error instanceof Error ? error.message : 'Failed to refresh status';
        } finally {
            refreshingServers.value = false;
        }
    }

    async function runEntityTool() {
        entityError.value = null;
        entityResult.value = null;
        lastEntityArgs.value = null;
        lastEntityToolName.value = null;

        const queryText = entityQuery.value.trim();
        if (!queryText) {
            entityError.value = 'Enter an entity name or NEID to search.';
            return;
        }

        await listTools(selectedServer.value);
        const tools = getTools(selectedServer.value);
        const toolError = getToolsError(selectedServer.value);
        if (toolError) {
            entityError.value = toolError;
            return;
        }

        const getEntityTool = findGetEntityTool(tools);
        if (!getEntityTool) {
            entityError.value = `No get_entity style tool found on ${selectedServer.value}.`;
            return;
        }

        let args: Record<string, unknown>;
        if (customArgsJson.value.trim()) {
            try {
                const parsed = JSON.parse(customArgsJson.value);
                if (!isObject(parsed)) {
                    entityError.value = 'Custom arguments must be a JSON object.';
                    return;
                }
                args = parsed;
            } catch {
                entityError.value = 'Custom arguments are not valid JSON.';
                return;
            }
        } else {
            args = buildEntityArgs(getEntityTool, queryText);
        }

        entityLoading.value = true;
        lastEntityToolName.value = getEntityTool.name;
        lastEntityArgs.value = args;
        const result = await callTool(selectedServer.value, getEntityTool.name, args);
        entityLoading.value = false;

        if (result.error) {
            entityError.value = result.error;
            return;
        }

        entityResult.value = result.result;
    }

    function formatJson(value: unknown): string {
        try {
            return JSON.stringify(value, null, 2);
        } catch {
            return String(value);
        }
    }

    onMounted(() => {
        refreshServerHealth();
    });
</script>

<style scoped>
    .result-block {
        margin: 0;
        padding: 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        overflow-x: auto;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
    }
</style>
