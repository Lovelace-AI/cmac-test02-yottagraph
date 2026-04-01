<template>
    <v-card v-if="selectedEntity" class="entity-panel" elevation="8" rounded="lg">
        <div class="entity-panel-header pa-3">
            <div class="d-flex align-start justify-space-between ga-2">
                <div class="d-flex align-start ga-2">
                    <v-avatar size="32" variant="tonal" color="primary">
                        <v-icon size="18">{{ flavorIcon(selectedEntity.flavor) }}</v-icon>
                    </v-avatar>
                    <div>
                        <div class="text-caption text-medium-emphasis entity-kicker">
                            Entity profile
                        </div>
                        <div class="text-subtitle-1 font-weight-medium">
                            {{ selectedEntity.name }}
                        </div>
                        <div class="d-flex align-center ga-1 mt-1 flex-wrap">
                            <v-chip
                                size="x-small"
                                variant="tonal"
                                :color="originColor(selectedEntity.origin)"
                            >
                                {{ selectedEntity.origin }}
                            </v-chip>
                            <v-chip size="x-small" variant="outlined">
                                {{ selectedEntity.flavor.replace(/_/g, ' ') }}
                            </v-chip>
                            <v-chip v-if="entitySubtype" size="x-small" variant="outlined">
                                {{ entitySubtype }}
                            </v-chip>
                        </div>
                    </div>
                </div>
                <v-btn
                    icon
                    size="small"
                    aria-label="Close entity details"
                    @click="selectEntity(null)"
                >
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </div>

            <div class="text-caption text-medium-emphasis font-mono mt-2">
                ID: {{ selectedEntity.neid }}
            </div>
            <div v-if="entityDescription" class="text-body-2 mt-2">{{ entityDescription }}</div>
            <div class="d-flex align-center ga-1 mt-2 flex-wrap">
                <v-chip size="x-small" variant="outlined">
                    {{ selectedEntity.sourceDocuments.length }} sources
                </v-chip>
                <v-chip size="x-small" variant="outlined">
                    {{ selectedEntityRelationships.length }} relationships
                </v-chip>
                <v-chip v-if="selectedEntityEvents.length" size="x-small" variant="outlined">
                    {{ selectedEntityEvents.length }} events
                </v-chip>
            </div>
            <div v-if="aliasChips.length" class="d-flex align-center ga-1 mt-2 flex-wrap">
                <span class="text-caption text-medium-emphasis">Also known as</span>
                <v-chip
                    v-for="alias in aliasChips"
                    :key="alias"
                    size="x-small"
                    variant="tonal"
                    color="secondary"
                >
                    {{ alias }}
                </v-chip>
            </div>
        </div>

        <v-alert
            v-if="linkageBanner"
            class="mx-3 mb-2"
            type="info"
            variant="tonal"
            density="compact"
            icon="mdi-link-variant"
        >
            <div class="text-caption font-weight-medium mb-1">Verification</div>
            <div class="text-body-2 mb-1">
                {{ linkageBanner.message }}
                <span v-if="linkageBanner.confidenceText">
                    · {{ linkageBanner.confidenceText }}</span
                >
            </div>
            <div class="d-flex align-center ga-1 flex-wrap">
                <v-chip
                    v-for="idItem in linkageBanner.identifierChips"
                    :key="idItem"
                    size="x-small"
                    variant="outlined"
                >
                    {{ idItem }}
                </v-chip>
                <v-chip
                    v-if="linkageBanner.documentScoped"
                    size="x-small"
                    color="warning"
                    variant="tonal"
                >
                    Document-only match
                </v-chip>
                <v-btn
                    v-if="linkageBanner.studioUrl"
                    size="x-small"
                    variant="text"
                    color="primary"
                    append-icon="mdi-open-in-new"
                    :href="linkageBanner.studioUrl"
                    target="_blank"
                >
                    View in Studio
                </v-btn>
            </div>
        </v-alert>

        <v-tabs
            v-model="activeTab"
            density="compact"
            color="primary"
            slider-color="primary"
            class="px-2 entity-tabs"
        >
            <v-tab v-for="tab in panelTabs" :key="tab.value" :value="tab.value" size="small">
                <v-icon start size="14">{{ tab.icon }}</v-icon>
                {{ tab.label }}
            </v-tab>
        </v-tabs>
        <v-divider />

        <div class="entity-panel-scroll pa-3">
            <section v-if="activeTab === 'properties'" class="d-flex flex-column ga-3">
                <v-card variant="tonal" class="panel-section-card">
                    <v-card-text class="py-2 px-3">
                        <div class="text-caption text-medium-emphasis mb-1">Description</div>
                        <div class="text-body-2">{{ entityRoleSummary }}</div>
                        <v-progress-linear
                            v-if="entityRoleSummaryRewriteLoading"
                            class="mt-2"
                            color="primary"
                            indeterminate
                            rounded
                            height="4"
                        />
                        <div v-if="entityRoleSummaryRewriteLoading" class="text-caption mt-1">
                            Generating contextual narrative from graph evidence...
                        </div>
                        <div
                            v-if="descriptionSnippetPreview.length"
                            class="d-flex flex-column ga-1 mt-2"
                        >
                            <div class="text-caption text-medium-emphasis">Evidence snippets</div>
                            <div
                                v-for="snippet in descriptionSnippetPreview"
                                :key="snippet"
                                class="text-body-2 text-medium-emphasis"
                            >
                                "{{ snippet }}"
                            </div>
                        </div>
                    </v-card-text>
                </v-card>

                <div>
                    <div class="text-subtitle-2 mb-1 panel-subtitle">
                        Document corpus
                        <v-chip size="x-small" variant="tonal" class="ml-1">
                            {{ selectedEntity.sourceDocuments.length }}
                        </v-chip>
                    </div>
                    <div v-if="selectedEntity.sourceDocuments.length" class="d-flex ga-1 flex-wrap">
                        <v-chip
                            v-for="docNeid in selectedEntity.sourceDocuments"
                            :key="docNeid"
                            size="small"
                            variant="tonal"
                        >
                            {{ resolveEntityName(docNeid) }}
                        </v-chip>
                    </div>
                    <div v-else class="text-body-2 text-medium-emphasis">
                        <div
                            v-if="documentCorpusRelationshipLines.length"
                            class="d-flex flex-column ga-1"
                        >
                            <div
                                v-for="line in documentCorpusRelationshipLines"
                                :key="line"
                                class="text-body-2"
                            >
                                {{ line }}
                            </div>
                        </div>
                        <div v-else>No source document associations for this entity.</div>
                    </div>
                </div>

                <div>
                    <div class="text-subtitle-2 mb-1 panel-subtitle">
                        Key properties
                        <v-chip size="x-small" variant="tonal" class="ml-1">
                            {{ keyPropertyRows.length }}
                        </v-chip>
                    </div>
                    <div
                        v-if="!rawDisplayProperties.length && keyPropertyRows.length"
                        class="text-caption text-medium-emphasis mb-2"
                    >
                        Derived from linked relationships and events.
                    </div>
                    <div v-if="keyPropertyRows.length" class="property-table">
                        <div
                            v-for="prop in keyPropertyRows"
                            :key="prop.key"
                            class="property-row py-2 d-flex justify-space-between ga-2"
                        >
                            <div class="text-caption text-medium-emphasis">{{ prop.label }}</div>
                            <div class="text-body-2 text-right">
                                <div>{{ prop.value }}</div>
                                <div v-if="prop.citation" class="text-caption text-medium-emphasis">
                                    {{ prop.citation }}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-body-2 text-medium-emphasis">
                        No key properties extracted yet.
                    </div>
                </div>

                <div class="d-flex ga-2">
                    <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-brain"
                        :loading="agentLoading"
                        @click="runExplainEntity"
                    >
                        Explain
                    </v-btn>
                </div>
                <v-card v-if="entityExplainOutput" variant="outlined" class="panel-section-card">
                    <v-card-text class="py-2 px-3">
                        <div class="text-caption text-medium-emphasis mb-1">Explanation</div>
                        <div class="text-body-2 explain-output">{{ entityExplainOutput }}</div>
                    </v-card-text>
                </v-card>
            </section>

            <section v-else-if="activeTab === 'relationships'" class="d-flex flex-column ga-3">
                <v-card variant="tonal" class="panel-section-card">
                    <v-card-text class="py-2 px-3 text-body-2">
                        {{ relationshipPostureSummary }}
                    </v-card-text>
                </v-card>

                <v-card
                    v-if="relationshipPeerPreview.length"
                    variant="outlined"
                    class="panel-section-card"
                >
                    <v-card-text class="py-2 px-3">
                        <div class="text-caption text-medium-emphasis mb-2">Network preview</div>
                        <div class="text-body-2 font-weight-medium mb-2">
                            {{ selectedEntity.name }}
                        </div>
                        <div class="d-flex ga-1 flex-wrap">
                            <v-chip
                                v-for="peer in relationshipPeerPreview"
                                :key="peer.neid"
                                size="x-small"
                                variant="tonal"
                                class="app-chip-button"
                                @click="selectEntity(peer.neid)"
                            >
                                {{ peer.direction }} {{ peer.name }}
                            </v-chip>
                        </div>
                    </v-card-text>
                </v-card>

                <div v-if="contextLinks.length" class="d-flex ga-1 flex-wrap">
                    <v-chip
                        v-for="link in contextLinks"
                        :key="`${link.kind}-${link.neid}`"
                        size="small"
                        variant="outlined"
                        class="app-chip-button"
                        @click="selectEntity(link.neid)"
                    >
                        {{ link.kind }}: {{ resolveEntityName(link.neid) }}
                    </v-chip>
                </div>

                <v-list
                    v-if="strongestRelationships.length"
                    density="compact"
                    class="pa-0 bg-transparent"
                >
                    <v-list-item
                        v-for="rel in strongestRelationships"
                        :key="`${rel.sourceNeid}-${rel.targetNeid}-${rel.type}`"
                        class="px-0 relation-row"
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
                                {{ normalizeRelationshipType(rel.type) }}
                            </v-chip>
                            {{
                                resolveEntityName(
                                    rel.sourceNeid === selectedEntity.neid
                                        ? rel.targetNeid
                                        : rel.sourceNeid
                                )
                            }}
                        </v-list-item-title>
                        <v-list-item-subtitle class="text-caption text-medium-emphasis mt-1">
                            {{ relationshipEvidenceLabel(rel) }}
                        </v-list-item-subtitle>
                    </v-list-item>
                </v-list>
                <div v-else class="text-body-2 text-medium-emphasis">
                    No relationships are currently linked to this entity.
                </div>
            </section>

            <section v-else-if="activeTab === 'events'" class="d-flex flex-column ga-3">
                <v-card variant="tonal" class="panel-section-card">
                    <v-card-text class="py-2 px-3 text-body-2">
                        Event history scoped to this entity.
                    </v-card-text>
                </v-card>
                <v-timeline
                    v-if="selectedEntityEvents.length"
                    density="compact"
                    side="end"
                    truncate-line="both"
                >
                    <v-timeline-item
                        v-for="eventItem in entityEventsSorted"
                        :key="eventItem.neid"
                        size="small"
                        dot-color="primary"
                    >
                        <div class="text-caption text-medium-emphasis">
                            {{ eventItem.date || 'Date unavailable' }}
                        </div>
                        <div class="text-body-2 font-weight-medium">
                            {{ eventItem.name || eventItem.category || 'Event' }}
                        </div>
                        <div class="text-caption text-medium-emphasis event-line">
                            <v-chip
                                size="x-small"
                                variant="tonal"
                                :color="eventSeverityColor(eventItem)"
                                class="mr-1"
                            >
                                {{ eventSeverity(eventItem) }}
                            </v-chip>
                            <span v-if="eventItem.likelihood">{{ eventItem.likelihood }}</span>
                        </div>
                    </v-timeline-item>
                </v-timeline>
                <div v-else class="text-body-2 text-medium-emphasis">
                    No entity-linked events were found.
                </div>
            </section>

            <section v-else-if="activeTab === 'sources'" class="d-flex flex-column ga-3">
                <v-card variant="tonal" class="panel-section-card">
                    <v-card-text class="py-2 px-3 text-body-2">{{ sourcesNarrative }}</v-card-text>
                </v-card>

                <div>
                    <div class="text-subtitle-2 mb-1 panel-subtitle">Source documents</div>
                    <div v-if="selectedEntity.sourceDocuments.length" class="d-flex ga-1 flex-wrap">
                        <v-chip
                            v-for="docNeid in selectedEntity.sourceDocuments"
                            :key="`source-${docNeid}`"
                            size="small"
                            variant="outlined"
                        >
                            {{ resolveEntityName(docNeid) }}
                        </v-chip>
                    </div>
                    <div v-else class="text-body-2 text-medium-emphasis">
                        No source documents available.
                    </div>
                </div>

                <div>
                    <div class="text-subtitle-2 mb-1 panel-subtitle">Citations</div>
                    <CitationPanel :citations="entityCitations" @select="handleCitationSelect" />
                </div>
                <div v-if="sourceSnippetRows.length">
                    <div class="text-subtitle-2 mb-1 panel-subtitle">Mentions</div>
                    <v-list density="compact" class="pa-0 bg-transparent">
                        <v-list-item
                            v-for="snippet in sourceSnippetRows"
                            :key="`${snippet.sourceName}-${snippet.excerpt}`"
                            class="px-0"
                        >
                            <v-list-item-title class="text-body-2 text-wrap snippet-line">
                                {{ snippet.excerpt }}
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-caption text-medium-emphasis">
                                {{ snippet.sourceName }}
                                <span v-if="snippet.pageRef"> · {{ snippet.pageRef }}</span>
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
                </div>
            </section>

            <section v-else-if="activeTab === 'compare'" class="d-flex flex-column ga-3">
                <v-card variant="tonal" class="panel-section-card">
                    <v-card-text class="py-2 px-3 text-body-2">
                        Compare document-level property history.
                    </v-card-text>
                </v-card>

                <v-expansion-panels
                    v-if="selectedEntityPropertySeries.length"
                    variant="accordion"
                    multiple
                >
                    <v-expansion-panel
                        v-for="series in selectedEntityPropertySeries"
                        :key="`${series.pid}-${series.propertyName}`"
                        :title="series.propertyName"
                    >
                        <v-expansion-panel-text>
                            <v-list density="compact" class="pa-0 bg-transparent">
                                <v-list-item
                                    v-for="point in series.points"
                                    :key="`${series.pid}-${point.recordedAt}-${String(point.value)}`"
                                    class="px-0"
                                >
                                    <v-list-item-title class="text-body-2">
                                        {{ point.recordedAt.slice(0, 10) }} ·
                                        {{ formatValue(point.value) }}
                                    </v-list-item-title>
                                    <v-list-item-subtitle
                                        v-if="point.citation"
                                        class="text-caption"
                                    >
                                        {{ point.citation }}
                                    </v-list-item-subtitle>
                                </v-list-item>
                            </v-list>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
                <div v-else class="text-body-2 text-medium-emphasis">
                    No document-level property history available.
                </div>
            </section>
        </div>
    </v-card>
