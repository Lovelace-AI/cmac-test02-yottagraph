<template>
    <v-card variant="outlined" class="mb-3">
        <v-card-item class="py-3">
            <v-card-title class="text-body-1">{{ group.metricLabel }}</v-card-title>
            <v-card-subtitle>
                {{ group.changes.length }} change{{ group.changes.length === 1 ? '' : 's' }} ·
                strongest move {{ strongestDelta }}
            </v-card-subtitle>
        </v-card-item>
        <v-card-text class="pt-0">
            <ChangeRow v-for="change in group.changes" :key="change.id" :change="change" />
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { MetricChangeGroup as MetricChangeGroupModel } from '~/utils/temporalChanges';

    const props = defineProps<{
        group: MetricChangeGroupModel;
    }>();

    const strongestDelta = computed(() => props.group.changes[0]?.deltaDisplay ?? 'N/A');
</script>
