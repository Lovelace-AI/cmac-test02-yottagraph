import { generateGeminiText } from '~/server/utils/gemini';
import { readCollectionCache } from '~/server/utils/collectionCache';
import type {
    CollectionState,
    EntityRecord,
    EventRecord,
    RelationshipRecord,
} from '~/utils/collectionTypes';

type AnswerStepStatus = 'pending' | 'working' | 'completed';

interface AnswerStep {
    step: number;
    status: AnswerStepStatus;
    label: string;
    detail: string;
    durationMs?: number;
}

interface CollectionAnswerRequest {
    action?: string;
    question?: string;
    entityNeid?: string;
    projectId?: string;
}

interface CollectionAnswerResponse {
    output: string;
    citations: Array<{ type: 'entity' | 'event' | 'document'; neid: string; label: string }>;
    generationSource: 'gemini' | 'fallback';
    generationNote?: string;
    agentSteps: AnswerStep[];
    usage?: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costUsd: number;
    };
}

function nowMs(): number {
    return Date.now();
}

function buildInitialSteps(): AnswerStep[] {
    return [
        {
            step: 1,
            status: 'working',
            label: 'Dialogue Agent',
            detail: 'Interpreting the analyst request...',
        },
        {
            step: 2,
            status: 'pending',
            label: 'Context Assembly Agent',
            detail: 'Assembling collection and graph evidence...',
        },
        {
            step: 3,
            status: 'pending',
            label: 'Composition Agent',
            detail: 'Composing a grounded answer...',
        },
    ];
}

function completeStep(steps: AnswerStep[], step: number, startedAt: number): number {
    const current = steps.find((item) => item.step === step);
    if (!current) return startedAt;
    const finishedAt = nowMs();
    current.status = 'completed';
    current.durationMs = Math.max(1, finishedAt - startedAt);
    const next = steps.find((item) => item.step === step + 1);
    if (next) next.status = 'working';
    return finishedAt;
}

function normalizeType(type: string): string {
    return type.replace(/^schema::relationship::/, '').replace(/_/g, ' ');
}

function resolveDate(eventItem: EventRecord): string {
    return eventItem.date ? eventItem.date.slice(0, 10) : 'date not available';
}

function nameByNeid(collection: CollectionState): Map<string, string> {
    const names = new Map<string, string>();
    for (const entity of collection.entities) names.set(entity.neid, entity.name);
    for (const eventItem of collection.events) names.set(eventItem.neid, eventItem.name);
    for (const document of collection.documents) names.set(document.neid, document.title);
    return names;
}

function topRelationshipDetails(
    entity: EntityRecord,
    relationships: RelationshipRecord[],
    names: Map<string, string>
): string[] {
    const related = relationships.filter(
        (relationship) =>
            relationship.sourceNeid === entity.neid || relationship.targetNeid === entity.neid
    );
    const grouped = new Map<string, { count: number; peers: Set<string> }>();
    for (const relationship of related) {
        const type = normalizeType(relationship.type);
        const peerNeid =
            relationship.sourceNeid === entity.neid
                ? relationship.targetNeid
                : relationship.sourceNeid;
        const peerName = names.get(peerNeid) ?? peerNeid;
        const row = grouped.get(type) ?? { count: 0, peers: new Set<string>() };
        row.count += 1;
        row.peers.add(peerName);
        grouped.set(type, row);
    }
    return Array.from(grouped.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4)
        .map(
            ([type, row]) =>
                `${type} (${row.count}): ${Array.from(row.peers).slice(0, 3).join(', ')}`
        );
}

function eventMentionsForEntity(entityNeid: string, events: EventRecord[]): string[] {
    return events
        .filter((eventItem) => eventItem.participantNeids.includes(entityNeid))
        .slice(0, 4)
        .map((eventItem) => `${eventItem.name} (${resolveDate(eventItem)})`);
}

function docsForEntity(entity: EntityRecord, names: Map<string, string>): string[] {
    return entity.sourceDocuments.slice(0, 5).map((docNeid) => names.get(docNeid) ?? docNeid);
}

function normalizePropertyValue(value: unknown): unknown {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        return obj.value ?? value;
    }
    return value;
}

