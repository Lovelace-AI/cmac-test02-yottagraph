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
import { mapCollectionToOverviewViewModel } from '~/utils/overviewBriefing';
import { projectCollapsedOrganizationLineage } from '~/utils/enrichmentLineage';

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

function normalizeRelationshipType(type: string): string {
    return type.replace(/^schema::relationship::/, '');
}

const INITIAL_STEPS: RebuildStep[] = [
    {
        step: 1,
        status: 'pending',
        label: 'Baseline Load',
        detail: 'Loading extracted JSON baseline...',
    },
    {
        step: 2,
        status: 'pending',
        label: 'Loading Entities',
        detail: 'Resolving extracted entities through MCP traversal...',
    },
    {
        step: 3,
        status: 'pending',
        label: 'Loading Events',
        detail: 'Resolving extracted events from hub entities...',
    },
    {
        step: 4,
        status: 'pending',
        label: 'Loading Relationships',
        detail: 'Building document and participant links...',
    },
    {
        step: 5,
        status: 'pending',
        label: 'Loading Properties',
        detail: 'Loading extracted properties and historical series...',
    },
    { step: 6, status: 'pending', label: 'Finalizing', detail: 'Building collection state...' },
];

const collection = ref<CollectionState>(emptyCollectionState());
const activeTab = ref<WorkspaceTab>('overview');
const selectedEntityNeid = ref<string | null>(null);
const rebuilding = ref(false);
const rebuildSteps = ref<RebuildStep[]>(INITIAL_STEPS.map((s) => ({ ...s })));
const enriching = ref(false);
const enrichmentAnchorNeids = ref<string[]>([]);
const enrichmentHops = ref<1 | 2>(1);
const enrichmentIncludeEvents = ref(true);
const enrichmentLastRun = ref<{
    anchorNeids: string[];
    hops: 1 | 2;
    includeEvents: boolean;
    ranAt: string;
} | null>(null);
const agentLoading = ref(false);
const agentResult = ref<{
    output: string;
    citations: any[];
    generationSource?: 'gemini' | 'fallback';
    generationNote?: string;
} | null>(null);
const mcpLog = ref<McpLogEntry[]>([]);
const geminiLog = ref<GeminiUsageEntry[]>([]);
let _geminiIdCounter = 0;
const enrichmentWatchlistThemes = ref<WatchlistTheme[]>([]);
const enrichmentWatchlistLoading = ref(false);
const enrichmentWatchlistError = ref<string | null>(null);
const enrichmentWatchlistGeneratedAt = ref<string | null>(null);
const enrichmentLanguageByInsightId = ref<Record<string, EnrichmentLanguageCard>>({});
const enrichmentLanguageLoading = ref(false);
const enrichmentLanguageError = ref<string | null>(null);

