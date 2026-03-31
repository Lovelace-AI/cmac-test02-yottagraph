<template>
    <div class="agents-workspace">
        <v-card class="mb-3">
            <v-card-item>
                <v-card-title class="d-flex align-center justify-space-between flex-wrap ga-2">
                    <span>Agents</span>
                    <v-btn
                        color="primary"
                        size="small"
                        prepend-icon="mdi-message-text-outline"
                        @click="emit('launch-question', suggestedQuestions[0])"
                    >
                        Ask a Question
                    </v-btn>
                </v-card-title>
                <v-card-subtitle>
                    How it works: multi-agent reasoning over collection entities, relationships, and
                    source evidence.
                </v-card-subtitle>
            </v-card-item>
            <v-card-text class="d-flex align-center ga-2 flex-wrap">
                <v-chip size="small" variant="tonal">{{ entities.length }} entities</v-chip>
                <v-chip size="small" variant="tonal"
                    >{{ relationships.length }} relationships</v-chip
                >
                <v-chip size="small" variant="tonal">{{ documents.length }} documents</v-chip>
                <v-chip size="small" variant="tonal">{{ propertySeries.length }} properties</v-chip>
            </v-card-text>
        </v-card>

        <v-card class="mb-3">
            <v-card-item>
                <v-card-title class="text-body-1">Question-to-Answer Pipeline</v-card-title>
                <v-card-subtitle>Ordered reasoning steps with evidence grounding.</v-card-subtitle>
            </v-card-item>
            <v-card-text>
                <SummaryAgentSteps :steps="agentSteps" />
            </v-card-text>
        </v-card>

        <v-row class="mb-3">
            <v-col cols="12" md="8">
                <v-card height="100%">
                    <v-card-item>
                        <v-card-title class="text-body-1">Agent Roles</v-card-title>
                    </v-card-item>
                    <v-card-text>
                        <v-row>
                            <v-col v-for="card in agentCards" :key="card.name" cols="12" md="6">
                                <v-card variant="outlined" height="100%">
                                    <v-card-text>
                                        <div class="text-subtitle-2">{{ card.name }}</div>
                                        <div class="text-caption text-medium-emphasis mb-2">
                                            {{ card.role }}
                                        </div>
                                        <v-chip
                                            size="x-small"
                                            :color="card.active ? 'success' : 'default'"
                                            variant="tonal"
                                        >
                                            {{ card.active ? 'active' : 'idle' }}
                                        </v-chip>
                                        <div class="text-body-2 mt-2">{{ card.description }}</div>
                                    </v-card-text>
                                </v-card>
                            </v-col>
                        </v-row>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" md="4">
                <v-card height="100%">
                    <v-card-item>
                        <v-card-title class="text-body-1">Starter Questions</v-card-title>
                    </v-card-item>
                    <v-card-text class="d-flex flex-column ga-2">
                        <v-btn
                            v-for="question in suggestedQuestions"
                            :key="question"
                            size="small"
                            variant="outlined"
                            class="justify-start"
                            @click="emit('launch-question', question)"
                        >
                            {{ question }}
                        </v-btn>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-card class="mb-3">
            <v-card-item>
                <v-card-title class="text-body-1">Production Workflows</v-card-title>
            </v-card-item>
            <v-card-text>
                <v-row>
                    <v-col v-for="workflow in workflows" :key="workflow.title" cols="12" md="4">
                        <v-card variant="outlined" height="100%">
                            <v-card-text>
                                <div class="text-subtitle-2">{{ workflow.title }}</div>
                                <div class="text-caption text-medium-emphasis mb-2">
                                    {{ workflow.question }}
                                </div>
                                <div class="text-body-2">{{ workflow.flow }}</div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <v-card>
            <v-card-item>
                <v-card-title class="text-body-1">Run Agent Action</v-card-title>
                <v-card-subtitle
                    >Directly trigger one of the available grounded actions.</v-card-subtitle
                >
            </v-card-item>
            <v-card-text>
                <div class="d-flex flex-wrap ga-2 mb-3">
                    <v-btn
                        v-for="action in actions"
                        :key="action.id"
                        size="small"
                        variant="tonal"
                        :prepend-icon="action.icon"
                        :loading="agentLoading && activeAction === action.id"
                        :disabled="!isReady"
                        @click="runAction(action.id)"
                    >
                        {{ action.label }}
                    </v-btn>
                </div>
                <div class="d-flex ga-2">
                    <v-text-field
                        v-model="question"
                        label="Ask grounded question"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :disabled="!isReady"
                        @keydown.enter="askQuestion"
                    />
                    <v-btn
                        color="primary"
                        :loading="agentLoading && activeAction === 'answer_question'"
                        :disabled="!isReady || !question"
                        @click="askQuestion"
                    >
                        Ask
                    </v-btn>
                </div>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    import type { RebuildStep } from '~/composables/useCollectionWorkspace';

    const emit = defineEmits<{
        'launch-question': [prompt: string];
    }>();

    const {
        isReady,
        agentLoading,
        agentResult,
        entities,
        relationships,
        documents,
        propertySeries,
        runAgentAction,
    } = useCollectionWorkspace();

    const question = ref('');
    const activeAction = ref<string | null>(null);

    const agentSteps = ref<RebuildStep[]>([
        { step: 1, status: 'pending', label: 'Planning Agent', detail: 'Interpreting question...' },
        { step: 2, status: 'pending', label: 'Context Agent', detail: 'Fetching evidence...' },
        { step: 3, status: 'pending', label: 'Composition Agent', detail: 'Composing response...' },
    ]);

    const agentCards = computed(() => [
        {
            name: 'Planning Agent',
            role: 'Question understanding and strategy',
            description:
                'Interprets intent and selects a grounded strategy for the collection scope.',
            active: agentLoading.value,
        },
        {
            name: 'Context Agent',
            role: 'Evidence assembly',
            description:
                'Assembles supporting entities, events, relationships, and document references.',
            active: agentLoading.value,
        },
        {
            name: 'Composition Agent',
            role: 'Answer synthesis',
            description: 'Produces concise evidence-backed output and confidence framing.',
            active: agentLoading.value,
        },
    ]);

    const workflows = [
        {
            title: 'Executive Brief',
            question: 'What matters most in this collection?',
            flow: 'Planning Agent -> Context Agent -> Composition Agent',
        },
        {
            title: 'Evidence Gap Check',
            question: 'Where is support incomplete?',
            flow: 'Planning Agent -> Context Agent (coverage focus) -> Composition Agent',
        },
        {
            title: 'Anchor Selection',
            question: 'Which entities should we expand first?',
            flow: 'Planning Agent -> Context Agent (connectivity ranking) -> Composition Agent',
        },
    ];

    const suggestedQuestions = [
        'Summarize this collection in plain English.',
        'Which agreements are central and why?',
        'Where is evidence thin or incomplete?',
        'How did key facts change across documents?',
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

    watch(agentLoading, (loading) => {
        if (!loading) {
            agentSteps.value.forEach((step) => {
                if (step.status === 'working') step.status = 'completed';
            });
            return;
        }
        agentSteps.value = [
            {
                step: 1,
                status: 'working',
                label: 'Planning Agent',
                detail: 'Interpreting question...',
            },
            { step: 2, status: 'pending', label: 'Context Agent', detail: 'Fetching evidence...' },
            {
                step: 3,
                status: 'pending',
                label: 'Composition Agent',
                detail: 'Composing response...',
            },
        ];
    });

    watch(
        () => agentResult.value?.agentSteps,
        (steps) => {
            if (!steps?.length) return;
            agentSteps.value = steps.map((step) => ({
                step: step.step,
                status: step.status,
                label: step.label,
                detail: step.detail,
                durationMs: step.durationMs,
            }));
        }
    );

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
        if (!question.value) return;
        activeAction.value = 'answer_question';
        await runAgentAction('answer_question', { question: question.value });
        activeAction.value = null;
    }
</script>
