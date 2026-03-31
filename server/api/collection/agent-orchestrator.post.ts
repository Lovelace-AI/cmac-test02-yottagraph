import { readCollectionCache } from '~/server/utils/collectionCache';
import {
    callAgentQuery,
    parseAgentJson,
    resolveAskYottaAgentIds,
} from '~/server/utils/agentGateway';
import type {
    AskYottaPipelineResponse,
    CompositionAgentInput,
    CompositionAgentOutput,
    ContextAgentOutput,
    PlanningAgentInput,
    PlanningAgentOutput,
    AgentPipelineStep,
} from '~/utils/agentPipeline';
import {
    seedAskYottaPipelineSteps,
    summarizeCollection,
    toContextEntityRow,
    toContextEventRow,
    toContextRelationshipRow,
} from '~/utils/agentPipeline';
import type {
    CollectionState,
    EntityRecord,
    EventRecord,
    RelationshipRecord,
} from '~/utils/collectionTypes';

interface AskYottaRequest {
    action?: string;
    question?: string;
    entityNeid?: string;
}

function deterministicFallbackText(args: {
    action: string;
    question: string;
    context: ContextAgentOutput;
}): string {
    const topEntities = args.context.topEntities
        .slice(0, 4)
        .map((row) => `${row.name} (${row.flavor.replace(/_/g, ' ')})`)
        .join(', ');
    const topEvents = args.context.topEvents
        .slice(0, 4)
        .map((row) => `${row.name} (${row.date})`)
        .join('; ');
    const baseline = `${args.context.stats.documentCount} source document${
        args.context.stats.documentCount === 1 ? '' : 's'
    } support this answer context.`;
    if (args.action === 'explain_entity' && args.context.focusEntity) {
        return [
            `${args.context.focusEntity.name} is a ${
                args.context.focusEntity.flavor
            } in this collection.`,
            baseline,
            topEvents ? `Linked events: ${topEvents}.` : 'No linked events were identified.',
            `Analyst focus: ${args.question}`,
        ].join(' ');
    }
    return [
        baseline,
        topEntities
            ? `Most central entities in the document graph: ${topEntities}.`
            : 'No central entities are currently available.',
        topEvents
            ? `Most material document-backed events: ${topEvents}.`
            : 'No material document-backed events are currently available.',
        args.question ? `Analyst focus: ${args.question}` : '',
    ]
        .filter(Boolean)
        .join(' ');
}

function nowMs(): number {
    return Date.now();
}

function completeStep(steps: AgentPipelineStep[], step: number, startedAt: number): number {
    const current = steps.find((item) => item.step === step);
    if (!current) return startedAt;
    const finishedAt = nowMs();
    current.status = 'completed';
    current.durationMs = Math.max(1, finishedAt - startedAt);
    const next = steps.find((item) => item.step === step + 1);
    if (next) next.status = 'working';
    return finishedAt;
}

