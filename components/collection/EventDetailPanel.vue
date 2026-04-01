<template>
    <v-card v-if="selectedEvent" class="event-panel" elevation="8" rounded="lg">
        <div class="event-panel-header pa-3">
            <div class="d-flex align-start justify-space-between ga-2">
                <div class="d-flex align-start ga-2">
                    <v-avatar size="32" variant="tonal" color="primary">
                        <v-icon size="18">mdi-calendar-star-outline</v-icon>
                    </v-avatar>
                    <div>
                        <div class="text-caption text-medium-emphasis panel-kicker">
                            Event profile
                        </div>
                        <div class="text-subtitle-1 font-weight-medium">
                            {{ selectedEvent.name || selectedEvent.category || 'Event' }}
                        </div>
                        <div class="d-flex align-center ga-1 mt-1 flex-wrap">
                            <v-chip v-if="selectedEvent.category" size="x-small" variant="outlined">
                                {{ selectedEvent.category }}
                            </v-chip>
                            <v-chip
                                v-if="selectedEvent.likelihood"
                                size="x-small"
                                variant="tonal"
                                :color="eventSeverityColor(selectedEvent)"
                            >
                                {{ eventSeverity(selectedEvent) }}
                            </v-chip>
                        </div>
                    </div>
                </div>
                <v-btn
                    icon
                    size="small"
                    aria-label="Close event details"
                    @click="selectEvent(null)"
                >
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </div>

            <div class="text-caption text-medium-emphasis font-mono mt-2">
                ID: {{ selectedEvent.neid }}
            </div>
            <div v-if="eventDateLabel" class="text-body-2 mt-2">
                {{ eventDateLabel }}
            </div>
            <div v-if="selectedEvent.description" class="text-body-2 mt-2">
                {{ selectedEvent.description }}
            </div>
            <div class="d-flex align-center ga-1 mt-2 flex-wrap">
                <v-chip size="x-small" variant="outlined">
                    {{ participantEntities.length }} participants
                </v-chip>
                <v-chip size="x-small" variant="outlined">
                    {{ selectedEvent.sourceDocuments.length }} sources
                </v-chip>
                <v-chip v-if="eventPropertyRows.length" size="x-small" variant="outlined">
                    {{ eventPropertyRows.length }} properties
                </v-chip>
            </div>
        </div>

        <v-tabs
            v-model="activeTab"
            density="compact"
            color="primary"
            slider-color="primary"
            class="px-2 event-tabs"
        >
            <v-tab v-for="tab in panelTabs" :key="tab.value" :value="tab.value" size="small">
                <v-icon start size="14">{{ tab.icon }}</v-icon>
                {{ tab.label }}
            </v-tab>
        </v-tabs>
        <v-divider />

        <div class="event-panel-scroll pa-3">
            <section v-if="activeTab === 'properties'" class="d-flex flex-column ga-3">
                <v-card variant="tonal" class="panel-section-card">
                    <v-card-text class="py-2 px-3">
                        <div class="text-caption text-medium-emphasis mb-1">Summary</div>
                        <div class="text-body-2">{{ eventSummary }}</div>
                    </v-card-text>
                </v-card>

                <div>
                    <div class="text-subtitle-2 mb-1 panel-subtitle">Key properties</div>
                    <div v-if="eventPropertyRows.length" class="property-table">
                        <div
                            v-for="prop in eventPropertyRows"
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
                        No event properties extracted yet.
                    </div>
                </div>
            </section>

            <section v-else-if="activeTab === 'participants'" class="d-flex flex-column ga-3">
                <v-card variant="tonal" class="panel-section-card">
                    <v-card-text class="py-2 px-3 text-body-2">
                        Participants linked to this event. Click any participant to open its entity
                        profile.
                    </v-card-text>
                </v-card>

                <div v-if="participantEntities.length" class="d-flex ga-1 flex-wrap">
                    <v-chip
                        v-for="entity in participantEntities"
                        :key="entity.neid"
                        size="small"
                        variant="tonal"
                        class="app-chip-button"
                        @click="selectEntity(entity.neid)"
                    >
                        {{ entity.name }}
                    </v-chip>
                </div>
                <div v-else class="text-body-2 text-medium-emphasis">
                    No participants are linked to this event.
                </div>
            </section>

            <section v-else-if="activeTab === 'sources'" class="d-flex flex-column ga-3">
                <v-card variant="tonal" class="panel-section-card">
                    <v-card-text class="py-2 px-3 text-body-2">
                        Source documents and extracted citations for this event.
                    </v-card-text>
                </v-card>

                <div>
                    <div class="text-subtitle-2 mb-1 panel-subtitle">Source documents</div>
                    <div v-if="selectedEvent.sourceDocuments.length" class="d-flex ga-1 flex-wrap">
                        <v-chip
                            v-for="docNeid in selectedEvent.sourceDocuments"
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
                    <CitationPanel :citations="eventCitations" @select="handleCitationSelect" />
                </div>

                <div v-if="eventCitationSnippets.length">
                    <div class="text-subtitle-2 mb-1 panel-subtitle">Mentions</div>
                    <v-list density="compact" class="pa-0 bg-transparent">
                        <v-list-item
                            v-for="snippet in eventCitationSnippets"
                            :key="`${snippet.sourceName}-${snippet.excerpt}`"
                            class="px-0"
                        >
                            <v-list-item-title class="text-body-2 text-wrap snippet-line">
                                {{ snippet.excerpt }}
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-caption text-medium-emphasis">
                                {{ snippet.sourceName }}
                            </v-list-item-subtitle>
                        </v-list-item>
                    </v-list>
                </div>
            </section>
        </div>
    </v-card>
