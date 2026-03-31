<template>
    <section class="news-section">
        <header v-if="title || subtitle" class="news-section-header">
            <h2 class="news-section-title">{{ title }}</h2>
            <p v-if="subtitle" class="news-section-subtitle">{{ subtitle }}</p>
        </header>
        <div v-if="$slots.filters" class="news-section-filters">
            <slot name="filters" />
        </div>
        <div class="news-section-content">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
    defineProps<{
        title?: string;
        subtitle?: string;
    }>();
</script>

<style scoped>
    .news-section {
        border: 1px solid color-mix(in srgb, var(--app-divider) 82%, transparent);
        border-radius: 10px;
        background: color-mix(in srgb, var(--dynamic-surface) 97%, var(--dynamic-background) 3%);
        padding: 10px 12px;
    }

    .news-section-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
    }

    .news-section-title {
        margin: 0;
        font-size: 0.88rem;
        font-weight: 600;
    }

    .news-section-subtitle {
        margin: 0;
        font-size: 0.73rem;
        color: var(--dynamic-text-muted);
    }

    .news-section-filters {
        margin-bottom: 8px;
    }

    .news-section-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    :global(:root[data-app-color-mode='dark']) .news-section {
        border-color: color-mix(in srgb, var(--app-divider) 72%, transparent);
        background: color-mix(in srgb, var(--dynamic-surface) 92%, var(--dynamic-background) 8%);
    }
</style>
