<template>
    <div class="agent-steps">
        <div v-for="s in steps" :key="s.step" class="step-row d-flex align-start ga-3 py-2">
            <!-- Status icon -->
            <div
                class="step-icon flex-shrink-0"
                style="width: 24px; text-align: center; margin-top: 2px"
            >
                <v-progress-circular
                    v-if="s.status === 'working'"
                    indeterminate
                    size="18"
                    width="2"
                    color="primary"
                />
                <v-icon v-else-if="s.status === 'completed'" size="18" color="success">
                    mdi-check-circle
                </v-icon>
                <v-icon v-else size="18" color="grey-darken-1">mdi-circle-outline</v-icon>
            </div>

            <!-- Label + detail -->
            <div class="flex-grow-1">
                <div
                    class="text-body-2 font-weight-medium"
                    :class="
                        s.status === 'working'
                            ? 'text-primary'
                            : s.status === 'completed'
                              ? ''
                              : 'text-medium-emphasis'
                    "
                >
                    {{ s.label }}
                </div>
                <div v-if="s.detail" class="text-caption text-medium-emphasis">{{ s.detail }}</div>
            </div>

            <!-- Duration badge -->
            <div
                v-if="s.status === 'completed' && s.durationMs !== undefined"
                class="flex-shrink-0"
            >
                <v-chip size="x-small" variant="tonal" color="success">
                    {{ formatDuration(s.durationMs) }}
                </v-chip>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { RebuildStep } from '~/composables/useCollectionWorkspace';

    defineProps<{
        steps: RebuildStep[];
    }>();

    function formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }
</script>

<style scoped>
    .agent-steps {
        border-radius: 8px;
    }
    .step-row + .step-row {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
</style>
