<template>
    <div class="agents-workspace d-flex flex-column ga-4">
        <section class="module-header">
            <div class="d-flex align-start justify-space-between ga-3 flex-wrap">
                <div class="header-copy">
                    <h2 class="text-h6 font-weight-bold mb-1">Graph-Grounded Agents</h2>
                    <p class="text-body-2 text-medium-emphasis mb-2">
                        Agents that plan, retrieve from the knowledge graph, assemble evidence, and
                        generate grounded outputs from this collection.
                    </p>
                    <div class="value-strip d-flex ga-2">
                        <span class="value-pill">
                            <v-icon size="14" icon="mdi-graph-outline" />
                            Uses entities, events, relationships, and source documents
                        </span>
                        <span class="value-pill">
                            <v-icon size="14" icon="mdi-shield-check-outline" />
                            Produces evidence-backed outputs
                        </span>
                        <span class="value-pill">
                            <v-icon size="14" icon="mdi-repeat" />
                            Designed for repeatable collection workflows
                        </span>
                    </div>
                </div>
                <div class="status-strip d-flex flex-wrap ga-1">
                    <v-chip size="small" color="success" variant="tonal">
                        {{ isReady ? 'Collection ready' : 'Collection not ready' }}
                    </v-chip>
                    <v-chip size="small" variant="outlined">
                        <v-icon start size="14" icon="mdi-domain" />
                        {{ entities.length }} entities
                    </v-chip>
                    <v-chip size="small" variant="outlined">
                        <v-icon start size="14" icon="mdi-calendar-star" />
                        {{ events.length }} events
                    </v-chip>
                    <v-chip size="small" variant="outlined">
                        <v-icon start size="14" icon="mdi-link-variant" />
                        {{ relationships.length }} edges
                    </v-chip>
                    <v-chip size="small" variant="outlined">
                        <v-icon start size="14" icon="mdi-file-document" />
                        {{ documents.length }} docs
                    </v-chip>
                </div>
            </div>
            <div class="kg-why mt-3 text-caption">
                These agents do not rely on generic text retrieval alone. They use the collection's
                entity graph, event structure, relationship network, and source documents to produce
                grounded outputs.
            </div>
        </section>

        <section>
            <div class="section-title mb-2">Agent Workflow Architecture</div>
            <AgentWorkflowPipeline
                :steps="pipelineSteps"
                :run-details="agentRunDetails"
                :trace-entries="agentTraceLive"
            />
        </section>

        <section>
            <div class="section-title mb-2">Run An Action + See Output</div>
            <v-card class="action-shell" variant="flat">
                <v-card-text>
                    <v-row>
                        <v-col cols="12" lg="5">
                            <div class="text-subtitle-2 font-weight-bold mb-2">
                                Run a grounded action
                            </div>
                            <div class="d-flex flex-column ga-2 mb-3">
                                <button
                                    v-for="action in actionTiles"
                                    :key="action.id"
                                    type="button"
                                    class="action-tile text-left"
                                    :disabled="!isReady"
                                    @click="runActionTile(action)"
                                >
                                    <div class="d-flex align-center justify-space-between ga-2">
                                        <div class="d-flex align-center ga-2">
                                            <v-icon size="16" :icon="action.icon" />
                                            <div class="text-body-2 font-weight-medium">
                                                {{ action.label }}
                                            </div>
                                        </div>
                                        <v-chip size="x-small" variant="tonal">{{
                                            action.output
                                        }}</v-chip>
                                    </div>
                                    <div class="text-caption text-medium-emphasis mt-1">
                                        {{ action.description }}
                                    </div>
                                </button>
                            </div>

                            <div class="d-flex ga-2">
                                <v-text-field
                                    v-model="question"
                                    label="Ask about this collection using graph-grounded evidence"
                                    density="comfortable"
                                    variant="outlined"
                                    hide-details
                                    :disabled="!isReady"
                                    @keydown.enter="askQuestion"
                                />
                                <v-btn
                                    color="primary"
                                    :loading="agentLoading && activeAction === 'answer_question'"
                                    :disabled="!isReady || !question.trim()"
                                    @click="askQuestion"
                                >
                                    Ask
                                </v-btn>
                            </div>
                        </v-col>
                        <v-col cols="12" lg="7">
                            <AgentOutputPanel
                                :loading="agentLoading"
                                :steps="pipelineSteps"
                                :run-details="agentRunDetails"
                                :result="agentResult"
                                @use-prompt="question = $event"
                            />
                        </v-col>
                    </v-row>
                </v-card-text>
            </v-card>
        </section>
    </div>
