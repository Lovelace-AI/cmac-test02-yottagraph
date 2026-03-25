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

            <v-card class="mb-4">
                <v-card-item>
                    <v-card-title>MCP Servers In Use</v-card-title>
                    <v-card-subtitle>
                        Servers discovered from tenant config (or fallback defaults).
                    </v-card-subtitle>
                </v-card-item>
                <v-card-text>
                    <v-table density="compact">
                        <thead>
                            <tr>
                                <th>Server</th>
                                <th>API Endpoint</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="server in mcpServerRows" :key="server.name">
                                <td>{{ server.name }}</td>
                                <td>
                                    <code>{{ server.endpoint }}</code>
                                </td>
                                <td>
                                    <v-chip
                                        size="x-small"
                                        :color="statusColor(serverHealth[server.name]?.status)"
                                        variant="tonal"
                                    >
                                        {{ serverHealth[server.name]?.status ?? 'checking' }}
                                    </v-chip>
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card-text>
            </v-card>

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

            <v-card class="mb-4">
                <v-card-item>
                    <v-card-title>
                        Elemental Tools
                        <v-chip size="small" class="ml-2" variant="tonal">{{
                            elementalTools.length
                        }}</v-chip>
                    </v-card-title>
                    <v-card-subtitle>
                        Expand each tool to inspect schema and run an all-tools smoke test.
                    </v-card-subtitle>
                </v-card-item>
                <v-card-text>
                    <div class="d-flex justify-end mb-2">
                        <v-btn
                            size="small"
                            variant="text"
                            :prepend-icon="
                                showAllToolsInputs ? 'mdi-chevron-up' : 'mdi-chevron-down'
                            "
                            @click="showAllToolsInputs = !showAllToolsInputs"
                        >
                            {{ showAllToolsInputs ? 'Hide Inputs' : 'Show Inputs' }}
                        </v-btn>
                    </div>

                    <v-expand-transition>
                        <v-row v-show="showAllToolsInputs" class="mb-2">
                            <v-col cols="12" md="8">
                                <v-text-field
                                    v-model="allToolsEntityInput"
                                    label="Entity for all-tools test"
                                    placeholder="Example: Microsoft"
                                    :disabled="allToolsRunning"
                                />
                            </v-col>
                            <v-col cols="12" md="4" class="d-flex align-center">
                                <v-btn
                                    color="primary"
                                    prepend-icon="mdi-flask"
                                    :loading="allToolsRunning"
                                    :disabled="!elementalTools.length"
                                    @click="runAllElementalToolsTest"
                                >
                                    Run All Tools Test
                                </v-btn>
                            </v-col>
                        </v-row>
                    </v-expand-transition>

                    <v-alert
                        v-if="allToolsError"
                        type="error"
                        variant="tonal"
                        class="mb-3"
                        prepend-icon="mdi-close-circle"
                    >
                        {{ allToolsError }}
                    </v-alert>

                    <v-alert
                        v-if="allToolsSummary"
                        type="info"
                        variant="tonal"
                        class="mb-3"
                        prepend-icon="mdi-information"
                    >
                        {{ allToolsSummary }}
                    </v-alert>

                    <v-expansion-panels variant="accordion" class="mb-3">
                        <v-expansion-panel v-for="tool in elementalTools" :key="tool.name">
                            <v-expansion-panel-title>
                                <div class="d-flex align-center justify-space-between w-100 pr-2">
                                    <span class="text-body-1">{{ tool.name }}</span>
                                    <v-chip size="x-small" variant="tonal">{{
                                        toolPropertyCount(tool)
                                    }}</v-chip>
                                </div>
                            </v-expansion-panel-title>
                            <v-expansion-panel-text>
                                <div class="text-body-2 text-medium-emphasis mb-2">
                                    {{ tool.description || 'No description' }}
                                </div>
                                <v-row v-if="toolInputFields(tool).length" class="mb-1">
                                    <v-col
                                        v-for="field in toolInputFields(tool)"
                                        :key="`${tool.name}-${field.key}`"
                                        cols="12"
                                        md="6"
                                    >
                                        <v-switch
                                            v-if="field.type === 'boolean'"
                                            :model-value="
                                                toolInputValue(tool, field.key, field.type)
                                            "
                                            :label="field.label"
                                            color="primary"
                                            hide-details
                                            @update:model-value="
                                                setToolInputValue(
                                                    tool,
                                                    field.key,
                                                    $event,
                                                    field.type
                                                )
                                            "
                                        />
                                        <v-text-field
                                            v-else
                                            :model-value="
                                                toolInputValue(tool, field.key, field.type)
                                            "
                                            :label="field.label"
                                            :type="field.type === 'number' ? 'number' : 'text'"
                                            :placeholder="field.placeholder || ''"
                                            @update:model-value="
                                                setToolInputValue(
                                                    tool,
                                                    field.key,
                                                    $event,
                                                    field.type
                                                )
                                            "
                                        />
                                    </v-col>
                                </v-row>
                                <div class="d-flex align-center ga-2 mb-3">
                                    <v-btn
                                        size="small"
                                        color="primary"
                                        prepend-icon="mdi-play"
                                        :loading="runningToolNames[tool.name] === true"
                                        @click.stop="runSingleElementalTool(tool)"
                                    >
                                        Run Tool
                                    </v-btn>
                                    <v-chip
                                        v-if="singleToolStatus[tool.name]"
                                        size="x-small"
                                        :color="
                                            singleToolStatus[tool.name] === 'passed'
                                                ? 'success'
                                                : 'error'
                                        "
                                        variant="tonal"
                                    >
                                        {{ singleToolStatus[tool.name] }}
                                    </v-chip>
                                </div>
                                <v-row>
                                    <v-col cols="12" md="6">
                                        <div class="text-caption mb-1">Actual command</div>
                                        <pre class="result-block">{{
                                            formatJson(singleToolCommandPayload[tool.name] ?? {})
                                        }}</pre>
                                        <div
                                            v-if="singleToolCurl[tool.name]"
                                            class="text-caption mt-3 mb-1"
                                        >
                                            cURL equivalent
                                        </div>
                                        <pre
                                            v-if="singleToolCurl[tool.name]"
                                            class="result-block"
                                            >{{ singleToolCurl[tool.name] }}</pre
                                        >
                                    </v-col>
                                    <v-col cols="12" md="6">
                                        <div class="text-caption mb-1">Actual result</div>
                                        <pre
                                            v-if="singleToolResults[tool.name]"
                                            class="result-block"
                                            >{{ formatJson(singleToolResults[tool.name]) }}</pre
                                        >
                                        <pre
                                            v-else-if="singleToolErrors[tool.name]"
                                            class="result-block"
                                            >{{ singleToolErrors[tool.name] }}</pre
                                        >
                                        <pre v-else class="result-block">
