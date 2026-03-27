import { ref, computed } from 'vue';
import type {
    CollectionState,
    EntityRecord,
    RelationshipRecord,
    PropertySeriesRecord,
    WorkspaceTab,
} from '~/utils/collectionTypes';
import { emptyCollectionState } from '~/utils/collectionTypes';

export interface RebuildStep {
    step: number;
    status: 'pending' | 'working' | 'completed';
    label: string;
    detail?: string;
    durationMs?: number;
}

export interface McpLogEntry {
    id: number;
    tool: string;
    argsSummary: string;
    responseSummary: string;
    durationMs: number;
    status: 'success' | 'error';
    timestamp: string;
    args?: Record<string, unknown>;
    response?: unknown;
}

export interface GeminiUsageEntry {
    id: number;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    latencyMs: number;
    timestamp: string;
    label: string;
}

export interface RankedEntityInsight {
    neid: string;
    name: string;
    flavor: string;
    score: number;
    relationshipCount: number;
    eventCount: number;
    sourceCount: number;
    origin: 'document' | 'enriched' | 'agent';
}

export interface RankedEventInsight {
    neid: string;
    name: string;
    category?: string;
    date?: string;
    likelihood?: string;
    score: number;
    participantCount: number;
    sourceCount: number;
}

export interface TrustCoverageSummary {
    coverageScore: number;
    evidenceBackedRelationships: number;
    inferredRelationships: number;
    enrichedEntityShare: number;
    sourceCoverageShare: number;
    confidenceLabel: 'high' | 'medium' | 'low';
    confidenceReason: string;
}

export interface CollectionAction {
    id: string;
    label: string;
    description: string;
    tab: WorkspaceTab;
}

const INITIAL_STEPS: RebuildStep[] = [
    {
        step: 1,
        status: 'pending',
        label: 'Entity Discovery',
        detail: 'Scanning 5 BNY documents...',
    },
    { step: 2, status: 'pending', label: 'Event Discovery', detail: 'Traversing hub entities...' },
    {
        step: 3,
        status: 'pending',
        label: 'Relationship Assembly',
        detail: 'Probing relationship types...',
    },
    {
        step: 4,
        status: 'pending',
        label: 'Property History',
        detail: 'Loading historical properties...',
    },
    { step: 5, status: 'pending', label: 'Finalizing', detail: 'Building collection state...' },
];

const collection = ref<CollectionState>(emptyCollectionState());
const activeTab = ref<WorkspaceTab>('overview');
const selectedEntityNeid = ref<string | null>(null);
const selectedDocumentNeid = ref<string | null>(null);
const rebuilding = ref(false);
const rebuildSteps = ref<RebuildStep[]>(INITIAL_STEPS.map((s) => ({ ...s })));
const enriching = ref(false);
const agentLoading = ref(false);
const agentResult = ref<{ output: string; citations: any[] } | null>(null);
const mcpLog = ref<McpLogEntry[]>([]);
const geminiLog = ref<GeminiUsageEntry[]>([]);
let _geminiIdCounter = 0;

