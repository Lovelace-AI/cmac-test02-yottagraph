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

function sanitizeModelText(text: string): string {
    return text
        .replace(/\u0000/g, '')
        .replace(/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/g, '')
        .trim();
}

function parseMaybeJsonObject(text: string): Record<string, any> | null {
    const trimmed = sanitizeModelText(text);
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
            const parsed = JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
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
        if (/beneficiary transition/i.test(`${card.subtitle ?? ''} ${card.documentContext}`)) {
            return {
                id: card.id,
                plainSummary: `${card.title.replace(' -> ', ' later shifted to ')} in a beneficiary-role change documented in the uploaded collection.`,
                relevanceLabel: 'same_deal',
                sizeLabel: card.metrics?.sizeLabel ?? null,
            };
        }
        if (/bank succession/i.test(`${card.subtitle ?? ''} ${card.documentContext}`)) {
            return {
                id: card.id,
                plainSummary: `${card.title.replace(' -> ', ' later transitioned to ')} in a source-backed bank succession event from the collection.`,
                relevanceLabel: 'same_deal',
                sizeLabel: card.metrics?.sizeLabel ?? null,
            };
        }
        return {
            id: card.id,
            plainSummary: `${card.title.replace(' -> ', ' was later succeeded by ')}.`,
            relevanceLabel: 'adjacent',
            sizeLabel: card.metrics?.sizeLabel ?? null,
        };
    }
    if (card.kind === 'event_timeline') {
        const title = card.title.replace(/: broader timeline context$/i, '');
        return {
            id: card.id,
            plainSummary: `${title} has ${totalCount} relevant timeline events, with ${sameDealCount} grounded in the uploaded collection and ${outsideCount} coming from later or broader participant activity.`,
            relevanceLabel: outsideCount > 0 ? 'adjacent' : 'same_deal',
            sizeLabel:
                card.metrics?.sizeLabel ?? 'Deal size not available from current graph extraction.',
        };
    }
    if (card.kind === 'broader_activity') {
        const title = card.title.replace(/: broader participant activity$/i, '');
        return {
            id: card.id,
            plainSummary: `${title} is linked to ${outsideCount} later or outside events in the broader graph. These examples should be read as follow-on context around the same participant, not automatically as missing facts from the uploaded deal documents.`,
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

function truncateText(text: string | undefined, maxLength: number): string {
    if (!text) return '';
    const compact = text.replace(/\s+/g, ' ').trim();
    if (compact.length <= maxLength) return compact;
    return `${compact.slice(0, maxLength - 1).trimEnd()}...`;
}

function extractRawCards(parsed: Record<string, any> | null): any[] {
    if (!parsed || typeof parsed !== 'object') return [];
    if (Array.isArray(parsed.cards)) return parsed.cards;
    if (Array.isArray(parsed.items)) return parsed.items;
    if (Array.isArray(parsed.results)) return parsed.results;
    if (Array.isArray(parsed.data?.cards)) return parsed.data.cards;
    if (parsed.cards && typeof parsed.cards === 'object') {
        return Object.entries(parsed.cards).map(([id, value]) => ({ id, ...(value as object) }));
    }
    return [];
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }
    return chunks;
}

function buildPrompt(
    cards: EnrichmentLanguageRequestCard[],
    summary: EnrichmentLanguageRequest['summary']
): string {
    const cardRows = cards.map((card) => ({
        id: card.id,
        kind: card.kind,
        title: truncateText(card.title, 120),
        subtitle: truncateText(card.subtitle ?? '', 120),
        documentContext: truncateText(card.documentContext, 220),
        kgContext: truncateText(card.kgContext, 220),
        evidence: card.evidence.slice(0, 4).map((line) => truncateText(line, 180)),
        metrics: card.metrics ?? {},
    }));
    const cardIds = cards.map((card) => card.id);
    return [
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
        '- Do not mention tools, hops, second-hop context, outside data pipelines, or JSON.',
        '- For corporate_lineage cards, explain the business meaning of the succession or role transition in plain English. Some cards are direct document-backed beneficiary or bank succession events, so describe the exact transition instead of assuming an outside-data corporate takeover.',
        '- For broader_activity cards, explain whether the examples look like later amendments, later servicing activity, or unrelated outside work.',
        '- For broader_activity cards involving later amendments, make clear these are later follow-on events and not automatically missing extractions from the uploaded corpus.',
        `- Keep id exactly as provided. Valid ids: ${cardIds.join(', ')}`,
        '- relevanceLabel meanings:',
        '  same_deal = directly part of the collection transaction narrative',
        '  adjacent = materially related context but not proven same deal',
        '  broader = participant-linked outside activity',
        '- If size is unknown, set sizeLabel to "Deal size not available from current graph extraction."',
        '',
        `Summary counts: document entities=${summary?.documentEntityCount ?? 0}, enriched entities=${summary?.enrichedEntityCount ?? 0}, document relationships=${summary?.documentRelationshipCount ?? 0}, enriched relationships=${summary?.enrichedRelationshipCount ?? 0}, total events=${summary?.totalEventCount ?? 0}, outside events=${summary?.outsideEventCount ?? 0}`,
        'Cards:',
        JSON.stringify(cardRows),
    ].join('\n');
}

export default defineEventHandler(async (event): Promise<EnrichmentLanguageResponse> => {
    const body = (await readBody<EnrichmentLanguageRequest>(event)) ?? {};
    const cards = Array.isArray(body.cards)
        ? body.cards.filter((card) => card?.id && card?.title).slice(0, 24)
        : [];
    if (!cards.length) {
        return {
            cards: [],
            generationSource: 'fallback',
            generationNote: 'No enrichment cards were provided for language generation.',
        };
    }

    const summary = body.summary ?? {};
    const chunks = chunkArray(cards, 6);

    try {
        const mergedById = new Map<string, EnrichmentLanguageCardResponse>();
        let successfulChunkCount = 0;
        let hadFormattingFailure = false;

        for (const chunk of chunks) {
            try {
                const prompt = buildPrompt(chunk, summary);
                const generated = await generateGeminiText({
                    prompt,
                    label: 'enrichment_language',
                    model: 'gemini-3.1-preview',
                    systemInstruction:
                        'You are Ask Yotta. Write clear, cautious, plain-English enrichment summaries grounded only in provided data.',
                    temperature: 0,
                    maxOutputTokens: 1400,
                    retries: 3,
                    timeoutMs: 35000,
                });
                const parsed = parseMaybeJsonObject(generated.text);
                const rawCards = extractRawCards(parsed);
                const byId = new Map(chunk.map((card) => [card.id, card] as const));
                const sanitized: EnrichmentLanguageCardResponse[] = [];
                for (const [index, raw] of rawCards.entries()) {
                    const rawId = String(raw?.id ?? '').trim();
                    const fallbackId = chunk[index]?.id;
                    const id = rawId && byId.has(rawId) ? rawId : fallbackId;
                    if (!id || !byId.has(id)) continue;
                    const plainSummary = String(
                        raw?.plainSummary ?? raw?.summary ?? raw?.description ?? ''
                    ).trim();
                    if (!plainSummary) continue;
                    const sizeLabelRaw = String(raw?.sizeLabel ?? '').trim();
                    sanitized.push({
                        id,
                        plainSummary,
                        relevanceLabel: sanitizeLabel(raw?.relevanceLabel),
                        sizeLabel: sizeLabelRaw || byId.get(id)?.metrics?.sizeLabel || null,
                    });
                }
                if (sanitized.length === 0) {
                    hadFormattingFailure = true;
                    for (const fallback of fallbackCards(chunk))
                        mergedById.set(fallback.id, fallback);
                    continue;
                }
                successfulChunkCount += 1;
                const fallbackMap = new Map(
                    fallbackCards(chunk).map((card) => [card.id, card] as const)
                );
                const modelById = new Map(sanitized.map((row) => [row.id, row] as const));
                for (const card of chunk) {
                    mergedById.set(card.id, modelById.get(card.id) ?? fallbackMap.get(card.id)!);
                }
            } catch {
                hadFormattingFailure = true;
                for (const fallback of fallbackCards(chunk)) mergedById.set(fallback.id, fallback);
            }
        }

        if (mergedById.size > 0) {
            return {
                cards: cards.map((card) => mergedById.get(card.id) ?? fallbackCard(card)),
                generationSource: successfulChunkCount > 0 ? 'gemini' : 'fallback',
                generationNote:
                    successfulChunkCount > 0 || !hadFormattingFailure
                        ? undefined
                        : 'Some enrichment summaries used deterministic wording after model formatting issues.',
            };
        }
    } catch (error: any) {
        return {
            cards: fallbackCards(cards),
            generationSource: 'fallback',
            generationNote:
                error?.message && String(error.message).trim().length
                    ? `Gemini language generation failed, so deterministic enrichment summaries were used (${String(error.message).slice(0, 120)}).`
                    : 'Gemini language generation failed, so deterministic enrichment summaries were used.',
        };
    }

    return {
        cards: fallbackCards(cards),
        generationSource: 'fallback',
        generationNote:
            'Some enrichment summaries used deterministic wording after model formatting issues.',
    };
});
