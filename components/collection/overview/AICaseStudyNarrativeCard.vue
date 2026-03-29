<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item class="pb-1">
            <v-card-title class="section-title">AI Case Study Narrative</v-card-title>
            <template #append>
                <span class="narrative-tag">Generated insight</span>
            </template>
        </v-card-item>
        <v-card-text class="pt-0 pb-4 narrative-body">
            <template v-if="narrativeParagraphs.length">
                <p
                    v-for="paragraph in narrativeParagraphs"
                    :key="paragraph"
                    class="text-body-2 mb-2 narrative-paragraph"
                >
                    {{ paragraph }}
                </p>
            </template>
            <div v-else class="empty-state">
                <p class="empty-copy">
                    Run analysis to generate an evidence-linked narrative for this collection.
                </p>
                <v-btn
                    size="x-small"
                    color="primary"
                    variant="tonal"
                    prepend-icon="mdi-play-circle-outline"
                    :disabled="status === 'processing'"
                    @click="$emit('run-analysis')"
                >
                    Run Initial Analysis
                </v-btn>
            </div>
            <div v-if="narrativeParagraphs.length" class="d-flex ga-2 flex-wrap mt-2">
                <v-btn
                    size="x-small"
                    variant="text"
                    class="narrative-action"
                    :loading="isRegenerating"
                    :disabled="isRegenerating"
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
    import type { OverviewStatus } from '~/utils/overviewBriefing';

    defineProps<{
        narrativeParagraphs: string[];
        citationCount: number;
        status: OverviewStatus;
        isRegenerating?: boolean;
    }>();

    defineEmits<{
        regenerate: [];
        'run-analysis': [];
    }>();
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider-strong);
        background: color-mix(
            in srgb,
            var(--dynamic-card-background) 92%,
            var(--dynamic-background) 8%
        );
    }

    .narrative-body {
        max-width: 104ch;
    }

    .section-title {
        font-size: 0.92rem;
        font-weight: 600;
    }

    .narrative-tag {
        font-size: 0.7rem;
        color: var(--dynamic-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .narrative-paragraph {
        line-height: 1.52;
        font-size: 0.86rem;
        color: color-mix(
            in srgb,
            var(--dynamic-text-primary) 94%,
            var(--dynamic-text-secondary) 6%
        );
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .empty-copy {
        margin: 0;
        font-size: 0.84rem;
        color: var(--dynamic-text-secondary);
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