export function useCollectionWorkspace() {
    const isReady = computed(() => collection.value.status === 'ready');
    const isLoading = computed(() => rebuilding.value || collection.value.status === 'loading');

    const documents = computed(() => collection.value.documents);
    const entities = computed(() => collection.value.entities);
    const events = computed(() => collection.value.events);
    const relationships = computed(() => collection.value.relationships);
    const propertySeries = computed(() => collection.value.propertySeries);
    const meta = computed(() => collection.value.meta);
    const extractedPropertyCount = computed(
        () => collection.value.meta.extractedPropertyCount ?? 0
    );
    const propertyBearingRecordCount = computed(
        () => collection.value.meta.extractedPropertyRecordCount ?? 0
    );
    const entityPropertyCount = computed(() =>
        collection.value.entities.reduce(
            (sum, entity) => sum + Object.keys(entity.properties ?? {}).length,
            0
        )
    );
    const propertyBearingEntityCount = computed(
        () =>
            new Set(
                collection.value.entities
                    .filter((entity) => Object.keys(entity.properties ?? {}).length > 0)
                    .map((entity) => entity.neid)
            ).size
    );

    const documentEntities = computed(() =>
        collection.value.entities.filter((e) => e.origin === 'document')
    );
    const enrichedEntities = computed(() =>
        collection.value.entities.filter((e) => e.origin === 'enriched')
    );
    const documentRelationships = computed(() =>
        collection.value.relationships.filter((relationship) => relationship.origin === 'document')
    );
    const enrichedRelationships = computed(() =>
        collection.value.relationships.filter((relationship) => relationship.origin === 'enriched')
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
    const hasEnrichmentRun = computed(() => Boolean(enrichmentLastRun.value));
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
        ['06157989400122873900', 95], // HSBC Bank USA, National Association
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
    const eventCountByEntityNeid = computed(() => {
        const counts = new Map<string, number>();
        for (const eventItem of collection.value.events) {
            for (const participantNeid of eventItem.participantNeids) {
                counts.set(participantNeid, (counts.get(participantNeid) ?? 0) + 1);
            }
        }
        return counts;
    });
    const outsideEvents = computed(() =>
        collection.value.events.filter((eventItem) => !eventItem.extractedSeed)
    );
    const eventByNeid = computed(
        () =>
            new Map(
                collection.value.events.map((eventItem) => [eventItem.neid, eventItem] as const)
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
    const relationshipLabel = (type: string): string => type.replace(/_/g, ' ');
    const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
        `${count} ${count === 1 ? singular : plural}`;
    const eventYear = (eventItem: EventRecord): number => {
        if (eventItem.date) {
            const year = Number(String(eventItem.date).slice(0, 4));
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
            const relatedEventNeids = collection.value.events
                .filter((eventItem) =>
                    eventItem.participantNeids.some(
                        (participantNeid) =>
                            participantNeid === predecessor.neid ||
                            participantNeid === successor.neid
                    )
                )
                .map((eventItem) => eventItem.neid);
            cards.push({
                id: cardId,
                kind: 'corporate_lineage',
                title: `${predecessorName} -> ${successorName}`,
                subtitle: 'Broader organization lineage context',
                anchorNeid: predecessor.neid,
                anchorName: predecessorName,
                documentContext: `${predecessorName} appears in your document set, but the documents do not spell out who took over later.`,
                kgContext:
                    language?.plainSummary ||
                    `${predecessorName} is linked to ${successorName} through successor/predecessor history in the broader graph.`,
                evidence: [
                    `${predecessorName} ${relationshipLabel(relationship.normalizedType)} ${successorName}`,
                    `Lineage edge surfaced from second-hop context`,
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
                rankScore,
            });
        }
        return cards
            .sort((a, b) => b.rankScore - a.rankScore)
            .slice(0, 2)
            .map(({ rankScore: _, ...card }) => card);
    });

    const broaderActivityInsights = computed<EnrichmentInsightCard[]>(() => {
        const cards: Array<EnrichmentInsightCard & { rankScore: number }> = [];
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
            const eventVolumeScore = Math.min(anchorEvents.length, 12);
            const rankScore =
                priorityScore(RELATED_DEAL_PRIORITY, anchorNeid) * 10 +
                eventVolumeScore * 3 +
                Math.min(counterpartyCount, 6) +
                (documentEntityNeids.value.has(anchorNeid) ? 15 : 0);
            cards.push({
                id: cardId,
                kind: 'broader_activity',
                title: `${anchorName}: broader participant activity`,
                subtitle: 'Outside activity connected to this participant',
                anchorNeid,
                anchorName,
                documentContext: `${anchorName} appears in your document set. The items below are additional events linked to the same participant in the wider graph.`,
                kgContext:
                    anchorEvents.length > eventRows.length
                        ? language?.plainSummary ||
                          `${anchorName} is linked to ${pluralize(anchorEvents.length, 'outside event')}. This card shows ${pluralize(eventRows.length, 'example')} so you can decide whether they are truly related to your transaction.`
                        : language?.plainSummary ||
                          `${anchorName} is linked to ${pluralize(anchorEvents.length, 'outside event')} and ${pluralize(counterpartyCount, 'counterparty')} in broader platform data.`,
                evidence: [
                    ...eventRows.map((eventItem) => eventEvidenceLine(eventItem, anchorNeid)),
                    ...(Array.from(counterparties)
                        .slice(0, 3)
                        .map((counterparty) => `Counterparty: ${counterparty}`) ?? []),
                ],
                askPrompt: `Summarize the broader participant activity connected to ${anchorName}, then distinguish what looks transaction-related versus general external context.`,
                relatedEntityNeids: [anchorNeid],
                relatedEventNeids: eventRows.map((eventItem) => eventItem.neid),
                plainSummary:
                    language?.plainSummary ||
                    `${anchorName} has ${anchorEvents.length} outside events in second-hop context. These are participant-linked events and may or may not be part of the same core deal.`,
                relevanceLabel: language?.relevanceLabel ?? 'broader',
                sizeLabel,
                totalEventCount: anchorEvents.length,
                outsideEventCount: anchorEvents.length,
                counterpartyCount,
                participantCount,
                dateRangeLabel,
                rankScore,
            });
        }
        return cards
            .sort((a, b) => b.rankScore - a.rankScore)
            .slice(0, 2)
            .map(({ rankScore: _, ...card }) => card);
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
                        ? language?.plainSummary ||
                          `${anchorName} shows ${pluralize(extractedLinkedEvents.length, 'collection event')} plus ${pluralize(outsideLinkedEvents.length, 'outside event')}, which helps separate same-deal context from broader activity.`
                        : language?.plainSummary ||
                          `${anchorName} has ${pluralize(extractedLinkedEvents.length, 'collection event')} and limited outside activity in this run.`,
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
            .slice(0, 2)
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
                kgContext:
                    language?.plainSummary ||
                    `Yottagraph contributes external affiliation context: ${personName} ${relationshipLabel(relationship.normalizedType)} ${organizationName}.`,
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
            .slice(0, 2)
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
            bullets.push(`Corporate lineage context: ${topLineage.title}.`);
        }
        if (topActivity) {
            bullets.push(
                `Broader participant activity surfaced around ${topActivity.anchorName ?? topActivity.title}.`
            );
        }
        if (topTimeline) {
            bullets.push(
                `Timeline context expanded for ${topTimeline.anchorName ?? topTimeline.title}.`
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
    const enrichmentLanguageCards = computed(() =>
        [...lineageInsights.value, ...broaderActivityInsights.value, ...eventTimelineInsights.value]
            .slice(0, 8)
            .map((insight) => ({
                id: insight.id,
                kind: insight.kind,
                title: insight.title,
                subtitle: insight.subtitle,
                documentContext: insight.documentContext,
                kgContext: insight.kgContext,
                evidence: insight.evidence.slice(0, 6),
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
    const agreements = computed(() =>
        collection.value.entities.filter((e) => e.flavor === 'legal_agreement')
    );
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
            id: 'run-insights-deck',
            label: 'Run Insights Deck',
            description: 'Generate curated answers for executive and evidence questions.',
            tab: 'insights',
        },
        {
            id: 'export-insights-brief',
            label: 'Export Insights Brief',
            description: 'Assemble current answered questions into a report artifact.',
            tab: 'insights',
        },
        {
            id: 'compare-fact-evolution',
            label: 'Compare Fact Evolution',
            description: 'Track how entity facts change across source documents.',
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
            state: collection.value,
            rebuilding: rebuilding.value,
            trustCoverageSummary: trustCoverageSummary.value,
        })
    );

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

    async function enrich(anchorNeids: string[], hops = 1, includeEvents = true): Promise<void> {
        enriching.value = true;
        try {
            const boundedHops: 1 | 2 = hops >= 2 ? 2 : 1;
            enrichmentAnchorNeids.value = [...anchorNeids];
            enrichmentHops.value = boundedHops;
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
            }>('/api/collection/enrich', {
                method: 'POST',
                body: { anchorNeids, hops: boundedHops, includeEvents },
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
            enrichmentLastRun.value = {
                anchorNeids: [...anchorNeids],
                hops: boundedHops,
                includeEvents,
                ranAt: new Date().toISOString(),
            };
            await generateEnrichmentLanguage();
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
                generationSource?: 'gemini' | 'fallback';
                generationNote?: string;
                usage?: {
                    model: string;
                    promptTokens: number;
                    completionTokens: number;
                    totalTokens: number;
                    costUsd: number;
                };
            }>('/api/collection/agent-actions', { method: 'POST', body: { action, ...params } });
            agentResult.value = {
                output: result.output,
                citations: result.citations,
                generationSource: result.generationSource,
                generationNote: result.generationNote,
            };
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
            if (e?.statusCode === 409) {
                await bootstrap();
            }
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

    function setEnrichmentAnchors(anchorNeids: string[]): void {
        enrichmentAnchorNeids.value = [...new Set(anchorNeids)];
    }

    function setEnrichmentHops(hops: 1 | 2): void {
        enrichmentHops.value = hops;
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
        extractedPropertyCount,
        propertyBearingRecordCount,
        entityPropertyCount,
        propertyBearingEntityCount,
        meta,
        documentEntities,
        enrichedEntities,
        documentRelationships,
        enrichedRelationships,
        enrichmentAnchorNeids: computed(() => enrichmentAnchorNeids.value),
        enrichmentHops: computed(() => enrichmentHops.value),
        enrichmentIncludeEvents: computed(() => enrichmentIncludeEvents.value),
        enrichmentLastRun: computed(() => enrichmentLastRun.value),
        hasEnrichmentRun,
        enrichmentDocumentGraphEntities,
        enrichmentDocumentGraphRelationships,
        enrichmentSupersetGraphEntities,
        enrichmentSupersetGraphRelationships,
        enrichmentExpandedGraphEntities,
        enrichmentExpandedGraphRelationships: enrichmentExpandedGraphRelationshipsCollapsed,
        enrichmentCollapsedOrganizationCount,
        enrichmentCollapsedRepresentativeByNeid,
        enrichmentInsights,
        enrichmentTakeawayBullets,
        enrichmentValueSummary,
        lineageInsights,
        broaderActivityInsights,
        eventTimelineInsights,
        peopleAffiliationInsights,
        enrichmentLanguageLoading: computed(() => enrichmentLanguageLoading.value),
        enrichmentLanguageError: computed(() => enrichmentLanguageError.value),
        enrichmentWatchlistThemes: computed(() => enrichmentWatchlistThemes.value),
        enrichmentWatchlistLoading: computed(() => enrichmentWatchlistLoading.value),
        enrichmentWatchlistError: computed(() => enrichmentWatchlistError.value),
        enrichmentWatchlistGeneratedAt: computed(() => enrichmentWatchlistGeneratedAt.value),
        agreements,
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
        recommendedActions,
        contextualAgentPrompts,
        overviewViewModel,
        bootstrap,
        rebuild,
        enrich,
        generateEnrichmentLanguage,
        generateEnrichmentWatchlist,
        fetchPropertyHistory,
        runAgentAction,
        addGeminiUsage,
        selectEntity,
        setTab,
        setEnrichmentAnchors,
        setEnrichmentHops,
        setEnrichmentIncludeEvents,
        resolveEntityName,
    };
}
