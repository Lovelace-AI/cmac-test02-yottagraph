<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item>
            <v-card-title class="text-body-1">Extraction Stats</v-card-title>
        </v-card-item>
        <v-card-text class="pt-0">
            <div class="stats-grid">
                <div v-for="item in stats" :key="item.key" class="stat-tile">
                    <div class="text-h5 font-weight-bold">{{ item.value }}</div>
                    <div class="text-caption text-medium-emphasis">{{ item.label }}</div>
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { ExtractionStatItem } from '~/utils/overviewBriefing';

    defineProps<{
        stats: ExtractionStatItem[];
    }>();
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider-strong);
        background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--dynamic-surface) 90%, var(--dynamic-background) 10%),
            color-mix(in srgb, var(--dynamic-panel-background) 88%, var(--dynamic-background) 12%)
        );
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
    }

    .stat-tile {
        border: 1px solid var(--app-divider-strong);
        background: linear-gradient(
            155deg,
            color-mix(in srgb, var(--dynamic-card-background) 90%, var(--dynamic-background) 10%),
            color-mix(in srgb, var(--dynamic-surface) 80%, var(--dynamic-background) 20%)
        );
        border-radius: 12px;
        padding: 14px;
    }
</style>
