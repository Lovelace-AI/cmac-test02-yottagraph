<template>
    <div class="d-flex align-start justify-space-between ga-3">
        <div class="min-w-0">
            <div class="text-caption text-medium-emphasis mb-1">Primary lineage statement</div>
            <div class="text-subtitle-1 font-weight-bold text-high-emphasis statement">
                {{ primaryStatement }}
            </div>
        </div>
        <div class="d-flex align-center ga-2 flex-shrink-0">
            <v-chip size="small" variant="outlined" class="confidence-chip">
                <span class="confidence-dot" :class="`confidence-${confidenceLabel}`" />
                Confidence: {{ confidenceText }}
            </v-chip>
            <v-tooltip location="top">
                <template #activator="{ props: tooltipProps }">
                    <v-btn
                        v-bind="tooltipProps"
                        size="x-small"
                        variant="text"
                        color="default"
                        icon="mdi-help-circle-outline"
                        aria-label="Why this confidence"
                    />
                </template>
                <span>{{ confidenceReason }}</span>
            </v-tooltip>
            <v-btn
                size="x-small"
                variant="text"
                color="primary"
                icon="mdi-content-copy"
                :aria-label="`Copy lineage statement ${primaryStatement}`"
                @click="emit('copy')"
            />
            <v-btn
                size="small"
                variant="text"
                color="primary"
                :append-icon="expanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                @click="emit('toggle')"
            >
                {{ expanded ? 'Hide evidence' : 'View evidence' }}
            </v-btn>
        </div>
    </div>
</template>

<script setup lang="ts">
    const props = defineProps<{
        primaryStatement: string;
        confidenceLabel: 'high' | 'medium' | 'low';
        confidenceReason: string;
        expanded: boolean;
    }>();

    const emit = defineEmits<{
        copy: [];
        toggle: [];
    }>();

    const confidenceText = computed(
        () => props.confidenceLabel.charAt(0).toUpperCase() + props.confidenceLabel.slice(1)
    );
</script>

<style scoped>
    .statement {
        line-height: 1.35;
        letter-spacing: 0.01em;
    }

    .confidence-chip {
        border-color: rgba(var(--v-theme-on-surface), 0.28);
        color: rgb(var(--v-theme-on-surface));
        background: rgba(var(--v-theme-surface), 0.65);
    }

    .confidence-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 6px;
    }

    .confidence-high {
        background: rgb(var(--v-theme-success));
    }

    .confidence-medium {
        background: rgb(var(--v-theme-info));
    }

    .confidence-low {
        background: rgb(var(--v-theme-warning));
    }
</style>
