<template>
    <div class="d-flex flex-column ga-3">
        <v-card class="lineage-controls" variant="flat" rounded="lg">
            <v-card-text class="py-3">
                <v-row dense>
                    <v-col cols="12" md="3">
                        <v-select
                            v-model="sortBy"
                            :items="sortOptions"
                            label="Sort by"
                            density="compact"
                            variant="outlined"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="12" md="2">
                        <v-btn-toggle
                            v-model="viewMode"
                            divided
                            density="comfortable"
                            mandatory
                            color="primary"
                            class="w-100"
                        >
                            <v-btn value="compact" size="small">Compact</v-btn>
                            <v-btn value="comfortable" size="small">Detail</v-btn>
                        </v-btn-toggle>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-select
                            v-model="relationshipFilter"
                            :items="relationshipTypeOptions"
                            label="Relationship type"
                            density="compact"
                            variant="outlined"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="12" md="3">
                        <v-select
                            v-model="evidenceFilter"
                            :items="evidenceModeOptions"
                            label="Evidence mode"
                            density="compact"
                            variant="outlined"
                            hide-details
                        />
                    </v-col>
                    <v-col cols="12" md="2" class="d-flex align-center">
                        <div class="text-caption text-medium-emphasis">
                            {{ filteredAndSortedResults.length }} relationships
                        </div>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <v-alert v-if="loading" type="info" variant="tonal">
            Investigating relationship-backed lineage...
        </v-alert>
        <v-alert v-else-if="!filteredAndSortedResults.length" type="info" variant="tonal">
            No lineage relationships match the selected filters.
        </v-alert>
        <LineageResultItem
            v-for="result in filteredAndSortedResults"
            v-else
            :key="result.id"
            :result="result"
            :view-mode="viewMode"
        />
    </div>
</template>

<script setup lang="ts">
    import type { LineageResultViewModel } from '~/utils/collectionTypes';

    type SortKey = 'support' | 'recent' | 'confidence' | 'alphabetical';

    const props = defineProps<{
        results: LineageResultViewModel[];
        loading?: boolean;
    }>();

    const viewMode = ref<'compact' | 'comfortable'>('compact');
    const sortBy = ref<SortKey>('support');
    const relationshipFilter = ref('all');
    const evidenceFilter = ref('all');

    const sortOptions: Array<{ title: string; value: SortKey }> = [
        { title: 'Most supported', value: 'support' },
        { title: 'Most recent', value: 'recent' },
        { title: 'Confidence', value: 'confidence' },
        { title: 'Alphabetical', value: 'alphabetical' },
    ];

    const evidenceModeOptions = [
        { title: 'All evidence modes', value: 'all' },
        { title: 'Direct document evidence', value: 'direct_document' },
        { title: 'Graph-enriched relationship', value: 'graph_enriched' },
    ];

    const relationshipTypeOptions = computed(() => [
        { title: 'All relationship types', value: 'all' },
        ...Array.from(new Set(props.results.map((item) => item.relationshipTypeLabel)))
            .sort((a, b) => a.localeCompare(b))
            .map((label) => ({ title: label, value: label })),
    ]);

    const confidenceWeight = (label: LineageResultViewModel['confidenceLabel']): number => {
        if (label === 'high') return 3;
        if (label === 'medium') return 2;
        return 1;
    };

    const dateWeight = (value: string | null): number => {
        if (!value) return 0;
        const direct = Date.parse(value);
        if (!Number.isNaN(direct)) return direct;
        const yearMatch = value.match(/(19|20)\d{2}/);
        if (!yearMatch) return 0;
        return Number(yearMatch[0]) * 1000;
    };

    const filteredAndSortedResults = computed(() => {
        const filtered = props.results.filter((item) => {
            if (
                relationshipFilter.value !== 'all' &&
                item.relationshipTypeLabel !== relationshipFilter.value
            ) {
                return false;
            }
            if (evidenceFilter.value !== 'all' && item.evidenceMode !== evidenceFilter.value) {
                return false;
            }
            return true;
        });

        return filtered.slice().sort((a, b) => {
            if (sortBy.value === 'support') {
                if (b.supportCount !== a.supportCount) return b.supportCount - a.supportCount;
                return confidenceWeight(b.confidenceLabel) - confidenceWeight(a.confidenceLabel);
            }
            if (sortBy.value === 'recent') {
                const dateDelta =
                    dateWeight(b.effectiveDateLabel) - dateWeight(a.effectiveDateLabel);
                if (dateDelta !== 0) return dateDelta;
                return b.supportCount - a.supportCount;
            }
            if (sortBy.value === 'confidence') {
                const confidenceDelta =
                    confidenceWeight(b.confidenceLabel) - confidenceWeight(a.confidenceLabel);
                if (confidenceDelta !== 0) return confidenceDelta;
                return b.supportCount - a.supportCount;
            }
            return a.primaryStatement.localeCompare(b.primaryStatement);
        });
    });
</script>

<style scoped>
    .lineage-controls {
        border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
        background: rgba(var(--v-theme-surface), 0.8);
    }
</style>
