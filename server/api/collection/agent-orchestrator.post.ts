import { readCollectionCache } from '~/server/utils/collectionCache';
import {
    callAgentQuery,
    parseAgentJson,
    resolveAskYottaAgentIds,
} from '~/server/utils/agentGateway';
import type {
    AskYottaHistoryTurn,
    AskYottaPipelineResponse,
    AgentRunDetails,
    CompositionAgentInput,
    CompositionAgentOutput,
    ContextAgentOutput,
    ContextProfileEvidenceRow,
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
    conversationHistory?: AskYottaHistoryTurn[];
}

const NEID_LIKE_RE = /^\d{1,20}$/;
const NEID_RE = /^\d{20}$/;

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
    if (args.context.answerStyle === 'risk_gaps') {
        return [
            baseline,
            args.context.evidenceLines
                .filter((line) =>
                    /coverage score|evidence-backed|inferred|grounding|sparse/i.test(line)
                )
                .slice(0, 4)
                .join(' '),
            `Analyst focus: ${args.question}`,
        ]
            .filter(Boolean)
            .join(' ');
    }
    if (args.context.answerStyle === 'executive_summary') {
        return [
            baseline,
            topEntities
                ? `This collection centers on the following entities and instruments: ${topEntities}.`
                : 'This collection has limited entity grounding.',
            topEvents
                ? `Key milestones include ${topEvents}.`
                : 'No major document-backed milestones were identified.',
            'The available evidence suggests these documents describe a connected financial process rather than isolated records.',
        ]
            .filter(Boolean)
            .join(' ');
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

function sanitizeConversationHistory(input: unknown): AskYottaHistoryTurn[] {
    if (!Array.isArray(input)) return [];
    return input
        .map((row) => ({
            role: (row as any)?.role === 'assistant' ? 'assistant' : 'user',
            text: String((row as any)?.text ?? '').trim(),
        }))
        .filter((row) => row.text)
        .slice(-6);
}

function isBriefingQuestion(action: string, question: string): boolean {
    if (action === 'summarize_collection') return true;
    const lowered = question.toLowerCase();
    return [
        'brief',
        'summary',
        'summarize',
        'plain english',
        'what is this collection about',
        'executive insight',
        'briefing',
    ].some((token) => lowered.includes(token));
}

function isGapQuestion(question: string): boolean {
    const lowered = question.toLowerCase();
    return [
        'thin',
        'incomplete',
        'gap',
        'missing',
        'uncertain',
        'weak evidence',
        'inferred',
        'source-backed',
        'coverage',
    ].some((token) => lowered.includes(token));
}

function inferAnswerStyle(action: string, question: string): PlanningAgentOutput['answerStyle'] {
    if (action === 'explain_entity') return 'entity_explanation';
    if (isGapQuestion(question)) return 'risk_gaps';
    if (isBriefingQuestion(action, question)) return 'executive_summary';
    if (question.toLowerCase().includes('timeline')) return 'timeline_analysis';
    return 'qa';
}

function defaultRequestedEvidence(answerStyle: PlanningAgentOutput['answerStyle']): string[] {
    if (answerStyle === 'risk_gaps') {
        return [
            'coverage metrics and evidence-backed ratios',
            'inferred versus source-backed relationship examples',
            'property-history coverage or missingness',
            'high-impact entities or events with sparse grounding',
        ];
    }
    if (answerStyle === 'executive_summary') {
        return [
            'core process or deal narrative',
            'most consequential entities and role relationships',
            'milestone events and why they matter',
            'uncertainty notes when evidence is thin',
        ];
    }
    if (answerStyle === 'timeline_analysis') {
        return ['chronological milestone events', 'date-backed evidence', 'major state changes'];
    }
    if (answerStyle === 'entity_explanation') {
        return [
            'focus entity profile',
            'key relationships',
            'linked events',
            'supporting evidence',
        ];
    }
    return ['top entities', 'top events', 'top relationships'];
}

function normalizePlanningOutput(args: {
    action: string;
    question: string;
    entityNeid?: string;
    candidate?: PlanningAgentOutput | null;
}): PlanningAgentOutput {
    const inferredStyle = inferAnswerStyle(args.action, args.question);
    const rawStyle = args.candidate?.answerStyle;
    const answerStyle =
        rawStyle && rawStyle !== 'qa'
            ? rawStyle
            : inferredStyle === 'qa'
              ? rawStyle || 'qa'
              : inferredStyle;
    const requestedEvidence = Array.isArray(args.candidate?.requestedEvidence)
        ? args
              .candidate!.requestedEvidence.map((value) => String(value ?? '').trim())
              .filter(Boolean)
              .slice(0, 6)
        : [];
    const focusEntityNeids = Array.isArray(args.candidate?.focusEntityNeids)
        ? args
              .candidate!.focusEntityNeids.map((value) => normalizeNeid(value))
              .filter((value) => NEID_RE.test(value))
              .slice(0, 6)
        : [];
    if (
        args.entityNeid &&
        isValidNeid(args.entityNeid) &&
        !focusEntityNeids.includes(args.entityNeid)
    ) {
        focusEntityNeids.unshift(normalizeNeid(args.entityNeid));
    }
    return {
        intent: String(args.candidate?.intent ?? '').trim() || args.action,
        answerStyle,
        focusEntityNeids,
        requestedEvidence:
            requestedEvidence.length > 0
                ? requestedEvidence
                : defaultRequestedEvidence(answerStyle),
        confidenceNote: String(args.candidate?.confidenceNote ?? '').trim() || undefined,
    };
}

function coverageEvidenceLines(
    collection: CollectionState,
    scoped: ReturnType<typeof documentScopedState>
): string[] {
    const evidenceBackedRelationships = scoped.relationships.filter(
        (relationship) =>
            Boolean(relationship.sourceDocumentNeid) || (relationship.citations?.length ?? 0) > 0
    ).length;
    const inferredRelationships = Math.max(
        0,
        scoped.relationships.length - evidenceBackedRelationships
    );
    const sourceBackedEntities = scoped.entities.filter(
        (entity) => Array.isArray(entity.sourceDocuments) && entity.sourceDocuments.length > 0
    ).length;
    const totalEntities = Math.max(scoped.entities.length, 1);
    const sourceCoverageShare = Math.round((sourceBackedEntities / totalEntities) * 100);
    const coverageScore = Math.round(
        (sourceBackedEntities / totalEntities) * 60 +
            (scoped.relationships.length > 0
                ? (evidenceBackedRelationships / scoped.relationships.length) * 40
                : 20)
    );
    const notes = [
        `Coverage score ${coverageScore}/100 based on source-backed entities and relationships.`,
        `${evidenceBackedRelationships} evidence-backed relationships versus ${inferredRelationships} inferred relationships.`,
        `${sourceBackedEntities} of ${scoped.entities.length} document entities have direct source-document grounding (${sourceCoverageShare}%).`,
    ];
    if (collection.propertySeries.length === 0) {
        notes.push(
            'Historical property-series coverage is sparse or unavailable in the current collection cache.'
        );
    }
    if (inferredRelationships > evidenceBackedRelationships) {
        notes.push('Inferred relationships currently outnumber source-backed relationships.');
    }
    return notes;
}

function relationshipEvidenceLines(
    scoped: ReturnType<typeof documentScopedState>,
    topEntityRows: ReturnType<typeof toContextEntityRow>[]
): string[] {
    const entityNames = new Map(topEntityRows.map((row) => [row.neid, row.name]));
    return scoped.relationships.slice(0, 8).map((relationship) => {
        const source = entityNames.get(relationship.sourceNeid) || relationship.sourceNeid;
        const target = entityNames.get(relationship.targetNeid) || relationship.targetNeid;
        return `${source} --${relationship.type.replace(/^schema::relationship::/, '')}--> ${target}`;
    });
}

function eventEvidenceLines(events: EventRecord[]): string[] {
    return topEvents(events).map(
        (eventItem) =>
            `${eventItem.name} (${eventItem.date ? eventItem.date.slice(0, 10) : 'date not available'}) with ${eventItem.participantNeids.length} participants`
    );
}

function historyEvidenceLines(history: AskYottaHistoryTurn[]): string[] {
    if (!history.length) return [];
    return history
        .slice(-4)
        .map(
            (turn) =>
                `${turn.role === 'assistant' ? 'Prior answer' : 'Prior question'}: ${turn.text}`
        )
        .slice(0, 4);
}

function contextFallbackBundle(
    collection: CollectionState,
    action: string,
    question: string,
    entityNeid?: string,
    answerStyle?: PlanningAgentOutput['answerStyle'],
    conversationHistory: AskYottaHistoryTurn[] = []
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
        `Answer style: ${answerStyle || inferAnswerStyle(action, question)}`,
        ...coverageEvidenceLines(collection, scoped),
        ...relationshipEvidenceLines(scoped, topEntityRows),
        ...eventEvidenceLines(scoped.events),
        ...historyEvidenceLines(conversationHistory),
    ];
    return {
        collectionName: collection.meta.name,
        question,
        answerStyle: answerStyle || inferAnswerStyle(action, question),
        focusEntity: targetEntity ? toContextEntityRow(targetEntity) : undefined,
        topEntities: topEntityRows,
        topEvents: topEventRows,
        relationships: relationshipRows,
        evidenceLines: Array.from(new Set(evidenceLines.filter(Boolean))).slice(0, 40),
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

function normalizeNeid(input: unknown): string {
    const raw = String(input ?? '').trim();
    if (!NEID_LIKE_RE.test(raw)) return '';
    return raw.padStart(20, '0');
}

function isValidNeid(input: unknown): boolean {
    return NEID_RE.test(normalizeNeid(input));
}

function sanitizeEntityRow(input: unknown) {
    const neid = normalizeNeid((input as any)?.neid);
    if (!NEID_RE.test(neid)) return null;
    const name = String((input as any)?.name ?? '').trim();
    const flavor = String((input as any)?.flavor ?? '').trim();
    const docs = Number((input as any)?.docs);
    return {
        neid,
        name: name || `Entity ${neid}`,
        flavor: flavor || 'unknown',
        docs: Number.isFinite(docs) ? Math.max(0, Math.trunc(docs)) : 0,
    };
}

function sanitizeEventRow(input: unknown) {
    const neid = normalizeNeid((input as any)?.neid);
    if (!NEID_RE.test(neid)) return null;
    const name = String((input as any)?.name ?? '').trim() || `Event ${neid}`;
    const date = String((input as any)?.date ?? '').trim() || 'date not available';
    const participants = Number((input as any)?.participants);
    return {
        neid,
        name,
        date,
        participants: Number.isFinite(participants) ? Math.max(0, Math.trunc(participants)) : 0,
    };
}

function sanitizeRelationshipRow(input: unknown) {
    const type = String((input as any)?.type ?? '').trim();
    const sourceNeid = normalizeNeid((input as any)?.sourceNeid);
    const targetNeid = normalizeNeid((input as any)?.targetNeid);
    if (!type || !NEID_RE.test(sourceNeid) || !NEID_RE.test(targetNeid)) return null;
    const sourceDocumentNeidRaw = String((input as any)?.sourceDocumentNeid ?? '').trim();
    const sourceDocumentNeid = isValidNeid(sourceDocumentNeidRaw)
        ? normalizeNeid(sourceDocumentNeidRaw)
        : undefined;
    return {
        type,
        sourceNeid,
        targetNeid,
        sourceDocumentNeid,
    };
}

function sanitizeProfileEvidenceRow(input: unknown): ContextProfileEvidenceRow | null {
    const neid = normalizeNeid((input as any)?.neid);
    if (!NEID_RE.test(neid)) return null;
    const name = String((input as any)?.name ?? '').trim();
    const flavor = String((input as any)?.flavor ?? '').trim();
    const resolutionRaw = String((input as any)?.resolution ?? '').trim();
    const resolution = resolutionRaw === 'provided_neid' ? 'provided_neid' : 'name_search';
    const propertiesInput = (input as any)?.properties;
    const propertyEntries = Object.entries(
        propertiesInput && typeof propertiesInput === 'object' ? propertiesInput : {}
    )
        .map(([key, values]) => {
            const propName = String(key ?? '').trim();
            if (!propName) return null;
            const normalizedValues = Array.isArray(values)
                ? values
                      .map((value) => String(value ?? '').trim())
                      .filter(Boolean)
                      .slice(0, 10)
                : [];
            return normalizedValues.length > 0 ? [propName, normalizedValues] : null;
        })
        .filter((row): row is [string, string[]] => Array.isArray(row));
    const missingProperties = Array.isArray((input as any)?.missingProperties)
        ? (input as any).missingProperties
              .map((value: unknown) => String(value ?? '').trim())
              .filter(Boolean)
              .slice(0, 40)
        : [];

    return {
        neid,
        name: name || `Entity ${neid}`,
        flavor: flavor || 'unknown',
        resolution,
        properties: Object.fromEntries(propertyEntries),
        missingProperties,
    };
}

function mergeContextOutput(
    fallback: ContextAgentOutput,
    candidate: ContextAgentOutput | null | undefined
): ContextAgentOutput {
    if (!candidate || typeof candidate !== 'object') return fallback;

    const fallbackEntities = fallback.topEntities.map(sanitizeEntityRow).filter(Boolean);
    const candidateEntities = (Array.isArray(candidate.topEntities) ? candidate.topEntities : [])
        .map(sanitizeEntityRow)
        .filter(Boolean);
    const entityByNeid = new Map(fallbackEntities.map((row) => [row!.neid, row!]));
    for (const row of candidateEntities) {
        if (!row) continue;
        const existing = entityByNeid.get(row.neid);
        entityByNeid.set(row.neid, {
            neid: row.neid,
            name: existing?.name || row.name,
            flavor: existing?.flavor || row.flavor,
            docs: Math.max(existing?.docs ?? 0, row.docs),
        });
    }
    const topEntities = Array.from(entityByNeid.values()).slice(0, 12);
    const knownEntityNeids = new Set([
        ...topEntities.map((row) => row.neid),
        ...(fallback.focusEntity ? [fallback.focusEntity.neid] : []),
    ]);

    const fallbackEvents = fallback.topEvents.map(sanitizeEventRow).filter(Boolean);
    const candidateEvents = (Array.isArray(candidate.topEvents) ? candidate.topEvents : [])
        .map(sanitizeEventRow)
        .filter(Boolean);
    const eventByNeid = new Map(fallbackEvents.map((row) => [row!.neid, row!]));
    for (const row of candidateEvents) {
        if (!row) continue;
        if (!eventByNeid.has(row.neid)) eventByNeid.set(row.neid, row);
    }
    const topEvents = Array.from(eventByNeid.values()).slice(0, 10);

    const fallbackRelationships = fallback.relationships
        .map(sanitizeRelationshipRow)
        .filter(Boolean)
        .filter(
            (row) =>
                row && knownEntityNeids.has(row.sourceNeid) && knownEntityNeids.has(row.targetNeid)
        );
    const candidateRelationships = (
        Array.isArray(candidate.relationships) ? candidate.relationships : []
    )
        .map(sanitizeRelationshipRow)
        .filter(Boolean)
        .filter(
            (row) =>
                row && knownEntityNeids.has(row.sourceNeid) && knownEntityNeids.has(row.targetNeid)
        );
    const relationshipByKey = new Map(
        fallbackRelationships.map((row) => [
            `${row!.type}|${row!.sourceNeid}|${row!.targetNeid}`,
            row!,
        ])
    );
    for (const row of candidateRelationships) {
        if (!row) continue;
        const key = `${row.type}|${row.sourceNeid}|${row.targetNeid}`;
        if (!relationshipByKey.has(key)) relationshipByKey.set(key, row);
    }
    const relationships = Array.from(relationshipByKey.values()).slice(0, 30);

    const fallbackFocus = sanitizeEntityRow(fallback.focusEntity);
    const candidateFocus = sanitizeEntityRow(candidate.focusEntity);
    const focusEntity =
        candidateFocus && knownEntityNeids.has(candidateFocus.neid)
            ? candidateFocus
            : fallbackFocus || undefined;

    const candidateEvidenceLines = Array.isArray(candidate.evidenceLines)
        ? candidate.evidenceLines
              .map((line) => String(line ?? '').trim())
              .filter(Boolean)
              .slice(0, 20)
        : [];
    const evidenceLines = Array.from(
        new Set([
            ...fallback.evidenceLines.map((line) => String(line ?? '').trim()).filter(Boolean),
            ...candidateEvidenceLines,
        ])
    ).slice(0, 40);

    const candidateProfiles = Array.isArray(candidate.profileEvidence)
        ? candidate.profileEvidence.map(sanitizeProfileEvidenceRow).filter(Boolean)
        : [];
    const profileEvidence = candidateProfiles
        .filter(
            (row) => row && (knownEntityNeids.has(row.neid) || row.resolution === 'provided_neid')
        )
        .slice(0, 12);

    return {
        collectionName: fallback.collectionName,
        question: fallback.question,
        answerStyle: candidate.answerStyle || fallback.answerStyle,
        focusEntity,
        topEntities,
        topEvents,
        relationships,
        profileEvidence: profileEvidence.length > 0 ? profileEvidence : undefined,
        evidenceLines,
        stats: {
            documentCount: fallback.stats.documentCount,
            entityCount: fallback.stats.entityCount,
            eventCount: fallback.stats.eventCount,
            relationshipCount: fallback.stats.relationshipCount,
        },
    };
}

function buildPlanningPrompt(input: PlanningAgentInput): string {
    return [
        'Return strict JSON only.',
        'Map explain_entity requests to answerStyle "entity_explanation".',
        'Map summarize_collection and broad briefing requests to answerStyle "executive_summary".',
        'Map questions about thin, weak, missing, inferred, or incomplete evidence to answerStyle "risk_gaps".',
        'Prefer evidence-oriented styles over generic qa when the action is specific.',
        'Do not fall back to qa for summarization or evidence-gap questions unless the request is truly ambiguous.',
        'Use conversationHistory only for continuity; the latest question should govern the plan.',
        JSON.stringify(input),
    ].join('\n');
}

function buildContextPrompt(input: {
    action: string;
    question: string;
    plan: PlanningAgentOutput;
    fallbackContext: ContextAgentOutput;
    conversationHistory: AskYottaHistoryTurn[];
}): string {
    return [
        'Return strict JSON only with the context bundle schema.',
        'Treat fallbackContext as authoritative for collection-grounded entities/events/relationships and stats.',
        'Add profileEvidence only from tool-grounded scalar retrieval, and prefer provided NEIDs over name re-resolution whenever possible.',
        'For executive_summary, prioritize narrative-ready evidence: core process, consequential entities, role relationships, milestone events, and uncertainty notes.',
        'For risk_gaps, prioritize coverage signals, sparse grounding, inferred links, and concrete examples of what is well-supported versus weakly supported.',
        'Do not respond with frequency-ranked entities/events alone when the user asked for a brief.',
        JSON.stringify(input),
    ].join('\n');
}

function buildCompositionPrompt(input: CompositionAgentInput): string {
    return [
        'Return strict JSON only.',
        'Write concise narrative prose, not a bullet list of fields.',
        'For explain_entity, explain the entities purpose in the graph, how relationships/events connect it, and why those links matter in collection context.',
        'For executive_summary, give a short brief with a through-line: what the collection is about, which actors and instruments matter most, what the major milestones are, and why they matter. Do not merely enumerate entities or dates.',
        'For risk_gaps, distinguish what is strongly supported, what is weakly supported, and what appears missing or incomplete.',
        'Prefer concrete relationship/event/property details when present in context.evidenceLines, context.relationships, or context.profileEvidence.',
        'Use conversationHistory only to maintain continuity for follow-up questions.',
        JSON.stringify(input),
    ].join('\n');
}

function sseEvent(eventType: string, data: unknown): string {
    return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

export default defineEventHandler(async (event) => {
    const body = (await readBody<AskYottaRequest>(event)) ?? {};
    const action = String(body.action ?? 'answer_question').trim() || 'answer_question';
    const question = String(body.question ?? '').trim() || 'Provide a grounded answer.';
    const entityNeid = String(body.entityNeid ?? '').trim() || undefined;
    const conversationHistory = sanitizeConversationHistory(body.conversationHistory);

    const cached = await readCollectionCache();
    const collection = cached.state;
    if (!collection || collection.status !== 'ready') {
        const stepSeed = seedAskYottaPipelineSteps().map((step) => ({
            ...step,
            status: 'completed' as const,
        }));
        setResponseHeader(event, 'Content-Type', 'text/event-stream');
        setResponseHeader(event, 'Cache-Control', 'no-cache');
        setResponseHeader(event, 'Connection', 'keep-alive');
        const result: AskYottaPipelineResponse = {
            output: 'Collection analysis is not ready yet. Run Initial Analysis first, then ask again for a grounded answer with entities, events, and relationships.',
            citations: [],
            generationSource: 'fallback',
            generationNote: 'Returned pre-analysis fallback because collection state is not ready.',
            agentSteps: stepSeed,
            evidenceLines: conversationHistory.length
                ? historyEvidenceLines(conversationHistory)
                : ['Collection analysis is not ready yet.'],
        };
        return sseEvent('result', result) + sseEvent('done', {});
    }

    const agentIds = await resolveAskYottaAgentIds();
    if (!agentIds.planningAgentId || !agentIds.contextAgentId || !agentIds.compositionAgentId) {
        setResponseHeader(event, 'Content-Type', 'text/event-stream');
        setResponseHeader(event, 'Cache-Control', 'no-cache');
        setResponseHeader(event, 'Connection', 'keep-alive');
        const fallback = await $fetch<AskYottaPipelineResponse>('/api/collection/answer', {
            method: 'POST',
            body: { action, question, entityNeid },
        });
        const result: AskYottaPipelineResponse = {
            ...fallback,
            generationNote:
                fallback.generationNote ||
                'Agent trio is not fully deployed/configured; served response from fallback route.',
            evidenceLines: fallback.evidenceLines ?? historyEvidenceLines(conversationHistory),
        };
        return sseEvent('result', result) + sseEvent('done', {});
    }

    setResponseHeader(event, 'Content-Type', 'text/event-stream');
    setResponseHeader(event, 'Cache-Control', 'no-cache');
    setResponseHeader(event, 'Connection', 'keep-alive');

    const steps = seedAskYottaPipelineSteps();
    let startedAt = nowMs();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (eventType: string, data: unknown) => {
                controller.enqueue(new TextEncoder().encode(sseEvent(eventType, data)));
            };

            send('steps', steps);

            try {
                const planningInput: PlanningAgentInput = {
                    action,
                    question,
                    entityNeid,
                    conversationHistory,
                    collection: summarizeCollection(collection),
                };
                const planningResult = await callAgentQuery({
                    agentId: agentIds.planningAgentId!,
                    message: buildPlanningPrompt(planningInput),
                });
                const planning = normalizePlanningOutput({
                    action,
                    question,
                    entityNeid,
                    candidate: parseAgentJson<PlanningAgentOutput>(planningResult.text),
                });
                startedAt = completeStep(steps, 1, startedAt);
                send('steps', steps);
                const planningDetail: AgentRunDetails['planning'] = {
                    agent: 'planning',
                    intent: planning.intent,
                    answerStyle: planning.answerStyle,
                    focusEntityNeids: planning.focusEntityNeids,
                    requestedEvidence: planning.requestedEvidence,
                    confidenceNote: planning.confidenceNote,
                };
                send('agent-detail', planningDetail);

                const fallbackContext = contextFallbackBundle(
                    collection,
                    action,
                    question,
                    entityNeid,
                    planning.answerStyle,
                    conversationHistory
                );
                const contextResult = await callAgentQuery({
                    agentId: agentIds.contextAgentId!,
                    message: buildContextPrompt({
                        action,
                        question,
                        plan: planning,
                        fallbackContext,
                        conversationHistory,
                    }),
                });
                const context = mergeContextOutput(
                    fallbackContext,
                    parseAgentJson<ContextAgentOutput>(contextResult.text)
                );
                startedAt = completeStep(steps, 2, startedAt);
                send('steps', steps);
                const contextDetail: AgentRunDetails['context'] = {
                    agent: 'context',
                    stats: context.stats,
                    topEntityNames: context.topEntities
                        .slice(0, 6)
                        .map((entity) => entity.name)
                        .filter(Boolean),
                    evidenceLineCount: context.evidenceLines.length,
                    hasProfileEvidence: Boolean(context.profileEvidence?.length),
                    toolsUsed: [
                        'get_schema',
                        'find_entities',
                        'get_properties',
                        'lookup_entity',
                        'search_entities_batch',
                        'find_entities_batch',
                        'get_entity_profile_record',
                        'get_entity_profile',
                        'build_entity_profile_context_bundle',
                    ],
                };
                send('agent-detail', contextDetail);

                const compositionInput: CompositionAgentInput = {
                    action,
                    question,
                    conversationHistory,
                    plan: planning,
                    context,
                };
                const compositionResult = await callAgentQuery({
                    agentId: agentIds.compositionAgentId!,
                    message: buildCompositionPrompt(compositionInput),
                });
                const composition = parseAgentJson<CompositionAgentOutput>(compositionResult.text);
                const output = String(composition?.output ?? compositionResult.text ?? '').trim();
                const citations = sanitizeCitations(composition?.citations);
                completeStep(steps, 3, startedAt);
                send('steps', steps);
                const compositionDetail: AgentRunDetails['composition'] = {
                    agent: 'composition',
                    citationCount: citations.length,
                    outputLength: output.length,
                    generationSource: 'gateway',
                    outputPreview: output ? output.slice(0, 220) : undefined,
                };
                send('agent-detail', compositionDetail);

                if (!output || /^agent returned no text response\.?$/i.test(output)) {
                    try {
                        const fallback = await $fetch<AskYottaPipelineResponse>(
                            '/api/collection/answer',
                            {
                                method: 'POST',
                                body: { action, question, entityNeid },
                            }
                        );
                        send('result', {
                            ...fallback,
                            agentSteps: steps,
                            evidenceLines:
                                fallback.evidenceLines ?? context.evidenceLines.slice(0, 10),
                            generationNote:
                                fallback.generationNote ||
                                'Composition agent returned empty text; served deterministic fallback answer.',
                        });
                    } catch {
                        const fbContext = contextFallbackBundle(
                            collection,
                            action,
                            question,
                            entityNeid,
                            planning.answerStyle,
                            conversationHistory
                        );
                        send('result', {
                            output: deterministicFallbackText({
                                action,
                                question,
                                context: fbContext,
                            }),
                            citations: [],
                            generationSource: 'fallback',
                            generationNote:
                                'Composition agent returned empty text and fallback route was unavailable; served local deterministic answer.',
                            agentSteps: steps,
                            evidenceLines: fbContext.evidenceLines.slice(0, 10),
                        });
                    }
                } else {
                    send('result', {
                        output: output || 'No response returned from composition agent.',
                        citations,
                        generationSource: 'gateway',
                        agentSteps: steps,
                        evidenceLines: context.evidenceLines.slice(0, 10),
                    } satisfies AskYottaPipelineResponse);
                }
            } catch (error: any) {
                try {
                    const fallback = await $fetch<AskYottaPipelineResponse>(
                        '/api/collection/answer',
                        {
                            method: 'POST',
                            body: { action, question, entityNeid },
                        }
                    );
                    send('result', {
                        ...fallback,
                        evidenceLines:
                            fallback.evidenceLines ?? historyEvidenceLines(conversationHistory),
                        generationNote:
                            error?.data?.statusMessage ||
                            error?.message ||
                            fallback.generationNote ||
                            'Three-agent orchestration failed; served response from fallback route.',
                    });
                } catch {
                    send('result', {
                        output: 'Agent action failed. Please try again.',
                        citations: [],
                        generationSource: 'fallback',
                        generationNote:
                            error?.data?.statusMessage ||
                            error?.message ||
                            'Three-agent orchestration and fallback both failed.',
                        agentSteps: steps,
                        evidenceLines: historyEvidenceLines(conversationHistory),
                    } satisfies AskYottaPipelineResponse);
                }
            }

            send('done', {});
            controller.close();
        },
    });

    return stream;
});
