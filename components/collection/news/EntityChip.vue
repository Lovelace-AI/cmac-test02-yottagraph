<template>
    <span :class="['entity-chip', `entity-chip--${tone}`]">{{ label }}</span>
</template>

<script setup lang="ts">
    defineProps<{
        label: string;
        tone?: 'primary' | 'secondary';
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

    .entity-chip--primary {
        border-color: color-mix(in srgb, var(--dynamic-primary) 42%, var(--app-divider));
        background: color-mix(in srgb, var(--dynamic-primary) 14%, transparent);
        color: color-mix(in srgb, var(--dynamic-primary) 80%, var(--dynamic-text-primary));
    }

    .entity-chip--secondary {
        border-color: color-mix(in srgb, var(--dynamic-secondary) 32%, var(--app-divider));
        background: color-mix(in srgb, var(--dynamic-secondary) 10%, transparent);
    }

    :global(:root[data-app-color-mode='dark']) .entity-chip {
        border-color: color-mix(in srgb, var(--app-divider) 60%, transparent);
        background: color-mix(in srgb, var(--dynamic-surface) 74%, var(--dynamic-background) 26%);
    }

    :global(:root[data-app-color-mode='dark']) .entity-chip--primary {
        border-color: color-mix(in srgb, var(--dynamic-primary) 30%, var(--app-divider));
        background: color-mix(in srgb, var(--dynamic-primary) 12%, var(--dynamic-surface));
    }

    :global(:root[data-app-color-mode='dark']) .entity-chip--secondary {
        border-color: color-mix(in srgb, var(--dynamic-secondary) 24%, var(--app-divider));
        background: color-mix(in srgb, var(--dynamic-secondary) 8%, var(--dynamic-surface));
    }
</style>
