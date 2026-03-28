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
            <div v-if="getLiveDuration(s)" class="flex-shrink-0">
                <v-chip size="x-small" :variant="getChipVariant(s)" :color="getChipColor(s)">
                    {{ getLiveDuration(s) }}
                </v-chip>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { onMounted, onBeforeUnmount, ref } from 'vue';
    import type { RebuildStep } from '~/composables/useCollectionWorkspace';

    defineProps<{
        steps: RebuildStep[];
    }>();

    const nowMs = ref(Date.now());
    let ticker: ReturnType<typeof setInterval> | null = null;

    onMounted(() => {
        ticker = setInterval(() => {
            nowMs.value = Date.now();
        }, 250);
    });

    onBeforeUnmount(() => {
        if (ticker) clearInterval(ticker);
    });

    function formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
        const minutes = Math.floor(ms / 60_000);
        const seconds = Math.floor((ms % 60_000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    function getLiveDuration(step: RebuildStep): string | null {
        if (step.status === 'working' && step.startedAtMs) {
            return formatDuration(Math.max(0, nowMs.value - step.startedAtMs));
        }
        if (step.status === 'completed' && step.durationMs !== undefined) {
            return formatDuration(step.durationMs);
        }
        if (step.status === 'completed' && step.startedAtMs) {
            return formatDuration(Math.max(0, nowMs.value - step.startedAtMs));
        }
        return null;
    }

    function getChipColor(step: RebuildStep): string {
        return step.status === 'working' ? 'primary' : 'success';
    }

    function getChipVariant(
        step: RebuildStep
    ): 'tonal' | 'flat' | 'outlined' | 'elevated' | 'text' | 'plain' {
        return step.status === 'working' ? 'outlined' : 'tonal';
    }
</script>

<style scoped>
    .agent-steps {
        border-radius: 8px;
    }
    .step-row + .step-row {
        border-top: 1px solid var(--app-divider);
    }
</style>
