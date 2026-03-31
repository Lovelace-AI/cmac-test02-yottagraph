export type DataOrigin = 'document' | 'enriched' | 'agent';

export interface DocumentRecord {
    neid: string;
    documentId: string;
    title: string;
    kind?: string;
    date?: string;
}

export interface EntityRecord {
    neid: string;
    name: string;
    flavor: string;
    sourceDocuments: string[];
    extraSourceDocuments?: string[];
    origin: DataOrigin;
    extractedSeed?: boolean;
    mcpConfirmed?: boolean;
    properties?: Record<string, unknown>;
    enrichmentDepth?: number;
}

export interface RelationshipRecord {
    sourceNeid: string;
    targetNeid: string;
    type: string;
    recordedAt?: string;
    sourceDocumentNeid?: string;
    citations?: string[];
    properties?: Record<string, unknown>;
    origin: DataOrigin;
    extractedSeed?: boolean;
    mcpConfirmed?: boolean;
    mcpOnly?: boolean;
    enrichmentDepth?: number;
}

export interface EventRecord {
    neid: string;
    name: string;
    category?: string;
    date?: string;
    description?: string;
    likelihood?: string;
    participantNeids: string[];
    sourceDocuments: string[];
    extraSourceDocuments?: string[];
    citations?: string[];
    properties?: Record<string, unknown>;
    extractedSeed?: boolean;
    mcpConfirmed?: boolean;
    enrichmentDepth?: number;
}

export interface EnrichmentCountBucket {
    entityCount: number;
    eventCount: number;
    relationshipCount: number;
    propertyCount: number;
}

export interface EnrichmentCountSummary {
    document: EnrichmentCountBucket;
    raw1Degree: EnrichmentCountBucket;
    kgOneHop?: EnrichmentCountBucket;
    degree1?: EnrichmentCountBucket;
    auditOneHop?: EnrichmentCountBucket;
}

export interface PropertyPoint {
    recordedAt: string;
    value: string | number | boolean | null;
    citation?: string;
}

export interface PropertySeriesRecord {
    neid: string;
    pid: number;
    propertyName: string;
    points: PropertyPoint[];
}

export interface CollectionMeta {
    name: string;
    description: string;
    documentCount: number;
    entityCount: number;
    eventCount: number;
    relationshipCount: number;
    agreementCount: number;
    extractedPropertyCount?: number;
    extractedPropertyRecordCount?: number;
    rawOneHopCounts?: {
        entityCount: number;
        eventCount: number;
        relationshipCount: number;
    };
    curatedOneHopCounts?: {
        entityCount: number;
        eventCount: number;
        relationshipCount: number;
    };
    enrichmentCounts?: EnrichmentCountSummary;
    enrichmentCaps?: {
        maxEntities: number;
        maxRelationships: number;
        maxEvents: number;
        maxEventHubs: number;
    };
    enrichmentTruncated?: {
        entities: boolean;
        relationships: boolean;
        events: boolean;
        eventHubs: boolean;
    };
    kgPerEntity?: Array<{
        neid: string;
        relationshipCount: number;
        eventCount: number;
    }>;
    cacheSource?: 'memory' | 'redis' | 'none';
    cachedAt?: string;
    cacheVersion?: string;
    lastRebuilt?: string;
}

export interface CollectionState {
    meta: CollectionMeta;
    documents: DocumentRecord[];
    entities: EntityRecord[];
    relationships: RelationshipRecord[];
    events: EventRecord[];
    propertySeries: PropertySeriesRecord[];
    status: 'idle' | 'loading' | 'ready' | 'error';
    error?: string;
}

export type LineageConfidenceLabel = 'high' | 'medium' | 'low';
export type LineageEvidenceMode =
    | 'direct_document'
    | 'graph_enriched'
    | 'event_documented'
    | 'inferred'
    | 'mixed';

export interface LineageSupportingDocument {
    neid: string;
    title: string;
    kind?: string;
    date?: string;
    snippet?: string;
}

export interface LineageEventAnchor {
    neid: string;
    title: string;
    dateLabel?: string | null;
    anchorType: 'bank_succession' | 'beneficiary_change' | 'related_event';
    snippet?: string;
}

export interface LineageReferencedEntity {
    neid: string;
    name: string;
    flavor: string;
    role: 'source' | 'target' | 'participant';
}

