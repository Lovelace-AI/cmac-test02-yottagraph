<template>
    <v-card v-if="selectedEntity" class="entity-panel" elevation="8" rounded="lg">
        <v-toolbar density="compact" color="surface">
            <v-toolbar-title class="text-body-1">Entity detail</v-toolbar-title>
            <v-btn icon size="small" aria-label="Close entity details" @click="selectEntity(null)">
                <v-icon>mdi-close</v-icon>
            </v-btn>
        </v-toolbar>

        <div class="pa-4 entity-scroll">
            <div class="text-h6 mb-1">{{ selectedEntity.name }}</div>
            <div class="d-flex align-center ga-2 mb-3">
                <v-chip size="small" variant="tonal" :color="originColor(selectedEntity.origin)">
                    {{ selectedEntity.origin }}
                </v-chip>
                <v-chip size="small" variant="outlined">
                    {{ selectedEntity.flavor }}
                </v-chip>
            </div>

            <div class="text-caption text-medium-emphasis font-mono mb-4">
                NEID: {{ selectedEntity.neid }}
            </div>

            <v-card variant="tonal" class="mb-3">
                <v-card-text class="py-2 px-3">
                    <div class="text-caption text-medium-emphasis mb-1">
                        Why this entity matters
                    </div>
                    <div class="text-body-2">{{ entityRoleSummary }}</div>
                </v-card-text>
            </v-card>

            <v-divider class="mb-3" />

            <div class="text-subtitle-2 mb-2">Source Documents</div>
            <div v-if="selectedEntity.sourceDocuments.length" class="mb-4">
                <v-chip
                    v-for="docNeid in selectedEntity.sourceDocuments"
                    :key="docNeid"
                    size="small"
                    variant="tonal"
                    class="mr-1 mb-1 app-chip-button"
                    tabindex="0"
                    role="button"
                    @click="focusDocument(docNeid)"
                    @keydown.enter.prevent="focusDocument(docNeid)"
                    @keydown.space.prevent="focusDocument(docNeid)"
                >
                    {{ resolveEntityName(docNeid) }}
                </v-chip>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis mb-4">
                No source document associations.
            </div>

            <v-divider class="mb-3" />

            <div class="text-subtitle-2 mb-2">
                Strongest Relationships
                <v-chip size="x-small" variant="tonal" class="ml-1">
                    {{ selectedEntityRelationships.length }}
                </v-chip>
            </div>
            <v-list v-if="selectedEntityRelationships.length" density="compact" class="pa-0 mb-4">
                <v-list-item
                    v-for="(rel, i) in strongestRelationships"
                    :key="i"
                    class="px-0"
                    tabindex="0"
                    role="button"
                    @click="
                        selectEntity(
                            rel.sourceNeid === selectedEntity.neid ? rel.targetNeid : rel.sourceNeid
                        )
                    "
                    @keydown.enter.prevent="
                        selectEntity(
                            rel.sourceNeid === selectedEntity.neid ? rel.targetNeid : rel.sourceNeid
                        )
                    "
                    @keydown.space.prevent="
                        selectEntity(
                            rel.sourceNeid === selectedEntity.neid ? rel.targetNeid : rel.sourceNeid
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
            <div v-else class="text-body-2 text-medium-emphasis mb-4">No relationships found.</div>

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
            <div v-if="selectedEntity.properties && Object.keys(selectedEntity.properties).length">
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

            <div class="text-subtitle-2 mb-2">Recommended next checks</div>
            <v-list density="compact" class="pa-0 mb-3">
                <v-list-item v-for="step in recommendedChecks" :key="step" class="px-0">
                    <template #prepend>
                        <v-icon size="14" color="primary" class="mr-2">mdi-arrow-right</v-icon>
                    </template>
                    <v-list-item-title class="text-body-2 text-wrap">{{ step }}</v-list-item-title>
                </v-list-item>
            </v-list>

            <v-divider class="my-3" />

            <div class="d-flex ga-2">
                <v-btn
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-brain"
                    @click="runAgentAction('explain_entity', { entityNeid: selectedEntity.neid })"
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
    </v-card>
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

    const strongestRelationships = computed(() =>
        [...selectedEntityRelationships.value]
            .sort((a, b) => {
                const aEvidence = (a.citations?.length ?? 0) + (a.sourceDocumentNeid ? 1 : 0);
                const bEvidence = (b.citations?.length ?? 0) + (b.sourceDocumentNeid ? 1 : 0);
                if (bEvidence !== aEvidence) return bEvidence - aEvidence;
                return (b.recordedAt || '').localeCompare(a.recordedAt || '');
            })
            .slice(0, 10)
    );

    const entityRoleSummary = computed(() => {
        if (!selectedEntity.value) return '';
        const relCount = selectedEntityRelationships.value.length;
        const eventCount = selectedEntityEvents.value.length;
        const sourceCount = selectedEntity.value.sourceDocuments.length;
        const flavor = selectedEntity.value.flavor.replace(/_/g, ' ');
        return `${selectedEntity.value.name} is a ${flavor} connected by ${relCount} relationship${relCount === 1 ? '' : 's'}, participating in ${eventCount} event${eventCount === 1 ? '' : 's'}, and backed by ${sourceCount} source document${sourceCount === 1 ? '' : 's'}.`;
    });

    const recommendedChecks = computed(() => {
        if (!selectedEntity.value) return [];
        const checks = [
            'Review linked source documents for direct evidence.',
            'Inspect strongest relationships to validate direction and type.',
        ];
        if (selectedEntityEvents.value.length > 0) {
            checks.push('Trace associated events to understand timeline impact.');
        } else {
            checks.push('No linked events found. Confirm whether timeline evidence is missing.');
        }
        checks.push('Use copilot Explain to generate an evidence-linked narrative.');
        return checks;
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

<style scoped>
    .entity-panel {
        height: 100%;
        border: 1px solid var(--app-divider-strong);
        background: color-mix(in srgb, var(--v-theme-surface) 94%, transparent);
    }

    .entity-scroll {
        height: calc(100% - 48px);
        overflow: auto;
    }
</style>
