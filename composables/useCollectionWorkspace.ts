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
