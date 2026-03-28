<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item>
            <v-card-title class="text-body-1">Deal Summary</v-card-title>
        </v-card-item>
        <v-card-text class="pt-0">
            <div class="summary-grid">
                <div v-for="field in fields" :key="field.label" class="summary-cell">
                    <div class="text-caption text-medium-emphasis text-uppercase">
                        {{ field.label }}
                    </div>
                    <div class="text-body-2 mt-1">{{ field.value }}</div>
                </div>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { DealSummaryField } from '~/utils/overviewBriefing';

    defineProps<{
        fields: DealSummaryField[];
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

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px 22px;
    }

    .summary-cell {
        border-bottom: 1px dashed var(--app-divider);
        padding-bottom: 10px;
    }

    @media (max-width: 760px) {
        .summary-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
