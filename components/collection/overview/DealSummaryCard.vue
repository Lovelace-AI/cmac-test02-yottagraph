<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item class="pb-1">
            <v-card-title class="section-title">Deal Summary</v-card-title>
        </v-card-item>
        <v-card-text class="pt-0 pb-4">
            <div v-if="hasSummary" class="summary-grid">
                <div v-for="field in visibleFields" :key="field.label" class="summary-cell">
                    <div class="text-caption text-medium-emphasis text-uppercase">
                        {{ field.label }}
                    </div>
                    <div class="summary-value">{{ field.value }}</div>
                </div>
            </div>
            <div v-else class="empty-state">
                <p class="empty-copy">
                    Analysis has not produced a transaction summary yet. Run extraction to populate
                    issuer, structure, parties, and closing details.
                </p>
                <v-btn
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-play-circle-outline"
                    :disabled="status === 'processing'"
                    @click="$emit('run-analysis')"
                >
                    Run Initial Analysis
                </v-btn>
            </div>

            <div class="narrative-section">
                <div class="d-flex align-center justify-space-between ga-2 mb-2">
                    <div class="text-caption text-medium-emphasis text-uppercase">
                        Corpus Description
                    </div>
                    <div class="d-flex align-center ga-1 flex-wrap">
                        <v-btn
                            v-if="hasSummary"
                            size="x-small"
                            variant="text"
                            class="narrative-action"
                            :loading="isRegenerating"
                            :disabled="isRegenerating"
                            @click="$emit('regenerate')"
                        >
                            Refresh
                        </v-btn>
                        <v-chip
                            v-if="citationCount > 0"
                            size="x-small"
                            variant="tonal"
                            prepend-icon="mdi-file-document-outline"
                        >
                            {{ citationCount }} source references
                        </v-chip>
                    </div>
                </div>
                <template v-if="narrativeParagraphs.length">
                    <p
                        v-for="paragraph in narrativeParagraphs"
                        :key="paragraph"
                        class="text-body-2 mb-2 narrative-paragraph"
                    >
                        {{ paragraph }}
                    </p>
                </template>
                <p v-else class="empty-copy mb-0">
                    Run analysis to generate a short plain-language description of what this corpus
                    is about.
                </p>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { DealSummaryField } from '~/utils/overviewBriefing';
    import type { OverviewStatus } from '~/utils/overviewBriefing';

    const props = defineProps<{
        fields: DealSummaryField[];
        status: OverviewStatus;
        narrativeParagraphs: string[];
        citationCount: number;
        isRegenerating?: boolean;
    }>();

    defineEmits<{
        'run-analysis': [];
        regenerate: [];
    }>();

    const visibleFields = computed(() =>
        props.fields.filter((field) => {
            const value = String(field.value).trim();
            if (!value) return false;
            if (value === 'Not available') return false;
            if (value === 'Will populate after extraction') return false;
            if (value === 'Derived after deeper extraction') return false;
            return true;
        })
    );

    const hasSummary = computed(
        () =>
            (props.status === 'complete' || props.status === 'partial') &&
            visibleFields.value.length >= 3
    );
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

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 16px;
    }

    .summary-cell {
        border-bottom: 1px dashed var(--app-divider);
        padding-bottom: 8px;
    }

    .summary-value {
        margin-top: 4px;
        font-size: 0.86rem;
        line-height: 1.35;
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        min-height: 94px;
    }

    .empty-copy {
        margin: 0;
        font-size: 0.83rem;
        line-height: 1.4;
        color: var(--dynamic-text-secondary);
    }

    .narrative-section {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--app-divider);
    }

    .narrative-paragraph {
        line-height: 1.5;
        font-size: 0.86rem;
        color: var(--dynamic-text-primary);
    }

    .narrative-action {
        text-transform: none;
        letter-spacing: 0;
        border-radius: 999px;
        min-width: 0;
    }

    @media (max-width: 760px) {
        .summary-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
