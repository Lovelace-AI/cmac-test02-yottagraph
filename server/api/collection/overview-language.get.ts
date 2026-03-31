import { getCachedCollection } from '~/server/api/collection/bootstrap.get';
import { generateGeminiText } from '~/server/utils/gemini';
import type { EntityRecord, EventRecord } from '~/utils/collectionTypes';

const MUNICIPAL_BOND_NEID = '08242646876499346416';

function normalizeNeid(value: string): string {
    const unpadded = value.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function isNeidLike(value: string): boolean {
    return /^\d{16,24}$/.test(value.trim());
}

function isWeakAnchorLabel(value: string | null | undefined): boolean {
    const text = String(value ?? '').trim();
    if (!text) return true;
    if (isNeidLike(text)) return true;
    return /^\d{3,6}-\d{3,6}$/.test(text);
}

function entityDisplayName(entity?: EntityRecord): string | null {
    if (!entity) return null;
    const direct = String(entity.name ?? '').trim();
    if (direct && !isNeidLike(direct)) return direct;
    const props = (entity.properties ?? {}) as Record<string, unknown>;
    const candidateKeys = [
        'matched_name',
        'canonical_name',
        'resolved_name',
        'legal_name',
        'issuer_name',
        'name',
    ];
    for (const key of candidateKeys) {
        const raw = props[key];
        const value =
            raw && typeof raw === 'object' && !Array.isArray(raw)
                ? (raw as Record<string, unknown>).value
                : raw;
        const text = String(value ?? '').trim();
        if (text && !isNeidLike(text)) return text;
    }
    return null;
}

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
    const targetBond = entities.find(
        (entity) => normalizeNeid(entity.neid) === normalizeNeid(MUNICIPAL_BOND_NEID)
    );
    const dealAmount = '$142M';
    const projectName = 'Presidential Plaza at Newport';
    const financingType = 'municipal bond financing';
    const issuerLabel =
        entities.find((entity) =>
            entity.name.includes('New Jersey Housing and Mortgage Finance Agency')
        )?.name ?? 'New Jersey Housing and Mortgage Finance Agency';
    const bestNamedAnchor =
        entities
            .filter((entity) =>
                ['financial_instrument', 'fund_account', 'organization'].includes(entity.flavor)
            )
            .sort((a, b) => b.sourceDocuments.length - a.sourceDocuments.length)
            .map((entity) => entityDisplayName(entity))
            .find((label) => !isWeakAnchorLabel(label)) ?? null;
    const targetBondLabel = entityDisplayName(targetBond);
    const municipalBondLabel = !isWeakAnchorLabel(targetBondLabel)
        ? targetBondLabel!
        : (bestNamedAnchor ?? 'the financing transaction at the center of this collection');
    const documentTitles = documents
        .map((doc) => doc.title)
        .filter(Boolean)
        .slice(0, 4)
        .join('; ');
    const kindCounts = countBy(
        documents.filter((doc) => Boolean(doc.kind)),
        (doc) => String(doc.kind)
    );
    const kindSummary = Array.from(kindCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([kind, count]) => `${count} ${kind}`)
        .join(', ');
    const fallbackSummaryLine =
        meta.description || 'Corpus-level view describing what these source documents are about.';
    const fallbackCollectionSummary = `${documents.length} source document${
        documents.length === 1 ? '' : 's'
    } produced ${entities.length} entities and ${events.length} events. ${topEntityLine(entities)} ${topEventLine(events)}`;
    const fallbackNarrative = [
        `${meta.name} is a corpus of ${documents.length} source documents describing the same financing transaction and related parties.`,
        `The corpus centers on ${projectName}, a ${dealAmount} ${financingType} involving ${issuerLabel} and ${municipalBondLabel}.`,
        kindSummary
            ? `The documents mostly cover ${kindSummary}, and they read as one connected deal story rather than unrelated topics.`
            : `The documents read as one connected deal story rather than unrelated topics.`,
        documentTitles
            ? `Key files in this corpus include: ${documentTitles}.`
            : `These files together describe deal structure, legal obligations, and material timeline events.`,
    ].join(' ');

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
                '- summaryLine: a 1-2 sentence corpus description focused on what the documents are about',
                '- collectionSummary: one sentence with corpus content and analytical significance',
                '- narrative: 2-3 plain-English sentences describing what this corpus represents',
                '',
                `Collection name: ${meta.name}`,
                `Description: ${meta.description || 'N/A'}`,
                `Documents: ${documents.length}, Entities: ${entities.length}, Events: ${events.length}, Relationships: ${meta.relationshipCount}`,
                `Agreements: ${meta.agreementCount}`,
                `Deal amount: ${dealAmount}`,
                `Project name: ${projectName}`,
                `Financing type: ${financingType}`,
                `Issuer: ${issuerLabel}`,
                `Document titles sample: ${documentTitles || 'N/A'}`,
                `Document type mix: ${kindSummary || 'N/A'}`,
                `Entity mix: ${flavorSummary || 'N/A'}`,
                `Event category mix: ${eventSummary || 'N/A'}`,
                `Municipal bond anchor name: ${municipalBondLabel}`,
                topEntityLine(entities),
                topEventLine(events),
                'Tone requirements: plain English, explain corpus meaning, explicitly mention the financing anchor by name when it is human-readable, never include NEID identifiers or raw matter numbers, do not describe ingestion/extraction process, no backend/tool references.',
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
