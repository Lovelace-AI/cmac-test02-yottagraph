<template>
    <div class="evidence-panel mt-3 pt-3">
        <v-row dense>
            <v-col cols="12" md="6">
                <div class="section-label">Supporting documents</div>
                <SupportingDocumentList :documents="result.supportingDocuments" />
            </v-col>
            <v-col cols="12" md="6">
                <div class="section-label">Event anchors</div>
                <EvidenceAnchorList :anchors="result.eventAnchors" />
            </v-col>
            <v-col cols="12" md="6">
                <div class="section-label">Referenced entities</div>
                <v-list density="compact" class="bg-transparent py-0">
                    <v-list-item
                        v-for="entity in result.referencedEntities"
                        :key="`lineage-entity:${result.id}:${entity.neid}:${entity.role}`"
                        class="px-0"
                    >
                        <template #title>
                            <span class="text-body-2">{{ entity.name }}</span>
                        </template>
                        <template #subtitle>
                            <span class="text-caption text-medium-emphasis">
                                {{ entity.role.replace('_', ' ') }} • {{ entity.flavor }}
                            </span>
                        </template>
                    </v-list-item>
                </v-list>
            </v-col>
            <v-col cols="12" md="6">
                <div class="section-label">Grounding notes</div>
                <v-list density="compact" class="bg-transparent py-0">
                    <v-list-item
                        v-for="(note, index) in result.groundingNotes"
                        :key="`lineage-note:${result.id}:${index}`"
                        class="px-0"
                    >
                        <template #title>
                            <span class="text-caption text-medium-emphasis">{{ note }}</span>
                        </template>
                    </v-list-item>
                </v-list>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
    import type { LineageResultViewModel } from '~/utils/collectionTypes';

    defineProps<{
        result: LineageResultViewModel;
    }>();
</script>

<style scoped>
    .evidence-panel {
        border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    }

    .section-label {
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: rgba(var(--v-theme-on-surface), 0.62);
        margin-bottom: 4px;
    }
</style>
