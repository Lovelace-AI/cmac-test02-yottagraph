<template>
    <v-card min-width="500">
        <v-card-title class="d-flex align-center">
            <span>Settings & Diagnostics</span>
            <v-spacer></v-spacer>
            <v-btn
                icon
                variant="text"
                aria-label="Close settings"
                @click="state.showSettingsDialog = false"
            >
                <v-icon>mdi-close</v-icon>
            </v-btn>
        </v-card-title>

        <v-tabs v-model="settingsTab" density="compact" color="primary" class="px-4">
            <v-tab value="general">
                <v-icon start size="small">mdi-cog-outline</v-icon>
                General
            </v-tab>
            <v-tab value="mcp">
                <v-icon start size="small">mdi-api</v-icon>
                MCP Log
                <v-chip v-if="mcpLog.length" size="x-small" class="ml-2">{{
                    mcpLog.length
                }}</v-chip>
            </v-tab>
            <v-tab value="gemini">
                <v-icon start size="small">mdi-robot</v-icon>
                Gemini Usage
                <v-chip v-if="displayedGeminiLog.length" size="x-small" class="ml-2">{{
                    displayedGeminiLog.length
                }}</v-chip>
            </v-tab>
        </v-tabs>

        <v-divider />

        <v-card-text class="pa-0 settings-content">
            <div v-if="settingsTab === 'general'" class="pa-4">
                <v-container>
                    <v-row>
                        <v-col cols="12">
                            <h3 class="text-h6 mb-2">Appearance</h3>
                            <v-radio-group v-model="selectedColorMode" inline color="primary">
                                <v-radio label="Dark mode" value="dark" />
                                <v-radio label="Light mode" value="light" />
                            </v-radio-group>
                        </v-col>

                        <v-col cols="12">
                            <h3 class="text-h6 mb-2">Server Configuration</h3>
                            <div class="mt-3">
                                <div class="text-body-2 mb-1">Current Query Server:</div>
                                <code class="text-caption">{{
                                    currentQueryServer || 'Not configured'
                                }}</code>
                            </div>
                            <div class="text-caption text-medium-emphasis mt-3">
                                Use <code>/configure_query_server</code> in Cursor to change the
                                Query Server address, or update it in the Broadchurch Portal.
                            </div>
                        </v-col>
                    </v-row>
                </v-container>
            </div>

            <div v-if="settingsTab === 'mcp'">
                <div v-if="mcpLog.length === 0" class="text-center text-medium-emphasis py-12">
                    <v-icon size="40" class="mb-2">mdi-api</v-icon>
                    <div>No MCP calls recorded yet. Load the graph to populate this log.</div>
                </div>
                <v-data-table
                    v-else
                    :headers="mcpHeaders"
                    :items="mcpLog"
                    :items-per-page="25"
                    density="compact"
                    item-value="id"
                    show-expand
                >
                    <template #item.status="{ item }">
                        <v-icon size="14" :color="item.status === 'success' ? 'success' : 'error'">
                            {{
                                item.status === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle'
                            }}
                        </v-icon>
                    </template>
                    <template #item.durationMs="{ item }">
                        <span class="text-caption">{{ item.durationMs }}ms</span>
                    </template>
                    <template #item.timestamp="{ item }">
                        <span class="text-caption text-medium-emphasis">
                            {{ new Date(item.timestamp).toLocaleTimeString() }}
                        </span>
                    </template>
                    <template #expanded-row="{ item }">
                        <tr>
                            <td :colspan="mcpHeaders.length + 1" class="pa-3">
                                <div class="text-caption font-weight-medium mb-1">Arguments</div>
                                <pre class="mcp-payload">{{
                                    JSON.stringify(item.args, null, 2)
                                }}</pre>
                                <div class="text-caption font-weight-medium mt-2 mb-1">
                                    Response
                                </div>
                                <pre class="mcp-payload">{{
                                    JSON.stringify(item.response, null, 2)
                                }}</pre>
                            </td>
                        </tr>
                    </template>
                </v-data-table>
            </div>

            <div v-if="settingsTab === 'gemini'">
                <div
                    v-if="displayedGeminiLog.length === 0"
                    class="text-center text-medium-emphasis py-12"
                >
                    <v-icon size="40" class="mb-2">mdi-robot</v-icon>
                    <div>
                        No Gemini calls recorded yet. Use the Agent workspace to generate content.
                    </div>
                </div>
                <template v-else>
                    <div class="pa-4">
                        <SummaryMetaBar
                            :entity-count="totalGeminiTokens"
                            entity-label="total tokens"
                            :model="latestGeminiEntry?.model"
                            :usage="geminiTotals"
                            :show-feedback="false"
                        />
                    </div>
                    <v-data-table
                        :headers="geminiHeaders"
                        :items="displayedGeminiLog"
                        :items-per-page="20"
                        density="compact"
                    >
                        <template #item.durationMs="{ item }">
                            <span class="text-caption">{{ item.latencyMs }}ms</span>
                        </template>
                        <template #item.totalTokens="{ item }">
                            <span class="text-caption">{{
                                item.totalTokens.toLocaleString()
                            }}</span>
                        </template>
                        <template #item.costUsd="{ item }">
                            <span class="text-caption">${{ item.costUsd.toFixed(4) }}</span>
                        </template>
                        <template #item.timestamp="{ item }">
                            <span class="text-caption text-medium-emphasis">
                                {{ new Date(item.timestamp).toLocaleTimeString() }}
                            </span>
                        </template>
                    </v-data-table>
                </template>
            </div>
        </v-card-text>

        <v-divider />

        <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="state.showSettingsDialog = false">Close</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script setup lang="ts">
    import type { AppColorMode } from '~/composables/useAppColorMode';
    import { useAppColorMode } from '~/composables/useAppColorMode';
    import { useCollectionWorkspace } from '~/composables/useCollectionWorkspace';
    import { state } from '~/utils/appState';

    const config = useRuntimeConfig();
    const currentQueryServer = computed(() => config.public.queryServerAddress as string);
    const { colorMode, setColorMode } = useAppColorMode();
    const { mcpLog, geminiLog } = useCollectionWorkspace();
    const settingsTab = ref<'general' | 'mcp' | 'gemini'>('general');
    const serverGeminiLog = ref<
        Array<{
            id: number;
            model: string;
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
            costUsd: number;
            latencyMs: number;
            timestamp: string;
            label: string;
            status: 'success' | 'error';
        }>
    >([]);

    const selectedColorMode = computed({
        get: () => colorMode.value,
        set: (mode: string) => setColorMode(mode as AppColorMode),
    });

    const mcpHeaders = [
        { title: '', key: 'data-table-expand', width: 40 },
        { title: 'OK', key: 'status', width: 40, sortable: false },
        { title: 'Tool', key: 'tool', sortable: true },
        { title: 'Query', key: 'argsSummary', sortable: false },
        { title: 'Result', key: 'responseSummary', sortable: false },
        { title: 'ms', key: 'durationMs', sortable: true },
        { title: 'Time', key: 'timestamp', sortable: true },
    ];

    const geminiHeaders = [
        { title: 'Action', key: 'label', sortable: true },
        { title: 'Model', key: 'model', sortable: true },
        { title: 'In', key: 'promptTokens', sortable: true },
        { title: 'Out', key: 'completionTokens', sortable: true },
        { title: 'Total', key: 'totalTokens', sortable: true },
        { title: 'Cost', key: 'costUsd', sortable: true },
        { title: 'Latency', key: 'latencyMs', sortable: true },
        { title: 'Time', key: 'timestamp', sortable: true },
    ];

    const displayedGeminiLog = computed(() =>
        serverGeminiLog.value.length > 0 ? serverGeminiLog.value : geminiLog.value
    );
    const latestGeminiEntry = computed(() =>
        displayedGeminiLog.value.reduce<(typeof displayedGeminiLog.value)[number] | null>(
            (latest, entry) => {
                if (!latest) return entry;
                return entry.timestamp > latest.timestamp ? entry : latest;
            },
            null
        )
    );

    const totalGeminiTokens = computed(() =>
        displayedGeminiLog.value.reduce((sum, entry) => sum + entry.totalTokens, 0)
    );

    const geminiTotals = computed(() => {
        if (!displayedGeminiLog.value.length) return undefined;
        const promptTokens = displayedGeminiLog.value.reduce(
            (sum, entry) => sum + entry.promptTokens,
            0
        );
        const completionTokens = displayedGeminiLog.value.reduce(
            (sum, entry) => sum + entry.completionTokens,
            0
        );
        return {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
            cost_usd: displayedGeminiLog.value.reduce((sum, entry) => sum + entry.costUsd, 0),
        };
    });

    async function refreshGeminiUsage(): Promise<void> {
        try {
            const result = await $fetch<{
                entries: Array<{
                    id: number;
                    model: string;
                    promptTokens: number;
                    completionTokens: number;
                    totalTokens: number;
                    costUsd: number;
                    latencyMs: number;
                    timestamp: string;
                    label: string;
                    status: 'success' | 'error';
                }>;
            }>('/api/collection/gemini-usage');
            serverGeminiLog.value = result.entries ?? [];
        } catch {
            serverGeminiLog.value = [];
        }
    }

    watch(
        () => state.showSettingsDialog,
        (open) => {
            if (open) refreshGeminiUsage();
        }
    );
    watch(settingsTab, (tab) => {
        if (tab === 'gemini') refreshGeminiUsage();
    });
</script>

<style scoped>
    .settings-content {
        min-height: 400px;
    }

    code {
        padding: 2px 4px;
        background-color: var(--app-code-bg);
        border-radius: 3px;
        font-family: monospace;
    }

    .mcp-payload {
        font-size: 0.72rem;
        background: var(--app-subtle-surface);
        border: 1px solid var(--app-divider-strong);
        border-radius: 4px;
        padding: 8px;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-all;
    }
</style>
