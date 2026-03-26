export interface Citation {
    ref: string;
    sourceName: string;
    sourceType: 'document' | 'event' | 'property' | 'relationship' | 'other';
    date?: string;
    excerpt?: string;
    url?: string;
    neid?: string;
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
            citations.push({
                ref: String(refIdx++),
                sourceName: prop.citation,
                sourceType: 'property',
                excerpt: `${propName}: ${prop.value}`,
            });
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
        .map((p, i) => ({
            ref: String(i + 1),
            sourceName: p.citation!,
            sourceType: 'document' as const,
            date: p.recordedAt.slice(0, 10),
            excerpt: `${propertyName}: ${p.value}`,
        }));
}
