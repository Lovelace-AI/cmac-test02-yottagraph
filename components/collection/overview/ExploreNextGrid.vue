<template>
    <v-card class="briefing-card" variant="flat">
        <v-card-item>
            <v-card-title class="text-body-1">Explore Next</v-card-title>
        </v-card-item>
        <v-card-text class="pt-0">
            <div class="explore-grid">
                <v-card
                    v-for="card in cards"
                    :key="card.key"
                    variant="flat"
                    class="explore-tile"
                    @click="$emit('open', card.tab)"
                >
                    <v-card-text class="pa-4">
                        <div class="d-flex align-center ga-2 mb-2">
                            <v-icon size="18">{{ card.icon }}</v-icon>
                            <div class="text-body-2 font-weight-medium">{{ card.title }}</div>
                        </div>
                        <div class="text-caption text-medium-emphasis mb-3">
                            {{ card.description }}
                        </div>
                        <div class="text-caption font-weight-medium mb-2">{{ card.metric }}</div>
                        <v-btn size="x-small" variant="tonal">{{ card.ctaLabel }}</v-btn>
                    </v-card-text>
                </v-card>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { ExploreCardItem } from '~/utils/overviewBriefing';
    import type { WorkspaceTab } from '~/utils/collectionTypes';

    defineProps<{
        cards: ExploreCardItem[];
    }>();

    defineEmits<{
        open: [tab: WorkspaceTab];
    }>();
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider-strong);
        background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--dynamic-surface) 92%, var(--dynamic-background) 8%),
            color-mix(in srgb, var(--dynamic-panel-background) 88%, var(--dynamic-background) 12%)
        );
    }

    .explore-grid {
        display: grid;
        grid-template-columns: repeat(1, minmax(0, 1fr));
        gap: 14px;
    }

    .explore-tile {
        border: 1px solid var(--app-divider-strong);
        border-radius: 14px;
        background: linear-gradient(
            155deg,
            color-mix(in srgb, var(--dynamic-card-background) 90%, var(--dynamic-background) 10%),
            color-mix(in srgb, var(--dynamic-surface) 82%, var(--dynamic-background) 18%)
        );
        cursor: pointer;
        transition:
            transform 120ms ease,
            border-color 120ms ease,
            box-shadow 120ms ease;
    }

    .explore-tile:hover {
        transform: translateY(-2px);
        border-color: color-mix(in srgb, var(--dynamic-primary) 34%, var(--app-divider-strong));
        box-shadow: 0 10px 22px rgba(6, 10, 18, 0.28);
    }

    @media (min-width: 900px) {
        .explore-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (min-width: 1280px) {
        .explore-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }
</style>
