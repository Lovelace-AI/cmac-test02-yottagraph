<template>
    <v-card class="briefing-card" variant="flat">
        <v-card-item class="pb-1">
            <v-card-title class="section-title">Explore Next</v-card-title>
        </v-card-item>
        <v-card-text class="pt-0 pb-3">
            <div class="explore-grid">
                <v-card
                    v-for="card in cards"
                    :key="card.key"
                    variant="flat"
                    class="explore-tile"
                    @click="$emit('open', card.tab)"
                >
                    <v-card-text class="tile-body">
                        <div class="tile-head">
                            <div class="d-flex align-center ga-2">
                                <v-icon size="16">{{ card.icon }}</v-icon>
                                <div class="tile-title">{{ card.title }}</div>
                            </div>
                            <v-icon size="14" color="medium-emphasis">mdi-arrow-right</v-icon>
                        </div>
                        <div class="tile-description">{{ card.description }}</div>
                        <div class="tile-foot">{{ card.metric }}</div>
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
        background: color-mix(in srgb, var(--dynamic-surface) 94%, var(--dynamic-background) 6%);
    }

    .section-title {
        font-size: 0.92rem;
        font-weight: 600;
    }

    .explore-grid {
        display: grid;
        grid-template-columns: repeat(1, minmax(0, 1fr));
        gap: 8px;
    }

    .explore-tile {
        border: 1px solid var(--app-divider-strong);
        border-radius: 10px;
        background: color-mix(
            in srgb,
            var(--dynamic-card-background) 92%,
            var(--dynamic-background) 8%
        );
        cursor: pointer;
        transition:
            transform 120ms ease,
            border-color 120ms ease,
            box-shadow 120ms ease;
    }

    .explore-tile:hover {
        transform: translateY(-1px);
        border-color: color-mix(in srgb, var(--dynamic-primary) 34%, var(--app-divider-strong));
        box-shadow: 0 8px 16px rgba(6, 10, 18, 0.22);
    }

    .tile-body {
        padding: 10px 12px;
    }

    .tile-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    .tile-title {
        font-size: 0.85rem;
        font-weight: 600;
    }

    .tile-description {
        margin-top: 4px;
        font-size: 0.76rem;
        color: var(--dynamic-text-secondary);
        line-height: 1.35;
    }

    .tile-foot {
        margin-top: 6px;
        font-size: 0.73rem;
        font-weight: 600;
        color: var(--dynamic-text-muted);
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
