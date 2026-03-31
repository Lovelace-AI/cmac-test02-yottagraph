<template>
    <div class="details-panel pa-3 mt-2 rounded">
        <div class="text-caption text-medium-emphasis mb-2">Comparison details</div>
        <div class="text-body-2 mb-1">
            <span class="font-weight-medium">Source:</span>
            {{ change.fromDocument }}
        </div>
        <div class="text-body-2 mb-1">
            <span class="font-weight-medium">Target:</span>
            {{ change.toDocument }}
        </div>
        <div v-if="change.sourceRecordedAt || change.targetRecordedAt" class="text-body-2 mb-1">
            <span class="font-weight-medium">Recorded at:</span>
            {{ change.sourceRecordedAt || 'N/A' }} → {{ change.targetRecordedAt || 'N/A' }}
        </div>
        <div class="text-body-2">
            <span class="font-weight-medium">Raw:</span>
            {{ String(change.fromValue) }} → {{ String(change.toValue) }}
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { TemporalChangeEntry } from '~/utils/temporalChanges';

    defineProps<{
        change: TemporalChangeEntry;
    }>();
</script>

<style scoped>
    .details-panel {
        border: 1px solid color-mix(in srgb, rgb(var(--v-theme-on-surface)) 10%, transparent);
        background: color-mix(
            in srgb,
            rgb(var(--v-theme-surface)) 92%,
            rgb(var(--v-theme-primary)) 8%
        );
    }
</style>
