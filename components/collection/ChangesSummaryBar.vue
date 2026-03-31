<template>
    <v-sheet class="summary-strip pa-2 mb-2 rounded" color="surface">
        <div class="summary-row">
            <v-chip
                v-for="item in summaryItems"
                :key="item.label"
                size="small"
                variant="tonal"
                color="default"
                class="summary-chip"
            >
                <span class="summary-label">{{ item.label }}:</span>
                <span class="summary-value">{{ item.value }}</span>
            </v-chip>
        </div>
    </v-sheet>
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

    const summaryItems = computed(() => [
        { label: 'Total changes', value: String(props.summary.totalChanges) },
        { label: 'Metrics changed', value: String(props.summary.metricsChanged) },
        { label: 'Largest increase', value: largestIncreaseLabel.value },
        { label: 'Largest decrease', value: largestDecreaseLabel.value },
        { label: 'Most volatile metric', value: mostVolatileLabel.value },
        { label: 'Most recent comparison', value: recentLabel.value },
    ]);
</script>

<style scoped>
    .summary-strip {
        border: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 10%, transparent);
        background: color-mix(
            in srgb,
            rgb(var(--v-theme-surface)) 94%,
            rgb(var(--v-theme-primary)) 6%
        );
    }

    .summary-row {
        display: flex;
        gap: 6px;
        flex-wrap: nowrap;
        overflow-x: auto;
        scrollbar-width: thin;
    }

    .summary-chip {
        max-width: 360px;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .summary-label {
        margin-right: 4px;
        color: rgb(var(--v-theme-on-surface-variant));
    }

    .summary-value {
        font-weight: 600;
        color: rgb(var(--v-theme-on-surface));
    }

    @media (max-width: 960px) {
        .summary-row {
            flex-wrap: wrap;
            overflow-x: visible;
        }

        .summary-chip {
            max-width: none;
            white-space: normal;
        }
    }
</style>
