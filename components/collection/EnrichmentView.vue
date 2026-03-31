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
                        <v-card class="world-graph-shell" variant="outlined">
                            <v-card-item>
                                <v-card-title class="text-body-1">
                                    What The World Graph Adds
                                </v-card-title>
                                <v-card-subtitle>
                                    These signals are not explicitly extracted from your source
                                    documents. They are revealed by linking extracted entities to
                                    1-hop external reference, market, regulatory, and risk context.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text class="pt-1">
                                <v-row>
                                    <v-col
                                        v-for="card in worldGraphCards"
                                        :key="card.id"
                                        cols="12"
                                        md="6"
                                        lg="4"
                                        class="d-flex"
                                    >
                                        <v-card class="world-graph-card flex-grow-1" variant="flat">
                                            <v-card-item>
                                                <template #prepend>
                                                    <v-avatar
                                                        :color="card.color"
                                                        variant="tonal"
                                                        size="30"
                                                    >
                                                        <v-icon size="16">{{ card.icon }}</v-icon>
                                                    </v-avatar>
                                                </template>
                                                <v-card-title class="text-body-2">
                                                    {{ card.title }}
                                                </v-card-title>
                                                <v-card-subtitle>{{
                                                    card.subtitle
                                                }}</v-card-subtitle>
                                            </v-card-item>
                                            <v-card-text class="pt-0">
                                                <div class="text-body-2 mb-2">
                                                    {{ card.summary }}
                                                </div>
                                                <div
                                                    class="d-flex align-center justify-space-between ga-2 mb-2"
                                                >
                                                    <span class="text-caption text-medium-emphasis">
                                                        {{ card.statLabel }}
                                                    </span>
                                                    <v-chip
                                                        size="x-small"
                                                        variant="tonal"
                                                        :color="card.color"
                                                    >
                                                        {{ card.statValue }}
                                                    </v-chip>
                                                </div>
                                                <div class="d-flex flex-wrap ga-1 mb-2">
                                                    <v-chip
                                                        v-for="evidence in card.evidence.slice(
                                                            0,
                                                            3
                                                        )"
                                                        :key="`${card.id}:${evidence}`"
                                                        size="x-small"
                                                        variant="outlined"
                                                    >
                                                        {{ evidence }}
                                                    </v-chip>
                                                </div>
                                                <div class="text-caption text-medium-emphasis mb-2">
                                                    {{ card.mapping }}
                                                </div>
                                                <v-btn
                                                    size="x-small"
                                                    variant="text"
                                                    color="primary"
                                                    prepend-icon="mdi-robot-outline"
                                                    @click="emit('open-chat', card.askPrompt)"
                                                >
                                                    Ask Yotta
                                                </v-btn>
                                            </v-card-text>
                                        </v-card>
                                    </v-col>
                                </v-row>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-window-item>

            <v-window-item value="graph">
                <GraphWorkspace
                    :entities-override="enrichmentGraphEntities"
                    :relationships-override="enrichmentGraphRelationships"
                    :initial-analysis-mode="'enrichment_cluster'"
                />
            </v-window-item>

            <v-window-item value="lineage">
                <v-alert
                    v-if="lineageInvestigation.status === 'error'"
                    type="error"
                    variant="tonal"
                >
                    {{ lineageInvestigation.error || 'Lineage investigation failed.' }}
                </v-alert>
                <v-card
                    v-else-if="lineageInvestigation.status === 'running'"
                    variant="flat"
                    rounded="lg"
                >
                    <v-card-text class="py-4">
                        <div class="text-body-2 mb-2">
                            Investigating relationship-backed corporate lineage...
                        </div>
                        <v-progress-linear indeterminate color="primary" rounded />
                        <div class="text-caption text-medium-emphasis mt-2">
                            Scanning schema relationship types and crawling organization transitions
                            from document-rooted entities.
                        </div>
                    </v-card-text>
                </v-card>
                <v-alert
                    v-else-if="
                        lineageInvestigation.status === 'ready' && lineageResults.length === 0
                    "
                    type="info"
                    variant="tonal"
                >
                    No relationship-backed corporate lineage was found for document-rooted
                    organizations.
                </v-alert>
                <LineageResultList
                    v-else
                    :results="lineageResults"
                    :loading="lineageInvestigation.status === 'running'"
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
                            :loading="filteredNewsLoading || filteredNewsRefreshing"
                        />
                    </template>
                </NewsSection>
                <v-alert
                    v-if="filteredNewsError && sortedDedupedNews.length === 0"
                    type="error"
                    variant="tonal"
                    class="mb-3"
                >
                    {{ filteredNewsError }}
                </v-alert>
                <v-alert
                    v-else-if="filteredNewsError && sortedDedupedNews.length > 0"
                    type="warning"
                    variant="tonal"
                    density="comfortable"
                    class="mb-3"
                >
                    {{ filteredNewsError }} Showing most recent loaded results.
                </v-alert>
                <DedupedArticleList
                    :articles="sortedDedupedNews"
                    :loading="newsInitialLoading"
                    :refreshing="filteredNewsRefreshing"
                    :sort-mode="newsSortMode"
                    :view-mode="newsViewMode"
                    @update:sort-mode="newsSortMode = $event"
                    @update:view-mode="newsViewMode = $event"
                    @topic-click="applyTopicFilter"
                />
            </v-window-item>
        </v-window>
    </div>
