<template>
    <div class="output-panel d-flex flex-column ga-3">
        <div class="d-flex align-center justify-space-between ga-2">
            <div class="text-subtitle-2 font-weight-bold">Output Preview</div>
            <v-chip size="x-small" :color="stateChip.color" variant="tonal">
                {{ stateChip.label }}
            </v-chip>
        </div>

        <template v-if="isEmpty">
            <div class="text-body-2 text-medium-emphasis">
                Run an action to generate a grounded output from entities, events, relationships,
                and source documents in this collection.
            </div>
            <div class="d-flex flex-column ga-1">
                <button
                    v-for="prompt in emptyPrompts"
                    :key="prompt"
                    type="button"
                    class="example-link"
                    @click="$emit('use-prompt', prompt)"
                >
                    {{ prompt }}
                </button>
            </div>
        </template>

        <template v-else>
            <SummaryAgentSteps :steps="stepsForPanel" />

            <v-expansion-panels v-if="hasDetails" variant="accordion">
                <v-expansion-panel v-if="runDetails.planning">
                    <v-expansion-panel-title>Planning decisions</v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <div class="text-body-2 mb-2">
                            <strong>Intent:</strong> {{ runDetails.planning.intent }}
                        </div>
                        <div class="text-body-2 mb-2">
                            <strong>Answer style:</strong> {{ runDetails.planning.answerStyle }}
                        </div>
                        <div class="text-body-2 mb-1"><strong>Requested evidence:</strong></div>
                        <ul class="pl-4 text-body-2">
                            <li
                                v-for="line in runDetails.planning.requestedEvidence"
                                :key="line"
                                class="mb-1"
                            >
                                {{ line }}
                            </li>
                        </ul>
                    </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="runDetails.context">
                    <v-expansion-panel-title>Graph retrieval details</v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <div class="d-flex ga-2 flex-wrap mb-2">
                            <v-chip size="x-small" variant="tonal">
                                {{ runDetails.context.stats.entityCount }} entities
                            </v-chip>
                            <v-chip size="x-small" variant="tonal">
                                {{ runDetails.context.stats.eventCount }} events
                            </v-chip>
                            <v-chip size="x-small" variant="tonal">
                                {{ runDetails.context.stats.relationshipCount }} relationships
                            </v-chip>
                            <v-chip size="x-small" variant="tonal">
                                {{ runDetails.context.stats.documentCount }} docs
                            </v-chip>
                        </div>
                        <div class="text-body-2 mb-2">
                            <strong>Evidence lines assembled:</strong>
                            {{ runDetails.context.evidenceLineCount }}
                        </div>
                        <div class="text-body-2">
                            <strong>Top entities used:</strong>
                            {{ runDetails.context.topEntityNames.join(', ') || 'N/A' }}
                        </div>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>

            <div v-if="result?.output" class="result-shell">
                <div class="text-subtitle-2 mb-2">Generated artifact</div>
                <div class="text-body-2 result-copy">{{ result.output }}</div>

                <div class="meta-row d-flex flex-wrap ga-2 mt-3">
                    <v-chip size="x-small" variant="tonal">
                        Source: {{ result.generationSource || 'gateway' }}
                    </v-chip>
                    <v-chip size="x-small" variant="tonal">
                        Citations: {{ result.citations?.length || 0 }}
                    </v-chip>
                    <v-chip size="x-small" variant="tonal">
                        Evidence lines: {{ result.evidenceLines?.length || 0 }}
                    </v-chip>
                </div>

                <div v-if="result.citations?.length" class="mt-3">
                    <div class="text-caption text-medium-emphasis mb-1">Sources</div>
                    <div class="d-flex ga-1 flex-wrap">
                        <v-chip
                            v-for="citation in result.citations"
                            :key="`${citation.type}:${citation.neid}`"
                            size="x-small"
                            variant="outlined"
                        >
                            {{ citation.label }}
                        </v-chip>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
    import type {
        AgentPipelineStep,
        AgentRunDetails,
        AskYottaPipelineResponse,
    } from '~/utils/agentPipeline';

    const props = defineProps<{
        loading: boolean;
        steps: AgentPipelineStep[];
        runDetails: AgentRunDetails;
        result: AskYottaPipelineResponse | null;
    }>();

    defineEmits<{
        'use-prompt': [prompt: string];
    }>();

    const emptyPrompts = [
        'What changed most across these documents?',
        'Where is evidence incomplete?',
        'Which entities should I investigate first?',
    ];

    const isEmpty = computed(() => !props.loading && !props.result?.output);

    const stepsForPanel = computed(() =>
        props.steps.map((step) => ({
            ...step,
            status: props.loading
                ? step.status
                : step.status === 'pending'
                  ? 'pending'
                  : 'completed',
        }))
    );

    const hasDetails = computed(() => !!(props.runDetails.planning || props.runDetails.context));

    const stateChip = computed(() => {
        if (props.loading) return { label: 'Running', color: 'warning' };
        if (props.result?.output) return { label: 'Completed', color: 'success' };
        return { label: 'Ready', color: 'default' };
    });
</script>

<style scoped>
    .output-panel {
        border: 1px solid var(--app-divider);
        border-radius: 12px;
        padding: 14px;
        background: color-mix(in srgb, var(--app-surface) 96%, white 4%);
        min-height: 360px;
    }

    .example-link {
        text-align: left;
        border: none;
        background: transparent;
        color: var(--dynamic-text-secondary);
        cursor: pointer;
        font-size: 0.85rem;
        padding: 0;
    }

    .example-link:hover {
        color: var(--dynamic-text-primary);
        text-decoration: underline;
    }

    .result-shell {
        border: 1px solid var(--app-divider);
        border-radius: 10px;
        padding: 10px;
        background: color-mix(in srgb, var(--app-surface) 92%, white 8%);
    }

    .result-copy {
        white-space: pre-wrap;
    }
</style>
