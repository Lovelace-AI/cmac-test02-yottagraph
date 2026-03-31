import { generateGeminiText } from '~/server/utils/gemini';

interface TimelineNarrativeChange {
    metricLabel: string;
    deltaDisplay: string;
    fromDisplay: string;
    toDisplay: string;
    periodLabel: string;
    severity: string;
    interpretation: string;
}

interface TimelineNarrativeBody {
    changes?: TimelineNarrativeChange[];
    summary?: {
        totalChanges?: number;
        metricsChanged?: number;
        largestIncrease?: string | null;
        largestDecrease?: string | null;
        mostVolatileMetric?: string | null;
        mostRecentComparison?: string | null;
    };
}

interface TimelineNarrativeResponse {
    narrative: string;
    source: 'gemini' | 'fallback';
    note?: string;
}

function fallbackNarrative(body: TimelineNarrativeBody): string {
    const totalChanges = body.summary?.totalChanges ?? 0;
    const metricCount = body.summary?.metricsChanged ?? 0;
    const largestIncrease = body.summary?.largestIncrease ?? 'N/A';
    const largestDecrease = body.summary?.largestDecrease ?? 'N/A';
    const volatile = body.summary?.mostVolatileMetric ?? 'N/A';
    const recent = body.summary?.mostRecentComparison ?? 'N/A';
    return `${totalChanges} notable changes were detected across ${metricCount} metrics. Largest increase: ${largestIncrease}; largest decrease: ${largestDecrease}. Most volatile metric: ${volatile}. Most recent comparison: ${recent}.`;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
    const candidates = [trimmed, fenced ?? ''].filter(Boolean);
    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
        } catch {
            // ignore and try next candidate
        }
    }
    return null;
}

export default defineEventHandler(async (event): Promise<TimelineNarrativeResponse> => {
    const body = (await readBody<TimelineNarrativeBody>(event)) ?? {};
    const changes = Array.isArray(body.changes) ? body.changes.slice(0, 10) : [];
    if (!changes.length) {
        return {
            narrative: fallbackNarrative(body),
            source: 'fallback',
            note: 'No ranked timeline changes were supplied to narrative generation.',
        };
    }

    try {
        const generated = await generateGeminiText({
            label: 'timeline_language',
            systemInstruction:
                'You are Ask Yotta. Write concise analyst-facing copy grounded only in supplied timeline change data. Return strict JSON only.',
            prompt: [
                'Return a JSON object with exactly one key: narrative.',
                'The narrative must be 2-3 short sentences, plain English, and prioritize what changed most.',
                'Do not mention tools, prompts, JSON, or implementation details.',
                'Do not invent values or periods.',
                'Use domain-neutral language; avoid assuming increase is always favorable.',
                '',
                `Summary: ${JSON.stringify(body.summary ?? {})}`,
                `Top changes: ${JSON.stringify(changes)}`,
            ].join('\n'),
            temperature: 0.3,
            maxOutputTokens: 220,
            retries: 1,
        });

        const parsed = parseJsonObject(generated.text);
        const narrative = String(parsed?.narrative ?? '').trim();
        if (narrative) {
            return { narrative, source: 'gemini' };
        }
        return {
            narrative: fallbackNarrative(body),
            source: 'fallback',
            note: 'Gemini response formatting was invalid, so deterministic narrative was used.',
        };
    } catch (error: any) {
        return {
            narrative: fallbackNarrative(body),
            source: 'fallback',
            note:
                error?.message && String(error.message).trim().length
                    ? `Gemini timeline narrative failed; deterministic narrative used (${String(error.message).slice(0, 120)}).`
                    : 'Gemini timeline narrative failed; deterministic narrative used.',
        };
    }
});
