<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item>
            <v-card-title class="text-body-1">AI Case Study Narrative</v-card-title>
            <template #append>
                <v-chip size="x-small" variant="tonal" class="narrative-pill"
                    >Generated summary</v-chip
                >
            </template>
        </v-card-item>
        <v-card-text class="pt-0 narrative-body">
            <template v-if="narrativeParagraphs.length">
                <p
                    v-for="paragraph in narrativeParagraphs"
                    :key="paragraph"
                    class="text-body-2 mb-3 narrative-paragraph"
                >
                    {{ paragraph }}
                </p>
            </template>
            <div v-else class="text-body-2 text-medium-emphasis">
                Run initial analysis to generate a coherent business narrative grounded in extracted
                entities, events, agreements, and citations.
            </div>
            <div class="d-flex ga-2 flex-wrap mt-4">
                <v-btn
                    size="x-small"
                    variant="text"
                    class="narrative-action"
                    @click="$emit('regenerate')"
                >
                    Regenerate narrative
                </v-btn>
                <v-chip
                    v-if="citationCount > 0"
                    size="x-small"
                    variant="tonal"
                    prepend-icon="mdi-file-document-outline"
                    class="narrative-pill"
                >
                    {{ citationCount }} source references
                </v-chip>
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    defineProps<{
        narrativeParagraphs: string[];
        citationCount: number;
    }>();

    defineEmits<{
        regenerate: [];
    }>();
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider-strong);
        background: linear-gradient(
            158deg,
            color-mix(in srgb, var(--dynamic-card-background) 86%, var(--dynamic-background) 14%),
            color-mix(in srgb, var(--dynamic-surface) 88%, var(--dynamic-primary) 12%)
        );
        box-shadow: 0 14px 28px rgba(7, 12, 20, 0.34);
    }

    .narrative-body {
        max-width: 92ch;
    }

    .narrative-paragraph {
        line-height: 1.72;
        color: color-mix(
            in srgb,
            var(--dynamic-text-primary) 94%,
            var(--dynamic-text-secondary) 6%
        );
    }

    .narrative-pill {
        border: 1px solid var(--app-divider);
        letter-spacing: 0;
    }

    .narrative-action {
        border-radius: 999px;
        text-transform: none;
        letter-spacing: 0;
        color: var(--dynamic-text-secondary);
    }

    .narrative-action:hover {
        color: var(--dynamic-text-primary);
        background: color-mix(in srgb, var(--dynamic-primary) 9%, transparent);
    }
</style>
