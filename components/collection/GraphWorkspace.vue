<template>
    <div class="graph-workspace">
        <!-- Toolbar -->
        <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
            <div class="d-flex align-center ga-2">
                <v-chip size="small" variant="tonal" color="success">
                    {{ documentEntities.length }} extracted
                </v-chip>
                <v-chip v-if="enrichedEntities.length" size="small" variant="tonal" color="info">
                    {{ enrichedEntities.length }} enriched
                </v-chip>
                <v-chip size="small" variant="tonal" color="grey">
                    {{ visibleRelationships.length }} edges
                </v-chip>
            </div>
            <div class="d-flex align-center ga-2">
                <v-btn-toggle v-model="clusterMode" density="compact" variant="outlined" divided>
                    <v-btn value="false" size="small" prepend-icon="mdi-graph">Force</v-btn>
                    <v-btn value="true" size="small" prepend-icon="mdi-group">Clusters</v-btn>
                </v-btn-toggle>
                <v-text-field
                    v-model="searchQuery"
                    label="Search"
                    density="compact"
                    variant="outlined"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    hide-details
                    style="max-width: 200px"
                />
            </div>
        </div>

        <!-- Graph canvas with legend overlay -->
        <v-card
            class="graph-card mb-3"
            :style="{ height: graphHeight + 'px', position: 'relative' }"
        >
            <div
                ref="graphContainer"
                class="sigma-container"
                :style="{ height: graphHeight + 'px' }"
            />

            <!-- Legend overlay -->
            <div class="graph-overlay pa-2">
                <div class="text-caption font-weight-medium mb-1 text-medium-emphasis">
                    ENTITY TYPES
                </div>
                <div
                    v-for="[flavor, color] in flavorColorEntries"
                    :key="flavor"
                    class="d-flex align-center ga-1 py-0 cursor-pointer legend-row"
                    :class="{ 'opacity-40': hiddenFlavors.has(flavor) }"
                    :title="`Toggle ${flavor}`"
                    @click="toggleFlavor(flavor)"
                >
                    <div class="legend-dot" :style="{ background: color }" />
                    <span class="text-caption" style="min-width: 100px">
                        {{ flavor.replace(/_/g, ' ') }}
                    </span>
                    <span class="text-caption text-medium-emphasis">
                        {{ flavorCounts.get(flavor) ?? 0 }}
                    </span>
                </div>

                <v-divider class="my-1" />

                <div class="text-caption font-weight-medium mb-1 text-medium-emphasis">
                    REL TYPES
                </div>
                <div
                    v-for="[relType, count] in topRelTypes"
                    :key="relType"
                    class="d-flex align-center ga-1 py-0"
                >
                    <div class="legend-line" :style="{ background: getRelTypeColor(relType) }" />
                    <span class="text-caption" style="min-width: 110px">
                        {{ relType.replace(/schema::relationship::/, '').replace(/_/g, ' ') }}
                    </span>
                    <span class="text-caption text-medium-emphasis">{{ count }}</span>
                </div>
            </div>

            <!-- Hover tooltip -->
            <div
                v-if="tooltip"
                class="node-tooltip"
                :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
            >
                <div class="d-flex align-center ga-1 mb-1">
                    <v-icon size="14" :color="tooltip.color">{{
                        flavorIcon(tooltip.flavor)
                    }}</v-icon>
                    <span class="text-caption font-weight-bold">{{ tooltip.name }}</span>
                </div>
                <div class="text-caption text-medium-emphasis">
                    {{ tooltip.flavor.replace(/_/g, ' ') }}
                </div>
                <div class="text-caption text-medium-emphasis">
                    {{ tooltip.degree }} connections
                </div>
                <div v-if="tooltip.events > 0" class="text-caption" style="color: #ffa726">
                    {{ tooltip.events }} events
                </div>
                <div class="text-caption text-medium-emphasis" style="font-style: italic">
                    Click for details
                </div>
            </div>

            <div v-if="entities.length === 0" class="graph-empty">
                <v-icon size="48" class="mb-3 text-medium-emphasis">mdi-graph-outline</v-icon>
                <div class="text-body-2 text-medium-emphasis">
                    Load the graph to explore entities and relationships.
                </div>
            </div>
        </v-card>

        <!-- Entity table below -->
        <v-card>
            <v-card-item>
                <v-card-title class="text-body-1">
                    Entities
                    <v-chip size="x-small" variant="tonal" class="ml-2">
                        {{ filteredEntities.length }}
                    </v-chip>
                </v-card-title>
                <template v-slot:append>
                    <v-select
                        v-model="filterFlavor"
                        :items="flavorOptions"
                        label="Filter type"
                        density="compact"
                        variant="outlined"
                        clearable
                        hide-details
                        style="max-width: 160px"
                    />
                </template>
            </v-card-item>
            <v-card-text class="pa-0">
                <v-data-table
                    :headers="entityHeaders"
                    :items="filteredEntities"
                    :items-per-page="15"
                    density="compact"
                    hover
                    @click:row="(_: any, row: any) => selectEntity(row.item.neid)"
                >
                    <template v-slot:item.origin="{ item }">
                        <v-chip
                            size="x-small"
                            variant="tonal"
                            :color="item.origin === 'document' ? 'success' : 'info'"
                        >
                            {{ item.origin }}
                        </v-chip>
                    </template>
                    <template v-slot:item.flavor="{ item }">
                        <div class="d-flex align-center ga-1">
                            <v-icon size="12" :color="flavorColor(item.flavor)">
                                {{ flavorIcon(item.flavor) }}
                            </v-icon>
                            <span class="text-caption">{{ item.flavor.replace(/_/g, ' ') }}</span>
                        </div>
                    </template>
                    <template v-slot:item.sourceDocuments="{ item }">
                        {{ item.sourceDocuments.length }}
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    import { onMounted, onBeforeUnmount, watch, computed, ref, nextTick } from 'vue';
    import Graph from 'graphology';
    import { Sigma } from 'sigma';
    import forceAtlas2 from 'graphology-layout-forceatlas2';
    import louvain from 'graphology-communities-louvain';
    import type { EntityRecord, RelationshipRecord } from '~/utils/collectionTypes';

    const ENTITY_COLORS: Record<string, string> = {
        organization: '#42A5F5',
        person: '#FFA726',
        financial_instrument: '#66BB6A',
        location: '#AB47BC',
        fund_account: '#66BB6A',
        legal_agreement: '#EF5350',
    };

    const REL_COLORS: Record<string, string> = {
        fund_of: '#66BB6A',
        holds_investment: '#66BB6A',
        advisor_to: '#66BB6A',
        sponsor_of: '#66BB6A',
        predecessor_of: '#78909C',
        successor_to: '#78909C',
        works_at: '#78909C',
        trustee_of: '#42A5F5',
        borrower_of: '#42A5F5',
        beneficiary_of: '#42A5F5',
        issuer_of: '#42A5F5',
        party_to: '#42A5F5',
        located_at: '#FFA726',
        appears_in: '#9E9E9E',
        participant: '#AB47BC',
        'schema::relationship::participant': '#AB47BC',
    };

    const {
        entities,
        relationships,
        documentEntities,
        enrichedEntities,
        events,
        selectedEntityNeid,
        selectEntity,
        flavorCounts,
    } = useCollectionWorkspace();

    const graphContainer = ref<HTMLElement | null>(null);
    const graphHeight = 520;
    const filterFlavor = ref<string | null>(null);
    const searchQuery = ref('');
    const clusterMode = ref<'false' | 'true'>('false');
    const hiddenFlavors = ref<Set<string>>(new Set(['location']));

    let sigmaInstance: Sigma | null = null;
    let graphInstance: Graph | null = null;

    interface TooltipState {
        name: string;
        flavor: string;
        color: string;
        degree: number;
        events: number;
        x: number;
        y: number;
    }
    const tooltip = ref<TooltipState | null>(null);

    const flavorColorEntries = computed(() => Object.entries(ENTITY_COLORS));

    const flavorOptions = computed(() => {
        const flavors = new Set(entities.value.map((e) => e.flavor));
        return Array.from(flavors).sort();
    });

    const filteredEntities = computed(() => {
        let list = entities.value;
        if (filterFlavor.value) list = list.filter((e) => e.flavor === filterFlavor.value);
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            list = list.filter((e) => e.name.toLowerCase().includes(q));
        }
        return list;
    });

    const visibleEntities = computed(() =>
        entities.value.filter((e) => !hiddenFlavors.value.has(e.flavor))
    );

    const visibleRelationships = computed(() => {
        const nodeSet = new Set(visibleEntities.value.map((e) => e.neid));
        return relationships.value.filter(
            (r) => nodeSet.has(r.sourceNeid) && nodeSet.has(r.targetNeid)
        );
    });

    const eventCountByNeid = computed(() => {
        const counts = new Map<string, number>();
        for (const evt of events.value) {
            for (const neid of evt.participantNeids) {
                counts.set(neid, (counts.get(neid) ?? 0) + 1);
            }
        }
        return counts;
    });

    const topRelTypes = computed(() => {
        const counts = new Map<string, number>();
        for (const r of relationships.value) {
            counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
    });

    const entityHeaders = [
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Type', key: 'flavor', sortable: true },
        { title: 'Origin', key: 'origin', sortable: true },
        { title: 'Docs', key: 'sourceDocuments', sortable: false },
    ];

    function flavorIcon(flavor: string): string {
        const icons: Record<string, string> = {
            organization: 'mdi-domain',
            person: 'mdi-account',
            financial_instrument: 'mdi-bank',
            location: 'mdi-map-marker',
            fund_account: 'mdi-wallet',
            legal_agreement: 'mdi-file-document-outline',
        };
        return icons[flavor] ?? 'mdi-circle-small';
    }

    function flavorColor(flavor: string): string {
        return ENTITY_COLORS[flavor] ?? '#9E9E9E';
    }

    function getRelTypeColor(relType: string): string {
        return REL_COLORS[relType] ?? '#9E9E9E';
    }

    function toggleFlavor(flavor: string): void {
        const s = new Set(hiddenFlavors.value);
        if (s.has(flavor)) s.delete(flavor);
        else s.add(flavor);
        hiddenFlavors.value = s;
        buildGraph();
    }

    function buildGraph(): void {
        if (!graphContainer.value) return;

        // Cleanup
        if (sigmaInstance) {
            sigmaInstance.kill();
            sigmaInstance = null;
        }

        const ents = visibleEntities.value;
        const rels = visibleRelationships.value;

        if (ents.length === 0) return;

        const g = new Graph({ type: 'mixed', multi: false });
        graphInstance = g;

        const nodeSet = new Set(ents.map((e) => e.neid));

        // Add nodes
        for (const entity of ents) {
            const evtCount = eventCountByNeid.value.get(entity.neid) ?? 0;
            const propCount = Object.keys(entity.properties ?? {}).length;
            const size = Math.max(
                6,
                Math.min(22, 6 + propCount * 0.6 + entity.sourceDocuments.length * 1.5)
            );
            const color =
                entity.origin === 'enriched'
                    ? hexAlpha(ENTITY_COLORS[entity.flavor] ?? '#9E9E9E', 0.4)
                    : (ENTITY_COLORS[entity.flavor] ?? '#9E9E9E');

            g.addNode(entity.neid, {
                label: entity.name.slice(0, 40),
                x: Math.random() * 100,
                y: Math.random() * 100,
                size,
                color,
                entity_type: entity.flavor,
                eventCount: evtCount,
                origin: entity.origin,
            });
        }

        // Add edges
        for (const rel of rels) {
            if (!nodeSet.has(rel.sourceNeid) || !nodeSet.has(rel.targetNeid)) continue;
            if (rel.sourceNeid === rel.targetNeid) continue;
            const edgeKey = `${rel.sourceNeid}|${rel.targetNeid}|${rel.type}`;
            if (g.hasEdge(edgeKey)) continue;
            try {
                g.addEdgeWithKey(edgeKey, rel.sourceNeid, rel.targetNeid, {
                    label: rel.type.replace(/schema::relationship::/, '').replace(/_/g, ' '),
                    color: hexAlpha(
                        getRelTypeColor(rel.type),
                        rel.origin === 'enriched' ? 0.25 : 0.55
                    ),
                    size: 1.2,
                    type: 'arrow',
                });
            } catch {
                // duplicate edge — ignore
            }
        }

        // Community detection in cluster mode
        if (clusterMode.value === 'true' && g.order > 2) {
            try {
                const communities = louvain(g);
                const communityColors = [
                    '#e6194B',
                    '#3cb44b',
                    '#ffe119',
                    '#4363d8',
                    '#f58231',
                    '#911eb4',
                    '#42d4f4',
                    '#f032e6',
                    '#bfef45',
                    '#469990',
                    '#dcbeff',
                    '#9A6324',
                    '#800000',
                    '#aaffc3',
                    '#808000',
                ];
                g.forEachNode((node) => {
                    const c = communities[node] ?? 0;
                    const clusterColor = communityColors[c % communityColors.length];
                    g.setNodeAttribute(node, 'color', hexAlpha(clusterColor, 0.85));
                });
            } catch {
                // Louvain may fail on disconnected graphs
            }
        }

        // ForceAtlas2 layout
        const nodeCount = g.order;
        forceAtlas2.assign(g, {
            iterations: Math.min(300, Math.max(100, Math.round(50000 / Math.max(nodeCount, 1)))),
            settings: {
                gravity: 1.0,
                scalingRatio: nodeCount > 300 ? 20 : 10,
                barnesHutOptimize: nodeCount > 100,
                strongGravityMode: false,
                linLogMode: true,
                outboundAttractionDistribution: true,
                adjustSizes: true,
                edgeWeightInfluence: 1,
                slowDown: 1,
            },
        });

        // Create Sigma instance
        sigmaInstance = new Sigma(g, graphContainer.value, {
            renderEdgeLabels: false,
            allowInvalidContainer: true,
            labelFont: '"Inter", "Roboto", sans-serif',
            labelSize: 13,
            labelWeight: 'bold',
            labelColor: { color: '#ffffff' },
            labelRenderedSizeThreshold: 3,
            labelDensity: 0.2,
            labelGridCellSize: 100,
            defaultEdgeType: 'arrow',
            defaultEdgeColor: 'rgba(150, 150, 150, 0.4)',
        });

        // Hover
        sigmaInstance.on('enterNode', ({ node, event }) => {
            const attrs = g.getNodeAttributes(node);
            const rect = graphContainer.value!.getBoundingClientRect();
            tooltip.value = {
                name: attrs.label ?? node,
                flavor: attrs.entity_type ?? '',
                color: ENTITY_COLORS[attrs.entity_type] ?? '#9E9E9E',
                degree: g.degree(node),
                events: attrs.eventCount ?? 0,
                x: (event as any)?.x - rect.left + 12 ?? 0,
                y: (event as any)?.y - rect.top + 12 ?? 0,
            };
        });

        sigmaInstance.on('leaveNode', () => {
            tooltip.value = null;
        });

        sigmaInstance.on('moveBody', ({ event }) => {
            if (tooltip.value) {
                const rect = graphContainer.value!.getBoundingClientRect();
                tooltip.value.x = (event as any)?.x - rect.left + 12 ?? tooltip.value.x;
                tooltip.value.y = (event as any)?.y - rect.top + 12 ?? tooltip.value.y;
            }
        });

        // Click
        sigmaInstance.on('clickNode', ({ node }) => {
            selectEntity(node);
        });

        sigmaInstance.on('clickStage', () => {
            tooltip.value = null;
        });

        // Highlight selected
        watch(selectedEntityNeid, (neid) => {
            if (!sigmaInstance || !graphInstance) return;
            graphInstance.forEachNode((n) => {
                graphInstance!.setNodeAttribute(n, 'highlighted', n === neid);
            });
            sigmaInstance.refresh();
        });
    }

    function hexAlpha(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    watch(
        [entities, relationships],
        () => {
            nextTick(() => buildGraph());
        },
        { deep: false }
    );

    watch(clusterMode, () => buildGraph());

    onMounted(() => {
        nextTick(() => buildGraph());
    });

    onBeforeUnmount(() => {
        if (sigmaInstance) {
            sigmaInstance.kill();
            sigmaInstance = null;
        }
    });
</script>

<style scoped>
    .graph-workspace {
        position: relative;
    }

    .graph-card {
        overflow: hidden;
    }

    .sigma-container {
        width: 100%;
        height: 100%;
        background: #1a1a2e;
    }

    .graph-overlay {
        position: absolute;
        top: 12px;
        left: 12px;
        background: rgba(28, 28, 36, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 8px;
        min-width: 160px;
        max-width: 200px;
        backdrop-filter: blur(6px);
        z-index: 10;
    }

    .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .legend-line {
        width: 18px;
        height: 3px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    .legend-row {
        transition: opacity 0.2s;
    }

    .node-tooltip {
        position: absolute;
        background: rgba(20, 20, 30, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 8px 10px;
        pointer-events: none;
        z-index: 20;
        backdrop-filter: blur(8px);
        min-width: 130px;
    }

    .graph-empty {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .opacity-40 {
        opacity: 0.4;
    }

    .cursor-pointer {
        cursor: pointer;
    }
</style>
