<template>
    <v-card class="notable-changes-card">
        <v-card-item>
            <v-card-title class="text-body-1">Notable Changes</v-card-title>
            <v-card-subtitle>
                Material differences in temporal financial properties across related documents.
            </v-card-subtitle>
        </v-card-item>

        <v-card-text>
            <v-alert v-if="!changes.length" type="info" variant="tonal">
                No notable cross-document value changes detected for this entity.
            </v-alert>

            <template v-else>
                <ChangesSummaryBar :summary="summary" />

                <v-sheet
                    v-if="enableNarrative && (narrative || narrativeLoading || narrativeError)"
                    class="narrative-panel pa-3 rounded mb-3"
                >
                    <div class="d-flex align-center justify-space-between mb-1">
                        <div class="text-caption text-medium-emphasis">
                            Analyst narrative
                            <span v-if="narrativeSource === 'gemini'">(Gemini)</span>
                            <span v-else-if="narrativeSource === 'fallback'">(Deterministic)</span>
                        </div>
                        <v-progress-circular
                            v-if="narrativeLoading"
                            size="14"
                            width="2"
                            indeterminate
                        />
                    </div>
                    <div v-if="narrative" class="text-body-2">{{ narrative }}</div>
                    <div v-else-if="narrativeError" class="text-caption text-medium-emphasis">
                        {{ narrativeError }}
                    </div>
                </v-sheet>

                <div class="notable-controls d-flex align-center ga-2 flex-wrap mb-3">
                    <v-btn-toggle
                        v-model="viewMode"
                        mandatory
                        density="comfortable"
                        color="primary"
                        divided
                        class="view-mode-toggle"
                    >
                        <v-btn value="grouped" size="small">Group by metric</v-btn>
                        <v-btn value="feed" size="small">Chronological feed</v-btn>
                    </v-btn-toggle>

                    <v-select
                        v-model="sortMode"
                        :items="sortOptions"
                        item-title="title"
                        item-value="value"
                        density="compact"
                        hide-details
                        variant="outlined"
                        label="Sort"
                        class="sort-select"
                    />

                    <v-switch
                        v-model="onlyMaterial"
                        hide-details
                        density="compact"
                        color="primary"
                        label="Only material changes"
                    />

                    <v-select
                        v-model="severityFilter"
                        :items="severityOptions"
                        item-title="title"
                        item-value="value"
                        density="compact"
                        hide-details
                        variant="outlined"
                        label="Severity"
                        class="severity-select"
                    />

                    <v-text-field
                        v-model="metricQuery"
                        density="compact"
                        hide-details
                        variant="outlined"
                        label="Search metrics"
                        prepend-inner-icon="mdi-magnify"
                        class="metric-search"
                    />
                </div>

                <v-alert v-if="!feedRows.length" type="info" variant="tonal" class="mb-2">
                    No changes match the current filters.
                </v-alert>

                <div v-if="viewMode === 'grouped' && visibleGroups.length">
                    <MetricChangeGroup
                        v-for="group in visibleGroups"
                        :key="group.metricKey"
                        :group="group"
                    />
                </div>

                <v-data-table
                    v-else-if="viewMode === 'feed' && feedRows.length"
                    :headers="feedHeaders"
                    :items="feedRows"
                    item-value="id"
                    density="comfortable"
                    hover
                    show-expand
                >
                    <template #item.metricLabel="{ item }">
                        <span class="font-weight-medium metric-cell">{{ item.metricLabel }}</span>
                    </template>
                    <template #item.deltaDisplay="{ item }">
                        <span :class="directionClass(item.direction)" class="font-weight-medium">
                            {{ item.deltaDisplay }}
                        </span>
                        <span
                            v-if="item.percentDeltaDisplay"
                            class="text-caption text-medium-emphasis ml-1"
                        >
                            {{ item.percentDeltaDisplay }}
                        </span>
                    </template>
                    <template #item.fromTo="{ item }">
                        <span class="from-to-cell"
                            >{{ item.fromDisplay }} → {{ item.toDisplay }}</span
                        >
                    </template>
                    <template #item.periodLabel="{ item }">
                        <span class="text-caption period-cell">{{ item.periodLabel }}</span>
                    </template>
                    <template #item.severity="{ item }">
                        <ChangeSeverityBadge :severity="item.severity" />
                    </template>
                    <template #expanded-row="{ columns, item }">
                        <tr>
                            <td :colspan="columns.length">
                                <ChangeDetailsPanel :change="item" />
                            </td>
                        </tr>
                    </template>
                </v-data-table>
            </template>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type {
        ChangeSortMode,
        MetricChangeGroup,
        TemporalChangeEntry,
        TemporalChangesSummary,
        ViewMode,
    } from '~/utils/temporalChanges';
    import { sortChanges } from '~/utils/temporalChanges';

    interface NarrativePayload {
        changes: Array<{
            metricLabel: string;
            deltaDisplay: string;
            fromDisplay: string;
            toDisplay: string;
            periodLabel: string;
            severity: string;
            interpretation: string;
        }>;
        summary: {
            totalChanges: number;
            metricsChanged: number;
            largestIncrease: string | null;
            largestDecrease: string | null;
            mostVolatileMetric: string | null;
            mostRecentComparison: string | null;
        };
    }

    const props = withDefaults(
        defineProps<{
            changes: TemporalChangeEntry[];
            grouped: MetricChangeGroup[];
            summary: TemporalChangesSummary;
            narrativePayload?: NarrativePayload;
            enableNarrative?: boolean;
            narrativeEndpoint?: string;
        }>(),
        {
            enableNarrative: true,
            narrativeEndpoint: '/api/collection/timeline-language',
            narrativePayload: undefined,
        }
    );

    const viewMode = ref<ViewMode>('grouped');
    const sortMode = ref<ChangeSortMode>('significance');
    const onlyMaterial = ref(false);
    const severityFilter = ref<'all' | 'major' | 'moderate' | 'minor'>('all');
    const metricQuery = ref('');
    const narrative = ref('');
    const narrativeSource = ref<'gemini' | 'fallback' | ''>('');
    const narrativeLoading = ref(false);
    const narrativeError = ref('');

    const sortOptions: Array<{ title: string; value: ChangeSortMode }> = [
        { title: 'Significance', value: 'significance' },
        { title: 'Largest increase', value: 'largest_increase' },
        { title: 'Largest decrease', value: 'largest_decrease' },
        { title: 'Most recent', value: 'most_recent' },
        { title: 'Metric name', value: 'metric_name' },
        { title: 'Source period', value: 'source_period' },
    ];
    const severityOptions = [
        { title: 'All severities', value: 'all' },
        { title: 'Material only', value: 'major' },
        { title: 'Watch only', value: 'moderate' },
        { title: 'Informational only', value: 'minor' },
    ];

    const feedHeaders = [
        { title: 'Metric', key: 'metricLabel', sortable: false },
        { title: 'Change', key: 'deltaDisplay', sortable: false },
        { title: 'From -> To', key: 'fromTo', sortable: false },
        { title: 'Comparison period', key: 'periodLabel', sortable: false },
        { title: 'Severity', key: 'severity', sortable: false, width: 130 },
        { title: '', key: 'data-table-expand', sortable: false, width: 60 },
    ];

    const materialFilteredChanges = computed(() =>
        onlyMaterial.value
            ? props.changes.filter(
                  (change) => change.severity === 'major' || change.severity === 'moderate'
              )
            : props.changes
    );

    const filteredChanges = computed(() =>
        materialFilteredChanges.value.filter((change) => {
            if (severityFilter.value !== 'all' && change.severity !== severityFilter.value)
                return false;
            if (
                metricQuery.value &&
                !change.metricLabel.toLowerCase().includes(metricQuery.value.toLowerCase())
            ) {
                return false;
            }
            return true;
        })
    );

    const feedRows = computed(() => sortChanges(filteredChanges.value, sortMode.value));

    const visibleGroups = computed(() => {
        const baseGroups = onlyMaterial.value
            ? props.grouped
                  .map((group) => ({
                      ...group,
                      changes: group.changes.filter(
                          (change) => change.severity === 'major' || change.severity === 'moderate'
                      ),
                  }))
                  .filter((group) => group.changes.length > 0)
            : props.grouped;
        return baseGroups
            .map((group) => ({
                ...group,
                changes: group.changes.filter((change) => {
                    if (severityFilter.value !== 'all' && change.severity !== severityFilter.value)
                        return false;
                    if (
                        metricQuery.value &&
                        !group.metricLabel.toLowerCase().includes(metricQuery.value.toLowerCase())
                    ) {
                        return false;
                    }
                    return true;
                }),
            }))
            .filter((group) => group.changes.length > 0);
    });

    watch(
        () => [props.enableNarrative, props.narrativePayload, props.changes.length] as const,
        async ([enabled]) => {
            if (!enabled) {
                narrative.value = '';
                narrativeSource.value = '';
                narrativeError.value = '';
                return;
            }
            if (!props.narrativePayload || props.changes.length === 0) {
                narrative.value = '';
                narrativeSource.value = '';
                narrativeError.value = '';
                return;
            }
            narrativeLoading.value = true;
            narrativeError.value = '';
            try {
                const response = await $fetch<{
                    narrative: string;
                    source: 'gemini' | 'fallback';
                    note?: string;
                }>(props.narrativeEndpoint, {
                    method: 'POST',
                    body: props.narrativePayload,
                });
                narrative.value = response.narrative;
                narrativeSource.value = response.source;
                narrativeError.value = response.note ?? '';
            } catch {
                narrative.value = '';
                narrativeSource.value = '';
                narrativeError.value =
                    'Narrative unavailable; showing deterministic analysis only.';
            } finally {
                narrativeLoading.value = false;
            }
        },
        { immediate: true, deep: true }
    );

    function directionClass(direction: TemporalChangeEntry['direction']): string {
        if (direction === 'increase') return 'direction-up';
        if (direction === 'decrease') return 'direction-down';
        return 'direction-neutral';
    }
