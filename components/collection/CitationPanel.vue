<template>
    <div v-if="citations.length > 0" class="citation-panel">
        <v-expansion-panels variant="accordion" density="compact">
            <v-expansion-panel>
                <v-expansion-panel-title class="text-caption py-1 px-3">
                    <v-icon size="14" class="mr-1">mdi-source-branch</v-icon>
                    {{ citations.length }} supporting source{{ citations.length !== 1 ? 's' : '' }}
                </v-expansion-panel-title>
                <v-expansion-panel-text class="pa-0">
                    <div class="citation-list">
                        <div
                            v-for="c in citations"
                            :key="c.ref"
                            class="citation-item d-flex ga-2 pa-2"
                        >
                            <!-- Ref number -->
                            <div class="citation-ref text-caption font-weight-bold flex-shrink-0">
                                [{{ c.ref }}]
                            </div>
                            <!-- Content -->
                            <div class="flex-grow-1">
                                <div class="d-flex align-center ga-1 mb-0">
                                    <v-chip
                                        size="x-small"
                                        :color="typeColor(c.sourceType)"
                                        variant="tonal"
                                    >
                                        {{ c.sourceType }}
                                    </v-chip>
                                    <button
                                        v-if="c.url || c.neid"
                                        type="button"
                                        class="text-caption font-weight-medium text-primary citation-link"
                                        @click="handleCitationClick(c)"
                                    >
                                        {{ c.sourceName }}
                                    </button>
                                    <span v-else class="text-caption font-weight-medium">
                                        {{ c.sourceName }}
                                    </span>
                                    <span v-if="c.date" class="text-caption text-medium-emphasis">
                                        · {{ c.date }}
                                    </span>
                                </div>
                                <div
                                    v-if="c.excerpt"
                                    class="text-caption text-medium-emphasis mt-0"
                                    style="line-height: 1.3"
                                >
                                    {{ c.excerpt.slice(0, 160)
                                    }}{{ c.excerpt.length > 160 ? '…' : '' }}
                                </div>
                            </div>
                            <!-- External link -->
                            <div v-if="c.url" class="flex-shrink-0">
                                <v-btn
                                    icon="mdi-open-in-new"
                                    size="x-small"
                                    variant="text"
                                    :href="c.url"
                                    target="_blank"
                                />
                            </div>
                        </div>
                    </div>
                </v-expansion-panel-text>
            </v-expansion-panel>
        </v-expansion-panels>
    </div>
</template>

<script setup lang="ts">
    import type { Citation } from '~/utils/citationTypes';

    const emit = defineEmits<{
        select: [citation: Citation];
    }>();

    defineProps<{ citations: Citation[] }>();

    function typeColor(type: Citation['sourceType']): string {
        const map: Record<string, string> = {
            document: 'primary',
            event: 'orange',
            property: 'success',
            relationship: 'info',
            other: 'secondary',
        };
        return map[type] ?? 'secondary';
    }

    function openUrl(url: string) {
        window.open(url, '_blank');
    }

    function handleCitationClick(citation: Citation) {
        if (citation.neid) {
            emit('select', citation);
            return;
        }
        if (citation.url) openUrl(citation.url);
    }
</script>

<style scoped>
    .citation-panel {
        margin-top: 8px;
    }

    .citation-list {
        background: var(--app-subtle-surface);
    }

    .citation-item + .citation-item {
        border-top: 1px solid var(--app-divider);
    }

    .citation-ref {
        color: var(--dynamic-text-muted);
        min-width: 28px;
    }

    .citation-link {
        border: 0;
        background: transparent;
        cursor: pointer;
        text-align: left;
    }
</style>
