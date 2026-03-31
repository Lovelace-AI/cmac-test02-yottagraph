<template>
    <div class="filter-bar">
        <button
            v-for="option in options"
            :key="`filter:${option}`"
            type="button"
            :class="['filter-chip', { 'filter-chip--active': modelValue.includes(option) }]"
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
    }>();

    const emit = defineEmits<{
        'update:modelValue': [value: string[]];
    }>();

    function toggle(option: string): void {
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
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 2px;
    }

    .filter-chip {
        border: 1px solid var(--app-divider);
        border-radius: 999px;
        background: color-mix(in srgb, var(--dynamic-surface) 86%, transparent);
        color: var(--dynamic-text-secondary);
        font-size: 0.74rem;
        line-height: 1;
        padding: 6px 10px;
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
        background: color-mix(in srgb, var(--dynamic-primary) 14%, var(--dynamic-surface));
    }
</style>
