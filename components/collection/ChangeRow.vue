<template>
    <div class="change-row py-2 px-2">
        <div class="d-flex align-start justify-space-between ga-3 flex-wrap">
            <div class="row-primary">
                <div class="metric-title text-body-2 text-medium-emphasis mb-1">
                    {{ change.metricLabel }}
                </div>
                <div class="d-flex align-center ga-2 flex-wrap">
                    <span class="text-body-1 font-weight-bold" :class="directionClass">
                        {{ change.deltaDisplay }}
                    </span>
                    <v-chip size="x-small" variant="tonal" color="default" class="text-capitalize">
                        {{ directionLabel }}
                    </v-chip>
                    <span
                        v-if="change.percentDeltaDisplay"
                        class="text-caption text-medium-emphasis"
                    >
                        {{ change.percentDeltaDisplay }}
                    </span>
                </div>
            </div>
            <div class="d-flex align-center ga-2">
                <ChangeSeverityBadge :severity="change.severity" />
                <v-btn
                    size="x-small"
                    variant="text"
                    :icon="showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                    @click="showDetails = !showDetails"
                />
            </div>
        </div>

        <div class="text-body-2 mt-2 from-to-line">
            {{ change.fromDisplay }} → {{ change.toDisplay }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
            {{ change.periodLabel }}
        </div>
        <div class="text-caption mt-1">
            {{ change.interpretation }}
        </div>

        <v-expand-transition>
            <ChangeDetailsPanel v-if="showDetails" :change="change" />
        </v-expand-transition>
    </div>
</template>

<script setup lang="ts">
    import type { TemporalChangeEntry } from '~/utils/temporalChanges';

    const props = defineProps<{
        change: TemporalChangeEntry;
    }>();

    const showDetails = ref(false);

    const directionLabel = computed(() => {
        if (props.change.direction === 'increase') return 'Increase';
        if (props.change.direction === 'decrease') return 'Decrease';
        if (props.change.direction === 'flat') return 'No material change';
        return 'Informational';
    });

    const directionClass = computed(() => {
        if (props.change.direction === 'increase') return 'direction-up';
        if (props.change.direction === 'decrease') return 'direction-down';
        return 'direction-neutral';
    });
</script>

<style scoped>
    .change-row {
        border-radius: 10px;
    }

    .row-primary {
        min-width: 0;
        flex: 1 1 360px;
    }

    .metric-title {
        font-weight: 600;
        line-height: 1.25;
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .from-to-line {
        line-height: 1.3;
        white-space: normal;
        overflow-wrap: anywhere;
    }

    .change-row + .change-row {
        border-top: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 10%, transparent);
    }

    .direction-up {
        color: color-mix(in srgb, rgb(var(--v-theme-primary)) 80%, rgb(var(--v-theme-success)) 20%);
    }

    .direction-down {
        color: color-mix(in srgb, rgb(var(--v-theme-primary)) 80%, rgb(var(--v-theme-warning)) 20%);
    }

    .direction-neutral {
        color: rgb(var(--v-theme-on-surface));
    }
</style>