export interface LineageResultViewModel {
    id: string;
    sourceEntityNeid: string;
    targetEntityNeid: string;
    sourceEntityName: string;
    targetEntityName: string;
    primaryStatement: string;
    relationshipTypeLabel: string;
    effectiveDateLabel: string | null;
    supportCount: number;
    supportLabel: string;
    confidenceLabel: LineageConfidenceLabel;
    confidenceReason: string;
    evidenceMode: LineageEvidenceMode;
    evidenceModeLabel: string;
    summarySentence: string;
    explanationSentence: string;
    relatedEntityNeids: string[];
    relatedEventNeids: string[];
    topEvidenceAnchors: string[];
    supportingDocuments: LineageSupportingDocument[];
    eventAnchors: LineageEventAnchor[];
    referencedEntities: LineageReferencedEntity[];
    groundingNotes: string[];
}

export type WorkspaceTab =
    | 'overview'
    | 'graph'
    | 'events'
    | 'insights'
    | 'agreements'
    | 'timeline'
    | 'validation'
    | 'agent'
    | 'enrichment';

export const BNY_DOCUMENTS: DocumentRecord[] = [
    {
        neid: '02051052947608524725',
        documentId: '7438596',
        title: 'Interim Rebate Analysis (2015)',
        kind: 'Rebate Analysis',
        date: '2015-10-16',
    },
    {
        neid: '07447437794117404020',
        documentId: '26889358',
        title: 'Interim Rebate Analysis (2024)',
        kind: 'Rebate Analysis',
        date: '2024-10-16',
    },
    {
        neid: '07526709763959495568',
        documentId: '4124255',
        title: 'Irrevocable Letter of Credit (1993)',
        kind: 'Letter of Credit',
        date: '1993-10-07',
    },
    {
        neid: '07780293260382878366',
        documentId: '5816087',
        title: 'Interim Rebate Analysis (2012)',
        kind: 'Rebate Analysis',
        date: '2012-10-16',
    },
    {
        neid: '08759058315171884540',
        documentId: '9587055',
        title: 'Interim Rebate Analysis (2021)',
        kind: 'Rebate Analysis',
        date: '2021-10-16',
    },
];

export const BNY_DOCUMENT_NEIDS = BNY_DOCUMENTS.map((d) => d.neid);

export const HOP1_FLAVORS = [
    'organization',
    'person',
    'financial_instrument',
    'location',
    'fund_account',
    'legal_agreement',
] as const;

// Exact event hub NEIDs from BNY-README, stored in canonical padded form.
export const EVENT_HUB_NEIDS = [
    '08242646876499346416', // Bond hub: IRREVOCABLE LETTER OF CREDIT NO. 5094714
    '06471256961308361850', // New Jersey Housing and Mortgage Finance Agency
    '01470965072054453101', // BLX Group LLC
    '09112734796193071548', // Reserve I Account
    '02877916378535664072', // Reserve II Account
    '07476737946181823597', // Liquidity I Account
    '06638852300639391265', // Liquidity II Account
    // One useful secondary audit hub from the README that helps close event coverage
    // without pulling in broad non-document event histories.
    '06967031221082229818', // UNITED JERSEY BANK/CENTRAL,
    '05477621199116204617', // Orrick, Herrington & Sutcliffe
    '04824620677155774613', // REPUBLIC NATIONAL BANK OF NEW YORK
    '06157989400122873900', // HSBC Bank USA, Natl Assoc
    // Added from doc-rooted MCP seed audit (2026-03-30), filtered to deal-relevant hubs.
    '05384086983174826493', // Bank of New York Mellon Corporation (BNY Mellon)
    '04104505588419472813', // NC HOUSING ASSOCIATES #200 CO.
    '07005109958829846067', // SDCMTN094714
    '07683517764755523583', // Willdan Financial Services
    '02277784462984661168', // Prior Rebate Liability
] as const;

// Property-bearing entities for historical time-series retrieval via elemental_get_entity history.
export const PROPERTY_BEARING_NEIDS = [
    '07476737946181823597', // Liquidity I Account
    '06638852300639391265', // Liquidity II Account
    '09112734796193071548', // Reserve I Account
    '02877916378535664072', // Reserve II Account
    '02277784462984661168', // Prior Rebate Liability
    '08242646876499346416', // IRREVOCABLE LETTER OF CREDIT NO. 5094714
] as const;

export function emptyCollectionState(): CollectionState {
    return {
        meta: {
            name: 'BNY Rebate Analysis Collection',
            description:
                '$142M NJHMFA Multifamily Housing Revenue Refunding Bonds — Presidential Plaza at Newport Project',
            documentCount: BNY_DOCUMENTS.length,
            entityCount: 0,
            eventCount: 0,
            relationshipCount: 0,
            agreementCount: 0,
            extractedPropertyCount: 0,
            extractedPropertyRecordCount: 0,
            cacheSource: 'none',
        },
        documents: [...BNY_DOCUMENTS],
        entities: [],
        relationships: [],
        events: [],
        propertySeries: [],
        status: 'idle',
    };
}
