<template>
    <v-card>
        <v-card-item>
            <v-card-title class="text-body-1">Live Run / Last Run</v-card-title>
            <v-card-subtitle>
                Track what each agent decided, retrieved, and produced.
            </v-card-subtitle>
        </v-card-item>
        <v-card-text class="d-flex flex-column ga-4">
            <SummaryAgentSteps :steps="steps" />

            <v-expansion-panels v-if="hasDetails" variant="accordion">
                <v-expansion-panel v-if="runDetails.planning">
                    <v-expansion-panel-title>Planning Agent details</v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <div class="text-body-2 mb-2">
                            <strong>Intent:</strong> {{ runDetails.planning.intent }}
                        </div>
                        <div class="text-body-2 mb-2">
                            <strong>Answer style:</strong> {{ runDetails.planning.answerStyle }}
                        </div>
                        <div
                            v-if="runDetails.planning.focusEntityNeids.length"
                            class="text-body-2 mb-2"
                        >
                            <strong>Focus entities:</strong>
                            {{ runDetails.planning.focusEntityNeids.join(', ') }}
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
                    <v-expansion-panel-title>Context Agent details</v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <div class="d-flex ga-2 flex-wrap mb-2">
                            <v-chip size="x-small" variant="tonal">
                                {{ runDetails.context.stats.documentCount }} docs
                            </v-chip>
                            <v-chip size="x-small" variant="tonal">
                                {{ runDetails.context.stats.entityCount }} entities
                            </v-chip>
                            <v-chip size="x-small" variant="tonal">
                                {{ runDetails.context.stats.eventCount }} events
                            </v-chip>
                            <v-chip size="x-small" variant="tonal">
                                {{ runDetails.context.stats.relationshipCount }} relationships
                            </v-chip>
                        </div>
                        <div class="text-body-2 mb-2">
                            <strong>Evidence lines assembled:</strong>
                            {{ runDetails.context.evidenceLineCount }}
                        </div>
                        <div class="text-body-2 mb-2">
                            <strong>Profile evidence retrieved:</strong>
                            {{ runDetails.context.hasProfileEvidence ? 'yes' : 'no' }}
                        </div>
                        <div
                            v-if="runDetails.context.topEntityNames.length"
                            class="text-body-2 mb-2"
                        >
                            <strong>Top entities used:</strong>
                            {{ runDetails.context.topEntityNames.join(', ') }}
                        </div>
                        <div class="text-body-2 mb-1"><strong>Tooling surface:</strong></div>
                        <div class="d-flex ga-1 flex-wrap">
                            <v-chip
                                v-for="tool in runDetails.context.toolsUsed"
                                :key="tool"
                                size="x-small"
                                color="teal"
                                variant="outlined"
                            >
                                {{ tool }}
                            </v-chip>
                        </div>
                    </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel v-if="runDetails.composition">
                    <v-expansion-panel-title>Composition Agent details</v-expansion-panel-title>
                    <v-expansion-panel-text>
                        <div class="text-body-2 mb-2">
                            <strong>Citations:</strong> {{ runDetails.composition.citationCount }}
                        </div>
                        <div class="text-body-2 mb-2">
                            <strong>Output length:</strong>
                            {{ runDetails.composition.outputLength }}
                            characters
                        </div>
                        <div class="text-body-2 mb-2">
                            <strong>Source:</strong>
                            {{ runDetails.composition.generationSource || 'gateway' }}
                        </div>
                        <div v-if="runDetails.composition.outputPreview" class="text-body-2">
                            <strong>Preview:</strong>
                            {{ runDetails.composition.outputPreview }}
                        </div>
                    </v-expansion-panel-text>
                </v-expansion-panel>
            </v-expansion-panels>

            <v-alert v-if="result?.generationNote" density="compact" variant="tonal" type="info">
                {{ result.generationNote }}
            </v-alert>

            <div v-if="result?.output" class="agent-result">
                <div class="text-subtitle-2 mb-2">Final answer</div>
                <div class="text-body-2 result-copy">{{ result.output }}</div>
                <div v-if="result.citations?.length" class="mt-3">
                    <div class="text-caption text-medium-emphasis mb-1">Citations</div>
                    <div class="d-flex ga-1 flex-wrap">
                        <v-chip
                            v-for="citation in result.citations"
                            :key="`${citation.type}:${citation.neid}`"
                            size="x-small"
                            variant="outlined"
                        >
                            {{ citation.type }}: {{ citation.label }}
                        </v-chip>
                    </div>
                </div>
            </div>

            <div v-else-if="!loading" class="text-body-2 text-medium-emphasis">
                Run an action to see live details and the final grounded answer.
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type {
        AgentPipelineStep,
        AgentRunDetails,
        AskYottaPipelineResponse,
    } from '~/utils/agentPipeline';

    const props = defineProps<{
        steps: AgentPipelineStep[];
        runDetails: AgentRunDetails;
        result: AskYottaPipelineResponse | null;
        loading: boolean;
    }>();

    const hasDetails = computed(
        () =>
            !!(
                props.runDetails.planning ||
                props.runDetails.context ||
                props.runDetails.composition
            )
    );
</script>

<style scoped>
    .agent-result {
        border: 1px solid var(--app-divider);
        border-radius: 10px;
        padding: 12px;
    }

    .result-copy {
        white-space: pre-wrap;
    }
</style>
