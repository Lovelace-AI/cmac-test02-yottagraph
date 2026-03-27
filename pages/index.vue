<template>
    <div class="d-flex flex-column fill-height">
        <!-- Header -->
        <div class="workspace-header flex-shrink-0 px-4 pt-3 pb-0">
            <div class="d-flex align-center justify-space-between mb-3">
                <div>
                    <div class="text-h6 font-headline">Collection Intelligence</div>
                    <div class="text-caption text-medium-emphasis">
                        Understand what this collection means, what is missing, and what to do next.
                    </div>
                </div>
                <div class="d-flex align-center ga-2">
                    <v-chip size="small" :color="isReady ? 'success' : 'default'" variant="tonal">
                        {{ isReady ? 'Analysis Ready' : 'Analysis Not Ready' }}
                    </v-chip>
                    <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-refresh"
                        :loading="rebuilding"
                        :disabled="rebuilding"
                        @click="handleRebuild"
                    >
                        {{ isReady ? 'Re-run Extraction' : 'Run Initial Analysis' }}
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="text"
                        icon="mdi-cog-outline"
                        aria-label="Open workspace settings"
                        @click="settingsOpen = true"
                    />
                </div>
            </div>

            <v-tabs
                v-model="currentTab"
                density="compact"
                color="primary"
                slider-color="primary"
                class="workspace-tabs"
            >
                <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value" size="small">
                    <v-icon start size="small">{{ tab.icon }}</v-icon>
                    {{ tab.label }}
                </v-tab>
            </v-tabs>
        </div>

        <!-- Rebuild pipeline progress panel -->
        <v-expand-transition>
            <div v-if="rebuilding" class="pipeline-panel flex-shrink-0 px-4 py-3">
                <div
                    class="text-caption text-medium-emphasis mb-2 font-weight-medium text-uppercase"
                >
                    Graph Reconstruction Pipeline
                </div>
                <SummaryAgentSteps :steps="rebuildSteps" />
            </div>
        </v-expand-transition>

        <!-- Post-rebuild meta bar -->
        <div
            v-if="isReady && !rebuilding && currentTab !== 'overview'"
            class="meta-bar flex-shrink-0 px-4 py-1"
        >
            <SummaryMetaBar
                :entity-count="meta.entityCount"
                :event-count="meta.eventCount"
                :relationship-count="meta.relationshipCount"
                :property-series="propertySeries.length"
            />
        </div>

        <div
            class="flex-grow-1 overflow-y-auto px-4"
            :class="currentTab === 'overview' ? 'py-2' : 'py-4'"
        >
            <v-alert v-if="collection.error" type="error" variant="tonal" class="mb-4" closable>
                {{ collection.error }}
            </v-alert>
            <v-alert
                v-if="!isReady && !rebuilding && !collection.error && currentTab !== 'overview'"
                type="info"
                variant="tonal"
                class="mb-4"
            >
                Run initial analysis to extract entities, events, relationships, and evidence-linked
                summaries from this document collection.
            </v-alert>

            <CollectionOverview v-if="currentTab === 'overview'" />
            <GraphWorkspace v-else-if="currentTab === 'graph'" />
            <EventsView v-else-if="currentTab === 'events'" />
            <AgreementsView v-else-if="currentTab === 'agreements'" />
            <ValidationView v-else-if="currentTab === 'validation'" />
            <AgentWorkspace v-else-if="currentTab === 'agent'" />
            <EnrichmentView v-else-if="currentTab === 'enrichment'" />
        </div>

        <!-- Settings Dialog -->
        <v-dialog v-model="settingsOpen" max-width="860" scrollable>
            <v-card>
                <v-card-item>
                    <v-card-title>Settings & Diagnostics</v-card-title>
                    <template v-slot:append>
                        <v-btn
                            icon="mdi-close"
                            variant="text"
                            aria-label="Close settings dialog"
                            @click="settingsOpen = false"
                        />
                    </template>
                </v-card-item>

                <v-tabs v-model="settingsTab" density="compact" color="primary">
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
                        <v-chip v-if="geminiLog.length" size="x-small" class="ml-2">{{
                            geminiLog.length
                        }}</v-chip>
                    </v-tab>
                </v-tabs>

                <v-divider />

                <v-card-text class="pa-0" style="min-height: 400px">
                    <!-- MCP Log Tab -->
                    <div v-if="settingsTab === 'mcp'">
                        <div
                            v-if="mcpLog.length === 0"
                            class="text-center text-medium-emphasis py-12"
                        >
                            <v-icon size="40" class="mb-2">mdi-api</v-icon>
                            <div>
                                No MCP calls recorded yet. Load the graph to populate this log.
                            </div>
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
                            <template v-slot:item.status="{ item }">
                                <v-icon
                                    size="14"
                                    :color="item.status === 'success' ? 'success' : 'error'"
                                >
                                    {{
                                        item.status === 'success'
                                            ? 'mdi-check-circle'
                                            : 'mdi-alert-circle'
                                    }}
                                </v-icon>
                            </template>
                            <template v-slot:item.durationMs="{ item }">
                                <span class="text-caption">{{ item.durationMs }}ms</span>
                            </template>
                            <template v-slot:item.timestamp="{ item }">
                                <span class="text-caption text-medium-emphasis">
                                    {{ new Date(item.timestamp).toLocaleTimeString() }}
                                </span>
                            </template>
                            <template v-slot:expanded-row="{ item }">
                                <tr>
                                    <td :colspan="mcpHeaders.length + 1" class="pa-3">
                                        <div class="text-caption font-weight-medium mb-1">
                                            Arguments
                                        </div>
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

                    <!-- Gemini Usage Tab -->
                    <div v-if="settingsTab === 'gemini'">
                        <div
                            v-if="geminiLog.length === 0"
                            class="text-center text-medium-emphasis py-12"
                        >
                            <v-icon size="40" class="mb-2">mdi-robot</v-icon>
                            <div>
                                No Gemini calls recorded yet. Use the Agent workspace to generate
                                content.
                            </div>
                        </div>
                        <template v-else>
                            <div class="pa-4">
                                <SummaryMetaBar
                                    :entity-count="totalGeminiTokens"
                                    entity-label="total tokens"
                                    :model="geminiLog[geminiLog.length - 1]?.model"
                                    :usage="geminiTotals"
                                    :show-feedback="false"
                                />
                            </div>
                            <v-data-table
                                :headers="geminiHeaders"
                                :items="geminiLog"
                                :items-per-page="20"
                                density="compact"
                            >
                                <template v-slot:item.durationMs="{ item }">
                                    <span class="text-caption">{{ item.latencyMs }}ms</span>
                                </template>
                                <template v-slot:item.totalTokens="{ item }">
                                    <span class="text-caption">{{
                                        item.totalTokens.toLocaleString()
                                    }}</span>
                                </template>
                                <template v-slot:item.costUsd="{ item }">
                                    <span class="text-caption">${{ item.costUsd.toFixed(4) }}</span>
                                </template>
                                <template v-slot:item.timestamp="{ item }">
                                    <span class="text-caption text-medium-emphasis">
                                        {{ new Date(item.timestamp).toLocaleTimeString() }}
                                    </span>
                                </template>
                            </v-data-table>
                        </template>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
    import type { WorkspaceTab } from '~/utils/collectionTypes';

    const {
        collection,
        isReady,
        isLoading,
        rebuilding,
        rebuildSteps,
        rebuild,
        bootstrap,
        setTab,
        meta,
        propertySeries,
        mcpLog,
        geminiLog,
    } = useCollectionWorkspace();

    const currentTab = ref<WorkspaceTab>('overview');
    const settingsOpen = ref(false);
    const settingsTab = ref<'mcp' | 'gemini'>('mcp');

    watch(currentTab, (tab) => setTab(tab));

    const tabs: Array<{ value: WorkspaceTab; label: string; icon: string }> = [
        { value: 'overview', label: 'Overview', icon: 'mdi-view-dashboard-outline' },
        { value: 'graph', label: 'Graph & Entities', icon: 'mdi-graph-outline' },
        { value: 'events', label: 'Timeline', icon: 'mdi-calendar-outline' },
        { value: 'agreements', label: 'Agreements', icon: 'mdi-file-document-outline' },
        { value: 'validation', label: 'Trust & Coverage', icon: 'mdi-shield-check-outline' },
        { value: 'agent', label: 'Ask Copilot', icon: 'mdi-robot-outline' },
        { value: 'enrichment', label: 'Advanced Enrichment', icon: 'mdi-arrow-expand-all' },
    ];

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
        { title: 'Latency', key: 'durationMs', sortable: true },
        { title: 'Time', key: 'timestamp', sortable: true },
    ];

    const totalGeminiTokens = computed(() =>
        geminiLog.value.reduce((s, e) => s + e.totalTokens, 0)
    );

    const geminiTotals = computed(() => {
        const g = geminiLog.value;
        if (!g.length) return undefined;
        const promptTokens = g.reduce((s, e) => s + e.promptTokens, 0);
        const completionTokens = g.reduce((s, e) => s + e.completionTokens, 0);
        return {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: promptTokens + completionTokens,
            cost_usd: g.reduce((s, e) => s + e.costUsd, 0),
        };
    });

    async function handleRebuild() {
        await rebuild();
    }

    onMounted(() => {
        bootstrap();
    });
</script>

<style scoped>
    .workspace-header {
        border-bottom: 1px solid var(--app-divider);
    }

    .workspace-tabs :deep(.v-tab) {
        text-transform: none;
        letter-spacing: normal;
        font-size: 0.8125rem;
        min-width: 0;
        padding: 0 12px;
    }

    .pipeline-panel {
        background: var(--app-subtle-surface);
        border-bottom: 1px solid var(--app-divider);
    }

    .meta-bar {
        border-bottom: 1px solid var(--app-divider);
        background: var(--app-subtle-surface-2);
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
