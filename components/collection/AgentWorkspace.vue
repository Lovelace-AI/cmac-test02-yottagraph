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
                        <div class="d-flex flex-wrap ga-2 mb-4">
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
                        <div class="text-body-2 mb-1">{{ selectedEntity.name }}</div>
                        <v-chip size="x-small" variant="tonal" class="mb-2">
                            {{ selectedEntity.flavor }}
                        </v-chip>
                        <div class="d-flex ga-2">
                            <v-btn
                                size="small"
                                variant="tonal"
                                prepend-icon="mdi-brain"
                                :loading="agentLoading && activeAction === 'explain_entity'"
                                @click="explainSelected"
                            >
                                Explain This Entity
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>
                <v-card v-else>
                    <v-card-text class="text-center text-medium-emphasis py-6">
                        Select an entity from the graph or table to enable entity-specific actions.
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-card v-if="agentResult">
            <v-card-item>
                <v-card-title class="text-body-1 d-flex align-center ga-2">
                    <v-icon size="small" color="warning">mdi-robot</v-icon>
                    Agent Output
                    <v-chip size="x-small" variant="tonal" color="warning">
                        agent-generated
                    </v-chip>
                </v-card-title>
            </v-card-item>
            <v-card-text>
                <div class="agent-output text-body-2" v-html="renderMarkdown(agentResult.output)" />

                <div v-if="agentResult.citations.length" class="mt-3">
                    <div class="text-caption text-medium-emphasis mb-1">Supporting Evidence</div>
                    <v-chip
                        v-for="(cite, i) in agentResult.citations"
                        :key="i"
                        size="small"
                        variant="tonal"
                        :color="citationColor(cite.type)"
                        class="mr-1 mb-1 cursor-pointer"
                        @click="selectEntity(cite.neid)"
                    >
                        <v-icon start size="small">{{ citationIcon(cite.type) }}</v-icon>
                        {{ cite.label }}
                    </v-chip>
                </div>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    const { isReady, agentLoading, agentResult, selectedEntity, runAgentAction, selectEntity } =
        useCollectionWorkspace();

    const question = ref('');
    const activeAction = ref<string | null>(null);

    const actions = [
        { id: 'summarize_collection', label: 'Summarize Collection', icon: 'mdi-text-box-outline' },
        { id: 'compare_contexts', label: 'Compare Contexts', icon: 'mdi-compare' },
        { id: 'recommend_anchors', label: 'Recommend Anchors', icon: 'mdi-star-outline' },
    ];

    async function runAction(actionId: string) {
        activeAction.value = actionId;
        await runAgentAction(actionId);
        activeAction.value = null;
    }

    async function askQuestion() {
        if (!question.value) return;
        activeAction.value = 'answer_question';
        await runAgentAction('answer_question', { question: question.value });
        activeAction.value = null;
    }

    async function explainSelected() {
        if (!selectedEntity.value) return;
        activeAction.value = 'explain_entity';
        await runAgentAction('explain_entity', { entityNeid: selectedEntity.value.neid });
        activeAction.value = null;
    }

    function renderMarkdown(text: string): string {
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    }

    function citationColor(type: string): string {
        const colors: Record<string, string> = {
            entity: 'success',
            event: 'warning',
            document: 'info',
            relationship: 'secondary',
        };
        return colors[type] ?? 'grey';
    }

    function citationIcon(type: string): string {
        const icons: Record<string, string> = {
            entity: 'mdi-circle-outline',
            event: 'mdi-calendar',
            document: 'mdi-file-pdf-box',
            relationship: 'mdi-link-variant',
        };
        return icons[type] ?? 'mdi-tag';
    }
</script>

<style scoped>
    .agent-output {
        padding: 12px;
        border-radius: 8px;
        background: rgba(255, 159, 10, 0.05);
        border: 1px solid rgba(255, 159, 10, 0.15);
        line-height: 1.6;
    }
</style>
