<template>
    <div class="enrichment-layout d-flex flex-column ga-3">
        <v-tabs v-model="activeSubtab" density="compact" color="primary" class="mb-1">
            <v-tab value="entities">
                <v-icon start size="small">mdi-shape-outline</v-icon>
                Enriched Entities
            </v-tab>
            <v-tab value="graph">
                <v-icon start size="small">mdi-graph-outline</v-icon>
                Graph
            </v-tab>
            <v-tab value="lineage">
                <v-icon start size="small">mdi-source-branch</v-icon>
                Lineage
            </v-tab>
            <v-tab value="news">
                <v-icon start size="small">mdi-newspaper-variant-outline</v-icon>
                News
            </v-tab>
            <v-tab value="economics">
                <v-icon start size="small">mdi-chart-line</v-icon>
                Micro / Macro
            </v-tab>
            <v-tab value="setup">
                <v-icon start size="small">mdi-tune-variant</v-icon>
                Settings
            </v-tab>
        </v-tabs>

        <v-window v-model="activeSubtab">
            <v-window-item value="entities">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">
                            Context Entities
                            <v-chip size="x-small" variant="tonal" color="info" class="ml-2">
                                {{ enrichedEntities.length }}
                            </v-chip>
                        </v-card-title>
                        <v-card-subtitle>
                            Full 2-hop context is loaded during analysis; these are the entities
                            outside strict document extraction.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text class="pa-0">
                        <v-data-table
                            :headers="enrichedHeaders"
                            :items="enrichedEntities"
                            :items-per-page="20"
                            density="compact"
                            hover
                            @click:row="(_: any, row: any) => selectEntity(row.item.neid)"
                        >
                            <template #item.origin="{ item }">
                                <v-chip size="x-small" variant="tonal" color="info">
                                    {{ originLabel(item.origin) }}
                                </v-chip>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>
            </v-window-item>

            <v-window-item value="graph">
                <v-card class="mb-3">
                    <v-card-text class="d-flex align-center justify-space-between flex-wrap ga-3">
                        <div class="d-flex align-center ga-2 flex-wrap">
                            <v-switch
                                v-model="showEnrichedEntities"
                                hide-details
                                density="compact"
                                color="info"
                                label="Show expanded entities"
                                class="mr-1"
                            />
                            <v-switch
                                v-model="showEnrichedRelationships"
                                hide-details
                                density="compact"
                                color="info"
                                label="Show expanded relationships"
                            />
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            {{ graphModeDescription }}
                        </div>
                    </v-card-text>
                </v-card>

                <GraphWorkspace
                    :entities-override="activeGraphEntities"
                    :relationships-override="activeGraphRelationships"
                    :show-enriched-entities="showEnrichedEntities"
                    :show-enriched-relationships="showEnrichedRelationships"
                />
            </v-window-item>

            <v-window-item value="lineage">
                <v-alert v-if="lineageInsights.length === 0" type="info" variant="tonal">
                    No lineage insights found in current enriched graph.
                </v-alert>
                <div v-else class="d-flex flex-column ga-3">
                    <v-card v-for="insight in lineageInsights" :key="insight.id">
                        <v-card-item>
                            <v-card-title class="text-body-2">{{ insight.title }}</v-card-title>
                            <v-card-subtitle>{{ insight.subtitle }}</v-card-subtitle>
                        </v-card-item>
                        <v-card-text>
                            <div class="text-body-2 mb-2">{{ insight.plainSummary }}</div>
                            <div class="text-caption text-medium-emphasis mb-2">
                                {{ insight.documentContext }}
                            </div>
                            <div class="d-flex flex-wrap ga-1">
                                <v-chip
                                    v-for="line in insight.evidence.slice(0, 3)"
                                    :key="`${insight.id}:${line}`"
                                    size="x-small"
                                    variant="tonal"
                                    color="primary"
                                >
                                    {{ line }}
                                </v-chip>
                            </div>
                        </v-card-text>
                    </v-card>
                </div>
            </v-window-item>

            <v-window-item value="news">
                <v-alert v-if="enrichmentNewsLoading" type="info" variant="tonal" class="mb-3">
                    Loading entity-linked news context...
                </v-alert>
                <v-alert v-else-if="enrichmentNewsError" type="error" variant="tonal" class="mb-3">
                    {{ enrichmentNewsError }}
                </v-alert>
                <v-alert
                    v-else-if="!enrichmentNews.length"
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    No recent platform events/news were returned for enriched entities.
                </v-alert>

                <div v-else class="d-flex flex-column ga-3">
                    <v-card v-for="group in enrichmentNews" :key="group.anchorNeid">
                        <v-card-item>
                            <v-card-title class="text-body-2">
                                {{ resolveEntityName(group.anchorNeid) }}
                            </v-card-title>
                            <v-card-subtitle>
                                {{ group.items.length }} recent related event-driven news items
                            </v-card-subtitle>
                        </v-card-item>
                        <v-card-text class="d-flex flex-column ga-2">
                            <v-card
                                v-for="item in group.items.slice(0, 6)"
                                :key="item.eventNeid"
                                variant="outlined"
                            >
                                <v-card-item>
                                    <v-card-title class="text-body-2">{{
                                        item.title
                                    }}</v-card-title>
                                    <v-card-subtitle>
                                        {{ item.date || 'Date unavailable' }}
                                        <span v-if="item.category"> • {{ item.category }}</span>
                                    </v-card-subtitle>
                                </v-card-item>
                                <v-card-text>
                                    <div class="text-body-2 mb-2">
                                        {{
                                            truncate(
                                                item.description || 'No summary available.',
                                                260
                                            )
                                        }}
                                    </div>
                                    <div class="d-flex flex-wrap ga-1">
                                        <v-chip
                                            v-for="entityName in item.linkedEntityNames.slice(0, 4)"
                                            :key="`${item.eventNeid}:${entityName}`"
                                            size="x-small"
                                            variant="tonal"
                                        >
                                            {{ entityName }}
                                        </v-chip>
                                    </div>
                                </v-card-text>
                            </v-card>
                        </v-card-text>
                    </v-card>
                </div>
            </v-window-item>

            <v-window-item value="economics">
                <v-alert v-if="enrichmentEconomicLoading" type="info" variant="tonal" class="mb-3">
                    Loading micro and macroeconomic context...
                </v-alert>
                <v-alert
                    v-else-if="enrichmentEconomicError"
                    type="error"
                    variant="tonal"
                    class="mb-3"
                >
                    {{ enrichmentEconomicError }}
                </v-alert>

                <v-row>
                    <v-col cols="12" md="6">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2">Micro Signals</v-card-title>
                                <v-card-subtitle>
                                    Entity-linked operational and deal-level context.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text class="d-flex flex-column ga-2">
                                <v-alert
                                    v-if="!enrichmentEconomicSignals.micro.length"
                                    type="info"
                                    variant="tonal"
                                >
                                    No micro signals returned.
                                </v-alert>
                                <v-card
                                    v-for="signal in enrichmentEconomicSignals.micro.slice(0, 10)"
                                    :key="signal.eventNeid"
                                    variant="outlined"
                                >
                                    <v-card-item>
                                        <v-card-title class="text-body-2">{{
                                            signal.title
                                        }}</v-card-title>
                                        <v-card-subtitle>
                                            {{ signal.date || 'Date unavailable' }}
                                            <span v-if="signal.category">
                                                • {{ signal.category }}
                                            </span>
                                        </v-card-subtitle>
                                    </v-card-item>
                                </v-card>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-2">Macro Signals</v-card-title>
                                <v-card-subtitle>
                                    Broader macro context from live platform graph events.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text class="d-flex flex-column ga-2">
                                <v-alert
                                    v-if="!enrichmentEconomicSignals.macro.length"
                                    type="info"
                                    variant="tonal"
                                >
                                    No macro signals returned.
                                </v-alert>
                                <v-card
                                    v-for="signal in enrichmentEconomicSignals.macro.slice(0, 10)"
                                    :key="signal.eventNeid"
                                    variant="outlined"
                                >
                                    <v-card-item>
                                        <v-card-title class="text-body-2">{{
                                            signal.title
                                        }}</v-card-title>
                                        <v-card-subtitle>
                                            {{ signal.date || 'Date unavailable' }}
                                            <span v-if="signal.category">
                                                • {{ signal.category }}
                                            </span>
                                        </v-card-subtitle>
                                    </v-card-item>
                                </v-card>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-window-item>

            <v-window-item value="setup">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Expansion Settings</v-card-title>
                        <v-card-subtitle>
                            Full 2-hop graph loads during analysis; use this to refresh context on
                            demand.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text>
                        <v-radio-group v-model="hopsModel" inline hide-details class="mb-3">
                            <v-radio label="1-hop (focused)" :value="1" />
                            <v-radio label="2-hop (broader)" :value="2" />
                        </v-radio-group>
                        <v-switch
                            v-model="includeEventsModel"
                            color="primary"
                            hide-details
                            density="comfortable"
                            label="Include related events"
                            class="mb-2"
                        />
                        <v-btn
                            color="primary"
                            prepend-icon="mdi-arrow-expand-all"
                            :loading="enriching"
                            :disabled="!isReady || documentEntities.length === 0"
                            @click="runEnrichment"
                        >
                            Refresh Context
                        </v-btn>
                        <div
                            v-if="enrichmentLastRun"
                            class="text-caption text-medium-emphasis mt-3"
                        >
                            Last run: {{ enrichmentLastRun.anchorNeids.length }} anchors,
                            {{ enrichmentLastRun.hops }}-hop
                        </div>
                    </v-card-text>
                </v-card>
            </v-window-item>
        </v-window>
    </div>
