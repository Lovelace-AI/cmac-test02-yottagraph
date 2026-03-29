<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item class="pb-1">
            <v-card-title class="section-title">Extraction Stats</v-card-title>
        </v-card-item>
        <v-card-text class="pt-0 pb-4">
            <div
                class="stats-grid"
                :class="{ 'stats-grid--muted': !hasMetrics, 'stats-grid--single': stacked }"
            >
                <div v-for="item in stats" :key="item.key" class="stat-tile">
                    <div class="stat-value">{{ item.value }}</div>
                    <div class="stat-label">{{ item.label }}</div>
                </div>
            </div>
            <div v-if="!hasMetrics" class="empty-inline">
                <span class="text-caption text-medium-emphasis">
                    Metrics update after extraction completes.
                </span>
                <v-btn
                    size="x-small"
                    variant="text"
                    color="primary"
                    :disabled="status === 'processing'"
                    @click="$emit('run-analysis')"
                >
                    Run analysis
                </v-btn>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { ExtractionStatItem, OverviewStatus } from '~/utils/overviewBriefing';

    const props = defineProps<{
        stats: ExtractionStatItem[];
        status: OverviewStatus;
        stacked?: boolean;
    }>();

    defineEmits<{
        'run-analysis': [];
    }>();

    const hasMetrics = computed(() => {
        const entities = props.stats.find((item) => item.key === 'entities');
        const relationships = props.stats.find((item) => item.key === 'relationships');
        return entities?.value !== '0' || relationships?.value !== '0';
    });
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider-strong);
        background: color-mix(in srgb, var(--dynamic-surface) 94%, var(--dynamic-background) 6%);
    }

    .section-title {
        font-size: 0.92rem;
        font-weight: 600;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
    }

    .stats-grid--single {
        grid-template-columns: minmax(0, 1fr);
    }

    .stats-grid--muted .stat-tile {
        opacity: 0.76;
    }

    .stat-tile {
        border: 1px solid var(--app-divider-strong);
        background: color-mix(
            in srgb,
            var(--dynamic-card-background) 92%,
            var(--dynamic-background) 8%
        );
        border-radius: 10px;
        padding: 8px 10px;
    }

    .stat-value {
        font-size: 1.05rem;
        line-height: 1.2;
        font-weight: 700;
    }

    .stat-label {
        margin-top: 1px;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--dynamic-text-muted);
    }

    .empty-inline {
        margin-top: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
</style>
