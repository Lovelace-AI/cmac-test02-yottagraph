<template>
    <span class="entity-chip">{{ label }}</span>
</template>

<script setup lang="ts">
    defineProps<{
        label: string;
    }>();
</script>

<style scoped>
    .entity-chip {
        display: inline-flex;
        align-items: center;
        border: 1px solid color-mix(in srgb, var(--app-divider) 84%, transparent);
        border-radius: 6px;
        color: var(--dynamic-text-secondary);
        font-size: 0.68rem;
        line-height: 1.1;
        padding: 2px 5px;
        background: color-mix(in srgb, var(--dynamic-surface) 86%, transparent);
    }

    :global(:root[data-app-color-mode='dark']) .entity-chip {
        border-color: color-mix(in srgb, var(--app-divider) 60%, transparent);
        background: color-mix(in srgb, var(--dynamic-surface) 74%, var(--dynamic-background) 26%);
    }
</style>
