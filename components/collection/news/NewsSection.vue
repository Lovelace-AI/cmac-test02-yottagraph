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
        border: 1px solid var(--app-divider);
        border-radius: 14px;
        background: color-mix(in srgb, var(--dynamic-surface) 96%, var(--dynamic-background) 4%);
        padding: 12px 14px;
    }

    .news-section-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
    }

    .news-section-title {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .news-section-subtitle {
        margin: 0;
        font-size: 0.75rem;
        color: var(--dynamic-text-muted);
    }

    .news-section-filters {
        margin-bottom: 10px;
    }

    .news-section-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
</style>
