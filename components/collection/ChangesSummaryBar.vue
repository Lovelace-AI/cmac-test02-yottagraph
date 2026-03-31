<template>
    <div class="summary-grid mb-3">
        <v-sheet class="summary-item pa-3 rounded" color="surface">
            <div class="text-caption text-medium-emphasis">Total changes</div>
            <div class="text-h6">{{ summary.totalChanges }}</div>
        </v-sheet>
        <v-sheet class="summary-item pa-3 rounded" color="surface">
            <div class="text-caption text-medium-emphasis">Metrics changed</div>
            <div class="text-h6">{{ summary.metricsChanged }}</div>
        </v-sheet>
        <v-sheet class="summary-item pa-3 rounded" color="surface">
            <div class="text-caption text-medium-emphasis">Largest increase</div>
            <div class="text-body-2">{{ largestIncreaseLabel }}</div>
        </v-sheet>
        <v-sheet class="summary-item pa-3 rounded" color="surface">
            <div class="text-caption text-medium-emphasis">Largest decrease</div>
            <div class="text-body-2">{{ largestDecreaseLabel }}</div>
        </v-sheet>
        <v-sheet class="summary-item pa-3 rounded" color="surface">
            <div class="text-caption text-medium-emphasis">Most volatile metric</div>
            <div class="text-body-2">{{ mostVolatileLabel }}</div>
        </v-sheet>
        <v-sheet class="summary-item pa-3 rounded" color="surface">
            <div class="text-caption text-medium-emphasis">Most recent comparison</div>
            <div class="text-body-2">{{ recentLabel }}</div>
        </v-sheet>
    </div>
</template>

<script setup lang="ts">
    import type { TemporalChangesSummary } from '~/utils/temporalChanges';

    const props = defineProps<{
        summary: TemporalChangesSummary;
    }>();

    const largestIncreaseLabel = computed(() =>
        props.summary.largestIncrease
            ? `${props.summary.largestIncrease.metricLabel} (${props.summary.largestIncrease.deltaDisplay})`
            : 'N/A'
    );

    const largestDecreaseLabel = computed(() =>
        props.summary.largestDecrease
            ? `${props.summary.largestDecrease.metricLabel} (${props.summary.largestDecrease.deltaDisplay})`
            : 'N/A'
    );

    const mostVolatileLabel = computed(
        () => props.summary.mostVolatileMetric?.metricLabel ?? 'N/A'
    );

    const recentLabel = computed(() =>
        props.summary.mostRecentComparison
            ? `${props.summary.mostRecentComparison.fromDocument} → ${props.summary.mostRecentComparison.toDocument}`
            : 'N/A'
    );
</script>

<style scoped>
    .summary-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .summary-item {
        border: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 10%, transparent);
        background: color-mix(
            in srgb,
            rgb(var(--v-theme-surface)) 94%,
            rgb(var(--v-theme-primary)) 6%
        );
    }
</style>
