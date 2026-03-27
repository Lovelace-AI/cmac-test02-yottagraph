export const COLLECTION_COPY = {
    status: {
        ready: 'Analysis Ready',
        notReady: 'Analysis Not Ready',
    },
    actions: {
        rerunExtraction: 'Re-run Extraction',
        loadAnalysis: 'Run Initial Analysis',
    },
    terms: {
        propertyHistory: 'Property History',
        graphRetrieval: 'Graph Retrieval',
        evidenceRetrieval: 'Evidence Retrieval',
        derivedFromLinkedEntities: 'Derived from linked entities',
    },
    emptyStates: {
        noGraph:
            'Run extraction to generate entities, events, and relationship evidence for this collection.',
        noEvents: 'No events are available yet. Re-run extraction or broaden your filters.',
        noAgreements: 'No legal agreements have been identified in this collection yet.',
    },
} as const;

export function formatRelationshipType(relType: string): string {
    return relType.replace(/schema::relationship::/, '').replace(/_/g, ' ');
}

export function titleCase(text: string): string {
    return text.replace(/\b\w/g, (c) => c.toUpperCase());
}
