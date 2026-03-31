import { mcpCallTool } from '~/server/utils/collectionConfig';

interface FilteredNewsRequest {
    entityNeids: string[];
    categories?: string[];
    maxEntities?: number;
    articlesPerEntity?: number;
}

interface FilteredNewsItem {
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
    topics: string[];
}

interface FilteredNewsCandidate extends FilteredNewsItem {
    matchedCategories: string[];
}

const DEFAULT_EVENT_CATEGORIES = [
    'Bankruptcy',
    'Default',
    'Insolvency',
    'Mergers & acquisitions',
    'Hostile takeover',
    'Significant legal judgement',
    'Seizure',
    'Expropriation',
    'Credit rating downgrade',
    'Credit rating upgrade',
    'Corporate restructuring',
    'New funding or investment',
    'IPO',
    'Customer loss',
    'Win of long-term, high-value contract',
    'Insider trading',
    'Cybersecurity breach',
    'Layoffs',
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    bankruptcy: ['bankruptcy', 'chapter 11', 'chapter 7', 'restructuring advisor'],
    default: ['default', 'delinquency', 'missed payment', 'payment miss'],
    insolvency: ['insolvency', 'insolvent', 'liquidation', 'going concern'],
    'mergers & acquisitions': [
        'merger',
        'acquisition',
        'acquire',
        'takeover',
        'buyout',
        'combination',
        'sell business',
        'asset sale',
    ],
    'hostile takeover': ['hostile takeover', 'proxy fight', 'unsolicited bid'],
    'significant legal judgement': [
        'judgment',
        'verdict',
        'lawsuit',
        'litigation',
        'settlement',
        'court ruling',
        'legal dispute',
        'legal challenge',
    ],
    seizure: ['seizure', 'asset seizure', 'frozen assets', 'foreclosure'],
    expropriation: ['expropriation', 'nationalized', 'nationalisation', 'asset confiscation'],
    'credit rating downgrade': ['downgrade', 'credit rating cut', 'rating lowered'],
    'credit rating upgrade': ['upgrade', 'credit rating raised', 'rating improved'],
    'corporate restructuring': [
        'corporate restructuring',
        'restructuring plan',
        'spin-off',
        'spinoff',
        'divestiture',
        'reorganization',
    ],
    'new funding or investment': [
        'funding',
        'investment',
        'capital raise',
        'raised',
        'series a',
        'series b',
        'private equity',
        'venture capital',
        'debt financing',
        'credit facility',
        'term loan',
        'revolving credit',
        'bond issuance',
        'bond sale',
        'loan facility',
    ],
    ipo: ['ipo', 'initial public offering', 'public offering', 'listed on'],
    'customer loss': [
        'customer loss',
        'lost customer',
        'contract termination',
        'terminated contract',
    ],
    'win of long-term, high-value contract': [
        'awarded contract',
        'wins contract',
        'long-term contract',
        'multi-year contract',
    ],
    'insider trading': ['insider trading', 'sec probe', 'sec investigation', 'trading probe'],
    'cybersecurity breach': [
        'cybersecurity breach',
        'data breach',
        'ransomware',
        'hack',
        'cyber attack',
    ],
    layoffs: ['layoff', 'layoffs', 'job cuts', 'workforce reduction', 'redundancies'],
};

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

function normalizeTopicValues(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .flatMap((item) => normalizeTopicValues(item))
            .filter((item, index, array) => array.indexOf(item) === index);
    }
    if (value && typeof value === 'object') {
        const innerValue = (value as Record<string, unknown>).value;
        return normalizeTopicValues(innerValue);
    }
    if (typeof value !== 'string') return [];
    return value
        .split(/[;,|]/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

function normalizeCategories(categories: string[]): string[] {
    return categories
        .map((category) => category.trim())
        .filter(Boolean)
        .filter((category, index, array) => {
            const lowered = category.toLowerCase();
            return array.findIndex((item) => item.toLowerCase() === lowered) === index;
        });
}

function categoryMatchesTopic(category: string, topic: string): boolean {
    const categoryLower = category.toLowerCase();
    const topicLower = topic.toLowerCase();
    return topicLower.includes(categoryLower) || categoryLower.includes(topicLower);
}

function normalizeSearchText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function categoryMatchesKeywords(category: string, text: string): boolean {
    const normalizedCategory = category.toLowerCase();
    const categoryKeywords = CATEGORY_KEYWORDS[normalizedCategory] ?? [normalizedCategory];
    return categoryKeywords.some((keyword) => text.includes(normalizeSearchText(keyword)));
}

export default defineEventHandler(async (event) => {
    const body = await readBody<FilteredNewsRequest>(event);
    const entityNeids = Array.isArray(body?.entityNeids) ? body.entityNeids : [];
    if (!entityNeids.length) {
        return {
            groups: [] as Array<{
                anchorNeid: string;
                items: FilteredNewsItem[];
                matchedCategories: string[];
            }>,
            categories: DEFAULT_EVENT_CATEGORIES,
        };
    }

    const categories = normalizeCategories(
        body?.categories?.length ? body.categories : DEFAULT_EVENT_CATEGORIES
    );
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
                        'has_topic',
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

            const items: FilteredNewsItem[] = (result?.relationships ?? [])
                .map((article: any) => {
                    const props = (article?.properties ?? {}) as Record<string, any>;
                    const citations = Array.isArray(article?.citations)
                        ? article.citations.filter(
                              (citation: unknown): citation is string =>
                                  typeof citation === 'string'
                          )
                        : [];
                    const url =
                        firstString(props, ['url', 'source_url', 'article_url']) ??
                        attributeString(props, ['title', 'sentiment', 'has_topic'], ['url']);
                    const title = firstString(props, ['title']);
                    const sourceName =
                        firstString(props, [
                            'original_publication_name',
                            'source',
                            'publisher',
                            'source_name',
                        ]) ?? hostnameFromUrl(url);
                    const topics = normalizeTopicValues(props.has_topic);
                    const matchedCategories = categories.filter((category) =>
                        topics.some((topic) => categoryMatchesTopic(category, topic))
                    );
                    const keywordText = normalizeSearchText(
                        [
                            title,
                            firstString(props, ['snippet', 'summary', 'description']),
                            sourceName,
                            url,
                        ]
                            .filter((value): value is string => Boolean(value))
                            .join(' ')
                    );
                    const fallbackCategories = categories.filter((category) =>
                        categoryMatchesKeywords(category, keywordText)
                    );
                    const mapped: FilteredNewsCandidate = {
                        articleNeid: String(article?.neid ?? ''),
                        title,
                        date: firstString(props, ['published_at', 'published_date', 'date']),
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
                        linkedEntityNames: [],
                        topics,
                        matchedCategories:
                            matchedCategories.length > 0 ? matchedCategories : fallbackCategories,
                    };
                    return mapped;
                })
                .filter((item) => Boolean(item.articleNeid) && Boolean(item.title || item.url))
                .filter((item) => item.matchedCategories.length > 0)
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
                .slice(0, articlesPerEntity)
                .map((item: FilteredNewsCandidate) => {
                    const { matchedCategories, ...rest } = item;
                    return rest;
                });

            const matchedCategories = categories.filter((category) =>
                items.some((item) =>
                    item.topics.some((topic) => categoryMatchesTopic(category, topic))
                )
            );

            return {
                anchorNeid,
                items,
                matchedCategories,
            };
        })
    );

    return {
        categories,
        groups: groups.filter((group) => group.items.length > 0),
    };
});
