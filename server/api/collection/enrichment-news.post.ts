import { mcpCallTool } from '~/server/utils/collectionConfig';

interface NewsRequest {
    entityNeids: string[];
    maxEntities?: number;
    articlesPerEntity?: number;
}

interface NewsItem {
    articleNeid: string;
    title: string;
    date?: string;
    description?: string;
    sourceName?: string;
    url?: string;
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
                        'url',
                        'snippet',
                        'summary',
                        'source',
                        'publisher',
                        'date',
                        'published_at',
                        'published_date',
                        'sentiment',
                        'confidence',
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
                    return {
                        articleNeid: String(article?.neid ?? ''),
                        title: String(article?.name ?? 'Untitled article'),
                        date: firstString(props, ['published_at', 'published_date', 'date']),
                        description: firstString(props, ['snippet', 'summary', 'description']),
                        sourceName: firstString(props, ['source', 'publisher', 'source_name']),
                        url: firstString(props, ['url', 'source_url', 'article_url']),
                        confidence: firstNumber(props, [
                            'confidence',
                            'match_confidence',
                            'resolved_confidence',
                            'relevance_score',
                        ]),
                        sentiment: firstNumber(props, ['sentiment', 'article_sentiment']),
                        citations,
                        linkedEntityNames: [],
                    };
                })
                .filter((item) => Boolean(item.articleNeid))
                .sort((a, b) => {
                    const aDate = a.date ?? '';
                    const bDate = b.date ?? '';
                    if (aDate !== bDate) return bDate.localeCompare(aDate);
                    return (b.confidence ?? -Infinity) - (a.confidence ?? -Infinity);
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