function readEntityPropertyText(entity: EntityRecord, keys: string[]): string {
    const properties = (entity.properties ?? {}) as Record<string, unknown>;
    for (const key of keys) {
        if (!(key in properties)) continue;
        const value = normalizePropertyValue(properties[key]);
        if (value === null || value === undefined) continue;
        const text = String(value).trim();
        if (text) return text;
    }
    return '';
}

function entityRelationshipPropertyDetails(
    entity: EntityRecord,
    relationships: RelationshipRecord[],
    names: Map<string, string>
): string[] {
    return relationships
        .filter(
            (relationship) =>
                relationship.sourceNeid === entity.neid || relationship.targetNeid === entity.neid
        )
        .sort((a, b) => {
            const scoreA = (a.citations?.length ?? 0) + (a.sourceDocumentNeid ? 1 : 0);
            const scoreB = (b.citations?.length ?? 0) + (b.sourceDocumentNeid ? 1 : 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return (b.recordedAt || '').localeCompare(a.recordedAt || '');
        })
        .slice(0, 5)
        .map((relationship) => {
            const inbound = relationship.targetNeid === entity.neid;
            const peerNeid = inbound ? relationship.sourceNeid : relationship.targetNeid;
            const peerName = names.get(peerNeid) ?? peerNeid;
            const relation = normalizeType(relationship.type);
            const date = relationship.recordedAt
                ? ` (${relationship.recordedAt.slice(0, 10)})`
                : '';
            const propertyBits = Object.entries(relationship.properties ?? {})
                .slice(0, 2)
                .map(([key, value]) => `${key}: ${String(normalizePropertyValue(value))}`);
            const propertyText = propertyBits.length ? `; details: ${propertyBits.join(', ')}` : '';
            return `${relation} ${inbound ? 'from' : 'to'} ${peerName}${date}${propertyText}`;
        });
}

function entityEvidenceSnippets(
    entity: EntityRecord,
    relationships: RelationshipRecord[],
    events: EventRecord[]
): string[] {
    const snippets = new Set<string>();
    for (const relationship of relationships) {
        if (relationship.sourceNeid !== entity.neid && relationship.targetNeid !== entity.neid)
            continue;
        for (const citation of relationship.citations ?? []) {
            const text = citation.trim();
            if (text) snippets.add(text);
            if (snippets.size >= 3) break;
        }
        if (snippets.size >= 3) break;
    }
    if (snippets.size < 3) {
        for (const eventItem of events) {
            if (!eventItem.participantNeids.includes(entity.neid)) continue;
            for (const citation of eventItem.citations ?? []) {
                const text = citation.trim();
                if (text) snippets.add(text);
                if (snippets.size >= 3) break;
            }
            if (snippets.size >= 3) break;
        }
    }
    return Array.from(snippets).slice(0, 3);
}

function strictSeedScopedState(collection: CollectionState): {
    entities: EntityRecord[];
    relationships: RelationshipRecord[];
    events: EventRecord[];
} {
    const docSet = new Set(collection.documents.map((document) => document.neid));
    const entities = collection.entities.filter(
        (entity) =>
            entity.origin === 'document' &&
            entity.sourceDocuments.some((docNeid) => docSet.has(docNeid))
    );
    const relationships = collection.relationships.filter(
        (relationship) =>
            relationship.origin === 'document' &&
            ((relationship.sourceDocumentNeid
                ? docSet.has(relationship.sourceDocumentNeid)
                : false) ||
                (relationship.citations?.length ?? 0) > 0)
    );
    const events = collection.events.filter(
        (eventItem) =>
            eventItem.extractedSeed !== false &&
            eventItem.sourceDocuments.some((docNeid) => docSet.has(docNeid))
    );
    return { entities, relationships, events };
}

function topEntities(
    entities: EntityRecord[],
    relationships: RelationshipRecord[],
    events: EventRecord[]
): EntityRecord[] {
    const degree = new Map<string, number>();
    const eventCount = new Map<string, number>();
    for (const relationship of relationships) {
        degree.set(relationship.sourceNeid, (degree.get(relationship.sourceNeid) ?? 0) + 1);
        degree.set(relationship.targetNeid, (degree.get(relationship.targetNeid) ?? 0) + 1);
    }
    for (const eventItem of events) {
        for (const neid of eventItem.participantNeids) {
            eventCount.set(neid, (eventCount.get(neid) ?? 0) + 1);
        }
    }
    return entities
        .slice()
        .sort((a, b) => {
            const scoreA =
                (degree.get(a.neid) ?? 0) * 2 +
                (eventCount.get(a.neid) ?? 0) +
                a.sourceDocuments.length;
            const scoreB =
                (degree.get(b.neid) ?? 0) * 2 +
                (eventCount.get(b.neid) ?? 0) +
                b.sourceDocuments.length;
            if (scoreB !== scoreA) return scoreB - scoreA;
            return a.name.localeCompare(b.name);
        })
        .slice(0, 8);
}

function topEvents(events: EventRecord[]): EventRecord[] {
    return events
        .slice()
        .sort((a, b) => b.participantNeids.length - a.participantNeids.length)
        .slice(0, 6);
}

function parseMaybeJson(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
    const candidates = [trimmed, fenced ?? ''].filter(Boolean);
    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate) as Record<string, unknown>;
        } catch {
            // try next shape
        }
    }
    return null;
}

