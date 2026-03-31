<template>
    <v-card variant="outlined" height="100%">
        <v-card-text class="d-flex flex-column ga-3">
            <div class="d-flex align-center justify-space-between ga-2">
                <div class="d-flex align-center ga-2">
                    <v-avatar :color="color" variant="tonal" size="28">
                        <v-icon size="16">{{ icon }}</v-icon>
                    </v-avatar>
                    <div>
                        <div class="text-subtitle-2">{{ name }}</div>
                        <div class="text-caption text-medium-emphasis">{{ role }}</div>
                    </div>
                </div>
                <v-chip size="x-small" :color="active ? 'success' : 'default'" variant="tonal">
                    {{ active ? 'active' : 'idle' }}
                </v-chip>
            </div>

            <div class="text-body-2">{{ description }}</div>

            <div class="d-flex align-center ga-2 flex-wrap">
                <v-chip size="x-small" color="deep-purple" variant="tonal">
                    {{ model }}
                </v-chip>
                <v-chip
                    size="x-small"
                    :color="toolChips.length ? 'teal' : 'default'"
                    variant="tonal"
                >
                    {{ toolChips.length ? `${toolChips.length} KG tools` : 'LLM-only, no tools' }}
                </v-chip>
            </div>

            <div v-if="toolChips.length" class="d-flex ga-1 flex-wrap">
                <v-chip
                    v-for="tool in toolChips"
                    :key="tool"
                    size="x-small"
                    color="teal"
                    variant="outlined"
                >
                    {{ tool }}
                </v-chip>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    defineProps<{
        name: string;
        role: string;
        description: string;
        icon: string;
        color: string;
        model: string;
        toolChips: string[];
        active?: boolean;
    }>();
</script>