</template>

<script setup lang="ts">
    import { computed, ref, watch } from 'vue';
    import {
        buildCitationsFromProperties,
        buildDocumentCitation,
        type Citation,
    } from '~/utils/citationTypes';
    import { BNY_DOCUMENTS } from '~/utils/collectionTypes';

    type PanelTab = 'properties' | 'participants' | 'sources';

    const { selectedEvent, entities, selectEntity, selectEvent, resolveEntityName } =
        useCollectionWorkspace();

    const activeTab = ref<PanelTab>('properties');

    const panelTabs = [
        { value: 'properties' as const, label: 'Properties', icon: 'mdi-table' },
        {
            value: 'participants' as const,
            label: 'Participants',
            icon: 'mdi-account-group-outline',
        },
        { value: 'sources' as const, label: 'Sources', icon: 'mdi-file-document-multiple-outline' },
    ];

    watch(
        () => selectedEvent.value?.neid,
        () => {
            activeTab.value = 'properties';
        }
    );

    const participantEntities = computed(() => {
        if (!selectedEvent.value) return [];
        const participantSet = new Set(selectedEvent.value.participantNeids);
        return entities.value.filter((entity) => participantSet.has(entity.neid));
    });

    const eventDateLabel = computed(() => {
        const date = resolveEventDate(selectedEvent.value);
        return date ? `Date: ${date.slice(0, 10)}` : null;
    });

    const eventPropertyRows = computed(() => {
        if (!selectedEvent.value) return [];
        const ignoredPrefixes = ['_', 'internal_', 'debug_', 'embedding', 'vector'];
        const ignoredExact = new Set(['eid', 'neid', 'id', 'pid']);
        return Object.entries(selectedEvent.value.properties ?? {})
            .filter(([key]) => {
                if (ignoredExact.has(key.toLowerCase())) return false;
                return !ignoredPrefixes.some((prefix) => key.toLowerCase().startsWith(prefix));
            })
            .map(([key, value]) => {
                const normalized = normalizePropertyValue(value);
                return {
                    key,
                    label: formatEventPropertyLabel(key),
                    value: formatValue(normalized.value),
                    citation: normalized.citation,
                };
            })
            .slice(0, 30);
    });

    const eventSummary = computed(() => {
        if (!selectedEvent.value) return '';
        const dateText = resolveEventDate(selectedEvent.value)?.slice(0, 10) ?? 'an unknown date';
        const participantText =
            participantEntities.value
                .map((entity) => entity?.name)
                .filter((name): name is string => Boolean(name))
                .slice(0, 4)
                .join(', ') || 'no named participants';
        const confidenceText = selectedEvent.value.likelihood
            ? `Confidence is marked as ${selectedEvent.value.likelihood}.`
            : '';
        return `${selectedEvent.value.name || selectedEvent.value.category || 'This event'} is categorized as ${selectedEvent.value.category || 'uncategorized'} and is recorded on ${dateText}. It links ${participantEntities.value.length} participant${participantEntities.value.length === 1 ? '' : 's'}, including ${participantText}. ${confidenceText}`.trim();
    });

    const eventCitations = computed<Citation[]>(() => {
        if (!selectedEvent.value) return [];

        const citations: Citation[] = [];
        let refId = 1;

        for (const docNeid of selectedEvent.value.sourceDocuments) {
            const doc = BNY_DOCUMENTS.find((item) => item.neid === docNeid);
            if (!doc) continue;
            citations.push(
                buildDocumentCitation(
                    `BNY-${doc.documentId}.pdf`,
                    String(refId++),
                    'event',
                    `${selectedEvent.value.name}${resolveEventDate(selectedEvent.value) ? ` · ${resolveEventDate(selectedEvent.value)?.slice(0, 10)}` : ''}`,
                    doc.date
                )
            );
        }

        const propertyCitationInput: Record<string, { value: unknown; citation?: string }> = {};
        for (const [key, value] of Object.entries(selectedEvent.value.properties ?? {})) {
            const normalized = normalizePropertyValue(value);
            propertyCitationInput[formatEventPropertyLabel(key)] = {
                value: normalized.value,
                citation: normalized.citation,
            };
        }
        for (const citation of buildCitationsFromProperties(propertyCitationInput)) {
            citations.push({ ...citation, ref: String(refId++) });
        }

        for (const rawCitation of selectedEvent.value.citations ?? []) {
            citations.push(
                buildDocumentCitation(
                    rawCitation,
                    String(refId++),
                    'event',
                    selectedEvent.value.description || selectedEvent.value.name,
                    resolveEventDate(selectedEvent.value)?.slice(0, 10)
                )
            );
        }

        const seen = new Set<string>();
        return citations.filter((citation) => {
            const key = `${citation.sourceType}|${citation.sourceName}|${citation.excerpt ?? ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    });

    const eventCitationSnippets = computed(() =>
        eventCitations.value
            .filter((citation) => Boolean(citation.excerpt))
            .slice(0, 8)
            .map((citation) => ({
                sourceName: citation.sourceName,
                excerpt: citation.excerpt ?? '',
            }))
    );

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
        if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
    }

    function formatEventPropertyLabel(key: string): string {
        const normalizedKey = key.replace(/^schema::property::/, '');
        const explicitLabels: Record<string, string> = {
            event_category: 'Event category',
            category: 'Event category',
            event_date: 'Event date',
            date: 'Event date',
            event_description: 'Description',
            description: 'Description',
            event_likelihood: 'Confidence',
            likelihood: 'Confidence',
            event_type: 'Event type',
            type: 'Event type',
            event_status: 'Status',
            status: 'Status',
        };
        const explicit = explicitLabels[normalizedKey];
        if (explicit) return explicit;

        return normalizedKey.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function resolveEventDate(eventItem: typeof selectedEvent.value): string | undefined {
        if (!eventItem) return undefined;
        if (eventItem.date) return eventItem.date;
        const props = (eventItem.properties ?? {}) as Record<string, unknown>;
        const candidateKeys = [
            'event_date',
            'date',
            'schema::property::event_date',
            'schema::property::date',
        ];
        for (const key of candidateKeys) {
            if (!(key in props)) continue;
            const value = props[key] as Record<string, unknown> | unknown;
            const scalar =
                value && typeof value === 'object' && !Array.isArray(value)
                    ? (value as Record<string, unknown>).value
                    : value;
            const text = String(scalar ?? '').trim();
            if (text) return text;
        }
        return undefined;
    }

    function eventSeverity(eventItem: NonNullable<typeof selectedEvent.value>): string {
        const likelihood = (eventItem.likelihood ?? '').toLowerCase();
        if (likelihood === 'possible') return 'Speculative';
        if (likelihood === 'likely') return 'High confidence';
        if (likelihood === 'confirmed') return 'Confirmed';
        return 'Standard';
    }

    function eventSeverityColor(eventItem: NonNullable<typeof selectedEvent.value>): string {
        const label = eventSeverity(eventItem);
        if (label === 'Speculative') return 'warning';
        if (label === 'High confidence' || label === 'Confirmed') return 'success';
        return 'info';
    }

    function handleCitationSelect(citation: Citation) {
        if (!citation.neid) return;
        const doc = BNY_DOCUMENTS.find((item) => item.neid === citation.neid);
        if (doc) return;
        selectEntity(citation.neid);
    }
</script>

<style scoped>
    .event-panel {
        height: 100%;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--app-divider-strong);
        background: var(--dynamic-surface);
        box-shadow:
            0 18px 36px rgba(0, 0, 0, 0.22),
            0 6px 18px rgba(0, 0, 0, 0.12);
    }

    .event-panel-header {
        flex-shrink: 0;
        border-bottom: 1px solid var(--app-divider);
        background: color-mix(in srgb, var(--app-subtle-surface) 72%, transparent);
    }

    .event-panel-scroll {
        flex: 1;
        min-height: 0;
        overflow: auto;
        scrollbar-gutter: stable both-edges;
    }

    .event-tabs :deep(.v-tab) {
        text-transform: none;
        letter-spacing: 0;
        min-width: 0;
        padding-inline: 8px;
    }

    .event-tabs :deep(.v-slide-group__content) {
        gap: 4px;
    }

    .event-tabs :deep(.v-tab.v-tab--selected) {
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

    .panel-kicker {
        letter-spacing: 0.06em;
        text-transform: uppercase;
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

    .snippet-line {
        line-height: 1.4;
    }
</style>