</template>

<script setup lang="ts">
    import { seedAskYottaPipelineSteps, type AgentPipelineStep } from '~/utils/agentPipeline';

    interface ActionTile {
        id: string;
        label: string;
        icon: string;
        description: string;
        output: string;
        action: string;
        actionQuestion?: string;
    }

    const {
        isReady,
        agentLoading,
        agentResult,
        agentStepsLive,
        agentRunDetails,
        agentTraceLive,
        entities,
        events,
        relationships,
        documents,
        runAgentAction,
    } = useCollectionWorkspace();

    const question = ref('');
    const activeAction = ref<string | null>(null);

    const pipelineSteps = computed<AgentPipelineStep[]>(() => {
        if (agentStepsLive.value?.length) return agentStepsLive.value;
        if (agentResult.value?.agentSteps?.length) return agentResult.value.agentSteps;
        return seedAskYottaPipelineSteps().map((step) => ({
            ...step,
            status: 'pending',
        }));
    });

    const actionTiles: ActionTile[] = [
        {
            id: 'summary',
            label: 'Plain-English Summary',
            icon: 'mdi-text-box-outline',
            description: 'Generate an executive brief from graph structure and source evidence.',
            output: 'Brief',
            action: 'summarize_collection',
        },
        {
            id: 'gaps',
            label: 'Find Evidence Gaps',
            icon: 'mdi-alert-circle-outline',
            description: 'Identify weakly grounded claims and sparse coverage areas.',
            output: 'Coverage',
            action: 'answer_question',
            actionQuestion: 'Where is evidence thin or incomplete?',
        },
        {
            id: 'anchors',
            label: 'Recommend Anchors',
            icon: 'mdi-star-outline',
            description: 'Prioritize the best entities for enrichment and expansion.',
            output: 'Anchor List',
            action: 'recommend_anchors',
        },
        {
            id: 'changes',
            label: 'Track Key Changes',
            icon: 'mdi-chart-timeline-variant',
            description: 'Surface the most meaningful cross-document changes in timeline context.',
            output: 'Change Summary',
            action: 'answer_question',
            actionQuestion: 'What changed most across these documents and why does it matter?',
        },
        {
            id: 'relationship',
            label: 'Explain Relationship',
            icon: 'mdi-link-variant',
            description: 'Explain important relationship paths and supporting graph evidence.',
            output: 'Relationship Brief',
            action: 'answer_question',
            actionQuestion:
                'Explain the most important relationship path in this collection and cite evidence.',
        },
    ];

    async function runActionTile(tile: ActionTile) {
        activeAction.value = tile.action;
        await runAgentAction(tile.action, {
            question: tile.actionQuestion,
        });
        activeAction.value = null;
    }

    async function askQuestion() {
        const trimmed = question.value.trim();
        if (!trimmed) return;
        activeAction.value = 'answer_question';
        await runAgentAction('answer_question', { question: trimmed });
        activeAction.value = null;
    }
</script>

<style scoped>
    .module-header {
        border-bottom: 1px solid var(--app-divider);
        padding-bottom: 12px;
    }

    .header-copy {
        max-width: 860px;
    }

    .value-strip {
        flex-wrap: nowrap;
        overflow-x: auto;
        row-gap: 0;
        padding-bottom: 2px;
    }

    .value-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
        white-space: nowrap;
        border: 1px solid var(--app-divider);
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 0.74rem;
        color: var(--dynamic-text-secondary);
    }

    .kg-why {
        color: var(--dynamic-text-secondary);
    }

    .section-title {
        font-size: 0.98rem;
        font-weight: 600;
    }

    .action-shell {
        border: 1px solid var(--app-divider);
        background: color-mix(in srgb, var(--app-surface) 97%, white 3%);
    }

    .action-tile {
        border: 1px solid var(--app-divider);
        border-radius: 10px;
        padding: 10px;
        background: color-mix(in srgb, var(--app-surface) 96%, white 4%);
        transition:
            border-color 0.15s ease,
            transform 0.15s ease;
    }

    .action-tile:hover:not(:disabled) {
        border-color: color-mix(in srgb, var(--v-theme-primary) 35%, var(--app-divider));
        transform: translateY(-1px);
    }

    .action-tile:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>
