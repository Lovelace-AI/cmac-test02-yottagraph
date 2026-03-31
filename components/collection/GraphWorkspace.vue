<template>
    <div class="graph-workspace">
        <!-- Toolbar -->
        <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2 graph-toolbar">
            <div class="d-flex align-center ga-2 flex-wrap">
                <v-chip size="small" variant="tonal" color="success">
                    {{ formatNumber(displayedDocumentEntityCount) }} document-derived
                </v-chip>
                <v-chip
                    v-if="displayedEnrichedEntityCount"
                    size="small"
                    variant="tonal"
                    color="info"
                >
                    {{ formatNumber(displayedEnrichedEntityCount) }} enriched
                </v-chip>
                <v-chip size="small" variant="outlined">
                    {{ formatNumber(visibleRelationships.length) }} links shown
                </v-chip>
                <span class="text-caption text-medium-emphasis">
                    {{ formatNumber(relationships.length) }} total links
                </span>
            </div>
            <div class="d-flex align-center ga-2 flex-wrap justify-end">
                <v-select
                    v-model="analysisMode"
                    :items="analysisModes"
                    item-title="label"
                    item-value="value"
                    label="View"
                    density="compact"
                    variant="outlined"
                    hide-details
                    style="max-width: 170px"
                />
                <v-menu location="bottom end" :close-on-content-click="false">
                    <template #activator="{ props: menuProps }">
                        <v-btn
                            v-bind="menuProps"
                            size="small"
                            variant="outlined"
                            prepend-icon="mdi-tune-variant"
                        >
                            Filters
                            <v-chip
                                v-if="activeFilterCount > 0"
                                size="x-small"
                                class="ml-2"
                                color="primary"
                                variant="tonal"
                            >
                                {{ activeFilterCount }}
                            </v-chip>
                        </v-btn>
                    </template>
                    <v-card class="pa-3" min-width="330">
                        <div class="text-caption text-medium-emphasis mb-2">Graph filters</div>
                        <v-select
                            v-model="relationshipTypeFilter"
                            :items="relationshipTypeOptions"
                            item-title="title"
                            item-value="value"
                            label="Relationship type"
                            density="compact"
                            variant="outlined"
                            clearable
                            hide-details
                            class="mb-2"
                        />
                        <v-text-field
                            v-model="searchQuery"
                            label="Find entity"
                            density="compact"
                            variant="outlined"
                            prepend-inner-icon="mdi-magnify"
                            clearable
                            hide-details
                            class="mb-2"
                        />
                        <v-checkbox
                            v-model="sourceBackedOnly"
                            hide-details
                            density="compact"
                            color="primary"
                            label="Source-backed only"
                            class="mb-1"
                        />
                        <v-checkbox
                            v-model="highConfidenceOnly"
                            hide-details
                            density="compact"
                            color="primary"
                            label="High-confidence only"
                            class="mb-1"
                        />
                        <v-checkbox
                            v-model="includeContextEndpoints"
                            hide-details
                            density="compact"
                            color="primary"
                            label="Include event/document endpoints"
                        />
                    </v-card>
                </v-menu>
                <v-btn
                    size="small"
                    variant="text"
                    prepend-icon="mdi-source-branch"
                    @click="showPathTools = !showPathTools"
                >
                    {{ showPathTools ? 'Hide path tools' : 'Path tools' }}
                </v-btn>
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

        <div v-if="showPathTools" class="d-flex align-center ga-2 flex-wrap mb-3">
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
                    background: graphCanvasBackground,
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
                <div class="legend-toggle" :style="{ background: currentThemeColors.graphOverlay }">
                    <v-btn
                        size="x-small"
                        variant="text"
                        prepend-icon="mdi-format-list-bulleted-square"
                        @click="showLegend = !showLegend"
                    >
                        {{ showLegend ? 'Hide legend' : 'Show legend' }}
                    </v-btn>
                </div>
                <div
                    v-if="showLegend"
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
                            {{ formatNumber(localFlavorCounts.get(flavor) ?? 0) }}
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
                        <span class="text-caption text-medium-emphasis">{{
                            formatNumber(count)
                        }}</span>
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
                        color: currentThemeColors.textPrimary,
                    }"
                >
                    <div class="d-flex align-center ga-1 mb-1">
                        <v-icon size="14" :color="tooltip.color">{{
                            flavorIcon(tooltip.flavor)
                        }}</v-icon>
                        <span class="text-caption font-weight-bold">{{ tooltip.name }}</span>
                    </div>
                    <div
                        class="text-caption"
                        :style="{ color: currentThemeColors.textSecondary, opacity: 0.95 }"
                    >
                        {{ tooltip.flavor.replace(/_/g, ' ') }}
                    </div>
                    <div
                        class="text-caption"
                        :style="{ color: currentThemeColors.textSecondary, opacity: 0.95 }"
                    >
                        {{ tooltip.degree }} connections
                    </div>
                    <div v-if="tooltip.events > 0" class="text-caption" style="color: #ffa726">
                        {{ tooltip.events }} events
                    </div>
                    <div
                        class="text-caption"
                        :style="{
                            color: currentThemeColors.textSecondary,
                            opacity: 0.9,
                            fontStyle: 'italic',
                        }"
                    >
                        {{
                            tooltip.kind === 'entity'
                                ? 'Click entity node for details and explanation'
                                : tooltip.kind === 'document'
                                  ? 'Document context node'
                                  : 'Event context node'
                        }}
                    </div>
                </div>

                <div v-if="entities.length === 0" class="graph-empty">
                    <v-icon size="48" class="mb-3 text-medium-emphasis">mdi-graph-outline</v-icon>
                    <div class="text-body-2 text-medium-emphasis">
                        Load the graph to explore entities and relationships.
                    </div>
                </div>
                <div v-else-if="visibleGraphEntityCount === 0" class="graph-empty">
                    <v-icon size="44" class="mb-3 text-medium-emphasis"
                        >mdi-filter-remove-outline</v-icon
                    >
                    <div class="text-body-2 text-medium-emphasis text-center px-6">
                        No graph nodes match the current filters. Clear search or relax filters to
                        bring the graph back.
                    </div>
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
    import type { EntityRecord, RelationshipRecord } from '~/utils/collectionTypes';

    const props = defineProps<{
        entitiesOverride?: EntityRecord[];
        relationshipsOverride?: RelationshipRecord[];
        showEnrichedEntities?: boolean;
        showEnrichedRelationships?: boolean;
        initialAnalysisMode?:
            | 'centrality'
            | 'relationship'
            | 'timeline'
            | 'source'
            | 'simplified'
            | 'enrichment_cluster'
            | 'edge_cluster';
    }>();

    const ENTITY_COLORS_DARK: Record<string, string> = {
        organization: '#42A5F5',
        person: '#FFA726',
        financial_instrument: '#66BB6A',
        location: '#AB47BC',
        fund_account: '#66BB6A',
        legal_agreement: '#EF5350',
    };
    const ENTITY_COLORS_LIGHT: Record<string, string> = {
        organization: '#1D4ED8',
        person: '#B45309',
        financial_instrument: '#047857',
        location: '#7E22CE',
        fund_account: '#047857',
        legal_agreement: '#B91C1C',
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
    const REL_COLORS_LIGHT: Record<string, string> = {
        default: '#374151',
        structural: '#1F2937',
        context: '#4B5563',
    };
    const BOND_CENTER_NEID = '08242646876499346416';

    const {
        documentEntities: workspaceEntities,
        documents,
        documentRelationships: workspaceRelationships,
        documentEvents: events,
        selectedEntityNeid,
        selectEntity,
        resolveEntityName,
        runAgentAction,
    } = useCollectionWorkspace();
    const entities = computed(() => props.entitiesOverride ?? workspaceEntities.value);
    const relationships = computed(
        () => props.relationshipsOverride ?? workspaceRelationships.value
    );
    const displayedDocumentEntityCount = computed(
        () => visibleEntities.value.filter((entity) => entity.origin === 'document').length
    );
    const displayedEnrichedEntityCount = computed(
        () => visibleEntities.value.filter((entity) => entity.origin === 'enriched').length
    );
    const entityByNeid = computed(
        () => new Map(entities.value.map((entity) => [entity.neid, entity]))
    );
    const localFlavorCounts = computed(() => {
        const counts = new Map<string, number>();
        for (const entity of entities.value) {
            counts.set(entity.flavor, (counts.get(entity.flavor) ?? 0) + 1);
        }
        return counts;
    });

    const { colorMode, currentThemeColors } = useAppColorMode();

    const graphContainer = ref<HTMLElement | null>(null);
    const graphFrame = ref<HTMLElement | null>(null);
    const viewportHeight = ref(900);
    const searchQuery = ref('');
    const hiddenFlavors = ref<Set<string>>(new Set(['location']));
    const analysisMode = ref<
        | 'centrality'
        | 'relationship'
        | 'timeline'
        | 'source'
        | 'simplified'
        | 'enrichment_cluster'
        | 'edge_cluster'
    >(props.initialAnalysisMode ?? 'centrality');
    const relationshipTypeFilter = ref<string | null>(null);
    const sourceBackedOnly = ref(false);
    const highConfidenceOnly = ref(false);
    const includeContextEndpoints = ref(true);
    const pathStart = ref<string | null>(null);
    const pathEnd = ref<string | null>(null);
    const shortestPathText = ref('');
    const showPathTools = ref(false);
    const showLegend = ref(true);
    const isFullscreen = ref(false);
    const graphHeight = computed(() => (isFullscreen.value ? viewportHeight.value - 84 : 640));

    let sigmaInstance: Sigma | null = null;
    let graphInstance: Graph | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let suppressResize = false;

    interface TooltipState {
        name: string;
        flavor: string;
        color: string;
        degree: number;
        events: number;
        kind: 'entity' | 'event' | 'document';
        x: number;
        y: number;
    }
    const tooltip = ref<TooltipState | null>(null);

    const flavorColorEntries = computed(() => Object.entries(ENTITY_COLORS.value));
    const ENTITY_COLORS = computed<Record<string, string>>(() =>
        colorMode.value === 'dark' ? ENTITY_COLORS_DARK : ENTITY_COLORS_LIGHT
    );
    const graphCanvasBackground = computed(() =>
        colorMode.value === 'dark'
            ? 'radial-gradient(120% 100% at 50% 10%, #1C2540 0%, #131A2E 52%, #0C1221 100%)'
            : 'radial-gradient(130% 110% at 50% 0%, #EAF0F8 0%, #E2EAF5 50%, #D9E3F2 100%)'
    );
    const labelPillBackground = computed(() =>
        colorMode.value === 'dark' ? 'rgba(7, 12, 24, 0.9)' : 'rgba(17, 24, 39, 0.9)'
    );
    const labelTextColor = '#F8FAFC';
    const analysisModes = [
        { label: 'Centrality', value: 'centrality' },
        { label: 'Relationship Type', value: 'relationship' },
        { label: 'Timeline Linked', value: 'timeline' },
        { label: 'Source Document', value: 'source' },
        { label: 'Clustered / Simplified', value: 'simplified' },
        { label: 'Edge Cluster (Community)', value: 'edge_cluster' },
        { label: 'Enrichment Cluster', value: 'enrichment_cluster' },
    ];

    const filteredEntities = computed(() => {
        const q = searchQuery.value.trim().toLowerCase();
        return entities.value.filter((e) => {
            if (hiddenFlavors.value.has(e.flavor)) return false;
            if (props.showEnrichedEntities === false && e.origin === 'enriched') return false;
            if (!q) return true;
            return e.name.toLowerCase().includes(q);
        });
    });

    const relationshipTypeOptions = computed<Array<{ value: string; title: string }>>(() => {
        const counts = new Map<string, number>();
        for (const relationship of relationships.value) {
            counts.set(relationship.type, (counts.get(relationship.type) ?? 0) + 1);
        }
        if (!counts.has('appears_in')) counts.set('appears_in', 0);
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([type, count]) => ({
                value: type,
                title: `${type.replace(/schema::relationship::/, '').replace(/_/g, ' ')} (${formatNumber(count)})`,
            }));
    });

    const visibleRelationships = computed(() => {
        const enrichedNeids = new Set(
            entities.value
                .filter((entity) => entity.origin === 'enriched')
                .map((entity) => entity.neid)
        );
        return relationships.value.filter((rel) => {
            if (relationshipTypeFilter.value && rel.type !== relationshipTypeFilter.value)
                return false;
            if (props.showEnrichedRelationships === false && rel.origin === 'enriched')
                return false;
            if (
                props.showEnrichedEntities === false &&
                (enrichedNeids.has(rel.sourceNeid) || enrichedNeids.has(rel.targetNeid))
            ) {
                return false;
            }
            const hasEvidence =
                Boolean(rel.sourceDocumentNeid) ||
                (Array.isArray(rel.citations) && rel.citations.length > 0);
            if (sourceBackedOnly.value && !hasEvidence) return false;
            if (highConfidenceOnly.value && !hasEvidence) return false;
            return true;
        });
    });
    const entityNeidSet = computed(() => new Set(entities.value.map((entity) => entity.neid)));
    const connectedEntityNeids = computed(() => {
        const connected = new Set<string>();
        for (const rel of visibleRelationships.value) {
            if (entityNeidSet.value.has(rel.sourceNeid)) connected.add(rel.sourceNeid);
            if (entityNeidSet.value.has(rel.targetNeid)) connected.add(rel.targetNeid);
        }
        return connected;
    });
    const visibleEntities = computed(() =>
        filteredEntities.value.filter((entity) => connectedEntityNeids.value.has(entity.neid))
    );
    const eventNeidSet = computed(() => new Set(events.value.map((eventItem) => eventItem.neid)));
    const documentNeidSet = computed(() => new Set(documents.value.map((doc) => doc.neid)));

    const relationshipBreakdown = computed(() => {
        let entityEntity = 0;
        let entityEvent = 0;
        let entityDocument = 0;
        for (const rel of visibleRelationships.value) {
            const sourceIsEntity = entityNeidSet.value.has(rel.sourceNeid);
            const targetIsEntity = entityNeidSet.value.has(rel.targetNeid);
            const sourceIsEvent = eventNeidSet.value.has(rel.sourceNeid);
            const targetIsEvent = eventNeidSet.value.has(rel.targetNeid);
            const sourceIsDocument = documentNeidSet.value.has(rel.sourceNeid);
            const targetIsDocument = documentNeidSet.value.has(rel.targetNeid);

            if (sourceIsEntity && targetIsEntity) {
                entityEntity += 1;
            } else if ((sourceIsEntity && targetIsEvent) || (targetIsEntity && sourceIsEvent)) {
                entityEvent += 1;
            } else if (
                (sourceIsEntity && targetIsDocument) ||
                (targetIsEntity && sourceIsDocument)
            ) {
                entityDocument += 1;
            }
        }
        return { entityEntity, entityEvent, entityDocument };
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
                title: `${displayEntityName(entity.neid, entity.name)} (${entity.flavor.replace(/_/g, ' ')})`,
            }))
            .sort((a, b) => a.title.localeCompare(b.title))
    );
    const hasBondCenterEntity = computed(() =>
        entities.value.some((entity) => entity.neid === BOND_CENTER_NEID)
    );
    const activeFilterCount = computed(() => {
        let count = 0;
        if (relationshipTypeFilter.value) count += 1;
        if (sourceBackedOnly.value) count += 1;
        if (highConfidenceOnly.value) count += 1;
        if (!includeContextEndpoints.value) count += 1;
        if (searchQuery.value.trim()) count += 1;
        return count;
    });
    const visibleGraphEntityCount = computed(() => {
        let ents = visibleEntities.value;
        if (analysisMode.value === 'timeline') {
            ents = ents.filter((entity) => timelineLinkedNeids.value.has(entity.neid));
        }
        if (analysisMode.value === 'simplified') {
            ents = ents.filter((entity) => (degreeByNeid.value.get(entity.neid) ?? 0) >= 2);
        }
        return ents.length;
    });

    function flavorIcon(flavor: string): string {
        const icons: Record<string, string> = {
            organization: 'mdi-domain',
            person: 'mdi-account',
            financial_instrument: 'mdi-bank',
            location: 'mdi-map-marker',
            fund_account: 'mdi-wallet',
            legal_agreement: 'mdi-file-document-outline',
            event: 'mdi-calendar-star',
            document: 'mdi-file-document',
        };
        return icons[flavor] ?? 'mdi-circle-small';
    }

    function getRelTypeColor(relType: string): string {
        if (colorMode.value === 'light') {
            if (relType.includes('participant') || relType.includes('appears_in')) {
                return REL_COLORS_LIGHT.context;
            }
            if (
                relType.includes('predecessor') ||
                relType.includes('successor') ||
                relType.includes('works_at')
            ) {
                return REL_COLORS_LIGHT.structural;
            }
            return REL_COLORS_LIGHT.default;
        }
        return REL_COLORS[relType] ?? '#9E9E9E';
    }

    function edgeAlpha(origin: string, hasEvidence: boolean): number {
        if (origin === 'enriched') return colorMode.value === 'dark' ? 0.44 : 0.56;
        if (hasEvidence) return colorMode.value === 'dark' ? 0.66 : 0.6;
        return colorMode.value === 'dark' ? 0.54 : 0.52;
    }

    function parseHexColor(color: string): { r: number; g: number; b: number } | null {
        const normalized = color.trim();
        const match = normalized.match(/^#([0-9a-fA-F]{6})$/);
        if (!match) return null;
        return {
            r: parseInt(match[1].slice(0, 2), 16),
            g: parseInt(match[1].slice(2, 4), 16),
            b: parseInt(match[1].slice(4, 6), 16),
        };
    }

    function rgbToHex(r: number, g: number, b: number): string {
        const toHex = (value: number) =>
            Math.max(0, Math.min(255, Math.round(value)))
                .toString(16)
                .padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function mixHex(base: string, mixWith: string, ratio: number): string {
        const a = parseHexColor(base);
        const b = parseHexColor(mixWith);
        if (!a || !b) return base;
        const t = Math.max(0, Math.min(1, ratio));
        return rgbToHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
    }

    function edgeBaseColor(neid: string): string {
        const entity = entityByNeid.value.get(neid);
        if (entity) return ENTITY_COLORS.value[entity.flavor] ?? '#475569';
        if (eventNeidSet.value.has(neid)) return '#7C3AED';
        if (documentNeidSet.value.has(neid))
            return colorMode.value === 'dark' ? '#94A3B8' : '#334155';
        return '#475569';
    }

    function edgeColorFromNode(sourceNeid: string, targetNeid: string): string {
        const base = edgeBaseColor(sourceNeid);
        const other = edgeBaseColor(targetNeid);
        const blended = mixHex(base, other, 0.28);
        return colorMode.value === 'dark'
            ? mixHex(blended, '#e2e8f0', 0.06)
            : mixHex(blended, '#0f172a', 0.08);
    }

    function formatNumber(value: number): string {
        return new Intl.NumberFormat('en-US').format(value);
    }

    function isNeidLike(value: string): boolean {
        return /^\d{16,24}$/.test(String(value ?? '').trim());
    }

    function displayEntityName(neid: string, fallbackName?: string): string {
        const resolved = resolveEntityName(neid);
        if (resolved && !isNeidLike(resolved)) return resolved;
        const fallback = String(fallbackName ?? '').trim();
        if (fallback && !isNeidLike(fallback)) return fallback;
        return neid;
    }

    function positionTooltip(pointerX?: number, pointerY?: number): { x: number; y: number } {
        const rect = graphContainer.value?.getBoundingClientRect();
        const frameWidth = graphFrame.value?.clientWidth ?? 0;
        const frameHeight = graphFrame.value?.clientHeight ?? 0;
        const localX = pointerX !== undefined && rect ? pointerX - rect.left : 0;
        const localY = pointerY !== undefined && rect ? pointerY - rect.top : 0;
        const estimatedWidth = 220;
        const estimatedHeight = 104;
        const desiredX = localX + 14;
        const desiredY = localY - estimatedHeight - 10;
        const x = Math.max(8, Math.min(desiredX, Math.max(8, frameWidth - estimatedWidth - 8)));
        const y = Math.max(8, Math.min(desiredY, Math.max(8, frameHeight - estimatedHeight - 8)));
        return { x, y };
    }

    function sourceModeColor(sourceCount: number): string {
        if (colorMode.value === 'dark') {
            return sourceCount >= 3
                ? '#60A5FA'
                : sourceCount === 2
                  ? '#4ADE80'
                  : sourceCount === 1
                    ? '#C084FC'
                    : '#9CA3AF';
        }
        return sourceCount >= 3
            ? '#1D4ED8'
            : sourceCount === 2
              ? '#15803D'
              : sourceCount === 1
                ? '#7E22CE'
                : '#64748B';
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

        const rels = visibleRelationships.value;
        let ents = visibleEntities.value;
        if (analysisMode.value === 'timeline') {
            ents = ents.filter((entity) => timelineLinkedNeids.value.has(entity.neid));
        }
        if (analysisMode.value === 'simplified') {
            ents = ents.filter((entity) => (degreeByNeid.value.get(entity.neid) ?? 0) >= 2);
        }
        const entityNodeSet = new Set(ents.map((entity) => entity.neid));

        if (sigmaInstance) {
            sigmaInstance.kill();
            sigmaInstance = null;
        }
        graphInstance = null;
        if (ents.length === 0 || rels.length === 0) return;

        const g = new Graph({ type: 'mixed', multi: false });
        graphInstance = g;

        // Add nodes
        for (const entity of ents) {
            const evtCount = eventCountByNeid.value.get(entity.neid) ?? 0;
            const propCount = Object.keys(entity.properties ?? {}).length;
            const degree = degreeByNeid.value.get(entity.neid) ?? 0;
            let size = Math.max(
                5,
                Math.min(
                    14,
                    analysisMode.value === 'centrality'
                        ? 5 + degree * 0.9 + evtCount * 0.6
                        : 5 + propCount * 0.45 + entity.sourceDocuments.length * 1.2
                )
            );
            if (entity.origin === 'enriched') size = Math.max(4.6, size * 0.82);
            const baseColor = ENTITY_COLORS.value[entity.flavor] ?? '#9E9E9E';
            let color =
                entity.origin === 'enriched'
                    ? hexAlpha(baseColor, colorMode.value === 'dark' ? 0.32 : 0.62)
                    : baseColor;

            if (analysisMode.value === 'source') {
                const sourceCount = entity.sourceDocuments.length;
                color = sourceModeColor(sourceCount);
            }
            if (analysisMode.value === 'timeline' && evtCount === 0) {
                color = hexAlpha(color, colorMode.value === 'dark' ? 0.26 : 0.42);
            }

            g.addNode(entity.neid, {
                label: entity.name.slice(0, 40),
                x: Math.random() * 100,
                y: Math.random() * 100,
                size,
                node_base_size: size,
                color,
                labelColor: readableLabelColor(colorMode.value),
                entity_type: entity.flavor,
                eventCount: evtCount,
                origin: entity.origin,
                node_kind: 'entity',
            });
        }

        // Add edges
        const eventByNeid = new Map(events.value.map((eventItem) => [eventItem.neid, eventItem]));
        const docByNeid = new Map(documents.value.map((doc) => [doc.neid, doc]));
        for (const rel of rels) {
            const sourceInEntity = entityNodeSet.has(rel.sourceNeid);
            const targetInEntity = entityNodeSet.has(rel.targetNeid);
            const sourceInEvent = eventByNeid.has(rel.sourceNeid);
            const targetInEvent = eventByNeid.has(rel.targetNeid);
            const sourceInDoc = docByNeid.has(rel.sourceNeid);
            const targetInDoc = docByNeid.has(rel.targetNeid);

            const isEntityEntity = sourceInEntity && targetInEntity;
            const isEntityEvent =
                (sourceInEntity && targetInEvent) || (targetInEntity && sourceInEvent);
            const isEntityDocument =
                (sourceInEntity && targetInDoc) || (targetInEntity && sourceInDoc);

            if (!isEntityEntity && !includeContextEndpoints.value) continue;
            if (!isEntityEntity && !isEntityEvent && !isEntityDocument) continue;

            if (includeContextEndpoints.value && (isEntityEvent || isEntityDocument)) {
                if (sourceInEvent && !g.hasNode(rel.sourceNeid)) {
                    const evt = eventByNeid.get(rel.sourceNeid);
                    g.addNode(rel.sourceNeid, {
                        label: evt?.name?.slice(0, 40) ?? 'Event',
                        x: Math.random() * 100,
                        y: Math.random() * 100,
                        size: 4.2,
                        node_base_size: 4.2,
                        color: '#AB47BC',
                        labelColor: readableLabelColor(colorMode.value),
                        entity_type: 'event',
                        eventCount: 0,
                        origin: 'document',
                        node_kind: 'event',
                    });
                }
                if (targetInEvent && !g.hasNode(rel.targetNeid)) {
                    const evt = eventByNeid.get(rel.targetNeid);
                    g.addNode(rel.targetNeid, {
                        label: evt?.name?.slice(0, 40) ?? 'Event',
                        x: Math.random() * 100,
                        y: Math.random() * 100,
                        size: 4.2,
                        node_base_size: 4.2,
                        color: '#AB47BC',
                        labelColor: readableLabelColor(colorMode.value),
                        entity_type: 'event',
                        eventCount: 0,
                        origin: 'document',
                        node_kind: 'event',
                    });
                }
                if (sourceInDoc && !g.hasNode(rel.sourceNeid)) {
                    const doc = docByNeid.get(rel.sourceNeid);
                    g.addNode(rel.sourceNeid, {
                        label: doc?.title?.slice(0, 40) ?? 'Document',
                        x: Math.random() * 100,
                        y: Math.random() * 100,
                        size: 4.8,
                        node_base_size: 4.8,
                        color: colorMode.value === 'dark' ? '#94A3B8' : '#475569',
                        labelColor: readableLabelColor(colorMode.value),
                        entity_type: 'document',
                        eventCount: 0,
                        origin: 'document',
                        node_kind: 'document',
                    });
                }
                if (targetInDoc && !g.hasNode(rel.targetNeid)) {
                    const doc = docByNeid.get(rel.targetNeid);
                    g.addNode(rel.targetNeid, {
                        label: doc?.title?.slice(0, 40) ?? 'Document',
                        x: Math.random() * 100,
                        y: Math.random() * 100,
                        size: 4.8,
                        node_base_size: 4.8,
                        color: colorMode.value === 'dark' ? '#94A3B8' : '#475569',
                        labelColor: readableLabelColor(colorMode.value),
                        entity_type: 'document',
                        eventCount: 0,
                        origin: 'document',
                        node_kind: 'document',
                    });
                }
            }

            if (!g.hasNode(rel.sourceNeid) || !g.hasNode(rel.targetNeid)) continue;
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
                        edgeColorFromNode(rel.sourceNeid, rel.targetNeid),
                        edgeAlpha(rel.origin, hasEvidence)
                    ),
                    size: hasEvidence ? 2.1 : 1.45,
                    type: 'arrow',
                });
            } catch {
                // duplicate edge — ignore
            }
        }

        // Community detection in cluster mode
        if (
            (analysisMode.value === 'simplified' ||
                analysisMode.value === 'enrichment_cluster' ||
                analysisMode.value === 'edge_cluster') &&
            g.order > 2
        ) {
            try {
                const communities = louvain(g);
                const communityColors =
                    colorMode.value === 'dark'
                        ? [
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
                          ]
                        : [
                              '#1D4ED8',
                              '#0F766E',
                              '#B91C1C',
                              '#7C3AED',
                              '#C2410C',
                              '#0E7490',
                              '#4D7C0F',
                              '#9D174D',
                              '#1E3A8A',
                              '#7F1D1D',
                              '#14532D',
                              '#312E81',
                          ];
                g.forEachNode((node) => {
                    const c = communities[node] ?? 0;
                    const clusterColor = communityColors[c % communityColors.length];
                    g.setNodeAttribute(
                        node,
                        'color',
                        hexAlpha(
                            clusterColor,
                            analysisMode.value === 'enrichment_cluster'
                                ? 0.9
                                : analysisMode.value === 'edge_cluster'
                                  ? 0.94
                                  : 0.82
                        )
                    );
                });
            } catch {
                // Louvain may fail on disconnected graphs
            }
        }

        // ForceAtlas2 layout can fail on edge-case graphs; keep random layout as fallback.
        const nodeCount = g.order;
        try {
            forceAtlas2.assign(g, {
                iterations: Math.min(
                    300,
                    Math.max(100, Math.round(50000 / Math.max(nodeCount, 1)))
                ),
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
        } catch {
            // noop: keep initial positions if layout engine errors
        }
        stabilizeNodePositions(g);
        if (analysisMode.value === 'edge_cluster') {
            applyEdgeClusterLayout(g);
        }
        if (analysisMode.value === 'enrichment_cluster') {
            applyEnrichmentClusterLayout(g);
        }

        // Create Sigma instance
        sigmaInstance = new Sigma(g, graphContainer.value, {
            renderEdgeLabels: false,
            allowInvalidContainer: true,
            labelFont: '"Inter", "Roboto", sans-serif',
            labelSize: 12,
            labelWeight: '600',
            labelColor: { attribute: 'labelColor', color: currentThemeColors.value.textPrimary },
            labelRenderedSizeThreshold: 7,
            labelDensity: 0.08,
            labelGridCellSize: 100,
            defaultDrawNodeLabel: drawLabelWithPill,
            defaultDrawNodeHover: drawHoverWithPill,
            defaultEdgeType: 'arrow',
            defaultEdgeColor: hexAlpha(
                colorMode.value === 'dark' ? '#9CA3AF' : '#334155',
                colorMode.value === 'dark' ? 0.68 : 0.78
            ),
            zIndex: true,
        } as any);

        const canvas = graphContainer.value.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
            });
            canvas.addEventListener('webglcontextrestored', () => {
                nextTick(() => buildGraph());
            });
        }

        // Hover
        sigmaInstance.on('enterNode', ({ node, event }) => {
            const attrs = g.getNodeAttributes(node);
            const pointerX = (event as any)?.x;
            const pointerY = (event as any)?.y;
            const positioned = positionTooltip(pointerX, pointerY);
            tooltip.value = {
                name: attrs.label ?? node,
                flavor: attrs.entity_type ?? '',
                color: ENTITY_COLORS.value[attrs.entity_type] ?? attrs.color ?? '#9E9E9E',
                degree: g.degree(node),
                events: attrs.eventCount ?? 0,
                kind: (attrs.node_kind ?? 'entity') as 'entity' | 'event' | 'document',
                x: positioned.x,
                y: positioned.y,
            };
        });

        sigmaInstance.on('leaveNode', () => {
            tooltip.value = null;
        });

        sigmaInstance.on('moveBody', ({ event }) => {
            if (tooltip.value) {
                const pointerX = (event as any)?.x;
                const pointerY = (event as any)?.y;
                const positioned = positionTooltip(pointerX, pointerY);
                tooltip.value.x = positioned.x;
                tooltip.value.y = positioned.y;
            }
        });

        // Click — keep selection handling lightweight to avoid canvas corruption
        sigmaInstance.on('clickNode', ({ node }) => {
            const kind = g.getNodeAttribute(node, 'node_kind');
            tooltip.value = null;
            if (kind !== 'entity') return;
            selectEntity(node);
            void runAgentAction('explain_entity', { entityNeid: node });
        });

        sigmaInstance.on('clickStage', () => {
            tooltip.value = null;
        });

        applySelectedHighlight();
        queueSigmaReflow();
    }

    function centerNodeNeid(): string | null {
        return selectedEntityNeid.value && graphInstance?.hasNode(selectedEntityNeid.value)
            ? selectedEntityNeid.value
            : null;
    }

    function focusCameraOnCenterNode() {
        if (!sigmaInstance || !graphInstance) return;
        try {
            const nodeId = centerNodeNeid();
            if (!nodeId) return;
            const x = graphInstance.getNodeAttribute(nodeId, 'x') as number;
            const y = graphInstance.getNodeAttribute(nodeId, 'y') as number;
            sigmaInstance.getCamera().animate({ x, y, ratio: 0.6 }, { duration: 280 });
        } catch {
            // guard against sigma state corruption
        }
    }

    function hexAlpha(hex: string, alpha: number): string {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function readableLabelColor(_mode: 'light' | 'dark'): string {
        return labelTextColor;
    }

    function drawRoundedRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function drawLabelWithPill(ctx: CanvasRenderingContext2D, data: any, settings: any) {
        const label = typeof data?.label === 'string' ? data.label : '';
        if (!label) return;
        const fontSize = Math.max(11, Number(settings?.labelSize ?? 12));
        const fontFamily = String(settings?.labelFont ?? 'sans-serif');
        const fontWeight = String(settings?.labelWeight ?? '600');
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        const textWidth = ctx.measureText(label).width;
        const paddingX = 6;
        const paddingY = 3;
        const pillX = Number(data.x) + Number(data.size ?? 0) + 5;
        const pillY = Number(data.y) - fontSize / 2 - paddingY;
        const pillWidth = textWidth + paddingX * 2;
        const pillHeight = fontSize + paddingY * 2;
        drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 5);
        ctx.fillStyle = labelPillBackground.value;
        ctx.fill();
        ctx.fillStyle = labelTextColor;
        ctx.fillText(label, pillX + paddingX, Number(data.y) + fontSize / 3 - 1);
    }

    function drawHoverWithPill(ctx: CanvasRenderingContext2D, data: any, settings: any) {
        const label = typeof data?.label === 'string' ? data.label : '';
        if (!label) return;
        const fontSize = Math.max(13, Number(settings?.labelSize ?? 12) + 1);
        const fontFamily = String(settings?.labelFont ?? 'sans-serif');
        ctx.font = `700 ${fontSize}px ${fontFamily}`;
        const textWidth = ctx.measureText(label).width;
        const paddingX = 7;
        const paddingY = 4;
        const pillX = Number(data.x) + Number(data.size ?? 0) + 6;
        const pillY = Number(data.y) - fontSize / 2 - paddingY;
        const pillWidth = textWidth + paddingX * 2;
        const pillHeight = fontSize + paddingY * 2;
        drawRoundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 6);
        ctx.fillStyle = labelPillBackground.value;
        ctx.fill();
        ctx.strokeStyle = String(data.color ?? '#94A3B8');
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.fillStyle = labelTextColor;
        ctx.fillText(label, pillX + paddingX, Number(data.y) + fontSize / 3 - 1);
    }

    function stabilizeNodePositions(graph: Graph): void {
        const nodes = graph.nodes();
        if (!nodes.length) return;

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (const node of nodes) {
            let x = Number(graph.getNodeAttribute(node, 'x'));
            let y = Number(graph.getNodeAttribute(node, 'y'));
            if (!Number.isFinite(x) || !Number.isFinite(y)) {
                x = Math.random() * 2 - 1;
                y = Math.random() * 2 - 1;
                graph.setNodeAttribute(node, 'x', x);
                graph.setNodeAttribute(node, 'y', y);
            }
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        const spanX = maxX - minX;
        const spanY = maxY - minY;
        const maxSpan = Math.max(spanX, spanY);

        if (!Number.isFinite(maxSpan) || maxSpan < 1e-6) {
            const radius = 80;
            const count = nodes.length;
            nodes.forEach((node, index) => {
                const angle = (index / Math.max(count, 1)) * Math.PI * 2;
                graph.setNodeAttribute(node, 'x', Math.cos(angle) * radius);
                graph.setNodeAttribute(node, 'y', Math.sin(angle) * radius);
            });
            return;
        }

        const centerX = minX + spanX / 2;
        const centerY = minY + spanY / 2;
        const targetSpan = 220;
        for (const node of nodes) {
            const x = Number(graph.getNodeAttribute(node, 'x'));
            const y = Number(graph.getNodeAttribute(node, 'y'));
            graph.setNodeAttribute(node, 'x', ((x - centerX) / maxSpan) * targetSpan);
            graph.setNodeAttribute(node, 'y', ((y - centerY) / maxSpan) * targetSpan);
        }
    }

    function applyEdgeClusterLayout(graph: Graph): void {
        if (graph.order < 3) return;
        try {
            const communities = louvain(graph);
            const communityMembers = new Map<string, string[]>();
            const communityByNode = new Map<string, string>();
            graph.forEachNode((nodeId) => {
                const communityId = String(communities[nodeId] ?? '0');
                communityByNode.set(nodeId, communityId);
                const bucket = communityMembers.get(communityId) ?? [];
                bucket.push(nodeId);
                communityMembers.set(communityId, bucket);
            });

            const communityIds = Array.from(communityMembers.keys());
            if (communityIds.length <= 1) return;

            const interEdgeWeights = new Map<string, number>();
            graph.forEachEdge((_edge, _attrs, source, target) => {
                const sourceCommunity = communityByNode.get(source);
                const targetCommunity = communityByNode.get(target);
                if (!sourceCommunity || !targetCommunity || sourceCommunity === targetCommunity)
                    return;
                const [a, b] =
                    sourceCommunity < targetCommunity
                        ? [sourceCommunity, targetCommunity]
                        : [targetCommunity, sourceCommunity];
                const key = `${a}|${b}`;
                interEdgeWeights.set(key, (interEdgeWeights.get(key) ?? 0) + 1);
            });

            const centers = new Map<string, { x: number; y: number; vx: number; vy: number }>();
            const initialRadius = Math.max(180, communityIds.length * 34);
            communityIds.forEach((communityId, index) => {
                const angle = (index / communityIds.length) * Math.PI * 2;
                centers.set(communityId, {
                    x: Math.cos(angle) * initialRadius,
                    y: Math.sin(angle) * initialRadius,
                    vx: 0,
                    vy: 0,
                });
            });

            const repulsion = 5400;
            const springStrength = 0.014;
            const damping = 0.82;
            for (let iter = 0; iter < 180; iter += 1) {
                for (let i = 0; i < communityIds.length; i += 1) {
                    for (let j = i + 1; j < communityIds.length; j += 1) {
                        const ci = centers.get(communityIds[i]);
                        const cj = centers.get(communityIds[j]);
                        if (!ci || !cj) continue;
                        const dx = cj.x - ci.x;
                        const dy = cj.y - ci.y;
                        const distSq = Math.max(dx * dx + dy * dy, 1);
                        const dist = Math.sqrt(distSq);
                        const force = repulsion / distSq;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        ci.vx -= fx;
                        ci.vy -= fy;
                        cj.vx += fx;
                        cj.vy += fy;
                    }
                }

                interEdgeWeights.forEach((weight, key) => {
                    const [a, b] = key.split('|');
                    const ca = centers.get(a);
                    const cb = centers.get(b);
                    if (!ca || !cb) return;
                    const dx = cb.x - ca.x;
                    const dy = cb.y - ca.y;
                    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
                    const targetDist = 210 - Math.min(130, Math.log1p(weight) * 32);
                    const delta = dist - targetDist;
                    const force = delta * springStrength * Math.max(1, Math.log1p(weight));
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    ca.vx += fx;
                    ca.vy += fy;
                    cb.vx -= fx;
                    cb.vy -= fy;
                });

                centers.forEach((center) => {
                    center.vx *= damping;
                    center.vy *= damping;
                    center.x += center.vx;
                    center.y += center.vy;
                });
            }

            communityIds.forEach((communityId) => {
                const center = centers.get(communityId);
                const members = communityMembers.get(communityId);
                if (!center || !members?.length) return;
                const ordered = [...members].sort(
                    (a, b) =>
                        Number(graph.getNodeAttribute(b, 'node_base_size') ?? 0) -
                        Number(graph.getNodeAttribute(a, 'node_base_size') ?? 0)
                );
                const localRadius = Math.max(28, Math.min(140, Math.sqrt(ordered.length) * 18));
                ordered.forEach((nodeId, index) => {
                    const angle = (index / Math.max(ordered.length, 1)) * Math.PI * 2;
                    const radial =
                        localRadius * (0.35 + 0.65 * Math.sqrt((index + 1) / ordered.length));
                    const isEnriched =
                        String(graph.getNodeAttribute(nodeId, 'origin')) === 'enriched';
                    const edgeOffset = isEnriched ? radial * 1.22 : radial;
                    graph.setNodeAttribute(nodeId, 'x', center.x + Math.cos(angle) * edgeOffset);
                    graph.setNodeAttribute(nodeId, 'y', center.y + Math.sin(angle) * edgeOffset);
                });
            });
            stabilizeNodePositions(graph);
        } catch {
            // fallback: keep previous layout on failure
        }
    }

    function applyEnrichmentClusterLayout(graph: Graph): void {
        if (graph.order < 2) return;
        try {
            const communities = louvain(graph);
            const nodesByCommunity = new Map<string, string[]>();
            graph.forEachNode((nodeId) => {
                const key = String(communities[nodeId] ?? '0');
                const bucket = nodesByCommunity.get(key) ?? [];
                bucket.push(nodeId);
                nodesByCommunity.set(key, bucket);
            });

            const orderedCommunities = Array.from(nodesByCommunity.entries()).sort(
                (a, b) => b[1].length - a[1].length
            );
            const communityCount = orderedCommunities.length;
            const ringRadius = Math.min(360, Math.max(140, communityCount * 26));

            orderedCommunities.forEach(([, members], communityIndex) => {
                const angle =
                    communityCount <= 1 ? 0 : (communityIndex / communityCount) * Math.PI * 2;
                const centerX = Math.cos(angle) * ringRadius;
                const centerY = Math.sin(angle) * ringRadius;
                const localStep = (Math.PI * 2) / Math.max(1, members.length);
                const localRadius = Math.max(36, Math.min(140, Math.sqrt(members.length) * 20));

                members.forEach((nodeId, memberIndex) => {
                    const nodeKind = String(
                        graph.getNodeAttribute(nodeId, 'node_kind') ?? 'entity'
                    );
                    const nodeOrigin = String(
                        graph.getNodeAttribute(nodeId, 'origin') ?? 'document'
                    );
                    const baseAngle = memberIndex * localStep;
                    const originOffset =
                        nodeOrigin === 'enriched'
                            ? localRadius
                            : nodeKind === 'entity'
                              ? localRadius * 0.55
                              : localRadius * 0.35;
                    const jitter = memberIndex % 2 === 0 ? 6 : -6;
                    graph.setNodeAttribute(
                        nodeId,
                        'x',
                        centerX + Math.cos(baseAngle) * originOffset + jitter
                    );
                    graph.setNodeAttribute(
                        nodeId,
                        'y',
                        centerY + Math.sin(baseAngle) * originOffset - jitter
                    );
                    if (nodeOrigin === 'enriched') {
                        const baseSize = Number(
                            graph.getNodeAttribute(nodeId, 'node_base_size') ?? 5
                        );
                        graph.setNodeAttribute(nodeId, 'size', Math.max(4.5, baseSize * 0.92));
                        graph.setNodeAttribute(
                            nodeId,
                            'node_base_size',
                            Math.max(4.5, baseSize * 0.92)
                        );
                    }
                });
            });
        } catch {
            // fallback: keep prior layout when clustering fails
        }
    }

    watch(
        [
            entities,
            relationships,
            analysisMode,
            relationshipTypeFilter,
            sourceBackedOnly,
            highConfidenceOnly,
            includeContextEndpoints,
            searchQuery,
            () => props.showEnrichedEntities,
            () => props.showEnrichedRelationships,
        ],
        () => {
            nextTick(() => buildGraph());
        },
        { deep: false }
    );

    watch(colorMode, () => buildGraph());
    watch(selectedEntityNeid, () => {
        nextTick(() => {
            applySelectedHighlight();
            queueSigmaReflow();
        });
    });
    watch(graphHeight, () => refreshSigma());

    function isContainerValid(): boolean {
        if (!graphContainer.value) return false;
        const { clientWidth, clientHeight } = graphContainer.value;
        return clientWidth >= 10 && clientHeight >= 10;
    }

    function refreshSigma() {
        nextTick(() => {
            if (!sigmaInstance || !isContainerValid()) return;
            try {
                sigmaInstance.resize();
                sigmaInstance.refresh();
            } catch {
                // sigma state corrupted — schedule recovery
                scheduleGraphRecovery();
            }
        });
    }

    function queueSigmaReflow() {
        const guardedRefresh = () => {
            if (!sigmaInstance || !isContainerValid()) return;
            try {
                sigmaInstance.resize();
                sigmaInstance.refresh();
            } catch {
                scheduleGraphRecovery();
            }
        };
        requestAnimationFrame(guardedRefresh);
        setTimeout(guardedRefresh, 90);
    }

    function isSigmaAlive(): boolean {
        if (!sigmaInstance || !graphContainer.value) return false;
        try {
            const canvas = graphContainer.value.querySelector('canvas');
            if (!canvas || canvas.width < 10 || canvas.height < 10) return false;
            const gl =
                canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ??
                canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
            if (gl && gl.isContextLost()) return false;
            return true;
        } catch {
            return false;
        }
    }

    function scheduleGraphRecovery() {
        setTimeout(() => {
            if (isSigmaAlive() && isContainerValid()) return;
            if (entities.value.length > 0 && graphContainer.value) {
                buildGraph();
            }
        }, 600);
    }

    function syncViewportHeight() {
        viewportHeight.value = window.innerHeight;
        if (window.innerWidth < 1160) {
            showLegend.value = false;
        }
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
            resizeObserver = new ResizeObserver(() => {
                if (suppressResize) return;
                if (resizeTimer) clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => refreshSigma(), 60);
            });
            resizeObserver.observe(graphFrame.value);
        }
        setTimeout(() => refreshSigma(), 120);
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
        if (resizeTimer) clearTimeout(resizeTimer);
    });

    function applySelectedHighlight() {
        if (!sigmaInstance || !graphInstance) return;
        try {
            const neid = selectedEntityNeid.value;
            graphInstance.forEachNode((nodeId) => {
                const isSelected = nodeId === neid;
                const baseSize =
                    (graphInstance!.getNodeAttribute(nodeId, 'node_base_size') as number) ?? 6;
                graphInstance!.setNodeAttribute(nodeId, 'highlighted', isSelected);
                graphInstance!.setNodeAttribute(nodeId, 'zIndex', isSelected ? 4 : 1);
                graphInstance!.setNodeAttribute(
                    nodeId,
                    'size',
                    isSelected ? baseSize + 1.8 : baseSize
                );
            });
            sigmaInstance.refresh();
        } catch {
            // guard against sigma state corruption
        }
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
            .map((neid) => {
                const entity = entities.value.find((entry) => entry.neid === neid);
                return displayEntityName(neid, entity?.name);
            })
            .join(' -> ')}`;
    }
</script>

<style scoped>
    .graph-workspace {
        position: relative;
    }

    .graph-toolbar {
        min-height: 40px;
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
        contain: layout style paint;
        will-change: transform;
        isolation: isolate;
    }

    .graph-overlay {
        position: absolute;
        top: 46px;
        left: 12px;
        border: 1px solid;
        border-radius: 8px;
        min-width: 160px;
        max-width: 200px;
        backdrop-filter: blur(6px);
        z-index: 10;
    }

    .legend-toggle {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 12;
        border-radius: 8px;
        border: 1px solid var(--app-divider);
        backdrop-filter: blur(6px);
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
        padding: 10px 12px;
        pointer-events: none;
        z-index: 20;
        backdrop-filter: blur(14px);
        box-shadow:
            0 18px 36px rgba(0, 0, 0, 0.38),
            0 4px 14px rgba(0, 0, 0, 0.24);
        min-width: 150px;
        max-width: 280px;
        line-height: 1.35;
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

    .fullscreen-exit-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 40;
    }
</style>
