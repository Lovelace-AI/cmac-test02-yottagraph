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
    origin: DataOrigin;
    properties?: Record<string, unknown>;
}

export interface RelationshipRecord {
    sourceNeid: string;
    targetNeid: string;
    type: string;
    recordedAt?: string;
    sourceDocumentNeid?: string;
    origin: DataOrigin;
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

export type WorkspaceTab =
    | 'overview'
    | 'graph'
    | 'events'
    | 'agreements'
    | 'validation'
    | 'agent'
    | 'enrichment';

export const BNY_DOCUMENTS: DocumentRecord[] = [
    {
        neid: '2051052947608524725',
        documentId: '7438596',
        title: 'Interim Rebate Analysis (2015)',
        kind: 'Rebate Analysis',
        date: '2015-10-16',
    },
    {
        neid: '7447437794117404020',
        documentId: '26889358',
        title: 'Interim Rebate Analysis (2024)',
        kind: 'Rebate Analysis',
        date: '2024-10-16',
    },
    {
        neid: '7526709763959495568',
        documentId: '4124255',
        title: 'Irrevocable Letter of Credit',
        kind: 'Letter of Credit',
    },
    {
        neid: '7780293260382878366',
        documentId: '5816087',
        title: 'Interim Rebate Analysis (2012)',
        kind: 'Rebate Analysis',
        date: '2012-10-16',
    },
    {
        neid: '8759058315171884540',
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
        },
        documents: [...BNY_DOCUMENTS],
        entities: [],
        relationships: [],
        events: [],
        propertySeries: [],
        status: 'idle',
    };
}
