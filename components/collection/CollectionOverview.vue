<template>
    <div>
        <!-- Deal summary header -->
        <v-card class="mb-4 deal-header" variant="flat">
            <v-card-text>
                <div class="d-flex align-start justify-space-between flex-wrap ga-4">
                    <div>
                        <div class="text-h5 font-headline mb-1">{{ meta.name }}</div>
                        <div class="text-body-2 text-medium-emphasis">{{ meta.description }}</div>
                        <div v-if="meta.lastRebuilt" class="text-caption text-medium-emphasis mt-1">
                            Last rebuilt: {{ new Date(meta.lastRebuilt).toLocaleString() }}
                        </div>
                    </div>
                    <div class="d-flex flex-wrap ga-2">
                        <div v-for="kpi in kpis" :key="kpi.label" class="kpi-card text-center pa-3">
                            <div class="text-h5 font-weight-bold" :class="kpi.color">
                                {{ kpi.value }}
                            </div>
                            <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
                        </div>
                    </div>
                </div>
            </v-card-text>
        </v-card>

        <v-row>
            <!-- Left column -->
            <v-col cols="12" lg="8">
                <!-- Entity distribution with actual names -->
                <v-card class="mb-4">
                    <v-card-item>
                        <v-card-title class="text-body-1">Entities by Type</v-card-title>
                        <template v-slot:append>
                            <span class="text-caption text-medium-emphasis"
                                >{{ entities.length }} total</span
                            >
                        </template>
                    </v-card-item>
                    <v-card-text>
                        <div
                            v-if="entities.length === 0"
                            class="text-body-2 text-medium-emphasis py-4 text-center"
                        >
                            Load the graph to see entity distribution.
                        </div>
                        <div v-else>
                            <div
                                v-for="[flavor, group] in groupedEntities"
                                :key="flavor"
                                class="flavor-group mb-3"
                            >
                                <div class="d-flex align-center ga-2 mb-1">
                                    <v-icon size="small" :color="flavorColor(flavor)">{{
                                        flavorIcon(flavor)
                                    }}</v-icon>
                                    <span class="text-body-2 font-weight-medium text-capitalize">
                                        {{ flavor.replace(/_/g, ' ') }}
                                    </span>
                                    <v-chip
                                        size="x-small"
                                        variant="tonal"
                                        :color="flavorColor(flavor)"
                                    >
                                        {{ group.length }}
                                    </v-chip>
                                </div>
                                <div class="d-flex flex-wrap ga-1 ml-6">
                                    <v-chip
                                        v-for="e in group.slice(0, 12)"
                                        :key="e.neid"
                                        size="x-small"
                                        variant="outlined"
                                        :color="flavorColor(flavor)"
                                        class="cursor-pointer entity-chip"
                                        :title="`${e.name} — appears in ${e.sourceDocuments.length} doc(s)`"
                                        @click="selectEntity(e.neid)"
                                    >
                                        {{ e.name }}
                                    </v-chip>
                                    <v-chip
                                        v-if="group.length > 12"
                                        size="x-small"
                                        variant="tonal"
                                        color="grey"
                                    >
                                        +{{ group.length - 12 }} more
                                    </v-chip>
                                </div>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- Relationship type summary -->
                <v-card class="mb-4">
                    <v-card-item>
                        <v-card-title class="text-body-1">Relationship Types</v-card-title>
                        <template v-slot:append>
                            <span class="text-caption text-medium-emphasis">
                                {{ relationships.length }} total edges
                            </span>
                        </template>
                    </v-card-item>
                    <v-card-text>
                        <div
                            v-if="relationships.length === 0"
                            class="text-body-2 text-medium-emphasis text-center py-4"
                        >
                            Load the graph to see relationships.
                        </div>
                        <div v-else>
                            <div
                                v-for="[relType, count] in sortedRelTypes"
                                :key="relType"
                                class="d-flex align-center ga-2 py-1"
                            >
                                <div
                                    class="rel-bar"
                                    :style="{
                                        width: `${(count / maxRelCount) * 140}px`,
                                        background: relTypeColor(relType),
                                    }"
                                />
                                <span class="text-body-2" style="min-width: 180px">
                                    {{
                                        relType
                                            .replace(/schema::relationship::/, '')
                                            .replace(/_/g, ' ')
                                    }}
                                </span>
                                <v-chip size="x-small" variant="tonal">{{ count }}</v-chip>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>

                <!-- Property highlights (fund account time series) -->
                <v-card v-if="propertySeries.length > 0" class="mb-4">
                    <v-card-item>
                        <v-card-title class="text-body-1">Property History</v-card-title>
                        <template v-slot:append>
                            <span class="text-caption text-medium-emphasis">
                                {{ propertySeries.length }} series across
                                {{ propertyEntityCount }} entities
                            </span>
                        </template>
                    </v-card-item>
                    <v-card-text>
                        <div v-for="group in propertyGroups" :key="group.neid" class="mb-4">
                            <div class="text-body-2 font-weight-medium mb-2">
                                {{ resolveEntityName(group.neid) }}
                            </div>
                            <v-table density="compact" class="property-table">
                                <thead>
                                    <tr>
                                        <th>Property</th>
                                        <th
                                            v-for="date in group.dates"
                                            :key="date"
                                            class="text-right"
                                        >
                                            {{ date.slice(0, 10) }}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="series in group.series" :key="series.propertyName">
                                        <td class="text-caption">
                                            {{ series.propertyName.replace(/_/g, ' ') }}
                                        </td>
                                        <td
                                            v-for="date in group.dates"
                                            :key="date"
                                            class="text-right text-caption"
                                        >
                                            {{ getPropertyValue(series, date) }}
                                        </td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <!-- Right column -->
            <v-col cols="12" lg="4">
                <!-- Source documents -->
                <v-card class="mb-4">
                    <v-card-item>
                        <v-card-title class="text-body-1">Source Documents</v-card-title>
                    </v-card-item>
                    <v-card-text class="pa-0">
                        <DocumentList />
                    </v-card-text>
                </v-card>

                <!-- Event highlights -->
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Key Events</v-card-title>
                        <template v-slot:append>
                            <span class="text-caption text-medium-emphasis"
                                >{{ events.length }} total</span
                            >
                        </template>
                    </v-card-item>
                    <v-card-text class="pa-0">
                        <div
                            v-if="events.length === 0"
                            class="text-body-2 text-medium-emphasis text-center py-6"
                        >
                            Load the graph to see events.
                        </div>
                        <v-list v-else density="compact" class="pa-0">
                            <v-list-item
                                v-for="evt in topEvents"
                                :key="evt.neid"
                                :subtitle="evt.date ? evt.date.slice(0, 10) : ''"
                                class="py-2"
                            >
                                <template v-slot:prepend>
                                    <v-chip
                                        v-if="evt.category"
                                        size="x-small"
                                        variant="tonal"
                                        color="orange"
                                        class="mr-2"
                                    >
                                        {{ evt.category }}
                                    </v-chip>
                                </template>
                                <template v-slot:title>
                                    <span class="text-body-2">{{ evt.name }}</span>
                                </template>
                                <template v-slot:append>
                                    <v-chip size="x-small" variant="tonal" color="grey">
                                        {{ evt.participantNeids.length }}p
                                    </v-chip>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
    import type { PropertySeriesRecord } from '~/utils/collectionTypes';

    const {
        meta,
        entities,
        events,
        relationships,
        propertySeries,
        isReady,
        selectEntity,
        resolveEntityName,
    } = useCollectionWorkspace();

    const kpis = computed(() => [
        { label: 'Entities', value: meta.value.entityCount, color: 'text-green' },
        { label: 'Events', value: meta.value.eventCount, color: 'text-orange' },
        { label: 'Edges', value: meta.value.relationshipCount, color: '' },
        { label: 'Agreements', value: meta.value.agreementCount, color: 'text-blue' },
        { label: 'Prop Series', value: propertySeries.value.length, color: 'text-purple' },
    ]);

    // Group entities by flavor, sorted by group size descending
    const groupedEntities = computed((): [string, typeof entities.value][] => {
        const map = new Map<string, typeof entities.value>();
        for (const e of entities.value) {
            const g = map.get(e.flavor) ?? [];
            g.push(e);
            map.set(e.flavor, g);
        }
        return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    });

    // Relationship type counts sorted descending (exclude appears_in from display top)
    const sortedRelTypes = computed(() => {
        const counts = new Map<string, number>();
        for (const r of relationships.value) {
            counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
        }
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    });

    const maxRelCount = computed(() => sortedRelTypes.value[0]?.[1] ?? 1);

    // Top 8 events by participant count
    const topEvents = computed(() =>
        [...events.value]
            .sort((a, b) => b.participantNeids.length - a.participantNeids.length)
            .slice(0, 8)
    );

    // Group property series by entity for table display
    const propertyEntityCount = computed(
        () => new Set(propertySeries.value.map((s) => s.neid)).size
    );

    interface PropertyGroup {
        neid: string;
        dates: string[];
        series: PropertySeriesRecord[];
    }

    const propertyGroups = computed((): PropertyGroup[] => {
        const byNeid = new Map<string, PropertySeriesRecord[]>();
        for (const s of propertySeries.value) {
            const g = byNeid.get(s.neid) ?? [];
            g.push(s);
            byNeid.set(s.neid, g);
        }
        return Array.from(byNeid.entries()).map(([neid, series]) => {
            const dateSet = new Set<string>();
            for (const s of series) {
                for (const p of s.points) {
                    dateSet.add(p.recordedAt.slice(0, 10));
                }
            }
            const dates = Array.from(dateSet).sort();
            return { neid, dates, series };
        });
    });

    function getPropertyValue(series: PropertySeriesRecord, date: string): string {
        const point = series.points.find((p) => p.recordedAt.startsWith(date));
        if (!point) return '—';
        const v = point.value;
        if (v === null || v === undefined) return '—';
        if (typeof v === 'number') return v.toLocaleString();
        return String(v);
    }

    function flavorIcon(flavor: string): string {
        const icons: Record<string, string> = {
            organization: 'mdi-domain',
            person: 'mdi-account',
            financial_instrument: 'mdi-bank',
            location: 'mdi-map-marker',
            fund_account: 'mdi-wallet',
            legal_agreement: 'mdi-file-document-outline',
        };
        return icons[flavor] ?? 'mdi-circle-small';
    }

    function flavorColor(flavor: string): string {
        const colors: Record<string, string> = {
            organization: 'primary',
            person: 'info',
            financial_instrument: 'warning',
            location: 'secondary',
            fund_account: 'success',
            legal_agreement: 'deep-purple',
        };
        return colors[flavor] ?? 'grey';
    }

    function relTypeColor(relType: string): string {
        const t = relType.replace(/schema::relationship::/, '');
        if (['fund_of', 'holds_investment', 'advisor_to', 'sponsor_of'].includes(t))
            return '#66BB6A';
        if (['predecessor_of', 'successor_to', 'works_at'].includes(t)) return '#78909C';
        if (['trustee_of', 'borrower_of', 'beneficiary_of', 'issuer_of', 'party_to'].includes(t))
            return '#42A5F5';
        if (['located_at'].includes(t)) return '#FFA726';
        if (['appears_in'].includes(t)) return '#9E9E9E';
        if (['participant'].includes(t)) return '#AB47BC';
        return '#9E9E9E';
    }
</script>

<style scoped>
    .deal-header {
        background: linear-gradient(135deg, rgba(0, 59, 255, 0.06) 0%, rgba(63, 234, 0, 0.04) 100%);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .kpi-card {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        min-width: 80px;
    }

    .rel-bar {
        height: 8px;
        border-radius: 4px;
        min-width: 4px;
        transition: width 0.3s ease;
    }

    .entity-chip {
        cursor: pointer;
    }

    .property-table {
        font-size: 0.75rem;
    }

    .property-table :deep(th),
    .property-table :deep(td) {
        padding: 4px 8px !important;
        font-size: 0.72rem !important;
    }
</style>
