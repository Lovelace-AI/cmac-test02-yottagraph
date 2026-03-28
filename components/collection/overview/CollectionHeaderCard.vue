<template>
    <v-card class="briefing-card" variant="flat">
        <v-card-text class="pa-6">
            <div class="d-flex justify-space-between align-start flex-wrap ga-3">
                <div>
                    <div class="d-flex align-center ga-2 flex-wrap">
                        <div class="text-h5 font-weight-bold">{{ title }}</div>
                        <v-chip
                            size="small"
                            :color="statusColor"
                            variant="tonal"
                            class="status-pill"
                        >
                            {{ statusLabel }}
                        </v-chip>
                    </div>
                    <div class="text-body-2 text-medium-emphasis mt-2">
                        {{ subtitle }}
                    </div>
                </div>
            </div>
            <div class="d-flex flex-wrap ga-2 mt-4">
                <v-chip size="small" variant="tonal" class="header-pill">{{
                    detectedDealType
                }}</v-chip>
                <v-chip size="small" variant="tonal" class="header-pill"
                    >{{ documentCount }} source documents</v-chip
                >
                <v-chip size="small" variant="tonal" class="header-pill">{{
                    analysisStatus
                }}</v-chip>
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
    }>();

    const statusColor = computed(() => {
        if (props.status === 'complete') return 'success';
        if (props.status === 'partial') return 'warning';
        if (props.status === 'processing') return 'info';
        if (props.status === 'error') return 'error';
        return 'default';
    });
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider-strong);
        background: color-mix(in srgb, var(--dynamic-surface) 90%, var(--dynamic-background) 10%);
        box-shadow: 0 10px 24px rgba(10, 10, 10, 0.24);
    }

    .header-pill {
        border: 1px solid var(--app-divider);
        letter-spacing: 0;
    }

    .status-pill {
        border: 1px solid color-mix(in srgb, currentColor 24%, var(--app-divider));
        font-weight: 600;
        letter-spacing: 0;
    }
</style>
