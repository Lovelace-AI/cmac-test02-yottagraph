<template>
    <div class="meta-row">
        <span class="meta-source" :title="sourceName || 'Unknown source'">
            {{ sourceName || 'Unknown source' }}
        </span>
        <span class="meta-separator">•</span>
        <span :class="['meta-date', { 'meta-date--missing': datePresentation.isUnavailable }]">
            {{ datePresentation.absolute }}
        </span>
        <span v-if="datePresentation.relative" class="meta-separator">•</span>
        <span v-if="datePresentation.relative" class="meta-relative">
            {{ datePresentation.relative }}
        </span>
        <span v-if="categoryLabel" class="meta-badge">{{ categoryLabel }}</span>
    </div>
</template>

<script setup lang="ts">
    import { formatNewsDate } from '~/utils/newsFeed';

    const props = defineProps<{
        sourceName?: string;
        date?: string;
        categoryLabel?: string;
    }>();

    const datePresentation = computed(() => formatNewsDate(props.date));
</script>

<style scoped>
    .meta-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 5px;
        min-width: 0;
        font-size: 0.74rem;
        color: var(--dynamic-text-secondary);
    }

    .meta-source {
        font-weight: 500;
        max-width: 220px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .meta-separator {
        color: var(--dynamic-text-muted);
    }

    .meta-date--missing {
        color: var(--dynamic-text-muted);
        font-style: italic;
    }

    .meta-relative {
        color: var(--dynamic-text-muted);
        white-space: nowrap;
    }

    .meta-badge {
        margin-left: 3px;
        border: 1px solid color-mix(in srgb, var(--app-divider) 84%, transparent);
        border-radius: 6px;
        color: var(--dynamic-text-secondary);
        font-size: 0.68rem;
        line-height: 1.1;
        padding: 2px 5px;
        background: color-mix(in srgb, var(--dynamic-surface) 84%, transparent);
    }

    :global(:root[data-app-color-mode='dark']) .meta-badge {
        border-color: color-mix(in srgb, var(--app-divider) 62%, transparent);
        background: color-mix(in srgb, var(--dynamic-surface) 74%, var(--dynamic-background) 26%);
    }
</style>
