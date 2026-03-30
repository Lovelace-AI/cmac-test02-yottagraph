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
                :narrative-paragraphs="narrativeParagraphs"
                :citation-count="narrativeCitations.length"
                :is-regenerating="narrativeLoading"
                @regenerate="loadOverviewLanguage"
                @run-analysis="handleRunAnalysis"
            />
            <div class="overview-rail">
                <div class="overview-rail-panels">
                    <ExtractionStatsCard
                        :stats="overview.extractionStats"
                        :status="overview.status"
                        :stacked="true"
                        @run-analysis="handleRunAnalysis"
                    />
                    <SourceDocumentsCompactCard :documents="overview.documents" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    const {
        overviewViewModel,
        meta,
        documentEntities: entities,
        isReady,
        rebuilding,
        rebuild,
        rebuildSteps,
        setTab,
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

    watch(rebuilding, (isRunning, wasRunning) => {
        if (isRunning) {
            pipelineExpanded.value = true;
            return;
        }
        if (!isRunning && wasRunning && isReady.value && overview.value.status !== 'error') {
            pipelineExpanded.value = false;
        }
    });

    function normalizeWhitespace(input: string): string {
        return input.replace(/\s+/g, ' ').trim();
    }

    function firstSentences(input: string, maxSentences = 3): string[] {
        const normalized = normalizeWhitespace(input);
        if (!normalized) return [];
        const sentences = normalized
            .split(/(?<=[.!?])\s+/)
            .map((sentence) => sentence.trim())
            .filter(Boolean);
        return sentences.slice(0, maxSentences);
    }

    const MUNICIPAL_BOND_NEID = '8242646876499346416';

    function normalizeNeid(value: string): string {
        const unpadded = value.replace(/^0+(?=\d)/, '') || '0';
        return unpadded.padStart(20, '0');
    }

    function isNeidLike(value: string): boolean {
        return /^\d{16,24}$/.test(value.trim());
    }

    function entityDisplayName(entity?: {
        name?: string;
        properties?: Record<string, unknown>;
    }): string {
        const direct = String(entity?.name ?? '').trim();
        if (direct && !isNeidLike(direct)) return direct;
        const props = (entity?.properties ?? {}) as Record<string, unknown>;
        const candidateKeys = [
            'matched_name',
            'canonical_name',
            'resolved_name',
            'legal_name',
            'issuer_name',
            'name',
        ];
        for (const key of candidateKeys) {
            const raw = props[key];
            const value =
                raw && typeof raw === 'object' && !Array.isArray(raw)
                    ? (raw as Record<string, unknown>).value
                    : raw;
            const text = String(value ?? '').trim();
            if (text && !isNeidLike(text)) return text;
        }
        return 'the municipal bond at the center of this transaction';
    }

    const municipalBondName = computed(() => {
        const bond = entities.value.find(
            (entity) => normalizeNeid(entity.neid) === normalizeNeid(MUNICIPAL_BOND_NEID)
        );
        return entityDisplayName(bond);
    });

    const narrativeParagraphs = computed(() => {
        if (overview.value.status === 'pending' || overview.value.status === 'processing')
            return [];

        const fallback = [
            `This corpus combines ${overview.value.documentCount} source documents about one financing transaction and the parties involved in it.`,
            `The documents center on ${municipalBondName.value}, and describe that bond deal and its surrounding obligations.`,
            `Together, the files describe the deal structure, legal agreements, and key timeline events around the same transaction narrative.`,
            `Use this view to understand what the documents are saying before reviewing broader graph context.`,
        ].join(' ');

        const source = liveNarrative.value || fallback;
        const bounded = firstSentences(source, 3);
        if (bounded.length >= 2) return [bounded.join(' ')];
        return [firstSentences(fallback, 3).join(' ')];
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
        if (
            overview.value.status === 'pending' ||
            overview.value.status === 'partial' ||
            overview.value.status === 'error'
        ) {
            await handleRunAnalysis();
            return;
        }
        if (overview.value.status === 'processing') return;
        setTab('graph');
    }

    function handlePreviewDoc(_neid: string) {
        setTab('graph');
    }

    function handleViewEntities(_neid: string) {
        setTab('graph');
    }

    function handleViewCitations(_neid: string) {
        setTab('insights');
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

    .overview-rail {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
        align-content: start;
    }

    .overview-rail-panels {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
    }

    @media (min-width: 1140px) {
        .overview-strip {
            grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr);
        }

        .overview-rail-panels {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }
    }
</style>
