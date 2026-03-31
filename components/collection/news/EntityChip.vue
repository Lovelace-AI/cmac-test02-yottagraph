<template>
    <v-chip size="x-small" variant="outlined" class="entity-chip">
        {{ label }}
    </v-chip>
</template>

<script setup lang="ts">
    defineProps<{
        label: string;
    }>();
</script>

<style scoped>
    .entity-chip {
        border-color: var(--app-divider);
        color: var(--dynamic-text-secondary);
        background: color-mix(in srgb, var(--dynamic-surface) 86%, transparent);
    }
</style>
