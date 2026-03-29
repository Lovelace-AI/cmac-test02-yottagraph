<template>
    <div class="overview-briefing">
        <CollectionHeaderCard
            :title="overview.collectionName"
            :subtitle="overview.subtitle"
            :detected-deal-type="overview.detectedDealType"
            :status="overview.status"
            :status-label="overview.statusLabel"
            :document-count="overview.documentCount"
            :analysis-status="overview.analysisStatusLabel"
            :last-updated="overview.lastUpdated"
            :primary-action-label="overview.primaryActionLabel"
            :primary-action-loading="rebuilding"
            :primary-action-disabled="overview.status === 'processing' || rebuilding"
            @primary-action="handlePrimaryAction"
        />

        <v-card v-if="showPipelinePanel" class="pipeline-card" variant="flat">
            <v-card-text class="py-3">
                <button
                    type="button"
                    class="pipeline-toggle w-100 d-flex align-center justify-space-between"
                    @click="pipelineExpanded = !pipelineExpanded"
                >
                    <div
                        class="text-caption text-medium-emphasis font-weight-medium text-uppercase"
                    >
                        Graph Reconstruction Pipeline
                        <span
                            v-if="!rebuilding && pipelineTotalDurationMs > 0"
                            class="ml-2 text-caption text-disabled"
                        >
                            ({{ formatDuration(pipelineTotalDurationMs) }} total)
                        </span>
                    </div>
                    <v-icon size="18" color="medium-emphasis">
                        {{ pipelineExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                    </v-icon>
                </button>
                <v-expand-transition>
                    <div v-if="pipelineExpanded" class="pt-2">
                        <SummaryAgentSteps :steps="rebuildSteps" />
                    </div>
                </v-expand-transition>
            </v-card-text>
        </v-card>

        <div class="overview-strip">
            <DealSummaryCard
                :fields="overview.dealSummaryFields"
                :status="overview.status"
                @run-analysis="handleRunAnalysis"
            />
            <ExtractionStatsCard
                :stats="overview.extractionStats"
                :status="overview.status"
                @run-analysis="handleRunAnalysis"
            />
        </div>

        <AICaseStudyNarrativeCard
            :narrative-paragraphs="narrativeParagraphs"
            :citation-count="narrativeCitations.length"
            :status="overview.status"
            :is-regenerating="narrativeLoading"
            @regenerate="loadOverviewLanguage"
            @run-analysis="handleRunAnalysis"
        />

        <SourceDocumentsTable
            :documents="overview.documents"
            @preview="handlePreviewDoc"
            @entities="handleViewEntities"
            @citations="handleViewCitations"
        />

        <ExploreNextGrid :cards="overview.exploreCards" @open="setTab" />
    </div>
</template>

<script setup lang="ts">
    const {
        overviewViewModel,
        meta,
        isReady,
        rebuilding,
        rebuild,
        rebuildSteps,
        setTab,
        focusDocument,
        addGeminiUsage,
    } = useCollectionWorkspace();

    const liveNarrative = ref<string | null>(null);
    const narrativeCitations = ref<Array<{ label: string; neid?: string }>>([]);
    const narrativeLoading = ref(false);
    const pipelineExpanded = ref(true);

    const overview = computed(() => overviewViewModel.value);
    const showPipelinePanel = computed(
        () => rebuilding.value || rebuildSteps.value.some((step) => step.status !== 'pending')
    );
    const pipelineTotalDurationMs = computed(() =>
        rebuildSteps.value.reduce((sum, step) => sum + (step.durationMs ?? 0), 0)
    );

    watch(rebuilding, (isRunning) => {
        if (isRunning) pipelineExpanded.value = true;
    });
    const narrativeParagraphs = computed(() => {
        const narrative =
            liveNarrative.value ||
            (overview.value.status === 'pending' || overview.value.status === 'processing'
                ? ''
                : `${overview.value.collectionName} includes ${overview.value.documentCount} source documents that have been translated into a connected transaction graph.\n\nElemental identified major parties, agreements, events, and relationships and turned them into a coherent analytical baseline for downstream validation and enrichment.`);
        return narrative
            .split(/\n+/)
            .map((item) => item.trim())
            .filter(Boolean);
    });

    async function loadOverviewLanguage() {
        if (!isReady.value) {
            liveNarrative.value = null;
            narrativeCitations.value = [];
            return;
        }
        narrativeLoading.value = true;
        try {
            const result = await $fetch<{
                summaryLine: string;
                collectionSummary: string;
                narrative?: string;
                citations?: Array<{ label: string; neid?: string }>;
                usage?: {
                    model: string;
                    promptTokens: number;
                    completionTokens: number;
                    totalTokens: number;
                    costUsd: number;
                };
            }>('/api/collection/overview-language');
            liveNarrative.value = result.narrative || null;
            narrativeCitations.value = result.citations || [];
            if (result.usage) {
                addGeminiUsage({
                    model: result.usage.model,
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                    totalTokens: result.usage.totalTokens,
                    costUsd: result.usage.costUsd,
                    latencyMs: 0,
                    timestamp: new Date().toISOString(),
                    label: 'overview_language',
                });
            }
        } catch {
            liveNarrative.value = null;
            narrativeCitations.value = [];
        } finally {
            narrativeLoading.value = false;
        }
    }

    async function handleRunAnalysis() {
        if (rebuilding.value) return;
        await rebuild();
    }

    async function handlePrimaryAction() {
        if (overview.value.status === 'pending') {
            await handleRunAnalysis();
            return;
        }
        if (overview.value.status === 'processing') return;
        setTab('graph');
    }

    function handlePreviewDoc(neid: string) {
        focusDocument(neid);
    }

    function handleViewEntities(neid: string) {
        focusDocument(neid);
        setTab('graph');
    }

    function handleViewCitations(neid: string) {
        focusDocument(neid);
        setTab('validation');
    }

    function formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
        const min = Math.floor(ms / 60_000);
        const sec = Math.round((ms % 60_000) / 1000);
        return `${min}m ${sec}s`;
    }

    onMounted(() => {
        if (isReady.value) loadOverviewLanguage();
    });
    watch(
        () => isReady.value,
        (ready) => {
            if (ready) loadOverviewLanguage();
        }
    );
    watch(
        () => meta.value.lastRebuilt,
        () => {
            if (isReady.value) loadOverviewLanguage();
        }
    );
</script>

<style scoped>
    .overview-briefing {
        max-width: 1400px;
        margin: 0 auto;
        padding: 8px 8px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .pipeline-card {
        border: 1px solid var(--app-divider-strong);
        background: color-mix(
            in srgb,
            var(--dynamic-panel-background) 88%,
            var(--dynamic-background) 12%
        );
        border-radius: 12px;
    }

    .pipeline-toggle {
        border: 0;
        background: transparent;
        text-align: left;
        cursor: pointer;
    }

    .overview-strip {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
    }

    @media (min-width: 1140px) {
        .overview-strip {
            grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr);
        }
    }
</style>
