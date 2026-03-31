<template>
    <article class="news-article-card">
        <div class="headline-row">
            <h4 class="headline">
                <a
                    v-if="article.url"
                    :href="article.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="headline-link"
                >
                    {{ article.title || article.urlHost || 'Headline unavailable' }}
                </a>
                <span v-else>{{ article.title || article.urlHost || 'Headline unavailable' }}</span>
            </h4>
            <div class="headline-actions">
                <button
                    v-if="primaryTopic"
                    type="button"
                    class="topic-badge topic-badge--button"
                    @click="emit('topic-click', primaryTopic)"
                >
                    {{ primaryTopic }}
                </button>
                <v-btn
                    v-if="article.url"
                    icon="mdi-open-in-new"
                    size="x-small"
                    variant="text"
                    :href="article.url"
                    target="_blank"
                    rel="noopener noreferrer"
                />
            </div>
        </div>

        <div class="meta-row">
            <span class="source">{{ article.sourceName || 'Unknown source' }}</span>
            <span class="separator">•</span>
            <span :class="{ missing: dateInfo.isUnavailable }">{{ dateInfo.absolute }}</span>
            <template v-if="dateInfo.relative">
                <span class="separator">•</span>
                <span class="muted">{{ dateInfo.relative }}</span>
            </template>
            <span v-if="article.confidence != null" class="meta-badge">
                Relevance {{ formatConfidence(article.confidence) }}
            </span>
        </div>

        <RelatedEntitiesSection
            :primary-entity="article.primaryEntity"
            :secondary-entities="article.secondaryEntities"
            :mention-count="article.uniqueGraphMentionCount"
        />

        <ExpandableSnippet
            :text="article.description || article.citations[0] || ''"
            fallback-text="No summary available."
            :clamp-lines="3"
        />

        <div class="tag-row">
            <span
                v-for="category in secondaryTopics"
                :key="`category:${article.canonicalArticleKey}:${category}`"
                class="category-tag"
            >
                {{ category }}
            </span>
            <span v-if="article.sentiment != null" class="sentiment-tag">
                Sentiment {{ formatSentiment(article.sentiment) }}
            </span>
            <span v-if="article.matchedVia.length" class="matched-via-tag">
                Matched via {{ article.matchedVia.join(', ') }}
            </span>
            <span v-if="article.alsoLinkedCount > 0" class="linked-tag">
                Also linked to {{ article.alsoLinkedCount }} other entities
            </span>
        </div>

        <MatchReasonRow :text="article.matchReason" />
    </article>
</template>

<script setup lang="ts">
    import type { DedupedNewsArticle } from '~/composables/useCollectionWorkspace';
    import { formatConfidence, formatNewsDate, formatSentiment } from '~/utils/newsFeed';

    const props = defineProps<{
        article: DedupedNewsArticle;
    }>();
    const emit = defineEmits<{
        'topic-click': [topic: string];
    }>();

    const dateInfo = computed(() => formatNewsDate(props.article.date));
    const primaryTopic = computed(() => props.article.matchedCategories[0] || '');
    const secondaryTopics = computed(() => props.article.matchedCategories.slice(1, 4));
</script>

<style scoped>
    .news-article-card {
        border: 1px solid color-mix(in srgb, var(--app-divider) 80%, transparent);
        border-radius: 10px;
        padding: 10px 12px;
        background: color-mix(in srgb, var(--dynamic-surface) 96%, transparent);
    }

    .headline-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
    }

    .headline-actions {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
    }

    .headline {
        margin: 0;
        font-size: 0.93rem;
        line-height: 1.3;
        font-weight: 650;
    }

    .headline-link {
        color: inherit;
        text-decoration: none;
    }

    .headline-link:hover {
        text-decoration: underline;
    }

    .meta-row {
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
        font-size: 0.73rem;
        color: var(--dynamic-text-secondary);
    }

    .source {
        font-weight: 500;
    }

    .separator,
    .muted {
        color: var(--dynamic-text-muted);
    }

    .missing {
        color: var(--dynamic-text-muted);
        font-style: italic;
    }

    .meta-badge,
    .category-tag,
    .sentiment-tag,
    .matched-via-tag,
    .linked-tag {
        display: inline-flex;
        align-items: center;
        border: 1px solid color-mix(in srgb, var(--app-divider) 82%, transparent);
        border-radius: 6px;
        padding: 2px 6px;
        font-size: 0.67rem;
        line-height: 1.1;
    }

    .category-tag {
        background: color-mix(in srgb, var(--dynamic-primary) 9%, transparent);
    }

    .topic-badge {
        display: inline-flex;
        align-items: center;
        border: 1px solid color-mix(in srgb, var(--dynamic-primary) 48%, var(--app-divider));
        border-radius: 6px;
        padding: 2px 6px;
        font-size: 0.66rem;
        line-height: 1.1;
        color: color-mix(in srgb, var(--dynamic-primary) 80%, var(--dynamic-text-primary));
        background: color-mix(in srgb, var(--dynamic-primary) 14%, transparent);
        white-space: nowrap;
    }

    .topic-badge--button {
        cursor: pointer;
    }

    .topic-badge--button:hover {
        background: color-mix(in srgb, var(--dynamic-primary) 20%, transparent);
    }

    .sentiment-tag {
        color: var(--dynamic-text-muted);
    }

    .matched-via-tag,
    .linked-tag {
        color: var(--dynamic-text-secondary);
    }

    .tag-row {
        margin-top: 8px;
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 5px;
    }
</style>
