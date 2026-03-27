<template>
    <v-navigation-drawer
        :model-value="!!selectedEntity"
        location="right"
        width="420"
        temporary
        @update:model-value="(v: boolean) => !v && selectEntity(null)"
    >
        <template v-if="selectedEntity">
            <v-toolbar density="compact" color="surface">
                <v-toolbar-title class="text-body-1">Entity Detail</v-toolbar-title>
                <v-btn icon size="small" @click="selectEntity(null)">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </v-toolbar>

            <div class="pa-4">
                <div class="text-h6 mb-1">{{ selectedEntity.name }}</div>
                <div class="d-flex align-center ga-2 mb-3">
                    <v-chip
                        size="small"
                        variant="tonal"
                        :color="originColor(selectedEntity.origin)"
                    >
                        {{ selectedEntity.origin }}
                    </v-chip>
                    <v-chip size="small" variant="outlined">
                        {{ selectedEntity.flavor }}
                    </v-chip>
                </div>

                <div class="text-caption text-medium-emphasis font-mono mb-4">
                    NEID: {{ selectedEntity.neid }}
                </div>

                <v-divider class="mb-3" />

                <div class="text-subtitle-2 mb-2">Source Documents</div>
                <div v-if="selectedEntity.sourceDocuments.length" class="mb-4">
                    <v-chip
                        v-for="docNeid in selectedEntity.sourceDocuments"
                        :key="docNeid"
                        size="small"
                        variant="tonal"
                        class="mr-1 mb-1"
                        @click="selectEntity(docNeid)"
                    >
                        {{ resolveEntityName(docNeid) }}
                    </v-chip>
                </div>
                <div v-else class="text-body-2 text-medium-emphasis mb-4">
                    No source document associations.
                </div>

                <v-divider class="mb-3" />

                <div class="text-subtitle-2 mb-2">
                    Relationships
                    <v-chip size="x-small" variant="tonal" class="ml-1">
                        {{ selectedEntityRelationships.length }}
                    </v-chip>
                </div>
                <v-list
                    v-if="selectedEntityRelationships.length"
                    density="compact"
                    class="pa-0 mb-4"
                >
                    <v-list-item
                        v-for="(rel, i) in selectedEntityRelationships.slice(0, 20)"
                        :key="i"
                        class="px-0"
                        @click="
                            selectEntity(
                                rel.sourceNeid === selectedEntity.neid
                                    ? rel.targetNeid
                                    : rel.sourceNeid
                            )
                        "
                    >
                        <v-list-item-title class="text-body-2">
                            <v-chip size="x-small" variant="outlined" class="mr-1">
                                {{ rel.type }}
                            </v-chip>
                            {{
                                resolveEntityName(
                                    rel.sourceNeid === selectedEntity.neid
                                        ? rel.targetNeid
                                        : rel.sourceNeid
                                )
                            }}
                        </v-list-item-title>
                    </v-list-item>
                </v-list>
                <div v-else class="text-body-2 text-medium-emphasis mb-4">
                    No relationships found.
                </div>

                <v-divider class="mb-3" />

                <div class="text-subtitle-2 mb-2">
                    Events
                    <v-chip size="x-small" variant="tonal" class="ml-1">
                        {{ selectedEntityEvents.length }}
                    </v-chip>
                </div>
                <v-list v-if="selectedEntityEvents.length" density="compact" class="pa-0 mb-4">
                    <v-list-item
                        v-for="evt in selectedEntityEvents.slice(0, 10)"
                        :key="evt.neid"
                        class="px-0"
                    >
                        <v-list-item-title class="text-body-2">{{ evt.name }}</v-list-item-title>
                        <v-list-item-subtitle class="text-caption">
                            {{ evt.category }} {{ evt.date ? `· ${evt.date}` : '' }}
                        </v-list-item-subtitle>
                    </v-list-item>
                </v-list>

                <v-divider class="mb-3" />

                <div class="text-subtitle-2 mb-2">Properties</div>
                <div
                    v-if="
                        selectedEntity.properties && Object.keys(selectedEntity.properties).length
                    "
                >
                    <div
                        v-for="(value, key) in selectedEntity.properties"
                        :key="String(key)"
                        class="d-flex justify-space-between py-1"
                    >
                        <span class="text-caption text-medium-emphasis">{{ key }}</span>
                        <span class="text-body-2">{{ formatValue(value) }}</span>
                    </div>
                </div>
                <div v-else class="text-body-2 text-medium-emphasis">
                    Properties will be loaded with the full graph.
                </div>

                <v-divider class="my-3" />

                <div class="text-subtitle-2 mb-2">Evidence</div>
                <CitationPanel :citations="entityCitations" @select="handleCitationSelect" />

                <v-divider class="my-3" />

                <div class="d-flex ga-2">
                    <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-brain"
                        @click="
                            runAgentAction('explain_entity', { entityNeid: selectedEntity.neid })
                        "
                    >
                        Explain
                    </v-btn>
                    <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-arrow-expand-all"
                        @click="enrich([selectedEntity.neid], 1)"
                    >
                        Expand 1-hop
                    </v-btn>
                </div>
            </div>
        </template>
    </v-navigation-drawer>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import {
        buildCitationsFromPoints,
        buildCitationsFromProperties,
        buildDocumentCitation,
        type Citation,
    } from '~/utils/citationTypes';
    import { BNY_DOCUMENTS } from '~/utils/collectionTypes';

    const {
        selectedEntity,
        selectedEntityRelationships,
        selectedEntityEvents,
        selectedEntityPropertySeries,
        selectEntity,
        focusDocument,
        resolveEntityName,
        runAgentAction,
        enrich,
    } = useCollectionWorkspace();

    const entityCitations = computed<Citation[]>(() => {
        if (!selectedEntity.value) return [];

        const citations: Citation[] = [];
        let ref = 1;

        for (const docNeid of selectedEntity.value.sourceDocuments) {
            const doc = BNY_DOCUMENTS.find((item) => item.neid === docNeid);
            if (!doc) continue;
            citations.push(
                buildDocumentCitation(
                    `BNY-${doc.documentId}.pdf`,
                    String(ref++),
                    'document',
                    `${selectedEntity.value.name} appears in ${doc.title}`,
                    doc.date
                )
            );
        }

        if (selectedEntity.value.properties) {
            for (const citation of buildCitationsFromProperties(
                selectedEntity.value.properties as Record<
                    string,
                    { value: unknown; citation?: string }
                >
            )) {
                citations.push({ ...citation, ref: String(ref++) });
            }
        }

        for (const series of selectedEntityPropertySeries.value) {
            for (const citation of buildCitationsFromPoints(series.propertyName, series.points)) {
                citations.push({ ...citation, ref: String(ref++) });
            }
        }

        for (const event of selectedEntityEvents.value) {
            for (const docNeid of event.sourceDocuments) {
                const doc = BNY_DOCUMENTS.find((item) => item.neid === docNeid);
                if (!doc) continue;
                citations.push(
                    buildDocumentCitation(
                        `BNY-${doc.documentId}.pdf`,
                        String(ref++),
                        'event',
                        `${event.name}${event.date ? ` · ${event.date}` : ''}`,
                        doc.date
                    )
                );
            }
        }

        for (const relationship of selectedEntityRelationships.value) {
            const citationTexts =
                relationship.citations && relationship.citations.length
                    ? relationship.citations
                    : relationship.sourceDocumentNeid
                      ? [
                            `BNY-${
                                BNY_DOCUMENTS.find(
                                    (doc) => doc.neid === relationship.sourceDocumentNeid
                                )?.documentId ?? ''
                            }.pdf`,
                        ]
                      : [];
            for (const citationText of citationTexts) {
                citations.push(
                    buildDocumentCitation(
                        citationText,
                        String(ref++),
                        'relationship',
                        `${relationship.type}: ${resolveEntityName(relationship.sourceNeid)} -> ${resolveEntityName(relationship.targetNeid)}`,
                        relationship.recordedAt?.slice(0, 10)
                    )
                );
            }
        }

        const seen = new Set<string>();
        return citations.filter((citation) => {
            const key = `${citation.sourceType}|${citation.sourceName}|${citation.excerpt ?? ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    });

    function originColor(origin: string): string {
        if (origin === 'document') return 'success';
        if (origin === 'enriched') return 'info';
        return 'warning';
    }

    function formatValue(value: unknown): string {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'object') {
            const v = (value as any).value;
            return v !== undefined ? String(v) : JSON.stringify(value);
        }
        return String(value);
    }

    function handleCitationSelect(citation: Citation) {
        if (!citation.neid) return;
        const doc = BNY_DOCUMENTS.find((item) => item.neid === citation.neid);
        if (doc) {
            focusDocument(doc.neid);
            return;
        }
        selectEntity(citation.neid);
    }
</script>
