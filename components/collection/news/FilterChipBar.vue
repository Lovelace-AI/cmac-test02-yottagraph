<template>
    <div class="filter-bar">
        <button
            v-for="option in options"
            :key="`filter:${option}`"
            type="button"
            :class="[
                'filter-chip',
                {
                    'filter-chip--active': modelValue.includes(option),
                    'filter-chip--loading': loading && modelValue.includes(option),
                },
            ]"
            :disabled="disabled"
            @click="toggle(option)"
        >
            {{ option }}
        </button>
    </div>
</template>

<script setup lang="ts">
    const props = defineProps<{
        modelValue: string[];
        options: string[];
        loading?: boolean;
        disabled?: boolean;
    }>();

    const emit = defineEmits<{
        'update:modelValue': [value: string[]];
    }>();

    function toggle(option: string): void {
        if (props.disabled) return;
        const exists = props.modelValue.includes(option);
        if (exists) {
            emit(
                'update:modelValue',
                props.modelValue.filter((item) => item !== option)
            );
            return;
        }
        emit('update:modelValue', [...props.modelValue, option]);
    }
</script>

<style scoped>
    .filter-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 2px;
    }

    .filter-chip {
        border: 1px solid color-mix(in srgb, var(--app-divider) 86%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--dynamic-surface) 86%, transparent);
        color: var(--dynamic-text-secondary);
        font-size: 0.71rem;
        line-height: 1;
        padding: 5px 8px;
        white-space: nowrap;
        transition:
            background-color 0.15s ease,
            border-color 0.15s ease,
            color 0.15s ease;
    }

    .filter-chip:hover {
        border-color: var(--app-divider-strong);
        background: color-mix(in srgb, var(--dynamic-surface) 70%, var(--dynamic-hover) 30%);
        color: var(--dynamic-text-primary);
    }

    .filter-chip:focus-visible {
        outline: 2px solid var(--app-focus-ring);
        outline-offset: 2px;
        box-shadow: 0 0 0 3px var(--app-focus-ring-shadow);
    }

    .filter-chip--active {
        border-color: color-mix(in srgb, var(--dynamic-primary) 44%, var(--app-divider));
        color: var(--dynamic-text-primary);
        background: color-mix(in srgb, var(--dynamic-primary) 11%, var(--dynamic-surface));
    }

    .filter-chip--loading {
        position: relative;
        overflow: hidden;
    }

    .filter-chip--loading::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in srgb, var(--dynamic-primary) 18%, transparent) 50%,
            transparent 100%
        );
        animation: chipPulse 1.2s linear infinite;
    }

    @keyframes chipPulse {
        0% {
            transform: translateX(-50%);
        }
        100% {
            transform: translateX(50%);
        }
    }

    :global(:root[data-app-color-mode='dark']) .filter-chip {
        border-color: color-mix(in srgb, var(--app-divider) 60%, transparent);
        background: color-mix(in srgb, var(--dynamic-surface) 72%, var(--dynamic-background) 28%);
    }

    :global(:root[data-app-color-mode='dark']) .filter-chip--active {
        border-color: color-mix(in srgb, var(--dynamic-primary) 28%, var(--app-divider));
        background: color-mix(in srgb, var(--dynamic-primary) 10%, var(--dynamic-surface));
    }
</style>
