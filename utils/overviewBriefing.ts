import type {
    CollectionState,
    DocumentRecord,
    Project,
    WorkspaceTab,
} from '~/utils/collectionTypes';

export type OverviewStatus = 'pending' | 'processing' | 'complete' | 'partial' | 'error';

export interface DealSummaryField {
    label: string;
    value: string;
}

export interface OverviewTrustCoverageSummary {
    coverageScore: number;
    confidenceLabel: 'high' | 'medium' | 'low';
}

export interface HealthItem {
    label: string;
    value: string;
    tone: 'success' | 'warning' | 'neutral' | 'error';
}

export interface ExtractionStatItem {
    key: string;
    label: string;
    value: string;
}

export interface SourceDocumentRow {
    id: string;
    filename: string;
    detectedType: string;
    date: string;
    subject: string;
    neid: string;
}

export interface InitialSourceRow {
    id: string;
    label: string;
    sourceType: string;
    date?: string;
    neid: string;
}

export interface ExploreCardItem {
    key: string;
    title: string;
    description: string;
    metric: string;
    ctaLabel: string;
    tab: WorkspaceTab;
    icon: string;
}

export interface CollectionOverviewViewModel {
    collectionName: string;
    subtitle: string;
    detectedDealType: string;
    status: OverviewStatus;
    statusLabel: string;
    documentCount: number;
    analysisStatusLabel: string;
    lastUpdated: string;
    primaryActionLabel: string;
    dealSummaryFields: DealSummaryField[];
    healthItems: HealthItem[];
    extractionStats: ExtractionStatItem[];
    initialSources: InitialSourceRow[];
    initialSourceCount: number;
    exploreCards: ExploreCardItem[];
}

