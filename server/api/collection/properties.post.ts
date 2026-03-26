import { rawQsProperties } from '~/server/utils/collectionConfig';
import type { PropertySeriesRecord } from '~/utils/collectionTypes';

interface PropertiesRequest {
    eids: string[];
    pids?: number[];
}

export default defineEventHandler(async (event): Promise<{ series: PropertySeriesRecord[] }> => {
    const body = await readBody<PropertiesRequest>(event);
    if (!body?.eids?.length) {
        throw createError({ statusCode: 400, statusMessage: 'eids required' });
    }

    try {
        const raw = await rawQsProperties(body.eids, body.pids);
        const values: any[] = raw?.values ?? [];

        const groups = new Map<string, PropertySeriesRecord>();
        for (const row of values) {
            const eid = String(row.eid ?? '');
            const pid = Number(row.pid ?? 0);
            const key = `${eid}:${pid}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    neid: eid.padStart(20, '0'),
                    pid,
                    propertyName: row.property_name ?? `pid_${pid}`,
                    points: [],
                });
            }
            groups.get(key)!.points.push({
                recordedAt: row.recorded_at ?? '',
                value: row.value ?? null,
                citation: row.citation ?? undefined,
            });
        }

        for (const series of groups.values()) {
            series.points.sort(
                (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
            );
        }

        return { series: Array.from(groups.values()) };
    } catch (e: any) {
        throw createError({
            statusCode: 502,
            statusMessage: e.message || 'Failed to fetch property history',
        });
    }
});
