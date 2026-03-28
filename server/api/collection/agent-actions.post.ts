import { getCachedCollection } from '~/server/api/collection/bootstrap.get';
import { generateGeminiText } from '~/server/utils/gemini';
import type { EntityRecord, EventRecord } from '~/utils/collectionTypes';

interface AgentActionRequest {
    action:
        | 'summarize_collection'
        | 'explain_entity'
        | 'answer_question'
        | 'compare_contexts'
        | 'recommend_anchors';
    entityNeid?: string;
    question?: string;
}

interface AgentActionResponse {
    action: string;
    output: string;
    citations: Array<{
        type: 'entity' | 'event' | 'document' | 'relationship';
        neid: string;
        label: string;
    }>;
    usage?: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costUsd: number;
    };
    generationSource?: 'gemini' | 'fallback';
    generationNote?: string;
}

export default defineEventHandler(async (event): Promise<AgentActionResponse> => {
    const body = await readBody<AgentActionRequest>(event);
    if (!body?.action) {
        throw createError({ statusCode: 400, statusMessage: 'action required' });
    }

    const collection = getCachedCollection();
    if (!collection || collection.status !== 'ready') {
        throw createError({
            statusCode: 409,
            statusMessage: 'Collection not loaded. Run a rebuild first.',
        });
    }

    const { entities, events, relationships, documents, meta } = collection;

    const buildUsage = (usage: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }) => ({
        ...usage,
        costUsd: 0,
    });

    try {
        switch (body.action) {
            case 'summarize_collection': {
                const generated = await summarizeCollection(entities, events, documents, meta);
                return { ...generated, usage: buildUsage(generated.usage) };
            }
            case 'explain_entity': {
                const generated = await explainEntity(
                    body.entityNeid,
                    entities,
                    relationships,
                    events,
                    documents
                );
                return { ...generated, usage: buildUsage(generated.usage) };
            }
            case 'answer_question': {
                const generated = await answerQuestion(
                    body.question,
                    entities,
                    events,
                    relationships,
                    meta,
                    documents
                );
                return { ...generated, usage: buildUsage(generated.usage) };
            }
            case 'compare_contexts': {
                const generated = await compareContexts(entities);
                return { ...generated, usage: buildUsage(generated.usage) };
            }
            case 'recommend_anchors': {
                const generated = await recommendAnchors(entities, relationships);
                return { ...generated, usage: buildUsage(generated.usage) };
            }
            default:
                throw createError({
                    statusCode: 400,
                    statusMessage: `Unknown action: ${body.action}`,
                });
        }
    } catch (error: any) {
        throw createError({
            statusCode: 500,
            statusMessage: error?.message || 'Ask Yotta generation failed.',
        });
    }
});

