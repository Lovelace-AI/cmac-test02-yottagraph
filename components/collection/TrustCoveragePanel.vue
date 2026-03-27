<template>
    <v-card variant="flat" class="trust-card">
        <v-card-item>
            <v-card-title class="text-body-1">Trust & Coverage</v-card-title>
            <template #append>
                <v-chip size="small" :color="confidenceColor" variant="tonal">
                    {{ summary.confidenceLabel }} confidence
                </v-chip>
            </template>
        </v-card-item>
        <v-card-text class="pt-0">
            <div class="text-caption text-medium-emphasis mb-2">{{ summary.confidenceReason }}</div>
            <div class="mb-3">
                <div class="d-flex justify-space-between text-caption mb-1">
                    <span>Coverage score</span>
                    <span class="font-weight-medium">{{ summary.coverageScore }}%</span>
                </div>
                <v-progress-linear :model-value="summary.coverageScore" rounded color="primary" />
            </div>
            <v-row dense class="mb-2">
                <v-col cols="6">
                    <div class="text-caption text-medium-emphasis">Source-backed links</div>
                    <div class="text-body-2 font-weight-medium">
                        {{ summary.evidenceBackedRelationships }}
                    </div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-medium-emphasis">Inferred links</div>
                    <div class="text-body-2 font-weight-medium">
                        {{ summary.inferredRelationships }}
                    </div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-medium-emphasis">Source coverage</div>
                    <div class="text-body-2 font-weight-medium">
                        {{ summary.sourceCoverageShare }}%
                    </div>
                </v-col>
                <v-col cols="6">
                    <div class="text-caption text-medium-emphasis">Enriched share</div>
                    <div class="text-body-2 font-weight-medium">
                        {{ summary.enrichedEntityShare }}%
                    </div>
                </v-col>
            </v-row>
            <v-list density="compact" class="pa-0 bg-transparent">
                <v-list-item v-for="note in notes" :key="note" class="px-0">
                    <template #prepend>
                        <v-icon size="14" color="primary" class="mr-2"
                            >mdi-check-circle-outline</v-icon
                        >
                    </template>
                    <v-list-item-title class="text-caption text-wrap">{{ note }}</v-list-item-title>
                </v-list-item>
            </v-list>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { TrustCoverageSummary } from '~/composables/useCollectionWorkspace';

    const props = defineProps<{
        summary: TrustCoverageSummary;
        notes: string[];
    }>();

    const confidenceColor = computed(() => {
        if (props.summary.confidenceLabel === 'high') return 'success';
        if (props.summary.confidenceLabel === 'low') return 'warning';
        return 'info';
    });
</script>

<style scoped>
    .trust-card {
        border: 1px solid var(--app-divider);
    }
</style>