</script>

<style scoped>
    .notable-changes-card {
        border: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 8%, transparent);
        background: color-mix(
            in srgb,
            rgb(var(--v-theme-surface)) 96%,
            rgb(var(--v-theme-primary)) 4%
        );
    }

    .sort-select {
        width: min(260px, 100%);
    }

    .severity-select {
        width: min(220px, 100%);
    }

    .metric-search {
        width: min(260px, 100%);
    }

    .metric-cell,
    .from-to-cell,
    .period-cell {
        white-space: normal;
        line-height: 1.3;
        overflow-wrap: anywhere;
    }

    .narrative-panel {
        border: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 10%, transparent);
        background: color-mix(
            in srgb,
            rgb(var(--v-theme-surface)) 90%,
            rgb(var(--v-theme-primary)) 10%
        );
    }

    .direction-up {
        color: color-mix(in srgb, rgb(var(--v-theme-primary)) 80%, rgb(var(--v-theme-success)) 20%);
    }

    .direction-down {
        color: color-mix(in srgb, rgb(var(--v-theme-primary)) 80%, rgb(var(--v-theme-warning)) 20%);
    }

    .direction-neutral {
        color: rgb(var(--v-theme-on-surface));
    }

    @media (max-width: 1200px) {
        .notable-controls > * {
            flex: 1 1 220px;
            min-width: 190px;
        }

        .view-mode-toggle {
            flex: 1 1 100%;
        }
    }

    @media (max-width: 800px) {
        .notable-controls > * {
            flex-basis: 100%;
            min-width: 100%;
        }
    }
</style>
