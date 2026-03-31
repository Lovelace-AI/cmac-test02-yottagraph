import { mcpCallTool } from '~/server/utils/collectionConfig';

interface NewsRequest {
    entityNeids: string[];
    maxEntities?: number;
    articlesPerEntity?: number;
}

interface NewsItem {
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

function firstString(source: Record<string, any>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = source[key]?.value ?? source[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
}

function firstNumber(source: Record<string, any>, keys: string[]): number | null {
    for (const key of keys) {
        const value = source[key]?.value ?? source[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim()) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return null;
}

function attributeString(
    source: Record<string, any>,
    propertyKeys: string[],
    attributeKeys: string[]
): string | undefined {
    for (const propertyKey of propertyKeys) {
        const attributes = source[propertyKey]?.attributes as Record<string, unknown> | undefined;
        if (!attributes) continue;
        for (const attributeKey of attributeKeys) {
            const value = attributes[attributeKey];
            if (typeof value === 'string' && value.trim()) return value.trim();
        }
    }
    return undefined;
}

function hostnameFromUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
        return new URL(url).hostname.replace(/^www\./i, '');
    } catch {
        return undefined;
    }
}

function firstStringFromUnknown(value: unknown): string | undefined {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
        const nestedValue = (value as Record<string, unknown>).value;
        if (typeof nestedValue === 'string' && nestedValue.trim()) return nestedValue.trim();
    }
    return undefined;
}

function relationshipDate(row: any, props: Record<string, any>): string | undefined {
    const directPropertyDate = firstString(props, ['published_at', 'published_date', 'date']);
    if (directPropertyDate) return directPropertyDate;

    const relationshipCandidates: unknown[] = [
        row?.published_at,
        row?.published_date,
        row?.date,
        row?.recorded_at,
        row?.relationship?.published_at,
        row?.relationship?.published_date,
        row?.relationship?.date,
        row?.relationship?.recorded_at,
        row?.relationship_properties?.published_at,
        row?.relationship_properties?.published_date,
        row?.relationship_properties?.date,
        row?.relationship_properties?.recorded_at,
    ];
    for (const candidate of relationshipCandidates) {
        const resolved = firstStringFromUnknown(candidate);
        if (resolved) return resolved;
    }
    return undefined;
}

export default defineEventHandler(async (event) => {
    const body = await readBody<NewsRequest>(event);
    const entityNeids = Array.isArray(body?.entityNeids) ? body.entityNeids : [];
    if (!entityNeids.length)
        return { groups: [] as Array<{ anchorNeid: string; items: NewsItem[] }> };

    const maxEntities = Math.max(1, Math.min(body?.maxEntities ?? 10, 20));
    const articlesPerEntity = Math.max(1, Math.min(body?.articlesPerEntity ?? 8, 20));
    const anchors = entityNeids.slice(0, maxEntities);

    const groups = await Promise.all(
        anchors.map(async (anchorNeid) => {
            const result = await mcpCallTool(
                'elemental_get_related',
                {
                    entity_id: { id_type: 'neid', id: anchorNeid },
                    related_flavor: 'article',
                    relationship_types: ['appears_in'],
                    related_properties: [
                        'title',
                        'original_publication_name',
                        'newsdata_id',
                        'date',
                        'sentiment',
                        'tone',
                        'title_factuality',
                    ],
                    limit: articlesPerEntity * 3,
                    direction: 'both',
                },
                { timeoutMs: 15_000 }
            ).catch(() => ({ relationships: [] }));

            const items: NewsItem[] = (result?.relationships ?? [])
                .map((article: any) => {
                    const props = (article?.properties ?? {}) as Record<string, any>;
                    const citations = Array.isArray(article?.citations)
                        ? article.citations.filter(
                              (value: unknown): value is string => typeof value === 'string'
                          )
                        : [];
                    const url =
                        firstString(props, ['url', 'source_url', 'article_url']) ??
                        attributeString(props, ['title', 'sentiment'], ['url']);
                    const title = firstString(props, ['title']);
                    const sourceName =
                        firstString(props, [
                            'original_publication_name',
                            'source',
                            'publisher',
                            'source_name',
                        ]) ?? hostnameFromUrl(url);
                    return {
                        articleNeid: String(article?.neid ?? ''),
                        title,
                        // TODO(data-quality): Ensure publication timestamps are consistently present in article ingestion.
                        // Some feeds emit publication date on the relationship row instead of article properties.
                        date: relationshipDate(article, props),
                        description: firstString(props, ['snippet', 'summary', 'description']),
                        sourceName,
                        url,
                        urlHost: hostnameFromUrl(url),
                        confidence: firstNumber(props, [
                            'confidence',
                            'match_confidence',
                            'resolved_confidence',
                            'relevance_score',
                        ]),
                        sentiment: firstNumber(props, ['sentiment', 'article_sentiment']),
                        citations,
                        // Linked entities are optional for this endpoint until article-to-entity joins are exposed.
                        linkedEntityNames: [],
                    };
                })
                .filter((item) => Boolean(item.articleNeid) && Boolean(item.title || item.url))
                .sort((a, b) => {
                    const aDate = a.date ?? '';
                    const bDate = b.date ?? '';
                    if (aDate !== bDate) return bDate.localeCompare(aDate);
                    return (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity);
                })
                .filter((item, index, array) => {
                    const key = `${item.title ?? ''}|${item.url ?? ''}`.toLowerCase();
                    return (
                        array.findIndex((candidate) => {
                            const candidateKey =
                                `${candidate.title ?? ''}|${candidate.url ?? ''}`.toLowerCase();
                            return candidateKey === key;
                        }) === index
                    );
                })
                .slice(0, articlesPerEntity);

            return {
                anchorNeid,
                items,
            };
        })
    );

    return { groups: groups.filter((group) => group.items.length > 0) };
});
