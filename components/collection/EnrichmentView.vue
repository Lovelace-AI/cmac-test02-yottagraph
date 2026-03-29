<template>
    <div class="d-flex flex-column ga-3">
        <v-tabs v-model="activeSubtab" density="compact" color="primary" class="mb-1">
            <v-tab value="graph">
                <v-icon start size="small">mdi-graph-outline</v-icon>
                Graph
            </v-tab>
            <v-tab value="setup">
                <v-icon start size="small">mdi-tune-variant</v-icon>
                Setup
            </v-tab>
        </v-tabs>

        <v-window v-model="activeSubtab">
            <v-window-item value="graph">
                <v-card class="mb-3">
                    <v-card-text class="d-flex align-center justify-space-between flex-wrap ga-2">
                        <div class="d-flex align-center ga-2 flex-wrap">
                            <template v-if="hasEnrichmentRun">
                                <v-switch
                                    v-model="showEnrichedEntities"
                                    hide-details
                                    density="compact"
                                    color="info"
                                    label="Show enriched entities"
                                    class="mr-1"
                                />
                                <v-switch
                                    v-model="showEnrichedRelationships"
                                    hide-details
                                    density="compact"
                                    color="info"
                                    label="Show enriched edges"
                                />
                            </template>
                            <v-chip v-else size="small" variant="tonal" color="primary">
                                Document graph only
                            </v-chip>
                            <v-chip size="small" variant="tonal" color="success">
                                {{ visibleGraphEntityCount }} nodes
                            </v-chip>
                            <v-chip size="small" variant="tonal" color="primary">
                                {{ visibleGraphRelationshipCount }} links
                            </v-chip>
                            <v-chip
                                v-if="
                                    hasEnrichmentRun &&
                                    showEnrichedEntities &&
                                    enrichmentCollapsedOrganizationCount > 0
                                "
                                size="small"
                                variant="tonal"
                                color="info"
                            >
                                {{ enrichmentCollapsedOrganizationCount }} acquired orgs collapsed
                            </v-chip>
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            {{ graphModeDescription }}
                        </div>
                    </v-card-text>
                </v-card>

                <v-alert
                    v-if="
                        hasEnrichmentRun &&
                        showEnrichedEntities &&
                        enrichmentCollapsedOrganizationCount > 0
                    "
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    Expanded mode adds broader Yottagraph context while merging acquired banks into
                    surviving parent organizations to keep the view readable.
                </v-alert>

                <v-card
                    v-if="
                        hasEnrichmentRun &&
                        showEnrichedEntities &&
                        collapsedOrganizationMappings.length
                    "
                    class="mb-3"
                >
                    <v-card-item>
                        <v-card-title class="text-body-2">
                            Collapsed Corporate Lineage
                            <v-chip size="x-small" variant="tonal" color="info" class="ml-2">
                                {{ collapsedOrganizationMappings.length }} surviving orgs
                            </v-chip>
                        </v-card-title>
                        <v-card-subtitle>
                            Each row lists acquired organizations that are merged into one surviving
                            parent node.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text class="pt-0">
                        <v-list density="compact" class="pa-0 bg-transparent">
                            <v-list-item
                                v-for="mapping in collapsedOrganizationMappings"
                                :key="mapping.representativeNeid"
                                class="px-0"
                            >
                                <v-list-item-title class="text-body-2 font-weight-medium mb-1">
                                    <button
                                        type="button"
                                        class="lineage-entity-btn app-click-target"
                                        @click="selectEntity(mapping.representativeNeid)"
                                    >
                                        {{ mapping.representativeName }}
                                    </button>
                                </v-list-item-title>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip
                                        v-for="member in mapping.collapsedMembers"
                                        :key="`${mapping.representativeNeid}:${member.neid}`"
                                        size="x-small"
                                        variant="tonal"
                                        color="blue-grey"
                                        class="app-click-target"
                                        @click="selectEntity(member.neid)"
                                    >
                                        {{ member.name }}
                                    </v-chip>
                                </div>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>

                <GraphWorkspace
                    :entities-override="activeGraphEntities"
                    :relationships-override="activeGraphRelationships"
                    :show-enriched-entities="showEnrichedEntities"
                    :show-enriched-relationships="showEnrichedRelationships"
                />
            </v-window-item>

            <v-window-item value="setup">
                <v-alert v-if="!enrichmentLastRun" type="info" variant="tonal" class="mb-3">
                    <div class="text-body-2 font-weight-medium mb-1">Quick start</div>
                    <ol class="pl-5 mb-1">
                        <li>Select 3-5 anchor entities from the document graph.</li>
                        <li>Start with 1-hop expansion for a focused first pass.</li>
                        <li>Run Expand Context, then review the result in Graph.</li>
                    </ol>
                </v-alert>

                <v-row class="mb-4">
                    <v-col cols="12" md="8">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-1"
                                    >Select Anchor Entities</v-card-title
                                >
                                <v-card-subtitle>
                                    Choose document-derived anchors, then expand into Yottagraph
                                    context.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text>
                                <v-text-field
                                    v-model="anchorSearch"
                                    label="Search entities"
                                    density="compact"
                                    variant="outlined"
                                    prepend-inner-icon="mdi-magnify"
                                    clearable
                                    hide-details
                                    class="mb-3"
                                />

                                <div style="max-height: 300px; overflow-y: auto">
                                    <v-list density="compact" class="pa-0">
                                        <v-list-item
                                            v-for="entity in filteredAnchors"
                                            :key="entity.neid"
                                            @click="toggleAnchor(entity.neid)"
                                        >
                                            <template #prepend>
                                                <v-checkbox-btn
                                                    :model-value="
                                                        selectedAnchorSet.has(entity.neid)
                                                    "
                                                    color="primary"
                                                    @click.stop="toggleAnchor(entity.neid)"
                                                />
                                            </template>
                                            <v-list-item-title class="text-body-2">
                                                {{ entity.name }}
                                            </v-list-item-title>
                                            <v-list-item-subtitle class="text-caption">
                                                {{ entity.flavor }}
                                            </v-list-item-subtitle>
                                        </v-list-item>
                                    </v-list>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>

                    <v-col cols="12" md="4">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-1">Expansion Settings</v-card-title>
                            </v-card-item>
                            <v-card-text>
                                <div class="text-body-2 mb-2">
                                    Selected anchors: {{ selectedAnchors.length }}
                                </div>
                                <div
                                    v-if="selectedAnchors.length === 0"
                                    class="text-caption text-medium-emphasis mb-2"
                                >
                                    Select at least one anchor to run enrichment.
                                </div>

                                <v-radio-group v-model="hopsModel" inline hide-details class="mb-3">
                                    <v-radio label="1-hop" :value="1" />
                                    <v-radio label="2-hop" :value="2" />
                                </v-radio-group>
                                <v-switch
                                    v-model="includeEventsModel"
                                    color="primary"
                                    hide-details
                                    density="comfortable"
                                    label="Include related events in enrichment"
                                    class="mb-2"
                                />
                                <div class="text-caption text-medium-emphasis mb-3">
                                    Recommendation: start with 1-hop, then use 2-hop with a narrow
                                    anchor set.
                                </div>

                                <v-btn
                                    color="primary"
                                    block
                                    prepend-icon="mdi-arrow-expand-all"
                                    :loading="enriching"
                                    :disabled="selectedAnchors.length === 0"
                                    @click="runEnrichment"
                                >
                                    Expand Context
                                </v-btn>

                                <v-btn
                                    variant="text"
                                    size="small"
                                    class="mt-2"
                                    :disabled="!isReady"
                                    @click="autoSelectAnchors"
                                >
                                    Auto-select highest-impact anchors
                                </v-btn>
                                <div class="text-caption text-medium-emphasis mt-1">
                                    Highest-impact anchors are ranked by current graph connectivity.
                                </div>

                                <div
                                    v-if="enrichmentLastRun"
                                    class="text-caption text-medium-emphasis mt-3"
                                >
                                    Last run: {{ enrichmentLastRun.anchorNeids.length }} anchors,
                                    hop
                                    {{ enrichmentLastRun.hops }}
                                    <span v-if="enrichmentLastRun.includeEvents">
                                        , with related events
                                    </span>
                                </div>
                            </v-card-text>
                        </v-card>

                        <v-card class="mt-3">
                            <v-card-item>
                                <v-card-title class="text-body-1">What This Changes</v-card-title>
                            </v-card-item>
                            <v-card-text>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2">Document-derived entities</span>
                                    <span class="text-body-2 font-weight-medium text-green">
                                        {{ documentEntities.length }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2">New context entities</span>
                                    <span class="text-body-2 font-weight-medium text-blue">
                                        {{ enrichedEntities.length }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2">Document-derived links</span>
                                    <span class="text-body-2 font-weight-medium text-green">
                                        {{ documentRelationshipCount }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2">New context links</span>
                                    <span class="text-body-2 font-weight-medium text-blue">
                                        {{ enrichedRelationshipCount }}
                                    </span>
                                </div>
                                <v-divider class="my-2" />
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2 font-weight-medium"
                                        >Combined total</span
                                    >
                                    <span class="text-body-2 font-weight-medium">
                                        {{ documentEntities.length + enrichedEntities.length }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2 font-weight-medium"
                                        >Combined links</span
                                    >
                                    <span class="text-body-2 font-weight-medium">
                                        {{ documentRelationshipCount + enrichedRelationshipCount }}
                                    </span>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>

                <v-card v-if="enrichedEntities.length > 0">
                    <v-card-item>
                        <v-card-title class="text-body-1">
                            Enriched Entities
                            <v-chip size="x-small" variant="tonal" color="info" class="ml-2">
                                {{ enrichedEntities.length }}
                            </v-chip>
                        </v-card-title>
                    </v-card-item>
                    <v-card-text class="pa-0">
                        <v-data-table
                            :headers="enrichedHeaders"
                            :items="enrichedEntities"
                            :items-per-page="15"
                            density="compact"
                            hover
                            @click:row="(_: any, row: any) => selectEntity(row.item.neid)"
                        >
                            <template #item.origin="{ item }">
                                <v-chip size="x-small" variant="tonal" color="info">
                                    {{ item.origin }}
                                </v-chip>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>
            </v-window-item>
        </v-window>
    </div>
</template>

<script setup lang="ts">
    const AUTO_SELECT_ALLOWLIST = new Set<string>([
        // High-signal enrichable anchors from Docs/enrichment-analysis.md
        '06157989400122873900', // HSBC Bank USA, National Association
        '05477621199116204617', // Orrick, Herrington & Sutcliffe, LLP
        '02080889041561724035', // Orrick
        '07683517764755523583', // Willdan Financial Services
        '06967031221082229818', // UNITED JERSEY BANK/CENTRAL,
        '06471256961308361850', // New Jersey Housing and Mortgage Finance Agency
        '04104505588419472813', // NC HOUSING ASSOCIATES #200 CO.
        '04008955034518895738', // ARTHUR KLEIN
        '07942829951042429385', // 97-77 QUEENS BLVD. REGO PARK, N.Y. 11374
    ]);
    const AUTO_SELECT_BLOCKLIST = new Set<string>([
        // Broad/global anchors that tend to produce noisy expansions
        '08749664511655725314', // The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch
        '08883522583676895375', // United States Department of the Treasury
        '07404718453994080710', // The Treasury
        '08378183269956851171', // United States
        '05384086983174826493', // Bank of New York Mellon Corporation (BNY Mellon)
        '04648605347073135218', // New York
        '05716789654794197421', // Dallas
        '01054548445358605934', // Trenton, New Jersey
    ]);

    const {
        documentEntities,
        enrichedEntities,
        enriching,
        isReady,
        enrich,
        selectEntity,
        relationships,
        enrichmentAnchorNeids,
        enrichmentHops,
        enrichmentIncludeEvents,
        hasEnrichmentRun,
        enrichmentLastRun,
        enrichmentDocumentGraphEntities,
        enrichmentDocumentGraphRelationships,
        enrichmentSupersetGraphEntities,
        enrichmentSupersetGraphRelationships,
        enrichmentCollapsedOrganizationCount,
        enrichmentCollapsedRepresentativeByNeid,
        setEnrichmentAnchors,
        setEnrichmentHops,
        setEnrichmentIncludeEvents,
    } = useCollectionWorkspace();

    const activeSubtab = ref<'graph' | 'setup'>(enrichmentLastRun.value ? 'graph' : 'setup');
    const anchorSearch = ref('');
    const showEnrichedEntities = ref(true);
    const showEnrichedRelationships = ref(true);

    const selectedAnchors = computed<string[]>({
        get: () => enrichmentAnchorNeids.value,
        set: (anchors) => setEnrichmentAnchors(anchors),
    });
    const selectedAnchorSet = computed(() => new Set(selectedAnchors.value));
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
    const enrichedEntityNeidSet = computed(
        () => new Set(enrichedEntities.value.map((e) => e.neid))
    );
    const visibleGraphEntityCount = computed(() =>
        showEnrichedEntities.value
            ? activeGraphEntities.value.length
            : activeGraphEntities.value.filter((entity) => entity.origin !== 'enriched').length
    );
    const visibleGraphRelationshipCount = computed(() => {
        let list = activeGraphRelationships.value;
        if (!showEnrichedRelationships.value) {
            list = list.filter((relationship) => relationship.origin !== 'enriched');
        }
        if (!showEnrichedEntities.value) {
            list = list.filter(
                (relationship) =>
                    !enrichedEntityNeidSet.value.has(relationship.sourceNeid) &&
                    !enrichedEntityNeidSet.value.has(relationship.targetNeid)
            );
        }
        return list.length;
    });
    const graphModeDescription = computed(() => {
        if (!hasEnrichmentRun.value) {
            return 'Showing source-derived document graph. Run Expand Context to reveal broader graph context.';
        }
        if (!showEnrichedEntities.value && !showEnrichedRelationships.value) {
            return 'Expanded graph loaded; enriched layer is hidden.';
        }
        if (!showEnrichedEntities.value) {
            return 'Showing document entities with selected enriched edges hidden.';
        }
        if (!showEnrichedRelationships.value) {
            return 'Showing enriched entities while hiding enriched edges.';
        }
        return 'Expanded graph overlays Yottagraph context on top of document-derived structure.';
    });
    const documentRelationshipCount = computed(
        () =>
            relationships.value.filter((relationship) => relationship.origin === 'document').length
    );
    const enrichedRelationshipCount = computed(
        () =>
            relationships.value.filter((relationship) => relationship.origin === 'enriched').length
    );
    const entityNameByNeid = computed(() => {
        const byNeid = new Map<string, string>();
        for (const entity of [...documentEntities.value, ...enrichedEntities.value]) {
            byNeid.set(entity.neid, entity.name);
        }
        return byNeid;
    });
    const collapsedOrganizationMappings = computed(() => {
        const byRepresentative = new Map<
            string,
            {
                representativeNeid: string;
                representativeName: string;
                collapsedMembers: Array<{ neid: string; name: string }>;
            }
        >();
        for (const [neid, representativeNeid] of Object.entries(
            enrichmentCollapsedRepresentativeByNeid.value
        )) {
            if (neid === representativeNeid) continue;
            const representativeName =
                entityNameByNeid.value.get(representativeNeid) ?? representativeNeid;
            const collapsedName = entityNameByNeid.value.get(neid) ?? neid;
            const entry = byRepresentative.get(representativeNeid) ?? {
                representativeNeid,
                representativeName,
                collapsedMembers: [],
            };
            entry.collapsedMembers.push({ neid, name: collapsedName });
            byRepresentative.set(representativeNeid, entry);
        }
        return Array.from(byRepresentative.values())
            .map((entry) => ({
                ...entry,
                collapsedMembers: Array.from(
                    new Map(
                        entry.collapsedMembers.map((member) => [member.neid, member] as const)
                    ).values()
                ).sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => b.collapsedMembers.length - a.collapsedMembers.length);
    });

    const filteredAnchors = computed(() => {
        let list = documentEntities.value;
        if (anchorSearch.value) {
            const query = anchorSearch.value.toLowerCase();
            list = list.filter((entity) => entity.name.toLowerCase().includes(query));
        }
        return list.slice(0, 80);
    });

    function toggleAnchor(neid: string) {
        const next = new Set(selectedAnchorSet.value);
        if (next.has(neid)) next.delete(neid);
        else next.add(neid);
        selectedAnchors.value = Array.from(next);
    }

    async function runEnrichment() {
        await enrich(selectedAnchors.value, hopsModel.value, includeEventsModel.value);
        showEnrichedEntities.value = true;
        showEnrichedRelationships.value = true;
        activeSubtab.value = 'graph';
    }

    function autoSelectAnchors() {
        const connectionCount = new Map<string, number>();
        for (const relationship of relationships.value) {
            connectionCount.set(
                relationship.sourceNeid,
                (connectionCount.get(relationship.sourceNeid) || 0) + 1
            );
            connectionCount.set(
                relationship.targetNeid,
                (connectionCount.get(relationship.targetNeid) || 0) + 1
            );
        }

        const curatedTopAnchors = documentEntities.value
            .filter(
                (entity) =>
                    AUTO_SELECT_ALLOWLIST.has(entity.neid) &&
                    !AUTO_SELECT_BLOCKLIST.has(entity.neid)
            )
            .map((entity) => ({ neid: entity.neid, count: connectionCount.get(entity.neid) || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((item) => item.neid);

        if (curatedTopAnchors.length > 0) {
            selectedAnchors.value = curatedTopAnchors;
            return;
        }

        // Fallback for new collections: rank document entities by local connectivity,
        // but keep known noisy/global anchors out of the default selection.
        const fallbackTopAnchors = documentEntities.value
            .filter((entity) => !AUTO_SELECT_BLOCKLIST.has(entity.neid))
            .map((entity) => ({ neid: entity.neid, count: connectionCount.get(entity.neid) || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((item) => item.neid);

        selectedAnchors.value = fallbackTopAnchors;
    }

    const enrichedHeaders = [
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Type', key: 'flavor', sortable: true },
        { title: 'Origin', key: 'origin', sortable: false },
    ];
</script>

<style scoped>
    .lineage-entity-btn {
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        font: inherit;
        padding: 0;
        cursor: pointer;
    }

    .lineage-entity-btn:hover {
        text-decoration: underline;
    }
</style>