function documentScopedState(collection: CollectionState): {
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

function contextFallbackBundle(
    collection: CollectionState,
    action: string,
    question: string,
    entityNeid?: string
): ContextAgentOutput {
    const scoped = documentScopedState(collection);
    const topEntityRows = topEntities(scoped.entities, scoped.relationships, scoped.events).map(
        (entity) => toContextEntityRow(entity)
    );
    const topEventRows = topEvents(scoped.events).map((eventItem) => toContextEventRow(eventItem));
    const targetEntity = entityNeid
        ? scoped.entities.find((entity) => entity.neid === entityNeid)
        : null;
    const relationshipRows = scoped.relationships
        .slice(0, 20)
        .map((relationship) => toContextRelationshipRow(relationship));
    const evidenceLines = [
        `${collection.documents.length} source documents`,
        `${scoped.entities.length} document entities`,
        `${scoped.events.length} document events`,
        `${scoped.relationships.length} document relationships`,
        targetEntity
            ? `Focus entity: ${targetEntity.name} (${targetEntity.flavor})`
            : 'No focus entity',
        `Action: ${action}`,
    ];
    return {
        collectionName: collection.meta.name,
        question,
        focusEntity: targetEntity ? toContextEntityRow(targetEntity) : undefined,
        topEntities: topEntityRows,
        topEvents: topEventRows,
        relationships: relationshipRows,
        evidenceLines,
        stats: {
            documentCount: collection.documents.length,
            entityCount: scoped.entities.length,
            eventCount: scoped.events.length,
            relationshipCount: scoped.relationships.length,
        },
    };
}

function sanitizeCitations(input: unknown): AskYottaPipelineResponse['citations'] {
    if (!Array.isArray(input)) return [];
    return input
        .map((row) => ({
            type: String((row as any)?.type ?? '').trim() as
                | 'entity'
                | 'event'
                | 'document'
                | 'relationship',
            neid: String((row as any)?.neid ?? '').trim(),
            label: String((row as any)?.label ?? '').trim(),
        }))
        .filter((row) => row.neid && row.label)
        .slice(0, 20);
}

function buildPlanningPrompt(input: PlanningAgentInput): string {
    return ['Return strict JSON only.', JSON.stringify(input)].join('\n');
}

function buildContextPrompt(input: {
    action: string;
    question: string;
    plan: PlanningAgentOutput;
    fallbackContext: ContextAgentOutput;
}): string {
    return ['Return strict JSON only with the context bundle schema.', JSON.stringify(input)].join(
        '\n'
    );
}

function buildCompositionPrompt(input: CompositionAgentInput): string {
    return ['Return strict JSON only.', JSON.stringify(input)].join('\n');
}

export default defineEventHandler(async (event): Promise<AskYottaPipelineResponse> => {
    const body = (await readBody<AskYottaRequest>(event)) ?? {};
    const action = String(body.action ?? 'answer_question').trim() || 'answer_question';
    const question = String(body.question ?? '').trim() || 'Provide a grounded answer.';
    const entityNeid = String(body.entityNeid ?? '').trim() || undefined;

    const cached = await readCollectionCache();
    const collection = cached.state;
    if (!collection || collection.status !== 'ready') {
        const stepSeed = seedAskYottaPipelineSteps().map((step) => ({
            ...step,
            status: 'completed' as const,
        }));
        return {
            output: 'Collection analysis is not ready yet. Run Initial Analysis first, then ask again for a grounded answer with entities, events, and relationships.',
            citations: [],
            generationSource: 'fallback',
            generationNote: 'Returned pre-analysis fallback because collection state is not ready.',
            agentSteps: stepSeed,
        };
    }

    const agentIds = await resolveAskYottaAgentIds();
    if (!agentIds.planningAgentId || !agentIds.contextAgentId || !agentIds.compositionAgentId) {
        const fallback = await $fetch<AskYottaPipelineResponse>('/api/collection/answer', {
            method: 'POST',
            body: { action, question, entityNeid },
        });
        return {
            ...fallback,
            generationNote:
                fallback.generationNote ||
                'Agent trio is not fully deployed/configured; served response from fallback route.',
        };
    }

    const steps = seedAskYottaPipelineSteps();
    let startedAt = nowMs();

    try {
        const planningInput: PlanningAgentInput = {
            action,
            question,
            entityNeid,
            collection: summarizeCollection(collection),
        };
        const planningResult = await callAgentQuery({
            agentId: agentIds.planningAgentId,
            message: buildPlanningPrompt(planningInput),
        });
        const planning =
            parseAgentJson<PlanningAgentOutput>(planningResult.text) ??
            ({
                intent: action,
                answerStyle: 'qa',
                focusEntityNeids: entityNeid ? [entityNeid] : [],
                requestedEvidence: ['top entities', 'top events', 'top relationships'],
            } as PlanningAgentOutput);
        startedAt = completeStep(steps, 1, startedAt);

        const fallbackContext = contextFallbackBundle(collection, action, question, entityNeid);
        const contextResult = await callAgentQuery({
            agentId: agentIds.contextAgentId,
            message: buildContextPrompt({
                action,
                question,
                plan: planning,
                fallbackContext,
            }),
        });
        const context = parseAgentJson<ContextAgentOutput>(contextResult.text) ?? fallbackContext;
        startedAt = completeStep(steps, 2, startedAt);

        const compositionInput: CompositionAgentInput = {
            action,
            question,
            plan: planning,
            context,
        };
        const compositionResult = await callAgentQuery({
            agentId: agentIds.compositionAgentId,
            message: buildCompositionPrompt(compositionInput),
        });
        const composition = parseAgentJson<CompositionAgentOutput>(compositionResult.text);
        const output = String(composition?.output ?? compositionResult.text ?? '').trim();
        const citations = sanitizeCitations(composition?.citations);
        completeStep(steps, 3, startedAt);

        if (!output || /^agent returned no text response\.?$/i.test(output)) {
            try {
                const fallback = await $fetch<AskYottaPipelineResponse>('/api/collection/answer', {
                    method: 'POST',
                    body: { action, question, entityNeid },
                });
                return {
                    ...fallback,
                    agentSteps: steps,
                    generationNote:
                        fallback.generationNote ||
                        'Composition agent returned empty text; served deterministic fallback answer.',
                };
            } catch {
                const fallbackContext = contextFallbackBundle(
                    collection,
                    action,
                    question,
                    entityNeid
                );
                return {
                    output: deterministicFallbackText({
                        action,
                        question,
                        context: fallbackContext,
                    }),
                    citations: [],
                    generationSource: 'fallback',
                    generationNote:
                        'Composition agent returned empty text and fallback route was unavailable; served local deterministic answer.',
                    agentSteps: steps,
                };
            }
        }

        return {
            output: output || 'No response returned from composition agent.',
            citations,
            generationSource: 'gateway',
            agentSteps: steps,
        };
    } catch (error: any) {
        const fallback = await $fetch<AskYottaPipelineResponse>('/api/collection/answer', {
            method: 'POST',
            body: { action, question, entityNeid },
        });
        return {
            ...fallback,
            generationNote:
                error?.data?.statusMessage ||
                error?.message ||
                fallback.generationNote ||
                'Three-agent orchestration failed; served response from fallback route.',
        };
    }
});
