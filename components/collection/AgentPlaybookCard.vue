<template>
    <v-card class="playbook-card" variant="flat">
        <v-card-text class="d-flex flex-column ga-3">
            <div class="d-flex align-center justify-space-between ga-2">
                <div class="text-subtitle-2 font-weight-bold">{{ title }}</div>
                <v-chip size="x-small" variant="tonal" color="primary">{{ outputType }}</v-chip>
            </div>

            <div class="text-caption text-medium-emphasis">{{ question }}</div>

            <div class="mini-flow d-flex align-center ga-1">
                <span class="flow-node flow-node--planning">Planning</span>
                <v-icon size="14">mdi-chevron-right</v-icon>
                <span class="flow-node flow-node--context">Context</span>
                <v-icon size="14">mdi-chevron-right</v-icon>
                <span class="flow-node flow-node--composition">Composition</span>
            </div>

            <div class="d-flex flex-wrap ga-1">
                <div v-for="asset in graphAssets" :key="asset.label" class="asset-pill">
                    <v-icon size="12" :icon="asset.icon" />
                    <span>{{ asset.label }}</span>
                </div>
            </div>

            <div class="text-body-2">{{ outputDescription }}</div>

            <v-btn
                size="small"
                variant="tonal"
                color="primary"
                prepend-icon="mdi-play"
                :loading="running"
                @click="$emit('run')"
            >
                Run
            </v-btn>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    interface GraphAsset {
        icon: string;
        label: string;
    }

    defineProps<{
        title: string;
        question: string;
        graphAssets: GraphAsset[];
        outputType: string;
        outputDescription: string;
        running?: boolean;
    }>();

    defineEmits<{
        run: [];
    }>();
</script>

<style scoped>
    .playbook-card {
        border: 1px solid var(--app-divider);
        background: color-mix(in srgb, var(--app-surface) 95%, white 5%);
        transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            border-color 0.15s ease;
    }

    .playbook-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px color-mix(in srgb, black 24%, transparent);
        border-color: color-mix(in srgb, var(--v-theme-primary) 35%, var(--app-divider));
    }

    .flow-node {
        font-size: 0.72rem;
        border-radius: 999px;
        padding: 2px 8px;
        border: 1px solid var(--app-divider);
    }

    .flow-node--planning {
        color: color-mix(in srgb, var(--v-theme-deep-purple) 90%, white 10%);
    }

    .flow-node--context {
        color: color-mix(in srgb, var(--v-theme-teal) 90%, white 10%);
    }

    .flow-node--composition {
        color: color-mix(in srgb, var(--v-theme-warning) 90%, white 10%);
    }

    .asset-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border-radius: 999px;
        border: 1px solid var(--app-divider);
        color: var(--dynamic-text-muted);
        padding: 2px 8px;
        font-size: 0.72rem;
        line-height: 1.2;
    }
</style>
