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
        />

        <div class="briefing-grid mt-4">
            <div class="span-2">
                <DealSummaryCard v-if="showDealSummary" :fields="overview.dealSummaryFields" />
                <v-card v-else class="placeholder-card" variant="flat">
                    <v-card-item>
                        <v-card-title class="text-body-1 placeholder-title"
                            >Deal Summary</v-card-title
                        >
                    </v-card-item>
                    <v-card-text class="pt-0 text-body-2 text-medium-emphasis">
                        Run initial analysis to synthesize the transaction structure, issuer,
                        closing profile, and primary parties from uploaded documents.
                    </v-card-text>
                </v-card>
            </div>
            <ExtractionStatsCard :stats="overview.extractionStats" />
        </div>

        <div class="briefing-grid mt-4">
            <div class="span-3">
                <AICaseStudyNarrativeCard
                    :narrative-paragraphs="narrativeParagraphs"
                    :citation-count="narrativeCitations.length"
                    @regenerate="loadOverviewLanguage"
                />
            </div>
        </div>

        <SourceDocumentsTable
            class="mt-4"
            :documents="overview.documents"
            @preview="handlePreviewDoc"
            @entities="handleViewEntities"
            @citations="handleViewCitations"
        />

        <ExploreNextGrid class="mt-4" :cards="overview.exploreCards" @open="setTab" />
    </div>
</template>

<script setup lang="ts">
    const { overviewViewModel, meta, isReady, setTab, focusDocument, addGeminiUsage } =
        useCollectionWorkspace();

    const liveNarrative = ref<string | null>(null);
    const narrativeCitations = ref<Array<{ label: string; neid?: string }>>([]);

    const overview = computed(() => overviewViewModel.value);
    const showDealSummary = computed(
        () => overview.value.status === 'complete' || overview.value.status === 'partial'
    );
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
        }
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
        max-width: 1420px;
        margin: 0 auto;
        padding: 12px 8px 24px;
    }

    .briefing-grid {
        display: grid;
        grid-template-columns: repeat(1, minmax(0, 1fr));
        gap: 18px;
    }

    .placeholder-card {
        border: 1px dashed var(--app-divider-strong);
        border-radius: 16px;
        background: linear-gradient(
            155deg,
            color-mix(in srgb, var(--dynamic-panel-background) 84%, var(--dynamic-background) 16%),
            color-mix(in srgb, var(--dynamic-surface) 90%, var(--dynamic-background) 10%)
        );
        min-height: 220px;
    }

    .placeholder-title {
        letter-spacing: 0.01em;
        font-weight: 600;
    }

    @media (min-width: 1280px) {
        .briefing-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .span-2 {
            grid-column: span 2 / span 2;
        }

        .span-3 {
            grid-column: span 3 / span 3;
        }
    }
</style>
