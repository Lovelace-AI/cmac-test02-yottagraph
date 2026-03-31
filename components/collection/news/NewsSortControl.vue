<template>
    <div class="news-sort-control">
        <span class="label">Sort by</span>
        <v-btn-toggle
            :model-value="modelValue"
            density="compact"
            mandatory
            divided
            @update:model-value="emit('update:modelValue', $event)"
        >
            <v-btn
                v-for="option in options"
                :key="option.value"
                :value="option.value"
                size="x-small"
                class="sort-btn"
            >
                {{ option.label }}
            </v-btn>
        </v-btn-toggle>
    </div>
</template>

<script setup lang="ts">
    import type { NewsSortMode } from '~/composables/useCollectionWorkspace';

    defineProps<{
        modelValue: NewsSortMode;
    }>();

    const emit = defineEmits<{
        'update:modelValue': [value: NewsSortMode];
    }>();

    const options: Array<{ value: NewsSortMode; label: string }> = [
        { value: 'strongest_graph_connection', label: 'Strongest graph connection' },
        { value: 'most_graph_entities', label: 'Most graph entities' },
        { value: 'most_recent', label: 'Most recent' },
        { value: 'highest_relevance', label: 'Highest relevance' },
    ];
</script>

<style scoped>
    .news-sort-control {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .label {
        font-size: 0.74rem;
        color: var(--dynamic-text-muted);
    }

    .sort-btn {
        font-size: 0.7rem;
        text-transform: none;
        letter-spacing: normal;
    }
</style>