Run this tool to see output.</pre
                                        >
                                    </v-col>
                                </v-row>
                                <div class="text-caption mt-3 mb-1">Input schema</div>
                                <pre class="result-block">{{
                                    formatJson(tool.inputSchema ?? {})
                                }}</pre>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>

                    <v-table v-if="allToolsResults.length" density="compact">
                        <thead>
                            <tr>
                                <th>Tool</th>
                                <th>Status</th>
                                <th>Duration</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="result in allToolsResults" :key="result.toolName">
                                <td>{{ result.toolName }}</td>
                                <td>
                                    <v-chip
                                        size="x-small"
                                        :color="result.status === 'passed' ? 'success' : 'error'"
                                        variant="tonal"
                                    >
                                        {{ result.status }}
                                    </v-chip>
                                </td>
                                <td>{{ result.durationMs }} ms</td>
                                <td class="text-wrap">
                                    {{ result.error || (result.note ? result.note : 'ok') }}
                                </td>
                            </tr>
                        </tbody>
                    </v-table>
                </v-card-text>
            </v-card>

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
    interface AllToolsTestResult {
        toolName: string;
        status: 'passed' | 'failed';
        durationMs: number;
        error?: string;
        note?: string;
    }
    interface ToolInputField {
        key: string;
        label: string;
        placeholder?: string;
        type: 'text' | 'number' | 'boolean';
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
    const allToolsEntityInput = ref('Microsoft');
    const showAllToolsInputs = ref(true);
    const allToolsRunning = ref(false);
    const allToolsError = ref<string | null>(null);
    const allToolsSummary = ref<string | null>(null);
    const allToolsResults = ref<AllToolsTestResult[]>([]);
    const runningToolNames = ref<Record<string, boolean>>({});
    const singleToolResults = ref<Record<string, unknown>>({});
    const singleToolErrors = ref<Record<string, string>>({});
    const singleToolStatus = ref<Record<string, 'passed' | 'failed'>>({});
    const singleToolCommandPayload = ref<Record<string, unknown>>({});
    const singleToolCurl = ref<Record<string, string>>({});
    const toolInputModels = ref<Record<string, Record<string, string | number | boolean>>>({});

    const configuredServers = computed(
        () => tenantConfig.value?.mcp_servers?.map((server) => server.name) ?? []
    );
    const serverNames = computed(() =>
        configuredServers.value.length ? configuredServers.value : defaultServerNames
    );
    const elementalServerName = computed(
        () =>
            serverNames.value.find((serverName) =>
                normalizeToolName(serverName).includes('elemental')
            ) ?? null
    );
    const elementalTools = computed(() => {
        if (!elementalServerName.value) return [];
        return getTools(elementalServerName.value);
    });
    const mcpServerRows = computed(() =>
        serverNames.value.map((name) => ({
            name,
            endpoint: `/api/mcp/${encodeURIComponent(name)}`,
        }))
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

    function buildToolTestArgs(
        tool: McpTool,
        entityInput: string,
        resolvedNeid: string | null
    ): Record<string, unknown> {
        const schema = tool.inputSchema;
        if (!isObject(schema)) {
            return { entity: resolvedNeid || entityInput };
        }

        const properties = isObject(schema.properties) ? schema.properties : {};
        const required = Array.isArray(schema.required)
            ? schema.required.filter((v): v is string => typeof v === 'string')
            : [];
        const args: Record<string, unknown> = {};
        const entityValue = resolvedNeid || entityInput;

        if ('entity' in properties) args.entity = entityValue;
        if ('entity_name' in properties) args.entity_name = entityInput;
        if ('entityName' in properties) args.entityName = entityInput;
        if ('neid' in properties) args.neid = entityValue;
        if ('query' in properties) args.query = entityInput;
        if ('search' in properties) args.search = entityInput;
        if ('flavor' in properties) args.flavor = 'company';
        if ('limit' in properties) args.limit = 3;
        if ('maxResults' in properties) args.maxResults = 3;
        if ('max_results' in properties) args.max_results = 3;
        if ('history' in properties) args.history = false;
        if ('include_participants' in properties) args.include_participants = false;
        if ('direction' in properties) args.direction = 'both';
        if ('related_flavor' in properties) args.related_flavor = 'company';
        if ('properties' in properties) args.properties = ['name'];
        if ('related_properties' in properties) args.related_properties = ['name'];

        if ('entity_id' in properties) {
            args.entity_id = { id_type: 'neid', id: entityValue };
        }
        if ('source' in properties) {
            args.source = { entity: entityInput };
        }
        if ('target' in properties) {
            args.target = { entity: entityInput };
        }

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

    function toolInputFields(tool: McpTool): ToolInputField[] {
        const normalized = normalizeToolName(tool.name);
        if (normalized === 'elemental_get_entity') {
            return [
                { key: 'entity', label: 'Entity', placeholder: 'Microsoft', type: 'text' },
                {
                    key: 'flavor',
                    label: 'Flavor (optional)',
                    placeholder: 'company',
                    type: 'text',
                },
                {
                    key: 'properties_csv',
                    label: 'Properties (optional, comma-separated)',
                    placeholder: 'name, country, industry',
                    type: 'text',
                },
            ];
        }
        if (normalized === 'elemental_get_events') {
            return [
                { key: 'entity', label: 'Entity', placeholder: 'Microsoft', type: 'text' },
                { key: 'limit', label: 'Limit', placeholder: '5', type: 'number' },
                {
                    key: 'query',
                    label: 'Event query (optional)',
                    placeholder: 'earnings call',
                    type: 'text',
                },
            ];
        }
        if (normalized === 'elemental_get_related') {
            return [
                { key: 'entity', label: 'Entity', placeholder: 'Microsoft', type: 'text' },
                {
                    key: 'related_flavor',
                    label: 'Related flavor',
                    placeholder: 'company',
                    type: 'text',
                },
                { key: 'limit', label: 'Limit', placeholder: '5', type: 'number' },
            ];
        }
        if (normalized === 'elemental_get_relationships') {
            return [
                {
                    key: 'source_entity',
                    label: 'Source entity',
                    placeholder: 'Microsoft',
                    type: 'text',
                },
                {
                    key: 'target_entity',
                    label: 'Target entity',
                    placeholder: 'OpenAI',
                    type: 'text',
                },
            ];
        }
        if (normalized === 'elemental_get_schema') {
            return [
                { key: 'flavor', label: 'Flavor (optional)', placeholder: 'company', type: 'text' },
                { key: 'query', label: 'Query (optional)', placeholder: 'revenue', type: 'text' },
            ];
        }
        if (normalized === 'elemental_graph_neighborhood') {
            return [
                { key: 'entity', label: 'Entity', placeholder: 'Microsoft', type: 'text' },
                { key: 'size', label: 'Size', placeholder: '10', type: 'number' },
                { key: 'history', label: 'Include history', type: 'boolean' },
            ];
        }
        if (normalized === 'elemental_graph_sentiment') {
            return [{ key: 'entity', label: 'Entity', placeholder: 'Microsoft', type: 'text' }];
        }
        return [];
    }

    function ensureToolInputModel(tool: McpTool): Record<string, string | number | boolean> {
        const existing = toolInputModels.value[tool.name];
        if (existing) return existing;

        const model: Record<string, string | number | boolean> = {};
        for (const field of toolInputFields(tool)) {
            if (field.key === 'entity') model[field.key] = allToolsEntityInput.value || 'Microsoft';
            else if (field.key === 'source_entity')
                model[field.key] = allToolsEntityInput.value || 'Microsoft';
            else if (field.key === 'target_entity') model[field.key] = 'OpenAI';
            else if (field.key === 'related_flavor') model[field.key] = 'company';
            else if (field.key === 'flavor') model[field.key] = 'company';
            else if (field.type === 'number') model[field.key] = 5;
            else if (field.type === 'boolean') model[field.key] = false;
            else model[field.key] = '';
        }
        toolInputModels.value = { ...toolInputModels.value, [tool.name]: model };
        return model;
    }

    function toolInputValue(tool: McpTool, key: string, type: ToolInputField['type']) {
        const model = ensureToolInputModel(tool);
        const value = model[key];
        if (value === undefined) return type === 'boolean' ? false : '';
        return value;
    }

    function setToolInputValue(
        tool: McpTool,
        key: string,
        value: string | number | boolean | null,
        type: ToolInputField['type']
    ) {
        const model = ensureToolInputModel(tool);
        let next: string | number | boolean = '';

        if (type === 'boolean') next = Boolean(value);
        else if (type === 'number') {
            const parsed = Number(value);
            next = Number.isFinite(parsed) ? parsed : 0;
        } else next = String(value ?? '');

        toolInputModels.value = {
            ...toolInputModels.value,
            [tool.name]: { ...model, [key]: next },
        };
    }

    function toOptionalString(value: string | number | boolean | undefined): string | undefined {
        if (value === undefined || value === null) return undefined;
        const text = String(value).trim();
        return text.length ? text : undefined;
    }

    function buildSingleToolArgs(
        tool: McpTool,
        entityInput: string,
        resolvedNeid: string | null
    ): Record<string, unknown> {
        const normalized = normalizeToolName(tool.name);
        const model = ensureToolInputModel(tool);

        if (normalized === 'elemental_health') {
            return {};
        }
        if (normalized === 'elemental_get_entity') {
            const args: Record<string, unknown> = {
                entity: toOptionalString(model.entity) ?? entityInput,
            };
            const flavor = toOptionalString(model.flavor);
            if (flavor) args.flavor = flavor;
            const propertiesCsv = toOptionalString(model.properties_csv);
            if (propertiesCsv) {
                const properties = propertiesCsv
                    .split(',')
                    .map((value) => value.trim())
                    .filter((value) => value.length > 0);
                if (properties.length) {
                    args.properties = properties;
                }
            }
            return args;
        }
        if (normalized === 'elemental_get_events') {
            const args: Record<string, unknown> = {
                entity: toOptionalString(model.entity) ?? entityInput,
                limit: Number(model.limit ?? 5),
            };
            const query = toOptionalString(model.query);
            if (query) args.query = query;
            return args;
        }
        if (normalized === 'elemental_get_related') {
            return {
                entity: toOptionalString(model.entity) ?? entityInput,
                related_flavor: toOptionalString(model.related_flavor) ?? 'company',
                limit: Number(model.limit ?? 5),
            };
        }
        if (normalized === 'elemental_get_relationships') {
            return {
                source: { entity: toOptionalString(model.source_entity) ?? entityInput },
                target: { entity: toOptionalString(model.target_entity) ?? 'OpenAI' },
            };
        }
        if (normalized === 'elemental_get_schema') {
            const args: Record<string, unknown> = {};
            const flavor = toOptionalString(model.flavor);
            const query = toOptionalString(model.query);
            if (flavor) args.flavor = flavor;
            if (query) args.query = query;
            return args;
        }
        if (normalized === 'elemental_graph_neighborhood') {
            return {
                entity: toOptionalString(model.entity) ?? entityInput,
                size: Number(model.size ?? 10),
                history: Boolean(model.history),
            };
        }
        if (normalized === 'elemental_graph_sentiment') {
            return {
                entity: toOptionalString(model.entity) ?? entityInput,
            };
        }

        return buildToolTestArgs(tool, entityInput, resolvedNeid);
    }

    function buildCommandPayload(toolName: string, args: Record<string, unknown>) {
        return {
            endpoint: `/api/mcp/${encodeURIComponent(elementalServerName.value || 'elemental')}`,
            method: 'POST',
            body: {
                jsonrpc: '2.0',
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args,
                },
            },
        };
    }

    function buildCurlEquivalent(endpoint: string, body: unknown): string {
        const serialized = JSON.stringify(body).replace(/'/g, "'\"'\"'");
        return `curl -sS -X POST \"${endpoint}\" -H \"Content-Type: application/json\" -d '${serialized}'`;
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
            if (elementalServerName.value) {
                await listTools(elementalServerName.value);
            }
            if (!serverNames.value.length) {
                topLevelError.value = 'No MCP servers are configured for this tenant.';
            }
        } catch (error) {
            topLevelError.value =
                error instanceof Error ? error.message : 'Failed to refresh status';
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

    async function resolveEntityNeidForTests(
        serverName: string,
        entityInput: string
    ): Promise<string | null> {
        const tools = getTools(serverName);
        const getEntityTool = findGetEntityTool(tools);
        if (!getEntityTool) return null;

        const lookupArgs = buildEntityArgs(getEntityTool, entityInput);
        const lookup = await callTool(serverName, getEntityTool.name, lookupArgs);
        if (lookup.error || !lookup.result) return null;

        const result = lookup.result as Record<string, unknown>;
        const entity = isObject(result.entity) ? result.entity : null;
        const neid = entity && typeof entity.neid === 'string' ? entity.neid : null;
        return neid;
    }

    async function runAllElementalToolsTest() {
        allToolsError.value = null;
        allToolsSummary.value = null;
        allToolsResults.value = [];

        const serverName = elementalServerName.value;
        if (!serverName) {
            allToolsError.value = 'No elemental server found in configured servers.';
            return;
        }

        const entityInput = allToolsEntityInput.value.trim();
        if (!entityInput) {
            allToolsError.value = 'Enter an entity to run the all-tools test.';
            return;
        }

        allToolsRunning.value = true;
        try {
            await listTools(serverName);
            const tools = getTools(serverName);
            if (!tools.length) {
                allToolsError.value = 'No tools found on the elemental server.';
                return;
            }

            const resolvedNeid = await resolveEntityNeidForTests(serverName, entityInput);
            const results: AllToolsTestResult[] = [];

            for (const tool of tools) {
                const startedAt = Date.now();
                const args = buildToolTestArgs(tool, entityInput, resolvedNeid);
                const response = await callTool(serverName, tool.name, args);
                const durationMs = Date.now() - startedAt;

                if (response.error) {
                    results.push({
                        toolName: tool.name,
                        status: 'failed',
                        durationMs,
                        error: response.error,
                    });
                } else {
                    results.push({
                        toolName: tool.name,
                        status: 'passed',
                        durationMs,
                        note: resolvedNeid ? `Entity context: ${resolvedNeid}` : undefined,
                    });
                }
            }

            allToolsResults.value = results;
            const passed = results.filter((r) => r.status === 'passed').length;
            const failed = results.length - passed;
            allToolsSummary.value = `Ran ${results.length} elemental tools for "${entityInput}" (${passed} passed, ${failed} failed).`;
        } catch (error) {
            allToolsError.value =
                error instanceof Error ? error.message : 'Failed to run all elemental tools.';
        } finally {
            allToolsRunning.value = false;
        }
    }

    async function runSingleElementalTool(tool: McpTool) {
        const serverName = elementalServerName.value;
        const entityInput = allToolsEntityInput.value.trim();

        if (!serverName) {
            singleToolErrors.value = {
                ...singleToolErrors.value,
                [tool.name]: 'No elemental server is configured.',
            };
            singleToolStatus.value = { ...singleToolStatus.value, [tool.name]: 'failed' };
            return;
        }
        if (!entityInput) {
            singleToolErrors.value = {
                ...singleToolErrors.value,
                [tool.name]: 'Provide an entity value for tool execution.',
            };
            singleToolStatus.value = { ...singleToolStatus.value, [tool.name]: 'failed' };
            return;
        }

        runningToolNames.value = { ...runningToolNames.value, [tool.name]: true };
        try {
            await listTools(serverName);
            const resolvedNeid = await resolveEntityNeidForTests(serverName, entityInput);
            const args = buildSingleToolArgs(tool, entityInput, resolvedNeid);
            singleToolErrors.value = { ...singleToolErrors.value, [tool.name]: '' };
            const commandPayload = buildCommandPayload(tool.name, args);
            singleToolCommandPayload.value = {
                ...singleToolCommandPayload.value,
                [tool.name]: commandPayload,
            };
            singleToolCurl.value = {
                ...singleToolCurl.value,
                [tool.name]: buildCurlEquivalent(
                    String(commandPayload.endpoint),
                    commandPayload.body
                ),
            };

            const response = await callTool(serverName, tool.name, args);
            if (response.error) {
                singleToolErrors.value = {
                    ...singleToolErrors.value,
                    [tool.name]: response.error,
                };
                singleToolStatus.value = { ...singleToolStatus.value, [tool.name]: 'failed' };
                return;
            }

            singleToolResults.value = {
                ...singleToolResults.value,
                [tool.name]: response.result,
            };
            singleToolStatus.value = { ...singleToolStatus.value, [tool.name]: 'passed' };
        } catch (error) {
            singleToolErrors.value = {
                ...singleToolErrors.value,
                [tool.name]:
                    error instanceof Error ? error.message : 'Tool execution failed unexpectedly.',
            };
            singleToolStatus.value = { ...singleToolStatus.value, [tool.name]: 'failed' };
        } finally {
            runningToolNames.value = { ...runningToolNames.value, [tool.name]: false };
        }
    }

    function toolPropertyCount(tool: McpTool): number {
        const schema = tool.inputSchema;
        if (!isObject(schema)) return 0;
        const properties = isObject(schema.properties) ? schema.properties : {};
        return Object.keys(properties).length;
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
