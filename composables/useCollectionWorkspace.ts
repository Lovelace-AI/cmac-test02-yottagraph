import { ref, computed } from 'vue';
import type {
    CollectionState,
    EntityRecord,
    EventRecord,
    RelationshipRecord,
    PropertySeriesRecord,
    WorkspaceTab,
} from '~/utils/collectionTypes';
import { emptyCollectionState } from '~/utils/collectionTypes';

const collection = ref<CollectionState>(emptyCollectionState());
const activeTab = ref<WorkspaceTab>('overview');
const selectedEntityNeid = ref<string | null>(null);
const rebuilding = ref(false);
const enriching = ref(false);
const agentLoading = ref(false);
const agentResult = ref<{ output: string; citations: any[] } | null>(null);

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

    const flavorCounts = computed(() => {
        const counts = new Map<string, number>();
        for (const e of collection.value.entities) {
            counts.set(e.flavor, (counts.get(e.flavor) || 0) + 1);
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
        try {
            const data = await $fetch<CollectionState>('/api/collection/rebuild', {
                method: 'POST',
            });
            collection.value = data;
        } catch (e: any) {
            collection.value.status = 'error';
            collection.value.error = e.data?.statusMessage || e.message || 'Rebuild failed';
        } finally {
            rebuilding.value = false;
        }
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
        try {
            const result = await $fetch<{ output: string; citations: any[] }>(
                '/api/collection/agent-actions',
                { method: 'POST', body: { action, ...params } }
            );
            agentResult.value = result;
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
        selectedEntity,
        selectedEntityRelationships,
        selectedEntityEvents,
        isReady,
        isLoading,
        rebuilding: computed(() => rebuilding.value),
        enriching: computed(() => enriching.value),
        agentLoading: computed(() => agentLoading.value),
        agentResult: computed(() => agentResult.value),
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
        bootstrap,
        rebuild,
        enrich,
        fetchPropertyHistory,
        runAgentAction,
        selectEntity,
        setTab,
        resolveEntityName,
    };
}
