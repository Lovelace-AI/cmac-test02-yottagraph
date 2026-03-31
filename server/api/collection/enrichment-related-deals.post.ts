import { mcpCallTool } from '~/server/utils/collectionConfig';

interface RelatedDealsRequest {
    entityNeids: string[];
    maxAnchors?: number;
    eventsPerAnchor?: number;
}

interface RelatedDealInsight {
    id: string;
    title: string;
    summary: string;
    anchorNeid?: string;
    anchorName?: string;
    eventCount: number;
    relatedCusips: string[];
    evidence: string[];
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
    const eventsPerAnchor = Math.max(1, Math.min(body?.eventsPerAnchor ?? 20, 40));
    const selectedAnchors = anchors.slice(0, maxAnchors);
    const insights: RelatedDealInsight[] = [];

    for (const anchorNeid of selectedAnchors) {
        const eventsResult = await mcpCallTool(
            'elemental_get_events',
            {
                entity_id: { id_type: 'neid', id: anchorNeid },
                include_participants: true,
                limit: eventsPerAnchor,
                time_range: { after: '1990-01-01', before: '2026-12-31' },
            },
            { timeoutMs: 15_000 }
        ).catch(() => ({ events: [] as any[] }));

        const matchingEvents = (eventsResult?.events ?? []).filter((evt: any) => {
            const props = evt?.properties ?? {};
            const corpus = [
                normalizeText(evt?.name),
                normalizeText(props.event_description?.value ?? props.description?.value),
                normalizeText(props.event_category?.value ?? props.category?.value),
                ...((evt?.participants ?? []).map((p: any) => normalizeText(p?.name)) as string[]),
            ].join(' ');
            return looksJerseyCityRelevant(corpus);
        });
        if (!matchingEvents.length) continue;

        const anchorName =
            normalizeText(
                matchingEvents[0]?.participants?.find((p: any) => p?.neid === anchorNeid)?.name
            ) ||
            normalizeText(matchingEvents[0]?.name) ||
            anchorNeid;
        const relatedCusips = Array.from(
            new Set(
                matchingEvents.flatMap((evt: any) => {
                    const props = evt?.properties ?? {};
                    const corpus = [
                        normalizeText(evt?.name),
                        normalizeText(props.event_description?.value ?? props.description?.value),
                        ...((evt?.participants ?? []).map((p: any) =>
                            normalizeText(p?.name)
                        ) as string[]),
                    ].join(' ');
                    return extractCusips(corpus);
                })
            )
        ).slice(0, 6);
        const evidence = matchingEvents
            .slice(0, 3)
            .map((evt: any) => {
                const props = evt?.properties ?? {};
                const date = normalizeText(
                    props.event_date?.value ?? props.date?.value ?? evt?.date
                );
                const title = normalizeText(evt?.name) || 'Untitled event';
                return date ? `${date.slice(0, 10)}: ${title}` : title;
            })
            .filter(Boolean);

        insights.push({
            id: `deal:${anchorNeid}`,
            title: `${anchorName}: Jersey City related deal context`,
            summary:
                relatedCusips.length > 0
                    ? `${matchingEvents.length} related events mention Jersey City context and surfaced ${relatedCusips.length} candidate CUSIP${relatedCusips.length === 1 ? '' : 's'} for follow-up.`
                    : `${matchingEvents.length} related events mention Jersey City context. No explicit CUSIPs were extracted from these event summaries.`,
            anchorNeid,
            anchorName,
            eventCount: matchingEvents.length,
            relatedCusips,
            evidence,
        });
    }

    return { deals: insights.slice(0, 12) };
});