</template>

<script setup lang="ts">
    interface WorldGraphCard {
        id: 'ownership' | 'governance' | 'market_identity' | 'regulatory' | 'risk_compliance';
        title: string;
        subtitle: string;
        icon: string;
        color: string;
        summary: string;
        statLabel: string;
        statValue: string;
        evidence: string[];
        mapping: string;
        askPrompt: string;
    }

    const emit = defineEmits<{
        (e: 'open-chat', prompt: string): void;
    }>();

    const {
        meta,
        entities,
        events,
        relationships,
        resolveEntityName,
        enrichmentComparison,
        enrichmentGraphEntities,
        enrichmentGraphRelationships,
        lineageResults,
        lineageInvestigation,
        peopleAffiliationInsights,
        filteredNewsCategories,
        filteredNewsLoading,
        filteredNewsRefreshing,
        filteredNewsInitialized,
        filteredNewsError,
        dedupedFilteredNewsArticles,
        loadFilteredNews,
        sortDedupedNewsArticles,
    } = useCollectionWorkspace();

    const activeSubtab = ref<'comparison' | 'graph' | 'lineage' | 'news'>('comparison');
    const selectedNewsCategories = ref<string[]>([]);
    const newsSortMode = ref<
        'strongest_graph_connection' | 'most_graph_entities' | 'most_recent' | 'highest_relevance'
    >('strongest_graph_connection');
    const newsViewMode = ref<'deduped' | 'grouped'>('deduped');

    const sortedDedupedNews = computed(() =>
        sortDedupedNewsArticles(dedupedFilteredNewsArticles.value, newsSortMode.value)
    );
    const normalizedRelationships = computed(() =>
        relationships.value.map((relationship) => ({
            ...relationship,
            normalizedType: String(relationship.type ?? '')
                .toLowerCase()
                .replace(/^schema::relationship::/, '')
                .trim(),
        }))
    );
    const ownershipKeywords = [
        'parent',
        'subsidiary',
        'owner',
        'ownership',
        'direct_parent',
        'ultimate_parent',
        'predecessor',
        'successor',
        'has_subsidiary',
        'is_part_of',
        'owns_stake_in',
    ];
    const governanceKeywords = [
        'works_at',
        'board_member',
        'officer',
        'director',
        'has_ceo',
        'founded_by',
        'is_officer',
        'is_director',
        'is_ten_percent_owner',
    ];
    const regulatoryKeywords = [
        'filed',
        'filing',
        'issued_by',
        'refers_to',
        'form_',
        '10_k',
        '10_q',
        '8_k',
        '13f',
        '13d',
        '13g',
        'def_14a',
        'sc_13',
    ];
    const riskCategories = new Set([
        'bankruptcy',
        'default',
        'insolvency',
        'credit rating downgrade',
        'significant legal judgement',
        'cybersecurity breach',
        'layoffs',
        'seizure',
        'expropriation',
    ]);
    const ownershipLinks = computed(() =>
        normalizedRelationships.value.filter((relationship) =>
            ownershipKeywords.some((keyword) => relationship.normalizedType.includes(keyword))
        )
    );
    const governanceLinks = computed(() =>
        normalizedRelationships.value.filter((relationship) =>
            governanceKeywords.some((keyword) => relationship.normalizedType.includes(keyword))
        )
    );
    const regulatoryLinks = computed(() =>
        normalizedRelationships.value.filter((relationship) =>
            regulatoryKeywords.some((keyword) => relationship.normalizedType.includes(keyword))
        )
    );
    const marketIdentityEntities = computed(() =>
        entities.value.filter((entity) => {
            const props = entity.properties ?? {};
            const hasMarketId =
                'ticker' in props ||
                'ticker_symbol' in props ||
                'cusip_number' in props ||
                'isin' in props ||
                'lei' in props ||
                'exchange' in props;
            return entity.flavor === 'financial_instrument' || hasMarketId;
        })
    );
    const secDocumentCount = computed(
        () =>
            entities.value.filter((entity) =>
                String(entity.flavor).toLowerCase().startsWith('sec::')
            ).length
    );
    const sanctionsTaggedEntities = computed(() =>
        entities.value.filter((entity) => {
            const keys = Object.keys(entity.properties ?? {}).map((key) => key.toLowerCase());
            return (
                keys.includes('sanction_program') ||
                keys.includes('sanctions_id') ||
                keys.includes('sanctioned') ||
                keys.some((key) => key.includes('sanction'))
            );
        })
    );
    const fdicFailureTaggedEntities = computed(() =>
        entities.value.filter((entity) => {
            const keys = Object.keys(entity.properties ?? {}).map((key) => key.toLowerCase());
            return (
                keys.includes('failure_date') ||
                keys.includes('failure_resolution_type') ||
                keys.includes('acquired_by')
            );
        })
    );
    const riskEvents = computed(() =>
        events.value.filter((eventItem) => {
            const category = String(eventItem.category ?? '')
                .toLowerCase()
                .trim();
            return riskCategories.has(category);
        })
    );
    const worldGraphCards = computed<WorldGraphCard[]>(() => {
        const topLineage =
            lineageResults.value[0]?.primaryStatement ??
            (ownershipLinks.value[0]
                ? `${resolveEntityName(ownershipLinks.value[0].sourceNeid)} -> ${resolveEntityName(ownershipLinks.value[0].targetNeid)}`
                : 'No ownership transition resolved yet');
        const governanceExample = governanceLinks.value[0] ?? null;
        const governanceFallback = peopleAffiliationInsights.value[0]?.title ?? null;
        const governanceSummary = governanceExample
            ? `${resolveEntityName(governanceExample.sourceNeid)} -> ${resolveEntityName(governanceExample.targetNeid)}`
            : (governanceFallback ?? 'No governance role edge resolved yet');
        const marketExamples = marketIdentityEntities.value
            .slice(0, 3)
            .map((entity) => resolveEntityName(entity.neid));
        const regulatoryExamples = [
            ...new Set(
                regulatoryLinks.value
                    .slice(0, 3)
                    .map((relationship) => relationship.normalizedType.replace(/_/g, ' '))
            ),
        ];
        const riskExamples = [
            ...new Set(
                riskEvents.value
                    .slice(0, 3)
                    .map((eventItem) => String(eventItem.category || eventItem.name))
            ),
        ];

        return [
            {
                id: 'ownership',
                title: 'Ownership And Control',
                subtitle: 'Who owns this, and what sits above or below it',
                icon: 'mdi-source-branch',
                color: 'primary',
                summary:
                    'Adds direct and ultimate control context that is usually absent from document-only extraction.',
                statLabel: 'Ownership links',
                statValue: ownershipLinks.value.length.toLocaleString(),
                evidence: [topLineage, 'parent/subsidiary', 'direct_parent/ultimate_parent'],
                mapping:
                    'Mapped via elemental_get_related with relationship filters: parent, subsidiary, owner, predecessor, successor, direct_parent, ultimate_parent.',
                askPrompt:
                    'Explain the most important ownership and control chain for this collection and why it matters.',
            },
            {
                id: 'governance',
                title: 'Leadership And Governance',
                subtitle: 'Operational and insider context around key entities',
                icon: 'mdi-account-tie-outline',
                color: 'teal',
                summary:
                    'Shows people-to-organization roles such as officer, board, director, and employment links.',
                statLabel: 'Governance links',
                statValue: governanceLinks.value.length.toLocaleString(),
                evidence: [
                    governanceSummary,
                    'works_at / board_member / officer',
                    'director / CEO',
                ],
                mapping:
                    'Mapped via elemental_get_related using person related_flavor and governance relationship filters: works_at, board_member, officer, is_director, has_ceo, founded_by.',
                askPrompt:
                    'Who are the key leaders and governance-linked people connected to this graph, and what roles do they hold?',
            },
            {
                id: 'market_identity',
                title: 'Market And Instrument Identity',
                subtitle: 'Reference IDs and traded instrument context',
                icon: 'mdi-finance',
                color: 'indigo',
                summary:
                    'Resolves entities into market-facing IDs and instruments, bridging document entities to tradable context.',
                statLabel: 'Market-linked entities',
                statValue: marketIdentityEntities.value.length.toLocaleString(),
                evidence: marketExamples.length
                    ? marketExamples
                    : ['ticker/exchange', 'CUSIP/ISIN/LEI', 'financial_instrument links'],
                mapping:
                    'Mapped via elemental_get_entity (properties: ticker, exchange, sector, industry, cusip_number, isin, lei) and elemental_get_related for related_flavor financial_instrument.',
                askPrompt:
                    'Show the strongest market identity context for these entities, including ticker, exchange, and instrument links.',
            },
            {
                id: 'regulatory',
                title: 'Regulatory And Filing Footprint',
                subtitle: 'How entities show up in formal disclosure systems',
                icon: 'mdi-file-document-multiple-outline',
                color: 'deep-purple',
                summary:
                    'Highlights filing-oriented relationship paths and regulatory document presence outside source extraction.',
                statLabel: 'Regulatory signals',
                statValue: (regulatoryLinks.value.length + secDocumentCount.value).toLocaleString(),
                evidence: regulatoryExamples.length
                    ? regulatoryExamples
                    : ['10-K / 10-Q / 8-K', 'Form 4 / 13D / 13F', 'issued_by / refers_to'],
                mapping:
                    'Mapped via elemental_get_related with relationship filters filed/issued_by/refers_to/form types, plus sec::* flavor entities and filing metadata fields (form_type, filing_date).',
                askPrompt:
                    "Summarize this collection's regulatory and filing footprint and what it adds beyond document extraction.",
            },
            {
                id: 'risk_compliance',
                title: 'Risk And Compliance Context',
                subtitle: 'External risk signals, sanctions, and adverse events',
                icon: 'mdi-shield-alert-outline',
                color: 'error',
                summary:
                    'Adds risk context from sanctions, bank failure markers, and adverse event/news categories.',
                statLabel: 'Risk signals',
                statValue: (
                    riskEvents.value.length +
                    sanctionsTaggedEntities.value.length +
                    fdicFailureTaggedEntities.value.length
                ).toLocaleString(),
                evidence: riskExamples.length
                    ? riskExamples
                    : ['sanction_program', 'failure_date/acquired_by', 'bankruptcy/default/legal'],
                mapping:
                    'Mapped via elemental_get_events (categories: bankruptcy/default/legal/cyber), elemental_get_entity sanctions/FDIC properties, and filtered news categories from enrichment-filtered-news.',
                askPrompt:
                    'Identify the top risk and compliance signals linked to this collection and explain their impact.',
            },
        ];
    });
    const newsInitialLoading = computed(
        () =>
            filteredNewsLoading.value &&
            !filteredNewsRefreshing.value &&
            !filteredNewsInitialized.value &&
            sortedDedupedNews.value.length === 0
    );

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

    function applyTopicFilter(topic: string): void {
        const trimmed = topic.trim();
        if (!trimmed) return;
        if (
            selectedNewsCategories.value.length === 1 &&
            selectedNewsCategories.value[0] === trimmed
        ) {
            selectedNewsCategories.value = [];
            return;
        }
        selectedNewsCategories.value = [trimmed];
    }
</script>

<style scoped>
    .enrichment-layout {
        width: min(1180px, 100%);
        margin: 0 auto;
    }

    .world-graph-shell {
        border-color: color-mix(in srgb, var(--app-divider) 88%, transparent);
        background: color-mix(in srgb, var(--app-surface) 96%, white 4%);
    }

    .world-graph-card {
        border: 1px solid color-mix(in srgb, var(--app-divider) 90%, transparent);
        background: color-mix(in srgb, var(--app-surface) 98%, white 2%);
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
        padding: 2px 2px 0;
    }

    .news-group-block + .news-group-block {
        border-top: 1px solid color-mix(in srgb, var(--app-divider) 86%, transparent);
        padding-top: 12px;
    }

    :global(:root[data-app-color-mode='dark']) .news-group-block + .news-group-block {
        border-top-color: color-mix(in srgb, var(--app-divider) 62%, transparent);
    }
</style>
