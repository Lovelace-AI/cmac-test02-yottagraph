<template>
    <v-card variant="flat" class="action-strip-card">
        <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
                <div class="text-body-2 font-weight-medium">Quick actions</div>
                <div class="text-caption text-medium-emphasis">Start with a focused task</div>
            </div>
            <div class="d-flex flex-wrap ga-2">
                <v-tooltip v-for="action in actions" :key="action.id" location="top">
                    <template #activator="{ props: tooltipProps }">
                        <v-btn
                            v-bind="tooltipProps"
                            size="small"
                            variant="outlined"
                            class="action-chip app-click-target"
                            @click="emit('run', action.id)"
                        >
                            {{ action.label }}
                        </v-btn>
                    </template>
                    <span>{{ action.description }}</span>
                </v-tooltip>
            </div>
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

    .action-chip {
        transition:
            transform 0.18s ease,
            border-color 0.18s ease;
        text-transform: none;
        letter-spacing: 0;
    }

    .action-chip:hover {
        transform: translateY(-1px);
        border-color: rgba(var(--v-theme-primary), 0.5);
    }
</style>
