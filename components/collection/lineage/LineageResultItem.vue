<template>
    <v-card class="lineage-item" variant="flat" rounded="lg">
        <v-card-text class="py-3">
            <LineageHeader
                :primary-statement="result.primaryStatement"
                :confidence-label="result.confidenceLabel"
                :confidence-reason="result.confidenceReason"
                :expanded="expanded"
                @toggle="expanded = !expanded"
                @copy="copyLineageStatement"
            />
            <div class="mt-2">
                <LineageMetaRow
                    :relationship-type-label="result.relationshipTypeLabel"
                    :effective-date-label="result.effectiveDateLabel"
                    :support-label="result.supportLabel"
                    :evidence-mode-label="result.evidenceModeLabel"
                />
            </div>
            <div class="text-body-2 mt-2">
                {{ result.summarySentence }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
                {{ result.explanationSentence }}
            </div>
            <LineageEvidencePanel v-if="expanded" :result="result" />
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { LineageResultViewModel } from '~/utils/collectionTypes';

    const props = defineProps<{
        result: LineageResultViewModel;
    }>();

    const expanded = ref(false);

    async function copyLineageStatement(): Promise<void> {
        if (!navigator?.clipboard) return;
        await navigator.clipboard.writeText(props.result.primaryStatement);
    }
</script>

<style scoped>
    .lineage-item {
        border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
        background: rgba(var(--v-theme-surface), 0.85);
    }
</style>
