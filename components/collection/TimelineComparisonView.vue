<template>
    <div class="timeline-comparison">
        <v-alert type="info" variant="tonal" class="mb-3">
            Compare how key properties change across document dates. Start by selecting an entity,
            then use search and "Changes only" to focus the matrix.
        </v-alert>
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
                <v-chip v-if="selectedEntity" size="small" variant="tonal" color="primary">
                    {{ prettyFlavor(selectedEntity.flavor) }}
                </v-chip>
                <v-chip v-if="selectedEntity" size="small" variant="outlined">
                    {{ comparisonRows.length }} properties
                </v-chip>
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
                        <div class="text-caption text-medium-emphasis">
                            {{ formatPropertyName(card.propertyName) }}
                        </div>
                        <div class="text-body-1 font-weight-medium">{{ card.latestDisplay }}</div>
                        <svg
                            class="trend-sparkline my-1"
                            viewBox="0 0 100 30"
                            role="img"
                            aria-hidden="true"
                        >
                            <polyline
                                :points="sparklinePoints(card.seriesValues)"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                :class="card.delta >= 0 ? 'sparkline-up' : 'sparkline-down'"
                            />
                        </svg>
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
                <v-card-text class="pt-0 pb-2 d-flex align-center ga-2 flex-wrap">
                    <v-text-field
                        v-model="propertySearch"
                        label="Filter properties"
                        density="compact"
                        variant="outlined"
                        hide-details
                        clearable
                        class="property-search"
                        prepend-inner-icon="mdi-magnify"
                    />
                    <v-switch
                        v-model="showChangesOnly"
                        hide-details
                        density="compact"
                        color="primary"
                        label="Changes only"
                    />
                    <v-chip size="small" variant="tonal">
                        {{ filteredComparisonRows.length }} shown
                    </v-chip>
                </v-card-text>
                <v-card-text v-if="propertyGroups.length" class="pt-0 pb-2">
                    <div class="text-caption text-medium-emphasis mb-2">
                        Property groups (collapse to hide from matrix)
                    </div>
                    <v-expansion-panels
                        v-model="expandedPropertyGroups"
                        multiple
                        variant="accordion"
                        density="compact"
                        class="property-groups"
                    >
                        <v-expansion-panel
                            v-for="group in propertyGroups"
                            :key="group.key"
                            :value="group.key"
                        >
                            <v-expansion-panel-title>
                                <div class="d-flex align-center justify-space-between w-100 pr-2">
                                    <span>{{ group.label }}</span>
                                    <v-chip size="x-small" variant="tonal">
                                        {{ group.rows.length }}
                                    </v-chip>
                                </div>
                            </v-expansion-panel-title>
                            <v-expansion-panel-text>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip
                                        v-for="row in group.rows.slice(0, 8)"
                                        :key="`${group.key}:${row.propertyName}`"
                                        size="x-small"
                                        variant="outlined"
                                        class="app-chip-button"
                                        @click="
                                            propertySearch = formatPropertyName(row.propertyName)
                                        "
                                    >
                                        {{ formatPropertyName(row.propertyName) }}
                                    </v-chip>
                                    <span
                                        v-if="group.rows.length > 8"
                                        class="text-caption text-medium-emphasis"
                                    >
                                        +{{ group.rows.length - 8 }} more
                                    </span>
                                </div>
                            </v-expansion-panel-text>
                        </v-expansion-panel>
                    </v-expansion-panels>
                </v-card-text>
                <v-card-text class="pa-0">
                    <v-data-table
                        :headers="comparisonHeaders"
                        :items="filteredComparisonRows"
                        density="compact"
                        hover
                        fixed-header
                        height="420"
                    >
                        <template v-slot:item.propertyName="{ item }">
                            <span class="font-weight-medium">{{
                                formatPropertyName(item.propertyName)
                            }}</span>
                        </template>
                        <template
                            v-for="doc in sortedDocuments"
                            v-slot:[`item.${doc.neid}`]="{ item }"
                            :key="doc.neid"
                        >
                            <span :class="changeClass(item, doc.neid)">
                                {{ item[doc.neid] ?? '' }}
                            </span>
                        </template>
                    </v-data-table>
                </v-card-text>
            </v-card>

            <v-card class="mb-3">
                <v-card-item>
                    <v-card-title class="text-body-1">Top 5 Biggest Changes</v-card-title>
                    <v-card-subtitle>
                        Largest absolute percentage moves across the selected date range.
                    </v-card-subtitle>
                </v-card-item>
                <v-card-text>
                    <v-alert v-if="!biggestChanges.length" type="info" variant="tonal">
                        Not enough numeric history to rank biggest changes for this entity.
                    </v-alert>
                    <v-list v-else density="comfortable" class="pa-0">
                        <v-list-item
                            v-for="(change, index) in biggestChanges"
                            :key="change.propertyName"
                            class="px-0"
                        >
                            <template #prepend>
                                <v-avatar size="22" color="primary" variant="tonal">
                                    {{ index + 1 }}
                                </v-avatar>
                            </template>
                            <v-list-item-title class="d-flex align-center ga-2 flex-wrap">
                                <span class="font-weight-medium">{{
                                    formatPropertyName(change.propertyName)
                                }}</span>
                                <v-chip
                                    size="x-small"
                                    :color="change.delta >= 0 ? 'success' : 'error'"
                                    variant="tonal"
                                >
                                    {{ change.delta >= 0 ? '+' : '' }}{{ change.delta.toFixed(1) }}%
                                </v-chip>
                            </v-list-item-title>
                            <v-list-item-subtitle>
                                {{ change.firstDate }} -> {{ change.lastDate }} ·
                                {{ change.latestDisplay }}
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
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

    const { documentEntities: entities, documents, propertySeries } = useCollectionWorkspace();

    const selectedEntityId = ref<string | null>(null);
    const propertySearch = ref('');
    const showChangesOnly = ref(false);
    const expandedPropertyGroups = ref<string[]>([]);

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

    watch(
        entityOptions,
        (options) => {
            if (selectedEntityId.value) return;
            if (!options.length) return;
            selectedEntityId.value = options[0].value;
        },
        { immediate: true }
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
            title: documentHeaderTitle(doc),
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
    const propertyGroups = computed(() => {
        const grouped = new Map<string, Array<Record<string, string>>>();
        for (const row of comparisonRows.value) {
            const key = propertyGroupKey(row.propertyName);
            const bucket = grouped.get(key) ?? [];
            bucket.push(row);
            grouped.set(key, bucket);
        }
        return Array.from(grouped.entries())
            .map(([key, rows]) => ({
                key,
                label: key,
                rows: rows.sort((a, b) => a.propertyName.localeCompare(b.propertyName)),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });
    watch(
        propertyGroups,
        (groups) => {
            if (!groups.length) {
                expandedPropertyGroups.value = [];
                return;
            }
            const allowed = new Set(groups.map((group) => group.key));
            const retained = expandedPropertyGroups.value.filter((key) => allowed.has(key));
            if (retained.length === 0) {
                expandedPropertyGroups.value = groups.map((group) => group.key);
                return;
            }
            if (retained.length !== expandedPropertyGroups.value.length) {
                expandedPropertyGroups.value = retained;
            }
        },
        { immediate: true }
    );
    const filteredComparisonRows = computed(() => {
        const query = propertySearch.value.trim().toLowerCase();
        const activeGroups = new Set(expandedPropertyGroups.value);
        return comparisonRows.value.filter((row) => {
            if (activeGroups.size > 0 && !activeGroups.has(propertyGroupKey(row.propertyName)))
                return false;
            const searchable =
                `${row.propertyName} ${formatPropertyName(row.propertyName)}`.toLowerCase();
            if (query && !searchable.includes(query)) return false;
            if (!showChangesOnly.value) return true;
            return rowHasChange(row);
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
                    seriesValues: numericPoints.map((point) => point.value),
                };
            })
            .filter(Boolean)
            .slice(0, 6) as Array<{
            propertyName: string;
            latestDisplay: string;
            delta: number;
            firstDate: string;
            lastDate: string;
            seriesValues: number[];
        }>;
    });
    const biggestChanges = computed(() =>
        [...numericTrendCards.value]
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
            .slice(0, 5)
    );

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
                const fromValue = row[prevDoc.neid] ?? '';
                const toValue = row[nextDoc.neid] ?? '';
                if (fromValue === toValue || fromValue === '' || toValue === '') continue;
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
        return candidate ? formatValue(candidate.value) : '';
    }

    function latestValue(points: PropertyPoint[]): string {
        if (!points.length) return '';
        const sorted = [...points].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
        return formatValue(sorted[sorted.length - 1].value);
    }

    function formatValue(value: unknown): string {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return compactNumber(value);
        const text = String(value).trim();
        if (!text || text.toLowerCase() === 'null' || text.toLowerCase() === 'undefined') return '';
        return text;
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

    function rowHasChange(row: Record<string, string>): boolean {
        for (let i = 1; i < sortedDocuments.value.length; i += 1) {
            const previous = row[sortedDocuments.value[i - 1].neid] ?? '';
            const current = row[sortedDocuments.value[i].neid] ?? '';
            if (!previous || !current) continue;
            if (previous !== current) return true;
        }
        return false;
    }

    function formatPropertyName(name: string): string {
        return name.replace(/\+/g, ' plus ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function documentHeaderTitle(doc: { title: string; date?: string }): string {
        return doc.date ? doc.date.slice(0, 10) : doc.title;
    }

    function prettyFlavor(flavor: string): string {
        return flavor.replace(/_/g, ' ');
    }

    function propertyGroupKey(name: string): string {
        if (name.startsWith('sources_of_funds')) return 'Sources of funds';
        if (name.startsWith('uses_of_funds')) return 'Uses of funds';
        if (name.startsWith('balance')) return 'Balances';
        if (name.startsWith('current_valuation')) return 'Valuation';
        if (name.startsWith('gross_earnings')) return 'Earnings';
        if (name.startsWith('excess_earnings')) return 'Earnings';
        if (name.startsWith('internal_rate_of_return')) return 'Returns';
        const parts = name.split('_').filter(Boolean);
        if (parts.length >= 2) return formatPropertyName(parts.slice(0, 2).join('_'));
        return formatPropertyName(name);
    }

    function sparklinePoints(values: number[]): string {
        if (!values.length) return '';
        if (values.length === 1) return '0,15 100,15';
        const min = Math.min(...values);
        const max = Math.max(...values);
        const span = max - min || 1;
        return values
            .map((value, index) => {
                const x = (index / (values.length - 1)) * 100;
                const y = 26 - ((value - min) / span) * 22;
                return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ');
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

    .property-search {
        width: min(360px, 100%);
    }

    .property-groups :deep(.v-expansion-panel-title) {
        min-height: 40px;
    }

    .changed-value {
        font-weight: 600;
        color: rgb(var(--v-theme-primary));
    }

    .trend-sparkline {
        width: 100%;
        height: 36px;
        color: rgb(var(--v-theme-primary));
    }

    .sparkline-up {
        stroke: rgb(var(--v-theme-success));
    }

    .sparkline-down {
        stroke: rgb(var(--v-theme-error));
    }
</style>