export function useCollectionWorkspace() {
    const isReady = computed(() => collection.value.status === 'ready');
    const isLoading = computed(() => rebuilding.value || collection.value.status === 'loading');

    const documents = computed(() => collection.value.documents);
    const entities = computed(() => collection.value.entities);
    const events = computed(() => collection.value.events);
    const relationships = computed(() => collection.value.relationships);
    const propertySeries = computed(() => collection.value.propertySeries);
    const meta = computed(() => collection.value.meta);

    const documentEntities = computed(() =>
        collection.value.entities.filter((e) => e.origin === 'document')
    );
    const enrichedEntities = computed(() =>
        collection.value.entities.filter((e) => e.origin === 'enriched')
    );
    const agreements = computed(() =>
        collection.value.entities.filter((e) => e.flavor === 'legal_agreement')
    );

    const selectedEntity = computed(() => {
        if (!selectedEntityNeid.value) return null;
        return collection.value.entities.find((e) => e.neid === selectedEntityNeid.value) ?? null;
    });

    const selectedEntityRelationships = computed(() => {
        if (!selectedEntityNeid.value) return [];
        return collection.value.relationships.filter(
            (r) =>
                r.sourceNeid === selectedEntityNeid.value ||
                r.targetNeid === selectedEntityNeid.value
        );
    });

    const selectedEntityEvents = computed(() => {
        if (!selectedEntityNeid.value) return [];
        return collection.value.events.filter((e) =>
            e.participantNeids.includes(selectedEntityNeid.value!)
        );
    });

    const selectedEntityPropertySeries = computed(() => {
        if (!selectedEntityNeid.value) return [];
        return collection.value.propertySeries.filter((s) => s.neid === selectedEntityNeid.value);
    });

    const flavorCounts = computed(() => {
        const counts = new Map<string, number>();
        for (const e of collection.value.entities) {
            counts.set(e.flavor, (counts.get(e.flavor) || 0) + 1);
        }
        return counts;
    });

    const relationshipTypeCounts = computed(() => {
        const counts = new Map<string, number>();
        for (const r of collection.value.relationships) {
            counts.set(r.type, (counts.get(r.type) || 0) + 1);
        }
        return counts;
    });

    const entityConnectionCount = computed(() => {
        const counts = new Map<string, number>();
        for (const rel of collection.value.relationships) {
            counts.set(rel.sourceNeid, (counts.get(rel.sourceNeid) ?? 0) + 1);
            counts.set(rel.targetNeid, (counts.get(rel.targetNeid) ?? 0) + 1);
        }
        return counts;
    });

    const eventCountByEntity = computed(() => {
        const counts = new Map<string, number>();
        for (const evt of collection.value.events) {
            for (const neid of evt.participantNeids) {
                counts.set(neid, (counts.get(neid) ?? 0) + 1);
            }
        }
        return counts;
    });

    const topEntities = computed<RankedEntityInsight[]>(() =>
        collection.value.entities
            .map((entity) => {
                const relationshipCount = entityConnectionCount.value.get(entity.neid) ?? 0;
                const eventCount = eventCountByEntity.value.get(entity.neid) ?? 0;
                const sourceCount = entity.sourceDocuments.length;
                // Weighted score prioritizes graph centrality and event participation.
                const score = relationshipCount * 2 + eventCount * 1.5 + sourceCount;
                return {
                    neid: entity.neid,
                    name: entity.name,
                    flavor: entity.flavor,
                    score,
                    relationshipCount,
                    eventCount,
                    sourceCount,
                    origin: entity.origin,
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
    );

    const topEvents = computed<RankedEventInsight[]>(() =>
        collection.value.events
            .map((event) => {
                const participantCount = event.participantNeids.length;
                const sourceCount = event.sourceDocuments.length;
                const likelihoodBoost =
                    event.likelihood === 'confirmed' ? 2 : event.likelihood === 'likely' ? 1 : 0.25;
                const score = participantCount * 1.8 + sourceCount + likelihoodBoost;
                return {
                    neid: event.neid,
                    name: event.name,
                    category: event.category,
                    date: event.date,
                    likelihood: event.likelihood,
                    participantCount,
                    sourceCount,
                    score,
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
    );

    const relationshipHighlights = computed(() =>
        Array.from(relationshipTypeCounts.value.entries())
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
    );

    const trustCoverageSummary = computed<TrustCoverageSummary>(() => {
        const totalRelationships = collection.value.relationships.length;
        const evidenceBackedRelationships = collection.value.relationships.filter(
            (rel) =>
                Boolean(rel.sourceDocumentNeid) ||
                (Array.isArray(rel.citations) && rel.citations.length > 0)
        ).length;
        const inferredRelationships = Math.max(0, totalRelationships - evidenceBackedRelationships);
        const totalEntities = Math.max(collection.value.entities.length, 1);
        const enrichedEntities = collection.value.entities.filter(
            (e) => e.origin === 'enriched'
        ).length;
        const sourceBackedEntities = collection.value.entities.filter(
            (e) => Array.isArray(e.sourceDocuments) && e.sourceDocuments.length > 0
        ).length;

        const coverageScore = Math.round(
            (sourceBackedEntities / totalEntities) * 60 +
                (totalRelationships > 0
                    ? (evidenceBackedRelationships / totalRelationships) * 40
                    : 20)
        );
        const enrichedEntityShare = Math.round((enrichedEntities / totalEntities) * 100);
        const sourceCoverageShare = Math.round((sourceBackedEntities / totalEntities) * 100);

        let confidenceLabel: TrustCoverageSummary['confidenceLabel'] = 'medium';
        let confidenceReason =
            'Evidence is substantial, with some inferred links requiring review.';
        if (coverageScore >= 78) {
            confidenceLabel = 'high';
            confidenceReason =
                'Most entities and relationships are directly traceable to source evidence.';
        } else if (coverageScore <= 52) {
            confidenceLabel = 'low';
            confidenceReason =
                'Coverage relies heavily on inferred links or has sparse source references.';
        }

        return {
            coverageScore,
            evidenceBackedRelationships,
            inferredRelationships,
            enrichedEntityShare,
            sourceCoverageShare,
            confidenceLabel,
            confidenceReason,
        };
    });

    const keyCoverageNotes = computed(() => {
        const notes: string[] = [];
        if (collection.value.documents.length === 0) {
            notes.push('No source documents are loaded yet.');
        }
        if (
            trustCoverageSummary.value.inferredRelationships >
            trustCoverageSummary.value.evidenceBackedRelationships
        ) {
            notes.push('Inferred relationships currently outnumber source-backed relationships.');
        }
        if (collection.value.propertySeries.length === 0) {
            notes.push(
                'Property history is limited; verify whether historical data is available for this collection.'
            );
        }
        if (notes.length === 0) {
            notes.push(
                'Coverage looks stable. Verify high-impact entities and events for decision-grade reporting.'
            );
        }
        return notes;
    });

    const collectionSummary = computed(() => {
        const docCount = collection.value.documents.length;
        const entityCount = collection.value.entities.length;
        const eventCount = collection.value.events.length;
        const topEntity = topEntities.value[0];
        const topEvent = topEvents.value[0];
        const entityLine = topEntity
            ? `Most central entity: ${topEntity.name} (${topEntity.flavor.replace(/_/g, ' ')}).`
            : 'No entities identified yet.';
        const eventLine = topEvent
            ? `Most significant event: ${topEvent.name}${topEvent.date ? ` (${topEvent.date.slice(0, 10)})` : ''}.`
            : 'No significant events have been identified yet.';
        return `${docCount} source document${docCount === 1 ? '' : 's'} produced ${entityCount} entities and ${eventCount} events. ${entityLine} ${eventLine}`;
    });

    const recommendedActions = computed<CollectionAction[]>(() => [
        {
            id: 'understand-collection',
            label: 'Understand This Collection',
            description: 'Read an executive summary and key trust notes.',
            tab: 'overview',
        },
        {
            id: 'review-key-parties',
            label: 'Review Key Parties',
            description: 'Inspect the highest-impact entities and their relationships.',
            tab: 'graph',
        },
        {
            id: 'trace-relationships',
            label: 'Trace Financial Relationships',
            description: 'Filter the graph to inspect relationship pathways and evidence.',
            tab: 'graph',
        },
        {
            id: 'inspect-timeline',
            label: 'Inspect Event Timeline',
            description: 'Review event progression and major episodes over time.',
            tab: 'events',
        },
        {
            id: 'check-trust',
            label: 'Check Trust & Coverage',
            description: 'See what is complete, partial, or inferred.',
            tab: 'validation',
        },
        {
            id: 'ask-grounded-question',
            label: 'Ask A Grounded Question',
            description: 'Use the copilot with source-linked evidence.',
            tab: 'agent',
        },
    ]);

    const contextualAgentPrompts = computed(() => {
        const prompts = [
            'Summarize this collection in plain English.',
            'Identify the most central entities and explain why they matter.',
            'What changed across the rebate analyses over time?',
            'Where is evidence thin or incomplete?',
            'Summarize this collection for an executive audience.',
        ];
        if (selectedEntity.value) {
            prompts.unshift(`Explain the role of ${selectedEntity.value.name} in this collection.`);
        }
        return prompts;
    });

    async function bootstrap(): Promise<void> {
        try {
            const data = await $fetch<CollectionState>('/api/collection/bootstrap');
            collection.value = data;
        } catch (e: any) {
            collection.value.error = e.message || 'Failed to bootstrap';
        }
    }

    async function rebuild(): Promise<void> {
        rebuilding.value = true;
        collection.value.status = 'loading';
        collection.value.error = undefined;
        mcpLog.value = [];
        rebuildSteps.value = INITIAL_STEPS.map((s) => ({ ...s }));

        try {
            const response = await fetch('/api/collection/rebuild-stream');
            if (!response.ok || !response.body) {
                throw new Error(`Stream failed: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const msg = JSON.parse(line.slice(6));
                        handleStreamMessage(msg);
                    } catch {
                        // malformed line — ignore
                    }
                }
            }
        } catch (e: any) {
            collection.value.status = 'error';
            collection.value.error = e.message || 'Rebuild failed';
        } finally {
            rebuilding.value = false;
        }
    }

    function handleStreamMessage(msg: Record<string, unknown>) {
        switch (msg.type) {
            case 'step': {
                const idx = rebuildSteps.value.findIndex((s) => s.step === (msg.step as number));
                if (idx >= 0) {
                    rebuildSteps.value[idx] = {
                        step: msg.step as number,
                        status: msg.status as 'working' | 'completed',
                        label: msg.label as string,
                        detail: msg.detail as string | undefined,
                        durationMs: msg.durationMs as number | undefined,
                    };
                }
                break;
            }
            case 'state': {
                const state = msg.state as CollectionState;
                if (state) collection.value = state;
                break;
            }
            case 'mcplog': {
                const entries = msg.entries as McpLogEntry[];
                if (entries) mcpLog.value = entries;
                break;
            }
            case 'done': {
                rebuilding.value = false;
                break;
            }
        }
    }

    function addGeminiUsage(entry: Omit<GeminiUsageEntry, 'id'>): void {
        geminiLog.value.push({ id: ++_geminiIdCounter, ...entry });
    }

    async function enrich(anchorNeids: string[], hops = 1): Promise<void> {
        enriching.value = true;
        try {
            const result = await $fetch<{
                entities: EntityRecord[];
                relationships: RelationshipRecord[];
            }>('/api/collection/enrich', {
                method: 'POST',
                body: { anchorNeids, hops },
            });

            const existingNeids = new Set(collection.value.entities.map((e) => e.neid));
            const newEntities = result.entities.filter((e) => !existingNeids.has(e.neid));
            collection.value.entities.push(...newEntities);
            collection.value.relationships.push(...result.relationships);

            collection.value.meta.entityCount = collection.value.entities.length;
            collection.value.meta.relationshipCount = collection.value.relationships.length;
        } catch (e: any) {
            console.error('Enrichment failed:', e.message);
        } finally {
            enriching.value = false;
        }
    }

    async function fetchPropertyHistory(eids: string[]): Promise<PropertySeriesRecord[]> {
        try {
            const result = await $fetch<{ series: PropertySeriesRecord[] }>(
                '/api/collection/properties',
                { method: 'POST', body: { eids } }
            );
            const newSeries = result.series.filter(
                (s) =>
                    !collection.value.propertySeries.some(
                        (ps) => ps.neid === s.neid && ps.pid === s.pid
                    )
            );
            collection.value.propertySeries.push(...newSeries);
            return result.series;
        } catch {
            return [];
        }
    }

    async function runAgentAction(
        action: string,
        params?: { entityNeid?: string; question?: string }
    ): Promise<void> {
        agentLoading.value = true;
        agentResult.value = null;
        const startMs = Date.now();
        try {
            const result = await $fetch<{
                output: string;
                citations: any[];
                usage?: {
                    model: string;
                    promptTokens: number;
                    completionTokens: number;
                    totalTokens: number;
                    costUsd: number;
                };
            }>('/api/collection/agent-actions', { method: 'POST', body: { action, ...params } });
            agentResult.value = { output: result.output, citations: result.citations };
            if (result.usage) {
                addGeminiUsage({
                    model: result.usage.model,
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                    totalTokens: result.usage.totalTokens,
                    costUsd: result.usage.costUsd,
                    latencyMs: Date.now() - startMs,
                    timestamp: new Date().toISOString(),
                    label: action,
                });
            }
        } catch (e: any) {
            agentResult.value = {
                output: e.data?.statusMessage || e.message || 'Agent action failed',
                citations: [],
            };
        } finally {
            agentLoading.value = false;
        }
    }

    function selectEntity(neid: string | null): void {
        selectedEntityNeid.value = neid;
    }

    function focusDocument(neid: string | null): void {
        selectedDocumentNeid.value = neid;
        if (neid) activeTab.value = 'overview';
    }

    function setTab(tab: WorkspaceTab): void {
        activeTab.value = tab;
    }

    function resolveEntityName(neid: string): string {
        const entity = collection.value.entities.find((e) => e.neid === neid);
        if (entity) return entity.name;
        const doc = collection.value.documents.find((d) => d.neid === neid);
        if (doc) return doc.title;
        return neid;
    }

    return {
        collection: computed(() => collection.value),
        activeTab: computed(() => activeTab.value),
        selectedEntityNeid: computed(() => selectedEntityNeid.value),
        selectedDocumentNeid: computed(() => selectedDocumentNeid.value),
        selectedEntity,
        selectedEntityRelationships,
        selectedEntityEvents,
        selectedEntityPropertySeries,
        isReady,
        isLoading,
        rebuilding: computed(() => rebuilding.value),
        rebuildSteps: computed(() => rebuildSteps.value),
        enriching: computed(() => enriching.value),
        agentLoading: computed(() => agentLoading.value),
        agentResult: computed(() => agentResult.value),
        mcpLog: computed(() => mcpLog.value),
        geminiLog: computed(() => geminiLog.value),
        documents,
        entities,
        events,
        relationships,
        propertySeries,
        meta,
        documentEntities,
        enrichedEntities,
        agreements,
        flavorCounts,
        relationshipTypeCounts,
        topEntities,
        topEvents,
        relationshipHighlights,
        trustCoverageSummary,
        keyCoverageNotes,
        collectionSummary,
        recommendedActions,
        contextualAgentPrompts,
        bootstrap,
        rebuild,
        enrich,
        fetchPropertyHistory,
        runAgentAction,
        addGeminiUsage,
        selectEntity,
        focusDocument,
        setTab,
        resolveEntityName,
    };
}
