<template>
    <v-card variant="flat" class="action-strip-card">
        <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
                <div class="text-body-2 font-weight-medium d-flex align-center ga-2">
                    <v-icon size="16" color="primary">mdi-lightning-bolt</v-icon>
                    Quick actions
                </div>
                <div class="text-caption text-medium-emphasis">Start with a focused task</div>
            </div>
            <div class="d-flex flex-wrap ga-2">
                <v-tooltip
                    v-for="action in actions"
                    :key="action.id"
                    location="top"
                    content-class="action-tooltip"
                    :theme="colorMode === 'light' ? 'dark' : 'light'"
                >
                    <template #activator="{ props: tooltipProps }">
                        <v-btn
                            v-bind="tooltipProps"
                            size="small"
                            variant="outlined"
                            class="action-chip action-pill app-click-target"
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
    const { colorMode } = useAppColorMode();

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
        background: linear-gradient(
            145deg,
            color-mix(in srgb, var(--dynamic-primary) 3%, transparent),
            color-mix(in srgb, var(--dynamic-secondary) 2%, transparent)
        );
    }

    .action-chip {
        transition:
            transform 0.18s ease,
            border-color 0.18s ease;
        text-transform: none;
        letter-spacing: 0;
    }

    .action-pill {
        border-radius: 999px;
        border-color: var(--app-divider-strong);
        background: color-mix(
            in srgb,
            var(--dynamic-panel-background) 82%,
            var(--dynamic-background) 18%
        );
    }

    .action-chip:hover {
        transform: translateY(-1px);
        border-color: rgba(var(--v-theme-primary), 0.5);
        background: color-mix(
            in srgb,
            var(--dynamic-primary) 11%,
            var(--dynamic-panel-background) 89%
        );
    }

    :deep(.action-tooltip .v-overlay__content) {
        background: color-mix(in srgb, var(--dynamic-surface) 92%, #000 8%) !important;
        color: var(--dynamic-text-primary) !important;
        border: 1px solid var(--app-divider-strong);
        border-radius: 8px;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
        font-size: 0.75rem;
        line-height: 1.35;
        padding: 8px 10px;
        max-width: 320px;
    }
</style>
