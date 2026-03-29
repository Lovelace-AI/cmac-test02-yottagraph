import { getCachedCollection } from '~/server/api/collection/bootstrap.get';
import { generateGeminiText } from '~/server/utils/gemini';
import type { EntityRecord, EventRecord } from '~/utils/collectionTypes';

interface WatchlistRequest {
    maxThemes?: number;
    maxEvents?: number;
    context?: {
        entities?: Array<{ neid: string; name: string }>;
        events?: Array<{
            neid: string;
            name: string;
            date?: string;
            category?: string;
            description?: string;
            participantNeids: string[];
            extractedSeed?: boolean;
        }>;
    };
}

interface WatchlistTheme {
    themeLabel: string;
    whyItMatters: string;
    supportingEvents: string[];
    participantsToWatch: string[];
    suggestedAskPrompt: string;
}

interface WatchlistResponse {
    themes: WatchlistTheme[];
    generatedFromEventCount: number;
    generationSource: 'gemini' | 'fallback';
    generationNote?: string;
}

function parseMaybeJsonObject(text: string): Record<string, any> | null {
    try {
        return JSON.parse(text);
    } catch {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start < 0 || end <= start) return null;
        try {
            return JSON.parse(text.slice(start, end + 1));
        } catch {
            return null;
        }
    }
}

function sanitizeTheme(raw: any): WatchlistTheme | null {
    if (!raw || typeof raw !== 'object') return null;
    const themeLabel = String(raw.themeLabel ?? '').trim();
    const whyItMatters = String(raw.whyItMatters ?? '').trim();
    if (!themeLabel || !whyItMatters) return null;
    const supportingEvents = Array.isArray(raw.supportingEvents)
        ? raw.supportingEvents
              .map((item) => String(item))
              .filter(Boolean)
              .slice(0, 5)
        : [];
    const participantsToWatch = Array.isArray(raw.participantsToWatch)
        ? raw.participantsToWatch
              .map((item) => String(item))
              .filter(Boolean)
              .slice(0, 6)
        : [];
    const suggestedAskPrompt = String(raw.suggestedAskPrompt ?? '').trim();
    return {
        themeLabel,
        whyItMatters,
        supportingEvents,
        participantsToWatch,
        suggestedAskPrompt:
            suggestedAskPrompt ||
            `What trends should we monitor for "${themeLabel}" based on recent enriched events?`,
    };
}

function eventYear(eventItem: EventRecord): number {
    if (eventItem.date) {
        const year = Number(String(eventItem.date).slice(0, 4));
        if (!Number.isNaN(year) && year >= 1900 && year <= 2100) return year;
    }
    const match = eventItem.name.match(/(19|20)\d{2}/);
    return match ? Number(match[0]) : 0;
}

function fallbackThemes(
    events: EventRecord[],
    entitiesByNeid: Map<string, EntityRecord>,
    maxThemes: number
): WatchlistTheme[] {
    type Bucket = {
        label: string;
        why: string;
        matcher: RegExp;
        events: EventRecord[];
    };

    const buckets: Bucket[] = [
        {
            label: 'Refinancing and Project Finance Activity',
            why: 'Repeated financing and debt-structuring events indicate continued capital stack movement.',
            matcher: /(financ|debt|loan|credit|bond|project)/i,
            events: [],
        },
        {
            label: 'Ownership and Successor Changes',
            why: 'Successor, buyout, and transfer signals can change counterparties and risk exposure.',
            matcher: /(buyout|successor|acqui|merger|transfer|sale)/i,
            events: [],
        },
        {
            label: 'Compliance and Payment Determinations',
            why: 'Rebate, liability, and payment determination events can indicate compliance workflow pressure.',
            matcher: /(rebate|liability|payment|determination|compliance)/i,
            events: [],
        },
        {
            label: 'Advisory and Legal Structuring Activity',
            why: 'Legal/advisory repetition often marks recurring structuring roles and participant dependence.',
            matcher: /(legal|advis|opinion|counsel|analysis|report)/i,
            events: [],
        },
    ];

    for (const eventItem of events) {
        const text = `${eventItem.name} ${eventItem.description ?? ''}`;
        for (const bucket of buckets) {
            if (bucket.matcher.test(text)) bucket.events.push(eventItem);
        }
    }

    return buckets
        .filter((bucket) => bucket.events.length > 0)
        .sort((a, b) => b.events.length - a.events.length)
        .slice(0, maxThemes)
        .map((bucket) => {
            const selected = bucket.events.slice(0, 4);
            const participants = new Set<string>();
            for (const eventItem of selected) {
                for (const participantNeid of eventItem.participantNeids) {
                    const participant = entitiesByNeid.get(participantNeid);
                    if (participant) participants.add(participant.name);
                }
            }
            return {
                themeLabel: bucket.label,
                whyItMatters: bucket.why,
                supportingEvents: selected.map((eventItem) => eventItem.name),
                participantsToWatch: Array.from(participants).slice(0, 6),
                suggestedAskPrompt: `Summarize the trend "${bucket.label}" and identify the highest-risk counterparties from the related events.`,
            };
        });
}

