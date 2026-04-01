<template>
    <div class="overview-briefing">
        <CollectionHeaderCard
            :title="overview.collectionName"
            :subtitle="overview.subtitle"
            :detected-deal-type="overview.detectedDealType"
            :status="overview.status"
            :status-label="overview.statusLabel"
            :document-count="overview.documentCount"
            :analysis-status="overview.analysisStatusLabel"
            :last-updated="overview.lastUpdated"
            :primary-action-label="overview.primaryActionLabel"
            :primary-action-loading="rebuilding"
            :primary-action-disabled="overview.status === 'processing' || rebuilding"
            @primary-action="handlePrimaryAction"
        />

        <v-card v-if="showPipelinePanel" class="pipeline-card" variant="flat">
            <v-card-text class="py-3">
                <div class="pipeline-toolbar">
                    <button
                        type="button"
                        class="pipeline-toggle d-flex align-center justify-space-between"
                        @click="pipelineExpanded = !pipelineExpanded"
                    >
                        <div
                            class="text-caption text-medium-emphasis font-weight-medium text-uppercase"
                        >
                            Graph Reconstruction Pipeline
                            <span
                                v-if="!rebuilding && pipelineTotalDurationMs > 0"
                                class="ml-2 text-caption text-disabled"
                            >
                                ({{ formatDuration(pipelineTotalDurationMs) }} total)
                            </span>
                        </div>
                        <v-icon size="18" color="medium-emphasis">
                            {{ pipelineExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                        </v-icon>
                    </button>
                    <v-btn
                        v-if="isReady"
                        size="x-small"
                        variant="tonal"
                        color="primary"
                        prepend-icon="mdi-refresh"
                        :loading="rebuilding"
                        :disabled="rebuilding"
                        @click="handleReloadGraph"
                    >
                        Reload Graph
                    </v-btn>
                    <v-btn
                        v-if="isReady"
                        size="x-small"
                        variant="tonal"
                        color="secondary"
                        prepend-icon="mdi-family-tree"
                        :loading="lineageRunning"
                        :disabled="rebuilding || lineageRunning"
                        @click="handleRunLineage"
                    >
                        Run Corporate Lineage
                    </v-btn>
                </div>
                <v-expand-transition>
                    <div v-if="pipelineExpanded" class="pt-2">
                        <SummaryAgentSteps :steps="rebuildSteps" />
                        <v-expansion-panels
                            v-if="showVerboseProgressPanel"
                            v-model="verboseProgressPanel"
                            class="mt-3"
                            variant="accordion"
                        >
                            <v-expansion-panel :value="0">
                                <v-expansion-panel-title>
                                    <div class="d-flex align-center flex-wrap ga-2 w-100 pr-2">
                                        <span class="text-body-2 font-weight-medium">
                                            Verbose Progress
                                        </span>
                                        <v-chip size="x-small" variant="tonal">
                                            {{ mcpLog.length }} MCP calls
                                        </v-chip>
                                        <v-chip
                                            v-if="lineageDebugEntries.length"
                                            size="x-small"
                                            color="secondary"
                                            variant="tonal"
                                        >
                                            {{ lineageDebugEntries.length }} lineage updates
                                        </v-chip>
                                        <v-chip
                                            v-if="eventLookupCount"
                                            size="x-small"
                                            variant="tonal"
                                        >
                                            {{ eventLookupCount }} event lookups
                                        </v-chip>
                                        <v-chip
                                            v-if="mcpErrorCount"
                                            size="x-small"
                                            color="error"
                                            variant="tonal"
                                        >
                                            {{ mcpErrorCount }} errors
                                        </v-chip>
                                    </div>
                                </v-expansion-panel-title>
                                <v-expansion-panel-text>
                                    <div class="text-caption text-medium-emphasis mb-3">
                                        Rebuild MCP activity and corporate lineage debug updates.
                                    </div>
                                    <div v-if="showLineageDebugSection" class="mb-4">
                                        <div class="d-flex align-center ga-2 flex-wrap mb-2">
                                            <v-chip
                                                size="x-small"
                                                color="secondary"
                                                variant="outlined"
                                            >
                                                Lineage
                                            </v-chip>
                                            <v-chip size="x-small" variant="tonal">
                                                Roots: {{ lineageCounters.rootsDiscovered }}
                                            </v-chip>
                                            <v-chip size="x-small" variant="tonal">
                                                Processed: {{ lineageCounters.rootsProcessed }}
                                            </v-chip>
                                            <v-chip size="x-small" variant="tonal">
                                                Discovered:
                                                {{ lineageCounters.organizationsDiscovered }}
                                            </v-chip>
                                            <v-chip size="x-small" variant="tonal">
                                                Queue: {{ lineageCounters.queueRemaining }}
                                            </v-chip>
                                            <v-chip size="x-small" variant="tonal">
                                                Edges: {{ lineageCounters.edgesCollected }}
                                            </v-chip>
                                        </div>
                                        <div
                                            v-if="lineageRoots.length"
                                            class="text-caption text-medium-emphasis mb-2"
                                        >
                                            Root NEIDs: {{ lineageRoots.join(', ') }}
                                        </div>
                                        <div
                                            v-if="visibleLineageEntries.length"
                                            class="verbose-progress-list d-flex flex-column ga-2"
                                        >
                                            <div
                                                v-for="(entry, idx) in visibleLineageEntries"
                                                :key="`lineage-${entry.timestamp}-${idx}`"
                                                class="verbose-progress-item"
                                            >
                                                <div
                                                    class="d-flex align-center justify-space-between ga-2 mb-1 flex-wrap"
                                                >
                                                    <div
                                                        class="d-flex align-center ga-2 flex-wrap min-w-0"
                                                    >
                                                        <v-chip
                                                            size="x-small"
                                                            :color="
                                                                entry.error ? 'error' : 'secondary'
                                                            "
                                                            :variant="
                                                                entry.error ? 'tonal' : 'outlined'
                                                            "
                                                        >
                                                            {{ entry.stage }}
                                                        </v-chip>
                                                        <span
                                                            class="text-body-2 font-weight-medium verbose-primary-line"
                                                        >
                                                            {{ entry.detail }}
                                                        </span>
                                                    </div>
                                                    <span class="text-caption text-medium-emphasis">
                                                        {{ formatTimestamp(entry.timestamp) }}
                                                    </span>
                                                </div>
                                                <div class="text-caption text-medium-emphasis">
                                                    Roots {{ entry.rootsDiscovered }} | processed
                                                    {{ entry.rootsProcessed }} | discovered
                                                    {{ entry.organizationsDiscovered }} | queue
                                                    {{ entry.queueRemaining }} | edges
                                                    {{ entry.edgesCollected }}
                                                </div>
                                                <div
                                                    v-if="entry.currentRootNeid"
                                                    class="text-caption text-medium-emphasis"
                                                >
                                                    Root NEID: {{ entry.currentRootNeid }}
                                                </div>
                                                <div
                                                    v-if="entry.request"
                                                    class="text-caption text-medium-emphasis"
                                                >
                                                    Request: elemental_get_related(entity_neid={{
                                                        entry.request.entityNeid
                                                    }}, related_flavor={{
                                                        entry.request.relatedFlavor
                                                    }}, direction={{ entry.request.direction }},
                                                    limit={{ entry.request.limit }},
                                                    relationship_types={{
                                                        entry.request.relationshipTypes.join(', ')
                                                    }})
                                                </div>
                                                <div
                                                    v-if="entry.result"
                                                    class="text-caption text-medium-emphasis"
                                                >
                                                    Result: {{ entry.result.relatedCount }} rows,
                                                    {{ entry.result.lineageMatchCount }} lineage
                                                    matches, {{ entry.result.queuedCount }} queued
                                                </div>
                                                <div
                                                    v-if="entry.error"
                                                    class="text-caption text-error"
                                                >
                                                    Error: {{ entry.error }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        v-if="mcpLog.length"
                                        class="d-flex align-center justify-space-between ga-2 mb-3 flex-wrap"
                                    >
                                        <div class="d-flex align-center ga-2 flex-wrap">
                                            <v-btn
                                                size="x-small"
                                                :variant="
                                                    verboseProgressMode === 'phase'
                                                        ? 'flat'
                                                        : 'tonal'
                                                "
                                                color="primary"
                                                @click="verboseProgressMode = 'phase'"
                                            >
                                                Current Phase
                                            </v-btn>
                                            <v-btn
                                                size="x-small"
                                                :variant="
                                                    verboseProgressMode === 'all' ? 'flat' : 'tonal'
                                                "
                                                color="primary"
                                                @click="verboseProgressMode = 'all'"
                                            >
                                                All Calls
                                            </v-btn>
                                        </div>
                                        <div class="text-caption text-medium-emphasis">
                                            {{ verboseProgressModeSummary }}
                                        </div>
                                    </div>
                                    <div
                                        v-if="mcpLog.length && !visibleMcpEntries.length"
                                        class="text-body-2 text-medium-emphasis"
                                    >
                                        {{ emptyVerboseProgressMessage }}
                                    </div>
                                    <div
                                        v-else-if="mcpLog.length"
                                        class="verbose-progress-list d-flex flex-column ga-2"
                                    >
                                        <div
                                            v-for="entry in visibleMcpEntries"
                                            :key="entry.id"
                                            class="verbose-progress-item"
                                        >
                                            <div
                                                class="d-flex align-center justify-space-between ga-2 mb-1 flex-wrap"
                                            >
                                                <div
                                                    class="d-flex align-center ga-2 flex-wrap min-w-0"
                                                >
                                                    <v-chip
                                                        size="x-small"
                                                        :color="
                                                            entry.status === 'error'
                                                                ? 'error'
                                                                : 'primary'
                                                        "
                                                        :variant="
                                                            entry.status === 'error'
                                                                ? 'tonal'
                                                                : 'outlined'
                                                        "
                                                    >
                                                        {{ formatToolLabel(entry.tool) }}
                                                    </v-chip>
                                                    <span
                                                        class="text-body-2 font-weight-medium verbose-primary-line"
                                                    >
                                                        {{
                                                            entry.argsSummary ||
                                                            'No request summary'
                                                        }}
                                                    </span>
                                                </div>
                                                <div class="d-flex align-center ga-2 flex-wrap">
                                                    <span class="text-caption text-medium-emphasis">
                                                        {{ formatTimestamp(entry.timestamp) }}
                                                    </span>
                                                    <v-chip
                                                        size="x-small"
                                                        :color="
                                                            entry.status === 'error'
                                                                ? 'error'
                                                                : undefined
                                                        "
                                                        variant="tonal"
                                                    >
                                                        {{ formatDuration(entry.durationMs) }}
                                                    </v-chip>
                                                </div>
                                            </div>
                                            <div
                                                class="text-caption"
                                                :class="
                                                    entry.status === 'error'
                                                        ? 'text-error'
                                                        : 'text-medium-emphasis'
                                                "
                                            >
                                                {{ entry.responseSummary || 'No response summary' }}
                                            </div>
                                        </div>
                                    </div>
                                </v-expansion-panel-text>
                            </v-expansion-panel>
                        </v-expansion-panels>
                    </div>
                </v-expand-transition>
            </v-card-text>
        </v-card>

        <div class="overview-strip">
            <DealSummaryCard
                :fields="overview.dealSummaryFields"
                :status="overview.status"
                :narrative-paragraphs="narrativeParagraphs"
                :citation-count="narrativeCitations.length"
                :is-regenerating="narrativeLoading"
                @regenerate="loadOverviewLanguage"
                @run-analysis="handleRunAnalysis"
            />
            <div class="overview-rail">
                <div class="overview-rail-panels">
                    <ExtractionStatsCard
                        :stats="overview.extractionStats"
                        :status="overview.status"
                        :stacked="true"
                        :action-loading="rebuilding"
                        :action-disabled="overview.status === 'processing' || rebuilding"
                        @run-analysis="handleRunAnalysis"
                    />
                    <SourceDocumentsCompactCard :sources="displayInitialSources" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { InitialSourceRow } from '~/utils/overviewBriefing';
    import type { LineageInvestigationProgressEntry } from '~/utils/collectionTypes';

    const {
        overviewViewModel,
        meta,
        documentEntities: entities,
        isReady,
        rebuilding,
        rebuild,
        rebuildSteps,
        mcpLog,
        lineageInvestigation,
        lineageDebugEntries,
        runLineageInvestigation,
        setTab,
        addGeminiUsage,
    } = useCollectionWorkspace();

    const liveNarrative = ref<string | null>(null);
    const narrativeCitations = ref<Array<{ label: string; neid?: string }>>([]);
    const narrativeLoading = ref(false);
    const pipelineExpanded = ref(true);
    const verboseProgressPanel = ref<number[]>([]);
    const verboseProgressMode = ref<'phase' | 'all'>('phase');
    const seedSourceOverrides = ref<Record<string, Partial<InitialSourceRow>>>({});

    const overview = computed(() => overviewViewModel.value);
    const displayInitialSources = computed(() =>
        overview.value.initialSources.map((source) => ({
            ...source,
            ...(seedSourceOverrides.value[source.neid] ?? {}),
        }))
    );
    const showPipelinePanel = computed(
        () =>
            isReady.value ||
            rebuilding.value ||
            rebuildSteps.value.some((step) => step.status !== 'pending')
    );
    const lineageRunning = computed(() => lineageInvestigation.value.status === 'running');
    const showLineageDebugSection = computed(
        () => lineageRunning.value || lineageDebugEntries.value.length > 0
    );
    const showVerboseProgressPanel = computed(
        () => rebuilding.value || mcpLog.value.length > 0 || showLineageDebugSection.value
    );
    const pipelineTotalDurationMs = computed(() =>
        rebuildSteps.value.reduce((sum, step) => sum + (step.durationMs ?? 0), 0)
    );
    const eventLookupCount = computed(
        () => mcpLog.value.filter((entry) => entry.tool === 'elemental_get_events').length
    );
    const mcpErrorCount = computed(
        () => mcpLog.value.filter((entry) => entry.status === 'error').length
    );
    const sortedMcpEntries = computed(() =>
        [...mcpLog.value].sort((a, b) => {
            const timeA = parseDateMs(a.timestamp) ?? 0;
            const timeB = parseDateMs(b.timestamp) ?? 0;
            return timeB - timeA;
        })
    );
    const lineageRoots = computed(() => lineageInvestigation.value.roots ?? []);
    const sortedLineageEntries = computed<LineageInvestigationProgressEntry[]>(() =>
        [...lineageDebugEntries.value].sort((a, b) => {
            const timeA = parseDateMs(a.timestamp) ?? 0;
            const timeB = parseDateMs(b.timestamp) ?? 0;
            return timeB - timeA;
        })
    );
    const visibleLineageEntries = computed(() => sortedLineageEntries.value.slice(0, 20));
    const lineageCounters = computed(() => {
        const latest = sortedLineageEntries.value[0];
        return {
            rootsDiscovered: latest?.rootsDiscovered ?? lineageRoots.value.length,
            rootsProcessed:
                latest?.rootsProcessed ?? lineageInvestigation.value.rootsProcessed ?? 0,
            organizationsDiscovered:
                latest?.organizationsDiscovered ??
                lineageInvestigation.value.organizationsDiscovered ??
                lineageInvestigation.value.scannedOrganizations ??
                0,
            queueRemaining:
                latest?.queueRemaining ?? lineageInvestigation.value.queueRemaining ?? 0,
            edgesCollected:
                latest?.edgesCollected ?? lineageInvestigation.value.relationships?.length ?? 0,
        };
    });
    const currentRebuildStep = computed(
        () => rebuildSteps.value.find((step) => step.status === 'working') ?? null
    );
    const currentVerbosePhase = computed(() => {
        const label = currentRebuildStep.value?.label ?? '';
        const detail = currentRebuildStep.value?.detail ?? '';
        const haystack = `${label} ${detail}`.toLowerCase();
        if (
            haystack.includes('corporate lineage investigation') ||
            (haystack.includes('preparing workspace') && haystack.includes('lineage'))
        ) {
            return {
                id: 'lineage',
                label: 'corporate lineage crawl',
                tools: ['elemental_get_schema', 'elemental_get_related'],
            };
        }
        if (
            haystack.includes('events:') ||
            haystack.includes('loading document events') ||
            haystack.includes('event hub')
        ) {
            return {
                id: 'events',
                label: 'event lookups',
                tools: ['elemental_get_events'],
            };
        }
        if (
            haystack.includes('hop ') ||
            haystack.includes('linking graph') ||
            haystack.includes('loading document graph') ||
            haystack.includes('loading seed documents') ||
            haystack.includes('loading seed context') ||
            haystack.includes('traversing seeded')
        ) {
            return {
                id: 'relationships',
                label: 'relationship lookups',
                tools: ['elemental_get_related'],
            };
        }
        if (
            haystack.includes('validating graph entities') ||
            haystack.includes('confirming entity profiles')
        ) {
            return {
                id: 'entities',
                label: 'entity validation',
                tools: ['elemental_get_entity'],
            };
        }
        return {
            id: 'all',
            label: 'latest rebuild calls',
            tools: [] as string[],
        };
    });
    const visibleMcpEntries = computed(() => {
        if (verboseProgressMode.value === 'all') {
            return sortedMcpEntries.value.slice(0, 12);
        }
        const phaseTools = currentVerbosePhase.value.tools;
        if (!phaseTools.length) return sortedMcpEntries.value.slice(0, 12);
        return sortedMcpEntries.value
            .filter((entry) => phaseTools.includes(entry.tool))
            .slice(0, 12);
    });
    const verboseProgressModeSummary = computed(() => {
        if (verboseProgressMode.value === 'all') {
            return 'Showing the latest rebuild calls across all phases';
        }
        return `Showing current phase only: ${currentVerbosePhase.value.label}`;
    });
    const emptyVerboseProgressMessage = computed(() => {
        if (!sortedMcpEntries.value.length)
            return 'Waiting for the first MCP calls to be reported…';
        if (verboseProgressMode.value === 'phase') {
            return `No MCP calls matched the current ${currentVerbosePhase.value.label} filter yet.`;
        }
        return 'No MCP calls have been reported yet.';
    });

    watch(rebuilding, (isRunning, wasRunning) => {
        if (isRunning) {
            pipelineExpanded.value = true;
            verboseProgressPanel.value = [0];
            verboseProgressMode.value = 'phase';
            return;
        }
        if (!isRunning && wasRunning && isReady.value && overview.value.status !== 'error') {
            pipelineExpanded.value = false;
        }
    });

    function parseDateMs(value?: string): number | null {
        if (!value) return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed.getTime();
    }

    function normalizeFlavorLabel(value: unknown): string | undefined {
        const text = String(value ?? '')
            .trim()
            .replace(/^schema::flavor::/, '')
            .replace(/_/g, ' ');
        return text || undefined;
    }

    function normalizeLookupDate(value: unknown): string | undefined {
        const text = String(value ?? '').trim();
        if (!text) return undefined;
        const direct = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (direct) return `${direct[2]}-${direct[3]}-${direct[1]}`;
        const parsed = new Date(text);
        if (Number.isNaN(parsed.getTime())) return undefined;
        const iso = parsed.toISOString().slice(0, 10).split('-');
        if (iso.length !== 3) return undefined;
        return `${iso[1]}-${iso[2]}-${iso[0]}`;
    }

    function lookupDateFromRecord(record: unknown): string | undefined {
        if (!record || typeof record !== 'object') return undefined;
        const data = record as Record<string, unknown>;
        const directKeys = [
            'date',
            'recordedAt',
            'recorded_at',
            'effectiveDate',
            'effective_date',
            'filingDate',
            'filing_date',
            'issueDate',
            'issue_date',
            'createdAt',
            'created_at',
            'dated_date',
        ];
        for (const key of directKeys) {
            const normalized = normalizeLookupDate(data[key]);
            if (normalized) return normalized;
        }
        const nestedKeys = ['entity', 'resolved', 'resolution', 'properties'];
        for (const key of nestedKeys) {
            const normalized = lookupDateFromRecord(data[key]);
            if (normalized) return normalized;
        }
        return undefined;
    }

    function shouldRefreshSeedSources(sources: InitialSourceRow[]): boolean {
        return sources.some((source) => {
            const sourceType = source.sourceType.trim().toLowerCase();
            return !source.date || sourceType === 'unknown' || sourceType === 'entity';
        });
    }

    async function refreshSeedSourceMetadata() {
        const sources = overview.value.initialSources;
        if (!sources.length || !shouldRefreshSeedSources(sources)) {
            seedSourceOverrides.value = {};
            return;
        }
        const overrides: Record<string, Partial<InitialSourceRow>> = {};
        await Promise.all(
            sources.map(async (source) => {
                try {
                    const result = await $fetch<{
                        entity?: {
                            neid?: string;
                            name?: string;
                            flavor?: string;
                            date?: string | null;
                        } | null;
                        resolution?: unknown;
                    }>('/api/collection/entity-search', {
                        method: 'POST',
                        body: { query: source.neid },
                    });
                    const name = String(result?.entity?.name ?? '').trim();
                    const flavor =
                        normalizeFlavorLabel(result?.entity?.flavor) ||
                        normalizeFlavorLabel(
                            (result?.resolution as Record<string, unknown> | undefined)?.flavor
                        );
                    const date =
                        normalizeLookupDate(result?.entity?.date) ||
                        lookupDateFromRecord(result?.resolution);
                    const next: Partial<InitialSourceRow> = {};
                    if (name && !isNeidLike(name)) next.label = name;
                    if (flavor) next.sourceType = flavor;
                    if (date) next.date = date;
                    if (Object.keys(next).length) {
                        overrides[source.neid] = next;
                    }
                } catch {
                    // Keep saved project metadata when a refresh lookup fails.
                }
            })
        );
        seedSourceOverrides.value = overrides;
    }

    function normalizeWhitespace(input: string): string {
        return input.replace(/\s+/g, ' ').trim();
    }

    function firstSentences(input: string, maxSentences = 3): string[] {
        const normalized = normalizeWhitespace(input);
        if (!normalized) return [];
        const sentences = normalized
            .split(/(?<=[.!?])\s+/)
            .map((sentence) => sentence.trim())
            .filter(Boolean);
        return sentences.slice(0, maxSentences);
    }

    const MUNICIPAL_BOND_NEID = '8242646876499346416';

    function normalizeNeid(value: string): string {
        const unpadded = value.replace(/^0+(?=\d)/, '') || '0';
        return unpadded.padStart(20, '0');
    }

    function isNeidLike(value: string): boolean {
        return /^\d{16,24}$/.test(value.trim());
    }

    function isWeakAnchorLabel(value: string | null | undefined): boolean {
        const text = String(value ?? '').trim();
        if (!text) return true;
        if (isNeidLike(text)) return true;
        return /^\d{3,6}-\d{3,6}$/.test(text);
    }

    function entityDisplayName(entity?: {
        name?: string;
        properties?: Record<string, unknown>;
    }): string {
        const direct = String(entity?.name ?? '').trim();
        if (direct && !isNeidLike(direct)) return direct;
        const props = (entity?.properties ?? {}) as Record<string, unknown>;
        const candidateKeys = [
            'matched_name',
            'canonical_name',
            'resolved_name',
            'legal_name',
            'issuer_name',
            'name',
        ];
        for (const key of candidateKeys) {
            const raw = props[key];
            const value =
                raw && typeof raw === 'object' && !Array.isArray(raw)
                    ? (raw as Record<string, unknown>).value
                    : raw;
            const text = String(value ?? '').trim();
            if (text && !isNeidLike(text)) return text;
        }
        return 'the municipal bond at the center of this transaction';
    }

    const municipalBondName = computed(() => {
        const bond = entities.value.find(
            (entity) => normalizeNeid(entity.neid) === normalizeNeid(MUNICIPAL_BOND_NEID)
        );
        const bondLabel = entityDisplayName(bond);
        if (!isWeakAnchorLabel(bondLabel)) return bondLabel;
        const bestNamedAnchor = entities.value
            .filter((entity) =>
                ['financial_instrument', 'fund_account', 'organization'].includes(entity.flavor)
            )
            .sort((a, b) => b.sourceDocuments.length - a.sourceDocuments.length)
            .map((entity) => entityDisplayName(entity))
            .find((label) => !isWeakAnchorLabel(label));
        return bestNamedAnchor || 'the financing transaction at the center of this collection';
    });

    const narrativeParagraphs = computed(() => {
        if (overview.value.status === 'pending' || overview.value.status === 'processing')
            return [];

        const fallback = [
            `This corpus combines ${overview.value.documentCount} source documents about one financing transaction and the parties involved in it.`,
            `The documents center on ${municipalBondName.value}, and describe that bond deal and its surrounding obligations.`,
            `Together, the files describe the deal structure, legal agreements, and key timeline events around the same transaction narrative.`,
            `Use this view to understand what the documents are saying before reviewing broader graph context.`,
        ].join(' ');

        const source = liveNarrative.value || fallback;
        const bounded = firstSentences(source, 3);
        if (bounded.length >= 2) return [bounded.join(' ')];
        return [firstSentences(fallback, 3).join(' ')];
    });

    async function loadOverviewLanguage() {
        if (!isReady.value) {
            liveNarrative.value = null;
            narrativeCitations.value = [];
            return;
        }
        narrativeLoading.value = true;
        try {
            const result = await $fetch<{
                summaryLine: string;
                collectionSummary: string;
                narrative?: string;
                citations?: Array<{ label: string; neid?: string }>;
                usage?: {
                    model: string;
                    promptTokens: number;
                    completionTokens: number;
                    totalTokens: number;
                    costUsd: number;
                };
            }>('/api/collection/overview-language');
            liveNarrative.value = result.narrative || null;
            narrativeCitations.value = result.citations || [];
            if (result.usage) {
                addGeminiUsage({
                    model: result.usage.model,
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                    totalTokens: result.usage.totalTokens,
                    costUsd: result.usage.costUsd,
                    latencyMs: 0,
                    timestamp: new Date().toISOString(),
                    label: 'overview_language',
                });
            }
        } catch {
            liveNarrative.value = null;
            narrativeCitations.value = [];
        } finally {
            narrativeLoading.value = false;
        }
    }

    async function handleRunAnalysis() {
        if (rebuilding.value) return;
        await rebuild();
    }

    async function handleReloadGraph() {
        await handleRunAnalysis();
    }

    async function handleRunLineage() {
        if (rebuilding.value || lineageRunning.value) return;
        pipelineExpanded.value = true;
        verboseProgressPanel.value = [0];
        await runLineageInvestigation();
    }

    async function handlePrimaryAction() {
        if (
            overview.value.status === 'pending' ||
            overview.value.status === 'partial' ||
            overview.value.status === 'error'
        ) {
            await handleRunAnalysis();
            return;
        }
        if (overview.value.status === 'processing') return;
        setTab('graph');
    }

    function handlePreviewDoc(_neid: string) {
        setTab('graph');
    }

    function handleViewEntities(_neid: string) {
        setTab('graph');
    }

    function formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
        const min = Math.floor(ms / 60_000);
        const sec = Math.round((ms % 60_000) / 1000);
        return `${min}m ${sec}s`;
    }

    function formatTimestamp(value?: string): string {
        const parsedMs = parseDateMs(value);
        if (parsedMs === null) return 'Unknown time';
        return new Intl.DateTimeFormat(undefined, {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
        }).format(new Date(parsedMs));
    }

    function formatToolLabel(tool: string): string {
        return tool.replace(/^elemental_/, '').replace(/^get_/, '');
    }

    onMounted(() => {
        if (isReady.value) loadOverviewLanguage();
    });
    watch(
        () => isReady.value,
        (ready) => {
            if (ready) loadOverviewLanguage();
        }
    );
    watch(
        () => meta.value.lastRebuilt,
        () => {
            if (isReady.value) loadOverviewLanguage();
        }
    );
    watch(
        () => overview.value.initialSources,
        () => {
            refreshSeedSourceMetadata();
        },
        { immediate: true, deep: true }
    );
</script>

<style scoped>
    .overview-briefing {
        max-width: 1400px;
        margin: 0 auto;
        padding: 8px 8px 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .pipeline-card {
        border: 1px solid var(--app-divider-strong);
        background: color-mix(
            in srgb,
            var(--dynamic-panel-background) 88%,
            var(--dynamic-background) 12%
        );
        border-radius: 12px;
    }

    .pipeline-toggle {
        border: 0;
        background: transparent;
        text-align: left;
        cursor: pointer;
        flex: 1;
    }

    .pipeline-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .verbose-progress-list {
        max-height: 420px;
        overflow-y: auto;
    }

    .verbose-progress-item {
        border: 1px solid var(--app-divider);
        border-radius: 10px;
        padding: 10px 12px;
        background: color-mix(in srgb, var(--app-surface) 94%, white 6%);
    }

    .verbose-primary-line {
        word-break: break-word;
    }

    .overview-strip {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
    }

    .overview-rail {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
        align-content: start;
    }

    .overview-rail-panels {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
    }

    @media (min-width: 1140px) {
        .overview-strip {
            grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr);
        }

        .overview-rail-panels {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }
    }
</style>
