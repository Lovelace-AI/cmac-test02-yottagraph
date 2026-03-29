<template>
    <v-card class="briefing-card" variant="flat">
        <v-card-item class="pb-1">
            <v-card-title class="section-title">Source Documents</v-card-title>
            <template #append>
                <span class="text-caption text-medium-emphasis">
                    {{ documents.length }} automatically classified documents
                </span>
            </template>
        </v-card-item>
        <v-card-text class="pt-0 pb-3">
            <v-table density="compact" class="documents-table">
                <colgroup>
                    <col class="col-file" />
                    <col class="col-type" />
                    <col class="col-date" />
                    <col class="col-subject" />
                    <col class="col-actions" />
                </colgroup>
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
                        <td class="cell-file">{{ doc.filename }}</td>
                        <td>
                            <v-chip size="x-small" variant="tonal" class="doc-type-pill">{{
                                doc.detectedType
                            }}</v-chip>
                        </td>
                        <td class="cell-date">{{ doc.date }}</td>
                        <td class="cell-subject">{{ doc.subject }}</td>
                        <td class="cell-actions">
                            <div class="actions-cluster">
                                <v-btn
                                    size="x-small"
                                    variant="text"
                                    class="row-action-pill"
                                    prepend-icon="mdi-file-eye-outline"
                                    @click="$emit('preview', doc.neid)"
                                >
                                    Preview
                                </v-btn>
                                <v-btn
                                    size="x-small"
                                    variant="text"
                                    class="row-action-pill"
                                    prepend-icon="mdi-graph-outline"
                                    @click="$emit('entities', doc.neid)"
                                >
                                    Entities
                                </v-btn>
                                <v-btn
                                    size="x-small"
                                    variant="text"
                                    class="row-action-pill"
                                    prepend-icon="mdi-book-search-outline"
                                    @click="$emit('citations', doc.neid)"
                                >
                                    Citations
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
        background: color-mix(in srgb, var(--dynamic-surface) 94%, var(--dynamic-background) 6%);
    }

    .section-title {
        font-size: 0.92rem;
        font-weight: 600;
    }

    .documents-table {
        border: 1px solid var(--app-divider);
        border-radius: 10px;
        overflow: hidden;
    }

    .col-file {
        width: 24%;
    }

    .col-type {
        width: 12%;
    }

    .col-date {
        width: 11%;
    }

    .col-subject {
        width: 37%;
    }

    .col-actions {
        width: 16%;
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
        padding: 8px 10px !important;
    }

    .documents-table :deep(tbody tr td) {
        border-bottom: 1px solid var(--app-divider);
        padding: 8px 10px !important;
        font-size: 0.8rem;
        line-height: 1.3;
        vertical-align: middle;
    }

    .documents-table :deep(tbody tr:hover td) {
        background: color-mix(in srgb, var(--dynamic-primary) 6%, transparent);
    }

    .cell-file {
        font-weight: 500;
    }

    .cell-date {
        white-space: nowrap;
    }

    .cell-subject {
        color: var(--dynamic-text-secondary);
    }

    .cell-actions {
        min-width: 220px;
    }

    .actions-cluster {
        display: inline-flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 2px;
        border: 1px solid var(--app-divider);
        border-radius: 999px;
        padding: 1px;
        background: color-mix(in srgb, var(--dynamic-surface) 94%, var(--dynamic-background) 6%);
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
        min-width: auto;
    }

    .row-action-pill:hover {
        color: var(--dynamic-text-primary);
        background: color-mix(in srgb, var(--dynamic-primary) 10%, transparent);
    }
</style>
