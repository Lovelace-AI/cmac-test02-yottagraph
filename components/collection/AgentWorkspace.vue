<template>
    <div>
        <v-row class="mb-4">
            <v-col cols="12" md="7">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Analytical Copilot</v-card-title>
                        <v-card-subtitle>
                            Ask grounded analytical questions and navigate directly to evidence.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text>
                        <!-- Agent pipeline steps (show during loading) -->
                        <div v-if="agentLoading" class="mb-4">
                            <SummaryAgentSteps :steps="agentSteps" />
                        </div>

                        <div class="d-flex flex-wrap ga-2 mb-4">
                            <v-tooltip
                                v-for="action in actions"
                                :key="action.id"
                                :text="action.tooltip"
                                location="bottom"
                            >
                                <template v-slot:activator="{ props: tp }">
                                    <v-btn
                                        v-bind="tp"
                                        size="small"
                                        variant="tonal"
                                        :prepend-icon="action.icon"
                                        :loading="agentLoading && activeAction === action.id"
                                        :disabled="!isReady"
                                        @click="runAction(action.id)"
                                    >
                                        {{ action.label }}
                                    </v-btn>
                                </template>
                            </v-tooltip>
                        </div>

                        <v-divider class="mb-4" />

                        <div class="text-subtitle-2 mb-2">Prompt suggestions</div>
                        <div class="d-flex flex-wrap ga-2 mb-4">
                            <v-btn
                                v-for="prompt in contextualAgentPrompts"
                                :key="prompt"
                                size="small"
                                variant="outlined"
                                :disabled="!isReady"
                                @click="askSuggestedPrompt(prompt)"
                            >
                                {{ prompt }}
                            </v-btn>
                        </div>

                        <v-divider class="mb-4" />

                        <div class="text-subtitle-2 mb-2">Ask a Question</div>
                        <div class="d-flex ga-2">
                            <v-text-field
                                v-model="question"
                                label="Query over entities, events, agreements, and properties"
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
            </v-col>

            <v-col cols="12" md="5">
                <v-card v-if="selectedEntity">
                    <v-card-item>
                        <v-card-title class="text-body-1">Entity Context</v-card-title>
                        <v-card-subtitle
                            >Contextual prompts update when you change selection.</v-card-subtitle
                        >
                    </v-card-item>
                    <v-card-text>
                        <!-- Rich tooltip on entity name -->
                        <v-tooltip location="right">
                            <template v-slot:activator="{ props: tp }">
                                <button
                                    type="button"
                                    v-bind="tp"
                                    class="text-body-2 mb-1 entity-context-trigger"
                                >
                                    {{ selectedEntity.name }}
                                </button>
                            </template>
                            <div class="tooltip-rich">
                                <div class="text-caption font-weight-bold mb-1">
                                    {{ selectedEntity.name }}
                                </div>
                                <div class="text-caption">
                                    Type: {{ selectedEntity.flavor.replace(/_/g, ' ') }}
                                </div>
                                <div class="text-caption">
                                    Appears in
                                    {{ selectedEntity.sourceDocuments.length }} document(s)
                                </div>
                            </div>
                        </v-tooltip>
                        <div class="text-caption text-medium-emphasis mb-2">
                            {{ selectedEntity.flavor.replace(/_/g, ' ') }} ·
                            {{ selectedEntity.sourceDocuments.length }} source documents
                        </div>
                        <div class="d-flex ga-2">
                            <v-btn
                                size="small"
                                variant="tonal"
                                prepend-icon="mdi-brain"
                                :loading="agentLoading && activeAction === 'explain_entity'"
                                :title="`Analyze ${selectedEntity.name} in the context of this collection`"
                                @click="explainSelected"
                            >
                                Explain This Entity
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>
                <v-card v-else>
                    <v-card-text class="text-center text-medium-emphasis py-6">
                        <v-icon size="32" class="mb-2">mdi-cursor-default-click-outline</v-icon>
                        <div class="text-body-2">
                            Select an entity from Graph & Entities to unlock context-aware prompts.
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Agent result output -->
        <v-card v-if="agentResult && !agentLoading">
            <v-card-item>
                <v-card-title class="text-body-1 d-flex align-center ga-2">
                    <v-icon size="small" color="warning">mdi-robot</v-icon>
                    Copilot Output
                    <v-chip size="x-small" variant="tonal" color="warning">grounded summary</v-chip>
                </v-card-title>
            </v-card-item>
            <v-card-text>
                <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                    Confidence: {{ outputConfidence }}
                    <template v-if="agentResult?.citations?.length">
                        · {{ agentResult.citations.length }} linked evidence item(s)
                    </template>
                </v-alert>
                <!-- Clickable entity keywords via delegated handler -->
                <div
                    class="agent-output text-body-2"
                    v-html="wrapKeywords(renderMarkdown(agentResult.output))"
                    @click="handleKeywordClick"
                />

                <!-- Citations panel -->
                <CitationPanel
                    :citations="buildCitations(agentResult.citations)"
                    @select="handleCitationSelect"
                />

                <!-- Meta bar with token usage -->
                <div class="mt-3">
                    <SummaryMetaBar
                        :entity-count="entities.length"
                        :event-count="events.length"
                        :show-feedback="true"
                        :feedback="feedback"
                        @feedback="(t) => (feedback = t)"
                    />
                </div>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    import { buildDocumentCitation, type Citation } from '~/utils/citationTypes';
    import type { RebuildStep } from '~/composables/useCollectionWorkspace';
    import { BNY_DOCUMENTS } from '~/utils/collectionTypes';

    const {
        isReady,
        agentLoading,
        agentResult,
        selectedEntity,
        entities,
        events,
        runAgentAction,
        selectEntity,
        focusDocument,
        setTab,
        contextualAgentPrompts,
    } = useCollectionWorkspace();

    const { wrapKeywords, handleKeywordClick } = useEntityKeywords();

    const question = ref('');
    const activeAction = ref<string | null>(null);
    const feedback = ref<'positive' | 'negative' | null>(null);
    const outputConfidence = computed(() => {
        const citationCount = agentResult.value?.citations?.length ?? 0;
        if (citationCount >= 4) return 'High (multiple linked sources)';
        if (citationCount >= 2) return 'Medium (partial evidence coverage)';
        return 'Low (requires manual verification)';
    });

    // Simulated agent steps for loading state
    const agentSteps = ref<RebuildStep[]>([
        { step: 1, status: 'working', label: 'Dialogue Agent', detail: 'Interpreting question...' },
        {
            step: 2,
            status: 'pending',
            label: 'Context Agent',
            detail: 'Fetching relevant evidence...',
        },
        {
            step: 3,
            status: 'pending',
            label: 'Composition Agent',
            detail: 'Generating response...',
        },
    ]);

    watch(agentLoading, (loading) => {
        if (loading) {
            agentSteps.value = [
                {
                    step: 1,
                    status: 'working',
                    label: 'Dialogue Agent',
                    detail: 'Interpreting question...',
                },
                {
                    step: 2,
                    status: 'pending',
                    label: 'Context Agent',
                    detail: 'Fetching relevant evidence...',
                },
                {
                    step: 3,
                    status: 'pending',
                    label: 'Composition Agent',
                    detail: 'Generating response...',
                },
            ];
            let idx = 0;
            const timer = setInterval(() => {
                if (!agentLoading.value || idx >= agentSteps.value.length - 1) {
                    clearInterval(timer);
                    return;
                }
                agentSteps.value[idx].status = 'completed';
                agentSteps.value[idx].durationMs = 700 * (idx + 1);
                idx++;
                agentSteps.value[idx].status = 'working';
            }, 700);
        }
    });

    const actions = [
        {
            id: 'summarize_collection',
            label: 'Plain-English Summary',
            icon: 'mdi-text-box-outline',
            tooltip: 'Summarize this collection for fast orientation.',
        },
        {
            id: 'answer_question',
            label: 'Find Evidence Gaps',
            icon: 'mdi-alert-circle-outline',
            tooltip: 'Identify where evidence is thin, partial, or inferred.',
        },
        {
            id: 'recommend_anchors',
            label: 'Recommend Anchor Entities',
            icon: 'mdi-star-outline',
            tooltip: 'Suggest high-impact anchors for enrichment analysis.',
        },
    ];

    async function runAction(actionId: string) {
        activeAction.value = actionId;
        feedback.value = null;
        if (actionId === 'answer_question') {
            await runAgentAction('answer_question', {
                question: 'Where is evidence thin or incomplete?',
            });
        } else {
            await runAgentAction(actionId);
        }
        activeAction.value = null;
        if (agentSteps.value) {
            agentSteps.value.forEach((s) => (s.status = 'completed'));
        }
    }

    async function askQuestion() {
        if (!question.value) return;
        activeAction.value = 'answer_question';
        feedback.value = null;
        await runAgentAction('answer_question', { question: question.value });
        activeAction.value = null;
    }

    async function askSuggestedPrompt(prompt: string) {
        question.value = prompt;
        await askQuestion();
    }

    async function explainSelected() {
        if (!selectedEntity.value) return;
        activeAction.value = 'explain_entity';
        feedback.value = null;
        await runAgentAction('explain_entity', { entityNeid: selectedEntity.value.neid });
        activeAction.value = null;
    }

    function renderMarkdown(text: string): string {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[(\d+)\]/g, '<sup class="citation-ref-inline">[$1]</sup>')
            .replace(/\n/g, '<br>');
    }

    function buildCitations(rawCitations: any[]): Citation[] {
        if (!rawCitations?.length) return [];
        return rawCitations.map((c, i) => {
            if (c.type === 'document') {
                const doc =
                    (c.neid && BNY_DOCUMENTS.find((item) => item.neid === c.neid)) ||
                    BNY_DOCUMENTS.find((item) => item.title === c.label);
                return buildDocumentCitation(
                    `BNY-${doc?.documentId ?? c.label}.pdf`,
                    String(i + 1),
                    'document',
                    c.excerpt,
                    c.date ?? doc?.date
                );
            }
            return {
                ref: String(i + 1),
                sourceName: c.label ?? c.name ?? `Source ${i + 1}`,
                sourceType: c.type ?? 'other',
                date: c.date,
                excerpt: c.excerpt,
                url: c.url,
                neid: c.neid,
            };
        });
    }

    function handleCitationSelect(citation: Citation) {
        if (!citation.neid) return;
        const doc = BNY_DOCUMENTS.find((item) => item.neid === citation.neid);
        if (doc) {
            focusDocument(doc.neid);
            return;
        }
        const event = events.value.find((item) => item.neid === citation.neid);
        if (event) {
            setTab('events');
            return;
        }
        selectEntity(citation.neid);
    }
</script>

<style scoped>
    .agent-output {
        padding: 12px;
        border-radius: 8px;
        background: rgba(255, 159, 10, 0.05);
        border: 1px solid rgba(255, 159, 10, 0.15);
        line-height: 1.7;
    }

    .agent-output :deep(.citation-ref-inline) {
        color: var(--dynamic-text-muted);
        font-size: 0.7em;
        vertical-align: super;
    }

    .tooltip-rich {
        min-width: 150px;
    }

    .entity-context-trigger {
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
    }
</style>
