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
                    <v-col cols="12" md="4">
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
                    <v-col cols="12" md="4">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2"
                                    >Enriched by 1 Degree</v-card-title
                                >
                                <v-card-subtitle>Total raw 1-hop results</v-card-subtitle>
                            </v-card-item>
                            <v-card-text>
                                <div class="metric-row">
                                    <span>Reference entities</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.raw1Degree.entityCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Reference events</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.raw1Degree.eventCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Reference relationships</span>
                                    <strong>{{
                                        formatNumber(
                                            enrichmentComparison.raw1Degree.relationshipCount
                                        )
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Properties</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.raw1Degree.propertyCount)
                                    }}</strong>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2"
                                    >Enriched by 2 Degrees</v-card-title
                                >
                                <v-card-subtitle>Total raw 2-hop results</v-card-subtitle>
                            </v-card-item>
                            <v-card-text>
                                <div class="metric-row">
                                    <span>Reference entities</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.raw2Degrees.entityCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Reference events</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.raw2Degrees.eventCount)
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Reference relationships</span>
                                    <strong>{{
                                        formatNumber(
                                            enrichmentComparison.raw2Degrees.relationshipCount
                                        )
                                    }}</strong>
                                </div>
                                <div class="metric-row">
                                    <span>Properties</span>
                                    <strong>{{
                                        formatNumber(enrichmentComparison.raw2Degrees.propertyCount)
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
                                    Ranked by document-linked connections in the extracted graph.
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
                                            {{ entity.linkedEntityCount }} links ·
                                            {{ entity.relationshipCount }} rels ·
                                            {{ entity.eventCount }} events)
                                        </span>
                                    </v-chip>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
                <v-row class="mt-1">
                    <v-col cols="12">
                        <v-alert type="info" variant="tonal" density="comfortable" class="mb-2">
                            These groups are a subset: extracted entities that currently have at
                            least one enrichment link in the graph.
                        </v-alert>
                    </v-col>
                    <v-col
                        v-for="group in enrichableExtractedEntityGroups"
                        :key="group.key"
                        cols="12"
                        md="6"
                    >
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2">
                                    {{ group.label }}
                                </v-card-title>
                                <v-card-subtitle>
                                    {{ group.entities.length }} linked extracted entities
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text>
                                <div v-if="group.entities.length" class="d-flex flex-wrap ga-2">
                                    <v-chip
                                        v-for="entity in group.entities"
                                        :key="entity.neid"
                                        size="small"
                                        variant="tonal"
                                    >
                                        {{ entity.name }}
                                    </v-chip>
                                </div>
                                <div v-else class="text-body-2 text-medium-emphasis">
                                    No linked extracted entities for this type.
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

            <v-window-item value="news">
                <v-card class="mb-3" variant="outlined">
                    <v-card-item>
                        <v-card-title class="text-body-2">
                            Filtered Financial and Legal News
                        </v-card-title>
                        <v-card-subtitle>
                            Articles connected by NEID via <code>appears_in</code>, filtered to
                            solvency, legal, and transaction-focused event categories.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text>
                        <v-chip-group v-model="selectedNewsCategories" multiple column>
                            <v-chip
                                v-for="category in filteredNewsCategories"
                                :key="`news-category:${category}`"
                                size="small"
                                filter
                                variant="tonal"
                                :color="categoryColor(category)"
                            >
                                {{ category }}
                            </v-chip>
                        </v-chip-group>
                    </v-card-text>
                </v-card>
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
                    <v-card
                        v-for="group in filteredNews.slice(0, 8)"
                        :key="`news:${group.anchorNeid}`"
                    >
                        <v-card-item>
                            <v-card-title class="text-body-2">
                                {{ resolveEntityName(group.anchorNeid) }}
                            </v-card-title>
                            <v-card-subtitle>
                                {{ group.items.length }} filtered articles
                            </v-card-subtitle>
                        </v-card-item>
                        <v-card-text class="d-flex flex-column ga-2">
                            <v-card
                                v-for="item in group.items.slice(0, 6)"
                                :key="`news-item:${group.anchorNeid}:${item.articleNeid}`"
                                variant="outlined"
                            >
                                <v-card-item>
                                    <template #append>
                                        <v-btn
                                            v-if="item.url"
                                            size="x-small"
                                            variant="text"
                                            color="primary"
                                            :href="item.url"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            icon="mdi-open-in-new"
                                        />
                                    </template>
                                    <v-card-title class="text-body-2">
                                        {{ item.title || item.urlHost || 'Headline unavailable' }}
                                    </v-card-title>
                                    <v-card-subtitle>
                                        {{ formatArticleMeta(item) }}
                                    </v-card-subtitle>
                                </v-card-item>
                                <v-card-text class="pt-0">
                                    <div class="text-body-2">
                                        {{
                                            truncate(
                                                item.description ||
                                                    (item.url
                                                        ? 'Open the linked article to review the exact source text.'
                                                        : 'No article summary available.'),
                                                240
                                            )
                                        }}
                                    </div>
                                    <div class="d-flex flex-wrap ga-1 mt-2">
                                        <v-chip
                                            v-if="item.sentiment != null"
                                            size="x-small"
                                            variant="tonal"
                                            color="info"
                                        >
                                            sentiment {{ formatSentiment(item.sentiment) }}
                                        </v-chip>
                                        <v-chip
                                            v-for="topic in item.topics"
                                            :key="`topic:${item.articleNeid}:${topic}`"
                                            size="x-small"
                                            variant="tonal"
                                            :color="categoryColor(topic)"
                                        >
                                            {{ topic }}
                                        </v-chip>
                                        <v-chip
                                            v-if="item.urlHost"
                                            size="x-small"
                                            variant="tonal"
                                            color="primary"
                                        >
                                            {{ item.urlHost }}
                                        </v-chip>
                                    </div>
                                </v-card-text>
                            </v-card>
                        </v-card-text>
                    </v-card>
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
                    <v-card v-for="group in enrichmentNews.slice(0, 6)" :key="group.anchorNeid">
                        <v-card-item>
                            <v-card-title class="text-body-2">
                                {{ resolveEntityName(group.anchorNeid) }}
                            </v-card-title>
                            <v-card-subtitle>
                                {{ group.items.length }} recent articles
                            </v-card-subtitle>
                        </v-card-item>
                        <v-card-text class="d-flex flex-column ga-2">
                            <v-card
                                v-for="item in group.items.slice(0, 4)"
                                :key="item.articleNeid"
                                variant="outlined"
                            >
                                <v-card-item>
                                    <template #append>
                                        <v-btn
                                            v-if="item.url"
                                            size="x-small"
                                            variant="text"
                                            color="primary"
                                            :href="item.url"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            icon="mdi-open-in-new"
                                        />
                                    </template>
                                    <v-card-title class="text-body-2">
                                        {{ item.title || item.urlHost || 'Headline unavailable' }}
                                    </v-card-title>
                                    <v-card-subtitle>
                                        {{ formatArticleMeta(item) }}
                                    </v-card-subtitle>
                                </v-card-item>
                                <v-card-text class="text-body-2">
                                    {{
                                        truncate(
                                            item.description ||
                                                (item.url
                                                    ? 'Open the linked article to review the exact source text.'
                                                    : 'No article summary available.'),
                                            260
                                        )
                                    }}
                                    <div class="d-flex flex-wrap ga-1 mt-2">
                                        <v-chip
                                            v-if="item.sentiment != null"
                                            size="x-small"
                                            variant="tonal"
                                            color="info"
                                        >
                                            sentiment {{ formatSentiment(item.sentiment) }}
                                        </v-chip>
                                        <v-chip
                                            v-if="item.url"
                                            size="x-small"
                                            variant="tonal"
                                            color="primary"
                                        >
                                            {{ item.urlHost || 'linked article' }}
                                        </v-chip>
                                    </div>
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
        enrichableExtractedEntityGroups,
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

    function truncate(text: string, max: number): string {
        return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
    }

    function formatNumber(value: number): string {
        return value.toLocaleString();
    }

    function formatConfidence(value: number): string {
        return value >= 0 && value <= 1 ? `${Math.round(value * 100)}%` : value.toFixed(2);
    }

    function formatSentiment(value: number): string {
        return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
    }

    function formatFlavor(value: string): string {
        return value
            .replace(/^schema::flavor::/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function formatArticleMeta(item: {
        date?: string;
        sourceName?: string;
        confidence?: number | null;
    }): string {
        const parts: string[] = [];
        if (item.date) parts.push(item.date);
        if (item.sourceName) parts.push(item.sourceName);
        if (item.confidence != null) parts.push(`confidence ${formatConfidence(item.confidence)}`);
        return parts.join(' • ');
    }

    function categoryColor(category: string): string {
        const key = category.toLowerCase();
        if (
            key.includes('bankruptcy') ||
            key.includes('default') ||
            key.includes('insolvency') ||
            key.includes('hostile takeover') ||
            key.includes('legal judgement') ||
            key.includes('expropriation') ||
            key.includes('seizure')
        ) {
            return 'error';
        }
        if (
            key.includes('merger') ||
            key.includes('acquisition') ||
            key.includes('credit rating') ||
            key.includes('insider trading') ||
            key.includes('cybersecurity') ||
            key.includes('layoff')
        ) {
            return 'warning';
        }
        return 'info';
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
</style>
