import { getCachedCollection } from '~/server/api/collection/bootstrap.get';
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

    switch (body.action) {
        case 'summarize_collection':
            return summarizeCollection(entities, events, documents, meta);
        case 'explain_entity':
            return explainEntity(body.entityNeid, entities, relationships, events);
        case 'answer_question':
            return answerQuestion(body.question, entities, events, meta);
        case 'compare_contexts':
            return compareContexts(entities);
        case 'recommend_anchors':
            return recommendAnchors(entities, relationships);
        default:
            throw createError({ statusCode: 400, statusMessage: `Unknown action: ${body.action}` });
    }
});

function summarizeCollection(
    entities: EntityRecord[],
    events: EventRecord[],
    documents: any[],
    meta: any
): AgentActionResponse {
    const flavorCounts = new Map<string, number>();
    for (const e of entities) flavorCounts.set(e.flavor, (flavorCounts.get(e.flavor) || 0) + 1);

    const flavorSummary = Array.from(flavorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([f, c]) => `${c} ${f}`)
        .join(', ');

    const eventCategories = new Map<string, number>();
    for (const e of events) {
        const cat = e.category || 'uncategorized';
        eventCategories.set(cat, (eventCategories.get(cat) || 0) + 1);
    }

    const eventSummary = Array.from(eventCategories.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([c, n]) => `${n} ${c}`)
        .join(', ');

    const output = [
        `**${meta.name}**`,
        '',
        meta.description,
        '',
        `This collection contains ${documents.length} source documents that produced ${entities.length} unique entities (${flavorSummary}).`,
        '',
        events.length > 0
            ? `${events.length} events were discovered at hop 2: ${eventSummary}.`
            : 'No events have been loaded yet.',
        '',
        `${meta.relationshipCount} relationships connect these entities across ${new Set(entities.map((e) => e.flavor)).size} entity types.`,
    ].join('\n');

    const citations = documents.map((d) => ({
        type: 'document' as const,
        neid: d.neid,
        label: d.title,
    }));

    return { action: 'summarize_collection', output, citations };
}

function explainEntity(
    entityNeid: string | undefined,
    entities: EntityRecord[],
    relationships: any[],
    events: EventRecord[]
): AgentActionResponse {
    if (!entityNeid) {
        return { action: 'explain_entity', output: 'No entity selected.', citations: [] };
    }

    const entity = entities.find((e) => e.neid === entityNeid);
    if (!entity) {
        return {
            action: 'explain_entity',
            output: `Entity ${entityNeid} not found in collection.`,
            citations: [],
        };
    }

    const rels = relationships.filter(
        (r) => r.sourceNeid === entityNeid || r.targetNeid === entityNeid
    );
    const relatedEvents = events.filter((e) => e.participantNeids.includes(entityNeid));

    const output = [
        `**${entity.name}** (${entity.flavor})`,
        '',
        `Found in ${entity.sourceDocuments.length} source document(s).`,
        `Connected by ${rels.length} relationship(s) to other entities in the collection.`,
        relatedEvents.length > 0
            ? `Participates in ${relatedEvents.length} event(s).`
            : 'No events linked to this entity.',
        '',
        `Origin: ${entity.origin}`,
    ].join('\n');

    const citations: AgentActionResponse['citations'] = [
        { type: 'entity', neid: entity.neid, label: entity.name },
    ];
    for (const e of relatedEvents.slice(0, 3)) {
        citations.push({ type: 'event', neid: e.neid, label: e.name });
    }

    return { action: 'explain_entity', output, citations };
}

function answerQuestion(
    question: string | undefined,
    entities: EntityRecord[],
    events: EventRecord[],
    meta: any
): AgentActionResponse {
    if (!question) {
        return { action: 'answer_question', output: 'No question provided.', citations: [] };
    }

    const q = question.toLowerCase();
    const matchingEntities = entities.filter(
        (e) => e.name.toLowerCase().includes(q) || e.flavor.toLowerCase().includes(q)
    );
    const matchingEvents = events.filter(
        (e) =>
            e.name.toLowerCase().includes(q) ||
            (e.description?.toLowerCase().includes(q) ?? false) ||
            (e.category?.toLowerCase().includes(q) ?? false)
    );

    const parts: string[] = [];
    if (matchingEntities.length > 0) {
        parts.push(
            `Found ${matchingEntities.length} matching entities: ${matchingEntities
                .slice(0, 5)
                .map((e) => `${e.name} (${e.flavor})`)
                .join(', ')}.`
        );
    }
    if (matchingEvents.length > 0) {
        parts.push(
            `Found ${matchingEvents.length} matching events: ${matchingEvents
                .slice(0, 5)
                .map((e) => e.name)
                .join(', ')}.`
        );
    }
    if (parts.length === 0) {
        parts.push(
            `No direct matches found for "${question}" in the current collection of ${meta.entityCount} entities and ${meta.eventCount} events.`
        );
    }

    const citations: AgentActionResponse['citations'] = [];
    for (const e of matchingEntities.slice(0, 3)) {
        citations.push({ type: 'entity', neid: e.neid, label: e.name });
    }
    for (const e of matchingEvents.slice(0, 3)) {
        citations.push({ type: 'event', neid: e.neid, label: e.name });
    }

    return { action: 'answer_question', output: parts.join('\n\n'), citations };
}

function compareContexts(entities: EntityRecord[]): AgentActionResponse {
    const docEntities = entities.filter((e) => e.origin === 'document');
    const enrichedEntities = entities.filter((e) => e.origin === 'enriched');

    const docFlavors = new Map<string, number>();
    for (const e of docEntities) docFlavors.set(e.flavor, (docFlavors.get(e.flavor) || 0) + 1);

    const enrichFlavors = new Map<string, number>();
    for (const e of enrichedEntities)
        enrichFlavors.set(e.flavor, (enrichFlavors.get(e.flavor) || 0) + 1);

    const output = [
        `**Document-Derived Context:** ${docEntities.length} entities across ${docFlavors.size} types`,
        Array.from(docFlavors.entries())
            .map(([f, c]) => `  - ${f}: ${c}`)
            .join('\n'),
        '',
        enrichedEntities.length > 0
            ? [
                  `**Enriched Context:** ${enrichedEntities.length} entities across ${enrichFlavors.size} types`,
                  Array.from(enrichFlavors.entries())
                      .map(([f, c]) => `  - ${f}: ${c}`)
                      .join('\n'),
              ].join('\n')
            : '**Enriched Context:** No enrichment has been run yet. Select anchor entities and expand to see broader graph context.',
    ].join('\n');

    return { action: 'compare_contexts', output, citations: [] };
}

function recommendAnchors(entities: EntityRecord[], relationships: any[]): AgentActionResponse {
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

    const output = [
        '**Recommended Anchor Entities for Enrichment**',
        '',
        ...ranked.map(
            (r, i) =>
                `${i + 1}. **${r.entity.name}** (${r.entity.flavor}) — ${r.connections} connections in collection`
        ),
        '',
        'These entities have the most relationships within the document-derived graph and are likely to yield the richest enrichment results.',
    ].join('\n');

    const citations = ranked.map((r) => ({
        type: 'entity' as const,
        neid: r.entity.neid,
        label: r.entity.name,
    }));

    return { action: 'recommend_anchors', output, citations };
}
