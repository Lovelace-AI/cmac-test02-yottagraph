<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item>
            <v-card-title class="text-body-1">Collection Health</v-card-title>
        </v-card-item>
        <v-card-text class="pt-0">
            <div
                v-for="item in items"
                :key="item.label"
                class="d-flex justify-space-between py-2 health-row"
            >
                <span class="text-caption text-medium-emphasis">{{ item.label }}</span>
                <span class="text-body-2 font-weight-medium" :class="toneClass(item.tone)">{{
                    item.value
                }}</span>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { HealthItem } from '~/utils/overviewBriefing';

    defineProps<{
        items: HealthItem[];
    }>();

    function toneClass(tone: HealthItem['tone']) {
        if (tone === 'success') return 'text-success';
        if (tone === 'warning') return 'text-warning';
        if (tone === 'error') return 'text-error';
        return 'text-medium-emphasis';
    }
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider);
    }

    .health-row + .health-row {
        border-top: 1px solid var(--app-divider);
    }
</style>
