<template>
    <v-chip :color="chipColor" size="small" variant="tonal" class="text-capitalize">
        {{ label }}
    </v-chip>
</template>

<script setup lang="ts">
    import type { ChangeSeverity } from '~/utils/temporalChanges';

    const props = defineProps<{
        severity: ChangeSeverity;
    }>();

    const label = computed(() => {
        if (props.severity === 'major') return 'Material';
        if (props.severity === 'moderate') return 'Watch';
        return 'Informational';
    });

    const chipColor = computed(() => {
        if (props.severity === 'major') return 'error';
        if (props.severity === 'moderate') return 'warning';
        return 'default';
    });
</script>
