<template>
    <div>
        <v-row class="mb-4">
            <v-col cols="12" md="7">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Guided Actions</v-card-title>
                        <v-card-subtitle>
                            Evidence-backed workflows over the loaded collection graph
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
                    </v-card-item>
                    <v-card-text>
                        <!-- Rich tooltip on entity name -->
                        <v-tooltip location="right">
                            <template v-slot:activator="{ props: tp }">
                                <div v-bind="tp" class="text-body-2 mb-1 cursor-pointer">
                                    {{ selectedEntity.name }}
                                </div>
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
                        <v-chip size="x-small" variant="tonal" class="mb-2">
                            {{ selectedEntity.flavor.replace(/_/g, ' ') }}
                        </v-chip>
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
                            Select an entity from the graph or table to enable entity-specific
                            actions.
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
                    Agent Output
                    <v-chip size="x-small" variant="tonal" color="warning">agent-generated</v-chip>
                </v-card-title>
            </v-card-item>
            <v-card-text>
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
    } = useCollectionWorkspace();

    const { wrapKeywords, handleKeywordClick } = useEntityKeywords();

    const question = ref('');
    const activeAction = ref<string | null>(null);
    const feedback = ref<'positive' | 'negative' | null>(null);

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
            label: 'Summarize Collection',
            icon: 'mdi-text-box-outline',
            tooltip: 'Generate a graph-backed summary of the BNY collection',
        },
        {
            id: 'compare_contexts',
            label: 'Compare Contexts',
            icon: 'mdi-compare',
            tooltip: 'Compare document-extracted data with enriched broader-graph context',
        },
        {
            id: 'recommend_anchors',
            label: 'Recommend Anchors',
            icon: 'mdi-star-outline',
            tooltip: 'Identify high-value entities for one-hop or two-hop graph expansion',
        },
    ];

    async function runAction(actionId: string) {
        activeAction.value = actionId;
        feedback.value = null;
        await runAgentAction(actionId);
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
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.7em;
        vertical-align: super;
    }

    .tooltip-rich {
        min-width: 150px;
    }

    .cursor-pointer {
        cursor: pointer;
    }
</style>
