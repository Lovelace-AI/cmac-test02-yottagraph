<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item class="pb-1">
            <v-card-title class="section-title">Initial Sources</v-card-title>
            <template #append>
                <span class="text-caption text-medium-emphasis">{{ sources.length }} total</span>
            </template>
        </v-card-item>
        <v-card-text class="pt-0 pb-3">
            <v-table density="compact" class="documents-table">
                <tbody>
                    <tr v-for="source in visibleSources" :key="source.id">
                        <td class="cell-document">
                            <div>{{ source.label }}</div>
                            <div class="text-caption text-medium-emphasis">
                                {{ source.sourceType }}
                            </div>
                        </td>
                        <td class="cell-date">{{ source.date || 'N/A' }}</td>
                    </tr>
                </tbody>
            </v-table>
            <div
                v-if="sources.length > visibleSources.length"
                class="text-caption text-medium-emphasis mt-2"
            >
                Showing {{ visibleSources.length }} of {{ sources.length }} sources.
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { InitialSourceRow } from '~/utils/overviewBriefing';

    const props = defineProps<{
        sources: InitialSourceRow[];
    }>();

    const visibleSources = computed(() => props.sources.slice(0, 5));
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

    .documents-table {
        border: 1px solid var(--app-divider);
        border-radius: 10px;
        overflow: hidden;
    }

    .documents-table th {
        white-space: nowrap;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--dynamic-text-muted);
        border-bottom: 1px solid var(--app-divider-strong) !important;
        background: color-mix(
            in srgb,
            var(--dynamic-panel-background) 84%,
            var(--dynamic-background) 16%
        );
        padding: 8px 10px !important;
    }

    .documents-table :deep(tbody tr td) {
        border-bottom: 1px solid var(--app-divider);
        padding: 8px 10px !important;
        font-size: 0.8rem;
        line-height: 1.3;
        vertical-align: middle;
    }

    .documents-table :deep(tbody tr:hover td) {
        background: color-mix(in srgb, var(--dynamic-primary) 6%, transparent);
    }

    .cell-document {
        font-weight: 500;
    }

    .cell-date {
        white-space: nowrap;
        color: var(--dynamic-text-secondary);
    }
</style>