function extractModelOutput(text: string): string {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim();
    const candidate = fenced || trimmed;
    if (!candidate) return '';
    const parsed = parseMaybeJson(candidate);
    if (parsed && typeof parsed.output === 'string' && parsed.output.trim()) {
        return parsed.output.trim();
    }
    // If model produced plain text instead of JSON, keep that instead of dropping to fallback.
    if (candidate && !candidate.startsWith('{')) return candidate;
    return '';
}

function fallbackResponse(
    action: string,
    question: string,
    entity: EntityRecord | undefined,
    relationships: string[],
    events: string[],
    documents: string[],
    relationshipDetails: string[],
    evidenceSnippets: string[],
    backgroundDescription: string,
    wikipediaUrl: string,
    topEntityRows: Array<{ neid: string; name: string; flavor: string; docs: number }>,
    topEventRows: Array<{ neid: string; name: string; date: string; participants: number }>,
    docCount: number
): string {
    if ((action === 'explain_entity' || action === 'entity_description') && entity) {
        const flavor = entity.flavor.replace(/_/g, ' ');
        const intro = backgroundDescription
            ? `${entity.name} is a ${flavor} in this collection. ${backgroundDescription}`
            : `${entity.name} is a ${flavor} in this collection.`;
        const networkLine = relationshipDetails.length
            ? `${entity.name}'s graph role is anchored by ${relationshipDetails
                  .slice(0, 2)
                  .join(' and ')}.`
            : relationships.length
              ? `The strongest visible links are ${relationships.slice(0, 2).join(' and ')}.`
              : 'Direct relationship detail is limited in the current graph slice.';
        const timelineLine = events.length
            ? `Timeline context includes ${events.slice(0, 2).join('; ')}.`
            : 'No directly linked events are currently surfaced.';
        const evidenceLine = [
            documents.length ? `Evidence is sourced from ${documents.join(', ')}` : '',
            evidenceSnippets.length ? `including citations such as "${evidenceSnippets[0]}"` : '',
            wikipediaUrl ? `and reference context at ${wikipediaUrl}` : '',
        ]
            .filter(Boolean)
            .join(' ')
            .trim();
        return [intro, networkLine, timelineLine, evidenceLine ? `${evidenceLine}.` : '']
            .filter(Boolean)
            .join(' ');
    }
    const topEntities = topEntityRows
        .slice(0, 4)
        .map((row) => `${row.name} (${row.flavor.replace(/_/g, ' ')})`)
        .join(', ');
    const topEvents = topEventRows
        .slice(0, 4)
        .map((row) => `${row.name} (${row.date})`)
        .join('; ');
    const baseline = `${docCount} seed entity${docCount === 1 ? '' : 's'} support this answer context.`;
    if (action === 'answer_question' || action === 'summarize_collection') {
        return [
            baseline,
            topEntities
                ? `Most central entities in the seed-scoped graph: ${topEntities}.`
                : 'No central entities are currently available.',
            topEvents
                ? `Most material seed-backed events: ${topEvents}.`
                : 'No material seed-backed events are currently available.',
            question ? `Analyst focus: ${question}` : '',
        ]
            .filter(Boolean)
            .join(' ');
    }
    if (action === 'lineage_narrative') {
        return [
            baseline,
            topEntities
                ? `Lineage should be interpreted using named organization transitions anchored in seed entities such as ${topEntities}.`
                : 'Lineage context is currently limited because organization anchors are sparse.',
            topEvents
                ? `Relevant timeline anchors include: ${topEvents}.`
                : 'No lineage events are currently linked in the seed-backed timeline.',
        ].join(' ');
    }
    return [
        baseline,
        topEntities ? `Top entities: ${topEntities}.` : 'No entity context is currently available.',
        topEvents ? `Top events: ${topEvents}.` : 'No event context is currently available.',
        question ? `Analyst focus: ${question}` : '',
    ]
        .filter(Boolean)
        .join(' ');
}

