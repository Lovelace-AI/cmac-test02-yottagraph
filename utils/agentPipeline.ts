import type {
    CollectionState,
    EntityRecord,
    EventRecord,
    RelationshipRecord,
} from '~/utils/collectionTypes';

export type PipelineStepStatus = 'pending' | 'working' | 'completed';

export type PipelineAgentName = 'Planning Agent' | 'Context Agent' | 'Composition Agent';

export interface AgentPipelineStep {
    step: number;
    status: PipelineStepStatus;
    label: PipelineAgentName;
    detail: string;
    icon?: string;
    color?: string;
    durationMs?: number;
}

export interface PlanningAgentRunDetail {
    agent: 'planning';
    intent: string;
    answerStyle: PlanningAgentOutput['answerStyle'];
    focusEntityNeids: string[];
    requestedEvidence: string[];
    confidenceNote?: string;
}

export interface ContextAgentRunDetail {
    agent: 'context';
    stats: {
        documentCount: number;
        entityCount: number;
        eventCount: number;
        relationshipCount: number;
    };
    topEntityNames: string[];
    evidenceLineCount: number;
    hasProfileEvidence: boolean;
    toolsUsed: string[];
}

export interface CompositionAgentRunDetail {
    agent: 'composition';
    citationCount: number;
    outputLength: number;
    generationSource?: AskYottaPipelineResponse['generationSource'];
    outputPreview?: string;
}

export type AgentRunDetail =
    | PlanningAgentRunDetail
    | ContextAgentRunDetail
    | CompositionAgentRunDetail;

export interface AgentRunDetails {
    planning?: PlanningAgentRunDetail;
    context?: ContextAgentRunDetail;
    composition?: CompositionAgentRunDetail;
}

export interface AgentUsage {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    latencyMs?: number;
}

export interface AgentCitation {
    type: 'entity' | 'event' | 'document' | 'relationship';
    neid: string;
    label: string;
}

export interface AskYottaHistoryTurn {
    role: 'user' | 'assistant';
    text: string;
}

export interface AskYottaPipelineResponse {
    output: string;
    citations: AgentCitation[];
    generationSource?: 'gemini' | 'fallback' | 'gateway';
    generationNote?: string;
    usage?: AgentUsage;
    agentSteps?: AgentPipelineStep[];
    evidenceLines?: string[];
}

export interface PlanningAgentInput {
    action: string;
    question: string;
    entityNeid?: string;
    conversationHistory?: AskYottaHistoryTurn[];
    collection: {
        name: string;
        documentCount: number;
        entityCount: number;
        eventCount: number;
        relationshipCount: number;
    };
}

export interface PlanningAgentOutput {
    intent: string;
    answerStyle:
        | 'executive_summary'
        | 'entity_explanation'
        | 'risk_gaps'
        | 'timeline_analysis'
        | 'qa';
    focusEntityNeids: string[];
    requestedEvidence: string[];
    confidenceNote?: string;
}

export interface ContextEntityRow {
    neid: string;
    name: string;
    flavor: string;
    docs: number;
}

export interface ContextEventRow {
    neid: string;
    name: string;
    date: string;
    participants: number;
}

export interface ContextRelationshipRow {
    type: string;
    sourceNeid: string;
    targetNeid: string;
    sourceDocumentNeid?: string;
}

export interface ContextProfileEvidenceRow {
    neid: string;
    name: string;
    flavor: string;
    resolution: 'provided_neid' | 'name_search';
    properties: Record<string, string[]>;
    missingProperties: string[];
}

export interface ContextAgentOutput {
    collectionName: string;
    question: string;
    answerStyle?: PlanningAgentOutput['answerStyle'];
    focusEntity?: ContextEntityRow;
    topEntities: ContextEntityRow[];
    topEvents: ContextEventRow[];
    relationships: ContextRelationshipRow[];
    profileEvidence?: ContextProfileEvidenceRow[];
    evidenceLines: string[];
    stats: {
        documentCount: number;
        entityCount: number;
        eventCount: number;
        relationshipCount: number;
    };
}

export interface CompositionAgentInput {
    action: string;
    question: string;
    conversationHistory?: AskYottaHistoryTurn[];
    plan: PlanningAgentOutput;
    context: ContextAgentOutput;
}

export interface CompositionAgentOutput {
    output: string;
    citations: AgentCitation[];
}

export function seedAskYottaPipelineSteps(): AgentPipelineStep[] {
    return [
        {
            step: 1,
            status: 'working',
            label: 'Planning Agent',
            detail: 'Interpreting your question and selecting a retrieval strategy...',
            icon: 'mdi-head-question',
            color: 'deep-purple',
        },
        {
            step: 2,
            status: 'pending',
            label: 'Context Agent',
            detail: 'Gathering grounded evidence from collection and graph context...',
            icon: 'mdi-database-search',
            color: 'teal',
        },
        {
            step: 3,
            status: 'pending',
            label: 'Composition Agent',
            detail: 'Composing a concise grounded answer...',
            icon: 'mdi-file-document-edit-outline',
            color: 'amber-darken-2',
        },
    ];
}

export function toContextEntityRow(entity: EntityRecord): ContextEntityRow {
    return {
        neid: entity.neid,
        name: entity.name,
        flavor: entity.flavor,
        docs: entity.sourceDocuments.length,
    };
}

export function toContextEventRow(eventItem: EventRecord): ContextEventRow {
    return {
        neid: eventItem.neid,
        name: eventItem.name,
        date: eventItem.date ? eventItem.date.slice(0, 10) : 'date not available',
        participants: eventItem.participantNeids.length,
    };
}

export function toContextRelationshipRow(relationship: RelationshipRecord): ContextRelationshipRow {
    return {
        type: relationship.type,
        sourceNeid: relationship.sourceNeid,
        targetNeid: relationship.targetNeid,
        sourceDocumentNeid: relationship.sourceDocumentNeid,
    };
}

export function summarizeCollection(collection: CollectionState) {
    return {
        name: collection.meta.name,
        documentCount: collection.documents.length,
        entityCount: collection.entities.length,
        eventCount: collection.events.length,
        relationshipCount: collection.relationships.length,
    };
}
