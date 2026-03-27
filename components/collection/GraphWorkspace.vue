<template>
    <div class="graph-workspace">
        <!-- Toolbar -->
        <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
            <div class="d-flex align-center ga-2">
                <v-chip size="small" variant="tonal" color="success">
                    {{ documentEntities.length }} document-derived
                </v-chip>
                <v-chip v-if="enrichedEntities.length" size="small" variant="tonal" color="info">
                    {{ enrichedEntities.length }} enriched
                </v-chip>
                <v-chip size="small" variant="outlined">
                    {{ visibleRelationships.length }} visible links
                </v-chip>
            </div>
            <div class="d-flex align-center ga-2 flex-wrap justify-end">
                <v-select
                    v-model="analysisMode"
                    :items="analysisModes"
                    item-title="label"
                    item-value="value"
                    label="View mode"
                    density="compact"
                    variant="outlined"
                    hide-details
                    style="max-width: 220px"
                />
                <v-select
                    v-model="relationshipTypeFilter"
                    :items="relationshipTypeOptions"
                    label="Relationship type"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    style="max-width: 240px"
                />
                <v-checkbox
                    v-model="sourceBackedOnly"
                    hide-details
                    density="compact"
                    color="primary"
                    label="Source-backed only"
                    class="mr-1"
                />
                <v-checkbox
                    v-model="highConfidenceOnly"
                    hide-details
                    density="compact"
                    color="primary"
                    label="High-confidence only"
                    class="mr-1"
                />
                <v-text-field
                    v-model="searchQuery"
                    label="Find entity"
                    density="compact"
                    variant="outlined"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    hide-details
                    style="max-width: 200px"
                />
                <v-btn
                    size="small"
                    variant="outlined"
                    :prepend-icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
                    @click="toggleFullscreen"
                >
                    {{ isFullscreen ? 'Exit fullscreen' : 'Fullscreen' }}
                </v-btn>
            </div>
        </div>

        <div class="d-flex align-center ga-2 flex-wrap mb-3">
            <v-select
                v-model="pathStart"
                :items="entityPathOptions"
                item-title="title"
                item-value="value"
                label="Path from"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 280px"
            />
            <v-select
                v-model="pathEnd"
                :items="entityPathOptions"
                item-title="title"
                item-value="value"
                label="Path to"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 280px"
            />
            <v-btn
                size="small"
                variant="outlined"
                prepend-icon="mdi-source-branch"
                :disabled="!pathStart || !pathEnd || pathStart === pathEnd"
                @click="computeShortestPath"
            >
                Show shortest path
            </v-btn>
            <div v-if="shortestPathText" class="text-caption text-medium-emphasis">
                {{ shortestPathText }}
            </div>
        </div>

        <!-- Graph canvas with legend overlay -->
        <v-card class="graph-card" :class="{ 'graph-card-fullscreen': isFullscreen }">
            <div
                ref="graphFrame"
                class="graph-frame"
                :style="{
                    height: `${graphHeight}px`,
                    background: currentThemeColors.graphBackground,
                }"
            >
                <v-btn
                    v-if="isFullscreen"
                    size="small"
                    variant="tonal"
                    prepend-icon="mdi-fullscreen-exit"
                    class="fullscreen-exit-btn"
                    @click.stop="toggleFullscreen"
                >
                    Exit fullscreen
                </v-btn>
                <div
                    ref="graphContainer"
                    class="sigma-container"
                    :style="{ height: `${graphHeight}px` }"
                />

                <!-- Legend overlay -->
                <div
                    class="graph-overlay pa-2"
                    :style="{
                        background: currentThemeColors.graphOverlay,
                        borderColor: currentThemeColors.graphOverlayBorder,
                    }"
                >
                    <div class="text-caption font-weight-medium mb-1 text-medium-emphasis">
                        ENTITY TYPES
                    </div>
                    <button
                        v-for="[flavor, color] in flavorColorEntries"
                        :key="flavor"
                        type="button"
                        class="d-flex align-center ga-1 py-0 legend-row legend-button app-click-target"
                        :class="{ 'opacity-40': hiddenFlavors.has(flavor) }"
                        :title="`Toggle ${flavor}`"
                        :aria-pressed="String(!hiddenFlavors.has(flavor))"
                        @click="toggleFlavor(flavor)"
                    >
                        <div class="legend-dot" :style="{ background: color }" />
                        <span class="text-caption" style="min-width: 100px">
                            {{ flavor.replace(/_/g, ' ') }}
                        </span>
                        <span class="text-caption text-medium-emphasis">
                            {{ flavorCounts.get(flavor) ?? 0 }}
                        </span>
                    </button>

                    <v-divider class="my-1" />

                    <div class="text-caption font-weight-medium mb-1 text-medium-emphasis">
                        REL TYPES
                    </div>
                    <div
                        v-for="[relType, count] in topRelTypes"
                        :key="relType"
                        class="d-flex align-center ga-1 py-0"
                    >
                        <div
                            class="legend-line"
                            :style="{ background: getRelTypeColor(relType) }"
                        />
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
                    :style="{
                        left: tooltip.x + 'px',
                        top: tooltip.y + 'px',
                        background: currentThemeColors.tooltipBackground,
                        borderColor: currentThemeColors.tooltipBorder,
                    }"
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

                <div v-if="selectedEntityNeid" class="entity-overlay">
                    <EntityDetailPanel />
                </div>
            </div>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    import { onMounted, onBeforeUnmount, watch, computed, ref, nextTick } from 'vue';
    import Graph from 'graphology';
    import { Sigma } from 'sigma';
    import forceAtlas2 from 'graphology-layout-forceatlas2';
    import louvain from 'graphology-communities-louvain';

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
    const { colorMode, currentThemeColors } = useAppColorMode();

    const graphContainer = ref<HTMLElement | null>(null);
    const graphFrame = ref<HTMLElement | null>(null);
    const viewportHeight = ref(900);
    const searchQuery = ref('');
    const hiddenFlavors = ref<Set<string>>(new Set(['location']));
    const analysisMode = ref<'centrality' | 'relationship' | 'timeline' | 'source' | 'simplified'>(
        'centrality'
    );
    const relationshipTypeFilter = ref<string | null>(null);
    const sourceBackedOnly = ref(false);
    const highConfidenceOnly = ref(false);
    const pathStart = ref<string | null>(null);
    const pathEnd = ref<string | null>(null);
    const shortestPathText = ref('');
    const isFullscreen = ref(false);
    const graphHeight = computed(() => (isFullscreen.value ? viewportHeight.value - 84 : 640));

    let sigmaInstance: Sigma | null = null;
    let graphInstance: Graph | null = null;
    let resizeObserver: ResizeObserver | null = null;

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
    const analysisModes = [
        { label: 'Centrality', value: 'centrality' },
        { label: 'Relationship Type', value: 'relationship' },
        { label: 'Timeline Linked', value: 'timeline' },
        { label: 'Source Document', value: 'source' },
        { label: 'Clustered / Simplified', value: 'simplified' },
    ];

    const visibleEntities = computed(() => {
        const q = searchQuery.value.trim().toLowerCase();
        return entities.value.filter((e) => {
            if (hiddenFlavors.value.has(e.flavor)) return false;
            if (!q) return true;
            return e.name.toLowerCase().includes(q);
        });
    });

    const relationshipTypeOptions = computed(() =>
        Array.from(new Set(relationships.value.map((r) => r.type))).sort()
    );

    const visibleRelationships = computed(() => {
        const nodeSet = new Set(visibleEntities.value.map((e) => e.neid));
        return relationships.value.filter((rel) => {
            if (!nodeSet.has(rel.sourceNeid) || !nodeSet.has(rel.targetNeid)) return false;
            if (relationshipTypeFilter.value && rel.type !== relationshipTypeFilter.value)
                return false;
            const hasEvidence =
                Boolean(rel.sourceDocumentNeid) ||
                (Array.isArray(rel.citations) && rel.citations.length > 0);
            if (sourceBackedOnly.value && !hasEvidence) return false;
            if (highConfidenceOnly.value && !hasEvidence) return false;
            return true;
        });
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

    const degreeByNeid = computed(() => {
        const degrees = new Map<string, number>();
        for (const rel of visibleRelationships.value) {
            degrees.set(rel.sourceNeid, (degrees.get(rel.sourceNeid) ?? 0) + 1);
            degrees.set(rel.targetNeid, (degrees.get(rel.targetNeid) ?? 0) + 1);
        }
        return degrees;
    });

    const timelineLinkedNeids = computed(() => {
        const neids = new Set<string>();
        for (const evt of events.value) {
            for (const neid of evt.participantNeids) neids.add(neid);
        }
        return neids;
    });

    const entityPathOptions = computed(() =>
        entities.value
            .map((entity) => ({
                value: entity.neid,
                title: `${entity.name} (${entity.flavor.replace(/_/g, ' ')})`,
            }))
            .sort((a, b) => a.title.localeCompare(b.title))
    );

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

        let ents = visibleEntities.value;
        if (analysisMode.value === 'timeline') {
            ents = ents.filter((entity) => timelineLinkedNeids.value.has(entity.neid));
        }
        if (analysisMode.value === 'simplified') {
            ents = ents.filter((entity) => (degreeByNeid.value.get(entity.neid) ?? 0) >= 2);
        }
        const rels = visibleRelationships.value;

        if (ents.length === 0) return;

        const g = new Graph({ type: 'mixed', multi: false });
        graphInstance = g;

        // Add nodes
        for (const entity of ents) {
            const evtCount = eventCountByNeid.value.get(entity.neid) ?? 0;
            const propCount = Object.keys(entity.properties ?? {}).length;
            const degree = degreeByNeid.value.get(entity.neid) ?? 0;
            const size = Math.max(
                6,
                Math.min(
                    24,
                    analysisMode.value === 'centrality'
                        ? 6 + degree * 1.2 + evtCount * 0.8
                        : 6 + propCount * 0.6 + entity.sourceDocuments.length * 1.5
                )
            );
            let color =
                entity.origin === 'enriched'
                    ? hexAlpha(ENTITY_COLORS[entity.flavor] ?? '#9E9E9E', 0.4)
                    : (ENTITY_COLORS[entity.flavor] ?? '#9E9E9E');

            if (analysisMode.value === 'source') {
                const sourceCount = entity.sourceDocuments.length;
                color =
                    sourceCount >= 3
                        ? '#1E88E5'
                        : sourceCount === 2
                          ? '#43A047'
                          : sourceCount === 1
                            ? '#8E24AA'
                            : '#9E9E9E';
            }
            if (analysisMode.value === 'timeline' && evtCount === 0) {
                color = hexAlpha(color, 0.3);
            }

            g.addNode(entity.neid, {
                label: entity.name.slice(0, 40),
                x: Math.random() * 100,
                y: Math.random() * 100,
                size,
                node_base_size: size,
                color,
                entity_type: entity.flavor,
                eventCount: evtCount,
                origin: entity.origin,
            });
        }

        // Add edges
        const relNodeSet = new Set(ents.map((entity) => entity.neid));
        for (const rel of rels) {
            if (!relNodeSet.has(rel.sourceNeid) || !relNodeSet.has(rel.targetNeid)) continue;
            if (rel.sourceNeid === rel.targetNeid) continue;
            const edgeKey = `${rel.sourceNeid}|${rel.targetNeid}|${rel.type}`;
            if (g.hasEdge(edgeKey)) continue;
            try {
                const hasEvidence =
                    Boolean(rel.sourceDocumentNeid) ||
                    (Array.isArray(rel.citations) && rel.citations.length > 0);
                g.addEdgeWithKey(edgeKey, rel.sourceNeid, rel.targetNeid, {
                    label: rel.type.replace(/schema::relationship::/, '').replace(/_/g, ' '),
                    color: hexAlpha(
                        getRelTypeColor(rel.type),
                        rel.origin === 'enriched' ? 0.25 : hasEvidence ? 0.68 : 0.32
                    ),
                    size: hasEvidence ? 1.6 : 1,
                    type: 'arrow',
                });
            } catch {
                // duplicate edge — ignore
            }
        }

        // Community detection in cluster mode
        if (analysisMode.value === 'simplified' && g.order > 2) {
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
            labelColor: { color: currentThemeColors.value.textPrimary },
            labelRenderedSizeThreshold: 3,
            labelDensity: 0.2,
            labelGridCellSize: 100,
            defaultEdgeType: 'arrow',
            defaultEdgeColor: hexAlpha(
                currentThemeColors.value.border,
                colorMode.value === 'dark' ? 0.45 : 0.6
            ),
        });

        // Hover
        sigmaInstance.on('enterNode', ({ node, event }) => {
            const attrs = g.getNodeAttributes(node);
            const rect = graphContainer.value!.getBoundingClientRect();
            const pointerX = (event as any)?.x;
            const pointerY = (event as any)?.y;
            tooltip.value = {
                name: attrs.label ?? node,
                flavor: attrs.entity_type ?? '',
                color: ENTITY_COLORS[attrs.entity_type] ?? '#9E9E9E',
                degree: g.degree(node),
                events: attrs.eventCount ?? 0,
                x: pointerX !== undefined ? pointerX - rect.left + 12 : 0,
                y: pointerY !== undefined ? pointerY - rect.top + 12 : 0,
            };
        });

        sigmaInstance.on('leaveNode', () => {
            tooltip.value = null;
        });

        sigmaInstance.on('moveBody', ({ event }) => {
            if (tooltip.value) {
                const rect = graphContainer.value!.getBoundingClientRect();
                const pointerX = (event as any)?.x;
                const pointerY = (event as any)?.y;
                tooltip.value.x =
                    pointerX !== undefined ? pointerX - rect.left + 12 : tooltip.value.x;
                tooltip.value.y =
                    pointerY !== undefined ? pointerY - rect.top + 12 : tooltip.value.y;
            }
        });

        // Click
        sigmaInstance.on('clickNode', ({ node }) => {
            selectEntity(node);
        });

        sigmaInstance.on('clickStage', () => {
            tooltip.value = null;
        });

        applySelectedHighlight();
        refreshSigma();
    }

    function hexAlpha(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    watch(
        [
            entities,
            relationships,
            analysisMode,
            relationshipTypeFilter,
            sourceBackedOnly,
            highConfidenceOnly,
            searchQuery,
        ],
        () => {
            nextTick(() => buildGraph());
        },
        { deep: false }
    );

    watch(colorMode, () => buildGraph());
    watch(selectedEntityNeid, () => applySelectedHighlight());
    watch(graphHeight, () => refreshSigma());

    function refreshSigma() {
        nextTick(() => {
            sigmaInstance?.refresh();
        });
    }

    function syncViewportHeight() {
        viewportHeight.value = window.innerHeight;
    }

    async function toggleFullscreen() {
        if (!graphFrame.value) return;
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        } else {
            await graphFrame.value.requestFullscreen();
        }
    }

    function handleFullscreenChange() {
        isFullscreen.value = document.fullscreenElement === graphFrame.value;
        syncViewportHeight();
        refreshSigma();
    }

    onMounted(() => {
        syncViewportHeight();
        nextTick(() => buildGraph());
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('resize', syncViewportHeight);
        if (graphFrame.value) {
            resizeObserver = new ResizeObserver(() => refreshSigma());
            resizeObserver.observe(graphFrame.value);
        }
    });

    onBeforeUnmount(() => {
        if (sigmaInstance) {
            sigmaInstance.kill();
            sigmaInstance = null;
        }
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        window.removeEventListener('resize', syncViewportHeight);
        resizeObserver?.disconnect();
        resizeObserver = null;
    });

    function applySelectedHighlight() {
        if (!sigmaInstance || !graphInstance) return;
        const neid = selectedEntityNeid.value;
        graphInstance.forEachNode((nodeId) => {
            const isSelected = nodeId === neid;
            const baseSize = graphInstance!.getNodeAttribute(nodeId, 'node_base_size') as number;
            graphInstance!.setNodeAttribute(nodeId, 'highlighted', isSelected);
            graphInstance!.setNodeAttribute(nodeId, 'zIndex', isSelected ? 4 : 1);
            graphInstance!.setNodeAttribute(nodeId, 'size', isSelected ? baseSize + 1.8 : baseSize);
        });
        sigmaInstance.refresh();
    }

    function computeShortestPath() {
        shortestPathText.value = '';
        if (!pathStart.value || !pathEnd.value) return;

        const queue: string[] = [pathStart.value];
        const visited = new Set<string>([pathStart.value]);
        const prev = new Map<string, string | null>([[pathStart.value, null]]);

        const adjacency = new Map<string, Set<string>>();
        for (const rel of visibleRelationships.value) {
            const sourceSet = adjacency.get(rel.sourceNeid) ?? new Set<string>();
            sourceSet.add(rel.targetNeid);
            adjacency.set(rel.sourceNeid, sourceSet);

            const targetSet = adjacency.get(rel.targetNeid) ?? new Set<string>();
            targetSet.add(rel.sourceNeid);
            adjacency.set(rel.targetNeid, targetSet);
        }

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current === pathEnd.value) break;
            for (const next of adjacency.get(current) ?? []) {
                if (visited.has(next)) continue;
                visited.add(next);
                prev.set(next, current);
                queue.push(next);
            }
        }

        if (!prev.has(pathEnd.value)) {
            shortestPathText.value = 'No path found with current filters.';
            return;
        }

        const path: string[] = [];
        let cursor: string | null = pathEnd.value;
        while (cursor) {
            path.unshift(cursor);
            cursor = prev.get(cursor) ?? null;
        }
        shortestPathText.value = `${path.length - 1} hops: ${path
            .map((neid) => entities.value.find((e) => e.neid === neid)?.name ?? neid)
            .join(' -> ')}`;
    }
</script>

<style scoped>
    .graph-workspace {
        position: relative;
    }

    .graph-card {
        overflow: hidden;
        border: 1px solid var(--app-divider);
    }

    .graph-card-fullscreen {
        border-radius: 0;
        border: 0;
    }

    .graph-frame {
        position: relative;
        width: 100%;
    }

    .sigma-container {
        width: 100%;
        height: 100%;
    }

    .graph-overlay {
        position: absolute;
        top: 12px;
        left: 12px;
        border: 1px solid;
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

    .legend-button {
        width: 100%;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        border-radius: 6px;
        padding: 2px 4px;
        cursor: pointer;
    }

    .legend-button:hover {
        background: var(--app-subtle-surface-2);
    }

    .node-tooltip {
        position: absolute;
        border: 1px solid;
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
        opacity: 0.88;
    }

    .entity-overlay {
        position: absolute;
        inset: 12px 12px 12px auto;
        width: min(420px, calc(100% - 24px));
        z-index: 30;
    }

    .fullscreen-exit-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 40;
    }
</style>
