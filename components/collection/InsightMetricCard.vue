<template>
    <v-card class="metric-card" variant="flat">
        <v-card-text class="pa-3">
            <div class="text-caption text-medium-emphasis">{{ label }}</div>
            <div class="d-flex align-end ga-2 mt-1">
                <div class="text-h5 font-weight-bold">{{ value }}</div>
                <div v-if="hint" class="text-caption text-medium-emphasis">{{ hint }}</div>
            </div>
            <div v-if="description" class="text-caption mt-2 app-visually-muted">
                {{ description }}
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    defineProps<{
        label: string;
        value: string | number;
        hint?: string;
        description?: string;
    }>();
</script>

<style scoped>
    .metric-card {
        border: 1px solid var(--app-divider);
        background: var(--app-subtle-surface-2);
    }
</style>