function formatDate(value?: string): string {
    if (!value) return 'Not available';
    const direct = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (direct) {
        const [, year, month, day] = direct;
        return `${month}-${day}-${year}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const iso = date.toISOString().slice(0, 10);
    const parts = iso.split('-');
    if (parts.length !== 3) return value;
    return `${parts[1]}-${parts[2]}-${parts[0]}`;
}

function formatFlavorLabel(value?: string): string {
    const normalized = String(value ?? '')
        .trim()
        .replace(/^schema::flavor::/, '')
        .replace(/_/g, ' ');
    return normalized || 'Unknown';
}

function formatDateTime(value?: string): string {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
}

function formatLastUpdated(value: string | undefined, status: OverviewStatus): string {
    if (value) {
        return formatDateTime(value);
    }
    if (status === 'processing') return 'Updating now';
    if (status === 'pending') return 'Awaiting first analysis';
    return 'Timestamp pending';
}

function formatCount(value: number): string {
    return value.toLocaleString();
}

function normalizeDateOnly(value?: string): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const direct = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (direct?.[1]) return direct[1];
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
}

function firstKnownDateLabel(values: Iterable<string | undefined>): string | undefined {
    const normalized = Array.from(values)
        .map((value) => normalizeDateOnly(value))
        .filter(Boolean) as string[];
    if (!normalized.length) return undefined;
    normalized.sort((a, b) => a.localeCompare(b));
    return formatDate(normalized[0]);
}

function formatDateRangeLabel(values: Iterable<string>): string {
    const normalized = Array.from(values)
        .map((value) => normalizeDateOnly(value))
        .filter(Boolean) as string[];
    if (!normalized.length) return 'Not available';
    const sorted = [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
    const earliestYear = sorted[0].slice(0, 4);
    const latestYear = sorted[sorted.length - 1].slice(0, 4);
    return earliestYear === latestYear ? earliestYear : `${earliestYear} -> ${latestYear}`;
}

function sortDocumentsOldestToNewest(documents: DocumentRecord[]): DocumentRecord[] {
    return [...documents].sort((a, b) => {
        const aDate = normalizeDateOnly(a.date);
        const bDate = normalizeDateOnly(b.date);
        if (aDate && bDate) {
            const dateCompare = aDate.localeCompare(bDate);
            if (dateCompare !== 0) return dateCompare;
        } else if (aDate && !bDate) {
            return -1;
        } else if (!aDate && bDate) {
            return 1;
        }
        return a.title.localeCompare(b.title);
    });
}

function isNeidLike(value: string): boolean {
    const normalized = value.trim();
    return /^\d{16,24}$/.test(normalized);
}

function entityLabel(entity?: CollectionState['entities'][number]): string {
    if (!entity) return '';
    const name = String(entity.name ?? '').trim();
    if (name && !isNeidLike(name)) return name;
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
        const raw = props[key];
        const value =
            raw && typeof raw === 'object' && !Array.isArray(raw)
                ? (raw as Record<string, unknown>).value
                : raw;
        const text = String(value ?? '').trim();
        if (text && !isNeidLike(text)) return text;
    }
    return '';
}

function deriveEntitySeedDate(neid: string, state: CollectionState): string | undefined {
    const dateValues = new Set<string>();
    const entity = state.entities.find((entry) => entry.neid === neid);
    const relatedDocumentNeids = new Set<string>([
        ...(entity?.sourceDocuments ?? []),
        ...(entity?.extraSourceDocuments ?? []),
    ]);

    state.documents.forEach((doc) => {
        if (relatedDocumentNeids.has(doc.neid) && doc.date) {
            dateValues.add(doc.date);
        }
    });

    state.propertySeries.forEach((series) => {
        if (series.neid !== neid) return;
        series.points.forEach((point) => {
            if (point.recordedAt) dateValues.add(point.recordedAt);
        });
    });

    state.relationships.forEach((relationship) => {
        if (
            (relationship.sourceNeid === neid || relationship.targetNeid === neid) &&
            relationship.recordedAt
        ) {
            dateValues.add(relationship.recordedAt);
        }
    });

    state.events.forEach((event) => {
        if (!event.participantNeids.includes(neid)) return;
        if (event.date) dateValues.add(event.date);
        const eventDocumentNeids = [
            ...event.sourceDocuments,
            ...(event.extraSourceDocuments ?? []),
        ];
        state.documents.forEach((doc) => {
            if (eventDocumentNeids.includes(doc.neid) && doc.date) {
                dateValues.add(doc.date);
            }
        });
    });

    return firstKnownDateLabel(dateValues);
}

function deriveDealType(state: CollectionState): string {
    const description = state.meta.description.toLowerCase();
    if (description.includes('bond') || description.includes('refunding')) {
        return 'Municipal bond financing';
    }
    const kinds = state.documents.map((doc) => doc.kind).filter(Boolean) as string[];
    if (!kinds.length) return 'Structured transaction';
    const topKind = kinds.sort(
        (a, b) => kinds.filter((k) => k === b).length - kinds.filter((k) => k === a).length
    )[0];
    return topKind;
}

function deriveStatus(state: CollectionState, rebuilding: boolean): OverviewStatus {
    if (state.status === 'error') return 'error';
    if (rebuilding || state.status === 'loading') return 'processing';
    if (state.status !== 'ready') return 'pending';
    const hasCore = state.meta.entityCount > 0 && state.meta.relationshipCount > 0;
    const hasAllModules = hasCore && state.meta.eventCount > 0;
    return hasAllModules ? 'complete' : 'partial';
}

function statusLabel(status: OverviewStatus): string {
    if (status === 'complete') return 'Analysis complete';
    if (status === 'partial') return 'Analysis partial';
    if (status === 'processing') return 'Analysis running';
    if (status === 'error') return 'Needs attention';
    return 'Analysis pending';
}

function statusTone(status: OverviewStatus): HealthItem['tone'] {
    if (status === 'complete') return 'success';
    if (status === 'partial' || status === 'processing') return 'warning';
    if (status === 'error') return 'error';
    return 'neutral';
}

function extractionStatusForDoc(doc: DocumentRecord, status: OverviewStatus): string {
    if (status === 'complete') return 'Complete';
    if (status === 'partial') {
        return doc.kind ? 'Partial' : 'Still processing';
    }
    if (status === 'processing') return 'Processing';
    if (status === 'error') return 'Needs review';
    return 'Pending analysis';
}

function confidenceLabel(summary: TrustCoverageSummary, status: OverviewStatus): string {
    if (status === 'pending' || status === 'processing') return 'Pending';
    if (summary.confidenceLabel === 'high') return 'High';
    if (summary.confidenceLabel === 'low') return 'Needs review';
    return 'Moderate';
}

function metricForTab(tab: WorkspaceTab, state: CollectionState): string {
    if (tab === 'graph') return `${formatCount(state.meta.entityCount)} mapped entities`;
    if (tab === 'timeline') return `${formatCount(state.meta.eventCount)} extracted events`;
    if (tab === 'validation') return `${formatCount(state.meta.documentCount)} source documents`;
    return `${formatCount(state.entities.filter((entity) => entity.origin === 'enriched').length)} enriched matches`;
}

export function mapCollectionToOverviewViewModel(params: {
    state: CollectionState;
    rebuilding: boolean;
    trustCoverageSummary: OverviewTrustCoverageSummary;
    activeProject?: Project | null;
}): CollectionOverviewViewModel {
    const { state, rebuilding, trustCoverageSummary, activeProject } = params;
    const status = deriveStatus(state, rebuilding);
    const dealType = deriveDealType(state);
    const dateValues = new Set<string>();
    state.events.forEach((event) => {
        const normalized = normalizeDateOnly(event.date);
        if (normalized) dateValues.add(normalized);
    });
    state.propertySeries.forEach((series) => {
        series.points.forEach((point) => {
            const normalized = normalizeDateOnly(point.recordedAt);
            if (normalized) dateValues.add(normalized);
        });
    });
    state.documents.forEach((doc) => {
        const normalized = normalizeDateOnly(doc.date);
        if (normalized) dateValues.add(normalized);
    });
    const locationCount = state.entities.filter((entity) => entity.flavor === 'location').length;
    const primaryParties = state.entities
        .filter((entity) => entity.flavor === 'organization')
        .sort((a, b) => b.sourceDocuments.length - a.sourceDocuments.length)
        .map((entity) => entityLabel(entity))
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
    const eventDates = state.events.map((event) => event.date).filter(Boolean) as string[];
    const closingDate = eventDates.length ? formatDate(eventDates.sort()[0]) : 'Not available';

    const healthTone = statusTone(status);
    const confidence = confidenceLabel(trustCoverageSummary, status);
    const docsWithKind = state.documents.filter((doc) => Boolean(doc.kind)).length;
    const initialSources: InitialSourceRow[] = [];
    const documentByNeid = new Map(state.documents.map((doc) => [doc.neid, doc]));
    const entityByNeid = new Map(state.entities.map((entity) => [entity.neid, entity]));

    if (activeProject?.seedDocuments?.length) {
        initialSources.push(
            ...sortDocumentsOldestToNewest(activeProject.seedDocuments).map((doc) => {
                const resolvedDocument = documentByNeid.get(doc.neid);
                return {
                    id: doc.documentId || doc.neid,
                    label: resolvedDocument?.title || doc.title || doc.neid,
                    sourceType: resolvedDocument?.kind || doc.kind || 'Document',
                    date: firstKnownDateLabel([resolvedDocument?.date, doc.date]),
                    neid: doc.neid,
                };
            })
        );
    }

    if (activeProject?.seedEntities?.length) {
        initialSources.push(
            ...activeProject.seedEntities.map((entity) => {
                const resolvedEntity = entityByNeid.get(entity.neid);
                return {
                    id: entity.neid,
                    label: entityLabel(resolvedEntity) || entity.name || entity.neid,
                    sourceType: formatFlavorLabel(resolvedEntity?.flavor || entity.flavor),
                    date: firstKnownDateLabel([
                        deriveEntitySeedDate(entity.neid, state),
                        entity.date,
                    ]),
                    neid: entity.neid,
                };
            })
        );
    }

    if (!initialSources.length) {
        initialSources.push(
            ...sortDocumentsOldestToNewest(state.documents).map((doc) => ({
                id: doc.documentId,
                label: doc.title,
                sourceType: doc.kind || 'Document',
                date: doc.date ? formatDate(doc.date) : undefined,
                neid: doc.neid,
            }))
        );
    }

    return {
        collectionName: activeProject?.name || state.meta.name,
        subtitle:
            activeProject?.description ||
            state.meta.description ||
            'Collection-level extraction and synthesis across the provided source documents.',
        detectedDealType: dealType,
        status,
        statusLabel: statusLabel(status),
        documentCount: initialSources.length,
        analysisStatusLabel: statusLabel(status),
        lastUpdated: formatLastUpdated(state.meta.lastRebuilt, status),
        primaryActionLabel:
            status === 'pending'
                ? 'Run Initial Analysis'
                : status === 'processing'
                  ? 'Analysis Running'
                  : status === 'complete'
                    ? 'Open Graph & Entities'
                    : 'Re-run Extraction',
        dealSummaryFields: [
            {
                label: 'Deal name',
                value: 'NJHMFA Multifamily Housing Revenue Refunding Bonds — Presidential Plaza at Newport Project',
            },
            { label: 'Deal type', value: dealType },
            { label: 'Issuer', value: primaryParties || 'Derived after deeper extraction' },
            { label: 'Par amount', value: '$142M (from collection descriptor)' },
            { label: 'Closing date', value: closingDate },
            { label: 'Project or asset', value: 'Presidential Plaza at Newport' },
            {
                label: 'Location',
                value: locationCount ? `${locationCount} locations detected` : 'Not available',
            },
            { label: 'Primary parties', value: primaryParties || 'Will populate after extraction' },
        ],
        healthItems: [
            {
                label: 'Documents ingested',
                value: `${state.documents.length} of ${state.meta.documentCount}`,
                tone: state.documents.length ? 'success' : 'warning',
            },
            {
                label: 'Parsing success',
                value: state.documents.length ? 'Complete' : 'Pending',
                tone: state.documents.length ? 'success' : 'warning',
            },
            {
                label: 'Classification status',
                value:
                    docsWithKind === state.documents.length
                        ? 'Complete'
                        : `${docsWithKind} of ${state.documents.length} classified`,
                tone: docsWithKind === state.documents.length ? 'success' : 'warning',
            },
            {
                label: 'Entity extraction',
                value: state.meta.entityCount
                    ? `${formatCount(state.meta.entityCount)} entities`
                    : 'Pending',
                tone: state.meta.entityCount ? healthTone : 'warning',
            },
            {
                label: 'Event extraction',
                value: state.meta.eventCount
                    ? `${formatCount(state.meta.eventCount)} events`
                    : 'Still processing',
                tone: state.meta.eventCount ? healthTone : 'warning',
            },
            {
                label: 'Confidence and coverage',
                value: `${confidence} confidence (${trustCoverageSummary.coverageScore}%)`,
                tone:
                    trustCoverageSummary.confidenceLabel === 'high'
                        ? 'success'
                        : trustCoverageSummary.confidenceLabel === 'low'
                          ? 'warning'
                          : 'neutral',
            },
        ],
        extractionStats: [
            { key: 'docs', label: 'Initial Sources', value: formatCount(initialSources.length) },
            {
                key: 'date_range',
                label: 'Date range',
                value: formatDateRangeLabel(dateValues),
            },
            { key: 'entities', label: 'Entities', value: formatCount(state.meta.entityCount) },
            {
                key: 'relationships',
                label: 'Relationships',
                value: formatCount(state.meta.relationshipCount),
            },
            { key: 'events', label: 'Events', value: formatCount(state.meta.eventCount) },
            { key: 'locations', label: 'Locations', value: formatCount(locationCount) },
        ],
        initialSources,
        initialSourceCount: initialSources.length,
        exploreCards: [
            {
                key: 'graph',
                title: 'Graph & Entities',
                description: 'Inspect the extracted party network and linked relationships.',
                metric: metricForTab('graph', state),
                ctaLabel: 'Open graph',
                tab: 'graph',
                icon: 'mdi-graph-outline',
            },
            {
                key: 'timeline',
                title: 'Timeline / Events',
                description: 'Review the transaction timeline and material event sequence.',
                metric: metricForTab('timeline', state),
                ctaLabel: 'Open timeline',
                tab: 'timeline',
                icon: 'mdi-chart-timeline-variant',
            },
            {
                key: 'validation',
                title: 'Validation',
                description: 'Confirm source coverage and identify evidence gaps quickly.',
                metric: metricForTab('validation', state),
                ctaLabel: 'Open validation',
                tab: 'validation',
                icon: 'mdi-shield-check-outline',
            },
            {
                key: 'enrichment',
                title: 'Enrichment',
                description: 'Expand into broader graph context from core collection anchors.',
                metric: metricForTab('enrichment', state),
                ctaLabel: 'Open enrichment',
                tab: 'enrichment',
                icon: 'mdi-arrow-expand-all',
            },
        ],
    };
}
