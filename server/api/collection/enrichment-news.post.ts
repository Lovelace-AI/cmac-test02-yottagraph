import { mcpCallTool } from '~/server/utils/collectionConfig';

interface NewsRequest {
    entityNeids: string[];
    maxEntities?: number;
    eventsPerEntity?: number;
    after?: string;
}

interface NewsItem {
    eventNeid: string;
    title: string;
    date?: string;
    description?: string;
    category?: string;
    likelihood?: string;
    citations: string[];
    linkedEntityNames: string[];
}

export default defineEventHandler(async (event) => {
    const body = await readBody<NewsRequest>(event);
    const entityNeids = Array.isArray(body?.entityNeids) ? body.entityNeids : [];
    if (!entityNeids.length)
        return { groups: [] as Array<{ anchorNeid: string; items: NewsItem[] }> };

    const maxEntities = Math.max(1, Math.min(body?.maxEntities ?? 12, 30));
    const eventsPerEntity = Math.max(1, Math.min(body?.eventsPerEntity ?? 12, 30));
    const after = body?.after ?? '2024-01-01';
    const anchors = entityNeids.slice(0, maxEntities);

    const groups = await Promise.all(
        anchors.map(async (anchorNeid) => {
            const result = await mcpCallTool(
                'elemental_get_events',
                {
                    entity_id: { id_type: 'neid', id: anchorNeid },
                    include_participants: true,
                    limit: eventsPerEntity,
                    time_range: { after, before: '2026-12-31' },
                },
                { timeoutMs: 15_000 }
            ).catch(() => ({ events: [] }));

            const items: NewsItem[] = (result?.events ?? []).map((evt: any) => {
                const props = (evt?.properties ?? {}) as Record<string, any>;
                const description =
                    props.event_description?.value ??
                    props.description?.value ??
                    (typeof evt?.description === 'string' ? evt.description : undefined);
                const citations = Object.values(props)
                    .map((value: any) => value?.citation)
                    .filter((value: unknown): value is string => typeof value === 'string');
                const linkedEntityNames = Array.isArray(evt?.participants)
                    ? evt.participants
                          .map((participant: any) => String(participant?.name ?? '').trim())
                          .filter((name: string) => Boolean(name))
                    : [];
                return {
                    eventNeid: String(evt?.neid ?? ''),
                    title: String(evt?.name ?? 'Untitled event'),
                    date: String(props.event_date?.value ?? props.date?.value ?? evt?.date ?? ''),
                    description: typeof description === 'string' ? description : undefined,
                    category: String(props.event_category?.value ?? props.category?.value ?? ''),
                    likelihood: String(
                        props.event_likelihood?.value ?? props.likelihood?.value ?? ''
                    ),
                    citations,
                    linkedEntityNames,
                };
            });

            return {
                anchorNeid,
                items,
            };
        })
    );

    return { groups };
});
