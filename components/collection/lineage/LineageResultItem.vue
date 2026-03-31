<template>
    <v-card class="lineage-item" :class="[`mode-${viewMode}`]" variant="flat" rounded="lg">
        <v-card-text :class="viewMode === 'compact' ? 'py-2' : 'py-3'">
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
            <div
                class="text-body-2 mt-2 summary-text"
                :class="{ clamped: !expanded && viewMode === 'compact' }"
            >
                {{ result.summarySentence }}
            </div>
            <div
                class="text-caption text-medium-emphasis mt-1 detail-text"
                :class="{ clamped: !expanded && viewMode === 'compact' }"
            >
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
        viewMode: 'compact' | 'comfortable';
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
        transition:
            border-color 140ms ease,
            background-color 140ms ease;
    }

    .lineage-item:hover {
        border-color: rgba(var(--v-theme-on-surface), 0.2);
        background: rgba(var(--v-theme-surface), 0.95);
    }

    .mode-compact .summary-text.clamped,
    .mode-compact .detail-text.clamped {
        display: -webkit-box;
        -webkit-line-clamp: 1;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
</style>
