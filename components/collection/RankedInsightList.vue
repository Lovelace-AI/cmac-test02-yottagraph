<template>
    <v-card variant="flat" class="ranked-list-card">
        <v-card-item>
            <v-card-title class="text-body-1">{{ title }}</v-card-title>
            <template #append>
                <span v-if="subtitle" class="text-caption text-medium-emphasis">{{
                    subtitle
                }}</span>
            </template>
        </v-card-item>
        <v-card-text class="pt-0">
            <div v-if="items.length === 0" class="text-body-2 text-medium-emphasis py-4">
                {{ emptyText }}
            </div>
            <v-list v-else density="comfortable" class="pa-0 bg-transparent">
                <v-list-item
                    v-for="(item, idx) in items"
                    :key="item.id"
                    class="px-0 app-click-target"
                    :append-icon="item.actionable ? 'mdi-chevron-right' : undefined"
                    :lines="item.description ? 'three' : 'two'"
                    @click="item.actionable ? emit('select', item.id) : undefined"
                >
                    <template #prepend>
                        <span class="text-caption rank-index mr-3">{{ idx + 1 }}</span>
                    </template>
                    <v-list-item-title class="text-body-2 font-weight-medium">
                        {{ item.title }}
                    </v-list-item-title>
                    <v-list-item-subtitle v-if="item.subtitle" class="text-wrap">
                        {{ item.subtitle }}
                    </v-list-item-subtitle>
                    <v-list-item-subtitle
                        v-if="item.description"
                        class="text-wrap text-medium-emphasis mt-1"
                    >
                        {{ item.description }}
                    </v-list-item-subtitle>
                    <template #append>
                        <span class="text-caption text-medium-emphasis ml-2">{{ item.meta }}</span>
                    </template>
                </v-list-item>
            </v-list>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    export interface RankedInsightItem {
        id: string;
        title: string;
        subtitle?: string;
        description?: string;
        meta?: string;
        actionable?: boolean;
    }

    defineProps<{
        title: string;
        subtitle?: string;
        items: RankedInsightItem[];
        emptyText?: string;
    }>();

    const emit = defineEmits<{
        select: [id: string];
    }>();
</script>

<style scoped>
    .ranked-list-card {
        border: 1px solid var(--app-divider);
    }

    .rank-index {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.35rem;
        height: 1.35rem;
        border-radius: 999px;
        background: var(--app-subtle-surface-2);
        font-weight: 700;
    }
</style>