</template>

<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import type { EventRecord, RelationshipRecord } from '~/utils/collectionTypes';
    import {
        buildCitationsFromPoints,
        buildCitationsFromProperties,
        buildDocumentCitation,
        type Citation,
    } from '~/utils/citationTypes';
    import { BNY_DOCUMENTS } from '~/utils/collectionTypes';

    type PanelTab = 'properties' | 'relationships' | 'events' | 'sources' | 'compare';

    const {
        selectedEntity,
        selectedEntityRelationships,
        selectedEntityEvents,
        selectedEntityPropertySeries,
        documentEntities,
        documentEvents,
        selectEntity,
        resolveEntityName,
        agentLoading,
        agentResult,
        runAgentAction,
    } = useCollectionWorkspace();

    const activeTab = ref<PanelTab>('properties');
    const entityRoleSummaryRewrite = ref('');
    const entityRoleSummaryRewriteLoading = ref(false);
    const entityRoleSummaryCache = ref<Record<string, string>>({});
    const entityRoleSummaryRequestId = ref(0);
    const entityRoleSummaryKey = ref('');

    const panelTabs = computed<Array<{ value: PanelTab; label: string; icon: string }>>(() => {
        const tabs: Array<{ value: PanelTab; label: string; icon: string }> = [
            { value: 'properties', label: 'Properties', icon: 'mdi-table' },
            { value: 'relationships', label: 'Relationships', icon: 'mdi-vector-link' },
            { value: 'sources', label: 'Sources', icon: 'mdi-file-document-multiple-outline' },
        ];
        if (selectedEntityEvents.value.length > 0)
            tabs.splice(2, 0, { value: 'events', label: 'Events', icon: 'mdi-calendar-outline' });
        if (selectedEntityPropertySeries.value.length > 0)
            tabs.push({ value: 'compare', label: 'Compare', icon: 'mdi-compare' });
        return tabs;
    });

    watch(
        () => selectedEntity.value?.neid,
        () => {
            activeTab.value = 'properties';
        }
    );
    watch(panelTabs, (tabs) => {
        if (!tabs.some((tab) => tab.value === activeTab.value)) {
            activeTab.value = tabs[0]?.value ?? 'properties';
        }
    });

    const entityCitations = computed<Citation[]>(() => {
        if (!selectedEntity.value) return [];

        const citations: Citation[] = [];
        let refId = 1;

        for (const docNeid of selectedEntity.value.sourceDocuments) {
            const doc = BNY_DOCUMENTS.find((item) => item.neid === docNeid);
            if (!doc) continue;
            citations.push(
                buildDocumentCitation(
                    `BNY-${doc.documentId}.pdf`,
                    String(refId++),
                    'document',
                    `${selectedEntity.value.name} appears in ${doc.title}`,
                    doc.date
                )
            );
        }

        const propertyCitationInput: Record<string, { value: unknown; citation?: string }> = {};
        for (const [key, value] of Object.entries(selectedEntity.value.properties ?? {})) {
            const normalized = normalizePropertyValue(value);
            propertyCitationInput[key] = {
                value: normalized.value,
                citation: normalized.citation,
            };
        }
        for (const citation of buildCitationsFromProperties(propertyCitationInput)) {
            citations.push({ ...citation, ref: String(refId++) });
        }

        for (const series of selectedEntityPropertySeries.value) {
            for (const citation of buildCitationsFromPoints(series.propertyName, series.points)) {
                citations.push({ ...citation, ref: String(refId++) });
            }
        }

        for (const eventItem of selectedEntityEvents.value) {
            for (const docNeid of eventItem.sourceDocuments) {
                const doc = BNY_DOCUMENTS.find((item) => item.neid === docNeid);
                if (!doc) continue;
                citations.push(
                    buildDocumentCitation(
                        `BNY-${doc.documentId}.pdf`,
                        String(refId++),
                        'event',
                        `${eventItem.name}${eventItem.date ? ` · ${eventItem.date}` : ''}`,
                        doc.date
                    )
                );
            }
        }

        for (const relationship of selectedEntityRelationships.value) {
            const citationTexts =
                relationship.citations && relationship.citations.length > 0
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
                        String(refId++),
                        'relationship',
                        `${normalizeRelationshipType(relationship.type)}: ${resolveEntityName(relationship.sourceNeid)} -> ${resolveEntityName(relationship.targetNeid)}`,
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

    const entitySubtype = computed(() =>
        readPropertyText('entity_subtype', 'subtype', 'agreement_subtype', 'organization_type')
    );
    const entityExplainOutput = computed(() => agentResult.value?.output?.trim() || null);
    const entityDescription = computed(() =>
        readPropertyText('description', 'entity_description', 'summary', 'notes')
    );
    const entityWikipediaUrl = computed(() =>
        readPropertyText('wikipedia_url', 'wikipedia', 'wiki_url', 'wiki', 'external_url', 'url')
    );
    const aliasChips = computed(() => {
        const aliasValue = readPropertyRaw('aliases', 'alias', 'aka', 'also_known_as');
        if (!aliasValue) return [];
        if (Array.isArray(aliasValue))
            return aliasValue
                .map((v) => String(v))
                .filter(Boolean)
                .slice(0, 6);
        return String(aliasValue)
            .split(/[;,|]/)
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 6);
    });

    const linkageBanner = computed(() => {
        const matchedName = readPropertyText('matched_name', 'canonical_name', 'resolved_name');
        const confidence = readPropertyText('match_confidence', 'link_confidence');
        const studioUrl = readPropertyText('studio_url');
        const idPairs: Array<[string, string | undefined]> = [
            ['CIK', readPropertyText('cik')],
            ['Ticker', readPropertyText('ticker')],
            ['LEI', readPropertyText('lei')],
            ['ISIN', readPropertyText('isin')],
        ];
        const identifierChips = idPairs
            .filter((item): item is [string, string] => Boolean(item[1]))
            .map(([label, value]) => `${label}: ${value}`);
        const documentScoped =
            readPropertyText('link_scope', 'match_scope')?.toLowerCase().includes('document') ??
            false;
        const confidenceText = confidence ? `Confidence ${confidence}` : '';
        const message = matchedName
            ? `Matched to ${matchedName}`
            : identifierChips.length
              ? 'Canonical identifiers available'
              : '';
        if (!message && !confidenceText && !documentScoped && !studioUrl) return null;
        return {
            message: message || 'Linkage context available.',
            confidenceText,
            identifierChips,
            documentScoped,
            studioUrl,
        };
    });

    const strongestRelationships = computed(() =>
        [...selectedEntityRelationships.value]
            .sort((a, b) => {
                const aEvidence = (a.citations?.length ?? 0) + (a.sourceDocumentNeid ? 1 : 0);
                const bEvidence = (b.citations?.length ?? 0) + (b.sourceDocumentNeid ? 1 : 0);
                if (bEvidence !== aEvidence) return bEvidence - aEvidence;
                return (b.recordedAt || '').localeCompare(a.recordedAt || '');
            })
            .slice(0, 12)
    );
    const documentEntityNeidSet = computed(
        () => new Set(documentEntities.value.map((e) => e.neid))
    );
    const documentEventNeidSet = computed(() => new Set(documentEvents.value.map((e) => e.neid)));
    const documentCorpusRelationshipLines = computed(() => {
        if (!selectedEntity.value) return [] as string[];
        const lines: string[] = [];
        for (const relationship of selectedEntityRelationships.value) {
            const otherNeid =
                relationship.sourceNeid === selectedEntity.value.neid
                    ? relationship.targetNeid
                    : relationship.sourceNeid;
            const pointsToDocument = BNY_DOCUMENTS.some((doc) => doc.neid === otherNeid);
            const pointsToDocumentGraphEntity = documentEntityNeidSet.value.has(otherNeid);
            const pointsToDocumentGraphEvent = documentEventNeidSet.value.has(otherNeid);
            if (!pointsToDocument && !pointsToDocumentGraphEntity && !pointsToDocumentGraphEvent) {
                continue;
            }
            const targetLabel = pointsToDocument
                ? `document ${resolveEntityName(otherNeid)}`
                : pointsToDocumentGraphEvent
                  ? `document event ${resolveEntityName(otherNeid)}`
                  : `document entity ${resolveEntityName(otherNeid)}`;
            const relType = normalizeRelationshipType(relationship.type);
            lines.push(`Linked via ${relType} to ${targetLabel}.`);
        }
        return Array.from(new Set(lines)).slice(0, 5);
    });
    const relationshipPeerPreview = computed(() => {
        if (!selectedEntity.value) return [];
        return strongestRelationships.value.slice(0, 6).map((rel) => {
            const inbound = rel.targetNeid === selectedEntity.value!.neid;
            const peerNeid = inbound ? rel.sourceNeid : rel.targetNeid;
            return {
                neid: peerNeid,
                direction: inbound ? 'From' : 'To',
                name: resolveEntityName(peerNeid),
            };
        });
    });

    const contextLinks = computed(() => {
        if (!selectedEntity.value) return [];
        const related: Array<{ kind: string; neid: string }> = [];
        for (const rel of selectedEntityRelationships.value) {
            const otherNeid =
                rel.sourceNeid === selectedEntity.value.neid ? rel.targetNeid : rel.sourceNeid;
            const relType = normalizeRelationshipType(rel.type).toLowerCase();
            if (relType.includes('works at')) related.push({ kind: 'Employer', neid: otherNeid });
            if (relType.includes('parent') || relType.includes('subsidiary'))
                related.push({ kind: 'Parent', neid: otherNeid });
            if (relType.includes('successor') || relType.includes('predecessor'))
                related.push({ kind: 'Successor chain', neid: otherNeid });
        }
        const seen = new Set<string>();
        return related.filter((item) => {
            const key = `${item.kind}|${item.neid}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    });

    const entityEventsSorted = computed(() =>
        [...selectedEntityEvents.value].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    );

    const rawDisplayProperties = computed(() => {
        if (!selectedEntity.value) return [];
        const ignoredPrefixes = ['_', 'internal_', 'debug_', 'embedding', 'vector'];
        const ignoredExact = new Set(['eid', 'neid', 'id', 'pid']);
        return Object.entries(selectedEntity.value.properties ?? {})
            .filter(([key]) => {
                if (ignoredExact.has(key.toLowerCase())) return false;
                return !ignoredPrefixes.some((prefix) => key.toLowerCase().startsWith(prefix));
            })
            .map(([key, value]) => {
                const normalized = normalizePropertyValue(value);
                return {
                    key,
                    label: key.replace(/_/g, ' '),
                    value: formatValue(normalized.value),
                    citation: normalized.citation,
                };
            })
            .slice(0, 40);
    });
    const derivedDisplayProperties = computed(() => {
        if (!selectedEntity.value)
            return [] as Array<{
                key: string;
                label: string;
                value: string;
                citation?: string;
            }>;

        const groupedRelationships = new Map<
            string,
            {
                label: string;
                names: Set<string>;
                relationshipCount: number;
            }
        >();
        const selectedNeid = selectedEntity.value.neid;
        const excludedRelationshipTypes = new Set(['appears_in', 'participant']);

        for (const relationship of selectedEntityRelationships.value) {
            const rawType = relationship.type.replace(/schema::relationship::/, '');
            if (excludedRelationshipTypes.has(rawType)) continue;

            const outgoing = relationship.sourceNeid === selectedNeid;
            const otherNeid = outgoing ? relationship.targetNeid : relationship.sourceNeid;
            const otherName = resolveEntityName(otherNeid);
            if (!otherName || otherName === selectedEntity.value.name) continue;

            const label = directionalRelationshipLabel(rawType, outgoing);
            const bucket = groupedRelationships.get(label) ?? {
                label,
                names: new Set<string>(),
                relationshipCount: 0,
            };
            bucket.names.add(otherName);
            bucket.relationshipCount += 1;
            groupedRelationships.set(label, bucket);
        }

        const relationshipRows = Array.from(groupedRelationships.values())
            .sort((a, b) => {
                const priorityDelta =
                    relationshipLabelPriority(b.label) - relationshipLabelPriority(a.label);
                if (priorityDelta !== 0) return priorityDelta;
                if (b.names.size !== a.names.size) return b.names.size - a.names.size;
                return a.label.localeCompare(b.label);
            })
            .map((group) => ({
                key: `derived-${group.label}`,
                label: group.label,
                value: formatListPreview(Array.from(group.names)),
                citation: `${group.relationshipCount} linked relationship${
                    group.relationshipCount === 1 ? '' : 's'
                }`,
            }));

        const rows = relationshipRows.slice(0, 6);

        if (selectedEntityEvents.value.length > 0) {
            rows.push({
                key: 'derived-event-participation',
                label: 'Event participation',
                value: formatListPreview(
                    selectedEntityEvents.value
                        .map((eventItem) => {
                            const dateLabel = eventItem.date?.slice(0, 10);
                            return dateLabel
                                ? `${eventItem.name} (${dateLabel})`
                                : eventItem.name || 'Event';
                        })
                        .filter(Boolean)
                ),
                citation: `${selectedEntityEvents.value.length} linked event${
                    selectedEntityEvents.value.length === 1 ? '' : 's'
                }`,
            });
        }

        if (rows.length === 0 && selectedEntity.value.sourceDocuments.length > 0) {
            rows.push({
                key: 'derived-source-documents',
                label: 'Document support',
                value: formatListPreview(
                    selectedEntity.value.sourceDocuments.map((docNeid) =>
                        resolveEntityName(docNeid)
                    )
                ),
                citation: `${selectedEntity.value.sourceDocuments.length} source document${
                    selectedEntity.value.sourceDocuments.length === 1 ? '' : 's'
                }`,
            });
        }

        return rows;
    });
    const keyPropertyRows = computed(() =>
        rawDisplayProperties.value.length > 0
            ? rawDisplayProperties.value
            : derivedDisplayProperties.value
    );

    const relationshipPostureSummary = computed(() => {
        if (!selectedEntity.value) return '';
        const total = selectedEntityRelationships.value.length;
        const evidenceBacked = selectedEntityRelationships.value.filter(
            (rel) => Boolean(rel.sourceDocumentNeid) || (rel.citations?.length ?? 0) > 0
        ).length;
        const inbound = selectedEntityRelationships.value.filter(
            (rel) => rel.targetNeid === selectedEntity.value?.neid
        ).length;
        const outbound = total - inbound;
        return `${selectedEntity.value.name} has ${total} linked relationships (${inbound} inbound, ${outbound} outbound), with ${evidenceBacked} source-backed.`;
    });

    const entityRoleSummaryBase = computed(() => {
        if (!selectedEntity.value) return '';
        const relCount = selectedEntityRelationships.value.length;
        const eventCount = selectedEntityEvents.value.length;
        const sourceCount = selectedEntity.value.sourceDocuments.length;
        const flavor = selectedEntity.value.flavor.replace(/_/g, ' ');
        const relationshipHighlights = strongestRelationships.value.slice(0, 3).map((rel) => {
            const inbound = rel.targetNeid === selectedEntity.value!.neid;
            const otherNeid = inbound ? rel.sourceNeid : rel.targetNeid;
            const direction = inbound ? 'from' : 'to';
            return `${normalizeRelationshipType(rel.type)} ${direction} ${resolveEntityName(otherNeid)}`;
        });
        const eventHighlights = entityEventsSorted.value
            .slice(0, 3)
            .map(
                (eventItem) =>
                    `${eventItem.name}${eventItem.date ? ` (${eventItem.date.slice(0, 10)})` : ''}`
            );
        const sourceHighlights = selectedEntity.value.sourceDocuments
            .slice(0, 4)
            .map((docNeid) => resolveEntityName(docNeid));
        const relationshipText = relationshipHighlights.length
            ? `Key relationships include ${relationshipHighlights.join('; ')}.`
            : 'No named relationship counterparties are currently linked.';
        const eventText = eventHighlights.length
            ? `Related events: ${eventHighlights.join('; ')}.`
            : 'No linked events are currently available.';
        const sourceText = sourceHighlights.length
            ? `Source documents: ${sourceHighlights.join(', ')}.`
            : 'No source documents are currently linked.';
        return `${selectedEntity.value.name} is a ${flavor} connected by ${formatCount(relCount)} relationship${relCount === 1 ? '' : 's'}, participating in ${formatCount(eventCount)} event${eventCount === 1 ? '' : 's'}, and backed by ${formatCount(sourceCount)} source document${sourceCount === 1 ? '' : 's'}. ${relationshipText} ${eventText} ${sourceText}`;
    });
    const entityRoleSummary = computed(
        () => entityRoleSummaryRewrite.value || entityRoleSummaryBase.value
    );

    const sourcesNarrative = computed(() => {
        if (!selectedEntity.value) return '';
        const sourceCount = selectedEntity.value.sourceDocuments.length;
        if (!sourceCount) {
            return 'No source-document mentions are available for this entity yet.';
        }
        return `${selectedEntity.value.name} appears in ${sourceCount} source document${sourceCount === 1 ? '' : 's'} with supporting citations from relationships, events, and properties.`;
    });
    const sourceSnippetRows = computed(() => {
        return entityCitations.value
            .filter((citation) => Boolean(citation.excerpt))
            .slice(0, 8)
            .map((citation) => ({
                sourceName: citation.sourceName,
                excerpt: citation.excerpt ?? '',
                pageRef: extractPageRef(citation.excerpt ?? ''),
            }));
    });
    const descriptionSnippetPreview = computed(() =>
        sourceSnippetRows.value
            .map((row) => row.excerpt.trim())
            .filter(Boolean)
            .slice(0, 2)
    );

    function originColor(origin: string): string {
        if (origin === 'document') return 'success';
        if (origin === 'enriched') return 'info';
        return 'warning';
    }

    function flavorIcon(flavor: string): string {
        const icons: Record<string, string> = {
            organization: 'mdi-domain',
            person: 'mdi-account',
            financial_instrument: 'mdi-bank',
            location: 'mdi-map-marker',
            fund_account: 'mdi-wallet',
            legal_agreement: 'mdi-file-document-outline',
        };
        return icons[flavor] ?? 'mdi-shape-outline';
    }

    function normalizeRelationshipType(type: string): string {
        return type.replace(/schema::relationship::/, '').replace(/_/g, ' ');
    }

    function directionalRelationshipLabel(type: string, outgoing: boolean): string {
        const labels: Record<string, { outgoing: string; incoming: string }> = {
            advisor_to: { outgoing: 'Advisor to', incoming: 'Advised by' },
            advises: { outgoing: 'Advises', incoming: 'Advised by' },
            located_at: { outgoing: 'Located at', incoming: 'Location of' },
            located_in: { outgoing: 'Located in', incoming: 'Location of' },
            headquartered_in: { outgoing: 'Headquartered in', incoming: 'Headquarters of' },
            is_headquartered_in: { outgoing: 'Headquartered in', incoming: 'Headquarters of' },
            is_headquartered_at: { outgoing: 'Headquartered at', incoming: 'Headquarters of' },
            predecessor_of: { outgoing: 'Predecessor to', incoming: 'Successor to' },
            successor_to: { outgoing: 'Successor to', incoming: 'Predecessor to' },
            party_to: { outgoing: 'Party to', incoming: 'Has party' },
            trustee_of: { outgoing: 'Trustee of', incoming: 'Trustee' },
            issuer_of: { outgoing: 'Issuer of', incoming: 'Issued by' },
            borrower_of: { outgoing: 'Borrower of', incoming: 'Borrower' },
            beneficiary_of: { outgoing: 'Beneficiary of', incoming: 'Beneficiary' },
        };
        const mapped = labels[type];
        if (mapped) return outgoing ? mapped.outgoing : mapped.incoming;
        const normalized = normalizeRelationshipType(type);
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    function relationshipLabelPriority(label: string): number {
        const priorities: Record<string, number> = {
            'Headquartered in': 110,
            'Headquartered at': 108,
            'Located at': 106,
            'Located in': 104,
            'Advisor to': 100,
            Advises: 98,
            'Party to': 94,
            'Trustee of': 92,
            'Issuer of': 90,
            'Borrower of': 88,
            'Beneficiary of': 86,
            'Successor to': 84,
            'Predecessor to': 82,
        };
        return priorities[label] ?? 50;
    }

    function normalizePropertyValue(value: unknown): { value: unknown; citation?: string } {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const obj = value as Record<string, unknown>;
            return {
                value: obj.value ?? value,
                citation: typeof obj.citation === 'string' ? obj.citation : undefined,
            };
        }
        return { value };
    }

    function formatValue(value: unknown): string {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'number') return value.toLocaleString();
        if (Array.isArray(value))
            return value
                .map((item) => (typeof item === 'number' ? item.toLocaleString() : String(item)))
                .join(', ');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    function formatCount(value: number): string {
        return value.toLocaleString();
    }

    function formatListPreview(values: string[], maxItems = 3): string {
        const uniqueValues = Array.from(
            new Set(values.map((value) => value.trim()).filter(Boolean))
        );
        if (uniqueValues.length === 0) return '—';
        const preview = uniqueValues.slice(0, maxItems).join(', ');
        const remaining = uniqueValues.length - maxItems;
        return remaining > 0 ? `${preview} +${remaining} more` : preview;
    }

    function readPropertyRaw(...keys: string[]): unknown {
        if (!selectedEntity.value?.properties) return undefined;
        const propertyEntries = selectedEntity.value.properties as Record<string, unknown>;
        for (const key of keys) {
            if (!(key in propertyEntries)) continue;
            const normalized = normalizePropertyValue(propertyEntries[key]);
            return normalized.value;
        }
        return undefined;
    }

    function readPropertyText(...keys: string[]): string | undefined {
        const value = readPropertyRaw(...keys);
        if (value === null || value === undefined) return undefined;
        const text = String(value).trim();
        return text ? text : undefined;
    }

    function relationshipEvidenceLabel(rel: RelationshipRecord): string {
        const evidenceCount = (rel.citations?.length ?? 0) + (rel.sourceDocumentNeid ? 1 : 0);
        const parts = [`${evidenceCount} evidence item${evidenceCount === 1 ? '' : 's'}`];
        if (rel.recordedAt) parts.push(rel.recordedAt.slice(0, 10));
        if (rel.sourceDocumentNeid) parts.push(resolveEntityName(rel.sourceDocumentNeid));
        return parts.join(' · ');
    }

    function eventSeverity(eventItem: EventRecord): string {
        const likelihood = (eventItem.likelihood ?? '').toLowerCase();
        if (likelihood === 'possible') return 'Speculative';
        if (likelihood === 'likely') return 'High confidence';
        return 'Standard';
    }
    function eventSeverityColor(eventItem: EventRecord): string {
        const label = eventSeverity(eventItem);
        if (label === 'Speculative') return 'warning';
        if (label === 'High confidence') return 'success';
        return 'info';
    }
    function extractPageRef(text: string): string | null {
        const match = text.match(/p(?:age)?\s*(\d+)/i);
        return match ? `p.${match[1]}` : null;
    }

    function handleCitationSelect(citation: Citation) {
        if (!citation.neid) return;
        const doc = BNY_DOCUMENTS.find((item) => item.neid === citation.neid);
        if (doc) return;
        selectEntity(citation.neid);
    }

    function buildEntityRoleSummaryKey(): string {
        if (!selectedEntity.value) return '';
        const relationshipPropertyAnchors = strongestRelationships.value
            .slice(0, 4)
            .map((rel) => {
                const propertyKeys = Object.keys(rel.properties ?? {})
                    .sort()
                    .slice(0, 4)
                    .join(',');
                return `${rel.type}:${propertyKeys}`;
            })
            .join('|');
        const relationshipAnchors = strongestRelationships.value
            .slice(0, 4)
            .map((rel) => `${rel.type}:${rel.sourceNeid}:${rel.targetNeid}`)
            .join('|');
        const eventAnchors = entityEventsSorted.value
            .slice(0, 4)
            .map((eventItem) => `${eventItem.neid}:${eventItem.date ?? ''}`)
            .join('|');
        return [
            selectedEntity.value.neid,
            selectedEntityRelationships.value.length,
            selectedEntityEvents.value.length,
            selectedEntity.value.sourceDocuments.length,
            relationshipAnchors,
            relationshipPropertyAnchors,
            eventAnchors,
            entityDescription.value ?? '',
            entityWikipediaUrl.value ?? '',
            descriptionSnippetPreview.value.join('|'),
        ].join('::');
    }

    function buildEntityRoleRewritePrompt(): string {
        if (!selectedEntity.value) return '';
        const relationshipContext =
            strongestRelationships.value
                .slice(0, 4)
                .map((rel) => {
                    const inbound = rel.targetNeid === selectedEntity.value!.neid;
                    const peerNeid = inbound ? rel.sourceNeid : rel.targetNeid;
                    const direction = inbound ? 'from' : 'to';
                    return `${normalizeRelationshipType(rel.type)} ${direction} ${resolveEntityName(peerNeid)}`;
                })
                .join(' | ') || 'none';
        const eventContext =
            entityEventsSorted.value
                .slice(0, 4)
                .map(
                    (eventItem) =>
                        `${eventItem.name}${eventItem.date ? ` (${eventItem.date.slice(0, 10)})` : ''}`
                )
                .join(' | ') || 'none';
        const documentContext =
            selectedEntity.value.sourceDocuments
                .slice(0, 5)
                .map((docNeid) => resolveEntityName(docNeid))
                .join(' | ') || 'none';
        const relationshipPropertyContext =
            strongestRelationships.value
                .slice(0, 4)
                .map((rel) => {
                    const propertyText = Object.entries(rel.properties ?? {})
                        .slice(0, 2)
                        .map(([key, value]) => `${key}: ${formatValue(value)}`)
                        .join(', ');
                    if (!propertyText) return null;
                    const inbound = rel.targetNeid === selectedEntity.value!.neid;
                    const peerNeid = inbound ? rel.sourceNeid : rel.targetNeid;
                    return `${normalizeRelationshipType(rel.type)} with ${resolveEntityName(peerNeid)} (${propertyText})`;
                })
                .filter((row): row is string => Boolean(row))
                .join(' | ') || 'none';
        const snippetContext = descriptionSnippetPreview.value.join(' | ') || 'none';
        return [
            'Write a contextual entity description grounded in the collection evidence.',
            'Use concise financial-journal tone (Economist/WSJ style): specific, neutral, and readable.',
            'Output plain text only, 3-5 sentences, no bullets.',
            'Do not output a list. Integrate facts into narrative.',
            'Do not invent facts. Use only provided evidence.',
            `Entity: ${selectedEntity.value.name} (${selectedEntity.value.flavor.replace(/_/g, ' ')}).`,
            `Known background description: ${entityDescription.value || 'none'}.`,
            `Reference URL (if available): ${entityWikipediaUrl.value || 'none'}.`,
            `Current summary: ${entityRoleSummaryBase.value}`,
            `Key relationships: ${relationshipContext}.`,
            `Relationship property details: ${relationshipPropertyContext}.`,
            `Related events: ${eventContext}.`,
            `Source documents: ${documentContext}.`,
            `Evidence snippets: ${snippetContext}.`,
        ].join('\n');
    }

    async function refreshEntityRoleSummary(): Promise<void> {
        if (!selectedEntity.value) {
            entityRoleSummaryRewrite.value = '';
            entityRoleSummaryRewriteLoading.value = false;
            entityRoleSummaryKey.value = '';
            return;
        }

        const key = buildEntityRoleSummaryKey();
        const cached = entityRoleSummaryCache.value[key];
        if (cached) {
            entityRoleSummaryKey.value = key;
            entityRoleSummaryRewrite.value = cached;
            entityRoleSummaryRewriteLoading.value = false;
            return;
        }

        const prompt = buildEntityRoleRewritePrompt();
        if (!prompt.trim()) {
            entityRoleSummaryRewrite.value = '';
            return;
        }

        entityRoleSummaryKey.value = key;
        const requestId = ++entityRoleSummaryRequestId.value;
        entityRoleSummaryRewriteLoading.value = true;

        try {
            const { activeProject } = useProjectStore();
            const response = await $fetch<{ output?: string }>('/api/collection/answer', {
                method: 'POST',
                body: {
                    action: 'entity_description',
                    entityNeid: selectedEntity.value.neid,
                    question: prompt,
                    projectId: activeProject.value?.id,
                },
            });
            if (requestId !== entityRoleSummaryRequestId.value) return;
            const polished = response?.output?.trim() || '';
            if (polished) {
                entityRoleSummaryRewrite.value = polished;
                entityRoleSummaryCache.value[key] = polished;
            }
        } catch {
            // Keep deterministic fallback when Gemini rewrite is unavailable.
            if (requestId !== entityRoleSummaryRequestId.value) return;
            entityRoleSummaryRewrite.value = '';
        } finally {
            if (requestId === entityRoleSummaryRequestId.value) {
                entityRoleSummaryRewriteLoading.value = false;
            }
        }
    }

    watch(
        () => buildEntityRoleSummaryKey(),
        () => {
            entityRoleSummaryRewrite.value = '';
            void refreshEntityRoleSummary();
        },
        { immediate: true }
    );

    async function runExplainEntity() {
        if (!selectedEntity.value) return;
        const relationshipPropertyContext =
            strongestRelationships.value
                .slice(0, 6)
                .map((rel) => {
                    const inbound = rel.targetNeid === selectedEntity.value!.neid;
                    const peerNeid = inbound ? rel.sourceNeid : rel.targetNeid;
                    const props = Object.entries(rel.properties ?? {})
                        .slice(0, 3)
                        .map(([key, value]) => `${key}: ${formatValue(value)}`)
                        .join(', ');
                    return `${normalizeRelationshipType(rel.type)} ${inbound ? 'from' : 'to'} ${resolveEntityName(peerNeid)}${props ? ` (${props})` : ''}`;
                })
                .join(' | ') || 'none';
        const prompt = [
            `Explain the role of ${selectedEntity.value.name} in this collection.`,
            `Entity type: ${selectedEntity.value.flavor}.`,
            `Background description: ${entityDescription.value || 'none'}.`,
            `Reference URL: ${entityWikipediaUrl.value || 'none'}.`,
            `Document corpus links: ${selectedEntity.value.sourceDocuments.map((docNeid) => resolveEntityName(docNeid)).join(', ') || 'none'}.`,
            `Relationship count: ${selectedEntityRelationships.value.length}.`,
            `Event count: ${selectedEntityEvents.value.length}.`,
            `Top relationship counterparties: ${
                relationshipPeerPreview.value
                    .map((peer) => peer?.name)
                    .filter((name): name is string => Boolean(name))
                    .slice(0, 6)
                    .join(', ') || 'none'
            }.`,
            `Relationship property evidence: ${relationshipPropertyContext}.`,
            `Evidence snippets: ${descriptionSnippetPreview.value.join(' | ') || 'none'}.`,
            `Document-graph context: ${documentCorpusRelationshipLines.value.join(' ') || 'No additional document-graph linkage summary available.'}`,
            `Role summary: ${entityRoleSummaryBase.value}`,
            "Explain this entity's purpose in the graph: what function it serves, how it connects counterparties/events, and why those links matter in this deal context.",
            'Answer using the supplied collection context. Do not ask for more context unless the data above is actually insufficient.',
        ].join(' ');
        await runAgentAction('explain_entity', {
            entityNeid: selectedEntity.value.neid,
            question: prompt,
        });
    }
</script>

<style scoped>
    .entity-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--app-divider-strong);
        background: var(--dynamic-surface);
        box-shadow:
            0 18px 36px rgba(0, 0, 0, 0.22),
            0 6px 18px rgba(0, 0, 0, 0.12);
    }

    .entity-panel-header {
        flex-shrink: 0;
        border-bottom: 1px solid var(--app-divider);
        background: color-mix(in srgb, var(--app-subtle-surface) 72%, transparent);
    }

    .entity-panel-scroll {
        flex: 1;
        min-height: 0;
        overflow: auto;
        scrollbar-gutter: stable both-edges;
    }

    .property-table {
        border: 1px solid var(--app-divider);
        border-radius: 8px;
        padding: 0 10px;
        background: color-mix(in srgb, var(--app-subtle-surface) 35%, transparent);
    }

    .property-row + .property-row {
        border-top: 1px solid var(--app-divider);
    }

    .entity-tabs :deep(.v-tab) {
        text-transform: none;
        letter-spacing: 0;
        min-width: 0;
        padding-inline: 8px;
    }

    .entity-tabs :deep(.v-slide-group__content) {
        gap: 4px;
    }

    .entity-tabs :deep(.v-tab.v-tab--selected) {
        border-radius: 8px 8px 0 0;
        background: color-mix(in srgb, var(--dynamic-primary) 10%, transparent);
        font-weight: 600;
    }

    .panel-section-card {
        border: 1px solid color-mix(in srgb, var(--app-divider) 75%, transparent);
    }

    .panel-subtitle {
        letter-spacing: 0.01em;
    }

    .relation-row {
        border-radius: 8px;
        cursor: pointer;
    }

    .relation-row:hover {
        background: color-mix(in srgb, var(--app-subtle-surface-2) 62%, transparent);
    }

    .event-line {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .snippet-line {
        line-height: 1.4;
    }

    .entity-kicker {
        letter-spacing: 0.06em;
        text-transform: uppercase;
    }

    .explain-output {
        white-space: pre-wrap;
        line-height: 1.6;
    }
</style>
