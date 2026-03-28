<template>
    <v-card class="briefing-card" variant="flat">
        <v-card-item>
            <v-card-title class="text-body-1">Source Documents</v-card-title>
            <template #append>
                <span class="text-caption text-medium-emphasis">
                    {{ documents.length }} automatically classified documents
                </span>
            </template>
        </v-card-item>
        <v-card-text class="pt-0">
            <v-table density="comfortable" class="documents-table">
                <thead>
                    <tr>
                        <th>File name</th>
                        <th>Detected type</th>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="doc in documents" :key="doc.id">
                        <td>{{ doc.filename }}</td>
                        <td>
                            <v-chip size="x-small" variant="tonal" class="doc-type-pill">{{
                                doc.detectedType
                            }}</v-chip>
                        </td>
                        <td>{{ doc.date }}</td>
                        <td>{{ doc.subject }}</td>
                        <td>
                            <div class="d-flex ga-1 flex-wrap">
                                <v-btn
                                    size="x-small"
                                    variant="text"
                                    class="row-action-pill"
                                    @click="$emit('preview', doc.neid)"
                                >
                                    Preview
                                </v-btn>
                                <v-btn
                                    size="x-small"
                                    variant="text"
                                    class="row-action-pill"
                                    @click="$emit('entities', doc.neid)"
                                >
                                    View entities
                                </v-btn>
                                <v-btn
                                    size="x-small"
                                    variant="text"
                                    class="row-action-pill"
                                    @click="$emit('citations', doc.neid)"
                                >
                                    View citations
                                </v-btn>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </v-table>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { SourceDocumentRow } from '~/utils/overviewBriefing';

    defineProps<{
        documents: SourceDocumentRow[];
    }>();

    defineEmits<{
        preview: [neid: string];
        entities: [neid: string];
        citations: [neid: string];
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

    .documents-table th {
        white-space: nowrap;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--dynamic-text-muted);
        border-bottom: 1px solid var(--app-divider-strong) !important;
        background: color-mix(
            in srgb,
            var(--dynamic-panel-background) 84%,
            var(--dynamic-background) 16%
        );
    }

    .documents-table :deep(tbody tr td) {
        border-bottom: 1px solid var(--app-divider);
    }

    .doc-type-pill {
        border: 1px solid var(--app-divider);
        letter-spacing: 0;
    }

    .row-action-pill {
        border-radius: 999px;
        text-transform: none;
        letter-spacing: 0;
        color: var(--dynamic-text-secondary);
    }

    .row-action-pill:hover {
        color: var(--dynamic-text-primary);
        background: color-mix(in srgb, var(--dynamic-primary) 10%, transparent);
    }
</style>