</template>

<script setup lang="ts">
    const {
        documentEntities,
        enrichedEntities,
        enriching,
        isReady,
        enrich,
        selectEntity,
        resolveEntityName,
        enrichmentHops,
        enrichmentIncludeEvents,
        enrichmentLastRun,
        hasEnrichmentRun,
        enrichmentDocumentGraphEntities,
        enrichmentDocumentGraphRelationships,
        enrichmentSupersetGraphEntities,
        enrichmentSupersetGraphRelationships,
        lineageInsights,
        enrichmentNews,
        enrichmentNewsLoading,
        enrichmentNewsError,
        enrichmentEconomicSignals,
        enrichmentEconomicLoading,
        enrichmentEconomicError,
        setEnrichmentHops,
        setEnrichmentIncludeEvents,
        loadEnrichmentContextData,
    } = useCollectionWorkspace();

    const activeSubtab = ref<'entities' | 'graph' | 'lineage' | 'news' | 'economics' | 'setup'>(
        'entities'
    );
    const showEnrichedEntities = ref(true);
    const showEnrichedRelationships = ref(true);

    const hopsModel = computed<1 | 2>({
        get: () => enrichmentHops.value,
        set: (hops) => setEnrichmentHops(hops),
    });
    const includeEventsModel = computed({
        get: () => enrichmentIncludeEvents.value,
        set: (includeEvents: boolean) => setEnrichmentIncludeEvents(includeEvents),
    });

    const activeGraphEntities = computed(() =>
        hasEnrichmentRun.value
            ? enrichmentSupersetGraphEntities.value
            : enrichmentDocumentGraphEntities.value
    );
    const activeGraphRelationships = computed(() =>
        hasEnrichmentRun.value
            ? enrichmentSupersetGraphRelationships.value
            : enrichmentDocumentGraphRelationships.value
    );
    const graphModeDescription = computed(() => {
        if (!hasEnrichmentRun.value) return 'Showing document-only graph.';
        if (!showEnrichedEntities.value && !showEnrichedRelationships.value) {
            return 'Expanded graph loaded with additional nodes and links hidden.';
        }
        if (!showEnrichedEntities.value) return 'Added entities hidden.';
        if (!showEnrichedRelationships.value) return 'Added relationships hidden.';
        return 'Expanded graph overlays broader platform context.';
    });

    const enrichedHeaders = [
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Type', key: 'flavor', sortable: true },
        { title: 'Source', key: 'origin', sortable: false },
    ];

    async function runEnrichment() {
        const anchors = documentEntities.value.map((entity) => entity.neid);
        if (!anchors.length) return;
        await enrich(anchors, hopsModel.value, includeEventsModel.value);
        await loadEnrichmentContextData();
    }

    function originLabel(origin: string): string {
        if (origin === 'document') return 'Document';
        if (origin === 'enriched') return 'Context';
        return 'Agent';
    }

    function truncate(text: string, max: number): string {
        return text.length > max ? `${text.slice(0, max).trimEnd()}...` : text;
    }
</script>

<style scoped>
    .enrichment-layout {
        width: min(1180px, 100%);
        margin: 0 auto;
    }
</style>
