import { generateGeminiText } from '~/server/utils/gemini';

type RelevanceLabel = 'same_deal' | 'adjacent' | 'broader';

interface EnrichmentLanguageRequestCard {
    id: string;
    kind: 'corporate_lineage' | 'broader_activity' | 'event_timeline' | 'people_affiliation';
    title: string;
    subtitle?: string;
    documentContext: string;
    kgContext: string;
    evidence: string[];
    metrics?: {
        totalEventCount?: number;
        outsideEventCount?: number;
        sameDealEventCount?: number;
        participantCount?: number;
        counterpartyCount?: number;
        dateRangeLabel?: string | null;
        sizeLabel?: string | null;
    };
}

interface EnrichmentLanguageRequest {
    cards?: EnrichmentLanguageRequestCard[];
    summary?: {
        documentEntityCount?: number;
        enrichedEntityCount?: number;
        documentRelationshipCount?: number;
        enrichedRelationshipCount?: number;
        totalEventCount?: number;
        outsideEventCount?: number;
    };
}

interface EnrichmentLanguageCardResponse {
    id: string;
    plainSummary: string;
    relevanceLabel: RelevanceLabel;
    sizeLabel?: string | null;
}

interface EnrichmentLanguageResponse {
    cards: EnrichmentLanguageCardResponse[];
    generationSource: 'gemini' | 'fallback';
    generationNote?: string;
}

function parseMaybeJsonObject(text: string): Record<string, any> | null {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
    const objectStart = trimmed.indexOf('{');
    const objectEnd = trimmed.lastIndexOf('}');
    const arrayStart = trimmed.indexOf('[');
    const arrayEnd = trimmed.lastIndexOf(']');
    const candidates = [
        trimmed,
        fenced ?? '',
        objectStart >= 0 && objectEnd > objectStart
            ? trimmed.slice(objectStart, objectEnd + 1)
            : '',
        arrayStart >= 0 && arrayEnd > arrayStart ? trimmed.slice(arrayStart, arrayEnd + 1) : '',
    ].filter(Boolean);

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            if (Array.isArray(parsed)) return { cards: parsed };
            if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
        } catch {
            // try next candidate
        }
    }
    return null;
}

function sanitizeLabel(value: unknown): RelevanceLabel {
    const normalized = String(value ?? '')
        .trim()
        .toLowerCase();
    if (normalized === 'same_deal') return 'same_deal';
    if (normalized === 'adjacent') return 'adjacent';
    return 'broader';
}

function fallbackCard(card: EnrichmentLanguageRequestCard): EnrichmentLanguageCardResponse {
    const outsideCount = card.metrics?.outsideEventCount ?? 0;
    const totalCount = card.metrics?.totalEventCount ?? 0;
    const sameDealCount = card.metrics?.sameDealEventCount ?? 0;
    if (card.kind === 'corporate_lineage') {
        return {
            id: card.id,
            plainSummary: `${card.title}. This lineage detail comes from broader graph history and provides organizational background rather than a new transaction.`,
            relevanceLabel: 'adjacent',
            sizeLabel: card.metrics?.sizeLabel ?? null,
        };
    }
    if (card.kind === 'event_timeline') {
        return {
            id: card.id,
            plainSummary: `${card.title}. We found ${totalCount} timeline events (${sameDealCount} from the collection and ${outsideCount} from broader participant activity).`,
            relevanceLabel: outsideCount > 0 ? 'adjacent' : 'same_deal',
            sizeLabel:
                card.metrics?.sizeLabel ?? 'Deal size not available from current graph extraction.',
        };
    }
    if (card.kind === 'broader_activity') {
        return {
            id: card.id,
            plainSummary: `${card.title}. This reflects broader participant-linked activity (${outsideCount} outside events), which may not be part of the same underlying deal.`,
            relevanceLabel: 'broader',
            sizeLabel:
                card.metrics?.sizeLabel ?? 'Deal size not available from current graph extraction.',
        };
    }
    return {
        id: card.id,
        plainSummary: `${card.title}. This is additional context from the broader graph and should be validated against the core document narrative.`,
        relevanceLabel: 'adjacent',
        sizeLabel: card.metrics?.sizeLabel ?? null,
    };
}