export default defineEventHandler(async (event): Promise<WatchlistResponse> => {
    const body = (await readBody<WatchlistRequest>(event)) ?? {};
    const maxThemes = Math.max(1, Math.min(body.maxThemes ?? 4, 5));
    const maxEvents = Math.max(6, Math.min(body.maxEvents ?? 24, 50));
    const contextEntities = Array.isArray(body.context?.entities) ? body.context?.entities : null;
    const contextEvents = Array.isArray(body.context?.events) ? body.context?.events : null;

    let entitiesByNeid: Map<string, EntityRecord>;
    let candidateEvents: EventRecord[];
    if (contextEntities && contextEvents) {
        entitiesByNeid = new Map(
            contextEntities.map(
                (entity) =>
                    [
                        entity.neid,
                        {
                            neid: entity.neid,
                            name: entity.name,
                            flavor: 'organization',
                            sourceDocuments: [],
                            origin: 'enriched' as const,
                        },
                    ] as const
            )
        );
        candidateEvents = contextEvents.map((eventItem) => ({
            neid: eventItem.neid,
            name: eventItem.name,
            category: eventItem.category,
            date: eventItem.date,
            description: eventItem.description,
            likelihood: undefined,
            participantNeids: eventItem.participantNeids ?? [],
            sourceDocuments: [],
            extractedSeed: eventItem.extractedSeed,
        }));
    } else {
        const collection = getCachedCollection();
        if (!collection || collection.status !== 'ready') {
            throw createError({
                statusCode: 409,
                statusMessage: 'Collection not loaded. Run enrichment first.',
            });
        }
        entitiesByNeid = new Map(
            collection.entities.map((entity) => [entity.neid, entity] as const)
        );
        candidateEvents = collection.events;
    }

    const enrichedEvents = candidateEvents
        .filter((eventItem) => !eventItem.extractedSeed && eventItem.participantNeids.length > 0)
        .sort((a, b) => {
            const byYear = eventYear(b) - eventYear(a);
            if (byYear !== 0) return byYear;
            return a.name.localeCompare(b.name);
        })
        .slice(0, maxEvents);

    if (enrichedEvents.length < 3) {
        return {
            themes: [],
            generatedFromEventCount: enrichedEvents.length,
            generationSource: 'fallback',
            generationNote:
                'Not enough enriched events to derive watchlist trends. Run enrichment with include events enabled.',
        };
    }

    const eventRows = enrichedEvents.map((eventItem) => ({
        name: eventItem.name,
        date: eventItem.date ?? null,
        category: eventItem.category ?? null,
        participants: eventItem.participantNeids
            .map((participantNeid) => entitiesByNeid.get(participantNeid)?.name)
            .filter(Boolean)
            .slice(0, 8),
    }));

    const prompt = [
        'You are generating a watchlist from recent enriched knowledge-graph events.',
        'Return strict JSON only. No markdown.',
        '',
        `Create up to ${maxThemes} watchlist themes.`,
        'Each theme must include:',
        '- themeLabel',
        '- whyItMatters',
        '- supportingEvents (event names, max 5)',
        '- participantsToWatch (entity names, max 6)',
        '- suggestedAskPrompt',
        '',
        'Prefer these categories when relevant:',
        '- refinancing / project finance activity',
        '- ownership / successor / M&A changes',
        '- compliance / rebate / payment determination',
        '- advisory / legal / structuring activity',
        '- recurring counterparty activity',
        '',
        'Data:',
        JSON.stringify(eventRows),
        '',
        'JSON schema:',
        '{"themes":[{"themeLabel":"","whyItMatters":"","supportingEvents":[],"participantsToWatch":[],"suggestedAskPrompt":""}]}',
    ].join('\n');

    try {
        const generated = await generateGeminiText({
            prompt,
            label: 'enrichment_watchlist',
            systemInstruction:
                'You are an evidence-oriented analyst. Keep claims tightly grounded in supplied event rows.',
            temperature: 0.3,
            maxOutputTokens: 1400,
            retries: 1,
        });
        const parsed = parseMaybeJsonObject(generated.text);
        const rawThemes = Array.isArray(parsed?.themes) ? parsed?.themes : [];
        const themes = rawThemes
            .map((theme: any) => sanitizeTheme(theme))
            .filter((theme: WatchlistTheme | null): theme is WatchlistTheme => Boolean(theme))
            .slice(0, maxThemes);
        if (themes.length > 0) {
            return {
                themes,
                generatedFromEventCount: enrichedEvents.length,
                generationSource: 'gemini',
            };
        }
    } catch {
        // Fall through to deterministic fallback.
    }

    return {
        themes: fallbackThemes(enrichedEvents, entitiesByNeid, maxThemes),
        generatedFromEventCount: enrichedEvents.length,
        generationSource: 'fallback',
        generationNote:
            'Gemini output was unavailable or invalid JSON, so deterministic watchlist categorization was used.',
    };
});
