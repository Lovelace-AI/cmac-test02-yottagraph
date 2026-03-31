<template>
    <div class="agents-workspace d-flex flex-column ga-3">
        <v-card>
            <v-card-item>
                <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2">
                    <span>How The Agents Work</span>
                    <v-btn
                        color="primary"
                        size="small"
                        prepend-icon="mdi-message-text-outline"
                        @click="emit('launch-question', suggestedQuestions[0])"
                    >
                        Open Ask Yotta
                    </v-btn>
                </v-card-title>
                <v-card-subtitle>
                    A three-agent pipeline reasons over your document collection and knowledge
                    graph.
                </v-card-subtitle>
            </v-card-item>
            <v-card-text class="d-flex flex-column ga-3">
                <div class="d-flex align-center ga-2 flex-wrap">
                    <v-chip size="small" variant="tonal"
                        >{{ entities.length }} entities in scope</v-chip
                    >
                    <v-chip size="small" variant="tonal">
                        {{ relationships.length }} relationships in scope
                    </v-chip>
                    <v-chip size="small" variant="tonal">
                        {{ documents.length }} documents in scope
                    </v-chip>
                    <v-chip size="small" variant="tonal">
                        {{ propertySeries.length }} properties in scope
                    </v-chip>
                </div>

                <div class="pipeline-flow">
                    <div class="pipeline-node">
                        <v-chip color="deep-purple" size="small" variant="tonal">
                            1. Planning Agent
                        </v-chip>
                        <div class="text-caption text-medium-emphasis">Interprets intent</div>
                    </div>
                    <v-icon color="medium-emphasis">mdi-arrow-right</v-icon>
                    <div class="pipeline-node">
                        <v-chip color="teal" size="small" variant="tonal">2. Context Agent</v-chip>
                        <div class="text-caption text-medium-emphasis">Queries KG evidence</div>
                    </div>
                    <v-icon color="medium-emphasis">mdi-arrow-right</v-icon>
                    <div class="pipeline-node">
                        <v-chip color="amber-darken-2" size="small" variant="tonal">
                            3. Composition Agent
                        </v-chip>
                        <div class="text-caption text-medium-emphasis">Synthesizes response</div>
                    </div>
                </div>

                <v-row>
                    <v-col v-for="agent in agentProfiles" :key="agent.name" cols="12" md="4">
                        <AgentProfileCard
                            :name="agent.name"
                            :role="agent.role"
                            :description="agent.description"
                            :icon="agent.icon"
                            :color="agent.color"
                            :model="agent.model"
                            :tool-chips="agent.toolChips"
                            :active="agent.active"
                        />
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <AgentRunPanel
            :steps="pipelineSteps"
            :run-details="agentRunDetails"
            :result="agentResult"
            :loading="agentLoading"
        />

        <v-card>
            <v-card-item>
                <v-card-title class="text-body-1">Ask The Agents</v-card-title>
                <v-card-subtitle>
                    Ask a grounded question or run a quick preset action.
                </v-card-subtitle>
            </v-card-item>
            <v-card-text>
                <div class="d-flex ga-2 mb-2">
                    <v-text-field
                        v-model="question"
                        label="Ask a grounded question"
                        density="compact"
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

                <div class="d-flex ga-2 flex-wrap">
                    <v-chip
                        v-for="action in actions"
                        :key="action.id"
                        label
                        variant="outlined"
                        :prepend-icon="action.icon"
                        :disabled="!isReady"
                        @click="runAction(action.id)"
                    >
                        {{ action.label }}
                    </v-chip>
                </div>

                <div class="text-caption text-medium-emphasis mt-3">
                    Try:
                    <span
                        v-for="(prompt, idx) in suggestedQuestions"
                        :key="prompt"
                        class="prompt-link"
                        @click="question = prompt"
                    >
                        {{ prompt }}{{ idx < suggestedQuestions.length - 1 ? ' |' : '' }}
                    </span>
                </div>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    import { seedAskYottaPipelineSteps, type AgentPipelineStep } from '~/utils/agentPipeline';

    const emit = defineEmits<{
        'launch-question': [prompt: string];
    }>();

    const {
        isReady,
        agentLoading,
        agentResult,
        agentStepsLive,
        agentRunDetails,
        entities,
        relationships,
        documents,
        propertySeries,
        runAgentAction,
    } = useCollectionWorkspace();

    const question = ref('');
    const activeAction = ref<string | null>(null);

    const suggestedQuestions = [
        'Give me a grounded executive brief.',
        'Where is evidence thin or incomplete?',
        'Which entities should we enrich first and why?',
    ];

    const actions = [
        {
            id: 'summarize_collection',
            label: 'Plain-English Summary',
            icon: 'mdi-text-box-outline',
        },
        { id: 'answer_question', label: 'Find Evidence Gaps', icon: 'mdi-alert-circle-outline' },
        { id: 'recommend_anchors', label: 'Recommend Anchors', icon: 'mdi-star-outline' },
    ];

    const pipelineSteps = computed<AgentPipelineStep[]>(() => {
        if (agentStepsLive.value?.length) return agentStepsLive.value;
        if (agentResult.value?.agentSteps?.length) return agentResult.value.agentSteps;
        return seedAskYottaPipelineSteps().map((step) => ({
            ...step,
            status: 'pending',
        }));
    });

    const agentProfiles = computed(() => [
        {
            name: 'Planning Agent',
            role: 'Question understanding and strategy',
            description:
                'Translates your question into an answer plan, picks the response style, and identifies focus entities.',
            icon: 'mdi-head-question',
            color: 'deep-purple',
            model: 'Gemini 2.0 Flash',
            toolChips: [],
            active: agentLoading.value && pipelineSteps.value.some((s) => s.step === 1),
        },
        {
            name: 'Context Agent',
            role: 'Knowledge graph retrieval',
            description:
                'Uses graph and schema tools to pull grounded entities, relationships, events, and profile evidence.',
            icon: 'mdi-database-search',
            color: 'teal',
            model: 'Gemini 2.0 Flash',
            toolChips: [
                'get_schema',
                'find_entities',
                'get_properties',
                'lookup_entity',
                'search_entities_batch',
            ],
            active: agentLoading.value && pipelineSteps.value.some((s) => s.step === 2),
        },
        {
            name: 'Composition Agent',
            role: 'Grounded narrative synthesis',
            description:
                'Converts evidence bundles into concise, audience-friendly answers with citations.',
            icon: 'mdi-file-document-edit-outline',
            color: 'amber-darken-2',
            model: 'Gemini 2.0 Flash',
            toolChips: [],
            active: agentLoading.value && pipelineSteps.value.some((s) => s.step === 3),
        },
    ]);

    async function runAction(actionId: string) {
        activeAction.value = actionId;
        if (actionId === 'answer_question') {
            await runAgentAction('answer_question', {
                question: 'Where is evidence thin or incomplete?',
            });
        } else {
            await runAgentAction(actionId);
        }
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
    .pipeline-flow {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .pipeline-node {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .prompt-link {
        cursor: pointer;
        margin-left: 6px;
    }

    .prompt-link:hover {
        text-decoration: underline;
    }
</style>
