import { getCachedCollection } from '~/server/api/collection/bootstrap.get';
import { generateGeminiText } from '~/server/utils/gemini';
import type { EntityRecord, EventRecord } from '~/utils/collectionTypes';

function countBy<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
        const key = keyFn(item);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

function topEntityLine(entities: EntityRecord[]): string {
    if (!entities.length) return 'Entity extraction will appear here after analysis runs.';
    const byDocs = [...entities].sort(
        (a, b) => b.sourceDocuments.length - a.sourceDocuments.length
    );
    const top = byDocs[0];
    return `Most central entity: ${top.name} (${top.flavor.replace(/_/g, ' ')}).`;
}

function topEventLine(events: EventRecord[]): string {
    if (!events.length) return 'Event extraction is still processing for this collection.';
    const sorted = [...events].sort(
        (a, b) => b.participantNeids.length - a.participantNeids.length
    );
    const top = sorted[0];
    return `Most significant event: ${top.name}${top.date ? ` (${top.date.slice(0, 10)})` : ''}.`;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = (fenced?.[1] ?? trimmed).trim();
    try {
        return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) return null;
        try {
            return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
        } catch {
            return null;
        }
    }
}

export default defineEventHandler(async () => {
    const collection = getCachedCollection();
    if (!collection) {
        throw createError({
            statusCode: 409,
            statusMessage: 'Collection not loaded. Run a rebuild first.',
        });
    }

    const { meta, entities, events, documents } = collection;
    const fallbackSummaryLine =
        meta.description ||
        'Collection-level analysis with traceable entities, events, and evidence.';
    const fallbackCollectionSummary = `${documents.length} source document${
        documents.length === 1 ? '' : 's'
    } produced ${entities.length} entities and ${events.length} events. ${topEntityLine(entities)} ${topEventLine(events)}`;
    const fallbackNarrative = [
        `${meta.name} brings together ${documents.length} source documents that Elemental has ingested and classified into one transaction-focused collection.`,
        `From this corpus, Elemental synthesized ${entities.length} entities, ${meta.relationshipCount} relationships, ${events.length} events, and ${meta.agreementCount} agreement signals into an evidence-linked deal structure.`,
        `This overview is designed to support executive review: what the deal is, who the primary parties are, what changed over time, and where confidence is strongest or still needs verification.`,
    ].join('\n\n');

    const flavorCounts = countBy(entities, (entity) => entity.flavor);
    const eventCategories = countBy(events, (eventItem) => eventItem.category || 'uncategorized');
    const flavorSummary = Array.from(flavorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([flavor, count]) => `${count} ${flavor.replace(/_/g, ' ')}`)
        .join(', ');
    const eventSummary = Array.from(eventCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([category, count]) => `${count} ${category}`)
        .join(', ');

    try {
        const generated = await generateGeminiText({
            label: 'overview_language',
            systemInstruction:
                'You are Ask Yotta. Write concise executive-briefing copy grounded in supplied collection stats. Return strict JSON only.',
            prompt: [
                'Return a JSON object with exactly these keys:',
                '- summaryLine: a 1-2 sentence description of what this document collection contains and why it matters',
                '- collectionSummary: one sentence with counts and analytical significance',
                '- narrative: 2-4 short paragraphs in coherent business language',
                '',
                `Collection name: ${meta.name}`,
                `Description: ${meta.description || 'N/A'}`,
                `Documents: ${documents.length}, Entities: ${entities.length}, Events: ${events.length}, Relationships: ${meta.relationshipCount}`,
                `Agreements: ${meta.agreementCount}`,
                `Entity mix: ${flavorSummary || 'N/A'}`,
                `Event category mix: ${eventSummary || 'N/A'}`,
                topEntityLine(entities),
                topEventLine(events),
                'Tone requirements: product UX voice, no backend jargon, no mention of MCP, no empty-state diagnostics.',
            ].join('\n'),
            temperature: 0.3,
            maxOutputTokens: 520,
            retries: 1,
        });

        let summaryLine = fallbackSummaryLine;
        let collectionSummary = fallbackCollectionSummary;
        let narrative = fallbackNarrative;
        try {
            const parsed = parseJsonObject(generated.text);
            if (typeof parsed?.summaryLine === 'string' && parsed.summaryLine.trim()) {
                summaryLine = parsed.summaryLine.trim();
            }
            if (typeof parsed?.collectionSummary === 'string' && parsed.collectionSummary.trim()) {
                collectionSummary = parsed.collectionSummary.trim();
            }
            if (typeof parsed?.narrative === 'string' && parsed.narrative.trim()) {
                narrative = parsed.narrative.trim();
            }
        } catch {
            // fall back to deterministic copy when model output is not valid JSON
        }

        return {
            summaryLine,
            collectionSummary,
            narrative,
            citations: documents.slice(0, 5).map((doc) => ({ label: doc.title, neid: doc.neid })),
            usage: {
                model: generated.usage.model,
                promptTokens: generated.usage.promptTokens,
                completionTokens: generated.usage.completionTokens,
                totalTokens: generated.usage.totalTokens,
                costUsd: 0,
            },
        };
    } catch {
        return {
            summaryLine: fallbackSummaryLine,
            collectionSummary: fallbackCollectionSummary,
            narrative: fallbackNarrative,
            citations: documents.slice(0, 5).map((doc) => ({ label: doc.title, neid: doc.neid })),
            usage: {
                model: 'fallback',
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                costUsd: 0,
            },
        };
    }
});
