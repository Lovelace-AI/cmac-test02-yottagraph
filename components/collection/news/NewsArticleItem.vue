<template>
    <article
        :class="[
            'news-article-item',
            {
                'news-article-item--interactive': Boolean(item.url),
                'news-article-item--compact': compact,
                'news-article-item--grouped': grouped,
            },
        ]"
        :tabindex="item.url ? 0 : -1"
        role="article"
        @click="openArticle"
        @keydown.enter.prevent="openArticle"
        @keydown.space.prevent="openArticle"
    >
        <div class="headline-row">
            <h4 class="headline">
                <a
                    v-if="item.url"
                    :href="item.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="headline-link"
                    @click.stop
                >
                    {{ headlineText }}
                </a>
                <span v-else>{{ headlineText }}</span>
            </h4>
            <v-btn
                v-if="item.url"
                icon="mdi-open-in-new"
                variant="text"
                size="x-small"
                class="open-link"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
            />
        </div>

        <NewsMetaRow
            :source-name="item.sourceName"
            :date="item.date"
            :category-label="categoryLabel"
        />

        <p class="summary">
            {{ summaryText }}
        </p>

        <div v-if="hasFooterMeta" class="footer-row">
            <div v-if="visibleEntityNames.length" class="entity-list">
                <EntityChip
                    v-for="entity in visibleEntityNames"
                    :key="`entity:${item.articleNeid}:${entity}`"
                    :label="entity"
                />
            </div>
            <div class="aux-meta">
                <span v-if="item.sentiment != null" class="aux-badge">
                    Sentiment {{ formatSentiment(item.sentiment) }}
                </span>
                <span v-if="item.confidence != null" class="aux-badge">
                    Relevance {{ formatConfidence(item.confidence) }}
                </span>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
    import { formatConfidence, formatSentiment, truncateNewsSummary } from '~/utils/newsFeed';
    import type {
        EnrichmentNewsItem,
        FilteredNewsItem,
    } from '~/composables/useCollectionWorkspace';

    const props = defineProps<{
        item: EnrichmentNewsItem | FilteredNewsItem;
        categoryLabel?: string;
        compact?: boolean;
        grouped?: boolean;
        fallbackEntityName?: string;
    }>();

    const headlineText = computed(
        () => props.item.title || props.item.urlHost || 'Headline unavailable'
    );
    const summaryText = computed(() =>
        truncateNewsSummary(
            props.item.description ||
                (props.item.url
                    ? 'Open the linked article to review the exact source text.'
                    : 'No summary available.'),
            props.compact ? 180 : 240
        )
    );
    const visibleEntityNames = computed(() => {
        if (props.item.linkedEntityNames.length > 0)
            return props.item.linkedEntityNames.slice(0, 4);
        if (props.fallbackEntityName?.trim()) return [props.fallbackEntityName.trim()];
        return [];
    });
    const hasFooterMeta = computed(
        () =>
            visibleEntityNames.value.length > 0 ||
            props.item.sentiment != null ||
            props.item.confidence != null
    );

    function openArticle(): void {
        if (!props.item.url || typeof window === 'undefined') return;
        window.open(props.item.url, '_blank', 'noopener,noreferrer');
    }
</script>

<style scoped>
    .news-article-item {
        border-bottom: 1px solid var(--app-divider);
        padding: 10px 2px;
    }

    .news-article-item--interactive {
        cursor: pointer;
        border-radius: 8px;
        transition:
            background-color 0.15s ease,
            box-shadow 0.15s ease;
    }

    .news-article-item--interactive:hover {
        background: color-mix(in srgb, var(--dynamic-hover) 44%, transparent);
        box-shadow: 0 1px 0 color-mix(in srgb, var(--dynamic-primary) 18%, transparent);
    }

    .news-article-item--interactive:focus-visible {
        outline: 2px solid var(--app-focus-ring);
        outline-offset: 2px;
    }

    .headline-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
    }

    .headline {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.35;
        font-weight: 600;
        color: var(--dynamic-text-primary);
    }

    .headline-link {
        color: inherit;
        text-decoration: none;
    }

    .headline-link:hover {
        text-decoration: underline;
        text-decoration-color: color-mix(in srgb, var(--dynamic-primary) 50%, transparent);
        text-underline-offset: 2px;
    }

    .open-link {
        color: var(--dynamic-text-muted);
    }

    .summary {
        margin-top: 6px;
        margin-bottom: 0;
        font-size: 0.82rem;
        line-height: 1.45;
        color: var(--dynamic-text-secondary);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .news-article-item--compact .summary {
        margin-top: 4px;
        font-size: 0.78rem;
    }

    .news-article-item--grouped {
        padding-left: 8px;
    }

    .footer-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 8px;
    }

    .entity-list {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .aux-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        flex-wrap: wrap;
    }

    .aux-badge {
        font-size: 0.7rem;
        color: var(--dynamic-text-muted);
        border: 1px solid var(--app-divider);
        border-radius: 999px;
        padding: 2px 7px;
        white-space: nowrap;
        background: color-mix(in srgb, var(--dynamic-surface) 82%, transparent);
    }
</style>
