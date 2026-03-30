import { mcpCallTool } from '~/server/utils/collectionConfig';

interface EconomicsRequest {
    entityNeids: string[];
    maxEntityAnchors?: number;
    eventsPerEntity?: number;
}

interface EconomicSignal {
    eventNeid: string;
    title: string;
    date?: string;
    category?: string;
    description?: string;
    source: 'micro' | 'macro';
    anchorNeid?: string;
}

const MACRO_KEYWORDS = [
    'inflation',
    'interest rate',
    'federal reserve',
    'fed',
    'gdp',
    'employment',
    'unemployment',
    'housing',
    'cpi',
    'monetary',
    'treasury',
    'yield',
    'credit conditions',
];

const MACRO_ANCHOR_NEIDS = [
    '08883522583676895375', // Department of the Treasury
    '08378183269956851171', // United States
];

function looksMacro(text: string): boolean {
    const normalized = text.toLowerCase();
    return MACRO_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export default defineEventHandler(async (event) => {
    const body = await readBody<EconomicsRequest>(event);
    const entityNeids = Array.isArray(body?.entityNeids) ? body.entityNeids : [];
    const maxEntityAnchors = Math.max(1, Math.min(body?.maxEntityAnchors ?? 8, 20));
    const eventsPerEntity = Math.max(1, Math.min(body?.eventsPerEntity ?? 20, 40));

    const microAnchors = entityNeids.slice(0, maxEntityAnchors);

    const microSignals: EconomicSignal[] = [];
    for (const anchorNeid of microAnchors) {
        const result = await mcpCallTool(
            'elemental_get_events',
            {
                entity_id: { id_type: 'neid', id: anchorNeid },
                include_participants: true,
                limit: eventsPerEntity,
                time_range: { after: '2020-01-01', before: '2026-12-31' },
            },
            { timeoutMs: 15_000 }
        ).catch(() => ({ events: [] }));

        for (const evt of result?.events ?? []) {
            const props = (evt?.properties ?? {}) as Record<string, any>;
            const title = String(evt?.name ?? 'Untitled event');
            const category = String(props.event_category?.value ?? props.category?.value ?? '');
            const description = String(
                props.event_description?.value ?? props.description?.value ?? evt?.description ?? ''
            );
            if (looksMacro(`${title} ${category} ${description}`)) continue;
            microSignals.push({
                eventNeid: String(evt?.neid ?? ''),
                title,
                date: String(props.event_date?.value ?? props.date?.value ?? evt?.date ?? ''),
                category,
                description,
                source: 'micro',
                anchorNeid,
            });
        }
    }

    const macroSignals: EconomicSignal[] = [];
    for (const anchorNeid of MACRO_ANCHOR_NEIDS) {
        const result = await mcpCallTool(
            'elemental_get_events',
            {
                entity_id: { id_type: 'neid', id: anchorNeid },
                include_participants: true,
                limit: 30,
                time_range: { after: '2020-01-01', before: '2026-12-31' },
            },
            { timeoutMs: 15_000 }
        ).catch(() => ({ events: [] }));

        for (const evt of result?.events ?? []) {
            const props = (evt?.properties ?? {}) as Record<string, any>;
            const title = String(evt?.name ?? 'Untitled event');
            const category = String(props.event_category?.value ?? props.category?.value ?? '');
            const description = String(
                props.event_description?.value ?? props.description?.value ?? evt?.description ?? ''
            );
            if (!looksMacro(`${title} ${category} ${description}`)) continue;
            macroSignals.push({
                eventNeid: String(evt?.neid ?? ''),
                title,
                date: String(props.event_date?.value ?? props.date?.value ?? evt?.date ?? ''),
                category,
                description,
                source: 'macro',
                anchorNeid,
            });
        }
    }

    const uniq = (items: EconomicSignal[]) =>
        Array.from(new Map(items.map((item) => [item.eventNeid, item])).values()).slice(0, 30);

    return {
        micro: uniq(microSignals),
        macro: uniq(macroSignals),
    };
});
