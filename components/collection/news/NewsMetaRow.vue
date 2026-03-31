<template>
    <div class="meta-row">
        <span class="meta-source">{{ sourceName || 'Unknown source' }}</span>
        <span class="meta-separator">•</span>
        <span :class="['meta-date', { 'meta-date--missing': datePresentation.isUnavailable }]">
            {{ datePresentation.absolute }}
        </span>
        <span v-if="datePresentation.relative" class="meta-separator">•</span>
        <span v-if="datePresentation.relative" class="meta-relative">
            {{ datePresentation.relative }}
        </span>
        <v-chip v-if="categoryLabel" size="x-small" variant="flat" class="meta-badge">
            {{ categoryLabel }}
        </v-chip>
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
        gap: 6px;
        min-width: 0;
        font-size: 0.76rem;
        color: var(--dynamic-text-secondary);
    }

    .meta-source {
        font-weight: 500;
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
    }

    .meta-badge {
        margin-left: 4px;
        border: 1px solid var(--app-divider);
        color: var(--dynamic-text-secondary);
        background: color-mix(in srgb, var(--dynamic-surface) 84%, transparent);
    }
</style>
