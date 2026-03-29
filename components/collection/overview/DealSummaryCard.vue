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
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { DealSummaryField } from '~/utils/overviewBriefing';
    import type { OverviewStatus } from '~/utils/overviewBriefing';

    const props = defineProps<{
        fields: DealSummaryField[];
        status: OverviewStatus;
    }>();

    defineEmits<{
        'run-analysis': [];
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

    @media (max-width: 760px) {
        .summary-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
