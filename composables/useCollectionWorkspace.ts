import { ref, computed, watch } from 'vue';
import type {
    CollectionState,
    EntityRecord,
    EventRecord,
    LineageEvidenceMode,
    LineageInvestigationProgressEntry,
    LineageInvestigationRelationship,
    LineageInvestigationResult,
    LineageResultViewModel,
    LineageSupportingDocument,
    Project,
    RelationshipRecord,
    PropertySeriesRecord,
    WorkspaceTab,
} from '~/utils/collectionTypes';
import { emptyCollectionState, countProjectSeedSources } from '~/utils/collectionTypes';
import { mapCollectionToOverviewViewModel } from '~/utils/overviewBriefing';
import { projectCollapsedOrganizationLineage } from '~/utils/enrichmentLineage';
import type {
    AgentTraceEntry,
    AgentRunDetails,
    AskYottaHistoryTurn,
    AskYottaPipelineResponse,
    AgentPipelineStep,
} from '~/utils/agentPipeline';

export interface RebuildStep {
    step: number;
    status: 'pending' | 'working' | 'completed';
    label: string;
    detail?: string;
    durationMs?: number;
    startedAtMs?: number;
}

export interface McpLogEntry {
    id: number;
    tool: string;
    targetId?: string;
    argsSummary: string;
    responseSummary: string;
    durationMs: number;
    status: 'success' | 'error';
    timestamp: string;
    args?: Record<string, unknown>;
    response?: unknown;
    errorCategory?: 'gateway_502' | 'gateway_http' | 'timeout' | 'session' | 'network' | 'unknown';
    statusCode?: number;
    error?: {
        name?: string;
        message: string;
        stack?: string;
        code?: string;
        cause?: string;
        raw?: unknown;
    };
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

export type EnrichmentInsightKind =
    | 'corporate_lineage'
    | 'broader_activity'
    | 'event_timeline'
    | 'people_affiliation';

export interface EnrichmentInsightCard {
    id: string;
    kind: EnrichmentInsightKind;
    title: string;
    subtitle: string;
    anchorNeid?: string;
    anchorName?: string;
    documentContext: string;
    kgContext: string;
    evidence: string[];
    askPrompt: string;
    relatedEntityNeids: string[];
    relatedEventNeids: string[];
    plainSummary?: string;
    relevanceLabel?: 'same_deal' | 'adjacent' | 'broader';
    sizeLabel?: string | null;
    totalEventCount?: number;
    outsideEventCount?: number;
    sameDealEventCount?: number;
    participantCount?: number;
    counterpartyCount?: number;
    dateRangeLabel?: string | null;
    relationshipDateLabel?: string | null;
}

interface EnrichmentLanguageCard {
    id: string;
    plainSummary: string;
    relevanceLabel: 'same_deal' | 'adjacent' | 'broader';
    sizeLabel?: string | null;
}

export interface WatchlistTheme {
    themeLabel: string;
    whyItMatters: string;
    supportingEvents: string[];
    participantsToWatch: string[];
    suggestedAskPrompt: string;
}

export interface EnrichmentNewsItem {
    articleNeid: string;
    title?: string;
    date?: string;
    description?: string;
    sourceName?: string;
    url?: string;
    urlHost?: string;
    confidence?: number | null;
    sentiment?: number | null;
    citations: string[];
    linkedEntityNames: string[];
}

export interface EnrichmentNewsGroup {
    anchorNeid: string;
    items: EnrichmentNewsItem[];
}

export interface FilteredNewsItem extends EnrichmentNewsItem {
    canonicalArticleKey?: string;
    topics: string[];
    rawTopics?: string[];
    matchedCategories?: string[];
    anchorNeid?: string;
    matchedVia?: 'topic' | 'keyword';
    snippetQuality?: 'summary' | 'citation' | 'fallback';
}

export interface FilteredNewsGroup {
    anchorNeid: string;
    items: FilteredNewsItem[];
    matchedCategories: string[];
}

export interface GraphMatchedEntity {
    neid: string;
    name: string;
    isPrimary: boolean;
}

export type NewsSortMode =
    | 'strongest_graph_connection'
    | 'most_graph_entities'
    | 'most_recent'
    | 'highest_relevance';

export type NewsViewMode = 'deduped' | 'grouped';

export interface DedupedNewsArticle {
    canonicalArticleKey: string;
    articleNeid: string;
    title?: string;
    date?: string;
    description?: string;
    sourceName?: string;
    url?: string;
    urlHost?: string;
    confidence?: number | null;
    sentiment?: number | null;
    citations: string[];
    topics: string[];
    matchedCategories: string[];
    matchedVia: Array<'topic' | 'keyword'>;
    snippetQuality: 'summary' | 'citation' | 'fallback';
    primaryEntity: GraphMatchedEntity | null;
    secondaryEntities: GraphMatchedEntity[];
    matchedEntities: GraphMatchedEntity[];
    uniqueGraphMentionCount: number;
    alsoLinkedCount: number;
    strongestMatchScore: number;
    matchReason: string;
}

export interface EnrichableExtractedEntityGroup {
    key: string;
    label: string;
    entities: EntityRecord[];
}

export interface EnrichmentEconomicSignal {
    eventNeid: string;
    title: string;
    date?: string;
    category?: string;
    description?: string;
    source: 'micro' | 'macro';
    anchorNeid?: string;
}

export interface EnrichmentRelatedDealInsight {
    id: string;
    title: string;
    summary: string;
    anchorNeid?: string;
    anchorName?: string;
    articleCount: number;
    relatedCusips: string[];
    evidence: string[];
    articles: Array<{
        articleNeid: string;
        title?: string;
        url?: string;
        urlHost?: string;
        sourceName?: string;
        sentiment?: number | null;
    }>;
}

function normalizeRelationshipType(type: string): string {
    return type.replace(/^schema::relationship::/, '');
}

function normalizeNeid(neid: string): string {
    const value = String(neid ?? '').trim();
    const unpadded = value.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function sanitizeLineageInvestigation(
    value?: Partial<LineageInvestigationResult> | null
): LineageInvestigationResult {
    const progressLog = Array.isArray(value?.progressLog) ? value.progressLog : [];
    return {
        status: value?.status ?? 'idle',
        startedAt: value?.startedAt,
        completedAt: value?.completedAt,
        roots: Array.isArray(value?.roots) ? value.roots : [],
        scannedRelationshipTypes: Array.isArray(value?.scannedRelationshipTypes)
            ? value.scannedRelationshipTypes
            : [],
        matchedRelationshipTypes: Array.isArray(value?.matchedRelationshipTypes)
            ? value.matchedRelationshipTypes
            : [],
        scannedOrganizations:
            typeof value?.scannedOrganizations === 'number' ? value.scannedOrganizations : 0,
        traversedHops: typeof value?.traversedHops === 'number' ? value.traversedHops : 0,
        relationships: Array.isArray(value?.relationships) ? value.relationships : [],
        chains: Array.isArray(value?.chains) ? value.chains : [],
        rootsProcessed: typeof value?.rootsProcessed === 'number' ? value.rootsProcessed : 0,
        organizationsDiscovered:
            typeof value?.organizationsDiscovered === 'number'
                ? value.organizationsDiscovered
                : typeof value?.scannedOrganizations === 'number'
                  ? value.scannedOrganizations
                  : 0,
        queueRemaining: typeof value?.queueRemaining === 'number' ? value.queueRemaining : 0,
        progressLog: progressLog.filter((entry): entry is LineageInvestigationProgressEntry =>
            Boolean(entry && typeof entry === 'object')
        ),
        error: value?.error,
    };
}

function countRecordProperties(record: { properties?: Record<string, unknown> }): number {
    return Object.keys(record.properties ?? {}).length;
}

function toCanonicalArticleKey(item: FilteredNewsItem): string {
    if (item.canonicalArticleKey?.trim()) return item.canonicalArticleKey.trim().toLowerCase();
    if (item.url?.trim()) return `url:${item.url.trim().toLowerCase()}`;
    if (item.articleNeid?.trim()) return `neid:${item.articleNeid.trim().toLowerCase()}`;
    const fallbackTitle = item.title?.trim().toLowerCase() || 'unknown-article';
    return `fallback:${fallbackTitle}`;
}

function parseDateMs(value?: string): number | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.getTime();
}

function snippetQualityWeight(value?: 'summary' | 'citation' | 'fallback'): number {
    if (value === 'summary') return 2;
    if (value === 'citation') return 1;
    return 0;
}

const INITIAL_STEPS: RebuildStep[] = [
    {
        step: 1,
        status: 'pending',
        label: 'Loading Seed Context',
        detail: 'Traversing seed context...',
    },
    {
        step: 2,
        status: 'pending',
        label: 'Confirming Entity Profiles',
        detail: 'Confirming entity profiles...',
    },
    {
        step: 3,
        status: 'pending',
        label: 'Loading Seed Events',
        detail: 'Loading seed events...',
    },
    {
        step: 4,
        status: 'pending',
        label: 'Linking Graph',
        detail: 'Linking graph...',
    },
    {
        step: 5,
        status: 'pending',
        label: 'Loading Property History',
        detail: 'Loading property history...',
    },
    {
        step: 6,
        status: 'pending',
        label: 'Preparing Workspace',
        detail: 'Preparing workspace...',
    },
];

const collection = ref<CollectionState>(emptyCollectionState());
const activeTab = ref<WorkspaceTab>('overview');
const selectedEntityNeid = ref<string | null>(null);
const selectedEventNeid = ref<string | null>(null);
const rebuilding = ref(false);
const rebuildSteps = ref<RebuildStep[]>(INITIAL_STEPS.map((s) => ({ ...s })));
const enriching = ref(false);
const enrichmentAnchorNeids = ref<string[]>([]);
const enrichmentIncludeEvents = ref(true);
const enrichmentLastRun = ref<{
    anchorNeids: string[];
    hops: 1;
    includeEvents: boolean;
    ranAt: string;
} | null>(null);
const agentLoading = ref(false);
type AgentAnswerResult = AskYottaPipelineResponse;
const agentResult = ref<AgentAnswerResult | null>(null);
const agentStepsLive = ref<AgentPipelineStep[] | null>(null);
const agentRunDetails = ref<AgentRunDetails>({});
const agentTraceLive = ref<AgentTraceEntry[]>([]);
type AskYottaAnswerResult = AskYottaPipelineResponse;
interface AskYottaThreadTurn {
    id: string;
    question: string;
    answer: AskYottaAnswerResult | null;
    status: 'loading' | 'completed' | 'error';
    steps: AgentPipelineStep[];
    agentDetails: AgentRunDetails;
    askedAt: string;
    completedAt?: string;
}
const askYottaLoading = ref(false);
const askYottaThread = ref<AskYottaThreadTurn[]>([]);
const mcpLog = ref<McpLogEntry[]>([]);
const geminiLog = ref<GeminiUsageEntry[]>([]);
let _geminiIdCounter = 0;
const enrichmentWatchlistThemes = ref<WatchlistTheme[]>([]);
const enrichmentWatchlistLoading = ref(false);
const enrichmentWatchlistError = ref<string | null>(null);
const enrichmentWatchlistGeneratedAt = ref<string | null>(null);
const lineageInvestigation = ref<LineageInvestigationResult>(sanitizeLineageInvestigation());
const lineageDebugEntries = ref<LineageInvestigationProgressEntry[]>([]);
const enrichmentLanguageByInsightId = ref<Record<string, EnrichmentLanguageCard>>({});
const enrichmentLanguageLoading = ref(false);
const enrichmentLanguageError = ref<string | null>(null);
const enrichmentNews = ref<EnrichmentNewsGroup[]>([]);
const enrichmentNewsLoading = ref(false);
const enrichmentNewsError = ref<string | null>(null);
const filteredNews = ref<FilteredNewsGroup[]>([]);
const filteredNewsCategories = ref<string[]>([]);
const filteredNewsLoading = ref(false);
const filteredNewsRefreshing = ref(false);
const filteredNewsInitialized = ref(false);
const filteredNewsError = ref<string | null>(null);
const enrichmentEconomicSignals = ref<{
    micro: EnrichmentEconomicSignal[];
    macro: EnrichmentEconomicSignal[];
}>({ micro: [], macro: [] });
const enrichmentEconomicLoading = ref(false);
const enrichmentEconomicError = ref<string | null>(null);
const enrichmentRelatedDeals = ref<EnrichmentRelatedDealInsight[]>([]);
const enrichmentRelatedDealsLoading = ref(false);
const enrichmentRelatedDealsError = ref<string | null>(null);

function mergeBootstrapStateWithProject(
    state: CollectionState,
    project: Project | null
): CollectionState {
    if (!project || state.status === 'ready') return state;
    const seedSourceCount = countProjectSeedSources(project);
    const normalizedStateDocs = new Map(
        state.documents.map((doc) => [normalizeNeid(doc.neid), doc])
    );
    const seededDocs = (project.seedDocuments ?? []).map((doc) => {
        const normalized = normalizeNeid(doc.neid);
        return normalizedStateDocs.get(normalized) ?? doc;
    });
    const documents = state.documents.length ? state.documents : seededDocs;
    return {
        ...state,
        meta: {
            ...state.meta,
            projectId: project.id,
            name: project.name,
            description: project.description,
            documentCount: seedSourceCount || state.meta.documentCount,
        },
        documents,
    };
}

function gatewayPromptForAction(
    action: string,
    params?: { entityNeid?: string; question?: string },
    resolveName?: (neid: string) => string
): string {
    if (action === 'summarize_collection') {
        return 'Give me a grounded executive brief of this collection in plain English. Explain the core process or deal, the most consequential organizations, instruments, and events, and why they matter. Do not just enumerate entities or dates. Do not include recommendations or suggested next steps.';
    }
    if (action === 'explain_entity' && params?.entityNeid) {
        if (params?.question?.trim()) return params.question.trim();
        const label = resolveName?.(params.entityNeid) || params.entityNeid;
        return `Explain the role of ${label} in this collection, including evidence and what to verify next.`;
    }
    if (action === 'compare_contexts') {
        return 'Compare document-derived context versus enriched context, and explain what changes in interpretation.';
    }
    if (action === 'recommend_anchors') {
        return 'Recommend the best enrichment anchors from the current collection and explain why each is high-value.';
    }
    if (action === 'recommend_curation_adjustments') {
        return (
            params?.question?.trim() ||
            'Review the current curated one-hop enrichment strategy and recommend any include/exclude changes without changing the underlying graph automatically.'
        );
    }
    if (action === 'answer_question') {
        return (
            params?.question?.trim() ||
            'Answer the analyst question using grounded collection evidence.'
        );
    }
    return params?.question?.trim() || 'Provide a grounded analysis of this collection.';
}

function mapAskYottaHistory(thread: AskYottaThreadTurn[], limit = 3): AskYottaHistoryTurn[] {
    return thread
        .filter((turn) => turn.answer?.output?.trim())
        .slice(-limit)
        .flatMap((turn) => [
            { role: 'user' as const, text: turn.question.trim() },
            { role: 'assistant' as const, text: turn.answer?.output?.trim() || '' },
        ])
        .filter((turn) => turn.text);
}

export function useCollectionWorkspace() {
    const { activeProject } = useProjectStore();
    const isReady = computed(() => collection.value.status === 'ready');
    const isLoading = computed(() => rebuilding.value || collection.value.status === 'loading');
    function pluralizeFlavorLabel(flavor: string, count: number): string {
        const normalized = flavor.replace(/^schema::flavor::/, '').replace(/_/g, ' ');
        if (count === 1) return `1 ${normalized}`;
        const lower = normalized.toLowerCase();
        const plural =
            lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('ch')
                ? `${normalized}es`
                : lower.endsWith('y') && !/[aeiou]y$/i.test(lower)
                  ? `${normalized.slice(0, -1)}ies`
                  : `${normalized}s`;
        return `${count} ${plural}`;
    }
    function buildProjectSeedSummary(): string {
        if (!activeProject.value) return 'project seeds';
        const totalSeedCount = activeProject.value.seedNeids?.length ?? 0;
        if (totalSeedCount === 0) return 'project seeds';

        const flavorCounts = new Map<string, number>();
        const accountedNeids = new Set<string>();

        for (const entity of activeProject.value.seedEntities ?? []) {
            const neid = String(entity.neid ?? '').trim();
            const flavor = String(entity.flavor ?? '').trim() || 'entity';
            flavorCounts.set(flavor, (flavorCounts.get(flavor) ?? 0) + 1);
            if (neid) accountedNeids.add(neid);
        }
        for (const doc of activeProject.value.seedDocuments ?? []) {
            const neid = String(doc.neid ?? '').trim();
            if (neid && !accountedNeids.has(neid)) {
                flavorCounts.set('document', (flavorCounts.get('document') ?? 0) + 1);
                accountedNeids.add(neid);
            }
        }
        const unaccounted = (activeProject.value.seedNeids ?? []).filter(
            (neid) => !accountedNeids.has(String(neid ?? '').trim())
        ).length;
        if (unaccounted > 0) {
            flavorCounts.set('source', (flavorCounts.get('source') ?? 0) + unaccounted);
        }

        const parts = Array.from(flavorCounts.entries()).map(([flavor, count]) =>
            pluralizeFlavorLabel(flavor, count)
        );
        if (!parts.length) return `${totalSeedCount} seed sources`;
        return `${totalSeedCount} seed source${totalSeedCount === 1 ? '' : 's'} (${parts.join(', ')})`;
    }
    function projectRequestPayload() {
        if (!activeProject.value) return null;
        const projectType = activeProject.value.type;
        const entitySeedNeids = (activeProject.value.seedEntities ?? [])
            .map((entity) => String(entity?.neid ?? '').trim())
            .filter(Boolean);
        const documentSeedNeids = (activeProject.value.seedDocuments ?? [])
            .map((doc) => String(doc?.neid ?? '').trim())
            .filter(Boolean);
        const projectSeedNeidsRaw =
            projectType === 'entity' && entitySeedNeids.length
                ? entitySeedNeids
                : projectType === 'document' && documentSeedNeids.length
                  ? documentSeedNeids
                  : [
                        ...new Set([
                            ...(activeProject.value.seedNeids ?? []),
                            ...entitySeedNeids,
                            ...documentSeedNeids,
                        ]),
                    ];
        const projectSeedNeids = [
            ...new Set(projectSeedNeidsRaw.map((neid) => normalizeNeid(neid))),
        ];
        return {
            projectId: activeProject.value.id,
            projectType,
            seedNeids: projectSeedNeids,
            seedSourceCount: countProjectSeedSources(activeProject.value),
            project: {
                name: activeProject.value.name,
                description: activeProject.value.description,
                type: activeProject.value.type,
                seedDocuments: activeProject.value.seedDocuments,
                seedEntities: activeProject.value.seedEntities,
            },
        };
    }

    const documents = computed(() => collection.value.documents);
    const entities = computed(() => collection.value.entities);
    const events = computed(() => collection.value.events);
    const relationships = computed(() => collection.value.relationships);
    const strictDocumentNeidSet = computed(() => {
        const seedNeids = new Set<string>();
        for (const neid of activeProject.value?.seedNeids ?? []) {
            const raw = String(neid ?? '').trim();
            if (!raw) continue;
            seedNeids.add(normalizeNeid(raw));
        }
        for (const doc of activeProject.value?.seedDocuments ?? []) {
            const raw = String(doc.neid ?? '').trim();
            if (!raw) continue;
            seedNeids.add(normalizeNeid(raw));
        }
        for (const entity of activeProject.value?.seedEntities ?? []) {
            const raw = String(entity.neid ?? '').trim();
            if (!raw) continue;
            seedNeids.add(normalizeNeid(raw));
        }
        if (seedNeids.size > 0) return seedNeids;
        return new Set(collection.value.documents.map((document) => normalizeNeid(document.neid)));
    });
    const hasStrictDocumentSource = (sourceDocuments: string[] | undefined): boolean =>
        Array.isArray(sourceDocuments) &&
        sourceDocuments.some((docNeid) => strictDocumentNeidSet.value.has(normalizeNeid(docNeid)));
    const hasRelationshipCitationEvidence = (relationship: RelationshipRecord): boolean =>
        Array.isArray(relationship.citations) && relationship.citations.length > 0;
    const hasStrictRelationshipEvidence = (relationship: RelationshipRecord): boolean =>
        (relationship.sourceDocumentNeid
            ? strictDocumentNeidSet.value.has(normalizeNeid(relationship.sourceDocumentNeid))
            : false) || hasRelationshipCitationEvidence(relationship);
    const propertySeries = computed(() => strictDocumentPropertySeries.value);
    const meta = computed(() => collection.value.meta);
    const extractedPropertyCount = computed(() => {
        const documentEventPropertyCount = collection.value.events
            .filter((event) => event.origin === 'document')
            .reduce((sum, event) => sum + Object.keys(event.properties ?? {}).length, 0);
        return entityPropertyCount.value + documentEventPropertyCount;
    });
    const propertyBearingRecordCount = computed(() => {
        const propertyBearingEventCount = collection.value.events.filter(
            (event) => event.origin === 'document' && Object.keys(event.properties ?? {}).length > 0
        ).length;
        return propertyBearingEntityCount.value + propertyBearingEventCount;
    });
    const entityPropertyCount = computed(() =>
        documentEntities.value.reduce(
            (sum, entity) => sum + Object.keys(entity.properties ?? {}).length,
            0
        )
    );
    const propertyBearingEntityCount = computed(
        () =>
            new Set(
                documentEntities.value
                    .filter((entity) => Object.keys(entity.properties ?? {}).length > 0)
                    .map((entity) => entity.neid)
            ).size
    );

    const documentEntities = computed(() =>
        collection.value.entities.filter(
            (entity) =>
                strictDocumentNeidSet.value.has(normalizeNeid(entity.neid)) ||
                entity.origin === 'document'
        )
    );
    const enrichedEntities = computed(() =>
        collection.value.entities.filter((e) => e.origin === 'enriched')
    );
    const enrichedEntitiesDegree1 = computed(() =>
        enrichedEntities.value.filter((entity) => (entity.enrichmentDepth ?? 1) <= 1)
    );
    const enrichedEntitiesDegree2 = computed(() =>
        enrichedEntities.value.filter((entity) => (entity.enrichmentDepth ?? 2) <= 2)
    );
    const documentEvents = computed(() =>
        collection.value.events.filter(
            (eventItem) =>
                eventItem.extractedSeed !== false ||
                hasStrictDocumentSource(eventItem.sourceDocuments)
        )
    );
    const enrichedEvents = computed(() =>
        collection.value.events.filter(
            (eventItem) =>
                eventItem.extractedSeed === false ||
                !hasStrictDocumentSource(eventItem.sourceDocuments)
        )
    );
    const enrichedEventsDegree1 = computed(() =>
        enrichedEvents.value.filter((eventItem) => (eventItem.enrichmentDepth ?? 1) <= 1)
    );
    const enrichedEventsDegree2 = computed(() =>
        enrichedEvents.value.filter((eventItem) => (eventItem.enrichmentDepth ?? 2) <= 2)
    );
    const documentRelationships = computed(() =>
        collection.value.relationships.filter(
            (relationship) =>
                relationship.origin === 'document' || hasStrictRelationshipEvidence(relationship)
        )
    );
    const enrichedRelationships = computed(() =>
        collection.value.relationships.filter((relationship) => relationship.origin === 'enriched')
    );
    const enrichedRelationshipsDegree1 = computed(() =>
        enrichedRelationships.value.filter(
            (relationship) => (relationship.enrichmentDepth ?? 1) <= 1
        )
    );
    const enrichedRelationshipsDegree2 = computed(() =>
        enrichedRelationships.value.filter(
            (relationship) => (relationship.enrichmentDepth ?? 2) <= 2
        )
    );
    const documentAgreements = computed(() =>
        documentEntities.value.filter((entity) => entity.flavor === 'legal_agreement')
    );
    const entityNeidSet = computed(
        () => new Set(collection.value.entities.map((entity) => entity.neid))
    );
    const enrichmentDocumentGraphRelationships = computed(() =>
        documentRelationships.value.filter(
            (relationship) =>
                entityNeidSet.value.has(relationship.sourceNeid) &&
                entityNeidSet.value.has(relationship.targetNeid)
        )
    );
    const enrichmentExpandedGraphRelationships = computed(() =>
        collection.value.relationships.filter(
            (relationship) =>
                entityNeidSet.value.has(relationship.sourceNeid) &&
                entityNeidSet.value.has(relationship.targetNeid)
        )
    );
    const enrichmentGraphEntityNeids = computed(
        () =>
            new Set([
                ...documentEntities.value.map((entity) => entity.neid),
                ...enrichedEntitiesDegree1.value.map((entity) => entity.neid),
            ])
    );
    const enrichmentGraphEntities = computed(() =>
        collection.value.entities.filter((entity) =>
            enrichmentGraphEntityNeids.value.has(entity.neid)
        )
    );
    const enrichmentGraphRelationships = computed(() =>
        collection.value.relationships.filter((relationship) => {
            if (
                !enrichmentGraphEntityNeids.value.has(relationship.sourceNeid) ||
                !enrichmentGraphEntityNeids.value.has(relationship.targetNeid)
            ) {
                return false;
            }
            return (
                relationship.origin === 'document' ||
                (relationship.origin === 'enriched' && (relationship.enrichmentDepth ?? 1) <= 1)
            );
        })
    );
    const collapsedExpandedProjection = computed(() =>
        projectCollapsedOrganizationLineage(
            collection.value.entities,
            enrichmentExpandedGraphRelationships.value
        )
    );
    const enrichmentDocumentGraphEntities = computed(() => documentEntities.value);
    const enrichmentExpandedGraphEntities = computed(
        () => collapsedExpandedProjection.value.entities
    );
    const enrichmentCollapsedOrganizationCount = computed(
        () => collapsedExpandedProjection.value.collapsedOrganizationCount
    );
    const enrichmentCollapsedRepresentativeByNeid = computed(() =>
        Object.fromEntries(collapsedExpandedProjection.value.representativeByNeid.entries())
    );
    const enrichmentExpandedGraphRelationshipsCollapsed = computed(
        () => collapsedExpandedProjection.value.relationships
    );
    const enrichmentSupersetGraphEntities = computed(() => enrichmentExpandedGraphEntities.value);
    const enrichmentSupersetGraphRelationships = computed(
        () => enrichmentExpandedGraphRelationshipsCollapsed.value
    );
    const hasEnrichmentRun = computed(
        () =>
            Boolean(enrichmentLastRun.value) ||
            enrichedEntities.value.length > 0 ||
            enrichedRelationships.value.length > 0 ||
            outsideEvents.value.length > 0
    );
    const INSIGHT_NOISE_ANCHORS = new Set<string>([
        '08749664511655725314', // The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch
        '08883522583676895375', // United States Department of the Treasury
        '07404718453994080710', // The Treasury
        '08378183269956851171', // United States
        '04648605347073135218', // New York
        '05716789654794197421', // Dallas
        '01054548445358605934', // Trenton, New Jersey
    ]);
    const LINEAGE_PRIORITY = new Map<string, number>([
        ['04824620677155774613', 100], // REPUBLIC NATIONAL BANK OF NEW YORK
        ['06967031221082229818', 98], // UNITED JERSEY BANK/CENTRAL,
        ['06157989400122873900', 95], // HSBC Bank USA, National Association
        ['05384086983174826493', 92], // Bank of New York Mellon Corporation (BNY Mellon)
    ]);
    const RELATED_DEAL_PRIORITY = new Map<string, number>([
        ['05384086983174826493', 110], // Bank of New York Mellon Corporation (BNY Mellon)
        ['06157989400122873900', 105], // HSBC Bank USA, National Association
        ['04824620677155774613', 100], // REPUBLIC NATIONAL BANK OF NEW YORK
        ['05477621199116204617', 95], // Orrick, Herrington & Sutcliffe, LLP
        ['02080889041561724035', 85], // Orrick
        ['06967031221082229818', 80], // UNITED JERSEY BANK/CENTRAL,
        ['06471256961308361850', 75], // New Jersey Housing and Mortgage Finance Agency
    ]);
    const EVENT_TIMELINE_PRIORITY = new Map<string, number>([
        ['06157989400122873900', 100], // HSBC Bank USA, National Association
        ['06967031221082229818', 95], // UNITED JERSEY BANK/CENTRAL,
        ['06471256961308361850', 90], // New Jersey Housing and Mortgage Finance Agency
    ]);
    const PEOPLE_PRIORITY_BY_NAME = new Map<string, number>([
        ['ARTHUR KLEIN', 100],
        ['JOSEPH E. LUDES', 95],
    ]);
    const entityByNeid = computed(
        () => new Map(collection.value.entities.map((entity) => [entity.neid, entity] as const))
    );
    const documentEntityNeids = computed(() => new Set(documentEntities.value.map((e) => e.neid)));
    const strictDocumentPropertySeries = computed(() =>
        collection.value.propertySeries.filter((series) =>
            documentEntityNeids.value.has(series.neid)
        )
    );
    const eventCountByEntityNeid = computed(() => {
        const counts = new Map<string, number>();
        for (const eventItem of collection.value.events) {
            for (const participantNeid of eventItem.participantNeids) {
                counts.set(participantNeid, (counts.get(participantNeid) ?? 0) + 1);
            }
        }
        return counts;
    });
    const outsideEvents = computed(() => enrichedEvents.value);
    const derivePropertyCount = (entities: EntityRecord[], events: EventRecord[]): number =>
        entities.reduce((sum, entity) => sum + countRecordProperties(entity), 0) +
        events.reduce((sum, eventItem) => sum + countRecordProperties(eventItem), 0);
    const enrichmentCounts = computed(() => {
        const fallbackDocument = {
            entityCount: documentEntities.value.length,
            eventCount: documentEvents.value.length,
            relationshipCount: documentRelationships.value.length,
            propertyCount: extractedPropertyCount.value,
        };
        const fallbackRaw1Degree = {
            entityCount: enrichedEntitiesDegree1.value.length,
            eventCount: enrichedEventsDegree1.value.length,
            relationshipCount: enrichedRelationshipsDegree1.value.length,
            propertyCount: derivePropertyCount(
                enrichedEntitiesDegree1.value,
                enrichedEventsDegree1.value
            ),
        };
        const persisted = collection.value.meta.enrichmentCounts;
        const csvBackedOneHop = collection.value.meta.rawOneHopCounts
            ? {
                  entityCount: collection.value.meta.rawOneHopCounts.entityCount,
                  eventCount: collection.value.meta.rawOneHopCounts.eventCount,
                  relationshipCount: collection.value.meta.rawOneHopCounts.relationshipCount,
                  propertyCount:
                      persisted?.kgOneHop?.propertyCount ??
                      persisted?.raw1Degree?.propertyCount ??
                      fallbackRaw1Degree.propertyCount,
              }
            : null;
        return {
            document: persisted?.document ?? fallbackDocument,
            raw1Degree: persisted?.raw1Degree ?? persisted?.degree1 ?? fallbackRaw1Degree,
            kgOneHop:
                csvBackedOneHop ??
                persisted?.kgOneHop ??
                persisted?.raw1Degree ??
                fallbackRaw1Degree,
        };
    });
    const enrichmentComparison = computed(() => {
        const kgOneHop = enrichmentCounts.value.kgOneHop ?? enrichmentCounts.value.raw1Degree;
        return {
            documentTruth: enrichmentCounts.value.document,
            kgOneHop,
            netAdditions: {
                entityCount: kgOneHop.entityCount,
                eventCount: kgOneHop.eventCount,
                relationshipCount: kgOneHop.relationshipCount,
                propertyCount: kgOneHop.propertyCount,
            },
        };
    });
    const keyQuestionEntities = computed(() =>
        documentEntities.value
            .slice()
            .sort((a, b) => {
                const aDegree = relationshipCountByEntityNeid.value.get(a.neid) ?? 0;
                const bDegree = relationshipCountByEntityNeid.value.get(b.neid) ?? 0;
                if (bDegree !== aDegree) return bDegree - aDegree;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 8)
    );
    const eventByNeid = computed(
        () =>
            new Map(
                collection.value.events.map((eventItem) => [eventItem.neid, eventItem] as const)
            )
    );
    const documentTitleByNeid = computed(
        () =>
            new Map(
                collection.value.documents.map(
                    (document) => [document.neid, document.title] as const
                )
            )
    );
    const relationshipNeidPairs = computed(() =>
        enrichmentExpandedGraphRelationships.value.map((relationship) => ({
            ...relationship,
            normalizedType: normalizeRelationshipType(relationship.type),
        }))
    );
    const relationshipCountByEntityNeid = computed(() => {
        const counts = new Map<string, number>();
        for (const relationship of collection.value.relationships) {
            counts.set(relationship.sourceNeid, (counts.get(relationship.sourceNeid) ?? 0) + 1);
            counts.set(relationship.targetNeid, (counts.get(relationship.targetNeid) ?? 0) + 1);
        }
        return counts;
    });
    const priorityScore = (priorityMap: Map<string, number>, neid: string): number =>
        priorityMap.get(neid) ?? 0;
    const personRelationshipTypes = new Set([
        'works_at',
        'board_member_of',
        'officer_of',
        'advisor_to',
        'partner_of',
    ]);
    const isNeidLike = (value: string): boolean => /^\d{16,24}$/.test(value.trim());
    const normalizeEntityLabel = (value: string): string =>
        value
            .trim()
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(
                /\b(the|inc|llc|ltd|corp|corporation|co|company|na|assoc|association|national)\b/g,
                ' '
            )
            .replace(/\s+/g, ' ')
            .trim();
    const EVENT_LINEAGE_ALIAS_TO_NEID = new Map<string, string>([
        ['united jersey bank', '06967031221082229818'],
        ['united jersey bank central', '06967031221082229818'],
        ['bank of new york', '05384086983174826493'],
        ['the bank of new york', '05384086983174826493'],
        ['bny', '05384086983174826493'],
        ['hsbc bank usa', '06157989400122873900'],
        ['hsbc bank usa national', '06157989400122873900'],
        ['republic national bank of new york', '04824620677155774613'],
    ]);
    const propertyScalarText = (value: unknown): string => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            const scalar = (value as Record<string, unknown>).value;
            return String(scalar ?? '').trim();
        }
        return String(value ?? '').trim();
    };
    const entityDisplayName = (entity: EntityRecord | undefined): string => {
        if (!entity) return '';
        const direct = String(entity.name ?? '').trim();
        if (direct && !isNeidLike(direct)) return direct;
        const props = (entity.properties ?? {}) as Record<string, unknown>;
        const candidateKeys = [
            'matched_name',
            'canonical_name',
            'resolved_name',
            'legal_name',
            'issuer_name',
            'name',
        ];
        for (const key of candidateKeys) {
            const text = propertyScalarText(props[key]);
            if (text && !isNeidLike(text)) return text;
        }
        return direct || entity.neid;
    };
    const entityByNormalizedName = computed(() => {
        const byName = new Map<string, EntityRecord>();
        for (const entity of collection.value.entities) {
            for (const candidate of [entity.name, entityDisplayName(entity)]) {
                const normalized = normalizeEntityLabel(String(candidate ?? ''));
                if (!normalized || byName.has(normalized)) continue;
                byName.set(normalized, entity);
            }
        }
        return byName;
    });
    const syntheticOrganizationEntity = (
        label: string,
        canonicalNeid: string,
        sourceDocuments: string[] = []
    ): EntityRecord => ({
        neid: canonicalNeid,
        name: label.trim(),
        flavor: 'organization',
        sourceDocuments: [...new Set(sourceDocuments)],
        origin: 'document',
        extractedSeed: true,
        properties: {
            canonical_name: { value: label.trim() },
            resolved_name: { value: label.trim() },
        },
    });
    const resolveOrganizationEntity = (
        label: string,
        sourceDocuments: string[] = []
    ): EntityRecord | undefined => {
        const normalized = normalizeEntityLabel(label);
        if (!normalized) return undefined;
        const canonicalNeid = EVENT_LINEAGE_ALIAS_TO_NEID.get(normalized);
        if (canonicalNeid) {
            const canonical = entityByNeid.value.get(canonicalNeid);
            if (canonical?.flavor === 'organization') return canonical;
            return syntheticOrganizationEntity(label, canonicalNeid, sourceDocuments);
        }
        const direct = entityByNormalizedName.value.get(normalized);
        return direct?.flavor === 'organization' ? direct : undefined;
    };
    const relationshipLabel = (type: string): string => type.replace(/_/g, ' ');
    const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
        `${count} ${count === 1 ? singular : plural}`;
    const eventYear = (eventItem: EventRecord): number => {
        const props = (eventItem.properties ?? {}) as Record<string, unknown>;
        const candidateDate =
            eventItem.date ||
            ((): string | undefined => {
                const keys = [
                    'event_date',
                    'date',
                    'schema::property::event_date',
                    'schema::property::date',
                ];
                for (const key of keys) {
                    if (!(key in props)) continue;
                    const row = props[key] as any;
                    const scalar =
                        row && typeof row === 'object' && !Array.isArray(row) ? row.value : row;
                    const text = String(scalar ?? '').trim();
                    if (text) return text;
                }
                return undefined;
            })();
        if (candidateDate) {
            const year = Number(String(candidateDate).slice(0, 4));
            if (!Number.isNaN(year) && year >= 1900 && year <= 2100) return year;
        }
        const match = eventItem.name.match(/(19|20)\d{2}/);
        return match ? Number(match[0]) : 0;
    };
    const eventDateLabel = (eventItem: EventRecord): string | null => {
        if (eventItem.date) return String(eventItem.date).slice(0, 10);
        const year = eventYear(eventItem);
        return year > 0 ? String(year) : null;
    };
    const inferEventLocation = (eventItem: EventRecord): string | null => {
        for (const participantNeid of eventItem.participantNeids) {
            const participant = entityByNeid.value.get(participantNeid);
            if (!participant) continue;
            if (participant.flavor === 'location') return entityDisplayName(participant);
        }
        const derivedLocation = eventItem.participantNeids
            .map((participantNeid) => entityDisplayName(entityByNeid.value.get(participantNeid)))
            .find((name) => /,\s*[A-Za-z]/.test(name));
        return derivedLocation || null;
    };
    const eventParticipantNames = (eventItem: EventRecord, anchorNeid?: string): string[] =>
        eventItem.participantNeids
            .filter((participantNeid) => participantNeid !== anchorNeid)
            .map((participantNeid) => entityDisplayName(entityByNeid.value.get(participantNeid)))
            .filter((name): name is string => Boolean(name))
            .slice(0, 3);
    const eventEvidenceLine = (eventItem: EventRecord, anchorNeid?: string): string => {
        const details: string[] = [];
        const date = eventDateLabel(eventItem);
        if (date) details.push(`date: ${date}`);
        const participantNames = eventParticipantNames(eventItem, anchorNeid);
        if (participantNames.length > 0)
            details.push(`participants: ${participantNames.join(', ')}`);
        const location = inferEventLocation(eventItem);
        if (location) details.push(`location: ${location}`);
        return details.length > 0 ? `${eventItem.name} (${details.join(' | ')})` : eventItem.name;
    };
    const entityDocumentGrounding = (entityNeids: string[]): string => {
        const titles = Array.from(
            new Set(
                entityNeids.flatMap((neid) => entityByNeid.value.get(neid)?.sourceDocuments ?? [])
            )
        )
            .map((docNeid) => documentTitleByNeid.value.get(docNeid) ?? docNeid)
            .filter(Boolean)
            .slice(0, 2);
        if (!titles.length)
            return 'This relationship is grounded in the extracted collection context.';
        if (titles.length === 1) return `Grounded in ${titles[0]}.`;
        return `Grounded in ${titles[0]} and ${titles[1]}.`;
    };
    const documentGroundingFromDocs = (documentNeids: string[]): string => {
        const titles = Array.from(
            new Set(
                documentNeids.map((docNeid) => documentTitleByNeid.value.get(docNeid) ?? docNeid)
            )
        )
            .filter(Boolean)
            .slice(0, 2);
        if (!titles.length) return 'Grounded in the extracted collection context.';
        if (titles.length === 1) return `Grounded in ${titles[0]}.`;
        return `Grounded in ${titles[0]} and ${titles[1]}.`;
    };
    const eventDescriptionSnippet = (eventItem: EventRecord): string | null => {
        const text = String(eventItem.description ?? '')
            .replace(/\s+/g, ' ')
            .trim();
        if (!text) return null;
        return text.length > 220 ? `${text.slice(0, 217).trimEnd()}...` : text;
    };
    const parseEventLineageSignal = (
        eventItem: EventRecord
    ): {
        predecessor: EntityRecord;
        successor: EntityRecord;
        mode: 'bank_succession' | 'beneficiary_change';
    } | null => {
        const description = String(eventItem.description ?? '').trim();
        if (!description) return null;
        const successionMatch = description.match(
            /all references to (.+?) now mean (.+?)(?:[.;]|$)/i
        );
        if (successionMatch) {
            const predecessor = resolveOrganizationEntity(
                successionMatch[1],
                eventItem.sourceDocuments
            );
            const successor = resolveOrganizationEntity(
                successionMatch[2],
                eventItem.sourceDocuments
            );
            if (
                predecessor &&
                successor &&
                predecessor.neid !== successor.neid &&
                predecessor.flavor === 'organization' &&
                successor.flavor === 'organization'
            ) {
                return { predecessor, successor, mode: 'bank_succession' };
            }
        }
        const beneficiaryMatch = description.match(
            /changed the beneficiary from (.+?) to (.+?)(?:[.;]|$)/i
        );
        if (beneficiaryMatch) {
            const predecessor = resolveOrganizationEntity(
                beneficiaryMatch[1],
                eventItem.sourceDocuments
            );
            const successor = resolveOrganizationEntity(
                beneficiaryMatch[2],
                eventItem.sourceDocuments
            );
            if (
                predecessor &&
                successor &&
                predecessor.neid !== successor.neid &&
                predecessor.flavor === 'organization' &&
                successor.flavor === 'organization'
            ) {
                return { predecessor, successor, mode: 'beneficiary_change' };
            }
        }
        return null;
    };
    const broaderActivityTheme = (items: EventRecord[]): string | null => {
        const names = items
            .map((item) => item?.name)
            .filter((name): name is string => Boolean(name));
        if (!names.length) return null;
        const locAmendmentCount = names.filter((name) => /LOC Amendment/i.test(name)).length;
        if (locAmendmentCount >= Math.min(3, names.length)) {
            return 'Most of these examples are later letter-of-credit amendments tied to the same financing relationships, not missing facts from the uploaded document set.';
        }
        const buyoutCount = names.filter((name) => /buyout|acquisition|merger/i.test(name)).length;
        if (buyoutCount >= Math.min(2, names.length)) {
            return 'These examples look like later corporate transactions involving the same participant, not new evidence about the original financing documents.';
        }
        return null;
    };
    const takeawaySentence = (value: string | null | undefined): string | null => {
        if (!value) return null;
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (!normalized) return null;
        const match = normalized.match(/^(.+?[.!?])(?:\s|$)/);
        return (match?.[1] ?? normalized).replace(/\s+/g, ' ').trim();
    };
    const eventDateRangeLabel = (items: EventRecord[]): string | null => {
        const years = items
            .map(eventYear)
            .filter((year) => year > 0)
            .sort((a, b) => a - b);
        if (!years.length) return null;
        const minYear = years[0];
        const maxYear = years[years.length - 1];
        if (minYear === maxYear) return String(minYear);
        return `${minYear} - ${maxYear}`;
    };
    const relationshipDateLabel = (relationship: RelationshipRecord): string | null => {
        const direct = relationship.recordedAt;
        if (direct) return String(direct).slice(0, 10);
        const props = (relationship.properties ?? {}) as Record<string, unknown>;
        const candidateKeys = [
            'timestamp',
            'date',
            'event_date',
            'effective_date',
            'recorded_at',
            'acquisition_date',
        ];
        for (const key of candidateKeys) {
            const value = propertyScalarText(props[key]);
            if (value) return value.slice(0, 10);
        }
        return null;
    };
    const amountKeyPattern =
        /(amount|size|notional|par|principal|purchase_price|transaction_value|deal_value|valuation|gross_earnings|proceeds)/i;
    const parseNumericAmount = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value !== 'string') return null;
        const normalized = value.replace(/[, ]/g, '').trim();
        if (!normalized) return null;
        const scaledMatch = normalized.match(
            /^\$?(-?\d+(?:\.\d+)?)([kKmMbB]|million|billion|thousand)?$/
        );
        if (scaledMatch) {
            const base = Number(scaledMatch[1]);
            if (!Number.isFinite(base)) return null;
            const unit = (scaledMatch[2] ?? '').toLowerCase();
            if (unit === 'k' || unit === 'thousand') return base * 1_000;
            if (unit === 'm' || unit === 'million') return base * 1_000_000;
            if (unit === 'b' || unit === 'billion') return base * 1_000_000_000;
            return base;
        }
        const raw = Number(normalized.replace(/[^0-9.-]/g, ''));
        return Number.isFinite(raw) ? raw : null;
    };
    const formatCompactUsd = (amount: number): string => {
        const absolute = Math.abs(amount);
        if (absolute >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
        if (absolute >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
        if (absolute >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
        return `$${Math.round(amount).toLocaleString()}`;
    };
    const propertyScalarValue = (value: unknown): unknown => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
        const row = value as Record<string, unknown>;
        if ('value' in row) return row.value;
        return value;
    };
    const maxAmountFromProperties = (
        properties: Record<string, unknown> | undefined
    ): number | null => {
        if (!properties) return null;
        let best: number | null = null;
        for (const [key, raw] of Object.entries(properties)) {
            if (!amountKeyPattern.test(key)) continue;
            const value = propertyScalarValue(raw);
            const parsed = parseNumericAmount(value);
            if (parsed === null) continue;
            if (best === null || Math.abs(parsed) > Math.abs(best)) best = parsed;
        }
        return best;
    };
    const dealSizeLabelFromContext = (
        relatedEventNeids: string[],
        relatedEntityNeids: string[]
    ): string | null => {
        let bestAmount: number | null = null;
        for (const eventNeid of relatedEventNeids) {
            const eventItem = eventByNeid.value.get(eventNeid);
            const amount = maxAmountFromProperties(eventItem?.properties);
            if (amount === null) continue;
            if (bestAmount === null || Math.abs(amount) > Math.abs(bestAmount)) bestAmount = amount;
        }
        for (const entityNeid of relatedEntityNeids) {
            const entity = entityByNeid.value.get(entityNeid);
            const amount = maxAmountFromProperties(entity?.properties);
            if (amount === null) continue;
            if (bestAmount === null || Math.abs(amount) > Math.abs(bestAmount)) bestAmount = amount;
        }
        if (bestAmount === null) return null;
        return `Largest amount signal: ${formatCompactUsd(bestAmount)}`;
    };
    const fallbackInsightSummary = (insight: EnrichmentInsightCard): string => {
        const parts = [insight.documentContext, insight.kgContext]
            .map((line) => line.trim())
            .filter(Boolean);
        return parts.join(' ');
    };
    const insightLanguage = (insightId: string) => enrichmentLanguageByInsightId.value[insightId];
    const documentPersonAffiliationKeys = computed(() => {
        const keys = new Set<string>();
        for (const relationship of documentRelationships.value) {
            const source = entityByNeid.value.get(relationship.sourceNeid);
            const target = entityByNeid.value.get(relationship.targetNeid);
            if (!source || !target) continue;
            const normalizedType = normalizeRelationshipType(relationship.type);
            if (!personRelationshipTypes.has(normalizedType)) continue;
            const sourceIsPerson = source.flavor === 'person';
            const targetIsPerson = target.flavor === 'person';
            if (!sourceIsPerson && !targetIsPerson) continue;
            const person = sourceIsPerson ? source : target;
            const organization = sourceIsPerson ? target : source;
            if (organization.flavor !== 'organization') continue;
            keys.add(`${person.neid}|${organization.neid}|${normalizedType}`);
        }
        return keys;
    });
    const lineageInsights = computed<EnrichmentInsightCard[]>(() => {
        const cards: Array<EnrichmentInsightCard & { rankScore: number }> = [];
        const seen = new Set<string>();
        for (const relationship of relationshipNeidPairs.value) {
            if (
                relationship.normalizedType !== 'successor_to' &&
                relationship.normalizedType !== 'predecessor_of'
            ) {
                continue;
            }
            const source = entityByNeid.value.get(relationship.sourceNeid);
            const target = entityByNeid.value.get(relationship.targetNeid);
            if (!source || !target) continue;
            if (source.flavor !== 'organization' || target.flavor !== 'organization') continue;

            const predecessor = relationship.normalizedType === 'successor_to' ? target : source;
            const successor = relationship.normalizedType === 'successor_to' ? source : target;
            if (
                INSIGHT_NOISE_ANCHORS.has(predecessor.neid) ||
                INSIGHT_NOISE_ANCHORS.has(successor.neid)
            ) {
                continue;
            }
            const cardKey = `${predecessor.neid}|${successor.neid}`;
            if (seen.has(cardKey)) continue;
            seen.add(cardKey);
            if (
                !documentEntityNeids.value.has(predecessor.neid) &&
                !documentEntityNeids.value.has(successor.neid)
            ) {
                continue;
            }

            const rankScore =
                priorityScore(LINEAGE_PRIORITY, predecessor.neid) * 10 +
                priorityScore(LINEAGE_PRIORITY, successor.neid) * 10 +
                (documentEntityNeids.value.has(predecessor.neid) ? 25 : 0) +
                (documentEntityNeids.value.has(successor.neid) ? 20 : 0);
            const cardId = `lineage:${cardKey}`;
            const language = insightLanguage(cardId);
            const predecessorName = entityDisplayName(predecessor);
            const successorName = entityDisplayName(successor);
            const successionDateLabel = relationshipDateLabel(relationship);
            const relatedEventNeids = collection.value.events
                .filter((eventItem) =>
                    eventItem.participantNeids.some(
                        (participantNeid) =>
                            participantNeid === predecessor.neid ||
                            participantNeid === successor.neid
                    )
                )
                .map((eventItem) => eventItem.neid);
            const anchorNeid = documentEntityNeids.value.has(predecessor.neid)
                ? predecessor.neid
                : documentEntityNeids.value.has(successor.neid)
                  ? successor.neid
                  : undefined;
            cards.push({
                id: cardId,
                kind: 'corporate_lineage',
                title: `${predecessorName} -> ${successorName}`,
                subtitle: 'Broader organization lineage context',
                anchorNeid,
                anchorName: predecessorName,
                documentContext: `${predecessorName} is part of the document collection context, and later collection-related events show ${successorName} in the successor role.`,
                kgContext: `${predecessorName} is linked to ${successorName} through successor/predecessor history in the broader graph.`,
                evidence: [
                    `${predecessorName} ${relationshipLabel(relationship.normalizedType)} ${successorName}`,
                    ...(successionDateLabel ? [`Succession date: ${successionDateLabel}`] : []),
                    entityDocumentGrounding([predecessor.neid, successor.neid]),
                ],
                askPrompt: `Explain how ${predecessorName} and ${successorName} are connected in corporate lineage, and whether that lineage changes interpretation of this collection.`,
                relatedEntityNeids: [predecessor.neid, successor.neid],
                relatedEventNeids,
                plainSummary:
                    language?.plainSummary ||
                    fallbackInsightSummary({
                        id: cardId,
                        kind: 'corporate_lineage',
                        title: '',
                        subtitle: '',
                        documentContext: `${predecessorName} appears in your document set, but the documents do not spell out who took over later.`,
                        kgContext: `${predecessorName} is linked to ${successorName} through successor/predecessor history in the broader graph.`,
                        evidence: [],
                        askPrompt: '',
                        relatedEntityNeids: [predecessor.neid, successor.neid],
                        relatedEventNeids,
                    }),
                relevanceLabel: language?.relevanceLabel ?? 'adjacent',
                sizeLabel:
                    language?.sizeLabel ??
                    dealSizeLabelFromContext(relatedEventNeids, [predecessor.neid, successor.neid]),
                totalEventCount: relatedEventNeids.length,
                relationshipDateLabel: successionDateLabel,
                rankScore,
            });
        }
        for (const eventItem of collection.value.events) {
            const signal = parseEventLineageSignal(eventItem);
            if (!signal) continue;
            const { predecessor, successor, mode } = signal;
            if (
                INSIGHT_NOISE_ANCHORS.has(predecessor.neid) ||
                INSIGHT_NOISE_ANCHORS.has(successor.neid)
            ) {
                continue;
            }
            const cardKey = `${predecessor.neid}|${successor.neid}`;
            if (seen.has(cardKey)) continue;
            seen.add(cardKey);
            if (
                !documentEntityNeids.value.has(predecessor.neid) &&
                !documentEntityNeids.value.has(successor.neid)
            ) {
                continue;
            }

            const predecessorName = entityDisplayName(predecessor);
            const successorName = entityDisplayName(successor);
            const successionDateLabel = eventDateLabel(eventItem);
            const descriptionSnippet = eventDescriptionSnippet(eventItem);
            const cardId = `lineage:${cardKey}:event:${eventItem.neid}`;
            const language = insightLanguage(cardId);
            const roleLabel =
                mode === 'beneficiary_change' ? 'beneficiary role transition' : 'bank succession';
            const rankScore =
                priorityScore(LINEAGE_PRIORITY, predecessor.neid) * 10 +
                priorityScore(LINEAGE_PRIORITY, successor.neid) * 10 +
                (documentEntityNeids.value.has(predecessor.neid) ? 35 : 0) +
                (documentEntityNeids.value.has(successor.neid) ? 30 : 0) +
                (mode === 'beneficiary_change' ? 18 : 12);

            cards.push({
                id: cardId,
                kind: 'corporate_lineage',
                title: `${predecessorName} -> ${successorName}`,
                subtitle:
                    mode === 'beneficiary_change'
                        ? 'Collection-documented beneficiary transition'
                        : 'Collection-documented bank succession',
                anchorNeid: predecessor.neid,
                anchorName: predecessorName,
                documentContext:
                    mode === 'beneficiary_change'
                        ? `${eventItem.name} records that the beneficiary role shifted from ${predecessorName} to ${successorName} within this financing structure.`
                        : `${eventItem.name} records that references to ${predecessorName} shifted to ${successorName} in the collection documents.`,
                kgContext:
                    mode === 'beneficiary_change'
                        ? `${predecessorName} and ${successorName} appear in a source-backed beneficiary change event, so this should be read as a role transition in the deal rather than generic outside enrichment.`
                        : `${predecessorName} and ${successorName} appear together in a source-backed bank succession event, even if a normalized lineage edge is missing from the broader graph.`,
                evidence: [
                    eventEvidenceLine(eventItem),
                    ...(descriptionSnippet ? [`Event description: ${descriptionSnippet}`] : []),
                    entityDocumentGrounding([predecessor.neid, successor.neid]) !==
                    'This relationship is grounded in the extracted collection context.'
                        ? entityDocumentGrounding([predecessor.neid, successor.neid])
                        : documentGroundingFromDocs(eventItem.sourceDocuments),
                ],
                askPrompt: `Explain the ${roleLabel} from ${predecessorName} to ${successorName}, and what it changes about how this collection should be interpreted.`,
                relatedEntityNeids: [predecessor.neid, successor.neid],
                relatedEventNeids: [eventItem.neid],
                plainSummary:
                    language?.plainSummary ||
                    (mode === 'beneficiary_change'
                        ? `${predecessorName}'s beneficiary role later shifted to ${successorName} in a source-backed amendment event from this collection.`
                        : `${predecessorName} was later referenced as ${successorName} in a source-backed bank succession event from this collection.`),
                relevanceLabel: language?.relevanceLabel ?? 'same_deal',
                sizeLabel:
                    language?.sizeLabel ??
                    dealSizeLabelFromContext([eventItem.neid], [predecessor.neid, successor.neid]),
                totalEventCount: 1,
                relationshipDateLabel: successionDateLabel,
                rankScore,
            });
        }
        return cards
            .sort((a, b) => b.rankScore - a.rankScore)
            .map(({ rankScore: _, ...card }) => card);
    });

    const lineageRelationshipTypeText = (normalizedType: string | null): string => {
        if (!normalizedType) return 'Predecessor / successor';
        if (normalizedType === 'successor_to') return 'Successor organization';
        if (normalizedType === 'predecessor_of') return 'Predecessor organization';
        if (normalizedType.includes('acquir') || normalizedType.includes('bought')) {
            return 'Acquisition transition';
        }
        if (normalizedType.includes('merg')) return 'Merger transition';
        if (normalizedType.includes('sold') || normalizedType.includes('sale')) {
            return 'Sale transition';
        }
        return normalizedType.replace(/_/g, ' ');
    };

    const lineageEvidenceModeLabel = (mode: LineageEvidenceMode): string => {
        if (mode === 'direct_document') return 'Direct document evidence';
        if (mode === 'event_documented') return 'Document-derived event evidence';
        if (mode === 'graph_enriched') return 'Graph-enriched relationship';
        if (mode === 'mixed') return 'Direct + inferred evidence';
        return 'Inferred lineage';
    };

    const labelForEvidenceCount = (count: number): string =>
        `${count} source ${count === 1 ? 'document' : 'documents'}`;

    const orientLineageRelationship = (
        relationship: LineageInvestigationRelationship
    ): {
        sourceEntityNeid: string;
        targetEntityNeid: string;
        normalizedType: string;
    } | null => {
        const normalizedType = normalizeRelationshipType(relationship.type);
        const sourceEntity = entityByNeid.value.get(relationship.sourceNeid);
        const targetEntity = entityByNeid.value.get(relationship.targetNeid);
        if (!sourceEntity || !targetEntity) return null;
        if (sourceEntity.flavor !== 'organization' || targetEntity.flavor !== 'organization') {
            return null;
        }
        if (normalizedType === 'successor_to') {
            return {
                sourceEntityNeid: relationship.targetNeid,
                targetEntityNeid: relationship.sourceNeid,
                normalizedType,
            };
        }
        if (normalizedType === 'predecessor_of') {
            return {
                sourceEntityNeid: relationship.sourceNeid,
                targetEntityNeid: relationship.targetNeid,
                normalizedType,
            };
        }
        if (
            normalizedType.includes('acquire') ||
            normalizedType.includes('acquisition') ||
            normalizedType.includes('bought') ||
            normalizedType.includes('purchase')
        ) {
            return {
                sourceEntityNeid: relationship.targetNeid,
                targetEntityNeid: relationship.sourceNeid,
                normalizedType,
            };
        }
        return {
            sourceEntityNeid: relationship.sourceNeid,
            targetEntityNeid: relationship.targetNeid,
            normalizedType,
        };
    };

    const lineageResults = computed<LineageResultViewModel[]>(() => {
        const investigation = sanitizeLineageInvestigation(lineageInvestigation.value);
        return Array.from(
            investigation.relationships
                .reduce((map, relationship) => {
                    const oriented = orientLineageRelationship(relationship);
                    if (!oriented) return map;
                    const key = `${oriented.sourceEntityNeid}|${oriented.targetEntityNeid}|${oriented.normalizedType}`;
                    const list = map.get(key) ?? [];
                    list.push(relationship);
                    map.set(key, list);
                    return map;
                }, new Map<string, LineageInvestigationRelationship[]>())
                .entries()
        )
            .map(([key, evidenceRows]) => {
                const [sourceEntityNeid, targetEntityNeid, normalizedRelationshipType] =
                    key.split('|');
                const sourceEntity = entityByNeid.value.get(sourceEntityNeid);
                const targetEntity = entityByNeid.value.get(targetEntityNeid);
                if (!sourceEntity || !targetEntity) return null;
                const sourceEntityName = entityDisplayName(sourceEntity) || sourceEntityNeid;
                const targetEntityName = entityDisplayName(targetEntity) || targetEntityNeid;
                const primaryStatement = `${sourceEntityName} -> ${targetEntityName}`;
                const relationshipTypeLabel = lineageRelationshipTypeText(
                    normalizedRelationshipType || null
                );
                const effectiveDateLabel =
                    evidenceRows.map((row) => row.recordedAt).find((value) => Boolean(value)) ??
                    null;
                const sourceDocumentNeids = new Set<string>();
                const addDocNeids = (values: string[]) => {
                    for (const value of values) {
                        const normalized = normalizeNeid(value);
                        if (strictDocumentNeidSet.value.has(normalized))
                            sourceDocumentNeids.add(normalized);
                    }
                };
                addDocNeids(sourceEntity.sourceDocuments);
                addDocNeids(targetEntity.sourceDocuments);
                const citationCount = evidenceRows.reduce(
                    (sum, row) => sum + (Array.isArray(row.citations) ? row.citations.length : 0),
                    0
                );
                const supportCount = Math.max(
                    sourceDocumentNeids.size,
                    citationCount,
                    evidenceRows.length
                );
                const evidenceMode: LineageEvidenceMode =
                    sourceDocumentNeids.size > 0 || citationCount > 0
                        ? 'direct_document'
                        : 'graph_enriched';
                const confidenceLabel: LineageResultViewModel['confidenceLabel'] =
                    sourceDocumentNeids.size >= 2 && evidenceRows.length >= 2
                        ? 'high'
                        : sourceDocumentNeids.size >= 1 ||
                            citationCount >= 1 ||
                            evidenceMode === 'direct_document'
                          ? 'medium'
                          : 'low';
                const confidenceReason =
                    confidenceLabel === 'high'
                        ? `High confidence from ${evidenceRows.length} corroborating relationship edges with direct source support.`
                        : confidenceLabel === 'medium'
                          ? sourceDocumentNeids.size > 0
                              ? `Moderate confidence from direct relationship evidence backed by ${labelForEvidenceCount(sourceDocumentNeids.size)}.`
                              : 'Moderate confidence from direct relationship evidence with limited corroboration.'
                          : 'Low confidence because only a small number of lineage relationships were found.';
                const supportingDocuments: LineageSupportingDocument[] = Array.from(
                    sourceDocumentNeids
                ).map((docNeid) => {
                    const document = collection.value.documents.find(
                        (item) => normalizeNeid(item.neid) === docNeid
                    );
                    return {
                        neid: docNeid,
                        title: document?.title ?? docNeid,
                        kind: document?.kind,
                        date: document?.date,
                    };
                });
                const topEvidenceAnchors = [relationshipTypeLabel];
                const supportLabel =
                    sourceDocumentNeids.size > 0
                        ? `Supported by ${labelForEvidenceCount(sourceDocumentNeids.size)}`
                        : citationCount > 0
                          ? `Supported by ${citationCount} citation${citationCount === 1 ? '' : 's'}`
                          : `Supported by ${evidenceRows.length} relationship edge${evidenceRows.length === 1 ? '' : 's'}`;
                const summarySentence = `${supportLabel}.`;
                const explanationSentence = `${relationshipTypeLabel}${effectiveDateLabel ? ` with date signal ${String(effectiveDateLabel).slice(0, 10)}` : ''}. ${lineageEvidenceModeLabel(evidenceMode)}.`;
                const groundingNotes = [
                    `Investigation matched ${evidenceRows.length} relationship edge${evidenceRows.length === 1 ? '' : 's'} for this transition.`,
                    `Relationship types scanned: ${investigation.scannedRelationshipTypes.length}.`,
                    investigation.matchedRelationshipTypes.length
                        ? `Matched lineage relationship families: ${investigation.matchedRelationshipTypes
                              .map((type) => normalizeRelationshipType(type))
                              .slice(0, 5)
                              .join(', ')}.`
                        : 'No schema-matched lineage relationship families were reported.',
                ];
                return {
                    id: `lineage-investigation:${sourceEntityNeid}:${targetEntityNeid}:${normalizedRelationshipType}`,
                    sourceEntityNeid,
                    targetEntityNeid,
                    sourceEntityName,
                    targetEntityName,
                    primaryStatement,
                    relationshipTypeLabel,
                    effectiveDateLabel: effectiveDateLabel
                        ? String(effectiveDateLabel).slice(0, 10)
                        : null,
                    supportCount,
                    supportLabel,
                    confidenceLabel,
                    confidenceReason,
                    evidenceMode,
                    evidenceModeLabel: lineageEvidenceModeLabel(evidenceMode),
                    summarySentence,
                    explanationSentence,
                    relatedEntityNeids: [sourceEntityNeid, targetEntityNeid],
                    relatedEventNeids: [],
                    topEvidenceAnchors,
                    supportingDocuments,
                    eventAnchors: [],
                    referencedEntities: [
                        {
                            neid: sourceEntityNeid,
                            name: sourceEntityName,
                            flavor: sourceEntity.flavor,
                            role: 'source',
                        },
                        {
                            neid: targetEntityNeid,
                            name: targetEntityName,
                            flavor: targetEntity.flavor,
                            role: 'target',
                        },
                    ],
                    groundingNotes,
                };
            })
            .filter((item): item is LineageResultViewModel => Boolean(item))
            .sort((a, b) => b.supportCount - a.supportCount);
    });

    const broaderActivityInsights = computed<EnrichmentInsightCard[]>(() => {
        const cards: Array<EnrichmentInsightCard & { rankScore: number; dedupeKey: string }> = [];
        const priorityAnchors = [
            '05477621199116204617', // Orrick, Herrington & Sutcliffe, LLP
            '02080889041561724035', // Orrick
            '06157989400122873900', // HSBC Bank USA, National Association
            '06967031221082229818', // UNITED JERSEY BANK/CENTRAL,
            '06471256961308361850', // New Jersey Housing and Mortgage Finance Agency
        ];
        const candidateAnchorNeids = new Set<string>([
            ...priorityAnchors,
            ...documentEntities.value.map((entity) => entity.neid),
        ]);
        for (const anchorNeid of candidateAnchorNeids) {
            const anchor = entityByNeid.value.get(anchorNeid);
            if (!anchor) continue;
            if (INSIGHT_NOISE_ANCHORS.has(anchorNeid)) continue;
            const anchorName = entityDisplayName(anchor);
            const anchorEvents = outsideEvents.value.filter((eventItem) =>
                eventItem.participantNeids.includes(anchorNeid)
            );
            if (anchorEvents.length < 2) continue;
            const eventRows = anchorEvents.slice(0, 5);
            const counterparties = new Set(
                eventRows.flatMap((eventItem) => eventParticipantNames(eventItem, anchorNeid))
            );
            const counterpartyCount = counterparties.size;
            const participantCount = new Set(
                eventRows.flatMap((eventItem) => eventItem.participantNeids)
            ).size;
            const dateRangeLabel = eventDateRangeLabel(anchorEvents);
            const cardId = `activity:${anchorNeid}`;
            const language = insightLanguage(cardId);
            const sizeLabel =
                language?.sizeLabel ??
                dealSizeLabelFromContext(
                    eventRows.map((eventItem) => eventItem.neid),
                    [anchorNeid]
                );
            const themeSummary = broaderActivityTheme(eventRows);
            const eventVolumeScore = Math.min(anchorEvents.length, 12);
            const breadthPenalty =
                anchorEvents.length > 200 ? 180 : anchorEvents.length > 80 ? 90 : 0;
            const title = themeSummary?.includes('letter-of-credit amendments')
                ? `${anchorName}: later financing amendments`
                : themeSummary?.includes('later corporate transactions')
                  ? `${anchorName}: later corporate activity`
                  : `${anchorName}: broader participant activity`;
            const subtitle = themeSummary?.includes('letter-of-credit amendments')
                ? 'Later amendments surfaced around the same financing relationships'
                : themeSummary?.includes('later corporate transactions')
                  ? 'Later corporate activity connected to this participant'
                  : 'Outside activity connected to this participant';
            const rankScore =
                priorityScore(RELATED_DEAL_PRIORITY, anchorNeid) * 10 +
                eventVolumeScore * 3 +
                Math.min(counterpartyCount, 6) +
                (documentEntityNeids.value.has(anchorNeid) ? 15 : 0) -
                breadthPenalty;
            const eventSignature = eventRows
                .map(
                    (eventItem) =>
                        `${eventItem?.name ?? 'Event'}|${eventDateLabel(eventItem) ?? ''}`
                )
                .sort((a, b) => a.localeCompare(b))
                .join('||');
            const followOnActivityContext = themeSummary?.includes('letter-of-credit amendments')
                ? `${anchorName} appears in the uploaded documents, but these examples are dated later and look like follow-on amendments to the same financing structure rather than extraction misses from the original corpus.`
                : `${anchorName} appears in your document set, so this card asks whether later platform events around the same participant look like follow-on deal activity or unrelated outside work.`;
            cards.push({
                id: cardId,
                kind: 'broader_activity',
                title,
                subtitle,
                anchorNeid,
                anchorName,
                documentContext: followOnActivityContext,
                kgContext:
                    themeSummary ??
                    (anchorEvents.length > eventRows.length
                        ? `${anchorName} is linked to ${pluralize(anchorEvents.length, 'outside event')}. This card shows ${pluralize(eventRows.length, 'example')} so you can judge whether they look like later amendments, servicing activity, or unrelated transactions.`
                        : `${anchorName} is linked to ${pluralize(anchorEvents.length, 'outside event')} and ${pluralize(counterpartyCount, 'counterparty')} in broader platform data.`),
                evidence: [
                    ...eventRows
                        .slice(0, 4)
                        .map((eventItem) => eventEvidenceLine(eventItem, anchorNeid)),
                    ...(Array.from(counterparties)
                        .slice(0, 2)
                        .map((counterparty) => `Counterparty: ${counterparty}`) ?? []),
                ],
                askPrompt: `Summarize the broader participant activity connected to ${anchorName}, then distinguish what looks transaction-related versus general external context.`,
                relatedEntityNeids: [anchorNeid],
                relatedEventNeids: eventRows.map((eventItem) => eventItem.neid),
                plainSummary:
                    language?.plainSummary ||
                    themeSummary ||
                    `${anchorName} is linked to ${anchorEvents.length} outside events in broader graph context. These examples may reflect later amendments, servicing actions, or unrelated external activity rather than the same core deal.`,
                relevanceLabel: language?.relevanceLabel ?? 'broader',
                sizeLabel,
                totalEventCount: anchorEvents.length,
                outsideEventCount: anchorEvents.length,
                counterpartyCount,
                participantCount,
                dateRangeLabel,
                rankScore,
                dedupeKey: `${themeSummary ?? 'activity'}|${counterpartyCount}|${eventSignature}`,
            });
        }
        const seen = new Set<string>();
        return cards
            .sort((a, b) => b.rankScore - a.rankScore)
            .filter((card) => {
                if (seen.has(card.dedupeKey)) return false;
                seen.add(card.dedupeKey);
                return true;
            })
            .map(({ rankScore: _, dedupeKey: __, ...card }) => card);
    });

    const eventTimelineInsights = computed<EnrichmentInsightCard[]>(() => {
        const cards: Array<EnrichmentInsightCard & { rankScore: number }> = [];
        const preferredAnchors = [
            '06157989400122873900', // HSBC Bank USA, National Association
            '06967031221082229818', // UNITED JERSEY BANK/CENTRAL,
            '06471256961308361850', // New Jersey Housing and Mortgage Finance Agency
        ];
        for (const anchorNeid of preferredAnchors) {
            const anchor = entityByNeid.value.get(anchorNeid);
            if (!anchor) continue;
            if (INSIGHT_NOISE_ANCHORS.has(anchorNeid)) continue;
            const anchorName = entityDisplayName(anchor);
            const linkedEvents = collection.value.events.filter((eventItem) =>
                eventItem.participantNeids.includes(anchorNeid)
            );
            if (linkedEvents.length < 2) continue;
            const outsideLinkedEvents = linkedEvents.filter(
                (eventItem) => !eventItem.extractedSeed
            );
            const extractedLinkedEvents = linkedEvents.filter(
                (eventItem) => eventItem.extractedSeed
            );
            if (outsideLinkedEvents.length === 0) continue;
            const orderedEvents = [...linkedEvents]
                .sort((a, b) => eventYear(a) - eventYear(b))
                .slice(0, 6);
            const uniqueParticipants = new Set(
                linkedEvents.flatMap((eventItem) => eventItem.participantNeids)
            );
            const dateRangeLabel = eventDateRangeLabel(linkedEvents);
            const cardId = `timeline:${anchorNeid}`;
            const language = insightLanguage(cardId);
            const eventVolumeScore = Math.min(linkedEvents.length, 10);
            const rankScore =
                priorityScore(EVENT_TIMELINE_PRIORITY, anchorNeid) * 10 +
                eventVolumeScore * 3 +
                (documentEntityNeids.value.has(anchorNeid) ? 20 : 0);
            cards.push({
                id: cardId,
                kind: 'event_timeline',
                title: `${anchorName}: broader timeline context`,
                subtitle: 'Collection events versus outside participant-linked events',
                anchorNeid,
                anchorName,
                documentContext: `${anchorName} appears in your documents, but the document set captures only part of the timeline around this participant.`,
                kgContext:
                    outsideLinkedEvents.length > 0
                        ? `${anchorName} shows ${pluralize(extractedLinkedEvents.length, 'collection event')} plus ${pluralize(outsideLinkedEvents.length, 'outside event')}, which helps separate same-deal context from broader activity.`
                        : `${anchorName} has ${pluralize(extractedLinkedEvents.length, 'collection event')} and limited outside activity in this run.`,
                evidence: orderedEvents.map((eventItem) => {
                    const scope = eventItem.extractedSeed
                        ? 'same-deal document context'
                        : 'outside related event';
                    return `${scope}: ${eventEvidenceLine(eventItem, anchorNeid)}`;
                }),
                askPrompt: `Build a timeline for ${anchorName}, distinguishing same-deal events from outside related deals, and explain why each event matters.`,
                relatedEntityNeids: [anchorNeid],
                relatedEventNeids: orderedEvents.map((eventItem) => eventItem.neid),
                plainSummary:
                    language?.plainSummary ||
                    `${anchorName} has ${linkedEvents.length} total events (${extractedLinkedEvents.length} collection, ${outsideLinkedEvents.length} outside).`,
                relevanceLabel:
                    language?.relevanceLabel ??
                    (outsideLinkedEvents.length > 0 ? 'adjacent' : 'same_deal'),
                sizeLabel:
                    language?.sizeLabel ??
                    dealSizeLabelFromContext(
                        orderedEvents.map((eventItem) => eventItem.neid),
                        [anchorNeid]
                    ),
                totalEventCount: linkedEvents.length,
                outsideEventCount: outsideLinkedEvents.length,
                sameDealEventCount: extractedLinkedEvents.length,
                participantCount: uniqueParticipants.size,
                dateRangeLabel,
                rankScore,
            });
        }
        return cards
            .sort((a, b) => b.rankScore - a.rankScore)
            .map(({ rankScore: _, ...card }) => card);
    });

    const peopleAffiliationInsights = computed<EnrichmentInsightCard[]>(() => {
        const cards: Array<EnrichmentInsightCard & { rankScore: number }> = [];
        const seen = new Set<string>();
        for (const relationship of relationshipNeidPairs.value) {
            if (relationship.origin !== 'enriched') continue;
            const source = entityByNeid.value.get(relationship.sourceNeid);
            const target = entityByNeid.value.get(relationship.targetNeid);
            if (!source || !target) continue;

            const sourceIsPerson = source.flavor === 'person';
            const targetIsPerson = target.flavor === 'person';
            if (!sourceIsPerson && !targetIsPerson) continue;
            const person = sourceIsPerson ? source : target;
            const organization = sourceIsPerson ? target : source;
            if (organization.flavor !== 'organization') continue;
            if (INSIGHT_NOISE_ANCHORS.has(organization.neid)) continue;
            if (!personRelationshipTypes.has(relationship.normalizedType)) continue;
            const key = `${person.neid}|${organization.neid}|${relationship.normalizedType}`;
            if (seen.has(key)) continue;
            if (documentPersonAffiliationKeys.value.has(key)) continue;
            seen.add(key);
            const personName = entityDisplayName(person);
            const organizationName = entityDisplayName(organization);

            const personNamePriority = priorityScore(
                PEOPLE_PRIORITY_BY_NAME,
                person.name.toUpperCase()
            );
            const rankScore =
                personNamePriority * 10 +
                (documentEntityNeids.value.has(person.neid) ? 20 : 0) +
                (documentEntityNeids.value.has(organization.neid) ? 15 : 0) +
                (eventCountByEntityNeid.value.get(person.neid) ?? 0) +
                (relationshipCountByEntityNeid.value.get(person.neid) ?? 0);
            const cardId = `people:${key}`;
            const language = insightLanguage(cardId);

            cards.push({
                id: cardId,
                kind: 'people_affiliation',
                title: `${personName} -> ${organizationName}`,
                subtitle: 'People and affiliation context added by KG',
                anchorNeid: person.neid,
                anchorName: personName,
                documentContext: `${personName} is present in extraction, but this specific affiliation to ${organizationName} is not explicitly represented in the document-only graph.`,
                kgContext: `Yottagraph contributes external affiliation context: ${personName} ${relationshipLabel(relationship.normalizedType)} ${organizationName}.`,
                evidence: [
                    `${personName} ${relationshipLabel(relationship.normalizedType)} ${organizationName}`,
                ],
                askPrompt: `Explain the external affiliation between ${personName} and ${organizationName}, and how it changes interpretation of the extracted deal participants.`,
                relatedEntityNeids: [person.neid, organization.neid],
                relatedEventNeids: [],
                plainSummary:
                    language?.plainSummary ||
                    `${personName} is connected to ${organizationName} in broader graph context, which may add useful participant background.`,
                relevanceLabel: language?.relevanceLabel ?? 'adjacent',
                rankScore,
            });
        }
        return cards
            .sort((a, b) => b.rankScore - a.rankScore)
            .map(({ rankScore: _, ...card }) => card);
    });

    const enrichmentInsights = computed<EnrichmentInsightCard[]>(() => [
        ...lineageInsights.value,
        ...broaderActivityInsights.value,
        ...eventTimelineInsights.value,
        ...peopleAffiliationInsights.value,
    ]);
    const enrichmentTakeawayBullets = computed<string[]>(() => {
        const bullets: string[] = [];
        const topLineage = lineageInsights.value[0];
        const topActivity = broaderActivityInsights.value[0];
        const topTimeline = eventTimelineInsights.value[0];
        if (topLineage) {
            bullets.push(
                takeawaySentence(topLineage.plainSummary) ??
                    `${topLineage.title} adds later corporate lineage context around a collection participant.`
            );
        }
        if (topActivity) {
            bullets.push(
                takeawaySentence(topActivity.plainSummary) ??
                    `${topActivity.anchorName ?? topActivity.title} adds later participant activity that helps distinguish follow-on financing actions from unrelated external work.`
            );
        }
        if (topTimeline) {
            bullets.push(
                takeawaySentence(topTimeline.plainSummary) ??
                    `${topTimeline.anchorName ?? topTimeline.title} adds outside timeline context beyond the uploaded documents.`
            );
        }
        if (bullets.length === 0) {
            bullets.push(
                'Run context expansion to surface external entities, relationships, and events connected to your extracted anchors.'
            );
        }
        return bullets.slice(0, 3);
    });
    const enrichmentValueSummary = computed(() => ({
        documentEntityCount: documentEntities.value.length,
        documentRelationshipCount: documentRelationships.value.length,
        enrichedEntityCount: enrichedEntities.value.length,
        enrichedRelationshipCount: enrichedRelationships.value.length,
        totalEventCount: collection.value.events.length,
        outsideEventCount: outsideEvents.value.length,
        takeawayBullets: enrichmentTakeawayBullets.value,
    }));
    const strictProjectLocationEntities = computed(() =>
        collection.value.entities.filter((entity) => {
            if (entity.flavor !== 'location') return false;
            const normalized = entity.name.trim().toLowerCase();
            return (
                normalized.includes('presidential plaza at newport') ||
                normalized === 'presidential plaza' ||
                normalized === 'newport project'
            );
        })
    );
    const recentCoverageAnchors = computed(() => {
        const anchorByNeid = new Map<string, EntityRecord>();
        const addAnchor = (entity: EntityRecord) => {
            if (!['organization', 'person'].includes(entity.flavor)) return;
            anchorByNeid.set(entity.neid, entity);
        };
        const sortedDocumentEntities = documentEntities.value.slice().sort((a, b) => {
            const relationshipDelta =
                (relationshipCountByEntityNeid.value.get(b.neid) ?? 0) -
                (relationshipCountByEntityNeid.value.get(a.neid) ?? 0);
            if (relationshipDelta !== 0) return relationshipDelta;
            const eventDelta =
                (eventCountByEntityNeid.value.get(b.neid) ?? 0) -
                (eventCountByEntityNeid.value.get(a.neid) ?? 0);
            if (eventDelta !== 0) return eventDelta;
            return a.name.localeCompare(b.name);
        });
        for (const entity of sortedDocumentEntities) {
            if (anchorByNeid.size >= 10) break;
            addAnchor(entity);
        }
        for (const entity of strictProjectLocationEntities.value) addAnchor(entity);
        return Array.from(anchorByNeid.values()).slice(0, 10);
    });
    const dedupedFilteredNewsArticles = computed<DedupedNewsArticle[]>(() => {
        const nowMs = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const aggregateByArticle = new Map<
            string,
            {
                canonicalArticleKey: string;
                articleNeid: string;
                title?: string;
                date?: string;
                description?: string;
                sourceName?: string;
                url?: string;
                urlHost?: string;
                confidence?: number | null;
                sentiment?: number | null;
                citations: Set<string>;
                topics: Set<string>;
                matchedCategories: Set<string>;
                matchedVia: Set<'topic' | 'keyword'>;
                snippetQuality: 'summary' | 'citation' | 'fallback';
                matchedEntities: Map<string, GraphMatchedEntity>;
                entityScores: Map<string, number>;
            }
        >();

        for (const group of filteredNews.value) {
            for (const item of group.items) {
                const anchorNeid = item.anchorNeid || group.anchorNeid;
                const canonicalArticleKey = toCanonicalArticleKey(item);
                const existing = aggregateByArticle.get(canonicalArticleKey);
                if (!existing) {
                    aggregateByArticle.set(canonicalArticleKey, {
                        canonicalArticleKey,
                        articleNeid: item.articleNeid,
                        title: item.title,
                        date: item.date,
                        description: item.description || item.citations?.[0],
                        sourceName: item.sourceName,
                        url: item.url,
                        urlHost: item.urlHost,
                        confidence: item.confidence,
                        sentiment: item.sentiment,
                        citations: new Set(item.citations || []),
                        topics: new Set(item.topics || []),
                        matchedCategories: new Set(item.matchedCategories || []),
                        matchedVia: new Set(item.matchedVia ? [item.matchedVia] : []),
                        snippetQuality: item.snippetQuality || 'fallback',
                        matchedEntities: new Map([
                            [
                                anchorNeid,
                                {
                                    neid: anchorNeid,
                                    name: resolveEntityName(anchorNeid),
                                    isPrimary: false,
                                },
                            ],
                        ]),
                        entityScores: new Map(),
                    });
                } else {
                    if (!existing.description && (item.description || item.citations?.[0])) {
                        existing.description = item.description || item.citations?.[0];
                    }
                    if (!existing.title && item.title) existing.title = item.title;
                    if (!existing.sourceName && item.sourceName)
                        existing.sourceName = item.sourceName;
                    if (!existing.url && item.url) existing.url = item.url;
                    if (!existing.urlHost && item.urlHost) existing.urlHost = item.urlHost;
                    if (!existing.articleNeid && item.articleNeid)
                        existing.articleNeid = item.articleNeid;
                    if (
                        item.confidence != null &&
                        (existing.confidence ?? -Infinity) < item.confidence
                    ) {
                        existing.confidence = item.confidence;
                    }
                    if (item.sentiment != null && existing.sentiment == null) {
                        existing.sentiment = item.sentiment;
                    }
                    const existingDateMs = parseDateMs(existing.date);
                    const itemDateMs = parseDateMs(item.date);
                    if (
                        itemDateMs != null &&
                        (existingDateMs == null || itemDateMs > existingDateMs)
                    ) {
                        existing.date = item.date;
                    }
                    for (const citation of item.citations || []) existing.citations.add(citation);
                    for (const topic of item.topics || []) existing.topics.add(topic);
                    for (const category of item.matchedCategories || []) {
                        existing.matchedCategories.add(category);
                    }
                    if (item.matchedVia) existing.matchedVia.add(item.matchedVia);
                    if (
                        snippetQualityWeight(item.snippetQuality) >
                        snippetQualityWeight(existing.snippetQuality)
                    ) {
                        existing.snippetQuality = item.snippetQuality || 'fallback';
                    }
                    if (!existing.matchedEntities.has(anchorNeid)) {
                        existing.matchedEntities.set(anchorNeid, {
                            neid: anchorNeid,
                            name: resolveEntityName(anchorNeid),
                            isPrimary: false,
                        });
                    }
                }

                const target = aggregateByArticle.get(canonicalArticleKey);
                if (!target) continue;
                const itemDateMs = parseDateMs(item.date);
                const recencyScore =
                    itemDateMs == null
                        ? 0
                        : Math.max(0, (thirtyDaysMs - (nowMs - itemDateMs)) / thirtyDaysMs);
                const confidenceScore =
                    item.confidence == null
                        ? 0
                        : item.confidence <= 1
                          ? Math.max(0, item.confidence)
                          : Math.min(item.confidence / 100, 1);
                const connectionScore =
                    3 +
                    (item.matchedCategories?.length ?? 0) * 0.45 +
                    confidenceScore +
                    recencyScore * 0.8 +
                    snippetQualityWeight(item.snippetQuality) * 0.35;
                target.entityScores.set(
                    anchorNeid,
                    (target.entityScores.get(anchorNeid) ?? 0) + connectionScore
                );
            }
        }

        const articles: DedupedNewsArticle[] = [];
        for (const aggregate of aggregateByArticle.values()) {
            const entities = Array.from(aggregate.matchedEntities.values());
            entities.sort((a, b) => {
                const scoreA = aggregate.entityScores.get(a.neid) ?? 0;
                const scoreB = aggregate.entityScores.get(b.neid) ?? 0;
                if (scoreA !== scoreB) return scoreB - scoreA;
                return a.name.localeCompare(b.name);
            });
            const primaryEntity = entities[0] ?? null;
            if (primaryEntity) primaryEntity.isPrimary = true;
            const secondaryEntities = entities
                .slice(1)
                .map((entity) => ({ ...entity, isPrimary: false }));
            const uniqueGraphMentionCount = entities.length;
            const alsoLinkedCount = Math.max(0, uniqueGraphMentionCount - 1);
            const strongestEntityScore = primaryEntity
                ? (aggregate.entityScores.get(primaryEntity.neid) ?? 0)
                : 0;
            const multiEntityBonus =
                uniqueGraphMentionCount >= 2
                    ? 4 + Math.max(0, uniqueGraphMentionCount - 2) * 1.2
                    : 0;
            const strongestMatchScore =
                strongestEntityScore +
                uniqueGraphMentionCount * 0.9 +
                multiEntityBonus +
                (aggregate.confidence ?? 0) * 0.6 +
                snippetQualityWeight(aggregate.snippetQuality) * 0.5;
            const categories = Array.from(aggregate.matchedCategories);
            const matchReason =
                uniqueGraphMentionCount > 1
                    ? `Directly mentions ${primaryEntity?.name || 'the primary entity'} and ${alsoLinkedCount} other graph entities.`
                    : `Linked through appears_in to ${primaryEntity?.name || 'the selected entity'}${categories[0] ? ` and categorized as ${categories[0]}` : ''}.`;
            articles.push({
                canonicalArticleKey: aggregate.canonicalArticleKey,
                articleNeid: aggregate.articleNeid,
                title: aggregate.title,
                date: aggregate.date,
                description: aggregate.description,
                sourceName: aggregate.sourceName,
                url: aggregate.url,
                urlHost: aggregate.urlHost,
                confidence: aggregate.confidence,
                sentiment: aggregate.sentiment,
                citations: Array.from(aggregate.citations),
                topics: Array.from(aggregate.topics),
                matchedCategories: categories,
                matchedVia: Array.from(aggregate.matchedVia),
                snippetQuality: aggregate.snippetQuality,
                primaryEntity,
                secondaryEntities,
                matchedEntities: entities,
                uniqueGraphMentionCount,
                alsoLinkedCount,
                strongestMatchScore,
                matchReason,
            });
        }

        return articles;
    });
    function sortDedupedNewsArticles(
        articles: DedupedNewsArticle[],
        sortMode: NewsSortMode
    ): DedupedNewsArticle[] {
        const sorted = [...articles];
        if (sortMode === 'most_graph_entities') {
            sorted.sort((a, b) => {
                if (a.uniqueGraphMentionCount !== b.uniqueGraphMentionCount) {
                    return b.uniqueGraphMentionCount - a.uniqueGraphMentionCount;
                }
                return b.strongestMatchScore - a.strongestMatchScore;
            });
            return sorted;
        }
        if (sortMode === 'most_recent') {
            sorted.sort((a, b) => {
                const aDate = parseDateMs(a.date) ?? -Infinity;
                const bDate = parseDateMs(b.date) ?? -Infinity;
                if (aDate !== bDate) return bDate - aDate;
                return b.strongestMatchScore - a.strongestMatchScore;
            });
            return sorted;
        }
        if (sortMode === 'highest_relevance') {
            sorted.sort((a, b) => {
                const aRelevance = a.confidence ?? -Infinity;
                const bRelevance = b.confidence ?? -Infinity;
                if (aRelevance !== bRelevance) return bRelevance - aRelevance;
                return b.strongestMatchScore - a.strongestMatchScore;
            });
            return sorted;
        }
        sorted.sort((a, b) => {
            const aMulti = a.uniqueGraphMentionCount >= 2 ? 1 : 0;
            const bMulti = b.uniqueGraphMentionCount >= 2 ? 1 : 0;
            if (aMulti !== bMulti) return bMulti - aMulti;
            return b.strongestMatchScore - a.strongestMatchScore;
        });
        return sorted;
    }
    const enrichmentLanguageCards = computed(() =>
        [
            ...lineageInsights.value,
            ...broaderActivityInsights.value,
            ...eventTimelineInsights.value,
            ...peopleAffiliationInsights.value,
        ].map((insight) => ({
            id: insight.id,
            kind: insight.kind,
            title: insight.title,
            subtitle: insight.subtitle,
            documentContext: insight.documentContext,
            kgContext: insight.kgContext,
            evidence: insight.evidence.slice(0, 4),
            metrics: {
                totalEventCount: insight.totalEventCount ?? 0,
                outsideEventCount: insight.outsideEventCount ?? 0,
                sameDealEventCount: insight.sameDealEventCount ?? 0,
                participantCount: insight.participantCount ?? 0,
                counterpartyCount: insight.counterpartyCount ?? 0,
                dateRangeLabel: insight.dateRangeLabel ?? null,
                sizeLabel: insight.sizeLabel ?? null,
            },
        }))
    );
    const agreements = computed(() => documentAgreements.value);
    const extractedSeedEntities = computed(() =>
        collection.value.entities.filter((e) => e.extractedSeed)
    );
    const mcpConfirmedEntities = computed(() =>
        collection.value.entities.filter((e) => e.mcpConfirmed)
    );
    const mcpOnlyRelationships = computed(() =>
        collection.value.relationships.filter((rel) => rel.mcpOnly)
    );

    const selectedEntity = computed(() => {
        if (!selectedEntityNeid.value) return null;
        return collection.value.entities.find((e) => e.neid === selectedEntityNeid.value) ?? null;
    });

    const selectedEvent = computed(() => {
        if (!selectedEventNeid.value) return null;
        return (
            collection.value.events.find(
                (eventItem) => eventItem.neid === selectedEventNeid.value
            ) ?? null
        );
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
    const overviewTrustCoverageSummary = computed<TrustCoverageSummary>(() => {
        const strictEntities = documentEntities.value;
        const strictRelationships = documentRelationships.value;
        const totalRelationships = strictRelationships.length;
        const evidenceBackedRelationships = strictRelationships.filter(
            (rel) =>
                Boolean(rel.sourceDocumentNeid) ||
                (Array.isArray(rel.citations) && rel.citations.length > 0)
        ).length;
        const inferredRelationships = Math.max(0, totalRelationships - evidenceBackedRelationships);
        const totalEntities = Math.max(strictEntities.length, 1);
        const sourceBackedEntities = strictEntities.filter(
            (e) => Array.isArray(e.sourceDocuments) && e.sourceDocuments.length > 0
        ).length;

        const coverageScore = Math.round(
            (sourceBackedEntities / totalEntities) * 60 +
                (totalRelationships > 0
                    ? (evidenceBackedRelationships / totalRelationships) * 40
                    : 20)
        );

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
            enrichedEntityShare: 0,
            sourceCoverageShare: Math.round((sourceBackedEntities / totalEntities) * 100),
            confidenceLabel,
            confidenceReason,
        };
    });
    const overviewScopedState = computed<CollectionState>(() => {
        const strictEntities = documentEntities.value;
        const strictRelationships = documentRelationships.value;
        const strictEvents = documentEvents.value;
        const documentOriginEvents = collection.value.events.filter(
            (eventItem) => eventItem.origin === 'document'
        );
        const scopedEvents = strictEvents.length > 0 ? strictEvents : documentOriginEvents;
        const strictAgreements = strictEntities.filter(
            (entity) => entity.flavor === 'legal_agreement'
        );
        return {
            ...collection.value,
            meta: {
                ...collection.value.meta,
                entityCount: strictEntities.length,
                relationshipCount: strictRelationships.length,
                eventCount: scopedEvents.length,
                agreementCount: strictAgreements.length,
            },
            entities: strictEntities,
            relationships: strictRelationships,
            events: scopedEvents,
            propertySeries: strictDocumentPropertySeries.value,
        };
    });

    const keyCoverageNotes = computed(() => {
        const notes: string[] = [];
        if (collection.value.documents.length === 0) {
            notes.push('No seed entities are loaded yet.');
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
        return `${docCount} seed entit${docCount === 1 ? 'y' : 'ies'} produced ${entityCount} entities and ${eventCount} events. ${entityLine} ${eventLine}`;
    });

    const recommendedActions = computed<CollectionAction[]>(() => [
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
            label: 'Inspect Material Events',
            description: 'Review event progression and major episodes over time.',
            tab: 'events',
        },
        {
            id: 'compare-fact-evolution',
            label: 'Compare Fact Evolution',
            description: 'Track how entity facts change across seed context.',
            tab: 'timeline',
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
            description: 'Use Ask Yotta with source-linked evidence.',
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

    const overviewViewModel = computed(() =>
        mapCollectionToOverviewViewModel({
            state: overviewScopedState.value,
            rebuilding: rebuilding.value,
            trustCoverageSummary: overviewTrustCoverageSummary.value,
            activeProject: activeProject.value,
        })
    );
    const primaryMeta = computed(() => overviewScopedState.value.meta);
    const primaryCollectionSummary = computed(() => {
        const docCount = overviewScopedState.value.documents.length;
        const entityCount = overviewScopedState.value.entities.length;
        const eventCount = overviewScopedState.value.events.length;
        const topEntity = topEntities.value.find((entity) => entity.origin === 'document');
        const topEvent = topEvents.value.find((eventItem) =>
            documentEvents.value.some((docEvent) => docEvent.neid === eventItem.neid)
        );
        const entityLine = topEntity
            ? `Most central entity: ${topEntity.name} (${topEntity.flavor.replace(/_/g, ' ')}).`
            : 'No entities identified yet.';
        const eventLine = topEvent
            ? `Most significant event: ${topEvent.name}${topEvent.date ? ` (${topEvent.date.slice(0, 10)})` : ''}.`
            : 'No significant events have been identified yet.';
        return `${docCount} seed entit${docCount === 1 ? 'y' : 'ies'} produced ${entityCount} entities and ${eventCount} events. ${entityLine} ${eventLine}`;
    });

    async function generateEnrichmentLanguage(): Promise<void> {
        const cards = enrichmentLanguageCards.value;
        if (!cards.length) {
            enrichmentLanguageByInsightId.value = {};
            enrichmentLanguageError.value = null;
            return;
        }
        enrichmentLanguageLoading.value = true;
        enrichmentLanguageError.value = null;
        try {
            const result = await $fetch<{
                cards: EnrichmentLanguageCard[];
                generationSource: 'gemini' | 'fallback';
                generationNote?: string;
            }>('/api/collection/enrichment-language', {
                method: 'POST',
                body: {
                    cards,
                    summary: {
                        documentEntityCount: documentEntities.value.length,
                        enrichedEntityCount: enrichedEntities.value.length,
                        documentRelationshipCount: documentRelationships.value.length,
                        enrichedRelationshipCount: enrichedRelationships.value.length,
                        totalEventCount: collection.value.events.length,
                        outsideEventCount: outsideEvents.value.length,
                    },
                },
            });
            const byId: Record<string, EnrichmentLanguageCard> = {};
            for (const card of result.cards ?? []) {
                if (!card?.id || !card?.plainSummary) continue;
                byId[card.id] = card;
            }

            // Run lineage cards through the same answer orchestration used by Ask Yotta.
            const lineageCards = cards
                .filter((card) => card.kind === 'corporate_lineage')
                .slice(0, 6);
            for (const card of lineageCards) {
                try {
                    const lineageQuestion = [
                        `Write a clear narrative for this lineage relationship: ${card.title}.`,
                        `Seed context: ${card.documentContext}`,
                        `Graph context: ${card.kgContext}`,
                        `Evidence: ${card.evidence.slice(0, 3).join(' | ')}`,
                        'Return 1-2 plain sentences for an analyst. Be specific about the transition and why it matters.',
                    ].join(' ');
                    const lineageAnswer = await $fetch<AgentAnswerResult>(
                        '/api/collection/answer',
                        {
                            method: 'POST',
                            body: {
                                action: 'lineage_narrative',
                                question: lineageQuestion,
                                projectId: activeProject.value?.id,
                            },
                        }
                    );
                    if (!lineageAnswer?.output?.trim()) continue;
                    const existing = byId[card.id];
                    byId[card.id] = {
                        id: card.id,
                        plainSummary: lineageAnswer.output.trim(),
                        relevanceLabel: existing?.relevanceLabel ?? 'adjacent',
                        sizeLabel: existing?.sizeLabel ?? null,
                    };
                } catch {
                    // Keep fallback/generated card text when lineage orchestration fails.
                }
            }
            enrichmentLanguageByInsightId.value = byId;
            enrichmentLanguageError.value = result.generationNote ?? null;
        } catch (error: any) {
            enrichmentLanguageError.value =
                error?.data?.statusMessage ||
                error?.message ||
                'Unable to generate enrichment plain-language summaries.';
            enrichmentLanguageByInsightId.value = {};
        } finally {
            enrichmentLanguageLoading.value = false;
        }
    }

    async function bootstrap(): Promise<void> {
        try {
            const params = activeProject.value ? { projectId: activeProject.value.id } : undefined;
            const data = await $fetch<CollectionState>('/api/collection/bootstrap', { params });
            collection.value = mergeBootstrapStateWithProject(data, activeProject.value);
            lineageInvestigation.value = sanitizeLineageInvestigation(data.lineageInvestigation);
            lineageDebugEntries.value = [...(lineageInvestigation.value.progressLog ?? [])];
            if (data.status === 'ready') {
                await Promise.all([generateEnrichmentLanguage(), loadEnrichmentContextData()]);
            }
        } catch (e: any) {
            collection.value.error = e.message || 'Failed to bootstrap';
        }
    }

    async function loadEnrichmentNews(): Promise<void> {
        const anchors = recentCoverageAnchors.value.map((entity) => entity.neid);
        if (!anchors.length) {
            enrichmentNews.value = [];
            return;
        }
        enrichmentNewsLoading.value = true;
        enrichmentNewsError.value = null;
        try {
            const response = await $fetch<{ groups: EnrichmentNewsGroup[] }>(
                '/api/collection/enrichment-news',
                {
                    method: 'POST',
                    body: { entityNeids: anchors, maxEntities: 10, articlesPerEntity: 8 },
                }
            );
            enrichmentNews.value = response.groups ?? [];
        } catch (error: any) {
            enrichmentNewsError.value =
                error?.data?.statusMessage ||
                error?.message ||
                'Failed to load recent article coverage.';
            enrichmentNews.value = [];
        } finally {
            enrichmentNewsLoading.value = false;
        }
    }

    async function loadFilteredNews(categories?: string[]): Promise<void> {
        const anchors = recentCoverageAnchors.value.map((entity) => entity.neid);
        if (!anchors.length) {
            filteredNews.value = [];
            filteredNewsInitialized.value = true;
            filteredNewsRefreshing.value = false;
            if (!categories?.length) filteredNewsCategories.value = [];
            return;
        }
        const hasExistingRows = filteredNews.value.some((group) => group.items.length > 0);
        filteredNewsRefreshing.value = hasExistingRows;
        filteredNewsLoading.value = !hasExistingRows;
        filteredNewsError.value = null;
        try {
            const response = await $fetch<{ groups: FilteredNewsGroup[]; categories: string[] }>(
                '/api/collection/enrichment-filtered-news',
                {
                    method: 'POST',
                    body: {
                        entityNeids: anchors,
                        categories: categories?.length ? categories : undefined,
                        maxEntities: 10,
                        articlesPerEntity: 8,
                    },
                }
            );
            filteredNews.value = response.groups ?? [];
            filteredNewsCategories.value = response.categories ?? [];
            filteredNewsInitialized.value = true;
        } catch (error: any) {
            filteredNewsError.value =
                error?.data?.statusMessage || error?.message || 'Failed to load filtered news.';
            if (!hasExistingRows) {
                filteredNews.value = [];
            }
            if (!categories?.length) filteredNewsCategories.value = [];
            filteredNewsInitialized.value = true;
        } finally {
            filteredNewsLoading.value = false;
            filteredNewsRefreshing.value = false;
        }
    }

    async function loadEnrichmentEconomicSignals(): Promise<void> {
        const anchors = enrichedEntities.value.map((entity) => entity.neid);
        if (!anchors.length) {
            enrichmentEconomicSignals.value = { micro: [], macro: [] };
            return;
        }
        enrichmentEconomicLoading.value = true;
        enrichmentEconomicError.value = null;
        try {
            const response = await $fetch<{
                micro: EnrichmentEconomicSignal[];
                macro: EnrichmentEconomicSignal[];
            }>('/api/collection/enrichment-economics', {
                method: 'POST',
                body: { entityNeids: anchors, maxEntityAnchors: 8, eventsPerEntity: 20 },
            });
            enrichmentEconomicSignals.value = {
                micro: response.micro ?? [],
                macro: response.macro ?? [],
            };
        } catch (error: any) {
            enrichmentEconomicError.value =
                error?.data?.statusMessage ||
                error?.message ||
                'Failed to load micro/macroeconomic context.';
            enrichmentEconomicSignals.value = { micro: [], macro: [] };
        } finally {
            enrichmentEconomicLoading.value = false;
        }
    }

    async function loadEnrichmentRelatedDeals(): Promise<void> {
        const anchors = recentCoverageAnchors.value.map((entity) => entity.neid);
        if (!anchors.length) {
            enrichmentRelatedDeals.value = [];
            return;
        }
        enrichmentRelatedDealsLoading.value = true;
        enrichmentRelatedDealsError.value = null;
        try {
            const response = await $fetch<{ deals: EnrichmentRelatedDealInsight[] }>(
                '/api/collection/enrichment-related-deals',
                {
                    method: 'POST',
                    body: { entityNeids: anchors, maxAnchors: 10, articlesPerAnchor: 20 },
                }
            );
            enrichmentRelatedDeals.value = response.deals ?? [];
        } catch (error: any) {
            enrichmentRelatedDealsError.value =
                error?.data?.statusMessage ||
                error?.message ||
                'Failed to load Jersey City related deal insights.';
            enrichmentRelatedDeals.value = [];
        } finally {
            enrichmentRelatedDealsLoading.value = false;
        }
    }

    async function loadEnrichmentContextData(): Promise<void> {
        await Promise.all([
            loadEnrichmentNews(),
            loadFilteredNews(),
            loadEnrichmentEconomicSignals(),
            loadEnrichmentRelatedDeals(),
        ]);
    }

    async function runLineageInvestigation(): Promise<void> {
        if (collection.value.status !== 'ready') return;
        const startedAt = new Date().toISOString();
        lineageInvestigation.value = {
            ...lineageInvestigation.value,
            status: 'running',
            startedAt,
            completedAt: undefined,
            error: undefined,
            progressLog: [],
            rootsProcessed: 0,
            queueRemaining: 0,
        };
        lineageDebugEntries.value = [];
        try {
            const result = await $fetch<LineageInvestigationResult>(
                '/api/collection/lineage-investigation',
                {
                    method: 'POST',
                    body: {
                        maxHops: 6,
                        maxOrganizations: 250,
                        projectId: activeProject.value?.id,
                    },
                }
            );
            lineageInvestigation.value = sanitizeLineageInvestigation({
                ...result,
                status: 'ready',
                startedAt: result.startedAt ?? lineageInvestigation.value.startedAt,
                completedAt: result.completedAt ?? new Date().toISOString(),
            });
            lineageDebugEntries.value = [...(lineageInvestigation.value.progressLog ?? [])];
            collection.value.lineageInvestigation = lineageInvestigation.value;
        } catch (error: any) {
            lineageInvestigation.value = sanitizeLineageInvestigation({
                ...lineageInvestigation.value,
                status: 'error',
                completedAt: new Date().toISOString(),
                progressLog: lineageDebugEntries.value,
                error:
                    error?.data?.statusMessage ||
                    error?.message ||
                    'Unable to run relationship-based lineage investigation.',
            });
            collection.value.lineageInvestigation = lineageInvestigation.value;
        }
    }

    async function rebuild(): Promise<void> {
        // Watchdog guardrails for stream stalls.
        // Keep these intentionally generous so slower MCP event windows
        // do not prematurely force fallback rebuilds.
        const isDeployedRuntime =
            typeof window !== 'undefined' &&
            !/^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location.hostname);
        const STREAM_PROGRESS_TIMEOUT_MS = isDeployedRuntime ? 180_000 : 120_000;
        const STREAM_TOTAL_TIMEOUT_MS = isDeployedRuntime ? 480_000 : 300_000;
        const STREAM_RECOVERY_TIMEOUT_MS = isDeployedRuntime ? 30_000 : 15_000;
        const STREAM_RECOVERY_POLL_MS = 2_000;
        let timeoutPoll: ReturnType<typeof setInterval> | null = null;
        rebuilding.value = true;
        collection.value.status = 'loading';
        collection.value.error = undefined;
        mcpLog.value = [];
        rebuildSteps.value = INITIAL_STEPS.map((s) => ({ ...s }));
        const previousCachedAt = collection.value.meta.cachedAt;
        const previousLastRebuilt = collection.value.meta.lastRebuilt;
        const previousEntityCount = collection.value.meta.entityCount ?? 0;

        const runFallbackRebuild = async (reason: string) => {
            const payload = projectRequestPayload();
            const fallbackState = await $fetch<CollectionState>('/api/collection/rebuild', {
                method: 'POST',
                ...(payload ? { body: payload } : {}),
            });
            collection.value = fallbackState;
            rebuildSteps.value = INITIAL_STEPS.map((step, idx) => ({
                ...step,
                status: 'completed',
                detail:
                    idx === INITIAL_STEPS.length - 1
                        ? `Fallback rebuild completed (${reason}).`
                        : step.detail,
            }));
        };
        const canUseRecoveredState = (
            state: CollectionState | null | undefined
        ): state is CollectionState => {
            if (!state || state.status !== 'ready') return false;
            if ((state.meta.entityCount ?? 0) === 0) return false;
            if (state.meta.lastRebuilt && state.meta.lastRebuilt !== previousLastRebuilt)
                return true;
            if (state.meta.cachedAt && state.meta.cachedAt !== previousCachedAt) return true;
            return previousEntityCount === 0;
        };
        const tryRecoverFromBootstrap = async (reason: string): Promise<boolean> => {
            const startedAt = Date.now();
            while (Date.now() - startedAt < STREAM_RECOVERY_TIMEOUT_MS) {
                try {
                    const params = activeProject.value
                        ? { projectId: activeProject.value.id }
                        : undefined;
                    const recoveredState = await $fetch<CollectionState>(
                        '/api/collection/bootstrap',
                        { params }
                    );
                    if (canUseRecoveredState(recoveredState)) {
                        collection.value = recoveredState;
                        rebuildSteps.value = INITIAL_STEPS.map((step, idx) => ({
                            ...step,
                            status: 'completed',
                            detail:
                                idx === INITIAL_STEPS.length - 1
                                    ? `Recovered completed workspace after stream interruption (${reason}).`
                                    : step.detail,
                        }));
                        return true;
                    }
                } catch {
                    // Keep polling briefly before falling back to a full rebuild.
                }
                await new Promise((resolve) => setTimeout(resolve, STREAM_RECOVERY_POLL_MS));
            }
            return false;
        };

        try {
            const streamStartedAt = Date.now();
            let lastMeaningfulProgressAt = streamStartedAt;
            const streamController = new AbortController();
            timeoutPoll = setInterval(() => {
                const now = Date.now();
                if (now - streamStartedAt > STREAM_TOTAL_TIMEOUT_MS) {
                    streamController.abort(
                        new Error(
                            `Rebuild stream exceeded ${Math.round(STREAM_TOTAL_TIMEOUT_MS / 1000)}s`
                        )
                    );
                    return;
                }
                if (now - lastMeaningfulProgressAt > STREAM_PROGRESS_TIMEOUT_MS) {
                    const activeStep =
                        rebuildSteps.value.find((step) => step.status === 'working')?.label ??
                        'unknown step';
                    streamController.abort(
                        new Error(
                            `Rebuild stream stalled for ${Math.round(STREAM_PROGRESS_TIMEOUT_MS / 1000)}s during ${activeStep}`
                        )
                    );
                }
            }, 2000);
            const streamPayload = projectRequestPayload();
            const response = await fetch('/api/collection/rebuild-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(
                    streamPayload
                        ? {
                              projectId: streamPayload.projectId,
                              projectType: streamPayload.projectType,
                              seedNeids: streamPayload.seedNeids,
                              seedSourceCount: streamPayload.seedSourceCount,
                              project: streamPayload.project,
                          }
                        : {}
                ),
                signal: streamController.signal,
            });
            if (!response.ok || !response.body) {
                if (timeoutPoll) clearInterval(timeoutPoll);
                let detail = '';
                try {
                    detail = (await response.text()).trim();
                } catch {
                    detail = '';
                }
                const suffix = detail ? ` — ${detail.slice(0, 220)}` : '';
                await runFallbackRebuild(`stream unavailable: ${response.status}${suffix}`);
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let streamReportedError = false;

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
                        if (msg?.type === 'error') streamReportedError = true;
                        if (msg?.type) {
                            lastMeaningfulProgressAt = Date.now();
                        }
                        handleStreamMessage(msg);
                    } catch {
                        // malformed line — ignore
                    }
                }
            }
            if (timeoutPoll) clearInterval(timeoutPoll);

            if (streamReportedError) {
                await runFallbackRebuild('stream emitted error event');
                await loadEnrichmentContextData();
                return;
            }
            await loadEnrichmentContextData();
        } catch (e: any) {
            if (timeoutPoll) clearInterval(timeoutPoll);
            try {
                const fallbackReason = e?.message
                    ? String(e.message).slice(0, 220)
                    : 'stream request failed';
                const workingStepIdx = rebuildSteps.value.findIndex(
                    (step) => step.status === 'working'
                );
                if (workingStepIdx >= 0) {
                    rebuildSteps.value[workingStepIdx] = {
                        ...rebuildSteps.value[workingStepIdx],
                        detail: `Stream interrupted, checking cached workspace… (${fallbackReason})`,
                    };
                }
                if (await tryRecoverFromBootstrap(fallbackReason)) {
                    await loadEnrichmentContextData();
                    return;
                }
                if (workingStepIdx >= 0) {
                    rebuildSteps.value[workingStepIdx] = {
                        ...rebuildSteps.value[workingStepIdx],
                        detail: `Stream recovery failed, running fallback rebuild now… (${fallbackReason})`,
                    };
                }
                await runFallbackRebuild(fallbackReason);
                await loadEnrichmentContextData();
            } catch (fallbackError: any) {
                collection.value.status = 'error';
                collection.value.error = fallbackError?.message || e?.message || 'Rebuild failed';
            }
        } finally {
            if (timeoutPoll) clearInterval(timeoutPoll);
            rebuilding.value = false;
        }
    }

    function handleStreamMessage(msg: Record<string, unknown>) {
        switch (msg.type) {
            case 'step': {
                const idx = rebuildSteps.value.findIndex((s) => s.step === (msg.step as number));
                if (idx >= 0) {
                    const existing = rebuildSteps.value[idx];
                    const nextStatus = msg.status as 'working' | 'completed';
                    const existingStart = existing.startedAtMs;
                    const startedAtMs =
                        nextStatus === 'working'
                            ? existing.status === 'working' && existingStart
                                ? existingStart
                                : Date.now()
                            : existingStart;
                    rebuildSteps.value[idx] = {
                        step: msg.step as number,
                        status: nextStatus,
                        label: msg.label as string,
                        detail: msg.detail as string | undefined,
                        durationMs:
                            (msg.durationMs as number | undefined) ??
                            (nextStatus === 'completed' && startedAtMs
                                ? Date.now() - startedAtMs
                                : undefined),
                        startedAtMs,
                    };
                }
                break;
            }
            case 'state': {
                const state = msg.state as CollectionState;
                if (state) {
                    collection.value = state;
                    lineageInvestigation.value = sanitizeLineageInvestigation(
                        state.lineageInvestigation
                    );
                    lineageDebugEntries.value = [...(lineageInvestigation.value.progressLog ?? [])];
                }
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
            case 'error': {
                collection.value.status = 'error';
                collection.value.error = (msg.message as string) || 'Rebuild failed';
                break;
            }
        }
    }

    function addGeminiUsage(entry: Omit<GeminiUsageEntry, 'id'>): void {
        geminiLog.value.push({ id: ++_geminiIdCounter, ...entry });
    }

    async function enrich(anchorNeids: string[], includeEvents = true): Promise<void> {
        enriching.value = true;
        try {
            enrichmentAnchorNeids.value = [...anchorNeids];
            enrichmentIncludeEvents.value = includeEvents;
            enrichmentWatchlistThemes.value = [];
            enrichmentWatchlistError.value = null;
            enrichmentWatchlistGeneratedAt.value = null;
            enrichmentLanguageByInsightId.value = {};
            enrichmentLanguageError.value = null;
            const result = await $fetch<{
                entities: EntityRecord[];
                relationships: RelationshipRecord[];
                events: EventRecord[];
                caps?: {
                    maxEntities: number;
                    maxRelationships: number;
                    maxEvents: number;
                    maxEventHubs: number;
                };
                truncated?: {
                    entities: boolean;
                    relationships: boolean;
                    events: boolean;
                    eventHubs: boolean;
                };
                counts?: {
                    rawByDepth?: {
                        degree1?: {
                            entityCount: number;
                            eventCount: number;
                            relationshipCount: number;
                            propertyCount: number;
                        };
                    };
                    byDepth?: {
                        degree1?: {
                            entityCount: number;
                            eventCount: number;
                            relationshipCount: number;
                            propertyCount: number;
                        };
                    };
                    raw?: {
                        propertyCount?: number;
                    };
                };
                kgTotals?: {
                    oneHop?: {
                        entityCount: number;
                        eventCount: number;
                        relationshipCount: number;
                        propertyCount: number;
                    };
                    perEntity?: Array<{
                        neid: string;
                        relationshipCount: number;
                        eventCount: number;
                    }>;
                };
            }>('/api/collection/enrich', {
                method: 'POST',
                body: { anchorNeids, includeEvents },
            });

            const existingNeids = new Set(collection.value.entities.map((e) => e.neid));
            const newEntities = result.entities.filter((e) => !existingNeids.has(e.neid));
            collection.value.entities.push(...newEntities);
            const relationshipKey = (relationship: RelationshipRecord) =>
                `${relationship.sourceNeid}|${relationship.targetNeid}|${relationship.type}|${relationship.origin}`;
            const existingRelationshipKeys = new Set(
                collection.value.relationships.map((relationship) => relationshipKey(relationship))
            );
            for (const relationship of result.relationships) {
                const key = relationshipKey(relationship);
                if (existingRelationshipKeys.has(key)) continue;
                existingRelationshipKeys.add(key);
                collection.value.relationships.push(relationship);
            }
            const existingEventNeids = new Set(
                collection.value.events.map((eventItem) => eventItem.neid)
            );
            const newEvents = (result.events ?? []).filter((eventItem) => {
                if (existingEventNeids.has(eventItem.neid)) return false;
                existingEventNeids.add(eventItem.neid);
                return true;
            });
            collection.value.events.push(...newEvents);

            collection.value.meta.entityCount = collection.value.entities.length;
            collection.value.meta.relationshipCount = collection.value.relationships.length;
            collection.value.meta.eventCount = collection.value.events.length;
            if (result.counts?.rawByDepth || result.counts?.byDepth || result.kgTotals?.oneHop) {
                collection.value.meta.enrichmentCounts = {
                    document:
                        collection.value.meta.enrichmentCounts?.document ??
                        enrichmentCounts.value.document,
                    raw1Degree:
                        result.counts?.rawByDepth?.degree1 ??
                        result.counts?.byDepth?.degree1 ??
                        collection.value.meta.enrichmentCounts?.raw1Degree ??
                        enrichmentCounts.value.raw1Degree,
                    kgOneHop:
                        result.kgTotals?.oneHop ??
                        collection.value.meta.enrichmentCounts?.kgOneHop ??
                        enrichmentCounts.value.kgOneHop,
                };
            }
            if (result.kgTotals?.perEntity) {
                collection.value.meta.kgPerEntity = result.kgTotals.perEntity;
            }
            if (result.caps) {
                collection.value.meta.enrichmentCaps = {
                    maxEntities: result.caps.maxEntities,
                    maxRelationships: result.caps.maxRelationships,
                    maxEvents: result.caps.maxEvents,
                    maxEventHubs: result.caps.maxEventHubs,
                };
            }
            if (result.truncated) {
                collection.value.meta.enrichmentTruncated = {
                    entities: result.truncated.entities,
                    relationships: result.truncated.relationships,
                    events: result.truncated.events,
                    eventHubs: result.truncated.eventHubs,
                };
            }
            enrichmentLastRun.value = {
                anchorNeids: [...anchorNeids],
                hops: 1,
                includeEvents,
                ranAt: new Date().toISOString(),
            };
            await generateEnrichmentLanguage();
            await loadEnrichmentContextData();
        } catch (e: any) {
            console.error('Enrichment failed:', e.message);
        } finally {
            enriching.value = false;
        }
    }

    async function generateEnrichmentWatchlist(options?: {
        maxThemes?: number;
        maxEvents?: number;
    }): Promise<void> {
        enrichmentWatchlistLoading.value = true;
        enrichmentWatchlistError.value = null;
        try {
            const result = await $fetch<{
                themes: WatchlistTheme[];
                generatedFromEventCount: number;
                generationSource: 'gemini' | 'fallback';
                generationNote?: string;
            }>('/api/collection/enrichment-watchlist', {
                method: 'POST',
                body: {
                    maxThemes: options?.maxThemes ?? 4,
                    maxEvents: options?.maxEvents ?? 24,
                    projectId: activeProject.value?.id,
                    context: {
                        entities: collection.value.entities.map((entity) => ({
                            neid: entity.neid,
                            name: entity.name,
                        })),
                        events: collection.value.events.map((eventItem) => ({
                            neid: eventItem.neid,
                            name: eventItem.name,
                            date: eventItem.date,
                            category: eventItem.category,
                            description: eventItem.description,
                            participantNeids: eventItem.participantNeids,
                            extractedSeed: eventItem.extractedSeed,
                        })),
                    },
                },
            });
            enrichmentWatchlistThemes.value = result.themes ?? [];
            enrichmentWatchlistGeneratedAt.value = new Date().toISOString();
            if (result.generationNote) enrichmentWatchlistError.value = result.generationNote;
        } catch (e: any) {
            enrichmentWatchlistThemes.value = [];
            enrichmentWatchlistError.value =
                e?.data?.statusMessage || e?.message || 'Failed to generate watchlist insights.';
        } finally {
            enrichmentWatchlistLoading.value = false;
        }
    }

    watch(
        () => activeProject.value?.id,
        (nextProjectId, previousProjectId) => {
            if (nextProjectId === previousProjectId) return;
            collection.value = emptyCollectionState(activeProject.value);
            if (nextProjectId) {
                void bootstrap();
            }
        }
    );

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
        agentStepsLive.value = null;
        agentRunDetails.value = {};
        agentTraceLive.value = [];
        try {
            const prompt = gatewayPromptForAction(action, params, resolveEntityName);
            const response = await fetch('/api/collection/agent-orchestrator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    question: prompt,
                    entityNeid: params?.entityNeid,
                    projectId: activeProject.value?.id,
                }),
            });

            if (!response.ok || !response.body) {
                const text = await response.text();
                agentResult.value = {
                    output: text || 'Agent action failed',
                    citations: [],
                };
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let boundary = buffer.indexOf('\n\n');
                while (boundary !== -1) {
                    const chunk = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary + 2);

                    const eventMatch = chunk.match(/^event:\s*(.+)/m);
                    const dataMatch = chunk.match(/^data:\s*(.+)/m);
                    if (!eventMatch || !dataMatch) {
                        boundary = buffer.indexOf('\n\n');
                        continue;
                    }

                    const eventType = eventMatch[1].trim();
                    let payload: any;
                    try {
                        payload = JSON.parse(dataMatch[1]);
                    } catch {
                        boundary = buffer.indexOf('\n\n');
                        continue;
                    }

                    if (eventType === 'steps') {
                        agentStepsLive.value = (payload as AgentPipelineStep[]).map((s) => ({
                            ...s,
                        }));
                    } else if (eventType === 'trace') {
                        const trace = payload as AgentTraceEntry;
                        if (trace?.message) {
                            agentTraceLive.value = [...agentTraceLive.value, trace].slice(-80);
                        }
                    } else if (eventType === 'agent-detail') {
                        const detail = payload as AgentRunDetails[keyof AgentRunDetails];
                        if (detail?.agent === 'planning') {
                            agentRunDetails.value = {
                                ...agentRunDetails.value,
                                planning: detail,
                            };
                        } else if (detail?.agent === 'context') {
                            agentRunDetails.value = {
                                ...agentRunDetails.value,
                                context: detail,
                            };
                        } else if (detail?.agent === 'composition') {
                            agentRunDetails.value = {
                                ...agentRunDetails.value,
                                composition: detail,
                            };
                        }
                    } else if (eventType === 'result') {
                        const result = payload as AgentAnswerResult;
                        const output = result?.output?.trim() || 'Agent returned no text response.';
                        agentResult.value = {
                            output,
                            citations: result?.citations ?? [],
                            generationSource: result?.generationSource ?? 'fallback',
                            generationNote: result?.generationNote,
                            usage: result?.usage,
                            agentSteps: (result?.agentSteps ?? []) as AgentPipelineStep[],
                        };
                        if (result?.usage) {
                            addGeminiUsage({
                                model: result.usage.model,
                                promptTokens: result.usage.promptTokens,
                                completionTokens: result.usage.completionTokens,
                                totalTokens: result.usage.totalTokens,
                                costUsd: result.usage.costUsd,
                                latencyMs: 0,
                                timestamp: new Date().toISOString(),
                                label: `collection_answer:${action}`,
                            });
                        }
                    }

                    boundary = buffer.indexOf('\n\n');
                }
            }
        } catch (e: any) {
            agentResult.value = {
                output: e.data?.statusMessage || e.message || 'Agent action failed',
                citations: [],
            };
        } finally {
            agentLoading.value = false;
            agentStepsLive.value = null;
        }
    }

    async function runAskYottaAction(
        action: 'summarize_collection' | 'answer_question',
        prompt: string
    ): Promise<void> {
        const question = prompt.trim();
        if (!question || askYottaLoading.value) return;

        const history = mapAskYottaHistory(askYottaThread.value);
        const turn: AskYottaThreadTurn = {
            id: crypto.randomUUID(),
            question,
            answer: null,
            status: 'loading',
            steps: [
                {
                    step: 1,
                    status: 'working',
                    label: 'Planning Agent',
                    detail: 'Interpreting your question and selecting a retrieval strategy...',
                },
                {
                    step: 2,
                    status: 'pending',
                    label: 'Context Agent',
                    detail: 'Gathering grounded evidence from collection and graph context...',
                },
                {
                    step: 3,
                    status: 'pending',
                    label: 'Composition Agent',
                    detail: 'Composing a concise grounded answer...',
                },
            ],
            agentDetails: {},
            askedAt: new Date().toISOString(),
        };
        askYottaThread.value.push(turn);
        askYottaLoading.value = true;

        try {
            const response = await fetch('/api/collection/agent-orchestrator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    question,
                    conversationHistory: history,
                    projectId: activeProject.value?.id,
                }),
            });

            if (!response.ok || !response.body) {
                const text = await response.text();
                turn.answer = {
                    output: text || 'Agent action failed',
                    citations: [],
                };
                turn.status = 'error';
                turn.completedAt = new Date().toISOString();
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                let boundary = buffer.indexOf('\n\n');
                while (boundary !== -1) {
                    const chunk = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary + 2);

                    const eventMatch = chunk.match(/^event:\s*(.+)/m);
                    const dataMatch = chunk.match(/^data:\s*(.+)/m);
                    if (!eventMatch || !dataMatch) {
                        boundary = buffer.indexOf('\n\n');
                        continue;
                    }

                    const eventType = eventMatch[1].trim();
                    let payload: any;
                    try {
                        payload = JSON.parse(dataMatch[1]);
                    } catch {
                        boundary = buffer.indexOf('\n\n');
                        continue;
                    }

                    if (eventType === 'steps') {
                        turn.steps = (payload as AgentPipelineStep[]).map((step) => ({ ...step }));
                    } else if (eventType === 'agent-detail') {
                        const detail = payload as AgentRunDetails[keyof AgentRunDetails];
                        if (detail?.agent === 'planning') {
                            turn.agentDetails = {
                                ...turn.agentDetails,
                                planning: detail,
                            };
                        } else if (detail?.agent === 'context') {
                            turn.agentDetails = {
                                ...turn.agentDetails,
                                context: detail,
                            };
                        } else if (detail?.agent === 'composition') {
                            turn.agentDetails = {
                                ...turn.agentDetails,
                                composition: detail,
                            };
                        }
                    } else if (eventType === 'result') {
                        const result = payload as AskYottaAnswerResult;
                        turn.answer = {
                            output: result?.output?.trim() || 'Agent returned no text response.',
                            citations: result?.citations ?? [],
                            generationSource: result?.generationSource ?? 'fallback',
                            generationNote: result?.generationNote,
                            usage: result?.usage,
                            agentSteps: (result?.agentSteps ?? []) as AgentPipelineStep[],
                            evidenceLines: result?.evidenceLines ?? [],
                        };
                        if (result?.agentSteps?.length) {
                            turn.steps = result.agentSteps.map((step) => ({ ...step }));
                        }
                        if (result?.usage) {
                            addGeminiUsage({
                                model: result.usage.model,
                                promptTokens: result.usage.promptTokens,
                                completionTokens: result.usage.completionTokens,
                                totalTokens: result.usage.totalTokens,
                                costUsd: result.usage.costUsd,
                                latencyMs: result.usage.latencyMs ?? 0,
                                timestamp: new Date().toISOString(),
                                label: `collection_answer:${action}`,
                            });
                        }
                        turn.status =
                            result?.generationSource === 'fallback' && !result?.output?.trim()
                                ? 'error'
                                : 'completed';
                        turn.completedAt = new Date().toISOString();
                    }

                    boundary = buffer.indexOf('\n\n');
                }
            }
        } catch (e: any) {
            turn.answer = {
                output: e.data?.statusMessage || e.message || 'Agent action failed',
                citations: [],
            };
            turn.status = 'error';
            turn.completedAt = new Date().toISOString();
        } finally {
            askYottaLoading.value = false;
        }
    }

    function selectEntity(neid: string | null): void {
        selectedEventNeid.value = null;
        selectedEntityNeid.value = neid;
    }

    function selectEvent(neid: string | null): void {
        selectedEntityNeid.value = null;
        selectedEventNeid.value = neid;
    }

    function setTab(tab: WorkspaceTab): void {
        activeTab.value = tab;
    }

    function setEnrichmentAnchors(anchorNeids: string[]): void {
        enrichmentAnchorNeids.value = [...new Set(anchorNeids)];
    }

    function setEnrichmentIncludeEvents(includeEvents: boolean): void {
        enrichmentIncludeEvents.value = includeEvents;
    }

    function resolveEntityName(neid: string): string {
        const entity = collection.value.entities.find((e) => e.neid === neid);
        if (entity) return entityDisplayName(entity);
        const doc = collection.value.documents.find((d) => d.neid === neid);
        if (doc) return doc.title;
        return neid;
    }

    return {
        collection: computed(() => collection.value),
        activeTab: computed(() => activeTab.value),
        selectedEntityNeid: computed(() => selectedEntityNeid.value),
        selectedEventNeid: computed(() => selectedEventNeid.value),
        selectedEntity,
        selectedEvent,
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
        agentStepsLive: computed(() => agentStepsLive.value),
        agentRunDetails: computed(() => agentRunDetails.value),
        agentTraceLive: computed(() => agentTraceLive.value),
        askYottaLoading: computed(() => askYottaLoading.value),
        askYottaThread: computed(() => askYottaThread.value),
        mcpLog: computed(() => mcpLog.value),
        geminiLog: computed(() => geminiLog.value),
        documents,
        entities,
        events,
        relationships,
        propertySeries,
        extractedPropertyCount,
        propertyBearingRecordCount,
        entityPropertyCount,
        propertyBearingEntityCount,
        meta,
        primaryMeta,
        documentEntities,
        documentEvents,
        enrichedEntities,
        enrichedEntitiesDegree1,
        enrichedEntitiesDegree2,
        documentRelationships,
        enrichedRelationships,
        enrichedRelationshipsDegree1,
        enrichedRelationshipsDegree2,
        enrichmentAnchorNeids: computed(() => enrichmentAnchorNeids.value),
        enrichmentIncludeEvents: computed(() => enrichmentIncludeEvents.value),
        enrichmentLastRun: computed(() => enrichmentLastRun.value),
        hasEnrichmentRun,
        enrichmentDocumentGraphEntities,
        enrichmentDocumentGraphRelationships,
        enrichmentSupersetGraphEntities,
        enrichmentSupersetGraphRelationships,
        enrichmentGraphEntities,
        enrichmentGraphRelationships,
        enrichmentExpandedGraphEntities,
        enrichmentExpandedGraphRelationships: enrichmentExpandedGraphRelationshipsCollapsed,
        enrichmentCollapsedOrganizationCount,
        enrichmentCollapsedRepresentativeByNeid,
        enrichmentInsights,
        enrichmentTakeawayBullets,
        enrichmentValueSummary,
        lineageInsights,
        lineageResults,
        lineageInvestigation: computed(() => lineageInvestigation.value),
        lineageDebugEntries: computed(() => lineageDebugEntries.value),
        broaderActivityInsights,
        eventTimelineInsights,
        peopleAffiliationInsights,
        enrichmentLanguageLoading: computed(() => enrichmentLanguageLoading.value),
        enrichmentLanguageError: computed(() => enrichmentLanguageError.value),
        enrichmentCounts,
        enrichmentComparison,
        strictProjectLocationEntities,
        recentCoverageAnchors,
        keyQuestionEntities,
        enrichmentNews: computed(() => enrichmentNews.value),
        enrichmentNewsLoading: computed(() => enrichmentNewsLoading.value),
        enrichmentNewsError: computed(() => enrichmentNewsError.value),
        filteredNews: computed(() => filteredNews.value),
        dedupedFilteredNewsArticles,
        filteredNewsCategories: computed(() => filteredNewsCategories.value),
        filteredNewsLoading: computed(() => filteredNewsLoading.value),
        filteredNewsRefreshing: computed(() => filteredNewsRefreshing.value),
        filteredNewsInitialized: computed(() => filteredNewsInitialized.value),
        filteredNewsError: computed(() => filteredNewsError.value),
        enrichmentEconomicSignals: computed(() => enrichmentEconomicSignals.value),
        enrichmentEconomicLoading: computed(() => enrichmentEconomicLoading.value),
        enrichmentEconomicError: computed(() => enrichmentEconomicError.value),
        enrichmentRelatedDeals: computed(() => enrichmentRelatedDeals.value),
        enrichmentRelatedDealsLoading: computed(() => enrichmentRelatedDealsLoading.value),
        enrichmentRelatedDealsError: computed(() => enrichmentRelatedDealsError.value),
        enrichmentWatchlistThemes: computed(() => enrichmentWatchlistThemes.value),
        enrichmentWatchlistLoading: computed(() => enrichmentWatchlistLoading.value),
        enrichmentWatchlistError: computed(() => enrichmentWatchlistError.value),
        enrichmentWatchlistGeneratedAt: computed(() => enrichmentWatchlistGeneratedAt.value),
        agreements,
        documentAgreements,
        extractedSeedEntities,
        mcpConfirmedEntities,
        mcpOnlyRelationships,
        flavorCounts,
        relationshipTypeCounts,
        topEntities,
        topEvents,
        relationshipHighlights,
        trustCoverageSummary,
        keyCoverageNotes,
        collectionSummary,
        primaryCollectionSummary,
        recommendedActions,
        contextualAgentPrompts,
        overviewViewModel,
        bootstrap,
        rebuild,
        enrich,
        generateEnrichmentLanguage,
        loadEnrichmentContextData,
        loadFilteredNews,
        sortDedupedNewsArticles,
        generateEnrichmentWatchlist,
        fetchPropertyHistory,
        runLineageInvestigation,
        runAgentAction,
        runAskYottaAction,
        addGeminiUsage,
        selectEntity,
        selectEvent,
        setTab,
        setEnrichmentAnchors,
        setEnrichmentIncludeEvents,
        resolveEntityName,
    };
}
