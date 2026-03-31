<template>
    <div class="enrichment-layout d-flex flex-column ga-3">
        <v-tabs v-model="activeSubtab" density="compact" color="primary" class="mb-1">
            <v-tab value="comparison">
                <v-icon start size="small">mdi-scale-balance</v-icon>
                Document vs 1-Hop
            </v-tab>
            <v-tab value="graph">
                <v-icon start size="small">mdi-graph-outline</v-icon>
                Curated Graph
            </v-tab>
            <v-tab value="lineage">
                <v-icon start size="small">mdi-source-branch</v-icon>
                Corporate Lineage
            </v-tab>
            <v-tab value="press">
                <v-icon start size="small">mdi-newspaper-variant-outline</v-icon>
                Related Press
            </v-tab>
            <v-tab value="deals">
                <v-icon start size="small">mdi-bank-transfer</v-icon>
                Jersey City Deals
            </v-tab>
        </v-tabs>

        <v-window v-model="activeSubtab">
            <v-window-item value="comparison">
                <v-row>
                    <v-col cols="12" md="4">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2">Document Truth</v-card-title>
                            </v-card-item>
                            <v-card-text>
                                <div class="metric-row">
                                    <span>Entities</span>
                                    <strong>{{ enrichmentComparison.document.entityCount }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Events</span>
                                    <strong>{{ enrichmentComparison.document.eventCount }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Relationships</span>
                                    <strong>{{
                                        enrichmentComparison.document.relationshipCount
                                    }}</strong>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2">1-Hop Context</v-card-title>
                            </v-card-item>
                            <v-card-text>
                                <div class="metric-row">
                                    <span>Added entities</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.oneHopContext.entityCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Added events</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.oneHopContext.eventCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Added relationships</span>
                                    <strong>{{
                                        formatNumber(
                                            enrichmentComparison.oneHopContext.relationshipCount
                                        )
                                    }}</strong>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2"
                                    >Raw 1-Hop Reference (Audit)</v-card-title
                                >
                            </v-card-item>
                            <v-card-text>
                                <div class="metric-row">
                                    <span>Reference entities</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.rawOneHop.entityCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Reference events</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.rawOneHop.eventCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Reference relationships</span>
                                    <strong>{{
                                        formatNumber(
                                            enrichmentComparison.rawOneHop.relationshipCount
                                        )
                                    }}</strong>
                                </div>
                                <div class="text-caption text-medium-emphasis mt-2">
                                    Audit/reference counts show uncapped one-hop neighborhood scale.
                                    In-product cards use curated one-hop counts for readability.
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
                <v-card class="mt-3">
                    <v-card-item>
                        <v-card-title class="text-body-2">
                            Why the curated layer exists
                        </v-card-title>
                        <template #append>
                            <v-btn
                                size="small"
                                variant="tonal"
                                color="primary"
                                prepend-icon="mdi-robot-outline"
                                :loading="agentLoading"
                                @click="requestCurationRecommendations"
                            >
                                Agent Recommendation Mode
                            </v-btn>
                        </template>
                        <v-card-subtitle>
                            The app uses a curated 1-hop graph in-product. The audit/reference
                            counts show full one-hop scale from the quad audit and can be much
                            larger than curated in-product counts.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text>
                        <div class="text-caption text-medium-emphasis mb-2">
                            Key document entities to ask questions about:
                        </div>
                        <div class="d-flex flex-wrap ga-2">
                            <v-chip
                                v-for="entity in keyQuestionEntities"
                                :key="entity.neid"
                                size="small"
                                variant="tonal"
                                color="primary"
                                class="app-chip-button"
                                @click="selectEntity(entity.neid)"
                            >
                                {{ entity.name }}
                            </v-chip>
                        </div>
                        <v-alert class="mt-3" type="info" variant="tonal" density="compact">
                            This mode asks the deployed agent to critique the current curation
                            rules. It does not change rebuild output automatically.
                        </v-alert>
                        <v-card v-if="agentResult?.output" class="mt-3" variant="outlined">
                            <v-card-item>
                                <v-card-title class="text-body-2">
                                    Agent curation suggestions
                                </v-card-title>
                                <v-card-subtitle>
                                    Review these suggestions before changing the deterministic
                                    allowlist/blocklist rules.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text>
                                <div
                                    v-if="structuredAgentSections.length"
                                    class="d-flex flex-column ga-3"
                                >
                                    <div
                                        v-for="section in structuredAgentSections"
                                        :key="section.key"
                                    >
                                        <div class="text-caption text-medium-emphasis mb-1">
                                            {{ section.label }}
                                        </div>
                                        <div class="d-flex flex-column ga-1">
                                            <div
                                                v-for="item in section.items"
                                                :key="`${section.key}:${item}`"
                                                class="text-body-2"
                                            >
                                                {{ item }}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-else class="agent-output text-body-2">
                                    {{ agentResult.output }}
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-card-text>
                </v-card>
            </v-window-item>

            <v-window-item value="graph">
                <v-alert type="info" variant="tonal" class="mb-2">
                    Curated one-hop graph view. Default mode is clustered/simplified to keep the
                    expanded context readable.
                </v-alert>
                <GraphWorkspace
                    :entities-override="enrichmentExpandedGraphEntities"
                    :relationships-override="enrichmentExpandedGraphRelationships"
                    :initial-analysis-mode="'simplified'"
                />
            </v-window-item>

            <v-window-item value="lineage">
                <v-alert v-if="lineageInsights.length === 0" type="info" variant="tonal">
                    No lineage insights found in the curated one-hop graph.
                </v-alert>
                <div v-else class="d-flex flex-column ga-3">
                    <v-card v-for="insight in lineageInsights" :key="insight.id">
                        <v-card-item>
                            <v-card-title class="text-body-2">{{ insight.title }}</v-card-title>
                            <v-card-subtitle>{{ insight.subtitle }}</v-card-subtitle>
                        </v-card-item>
                        <v-card-text>
                            <div class="text-body-2 mb-2">{{ insight.plainSummary }}</div>
                            <div class="d-flex flex-wrap ga-1">
                                <v-chip
                                    v-for="line in insight.evidence.slice(0, 3)"
                                    :key="`${insight.id}:${line}`"
                                    size="x-small"
                                    variant="tonal"
                                    color="primary"
                                >
                                    {{ line }}
                                </v-chip>
                            </div>
                        </v-card-text>
                    </v-card>
                </div>
            </v-window-item>

            <v-window-item value="press">
                <v-alert
                    v-if="enrichmentNewsLoading || enrichmentEconomicLoading"
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    Loading related press context...
                </v-alert>
                <v-alert v-else-if="enrichmentNewsError" type="error" variant="tonal" class="mb-3">
                    {{ enrichmentNewsError }}
                </v-alert>
                <v-alert
                    v-else-if="!enrichmentNews.length"
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    No related press/news items found for enriched entities.
                </v-alert>
                <div v-else class="d-flex flex-column ga-3">
                    <v-card v-for="group in enrichmentNews.slice(0, 6)" :key="group.anchorNeid">
                        <v-card-item>
                            <v-card-title class="text-body-2">
                                {{ resolveEntityName(group.anchorNeid) }}
                            </v-card-title>
                            <v-card-subtitle>
                                {{ group.items.length }} related press/event items
                            </v-card-subtitle>
                        </v-card-item>
                        <v-card-text class="d-flex flex-column ga-2">
                            <v-card
                                v-for="item in group.items.slice(0, 4)"
                                :key="item.eventNeid"
                                variant="outlined"
                            >
                                <v-card-item>
                                    <v-card-title class="text-body-2">{{
                                        item.title
                                    }}</v-card-title>
                                    <v-card-subtitle>
                                        {{ item.date || 'Date unavailable' }}
                                        <span v-if="item.category"> • {{ item.category }}</span>
                                    </v-card-subtitle>
                                </v-card-item>
                                <v-card-text class="text-body-2">
                                    {{ truncate(item.description || 'No summary available.', 240) }}
                                </v-card-text>
                            </v-card>
                        </v-card-text>
                    </v-card>
                </div>
            </v-window-item>

            <v-window-item value="deals">
                <v-alert
                    v-if="enrichmentRelatedDealsLoading"
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    Loading Jersey City related deals and CUSIP context...
                </v-alert>
                <v-alert
                    v-else-if="enrichmentRelatedDealsError"
                    type="error"
                    variant="tonal"
                    class="mb-3"
                >
                    {{ enrichmentRelatedDealsError }}
                </v-alert>
                <v-alert
                    v-else-if="!enrichmentRelatedDeals.length"
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    No Jersey City-related deal context was surfaced from current enrichment
                    anchors.
                </v-alert>
                <div v-else class="d-flex flex-column ga-3">
                    <v-card v-for="deal in enrichmentRelatedDeals" :key="deal.id">
                        <v-card-item>
                            <v-card-title class="text-body-2">{{ deal.title }}</v-card-title>
                            <v-card-subtitle>
                                {{ deal.eventCount }} relevant events
                            </v-card-subtitle>
                        </v-card-item>
                        <v-card-text>
                            <div class="text-body-2 mb-2">{{ deal.summary }}</div>
                            <div v-if="deal.relatedCusips.length" class="mb-2">
                                <div class="text-caption text-medium-emphasis mb-1">
                                    Candidate CUSIPs
                                </div>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip
                                        v-for="cusip in deal.relatedCusips"
                                        :key="`${deal.id}:${cusip}`"
                                        size="x-small"
                                        variant="tonal"
                                        color="info"
                                    >
                                        {{ cusip }}
                                    </v-chip>
                                </div>
                            </div>
                            <div class="text-caption text-medium-emphasis">
                                <div v-for="line in deal.evidence.slice(0, 3)" :key="line">
                                    {{ line }}
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </div>
            </v-window-item>
        </v-window>
    </div>
</template>

<script setup lang="ts">
    const {
        selectEntity,
        resolveEntityName,
        enrichmentComparison,
        keyQuestionEntities,
        agentLoading,
        agentResult,
        runAgentAction,
        enrichmentExpandedGraphEntities,
        enrichmentExpandedGraphRelationships,
        lineageInsights,
        enrichmentNews,
        enrichmentNewsLoading,
        enrichmentNewsError,
        enrichmentEconomicLoading,
        enrichmentRelatedDeals,
        enrichmentRelatedDealsLoading,
        enrichmentRelatedDealsError,
    } = useCollectionWorkspace();

    const activeSubtab = ref<'comparison' | 'graph' | 'lineage' | 'press' | 'deals'>('comparison');
    const structuredAgentSections = computed(() => {
        const output = agentResult.value?.output?.trim();
        if (!output) return [] as Array<{ key: string; label: string; items: string[] }>;

        const desiredSections = [
            { key: 'keep', label: 'Keep' },
            { key: 'consider adding', label: 'Consider adding' },
            { key: 'consider removing', label: 'Consider removing' },
            { key: 'why', label: 'Why' },
        ];

        const normalizedLines = output
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        const sectionMap = new Map<string, string[]>();
        let activeKey: string | null = null;

        for (const line of normalizedLines) {
            const matchedSection = desiredSections.find((section) =>
                line.toLowerCase().startsWith(section.key)
            );
            if (matchedSection) {
                activeKey = matchedSection.key;
                if (!sectionMap.has(activeKey)) sectionMap.set(activeKey, []);
                const remainder = line
                    .slice(matchedSection.key.length)
                    .replace(/^[:\-]\s*/, '')
                    .trim();
                if (remainder) sectionMap.get(activeKey)?.push(remainder);
                continue;
            }

            const cleaned = line.replace(/^[-*]\s*/, '').trim();
            if (!cleaned) continue;
            if (!activeKey) continue;
            sectionMap.get(activeKey)?.push(cleaned);
        }

        return desiredSections
            .map((section) => ({
                key: section.key,
                label: section.label,
                items: sectionMap.get(section.key) ?? [],
            }))
            .filter((section) => section.items.length > 0);
    });

    function truncate(text: string, max: number): string {
        return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
    }

    function formatNumber(value: number): string {
        return value.toLocaleString();
    }

    async function requestCurationRecommendations() {
        const prompt = [
            'Review the current curated one-hop enrichment strategy for this collection.',
            `Document graph counts: ${enrichmentComparison.value.document.entityCount} entities, ${enrichmentComparison.value.document.eventCount} events, ${enrichmentComparison.value.document.relationshipCount} relationships.`,
            `Raw one-hop counts: ${enrichmentComparison.value.rawOneHop.entityCount} entities, ${enrichmentComparison.value.rawOneHop.eventCount} events, ${enrichmentComparison.value.rawOneHop.relationshipCount} relationships.`,
            `Current curated additions: ${enrichmentComparison.value.netAdditions.entityCount} entities, ${enrichmentComparison.value.netAdditions.eventCount} events, ${enrichmentComparison.value.netAdditions.relationshipCount} relationships.`,
            `Key document entities: ${keyQuestionEntities.value.map((entity) => entity.name).join(', ') || 'none'}.`,
            'Recommend specific include/exclude adjustments to node flavors or relationship types that would improve analyst value.',
            'Do not recommend automatically changing the graph. Separate your answer into: keep, consider adding, consider removing, and why.',
        ].join(' ');
        await runAgentAction('recommend_curation_adjustments', { question: prompt });
    }
</script>

<style scoped>
    .enrichment-layout {
        width: min(1180px, 100%);
        margin: 0 auto;
    }

    .metric-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
    }

    .agent-output {
        white-space: pre-wrap;
        line-height: 1.6;
    }
</style>
