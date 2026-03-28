<template>
    <div class="timeline-comparison">
        <v-card class="mb-3">
            <v-card-text class="d-flex align-center ga-2 flex-wrap py-3">
                <v-select
                    v-model="selectedEntityId"
                    :items="entityOptions"
                    item-title="title"
                    item-value="value"
                    label="Select entity"
                    density="compact"
                    variant="outlined"
                    hide-details
                    clearable
                    class="entity-selector"
                >
                    <template #item="{ props, item }">
                        <v-list-item v-bind="props" :subtitle="item.raw.subtitle" />
                    </template>
                </v-select>
                <v-btn
                    v-if="selectedEntityId"
                    size="small"
                    variant="text"
                    prepend-icon="mdi-close"
                    @click="selectedEntityId = null"
                >
                    Clear
                </v-btn>
            </v-card-text>
        </v-card>

        <v-card v-if="!selectedEntity">
            <v-card-text class="text-center text-medium-emphasis py-8">
                <v-icon size="44" class="mb-2">mdi-chart-timeline-variant</v-icon>
                <div>Select an entity to compare property values across source documents.</div>
            </v-card-text>
        </v-card>

        <template v-else>
            <div v-if="numericTrendCards.length" class="trend-grid mb-3">
                <v-card
                    v-for="card in numericTrendCards"
                    :key="card.propertyName"
                    variant="outlined"
                >
                    <v-card-text class="py-3">
                        <div class="text-caption text-medium-emphasis">{{ card.propertyName }}</div>
                        <div class="text-body-1 font-weight-medium">{{ card.latestDisplay }}</div>
                        <div
                            class="text-caption"
                            :class="card.delta >= 0 ? 'text-success' : 'text-error'"
                        >
                            {{ card.delta >= 0 ? '+' : '' }}{{ card.delta.toFixed(1) }}%
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            {{ card.firstDate }} -> {{ card.lastDate }}
                        </div>
                    </v-card-text>
                </v-card>
            </div>

            <v-card class="mb-3">
                <v-card-item>
                    <v-card-title class="text-body-1">Property by Document Comparison</v-card-title>
                    <v-card-subtitle>
                        Cross-document value matrix for {{ selectedEntity.name }}.
                    </v-card-subtitle>
                </v-card-item>
                <v-card-text class="pa-0">
                    <v-data-table
                        :headers="comparisonHeaders"
                        :items="comparisonRows"
                        density="compact"
                        hover
                        fixed-header
                        height="420"
                    >
                        <template v-slot:item.propertyName="{ item }">
                            <span class="font-weight-medium">{{ item.propertyName }}</span>
                        </template>
                        <template
                            v-for="doc in sortedDocuments"
                            v-slot:[`item.${doc.neid}`]="{ item }"
                            :key="doc.neid"
                        >
                            <span :class="changeClass(item, doc.neid)">
                                {{ item[doc.neid] ?? '—' }}
                            </span>
                        </template>
                    </v-data-table>
                </v-card-text>
            </v-card>

            <v-card>
                <v-card-item>
                    <v-card-title class="text-body-1">Notable Changes</v-card-title>
                </v-card-item>
                <v-card-text>
                    <v-alert v-if="!notableChanges.length" type="info" variant="tonal">
                        No notable cross-document value changes detected for this entity.
                    </v-alert>
                    <v-list v-else density="compact" class="pa-0">
                        <v-list-item
                            v-for="change in notableChanges"
                            :key="change.key"
                            class="px-0"
                        >
                            <v-list-item-title>
                                {{ change.propertyName }}: {{ change.fromValue }} ->
                                {{ change.toValue }}
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                {{ change.fromDocument }} -> {{ change.toDocument }}
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
                </v-card-text>
            </v-card>
        </template>
    </div>
</template>

