import { BNY_DOCUMENTS, type DocumentRecord } from '~/utils/collectionTypes';

export interface Citation {
    ref: string;
    sourceName: string;
    sourceType: 'document' | 'event' | 'property' | 'relationship' | 'other';
    date?: string;
    excerpt?: string;
    url?: string;
    neid?: string;
}

function findDocumentByCitationText(text: string): DocumentRecord | undefined {
    const match = text.match(/(\d+)\.pdf/i);
    if (match) {
        return BNY_DOCUMENTS.find((doc) => doc.documentId === match[1]);
    }
    const normalized = text.trim().toLowerCase();
    return BNY_DOCUMENTS.find(
        (doc) =>
            normalized.includes(doc.title.toLowerCase()) ||
            normalized.includes(doc.documentId.toLowerCase())
    );
}

export function buildDocumentCitation(
    text: string,
    ref: string,
    sourceType: Citation['sourceType'],
    excerpt?: string,
    date?: string
): Citation {
    const doc = findDocumentByCitationText(text);
    return {
        ref,
        sourceName: doc?.title ?? text,
        sourceType,
        excerpt,
        date: date ?? doc?.date,
        neid: doc?.neid,
    };
}

/**
 * Parse inline citation refs like [1], [2] from text and return
 * the index positions so they can be rendered as superscripts.
 */
export function extractCitationRefs(text: string): number[] {
    const refs: number[] = [];
    const re = /\[(\d+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        refs.push(parseInt(m[1], 10));
    }
    return [...new Set(refs)].sort((a, b) => a - b);
}

/**
 * Build a citation list from MCP property data where each property
 * has an optional citation string.
 */
export function buildCitationsFromProperties(
    properties: Record<string, { value: unknown; citation?: string }>
): Citation[] {
    const citations: Citation[] = [];
    let refIdx = 1;
    for (const [propName, prop] of Object.entries(properties)) {
        if (prop.citation) {
            citations.push(
                buildDocumentCitation(
                    prop.citation,
                    String(refIdx++),
                    'property',
                    `${propName}: ${prop.value}`
                )
            );
        }
    }
    return citations;
}

/**
 * Build citations from property series points that carry citation strings.
 */
export function buildCitationsFromPoints(
    propertyName: string,
    points: Array<{ recordedAt: string; value: unknown; citation?: string }>
): Citation[] {
    return points
        .filter((p) => p.citation)
        .map((p, i) =>
            buildDocumentCitation(
                p.citation!,
                String(i + 1),
                'document',
                `${propertyName}: ${p.value}`,
                p.recordedAt.slice(0, 10)
            )
        );
}
