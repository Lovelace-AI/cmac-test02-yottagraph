<template>
    <div>
        <v-row class="mb-4">
            <v-col cols="12" md="6">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Retrieval Model</v-card-title>
                    </v-card-item>
                    <v-card-text>
                        <div class="text-body-2 mb-3">
                            This collection uses a two-layer retrieval architecture:
                        </div>
                        <v-list density="compact" class="pa-0">
                            <v-list-item>
                                <template v-slot:prepend>
                                    <v-icon size="small" color="success" class="mr-2">
                                        mdi-server-network
                                    </v-icon>
                                </template>
                                <v-list-item-title class="text-body-2">
                                    MCP Layer
                                </v-list-item-title>
                                <v-list-item-subtitle class="text-caption">
                                    Discovery, traversal, entity resolution, event discovery
                                </v-list-item-subtitle>
                            </v-list-item>
                            <v-list-item>
                                <template v-slot:prepend>
                                    <v-icon size="small" color="warning" class="mr-2">
                                        mdi-database
                                    </v-icon>
                                </template>
                                <v-list-item-title class="text-body-2">
                                    Raw Query Server
                                </v-list-item-title>
                                <v-list-item-subtitle class="text-caption">
                                    Full temporal property history, relationship-row validation
                                </v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Coverage Status</v-card-title>
                    </v-card-item>
                    <v-card-text>
                        <div
                            v-for="row in coverageRows"
                            :key="row.label"
                            class="d-flex align-center justify-space-between py-2"
                        >
                            <div class="text-body-2">{{ row.label }}</div>
                            <div class="d-flex align-center ga-2">
                                <span class="text-body-2 font-weight-medium">{{
                                    row.current
                                }}</span>
                                <span class="text-caption text-medium-emphasis"
                                    >/ {{ row.expected }}</span
                                >
                                <v-icon
                                    size="small"
                                    :color="row.current >= row.expected ? 'success' : 'warning'"
                                >
                                    {{
                                        row.current >= row.expected
                                            ? 'mdi-check-circle'
                                            : 'mdi-alert-circle'
                                    }}
                                </v-icon>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-card class="mb-4">
            <v-card-item>
                <v-card-title class="text-body-1">Origin Breakdown</v-card-title>
            </v-card-item>
            <v-card-text>
                <v-row>
                    <v-col v-for="origin in originBreakdown" :key="origin.label" cols="12" md="4">
                        <v-card variant="tonal" :color="origin.color" class="pa-3 text-center">
                            <div class="text-h5 font-weight-bold">{{ origin.count }}</div>
                            <div class="text-body-2">{{ origin.label }}</div>
                            <div class="text-caption" style="opacity: 0.7">
                                {{ origin.description }}
                            </div>
                        </v-card>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <v-card>
            <v-card-item>
                <v-card-title class="text-body-1">Known Limitations</v-card-title>
            </v-card-item>
            <v-card-text>
                <v-list density="compact" class="pa-0">
                    <v-list-item v-for="(note, i) in limitations" :key="i">
                        <template v-slot:prepend>
                            <v-icon size="small" color="warning" class="mr-2">
                                mdi-information-outline
                            </v-icon>
                        </template>
                        <v-list-item-title class="text-body-2 text-wrap">
                            {{ note }}
                        </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    const { meta, documentEntities, enrichedEntities, entities } = useCollectionWorkspace();

    const coverageRows = computed(() => [
        { label: 'Documents', current: meta.value.documentCount, expected: 5 },
        { label: 'Entities (unique NEIDs)', current: meta.value.entityCount, expected: 185 },
        { label: 'Events (unique NEIDs)', current: meta.value.eventCount, expected: 53 },
        { label: 'Relationships', current: meta.value.relationshipCount, expected: 521 },
        { label: 'Agreements', current: meta.value.agreementCount, expected: 37 },
    ]);

    const originBreakdown = computed(() => [
        {
            label: 'Document-Derived',
            count: documentEntities.value.length,
            color: 'success',
            description: 'Extracted from source PDFs via KG',
        },
        {
            label: 'Enriched',
            count: enrichedEntities.value.length,
            color: 'info',
            description: 'Added from broader graph expansion',
        },
        {
            label: 'Agent-Generated',
            count: entities.value.filter((e) => e.origin === 'agent').length,
            color: 'warning',
            description: 'Synthesized by agent workflows',
        },
    ]);

    const limitations = [
        'MCP property access returns latest-only values. Full temporal history requires raw Query Server POST /elemental/entities/properties.',
        'Events are at hop 2 in this dataset: documents → entities → events. Direct document-to-event traversal returns zero results.',
        'The get_relationships MCP tool returns empty for document-ingested edges. Relationship types are confirmed via get_related with explicit type filters or raw property-history rows.',
        'Exact edge citation strings and dedicated per-edge count endpoints are not cleanly exposed for document-ingested relationships.',
        'Entity resolution merges 193 ground-truth names into 185 unique NEIDs. This is correct behavior, not missing data.',
    ];
</script>