async function summarizeCollection(
    entities: EntityRecord[],
    events: EventRecord[],
    documents: any[],
    meta: any
): Promise<{
    action: string;
    output: string;
    citations: AgentActionResponse['citations'];
    usage: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}> {
    const flavorCounts = countBy(entities, (entity) => entity.flavor);
    const flavorSummary = Array.from(flavorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([flavor, count]) => `${count} ${flavor.replace(/_/g, ' ')}`)
        .join(', ');

    const eventCategories = countBy(events, (eventItem) => eventItem.category || 'uncategorized');
    const eventSummary = Array.from(eventCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category, count]) => `${count} ${category}`)
        .join(', ');

    const centralEntities = rankEntitiesByConnectivity(
        entities,
        collectionLinksFromEvents(events, entities)
    );
    const evidenceBackedLinks = collectionLinksFromEvents(
        events,
        entities
    ).evidenceBackedRelationships;
    const inferredLinks = collectionLinksFromEvents(events, entities).inferredRelationships;
    const dateRange = getEventDateRange(events);

    const topEntityLine =
        centralEntities.length > 0
            ? `Most central party: ${centralEntities[0].name} (${centralEntities[0].connections} links).`
            : 'No central party could be identified yet.';
    const timelineLine = dateRange
        ? `Timeline coverage spans ${dateRange.start} to ${dateRange.end}.`
        : 'Timeline coverage is limited because event dates are missing.';
    const confidenceLine =
        evidenceBackedLinks >= inferredLinks
            ? 'Confidence is medium-high because most links are source-backed.'
            : 'Confidence is moderate; inferred links outnumber source-backed links and should be verified.';

    const fallback = [
        `**Collection summary: ${meta.name}**`,
        meta.description || 'No collection description provided.',
        `This collection contains ${documents.length} source documents with ${entities.length} entities and ${events.length} events.`,
        `Primary entity mix: ${flavorSummary || 'not enough data yet'}.`,
        events.length > 0
            ? `Most common event categories: ${eventSummary}.`
            : 'No events have been loaded yet.',
        topEntityLine,
        timelineLine,
        confidenceLine,
    ].join('\n\n');

    const citations = documents.map((d) => ({
        type: 'document' as const,
        neid: d.neid,
        label: d.title,
    }));

    const prompt = [
        'Create a concise executive brief for a collection intelligence analyst.',
        'Use short paragraphs and bullets, avoid hype, and ground conclusions in the supplied stats.',
        'End with a 3-item "Recommended next checks" section.',
        '',
        `Collection: ${meta.name}`,
        `Description: ${meta.description || 'N/A'}`,
        `Documents: ${documents.length}, Entities: ${entities.length}, Events: ${events.length}`,
        `Entity mix: ${flavorSummary || 'N/A'}`,
        `Event categories: ${eventSummary || 'N/A'}`,
        topEntityLine,
        timelineLine,
        confidenceLine,
        `Evidence-backed links: ${evidenceBackedLinks}, Inferred links: ${inferredLinks}`,
    ].join('\n');

    try {
        const generated = await generateGeminiText({
            prompt,
            label: 'summarize_collection',
            systemInstruction:
                'You are Ask Yotta, an analytical assistant. Provide precise, evidence-oriented language only.',
            maxOutputTokens: 1800,
            retries: 1,
        });
        return {
            action: 'summarize_collection',
            output: generated.text || fallback,
            citations,
            usage: generated.usage,
        };
    } catch {
        return {
            action: 'summarize_collection',
            output: fallback,
            citations,
            usage: { model: 'fallback', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }
}

async function explainEntity(
    entityNeid: string | undefined,
    entities: EntityRecord[],
    relationships: any[],
    events: EventRecord[],
    documents?: any[]
): Promise<{
    action: string;
    output: string;
    citations: AgentActionResponse['citations'];
    usage: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}> {
    if (!entityNeid) {
        return {
            action: 'explain_entity',
            output: 'No entity selected.',
            citations: [],
            usage: { model: 'fallback', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    const entity = entities.find((e) => e.neid === entityNeid);
    if (!entity) {
        return {
            action: 'explain_entity',
            output: `Entity ${entityNeid} not found in collection.`,
            citations: [],
            usage: { model: 'fallback', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    const rels = relationships.filter(
        (r) => r.sourceNeid === entityNeid || r.targetNeid === entityNeid
    );
    const relatedEvents = events.filter((e) => e.participantNeids.includes(entityNeid));
    const evidenceBacked = rels.filter(
        (rel) => Boolean(rel.sourceDocumentNeid) || (rel.citations?.length ?? 0) > 0
    ).length;

    const fallback = [
        `**Entity brief: ${entity.name}**`,
        '',
        `${entity.name} is a ${entity.flavor.replace(/_/g, ' ')} found in ${entity.sourceDocuments.length} source document(s).`,
        `It has ${rels.length} relationship(s), with ${evidenceBacked} currently source-backed.`,
        relatedEvents.length > 0
            ? `It participates in ${relatedEvents.length} event(s), which can be used to trace timeline impact.`
            : 'No events linked to this entity.',
        '',
        `Origin classification: ${entity.origin}.`,
        '',
        '**Why this matters**',
        `- This entity appears central to collection context when interpreted with its linked relationships.`,
        `- Use the Graph & Entities view to inspect strongest links and the Timeline view for event progression.`,
    ].join('\n');

    const citations: AgentActionResponse['citations'] = [
        { type: 'entity', neid: entity.neid, label: entity.name },
    ];
    for (const docNeid of entity.sourceDocuments.slice(0, 3)) {
        const doc = documents?.find((item) => item.neid === docNeid);
        if (doc) citations.push({ type: 'document', neid: doc.neid, label: doc.title });
    }
    for (const e of relatedEvents.slice(0, 3)) {
        citations.push({ type: 'event', neid: e.neid, label: e.name });
    }

    const prompt = [
        `Explain the role of entity "${entity.name}" for an analyst.`,
        'Keep output grounded, concise, and practical. Include why it matters, what evidence supports it, and what to verify next.',
        '',
        `Entity flavor: ${entity.flavor}`,
        `Entity origin: ${entity.origin}`,
        `Source documents linked: ${entity.sourceDocuments.length}`,
        `Relationship count: ${rels.length}, source-backed relationships: ${evidenceBacked}`,
        `Linked event count: ${relatedEvents.length}`,
        `Top linked events: ${relatedEvents
            .slice(0, 6)
            .map((eventItem) => eventItem.name)
            .join(', ')}`,
    ].join('\n');

    try {
        const generated = await generateGeminiText({
            prompt,
            label: 'explain_entity',
            systemInstruction:
                'You are Ask Yotta. Explain entities with factual grounding and no speculation.',
            maxOutputTokens: 1800,
            retries: 1,
        });
        return {
            action: 'explain_entity',
            output: generated.text || fallback,
            citations,
            usage: generated.usage,
        };
    } catch {
        return {
            action: 'explain_entity',
            output: fallback,
            citations,
            usage: { model: 'fallback', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }
}

async function answerQuestion(
    question: string | undefined,
    entities: EntityRecord[],
    events: EventRecord[],
    relationships: any[],
    meta: any,
    documents?: any[]
): Promise<{
    action: string;
    output: string;
    citations: AgentActionResponse['citations'];
    usage: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}> {
    if (!question) {
        return {
            action: 'answer_question',
            output: 'No question provided.',
            citations: [],
            usage: { model: 'fallback', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    const q = question.toLowerCase().trim();
    const links = collectionLinksFromEvents(events, entities);
    const rankedEntities = rankEntitiesByConnectivity(entities, links);
    const datedEvents = events.filter((eventItem) => Boolean(eventItem.date)).length;
    const matchingEntities = entities.filter(
        (e) => e.name.toLowerCase().includes(q) || e.flavor.toLowerCase().includes(q)
    );
    const matchingEvents = events.filter(
        (e) =>
            e.name.toLowerCase().includes(q) ||
            (e.description?.toLowerCase().includes(q) ?? false) ||
            (e.category?.toLowerCase().includes(q) ?? false)
    );
    const topRelTypes = countBy(relationships, (relationship) => relationship.type);
    const relSummary = Array.from(topRelTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([type, count]) => `${type}:${count}`)
        .join(', ');
    const docSummary = (documents ?? [])
        .slice(0, 8)
        .map((doc) => `${doc.title}${doc.date ? ` (${doc.date})` : ''}`)
        .join('; ');

    const parts: string[] = [];
    if (q.includes('central entit') || q.includes('most central')) {
        const top = rankedEntities.slice(0, 5);
        parts.push(
            `Most central entities are ${top.map((entry) => `${entry.name} (${entry.connections} links)`).join(', ')}.`
        );
    } else if (q.includes('evidence thin') || q.includes('incomplete') || q.includes('coverage')) {
        parts.push(
            `Coverage summary: ${links.evidenceBackedRelationships} source-backed links and ${links.inferredRelationships} inferred links.`
        );
        if (datedEvents === 0) {
            parts.push('Event timeline confidence is limited because no dated events were found.');
        } else {
            parts.push(`${datedEvents} events include dates, supporting timeline interpretation.`);
        }
    } else if (q.includes('changed') || q.includes('over time')) {
        const byYear = countBy(
            events.filter((eventItem) => Boolean(eventItem.date)),
            (eventItem) => (eventItem.date || '').slice(0, 4)
        );
        const yearSummary = Array.from(byYear.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([year, count]) => `${year}: ${count}`)
            .join(', ');
        parts.push(
            yearSummary
                ? `Observed event progression by year: ${yearSummary}.`
                : 'Unable to infer change over time because event dates are sparse.'
        );
    }

    if (matchingEntities.length > 0) {
        parts.push(
            `Related entities: ${matchingEntities
                .slice(0, 5)
                .map((entity) => `${entity.name} (${entity.flavor.replace(/_/g, ' ')})`)
                .join(', ')}.`
        );
    }
    if (matchingEvents.length > 0) {
        parts.push(
            `Related events: ${matchingEvents
                .slice(0, 5)
                .map((eventItem) => eventItem.name)
                .join(', ')}.`
        );
    }
    if (parts.length === 0) {
        parts.push(
            `No direct matches found for "${question}" in the current collection of ${meta.entityCount} entities and ${meta.eventCount} events.`
        );
        parts.push(
            'Try asking about key entities, evidence gaps, timeline changes, or agreement context.'
        );
    }

    const citations: AgentActionResponse['citations'] = [];
    for (const e of matchingEntities.slice(0, 3)) {
        citations.push({ type: 'entity', neid: e.neid, label: e.name });
        for (const docNeid of e.sourceDocuments.slice(0, 1)) {
            const doc = documents?.find((item) => item.neid === docNeid);
            if (doc) citations.push({ type: 'document', neid: doc.neid, label: doc.title });
        }
    }
    for (const e of matchingEvents.slice(0, 3)) {
        citations.push({ type: 'event', neid: e.neid, label: e.name });
    }

    const fallback = parts.join('\n\n');
    const prompt = [
        'Answer the analyst question using only the provided collection context.',
        'If evidence is thin, say so directly. Keep response concise and actionable.',
        '',
        `Question: ${question}`,
        `Collection: ${meta.name}`,
        `Entities: ${meta.entityCount}, Events: ${meta.eventCount}, Relationships: ${meta.relationshipCount}`,
        `Documents in scope: ${documents?.length ?? 0}`,
        `Document list: ${docSummary || 'N/A'}`,
        `Top relationship types: ${relSummary || 'N/A'}`,
        `Evidence-backed links: ${links.evidenceBackedRelationships}, inferred links: ${links.inferredRelationships}`,
        `Likely related entities: ${matchingEntities
            .slice(0, 8)
            .map((entity) => entity.name)
            .join(', ')}`,
        `Likely related events: ${matchingEvents
            .slice(0, 8)
            .map((eventItem) => eventItem.name)
            .join(', ')}`,
        `Coverage notes: ${fallback}`,
    ].join('\n');

    try {
        const generated = await generateGeminiText({
            prompt,
            label: 'answer_question',
            systemInstruction:
                'You are Ask Yotta, a grounded analytical assistant. Be clear, factual, and citation-aware.',
            maxOutputTokens: 1800,
            retries: 1,
        });
        return {
            action: 'answer_question',
            output: generated.text || fallback,
            citations,
            usage: generated.usage,
            generationSource: 'gemini',
        };
    } catch (error: any) {
        return {
            action: 'answer_question',
            output: fallback,
            citations,
            usage: { model: 'fallback', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            generationSource: 'fallback',
            generationNote: String(error?.message ?? 'Gemini generation failed').slice(0, 220),
        };
    }
}

async function compareContexts(entities: EntityRecord[]): Promise<{
    action: string;
    output: string;
    citations: AgentActionResponse['citations'];
    usage: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}> {
    const docEntities = entities.filter((e) => e.origin === 'document');
    const enrichedEntities = entities.filter((e) => e.origin === 'enriched');

    const docFlavors = new Map<string, number>();
    for (const e of docEntities) docFlavors.set(e.flavor, (docFlavors.get(e.flavor) || 0) + 1);

    const enrichFlavors = new Map<string, number>();
    for (const e of enrichedEntities)
        enrichFlavors.set(e.flavor, (enrichFlavors.get(e.flavor) || 0) + 1);

    const fallback = [
        `**Document-derived context:** ${docEntities.length} entities across ${docFlavors.size} types`,
        Array.from(docFlavors.entries())
            .map(([f, c]) => `  - ${f}: ${c}`)
            .join('\n'),
        '',
        enrichedEntities.length > 0
            ? [
                  `**Enriched context:** ${enrichedEntities.length} entities across ${enrichFlavors.size} types`,
                  Array.from(enrichFlavors.entries())
                      .map(([f, c]) => `  - ${f}: ${c}`)
                      .join('\n'),
              ].join('\n')
            : '**Enriched context:** No enrichment has been run yet. Select anchor entities and expand to see broader graph context.',
    ].join('\n');

    try {
        const generated = await generateGeminiText({
            prompt: [
                'Compare document-derived and enriched context for analysts.',
                `Document-derived entities: ${docEntities.length}`,
                `Document type distribution: ${Array.from(docFlavors.entries())
                    .map(([flavor, count]) => `${flavor}:${count}`)
                    .join(', ')}`,
                `Enriched entities: ${enrichedEntities.length}`,
                `Enriched type distribution: ${Array.from(enrichFlavors.entries())
                    .map(([flavor, count]) => `${flavor}:${count}`)
                    .join(', ')}`,
            ].join('\n'),
            label: 'compare_contexts',
            systemInstruction:
                'You are Ask Yotta. Explain context deltas and what they mean for analysis quality.',
            maxOutputTokens: 520,
            retries: 1,
        });
        return {
            action: 'compare_contexts',
            output: generated.text || fallback,
            citations: [],
            usage: generated.usage,
        };
    } catch {
        return {
            action: 'compare_contexts',
            output: fallback,
            citations: [],
            usage: { model: 'fallback', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }
}

async function recommendAnchors(
    entities: EntityRecord[],
    relationships: any[]
): Promise<{
    action: string;
    output: string;
    citations: AgentActionResponse['citations'];
    usage: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}> {
    const connectionCount = new Map<string, number>();
    for (const r of relationships) {
        connectionCount.set(r.sourceNeid, (connectionCount.get(r.sourceNeid) || 0) + 1);
        connectionCount.set(r.targetNeid, (connectionCount.get(r.targetNeid) || 0) + 1);
    }

    const ranked = entities
        .filter((e) => e.origin === 'document')
        .map((e) => ({ entity: e, connections: connectionCount.get(e.neid) || 0 }))
        .sort((a, b) => b.connections - a.connections)
        .slice(0, 5);

    const fallback = [
        '**Recommended Anchor Entities for Enrichment**',
        '',
        ...ranked.map(
            (r, i) =>
                `${i + 1}. **${r.entity.name}** (${r.entity.flavor}) — ${r.connections} connections in collection`
        ),
        '',
        'These entities have the most relationships within the document-derived graph and are likely to yield the richest enrichment results.',
    ].join('\n');

    const citations = ranked.flatMap((r) => [
        {
            type: 'entity' as const,
            neid: r.entity.neid,
            label: r.entity.name,
        },
        ...r.entity.sourceDocuments.slice(0, 1).map((docNeid) => ({
            type: 'document' as const,
            neid: docNeid,
            label: docNeid,
        })),
    ]);

    try {
        const generated = await generateGeminiText({
            prompt: [
                'Recommend anchor entities for enrichment with ranking rationale.',
                `Ranked document entities: ${ranked
                    .map(
                        (entry, idx) =>
                            `${idx + 1}. ${entry.entity.name} (${entry.entity.flavor}) - ${entry.connections} connections`
                    )
                    .join('; ')}`,
            ].join('\n'),
            label: 'recommend_anchors',
            systemInstruction:
                'You are Ask Yotta. Provide concise anchor recommendations and practical rationale.',
            maxOutputTokens: 520,
            retries: 1,
        });
        return {
            action: 'recommend_anchors',
            output: generated.text || fallback,
            citations,
            usage: generated.usage,
        };
    } catch {
        return {
            action: 'recommend_anchors',
            output: fallback,
            citations,
            usage: { model: 'fallback', promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
        const key = keyFn(item);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

function collectionLinksFromEvents(events: EventRecord[], entities: EntityRecord[]) {
    const relationshipCountByNeid = new Map<string, number>();
    let evidenceBackedRelationships = 0;
    let inferredRelationships = 0;

    for (const entity of entities) {
        relationshipCountByNeid.set(entity.neid, 0);
    }

    for (const eventItem of events) {
        const evidenceBoost = eventItem.sourceDocuments.length > 0 ? 1 : 0;
        for (const neid of eventItem.participantNeids) {
            relationshipCountByNeid.set(
                neid,
                (relationshipCountByNeid.get(neid) ?? 0) + 1 + evidenceBoost
            );
        }
    }

    for (const entity of entities) {
        if (entity.sourceDocuments.length > 0) evidenceBackedRelationships += 1;
        else inferredRelationships += 1;
    }

    return { relationshipCountByNeid, evidenceBackedRelationships, inferredRelationships };
}

function rankEntitiesByConnectivity(
    entities: EntityRecord[],
    links: { relationshipCountByNeid: Map<string, number> }
) {
    return entities
        .map((entity) => ({
            neid: entity.neid,
            name: entity.name,
            connections: links.relationshipCountByNeid.get(entity.neid) ?? 0,
        }))
        .sort((a, b) => b.connections - a.connections);
}

function getEventDateRange(events: EventRecord[]) {
    const dates = events.map((eventItem) => eventItem.date).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    const sorted = [...dates].sort();
    return { start: sorted[0].slice(0, 10), end: sorted[sorted.length - 1].slice(0, 10) };
}
