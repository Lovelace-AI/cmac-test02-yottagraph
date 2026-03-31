<template>
    <div class="results-header">
        <div class="summary-block">
            <div class="summary-line">{{ summaryLine }}</div>
            <div class="detail-line">{{ detailLine }}</div>
        </div>
        <div class="controls">
            <slot name="controls" />
            <slot name="status" />
        </div>
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        summaryLine: string;
        detailLine: string;
    }>();
</script>

<style scoped>
    .results-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        border-bottom: 1px solid color-mix(in srgb, var(--app-divider) 84%, transparent);
        padding-bottom: 8px;
        margin-bottom: 2px;
    }

    .summary-block {
        min-width: 240px;
    }

    .summary-line {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--dynamic-text-primary);
    }

    .detail-line {
        margin-top: 2px;
        font-size: 0.73rem;
        color: var(--dynamic-text-muted);
    }

    .controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
    }
</style>
