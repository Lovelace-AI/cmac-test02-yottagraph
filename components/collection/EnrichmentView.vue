<template>
    <div class="enrichment-layout d-flex flex-column ga-3">
        <v-tabs v-model="activeSubtab" density="compact" color="primary" class="mb-1">
            <v-tab value="comparison">
                <v-icon start size="small">mdi-scale-balance</v-icon>
                Enriched Graph
            </v-tab>
            <v-tab value="graph">
                <v-icon start size="small">mdi-graph-outline</v-icon>
                Graph
            </v-tab>
            <v-tab value="lineage">
                <v-icon start size="small">mdi-source-branch</v-icon>
                Corporate Lineage
            </v-tab>
            <v-tab value="news">
                <v-icon start size="small">mdi-newspaper</v-icon>
                News
            </v-tab>
            <v-tab value="press">
                <v-icon start size="small">mdi-newspaper-variant-outline</v-icon>
                Recent Coverage
            </v-tab>
            <v-tab value="deals">
                <v-icon start size="small">mdi-bank-transfer</v-icon>
                Jersey City Deals
            </v-tab>
        </v-tabs>

        <v-window v-model="activeSubtab">
            <v-window-item value="comparison">
                <v-row>
                    <v-col cols="12" md="6">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2">Document Truth</v-card-title>
                            </v-card-item>
                            <v-card-text>
                                <div class="metric-row">
                                    <span>Entities</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.documentTruth.entityCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Events</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.documentTruth.eventCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Relationships</span>
                                    <strong>{{
                                        formatNumber(
                                            enrichmentComparison.documentTruth.relationshipCount
                                        )
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Associated properties</span>
                                    <strong>{{
                                        formatNumber(
                                            enrichmentComparison.documentTruth.propertyCount
                                        )
                                    }}</strong>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2">KG 1-Hop Reach</v-card-title>
                                <v-card-subtitle>
                                    Total connections from document entities in the knowledge graph
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text>
                                <div class="metric-row">
                                    <span>Connected entities</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.kgOneHop.entityCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Connected events</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.kgOneHop.eventCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Relationship connections</span>
                                    <strong>{{
                                        formatNumber(
                                            enrichmentComparison.kgOneHop.relationshipCount
                                        )
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Properties</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.kgOneHop.propertyCount)
                                    }}</strong>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
                <v-row class="mt-1">
                    <v-col cols="12">
                        <v-alert
                            v-if="
                                meta.enrichmentTruncated?.entities ||
                                meta.enrichmentTruncated?.relationships ||
                                meta.enrichmentTruncated?.events ||
                                meta.enrichmentTruncated?.eventHubs
                            "
                            type="warning"
                            variant="tonal"
                            density="comfortable"
                            class="mb-3"
                        >
                            Raw enrichment counts are lower bounds because expansion hit configured
                            caps (entities
                            {{ formatNumber(meta.enrichmentCaps?.maxEntities ?? 0) }}, relationships
                            {{ formatNumber(meta.enrichmentCaps?.maxRelationships ?? 0) }}, events
                            {{ formatNumber(meta.enrichmentCaps?.maxEvents ?? 0) }}).
                        </v-alert>
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2">
                                    Top Connected Extracted Entities
                                </v-card-title>
                                <v-card-subtitle>
                                    Ranked by total relationships and events in the knowledge graph.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text>
                                <v-alert
                                    v-if="!topConnectedExtractedEntities.length"
                                    type="info"
                                    variant="tonal"
                                    density="comfortable"
                                >
                                    No linked extracted entities were found yet.
                                </v-alert>
                                <div v-else class="d-flex flex-wrap ga-2">
                                    <v-chip
                                        v-for="entity in topConnectedExtractedEntities"
                                        :key="`top-connected:${entity.neid}`"
                                        size="small"
                                        variant="tonal"
                                    >
                                        {{ entity.name }}
                                        <span class="text-medium-emphasis ml-1">
                                            ({{ formatFlavor(entity.flavor) }} ·
                                            {{ entity.relationshipCount }} rels ·
                                            {{ entity.eventCount }} events)
                                        </span>
                                    </v-chip>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-window-item>

            <v-window-item value="graph">
                <v-alert type="info" variant="tonal" class="mb-2">
                    Graph view shows the full curated 1-degree neighborhood for document entities
                    and related events without the collapsed simplified default.
                </v-alert>
                <GraphWorkspace
                    :entities-override="enrichmentGraphEntities"
                    :relationships-override="enrichmentGraphRelationships"
                    :initial-analysis-mode="'enrichment_cluster'"
                />
            </v-window-item>

            <v-window-item value="lineage">
                <v-alert
                    v-if="lineageInsights.length === 0 && !enrichmentLanguageLoading"
                    type="info"
                    variant="tonal"
                >
                    No lineage insights found in the curated one-hop graph.
                </v-alert>
                <LineageResultList
                    v-else
                    :results="lineageResults"
                    :loading="enrichmentLanguageLoading"
                />
            </v-window-item>

            <v-window-item value="news">
                <NewsSection
                    title="Filtered Financial and Legal News"
                    subtitle="Articles connected by NEID via appears_in, filtered to solvency, legal, and transaction-focused event categories."
                    class="mb-3"
                >
                    <template #filters>
                        <FilterChipBar
                            v-model="selectedNewsCategories"
                            :options="filteredNewsCategories"
                        />
                    </template>
                </NewsSection>
                <v-alert v-if="filteredNewsLoading" type="info" variant="tonal" class="mb-3">
                    Loading filtered NEID-linked news...
                </v-alert>
                <v-alert v-else-if="filteredNewsError" type="error" variant="tonal" class="mb-3">
                    {{ filteredNewsError }}
                </v-alert>
                <v-alert v-else-if="!filteredNews.length" type="info" variant="tonal" class="mb-3">
                    No category-matched news was found for the selected document-graph anchors.
                </v-alert>
                <div v-else class="d-flex flex-column ga-3">
                    <section
                        v-for="group in filteredNews.slice(0, 8)"
                        :key="`news:${group.anchorNeid}`"
                        class="news-group-block"
                    >
                        <NewsGroupHeader
                            :title="resolveEntityName(group.anchorNeid)"
                            :count-label="`${group.items.length} filtered articles`"
                        />
                        <div class="news-items">
                            <NewsArticleItem
                                v-for="item in group.items.slice(0, 6)"
                                :key="`news-item:${group.anchorNeid}:${item.articleNeid}`"
                                :item="item"
                                :category-label="primaryTopic(item.topics)"
                                grouped
                                compact
                                :fallback-entity-name="resolveEntityName(group.anchorNeid)"
                            />
                        </div>
                    </section>
                </div>
            </v-window-item>

            <v-window-item value="press">
                <v-card v-if="strictProjectLocationEntities.length" class="mb-3" variant="outlined">
                    <v-card-item>
                        <v-card-title class="text-body-2"> Verified Project Location </v-card-title>
                        <v-card-subtitle>
                            Project-tied location entities found in the current graph.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text>
                        <div class="d-flex flex-wrap ga-2">
                            <v-chip
                                v-for="location in strictProjectLocationEntities"
                                :key="location.neid"
                                size="small"
                                variant="tonal"
                                color="secondary"
                            >
                                {{ location.name }}
                            </v-chip>
                        </div>
                        <div class="text-caption text-medium-emphasis mt-3">
                            No street-level address is shown unless the graph ties it directly to
                            the Presidential Plaza project.
                        </div>
                    </v-card-text>
                </v-card>
                <v-alert
                    v-if="enrichmentNewsLoading || enrichmentEconomicLoading"
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    Loading recent MCP article coverage...
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
                    No recent MCP article coverage was found for the selected document-graph
                    entities.
                </v-alert>
                <div v-else class="d-flex flex-column ga-3">
                    <section
                        v-for="group in enrichmentNews.slice(0, 6)"
                        :key="group.anchorNeid"
                        class="news-group-block"
                    >
                        <NewsGroupHeader
                            :title="resolveEntityName(group.anchorNeid)"
                            :count-label="`${group.items.length} recent articles`"
                        />
                        <div class="news-items">
                            <NewsArticleItem
                                v-for="item in group.items.slice(0, 4)"
                                :key="item.articleNeid"
                                :item="item"
                                grouped
                                :fallback-entity-name="resolveEntityName(group.anchorNeid)"
                            />
                        </div>
                    </section>
                </div>
            </v-window-item>

            <v-window-item value="deals">
                <v-alert
                    v-if="enrichmentRelatedDealsLoading"
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    Loading Jersey City deal coverage...
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
                    No Jersey City-related deal coverage was surfaced from the current
                    document-graph anchors.
                </v-alert>
                <div v-else class="d-flex flex-column ga-3">
                    <v-card v-for="deal in enrichmentRelatedDeals" :key="deal.id">
                        <v-card-item>
                            <v-card-title class="text-body-2">{{ deal.title }}</v-card-title>
                            <v-card-subtitle>
                                {{ deal.articleCount }} relevant articles
                            </v-card-subtitle>
                        </v-card-item>
                        <v-card-text>
                            <div class="text-body-2 mb-2">{{ deal.summary }}</div>
                            <div v-if="deal.articles.length" class="d-flex flex-column ga-2 mb-2">
                                <v-card
                                    v-for="article in deal.articles"
                                    :key="`${deal.id}:${article.articleNeid}`"
                                    variant="outlined"
                                >
                                    <v-card-item>
                                        <template #append>
                                            <v-btn
                                                v-if="article.url"
                                                size="x-small"
                                                variant="text"
                                                color="primary"
                                                :href="article.url"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                icon="mdi-open-in-new"
                                            />
                                        </template>
                                        <v-card-title class="text-body-2">
                                            {{
                                                article.title ||
                                                article.urlHost ||
                                                'Headline unavailable'
                                            }}
                                        </v-card-title>
                                        <v-card-subtitle>
                                            {{ article.sourceName || article.urlHost || '' }}
                                        </v-card-subtitle>
                                    </v-card-item>
                                    <v-card-text class="pt-0">
                                        <div class="d-flex flex-wrap ga-1">
                                            <v-chip
                                                v-if="article.sentiment != null"
                                                size="x-small"
                                                variant="tonal"
                                                color="info"
                                            >
                                                sentiment {{ formatSentiment(article.sentiment) }}
                                            </v-chip>
                                            <v-chip
                                                v-if="article.urlHost"
                                                size="x-small"
                                                variant="tonal"
                                                color="primary"
                                            >
                                                {{ article.urlHost }}
                                            </v-chip>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </div>
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
        meta,
        resolveEntityName,
        enrichmentComparison,
        enrichmentGraphEntities,
        enrichmentGraphRelationships,
        lineageInsights,
        lineageResults,
        enrichmentLanguageLoading,
        enrichmentNews,
        enrichmentNewsLoading,
        enrichmentNewsError,
        filteredNews,
        filteredNewsCategories,
        filteredNewsLoading,
        filteredNewsError,
        enrichmentEconomicLoading,
        enrichmentRelatedDeals,
        enrichmentRelatedDealsLoading,
        enrichmentRelatedDealsError,
        loadFilteredNews,
        topConnectedExtractedEntities,
        strictProjectLocationEntities,
    } = useCollectionWorkspace();

    const activeSubtab = ref<'comparison' | 'graph' | 'lineage' | 'news' | 'press' | 'deals'>(
        'comparison'
    );
    const selectedNewsCategories = ref<string[]>([]);

    watch(
        filteredNewsCategories,
        (categories) => {
            if (!categories.length) return;
            if (selectedNewsCategories.value.length) return;
            selectedNewsCategories.value = categories.slice();
        },
        { immediate: true }
    );

    watch(
        selectedNewsCategories,
        async (categories) => {
            if (!filteredNewsCategories.value.length) return;
            await loadFilteredNews(categories);
        },
        { deep: true }
    );

    function formatNumber(value: number): string {
        return value.toLocaleString();
    }

    function formatFlavor(value: string): string {
        return value
            .replace(/^schema::flavor::/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function formatSentiment(value: number): string {
        return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
    }

    function primaryTopic(topics: string[]): string | undefined {
        return topics.find((topic) => topic.trim().length > 0);
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
        gap: 16px;
        margin-bottom: 6px;
    }

    .news-items :deep(.news-article-item:last-child) {
        border-bottom: 0;
    }

    .news-group-block {
        border: 1px solid var(--app-divider);
        border-radius: 12px;
        background: color-mix(in srgb, var(--dynamic-surface) 94%, var(--dynamic-background) 6%);
        padding: 10px 12px 4px;
    }
</style>
