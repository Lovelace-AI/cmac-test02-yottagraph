<template>
    <v-card variant="flat" class="action-strip-card">
        <v-card-item>
            <v-card-title class="text-body-1">Start With A Task</v-card-title>
            <v-card-subtitle>Choose the next analytical step.</v-card-subtitle>
        </v-card-item>
        <v-card-text class="pt-0">
            <v-row dense>
                <v-col v-for="action in actions" :key="action.id" cols="12" md="6" lg="4">
                    <v-card
                        class="action-item app-click-target"
                        variant="outlined"
                        tabindex="0"
                        role="button"
                        @click="emit('run', action.id)"
                        @keydown.enter.prevent="emit('run', action.id)"
                        @keydown.space.prevent="emit('run', action.id)"
                    >
                        <v-card-text class="pa-3">
                            <div class="text-body-2 font-weight-medium">{{ action.label }}</div>
                            <div class="text-caption text-medium-emphasis mt-1">
                                {{ action.description }}
                            </div>
                        </v-card-text>
                    </v-card>
                </v-col>
            </v-row>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    defineProps<{
        actions: Array<{
            id: string;
            label: string;
            description: string;
        }>;
    }>();

    const emit = defineEmits<{
        run: [id: string];
    }>();
</script>

<style scoped>
    .action-strip-card {
        border: 1px solid var(--app-divider);
    }

    .action-item {
        transition:
            transform 0.18s ease,
            border-color 0.18s ease;
    }

    .action-item:hover {
        transform: translateY(-1px);
        border-color: rgba(var(--v-theme-primary), 0.5);
    }
</style>