<script setup lang="ts">
    import type { PropertyPoint } from '~/utils/collectionTypes';

    const { entities, documents, propertySeries } = useCollectionWorkspace();

    const selectedEntityId = ref<string | null>(null);

    const entitiesWithSeries = computed(() => {
        const eligible = new Set(propertySeries.value.map((series) => series.neid));
        return entities.value.filter((entity) => eligible.has(entity.neid));
    });

    const entityOptions = computed(() =>
        entitiesWithSeries.value.map((entity) => ({
            title: entity.name,
            value: entity.neid,
            subtitle: `${entity.flavor.replace(/_/g, ' ')} · ${entity.sourceDocuments.length} docs`,
        }))
    );

    const selectedEntity = computed(
        () => entities.value.find((entity) => entity.neid === selectedEntityId.value) ?? null
    );

    const selectedSeries = computed(() =>
        propertySeries.value.filter((series) => series.neid === selectedEntityId.value)
    );

    const sortedDocuments = computed(() =>
        [...documents.value].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    );

    const comparisonHeaders = computed(() => [
        { title: 'Property', key: 'propertyName', sortable: true, width: 220 },
        ...sortedDocuments.value.map((doc) => ({
            title: doc.date ? `${doc.title} (${doc.date})` : doc.title,
            key: doc.neid,
            sortable: false,
            minWidth: 150,
        })),
    ]);

    const comparisonRows = computed(() => {
        return selectedSeries.value.map((series) => {
            const row: Record<string, string> = {
                propertyName: series.propertyName,
            };
            for (const doc of sortedDocuments.value) {
                row[doc.neid] = valueAtDate(series.points, doc.date);
            }
            return row;
        });
    });

    const numericTrendCards = computed(() => {
        return selectedSeries.value
            .map((series) => {
                const numericPoints = series.points
                    .map((point) => ({
                        recordedAt: point.recordedAt,
                        value: toNumber(point.value),
                    }))
                    .filter((point) => point.value != null) as Array<{
                    recordedAt: string;
                    value: number;
                }>;
                if (numericPoints.length < 2) return null;
                numericPoints.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
                const first = numericPoints[0];
                const last = numericPoints[numericPoints.length - 1];
                const delta =
                    first.value === 0
                        ? 0
                        : ((last.value - first.value) / Math.abs(first.value)) * 100;
                return {
                    propertyName: series.propertyName,
                    latestDisplay: compactNumber(last.value),
                    delta,
                    firstDate: first.recordedAt.slice(0, 10),
                    lastDate: last.recordedAt.slice(0, 10),
                };
            })
            .filter(Boolean)
            .slice(0, 6) as Array<{
            propertyName: string;
            latestDisplay: string;
            delta: number;
            firstDate: string;
            lastDate: string;
        }>;
    });

    const notableChanges = computed(() => {
        const changes: Array<{
            key: string;
            propertyName: string;
            fromValue: string;
            toValue: string;
            fromDocument: string;
            toDocument: string;
        }> = [];
        for (const row of comparisonRows.value) {
            for (let i = 1; i < sortedDocuments.value.length; i += 1) {
                const prevDoc = sortedDocuments.value[i - 1];
                const nextDoc = sortedDocuments.value[i];
                const fromValue = row[prevDoc.neid] ?? '—';
                const toValue = row[nextDoc.neid] ?? '—';
                if (fromValue === toValue || fromValue === '—' || toValue === '—') continue;
                changes.push({
                    key: `${row.propertyName}-${prevDoc.neid}-${nextDoc.neid}`,
                    propertyName: row.propertyName,
                    fromValue,
                    toValue,
                    fromDocument: prevDoc.title,
                    toDocument: nextDoc.title,
                });
            }
        }
        return changes.slice(0, 12);
    });

    function valueAtDate(points: PropertyPoint[], date?: string): string {
        if (!date) return latestValue(points);
        const sorted = [...points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
        let candidate: PropertyPoint | null = null;
        for (const point of sorted) {
            if (!point.recordedAt) continue;
            if (point.recordedAt.slice(0, 10) <= date.slice(0, 10)) candidate = point;
        }
        if (!candidate && sorted.length) candidate = sorted[0];
        return candidate ? formatValue(candidate.value) : '—';
    }

    function latestValue(points: PropertyPoint[]): string {
        if (!points.length) return '—';
        const sorted = [...points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
        return formatValue(sorted[sorted.length - 1].value);
    }

    function formatValue(value: unknown): string {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'number') return compactNumber(value);
        return String(value);
    }

    function compactNumber(value: number): string {
        return Intl.NumberFormat('en-US', {
            notation: 'compact',
            maximumFractionDigits: 2,
        }).format(value);
    }

    function toNumber(value: unknown): number | null {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const numeric = Number(value.replace(/,/g, ''));
            return Number.isFinite(numeric) ? numeric : null;
        }
        return null;
    }

    function changeClass(row: Record<string, string>, documentNeid: string): string {
        const docIndex = sortedDocuments.value.findIndex((doc) => doc.neid === documentNeid);
        if (docIndex <= 0) return '';
        const prevDoc = sortedDocuments.value[docIndex - 1];
        const prevValue = row[prevDoc.neid];
        const currentValue = row[documentNeid];
        if (!prevValue || !currentValue || prevValue === currentValue) return '';
        return 'changed-value';
    }
</script>

<style scoped>
    .entity-selector {
        width: min(520px, 100%);
    }

    .trend-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .changed-value {
        font-weight: 600;
        color: rgb(var(--v-theme-primary));
    }
</style>
