<template>
    <div v-if="active" class="filter-loading-state">
        <v-progress-circular indeterminate size="14" width="2" color="primary" />
        <span>{{ label }}</span>
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        active: boolean;
        label?: string;
    }>();
</script>

<style scoped>
    .filter-loading-state {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.73rem;
        color: var(--dynamic-text-muted);
    }
</style>
