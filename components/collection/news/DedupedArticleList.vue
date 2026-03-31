<template>
    <div class="deduped-list">
        <NewsResultsHeader :summary-line="summaryLine" :detail-line="detailLine">
            <template #controls>
                <NewsSortControl
                    :model-value="sortMode"
                    @update:model-value="emit('update:sortMode', $event)"
                />
                <v-btn-toggle
                    :model-value="viewMode"
                    density="compact"
                    mandatory
                    divided
                    @update:model-value="emit('update:viewMode', $event)"
                >
                    <v-btn value="deduped" size="x-small">All deduped articles</v-btn>
                    <v-btn value="grouped" size="x-small">Group by primary entity</v-btn>
                </v-btn-toggle>
            </template>
            <template #status>
                <FilterLoadingState
                    :active="refreshing || loading"
                    label="Loading filtered articles..."
                />
            </template>
        </NewsResultsHeader>

        <div v-if="loading && !articles.length" class="skeleton-stack">
            <ArticleLoadingSkeleton v-for="idx in 4" :key="`initial-skeleton:${idx}`" />
        </div>
        <v-alert v-else-if="!articles.length" type="info" variant="tonal" density="comfortable">
            No category-matched news was found for the selected document-graph anchors.
        </v-alert>
        <div v-else class="cards-stack">
            <template v-if="viewMode === 'grouped'">
                <section
                    v-for="group in groupedArticles"
                    :key="`group:${group.key}`"
                    class="group-block"
                >
                    <NewsGroupHeader
                        :title="group.label"
                        :count-label="`${group.items.length} deduped articles`"
                    />
                    <div class="group-cards">
                        <NewsArticleCard
                            v-for="article in group.items"
                            :key="article.canonicalArticleKey"
                            :article="article"
                            @topic-click="emit('topicClick', $event)"
                        />
                    </div>
                </section>
            </template>
            <template v-else>
                <NewsArticleCard
                    v-for="article in articles"
                    :key="article.canonicalArticleKey"
                    :article="article"
                    @topic-click="emit('topicClick', $event)"
                />
            </template>
            <ArticleLoadingSkeleton
                v-if="refreshing"
                v-for="idx in 2"
                :key="`refreshing-skeleton:${idx}`"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
    import type {
        DedupedNewsArticle,
        NewsSortMode,
        NewsViewMode,
    } from '~/composables/useCollectionWorkspace';

    const props = defineProps<{
        articles: DedupedNewsArticle[];
        loading: boolean;
        refreshing: boolean;
        sortMode: NewsSortMode;
        viewMode: NewsViewMode;
    }>();

    const emit = defineEmits<{
        'update:sortMode': [value: NewsSortMode];
        'update:viewMode': [value: NewsViewMode];
        topicClick: [topic: string];
    }>();

    const summaryLine = computed(() => `Showing ${props.articles.length} deduped articles`);
    const sortLabel = computed(() => {
        if (props.sortMode === 'most_graph_entities') return 'most graph entities';
        if (props.sortMode === 'most_recent') return 'most recent';
        if (props.sortMode === 'highest_relevance') return 'highest relevance';
        return 'strongest graph connection';
    });
    const detailLine = computed(() => {
        const strongest = props.articles[0];
        if (!strongest) return `Sorted by ${sortLabel.value}`;
        return `Sorted by ${sortLabel.value}. Most connected article mentions ${strongest.uniqueGraphMentionCount} graph entities`;
    });

    const groupedArticles = computed(() => {
        const grouped = new Map<
            string,
            { key: string; label: string; items: DedupedNewsArticle[] }
        >();
        for (const article of props.articles) {
            const key = article.primaryEntity?.neid || 'unresolved';
            const label = article.primaryEntity?.name || 'Unresolved primary entity';
            const existing = grouped.get(key);
            if (!existing) {
                grouped.set(key, { key, label, items: [article] });
            } else {
                existing.items.push(article);
            }
        }
        return Array.from(grouped.values());
    });
</script>

<style scoped>
    .deduped-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .cards-stack,
    .skeleton-stack,
    .group-cards {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .group-block {
        border-top: 1px solid color-mix(in srgb, var(--app-divider) 82%, transparent);
        padding-top: 10px;
    }

    .group-cards {
        margin-top: 8px;
    }
</style>
