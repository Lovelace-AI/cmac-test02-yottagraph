<template>
    <div>
        <div class="d-flex align-center justify-space-between mb-3">
            <div class="d-flex align-center ga-2">
                <v-chip size="small" variant="tonal" color="success">
                    {{ documentEntities.length }} extracted
                </v-chip>
                <v-chip v-if="enrichedEntities.length" size="small" variant="tonal" color="info">
                    {{ enrichedEntities.length }} enriched
                </v-chip>
            </div>
            <div class="d-flex align-center ga-2">
                <v-select
                    v-model="filterFlavor"
                    :items="flavorOptions"
                    label="Filter by type"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    style="max-width: 200px"
                />
                <v-text-field
                    v-model="searchQuery"
                    label="Search entities"
                    density="compact"
                    variant="outlined"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    hide-details
                    style="max-width: 240px"
                />
            </div>
        </div>

        <v-card>
            <v-card-text class="pa-0">
                <div
                    ref="graphContainer"
                    class="graph-canvas"
                    :style="{ height: `${canvasHeight}px` }"
                >
                    <svg :width="canvasWidth" :height="canvasHeight" class="graph-svg">
                        <g :transform="`translate(${canvasWidth / 2}, ${canvasHeight / 2})`">
                            <line
                                v-for="(edge, i) in visibleEdges"
                                :key="`e-${i}`"
                                :x1="nodePositions.get(edge.sourceNeid)?.x ?? 0"
                                :y1="nodePositions.get(edge.sourceNeid)?.y ?? 0"
                                :x2="nodePositions.get(edge.targetNeid)?.x ?? 0"
                                :y2="nodePositions.get(edge.targetNeid)?.y ?? 0"
                                :stroke="edge.origin === 'enriched' ? '#003bff44' : '#3fea0033'"
                                :stroke-dasharray="edge.origin === 'enriched' ? '4,4' : 'none'"
                                stroke-width="1"
                            />
                            <g
                                v-for="node in visibleNodes"
                                :key="node.neid"
                                class="graph-node"
                                :transform="`translate(${nodePositions.get(node.neid)?.x ?? 0}, ${nodePositions.get(node.neid)?.y ?? 0})`"
                                @click="selectEntity(node.neid)"
                            >
                                <circle
                                    :r="nodeRadius(node)"
                                    :fill="nodeFill(node)"
                                    :stroke="
                                        node.neid === selectedEntityNeid ? '#3fea00' : 'transparent'
                                    "
                                    stroke-width="2"
                                    class="cursor-pointer"
                                />
                                <text
                                    dy="0.35em"
                                    text-anchor="middle"
                                    fill="white"
                                    font-size="8"
                                    class="cursor-pointer"
                                    style="pointer-events: none"
                                >
                                    {{ truncate(node.name, 12) }}
                                </text>
                            </g>
                        </g>
                    </svg>
                </div>
            </v-card-text>
        </v-card>

        <v-card class="mt-3">
            <v-card-item>
                <v-card-title class="text-body-1">
                    Entities
                    <v-chip size="x-small" variant="tonal" class="ml-2">
                        {{ filteredEntities.length }}
                    </v-chip>
                </v-card-title>
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
                    <template v-slot:item.sourceDocuments="{ item }">
                        {{ item.sourceDocuments.length }}
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    import type { EntityRecord, RelationshipRecord } from '~/utils/collectionTypes';

    const {
        entities,
        documentEntities,
        enrichedEntities,
        relationships,
        selectedEntityNeid,
        selectEntity,
    } = useCollectionWorkspace();

    const filterFlavor = ref<string | null>(null);
    const searchQuery = ref('');
    const canvasWidth = 800;
    const canvasHeight = 500;
    const graphContainer = ref<HTMLElement | null>(null);

    const flavorOptions = computed(() => {
        const flavors = new Set(entities.value.map((e) => e.flavor));
        return Array.from(flavors).sort();
    });

    const filteredEntities = computed(() => {
        let list = entities.value;
        if (filterFlavor.value) {
            list = list.filter((e) => e.flavor === filterFlavor.value);
        }
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            list = list.filter((e) => e.name.toLowerCase().includes(q));
        }
        return list;
    });

    const visibleNodes = computed(() => filteredEntities.value.slice(0, 120));

    const visibleEdges = computed(() => {
        const nodeSet = new Set(visibleNodes.value.map((n) => n.neid));
        return relationships.value.filter(
            (r) => nodeSet.has(r.sourceNeid) && nodeSet.has(r.targetNeid)
        );
    });

    const nodePositions = computed(() => {
        const positions = new Map<string, { x: number; y: number }>();
        const nodes = visibleNodes.value;
        const count = nodes.length;
        if (count === 0) return positions;

        const flavorGroups = new Map<string, EntityRecord[]>();
        for (const node of nodes) {
            const group = flavorGroups.get(node.flavor) || [];
            group.push(node);
            flavorGroups.set(node.flavor, group);
        }

        let groupIdx = 0;
        const groupCount = flavorGroups.size || 1;
        const radius = Math.min(canvasWidth, canvasHeight) * 0.35;

        for (const [, group] of flavorGroups) {
            const groupAngle = (2 * Math.PI * groupIdx) / groupCount;
            const cx = Math.cos(groupAngle) * radius * 0.5;
            const cy = Math.sin(groupAngle) * radius * 0.5;

            for (let i = 0; i < group.length; i++) {
                const angle = (2 * Math.PI * i) / group.length;
                const r = 40 + group.length * 3;
                positions.set(group[i].neid, {
                    x: cx + Math.cos(angle) * r,
                    y: cy + Math.sin(angle) * r,
                });
            }
            groupIdx++;
        }

        return positions;
    });

    const entityHeaders = [
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Type', key: 'flavor', sortable: true },
        { title: 'Origin', key: 'origin', sortable: true },
        { title: 'Docs', key: 'sourceDocuments', sortable: false },
    ];

    function nodeRadius(node: EntityRecord): number {
        return node.sourceDocuments.length > 2 ? 14 : 10;
    }

    function nodeFill(node: EntityRecord): string {
        if (node.origin === 'enriched') return '#003bff88';
        const colors: Record<string, string> = {
            organization: '#3fea00aa',
            person: '#003bffaa',
            financial_instrument: '#ff5c00aa',
            location: '#757575aa',
            fund_account: '#3fea0066',
            legal_agreement: '#003bff66',
        };
        return colors[node.flavor] ?? '#555555aa';
    }

    function truncate(text: string, max: number): string {
        return text.length > max ? text.slice(0, max) + '…' : text;
    }
</script>

<style scoped>
    .graph-canvas {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        overflow: hidden;
    }

    .graph-svg {
        width: 100%;
        height: 100%;
    }

    .graph-node {
        cursor: pointer;
    }

    .graph-node:hover circle {
        filter: brightness(1.3);
    }
</style>
