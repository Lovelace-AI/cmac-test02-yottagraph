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
                            <v-btn-toggle
                                :model-value="enrichmentGraphMode"
                                mandatory
                                density="compact"
                                @update:model-value="updateGraphMode"
                            >
                                <v-btn value="document" size="small">Document Graph</v-btn>
                                <v-btn value="expanded" size="small">Expanded Graph</v-btn>
                            </v-btn-toggle>
                            <v-chip size="small" variant="tonal" color="success">
                                {{ activeGraphEntities.length }} nodes
                            </v-chip>
                            <v-chip size="small" variant="tonal" color="primary">
                                {{ activeGraphRelationships.length }} links
                            </v-chip>
                            <v-chip
                                v-if="
                                    enrichmentGraphMode === 'expanded' &&
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
                        enrichmentGraphMode === 'expanded' &&
                        enrichmentCollapsedOrganizationCount > 0
                    "
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    Expanded mode traverses the full organization lineage but collapses
                    acquired-bank chains into surviving organizations by default.
                </v-alert>

                <v-card
                    v-if="
                        enrichmentGraphMode === 'expanded' && collapsedOrganizationMappings.length
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
                            Each row shows acquired organizations collapsed into a surviving bank
                            node.
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
                />
            </v-window-item>

            <v-window-item value="setup">
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

                                <v-radio-group v-model="hopsModel" inline hide-details class="mb-3">
                                    <v-radio label="1-hop" :value="1" />
                                    <v-radio label="2-hop" :value="2" />
                                </v-radio-group>

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

                                <div
                                    v-if="enrichmentLastRun"
                                    class="text-caption text-medium-emphasis mt-3"
                                >
                                    Last run: {{ enrichmentLastRun.anchorNeids.length }} anchors,
                                    hop
                                    {{ enrichmentLastRun.hops }}
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
                                <v-divider class="my-2" />
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2 font-weight-medium"
                                        >Combined total</span
                                    >
                                    <span class="text-body-2 font-weight-medium">
                                        {{ documentEntities.length + enrichedEntities.length }}
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
        enrichmentGraphMode,
        enrichmentLastRun,
        enrichmentDocumentGraphEntities,
        enrichmentDocumentGraphRelationships,
        enrichmentExpandedGraphEntities,
        enrichmentExpandedGraphRelationships,
        enrichmentCollapsedOrganizationCount,
        enrichmentCollapsedRepresentativeByNeid,
        setEnrichmentAnchors,
        setEnrichmentHops,
        setEnrichmentGraphMode,
    } = useCollectionWorkspace();

    const activeSubtab = ref<'graph' | 'setup'>('graph');
    const anchorSearch = ref('');

    const selectedAnchors = computed<string[]>({
        get: () => enrichmentAnchorNeids.value,
        set: (anchors) => setEnrichmentAnchors(anchors),
    });
    const selectedAnchorSet = computed(() => new Set(selectedAnchors.value));
    const hopsModel = computed<1 | 2>({
        get: () => enrichmentHops.value,
        set: (hops) => setEnrichmentHops(hops),
    });

    const activeGraphEntities = computed(() =>
        enrichmentGraphMode.value === 'document'
            ? enrichmentDocumentGraphEntities.value
            : enrichmentExpandedGraphEntities.value
    );
    const activeGraphRelationships = computed(() =>
        enrichmentGraphMode.value === 'document'
            ? enrichmentDocumentGraphRelationships.value
            : enrichmentExpandedGraphRelationships.value
    );
    const graphModeDescription = computed(() =>
        enrichmentGraphMode.value === 'document'
            ? 'Document graph shows only source-derived entities and links.'
            : 'Expanded graph overlays Yottagraph context with collapsed acquisition lineage.'
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
        await enrich(selectedAnchors.value, hopsModel.value);
        setEnrichmentGraphMode('expanded');
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

        const topAnchors = documentEntities.value
            .map((entity) => ({ neid: entity.neid, count: connectionCount.get(entity.neid) || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((item) => item.neid);

        selectedAnchors.value = topAnchors;
    }

    const enrichedHeaders = [
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Type', key: 'flavor', sortable: true },
        { title: 'Origin', key: 'origin', sortable: false },
    ];

    function updateGraphMode(mode: unknown) {
        if (mode === 'document' || mode === 'expanded') {
            setEnrichmentGraphMode(mode);
        }
    }
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
