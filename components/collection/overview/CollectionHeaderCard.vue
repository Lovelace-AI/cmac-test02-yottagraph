<template>
    <v-card class="briefing-card" variant="flat">
        <v-card-text class="header-body">
            <div class="header-top-row">
                <div class="header-identity">
                    <div class="d-flex align-center ga-2 flex-wrap">
                        <div class="header-title">{{ title }}</div>
                        <v-chip
                            size="small"
                            :color="statusColor"
                            variant="tonal"
                            class="status-pill"
                        >
                            <v-icon
                                v-if="isAnalysisRunning"
                                size="12"
                                class="analysis-pill__spinner"
                                aria-hidden="true"
                            >
                                mdi-loading
                            </v-icon>
                            {{ statusLabel }}
                        </v-chip>
                    </div>
                    <div class="header-subtitle">
                        {{ subtitle }}
                    </div>
                </div>
                <v-btn
                    size="small"
                    color="primary"
                    variant="flat"
                    prepend-icon="mdi-play-circle-outline"
                    :loading="primaryActionLoading"
                    :disabled="primaryActionDisabled"
                    class="header-cta"
                    @click="$emit('primary-action')"
                >
                    {{ primaryActionLabel }}
                </v-btn>
            </div>

            <div class="header-meta-row">
                <v-chip size="small" variant="tonal" class="header-pill">{{
                    detectedDealType
                }}</v-chip>
                <v-chip size="small" variant="tonal" class="header-pill">
                    {{ documentCount }} source documents
                </v-chip>
                <v-chip
                    size="small"
                    variant="tonal"
                    class="header-pill analysis-pill"
                    :class="{ 'analysis-pill--running': isAnalysisRunning }"
                >
                    <v-icon
                        v-if="isAnalysisRunning"
                        size="12"
                        class="analysis-pill__spinner"
                        aria-hidden="true"
                    >
                        mdi-loading
                    </v-icon>
                    {{ analysisStatus }}
                </v-chip>
                <v-chip size="small" variant="tonal" class="header-pill"
                    >Updated {{ lastUpdated }}</v-chip
                >
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { OverviewStatus } from '~/utils/overviewBriefing';

    const props = defineProps<{
        title: string;
        subtitle: string;
        detectedDealType: string;
        status: OverviewStatus;
        statusLabel: string;
        documentCount: number;
        analysisStatus: string;
        lastUpdated: string;
        primaryActionLabel: string;
        primaryActionLoading?: boolean;
        primaryActionDisabled?: boolean;
    }>();

    defineEmits<{
        'primary-action': [];
    }>();

    const statusColor = computed(() => {
        if (props.status === 'complete') return 'success';
        if (props.status === 'partial') return 'warning';
        if (props.status === 'processing') return 'info';
        if (props.status === 'error') return 'error';
        return 'default';
    });

    const isAnalysisRunning = computed(() => props.status === 'processing');
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider-strong);
        background: color-mix(in srgb, var(--dynamic-surface) 94%, var(--dynamic-background) 6%);
    }

    .header-body {
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .header-top-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
    }

    .header-identity {
        min-width: min(100%, 540px);
    }

    .header-title {
        font-size: 1.1rem;
        line-height: 1.25;
        font-weight: 700;
    }

    .header-subtitle {
        margin-top: 4px;
        font-size: 0.83rem;
        color: var(--dynamic-text-secondary);
        line-height: 1.35;
    }

    .header-cta {
        text-transform: none;
        letter-spacing: 0;
        border-radius: 9px;
        font-weight: 600;
    }

    .header-meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .header-pill {
        border: 1px solid var(--app-divider);
        letter-spacing: 0;
        font-size: 0.72rem;
    }

    .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid color-mix(in srgb, currentColor 24%, var(--app-divider));
        font-weight: 600;
        letter-spacing: 0;
    }

    .analysis-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .analysis-pill--running {
        font-weight: 600;
    }

    .analysis-pill__spinner {
        animation: analysis-running-spin 1s linear infinite;
    }

    @keyframes analysis-running-spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
