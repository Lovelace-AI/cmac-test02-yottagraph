<template>
    <header class="news-group-header">
        <div class="title-row">
            <h3 class="group-title">{{ title }}</h3>
            <span class="group-count">{{ countLabel }}</span>
        </div>
        <p v-if="description" class="group-description">{{ description }}</p>
    </header>
</template>

<script setup lang="ts">
    defineProps<{
        title: string;
        countLabel: string;
        description?: string;
    }>();
</script>

<style scoped>
    .news-group-header {
        padding: 4px 2px 6px;
        border-bottom: 1px solid var(--app-divider);
    }

    .title-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
    }

    .group-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--dynamic-text-primary);
        margin: 0;
    }

    .group-count {
        font-size: 0.71rem;
        color: var(--dynamic-text-muted);
        white-space: nowrap;
    }

    .group-description {
        margin-top: 4px;
        margin-bottom: 0;
        font-size: 0.74rem;
        color: var(--dynamic-text-muted);
    }
</style>
