import { mcpCallTool } from '~/server/utils/collectionConfig';

interface RelatedDealsRequest {
    entityNeids: string[];
    maxAnchors?: number;
    articlesPerAnchor?: number;
}

interface RelatedDealArticle {
    articleNeid: string;
    title?: string;
    url?: string;
    urlHost?: string;
    sourceName?: string;
    sentiment?: number | null;
}

interface RelatedDealInsight {
    id: string;
    title: string;
    summary: string;
    anchorNeid?: string;
    anchorName?: string;
    articleCount: number;
    relatedCusips: string[];
    evidence: string[];
    articles: RelatedDealArticle[];
}

const JERSEY_CITY_KEYWORDS = [
    'jersey city',
    'newport',
    'hudson county',
    'new jersey housing',
    'njhmfa',
];

function normalizeText(value: unknown): string {
    return String(value ?? '').trim();
}

function firstString(source: Record<string, any>, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = source[key]?.value ?? source[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
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

function hostnameFromUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
        return new URL(url).hostname.replace(/^www\./i, '');
    } catch {
        return undefined;
    }
}

function extractCusips(text: string): string[] {
    const matches = text.match(/\b[0-9A-Z]{9}\b/g) ?? [];
    return Array.from(new Set(matches));
}

function looksJerseyCityRelevant(text: string): boolean {
    const normalized = text.toLowerCase();
    return JERSEY_CITY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export default defineEventHandler(async (event) => {
    const body = await readBody<RelatedDealsRequest>(event);
    const anchors = Array.isArray(body?.entityNeids) ? body.entityNeids : [];
    if (!anchors.length) return { deals: [] as RelatedDealInsight[] };

    const maxAnchors = Math.max(1, Math.min(body?.maxAnchors ?? 8, 16));
    const articlesPerAnchor = Math.max(1, Math.min(body?.articlesPerAnchor ?? 20, 40));
    const selectedAnchors = anchors.slice(0, maxAnchors);
    const insights: RelatedDealInsight[] = [];

    for (const anchorNeid of selectedAnchors) {
        const articleResult = await mcpCallTool(
            'elemental_get_related',
            {
                entity_id: { id_type: 'neid', id: anchorNeid },
                related_flavor: 'article',
                relationship_types: ['appears_in'],
                related_properties: ['title', 'original_publication_name', 'sentiment'],
                limit: articlesPerAnchor,
                direction: 'both',
            },
            { timeoutMs: 15_000 }
        ).catch(() => ({ relationships: [] as any[] }));

        const matchingArticles: RelatedDealArticle[] = (articleResult?.relationships ?? [])
            .map((article: any) => {
                const props = (article?.properties ?? {}) as Record<string, any>;
                const url =
                    firstString(props, ['url', 'source_url', 'article_url']) ??
                    attributeString(props, ['title', 'sentiment'], ['url']);
                return {
                    articleNeid: normalizeText(article?.neid),
                    title: firstString(props, ['title']),
                    url,
                    urlHost: hostnameFromUrl(url),
                    sourceName:
                        firstString(props, [
                            'original_publication_name',
                            'source',
                            'publisher',
                            'source_name',
                        ]) ?? hostnameFromUrl(url),
                    sentiment: firstNumber(props, ['sentiment', 'article_sentiment']),
                };
            })
            .filter((article) => article.articleNeid && (article.title || article.url));

        const relevantArticles = matchingArticles.filter((article) => {
            const corpus = [
                normalizeText(article.title),
                normalizeText(article.sourceName),
                normalizeText(article.url),
            ].join(' ');
            return looksJerseyCityRelevant(corpus);
        });
        if (!relevantArticles.length) continue;

        const anchorName = normalizeText(articleResult?.resolved?.name) || anchorNeid;
        const relatedCusips = Array.from(
            new Set(
                relevantArticles.flatMap((article) => {
                    const corpus = [
                        normalizeText(article.title),
                        normalizeText(article.url),
                        normalizeText(article.sourceName),
                    ].join(' ');
                    return extractCusips(corpus);
                })
            )
        ).slice(0, 6);
        const evidence = relevantArticles
            .slice(0, 3)
            .map((article) => normalizeText(article.title || article.urlHost || article.url))
            .filter(Boolean);

        insights.push({
            id: `deal:${anchorNeid}`,
            title: `${anchorName}: Jersey City deal coverage`,
            summary:
                relatedCusips.length > 0
                    ? `${relevantArticles.length} related articles mention Jersey City deal context and surfaced ${relatedCusips.length} candidate CUSIP${relatedCusips.length === 1 ? '' : 's'} for follow-up.`
                    : `${relevantArticles.length} related articles mention Jersey City deal context.`,
            anchorNeid,
            anchorName,
            articleCount: relevantArticles.length,
            relatedCusips,
            evidence,
            articles: relevantArticles.slice(0, 4),
        });
    }

    return { deals: insights.slice(0, 12) };
});
