<template>
    <div>
        <v-row class="mb-4">
            <v-col cols="12" md="8">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Select Anchor Entities</v-card-title>
                        <v-card-subtitle>
                            Choose document-derived entities to expand into the broader graph
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
                                    <template v-slot:prepend>
                                        <v-checkbox-btn
                                            :model-value="selectedAnchors.has(entity.neid)"
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
                            Selected: {{ selectedAnchors.size }} anchor(s)
                        </div>

                        <v-radio-group v-model="hops" inline hide-details class="mb-3">
                            <v-radio label="1-hop" :value="1" />
                            <v-radio label="2-hop" :value="2" />
                        </v-radio-group>

                        <v-btn
                            color="primary"
                            block
                            prepend-icon="mdi-arrow-expand-all"
                            :loading="enriching"
                            :disabled="selectedAnchors.size === 0"
                            @click="runEnrichment"
                        >
                            Expand Graph
                        </v-btn>

                        <v-btn
                            variant="text"
                            size="small"
                            class="mt-2"
                            :disabled="!isReady"
                            @click="autoSelectAnchors"
                        >
                            Auto-select top anchors
                        </v-btn>
                    </v-card-text>
                </v-card>

                <v-card class="mt-3">
                    <v-card-item>
                        <v-card-title class="text-body-1">Enrichment Summary</v-card-title>
                    </v-card-item>
                    <v-card-text>
                        <div class="d-flex justify-space-between py-1">
                            <span class="text-body-2">Document-derived entities</span>
                            <span class="text-body-2 font-weight-medium text-green">
                                {{ documentEntities.length }}
                            </span>
                        </div>
                        <div class="d-flex justify-space-between py-1">
                            <span class="text-body-2">Enriched entities</span>
                            <span class="text-body-2 font-weight-medium text-blue">
                                {{ enrichedEntities.length }}
                            </span>
                        </div>
                        <v-divider class="my-2" />
                        <div class="d-flex justify-space-between py-1">
                            <span class="text-body-2 font-weight-medium">Total</span>
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
                    <template v-slot:item.origin="{ item }">
                        <v-chip size="x-small" variant="tonal" color="info">
                            {{ item.origin }}
                        </v-chip>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>
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
    } = useCollectionWorkspace();

    const selectedAnchors = ref(new Set<string>());
    const anchorSearch = ref('');
    const hops = ref(1);

    const filteredAnchors = computed(() => {
        let list = documentEntities.value;
        if (anchorSearch.value) {
            const q = anchorSearch.value.toLowerCase();
            list = list.filter((e) => e.name.toLowerCase().includes(q));
        }
        return list.slice(0, 50);
    });

    function toggleAnchor(neid: string) {
        const next = new Set(selectedAnchors.value);
        if (next.has(neid)) next.delete(neid);
        else next.add(neid);
        selectedAnchors.value = next;
    }

    async function runEnrichment() {
        await enrich(Array.from(selectedAnchors.value), hops.value);
    }

    function autoSelectAnchors() {
        const connectionCount = new Map<string, number>();
        for (const r of relationships.value) {
            connectionCount.set(r.sourceNeid, (connectionCount.get(r.sourceNeid) || 0) + 1);
            connectionCount.set(r.targetNeid, (connectionCount.get(r.targetNeid) || 0) + 1);
        }

        const top = documentEntities.value
            .map((e) => ({ neid: e.neid, count: connectionCount.get(e.neid) || 0 }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        selectedAnchors.value = new Set(top.map((t) => t.neid));
    }

    const enrichedHeaders = [
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Type', key: 'flavor', sortable: true },
        { title: 'Origin', key: 'origin', sortable: false },
    ];
</script>