function fallbackCards(cards: EnrichmentLanguageRequestCard[]): EnrichmentLanguageCardResponse[] {
    return cards.map((card) => fallbackCard(card));
}

export default defineEventHandler(async (event): Promise<EnrichmentLanguageResponse> => {
    const body = (await readBody<EnrichmentLanguageRequest>(event)) ?? {};
    const cards = Array.isArray(body.cards)
        ? body.cards.filter((card) => card?.id && card?.title).slice(0, 12)
        : [];
    if (!cards.length) {
        return {
            cards: [],
            generationSource: 'fallback',
            generationNote: 'No enrichment cards were provided for language generation.',
        };
    }

    const summary = body.summary ?? {};
    const cardRows = cards.map((card) => ({
        id: card.id,
        kind: card.kind,
        title: card.title,
        subtitle: card.subtitle ?? '',
        documentContext: card.documentContext,
        kgContext: card.kgContext,
        evidence: card.evidence.slice(0, 6),
        metrics: card.metrics ?? {},
    }));

    const prompt = [
        'Rewrite enrichment cards in plain English.',
        'Return strict JSON only. No markdown, no code fences.',
        '',
        'Output schema:',
        '{"cards":[{"id":"","plainSummary":"","relevanceLabel":"same_deal|adjacent|broader","sizeLabel":""}]}',
        '',
        'Rules:',
        '- plainSummary must be 1-2 short sentences.',
        '- Use very plain wording, avoid jargon.',
        '- Never claim broader activity is the same deal unless clear.',
        '- Keep proper names as provided; do not replace names with identifiers.',
        '- Do not output raw NEID identifiers in plainSummary.',
        '- relevanceLabel meanings:',
        '  same_deal = directly part of the collection transaction narrative',
        '  adjacent = materially related context but not proven same deal',
        '  broader = participant-linked outside activity',
        '- If size is unknown, set sizeLabel to "Deal size not available from current graph extraction."',
        '',
        `Summary counts: document entities=${summary.documentEntityCount ?? 0}, enriched entities=${summary.enrichedEntityCount ?? 0}, document relationships=${summary.documentRelationshipCount ?? 0}, enriched relationships=${summary.enrichedRelationshipCount ?? 0}, total events=${summary.totalEventCount ?? 0}, outside events=${summary.outsideEventCount ?? 0}`,
        'Cards:',
        JSON.stringify(cardRows),
    ].join('\n');

    try {
        const generated = await generateGeminiText({
            prompt,
            label: 'enrichment_language',
            systemInstruction:
                'You are Ask Yotta. Write clear, cautious, plain-English enrichment summaries grounded only in provided data.',
            temperature: 0,
            maxOutputTokens: 2200,
            retries: 2,
        });
        const parsed = parseMaybeJsonObject(generated.text);
        const rawCards = Array.isArray(parsed?.cards)
            ? parsed.cards
            : Array.isArray(parsed?.items)
              ? parsed.items
              : [];
        const byId = new Map(cards.map((card) => [card.id, card] as const));
        const sanitized: EnrichmentLanguageCardResponse[] = [];
        for (const raw of rawCards) {
            const id = String(raw?.id ?? '').trim();
            if (!id || !byId.has(id)) continue;
            const plainSummary = String(raw?.plainSummary ?? '').trim();
            if (!plainSummary) continue;
            const sizeLabelRaw = String(raw?.sizeLabel ?? '').trim();
            sanitized.push({
                id,
                plainSummary,
                relevanceLabel: sanitizeLabel(raw?.relevanceLabel),
                sizeLabel: sizeLabelRaw || byId.get(id)?.metrics?.sizeLabel || null,
            });
        }

        if (sanitized.length > 0) {
            const fallbackMap = new Map(
                fallbackCards(cards).map((card) => [card.id, card] as const)
            );
            const merged = cards.map((card) => {
                const modelCard = sanitized.find((row) => row.id === card.id);
                return modelCard ?? fallbackMap.get(card.id)!;
            });
            return {
                cards: merged,
                generationSource: 'gemini',
            };
        }
    } catch {
        // fall through to deterministic fallback
    }

    return {
        cards: fallbackCards(cards),
        generationSource: 'fallback',
        generationNote:
            'Gemini output was unavailable or invalid JSON, so deterministic enrichment summaries were used.',
    };
});