export default defineEventHandler(async (event): Promise<CollectionAnswerResponse> => {
    const body = (await readBody<CollectionAnswerRequest>(event)) ?? {};
    const action = String(body.action ?? 'answer_question').trim() || 'answer_question';
    const question = String(body.question ?? '').trim();
    const entityNeid = String(body.entityNeid ?? '').trim() || undefined;
    const projectId = String(body.projectId ?? '').trim() || undefined;

    const cached = await readCollectionCache(projectId);
    const collection = cached.state;
    if (!collection || collection.status !== 'ready') {
        throw createError({
            statusCode: 409,
            statusMessage: 'Collection not ready. Run analysis before asking grounded questions.',
        });
    }

    const steps = buildInitialSteps();
    let startedAt = nowMs();
    startedAt = completeStep(steps, 1, startedAt);

    const scoped = strictSeedScopedState(collection);
    const names = nameByNeid(collection);
    const targetEntity = entityNeid
        ? scoped.entities.find((entity) => entity.neid === entityNeid)
        : undefined;
    const entityRelationshipLines = targetEntity
        ? topRelationshipDetails(targetEntity, scoped.relationships, names)
        : [];
    const entityEventLines = targetEntity
        ? eventMentionsForEntity(targetEntity.neid, scoped.events)
        : [];
    const entityDocLines = targetEntity ? docsForEntity(targetEntity, names) : [];
    const entityRelationshipDetailLines = targetEntity
        ? entityRelationshipPropertyDetails(targetEntity, scoped.relationships, names)
        : [];
    const entityEvidenceSnippetLines = targetEntity
        ? entityEvidenceSnippets(targetEntity, scoped.relationships, scoped.events)
        : [];
    const entityBackgroundDescription = targetEntity
        ? readEntityPropertyText(targetEntity, [
              'description',
              'entity_description',
              'summary',
              'notes',
              'bio',
          ])
        : '';
    const entityWikipediaUrl = targetEntity
        ? readEntityPropertyText(targetEntity, [
              'wikipedia_url',
              'wikipedia',
              'wiki_url',
              'wiki',
              'external_url',
              'url',
          ])
        : '';
    const topEntityRows = topEntities(scoped.entities, scoped.relationships, scoped.events).map(
        (entity) => ({
            neid: entity.neid,
            name: entity.name,
            flavor: entity.flavor,
            docs: entity.sourceDocuments.length,
        })
    );
    const topEventRows = topEvents(scoped.events).map((eventItem) => ({
        neid: eventItem.neid,
        name: eventItem.name,
        date: resolveDate(eventItem),
        participants: eventItem.participantNeids.length,
    }));
    const questionLine =
        question ||
        (action === 'summarize_collection' ? 'Provide a concise executive summary.' : '');

    startedAt = completeStep(steps, 2, startedAt);

    try {
        const generated = await generateGeminiText({
            label: 'collection_answer',
            temperature: 0,
            maxOutputTokens: 1200,
            timeoutMs: 40000,
            retries: 2,
            systemInstruction:
                'You are Ask Yotta. Answer with collection-grounded evidence only. Be specific: name relationships, events, and seed entitys when available. Never claim tools are unavailable. Do not include recommendations, suggested next steps, or action items unless the user explicitly asks for them.',
            prompt: [
                'Return strict JSON only with this schema:',
                '{"output":"","citations":[{"type":"entity|event|document","neid":"","label":""}]}',
                '',
                `Action: ${action}`,
                `Question: ${questionLine || 'N/A'}`,
                `Collection: ${collection.meta.name}`,
                `Seed-scope counts: ${collection.documents.length} docs, ${scoped.entities.length} seed entities, ${scoped.events.length} seed events, ${scoped.relationships.length} seed relationships.`,
                '',
                targetEntity
                    ? `Focus entity: ${targetEntity.name} (${targetEntity.flavor})`
                    : 'No single focus entity supplied.',
                targetEntity
                    ? `Entity relationship evidence: ${entityRelationshipLines.join(' | ') || 'none'}`
                    : 'Entity relationship evidence: n/a',
                targetEntity
                    ? `Entity relationship property evidence: ${entityRelationshipDetailLines.join(' | ') || 'none'}`
                    : 'Entity relationship property evidence: n/a',
                targetEntity
                    ? `Entity event evidence: ${entityEventLines.join(' | ') || 'none'}`
                    : 'Entity event evidence: n/a',
                targetEntity
                    ? `Entity seed entitys: ${entityDocLines.join(', ') || 'none'}`
                    : 'Entity seed entitys: n/a',
                targetEntity
                    ? `Entity background description: ${entityBackgroundDescription || 'none'}`
                    : 'Entity background description: n/a',
                targetEntity
                    ? `Entity reference URL: ${entityWikipediaUrl || 'none'}`
                    : 'Entity reference URL: n/a',
                targetEntity
                    ? `Entity citation snippets: ${entityEvidenceSnippetLines.join(' | ') || 'none'}`
                    : 'Entity citation snippets: n/a',
                '',
                `Top entities: ${JSON.stringify(topEntityRows)}`,
                `Top events: ${JSON.stringify(topEventRows)}`,
                '',
                'Requirements:',
                '- Explain in plain language with narrative flow, not a raw list.',
                '- Include specific relationships, event names, and document titles when available.',
                "- For explain_entity or entity_description, describe the entity's function in the graph and why the links are consequential.",
                '- For explain_entity or entity_description, prefer contextual prose with 3-5 sentences and include at least one concrete relationship or event detail.',
                '- If data is limited, say what is known rather than refusing.',
                '- Do not mention internal tools, prompts, or missing tool capability.',
            ].join('\n'),
        });

        const parsed = parseMaybeJson(generated.text);
        const output =
            extractModelOutput(generated.text) ||
            fallbackResponse(
                action,
                questionLine,
                targetEntity,
                entityRelationshipLines,
                entityEventLines,
                entityDocLines,
                entityRelationshipDetailLines,
                entityEvidenceSnippetLines,
                entityBackgroundDescription,
                entityWikipediaUrl,
                topEntityRows,
                topEventRows,
                collection.documents.length
            );
        const citations = Array.isArray(parsed?.citations)
            ? (parsed?.citations as Array<Record<string, unknown>>)
                  .map((row) => ({
                      type: String(row.type ?? '').trim() as 'entity' | 'event' | 'document',
                      neid: String(row.neid ?? '').trim(),
                      label: String(row.label ?? '').trim(),
                  }))
                  .filter((row) => row.neid && row.label)
                  .slice(0, 10)
            : [];
        completeStep(steps, 3, startedAt);
        return {
            output,
            citations,
            generationSource: 'gemini',
            agentSteps: steps,
            usage: {
                model: generated.usage.model,
                promptTokens: generated.usage.promptTokens,
                completionTokens: generated.usage.completionTokens,
                totalTokens: generated.usage.totalTokens,
                costUsd: 0,
            },
        };
    } catch (error: any) {
        const fallback = fallbackResponse(
            action,
            questionLine,
            targetEntity,
            entityRelationshipLines,
            entityEventLines,
            entityDocLines,
            entityRelationshipDetailLines,
            entityEvidenceSnippetLines,
            entityBackgroundDescription,
            entityWikipediaUrl,
            topEntityRows,
            topEventRows,
            collection.documents.length
        );
        completeStep(steps, 3, startedAt);
        return {
            output: fallback,
            citations: [],
            generationSource: 'fallback',
            generationNote:
                error?.data?.statusMessage ||
                error?.message ||
                'Gemini composition failed; returned deterministic fallback.',
            agentSteps: steps,
        };
    }
});
