<template>
    <div class="workflow-shell">
        <div class="workflow-grid">
            <template v-for="(node, index) in pipelineNodes" :key="node.id">
                <div
                    class="workflow-node"
                    :class="{ 'workflow-node--output': node.type === 'output' }"
                    :style="nodeCardStyle(node)"
                >
                    <div class="node-header d-flex align-center justify-space-between ga-2">
                        <div class="d-flex align-center ga-2">
                            <v-avatar
                                v-if="node.type !== 'output'"
                                :color="node.color"
                                variant="tonal"
                                size="30"
                            >
                                <v-icon size="16">{{ node.icon }}</v-icon>
                            </v-avatar>
                            <v-avatar v-else color="primary" variant="tonal" size="30">
                                <v-icon size="16">mdi-tray-arrow-down</v-icon>
                            </v-avatar>
                            <div>
                                <div class="text-subtitle-2">{{ node.title }}</div>
                                <div class="text-caption text-medium-emphasis">{{ node.role }}</div>
                            </div>
                        </div>
                        <div class="state-indicator">
                            <v-progress-circular
                                v-if="node.status === 'working'"
                                indeterminate
                                size="16"
                                width="2"
                                color="primary"
                            />
                            <v-icon
                                v-else-if="node.status === 'completed'"
                                size="16"
                                color="success"
                                icon="mdi-check-circle"
                            />
                            <span v-else class="state-dot" />
                        </div>
                    </div>
                    <div v-if="stepElapsed(node.id)" class="mt-1">
                        <v-chip size="x-small" variant="tonal" color="primary">
                            {{ stepElapsed(node.id) }}
                        </v-chip>
                    </div>

                    <div class="text-body-2 mt-3">{{ node.description }}</div>

                    <div
                        v-if="nodeActivity[node.id]"
                        class="activity-snippet mt-2"
                        :class="`activity-snippet--${node.id}`"
                    >
                        <div class="d-flex align-start justify-space-between ga-2">
                            <div class="text-caption">{{ nodeActivity[node.id]?.line1 }}</div>
                        </div>
                        <div
                            v-if="nodeActivity[node.id]?.line2"
                            class="text-caption text-medium-emphasis mt-1"
                        >
                            {{ nodeActivity[node.id]?.line2 }}
                        </div>
                        <ul
                            v-if="nodeActivity[node.id]?.examples?.length"
                            class="activity-examples text-caption mt-1"
                        >
                            <li v-for="example in nodeActivity[node.id]?.examples" :key="example">
                                {{ example }}
                            </li>
                        </ul>
                    </div>

                    <div v-if="node.type !== 'output'" class="mt-3">
                        <div class="text-caption text-medium-emphasis mb-1">Graph inputs</div>
                        <div class="input-grid">
                            <div
                                v-for="asset in node.assets"
                                :key="asset.id"
                                class="asset-chip"
                                :class="{ 'asset-chip--active': asset.active }"
                            >
                                <v-icon size="13" :icon="asset.icon" />
                                <span>{{ asset.label }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="produces-row mt-3">
                        <span class="text-caption text-medium-emphasis">Produces</span>
                        <span class="text-body-2">{{ node.produces }}</span>
                    </div>

                    <div v-if="traceByNode[node.id]?.length" class="trace-stream mt-3">
                        <div class="text-caption text-medium-emphasis mb-1">Live trace</div>
                        <div class="trace-list">
                            <div
                                v-for="trace in traceByNode[node.id]"
                                :key="trace.id"
                                class="trace-line text-caption"
                            >
                                <span class="trace-time">
                                    {{ new Date(trace.timestamp).toLocaleTimeString() }}
                                </span>
                                <span
                                    class="trace-message"
                                    :class="{
                                        'trace-message--typing': isActiveTypedTrace(
                                            node.id,
                                            trace.id
                                        ),
                                    }"
                                >
                                    {{ renderedTraceMessage(node.id, trace) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    v-if="index < pipelineNodes.length - 1"
                    class="connector-cell d-flex align-center justify-center"
                >
                    <div class="connector d-flex align-center ga-1 text-medium-emphasis">
                        <v-icon size="16" icon="mdi-chevron-right" />
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type {
        AgentPipelineStep,
        AgentRunDetails,
        AgentTraceEntry,
    } from '~/utils/agentPipeline';
    import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

    type NodeStatus = 'idle' | 'working' | 'completed';

    interface GraphAssetChip {
        id: string;
        label: string;
        icon: string;
        active: boolean;
    }

    interface PipelineNode {
        id: string;
        type: 'agent' | 'output';
        title: string;
        role: string;
        description: string;
        produces: string;
        icon?: string;
        color?: string;
        accentRgb: string;
        status: NodeStatus;
        assets: GraphAssetChip[];
    }

    const props = defineProps<{
        steps: AgentPipelineStep[];
        runDetails: AgentRunDetails;
        traceEntries?: AgentTraceEntry[];
    }>();

    const statusByLabel = computed(() => {
        const map = new Map<string, NodeStatus>();
        props.steps.forEach((step) => {
            map.set(
                step.label,
                step.status === 'pending' ? 'idle' : (step.status as Exclude<NodeStatus, 'idle'>)
            );
        });
        return map;
    });

    const pipelineNodes = computed<PipelineNode[]>(() => [
        {
            id: 'planning',
            type: 'agent',
            title: 'Planning Agent',
            role: 'Strategy and task scoping',
            description:
                'Interprets intent and decides retrieval strategy against this collection.',
            produces: 'Retrieval plan',
            icon: 'mdi-head-question',
            color: 'deep-purple',
            accentRgb: '130, 86, 255',
            status: statusByLabel.value.get('Planning Agent') ?? 'idle',
            assets: [
                { id: 'scope', label: 'Scope', icon: 'mdi-target', active: true },
                { id: 'task', label: 'Task Type', icon: 'mdi-format-list-bulleted', active: true },
                { id: 'stats', label: 'Graph Stats', icon: 'mdi-chart-bar', active: true },
                { id: 'docs', label: 'Sources', icon: 'mdi-file-document', active: false },
            ],
        },
        {
            id: 'context',
            type: 'agent',
            title: 'Context Agent',
            role: 'Knowledge graph retrieval',
            description:
                'Pulls relevant entities, events, relationships, and source documents to build evidence.',
            produces: 'Evidence bundle',
            icon: 'mdi-database-search',
            color: 'teal',
            accentRgb: '44, 188, 168',
            status: statusByLabel.value.get('Context Agent') ?? 'idle',
            assets: [
                { id: 'entities', label: 'Entities', icon: 'mdi-domain', active: true },
                {
                    id: 'relationships',
                    label: 'Relationships',
                    icon: 'mdi-link-variant',
                    active: true,
                },
                { id: 'events', label: 'Events', icon: 'mdi-calendar-star', active: true },
                { id: 'sources', label: 'Source Docs', icon: 'mdi-file-document', active: true },
                {
                    id: 'temporal',
                    label: 'Temporal',
                    icon: 'mdi-chart-timeline-variant',
                    active: true,
                },
            ],
        },
        {
            id: 'composition',
            type: 'agent',
            title: 'Composition Agent',
            role: 'Grounded synthesis',
            description: 'Transforms evidence into a concise response with confidence framing.',
            produces: 'Grounded response',
            icon: 'mdi-file-document-edit-outline',
            color: 'amber-darken-2',
            accentRgb: '245, 173, 65',
            status: statusByLabel.value.get('Composition Agent') ?? 'idle',
            assets: [
                { id: 'evidence', label: 'Evidence Set', icon: 'mdi-text-box-check', active: true },
                { id: 'confidence', label: 'Confidence', icon: 'mdi-shield-check', active: true },
                { id: 'sources', label: 'Source Links', icon: 'mdi-link-box', active: true },
            ],
        },
        {
            id: 'output',
            type: 'output',
            title: 'Output Artifact',
            role: 'User-facing result',
            description: 'Briefs, gap reports, anchor recommendations, and grounded answers.',
            produces: 'Action-ready artifact',
            accentRgb: '96, 165, 250',
            status:
                statusByLabel.value.get('Composition Agent') === 'completed' ? 'completed' : 'idle',
            assets: [],
        },
    ]);

    interface NodeActivitySnippet {
        line1: string;
        line2?: string;
        examples?: string[];
    }

    const nodeActivity = computed(() => {
        const planningStatus = statusByLabel.value.get('Planning Agent') ?? 'idle';
        const contextStatus = statusByLabel.value.get('Context Agent') ?? 'idle';
        const compositionStatus = statusByLabel.value.get('Composition Agent') ?? 'idle';
        const planningDetail = props.runDetails.planning;
        const contextDetail = props.runDetails.context;
        const compositionDetail = props.runDetails.composition;

        return {
            planning:
                planningStatus === 'working'
                    ? ({
                          line1: 'Interpreting your question and selecting retrieval strategy.',
                          line2: planningDetail?.requestedEvidenceExamples?.length
                              ? `Draft evidence targets: ${planningDetail.requestedEvidenceExamples.join(' | ')}`
                              : undefined,
                      } satisfies NodeActivitySnippet)
                    : planningDetail && planningStatus === 'completed'
                      ? {
                            line1: `Intent: ${planningDetail.intent}`,
                            line2: planningDetail.requestedEvidenceExamples?.length
                                ? `Evidence targets: ${planningDetail.requestedEvidenceExamples.join(' | ')}`
                                : `Evidence targets: ${planningDetail.requestedEvidence.slice(0, 3).join(' | ')}`,
                            examples: planningDetail.focusEntityNames?.length
                                ? planningDetail.focusEntityNames
                                      .slice(0, 3)
                                      .map((name) => `Focus entity: ${name}`)
                                : undefined,
                        }
                      : null,
            context:
                contextStatus === 'working'
                    ? ({
                          line1: 'Querying graph for entities, relationships, events, and profile fields.',
                          line2: planningDetail?.requestedEvidenceExamples?.length
                              ? `Retrieval focus: ${planningDetail.requestedEvidenceExamples.join(' | ')}`
                              : undefined,
                      } satisfies NodeActivitySnippet)
                    : contextDetail && contextStatus === 'completed'
                      ? {
                            line1: `Retrieved ${contextDetail.stats.entityCount} entities, ${contextDetail.stats.eventCount} events, ${contextDetail.stats.relationshipCount} relationships.`,
                            line2: contextDetail.propertyFocus?.length
                                ? `Properties checked: ${contextDetail.propertyFocus
                                      .slice(0, 4)
                                      .join(', ')}`
                                : undefined,
                            examples: [
                                ...(contextDetail.topEntityNames.length
                                    ? [
                                          `Entity examples: ${contextDetail.topEntityNames
                                              .slice(0, 3)
                                              .join(', ')}`,
                                      ]
                                    : []),
                                ...(contextDetail.topEventNames?.length
                                    ? [
                                          `Event examples: ${contextDetail.topEventNames
                                              .slice(0, 2)
                                              .join(', ')}`,
                                      ]
                                    : []),
                                ...(contextDetail.propertyEvidenceExamples?.slice(0, 2) ?? []),
                            ],
                        }
                      : null,
            composition:
                compositionStatus === 'working'
                    ? {
                          line1: compositionDetail?.question
                              ? `Assembling answer for: "${compositionDetail.question.slice(0, 110)}${compositionDetail.question.length > 110 ? '…' : ''}"`
                              : 'Composing grounded answer from assembled evidence...',
                          line2: compositionDetail?.assembledFrom
                              ? `Using ${compositionDetail.assembledFrom.entityCount} entities, ${compositionDetail.assembledFrom.eventCount} events, ${compositionDetail.assembledFrom.relationshipCount} relationships, ${compositionDetail.assembledFrom.evidenceLineCount} evidence lines.`
                              : undefined,
                          examples: compositionDetail?.evidencePreview?.slice(0, 2),
                      }
                    : compositionDetail && compositionStatus === 'completed'
                      ? {
                            line1: compositionDetail.question
                                ? `Answer assembled for: "${compositionDetail.question.slice(0, 95)}${compositionDetail.question.length > 95 ? '…' : ''}"`
                                : compositionDetail.outputPreview
                                  ? compositionDetail.outputPreview.slice(0, 120)
                                  : 'Generated grounded response.',
                            line2: compositionDetail.outputPreview
                                ? `Preview: ${compositionDetail.outputPreview.slice(0, 120)}${compositionDetail.outputPreview.length > 120 ? '…' : ''}`
                                : undefined,
                            examples: compositionDetail.evidencePreview?.slice(0, 2),
                        }
                      : null,
            output:
                compositionDetail && compositionStatus === 'completed'
                    ? {
                          line1: compositionDetail.outputPreview
                              ? `Answer: ${compositionDetail.outputPreview.slice(0, 120)}${compositionDetail.outputPreview.length > 120 ? '…' : ''}`
                              : 'Answer ready.',
                          line2: `Grounded with ${compositionDetail.citationCount} citations and ${compositionDetail.outputLength} characters.`,
                          examples: compositionDetail.evidencePreview?.slice(0, 2),
                      }
                    : null,
        } as Record<string, NodeActivitySnippet | null>;
    });

    type WorkflowVisualPreset = 'subtle' | 'cinematic';

    interface WorkflowVisualProfile {
        typingIntervalMs: number;
        typingCharsPerTick: number;
        borderAlpha: number;
        tintPrimaryAlpha: number;
        tintSecondaryAlpha: number;
        glowAlpha: number;
        shadowBase: string;
        shadowHover: string;
        hoverTranslateY: number;
    }

    const WORKFLOW_VISUAL_PROFILES: Record<WorkflowVisualPreset, WorkflowVisualProfile> = {
        subtle: {
            typingIntervalMs: 55,
            typingCharsPerTick: 1,
            borderAlpha: 0.58,
            tintPrimaryAlpha: 0.16,
            tintSecondaryAlpha: 0.05,
            glowAlpha: 0.2,
            shadowBase: '0 14px 30px -20px',
            shadowHover: '0 18px 36px -20px',
            hoverTranslateY: -1,
        },
        cinematic: {
            typingIntervalMs: 42,
            typingCharsPerTick: 2,
            borderAlpha: 0.72,
            tintPrimaryAlpha: 0.24,
            tintSecondaryAlpha: 0.09,
            glowAlpha: 0.34,
            shadowBase: '0 18px 42px -18px',
            shadowHover: '0 24px 54px -18px',
            hoverTranslateY: -2,
        },
    };

    // Flip this one value to change the workflow's animation/style profile.
    const ACTIVE_WORKFLOW_PRESET: WorkflowVisualPreset = 'subtle';
    const activeVisualProfile = WORKFLOW_VISUAL_PROFILES[ACTIVE_WORKFLOW_PRESET];

    const nowMs = ref(Date.now());
    const typedTraceLengths = ref<Record<string, number>>({});
    const activeTypedTraceByNode = ref<Record<string, string | null>>({
        planning: null,
        context: null,
        composition: null,
        output: null,
    });
    let ticker: ReturnType<typeof setInterval> | null = null;

    onMounted(() => {
        ticker = setInterval(() => {
            nowMs.value = Date.now();
            Object.entries(activeTypedTraceByNode.value).forEach(([nodeId, traceId]) => {
                if (!traceId) return;
                const trace = traceByNode.value[nodeId]?.find((entry) => entry.id === traceId);
                if (!trace) return;
                const currentLength = typedTraceLengths.value[traceId] ?? 0;
                if (currentLength >= trace.message.length) return;
                typedTraceLengths.value = {
                    ...typedTraceLengths.value,
                    [traceId]: Math.min(
                        trace.message.length,
                        currentLength + activeVisualProfile.typingCharsPerTick
                    ),
                };
            });
        }, activeVisualProfile.typingIntervalMs);
    });

    onBeforeUnmount(() => {
        if (ticker) clearInterval(ticker);
    });

    function formatDuration(ms: number): string {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
        const minutes = Math.floor(ms / 60_000);
        const seconds = Math.floor((ms % 60_000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    const stepByNodeId = computed<Record<string, AgentPipelineStep | undefined>>(() => ({
        planning: props.steps.find((step) => step.label === 'Planning Agent'),
        context: props.steps.find((step) => step.label === 'Context Agent'),
        composition: props.steps.find((step) => step.label === 'Composition Agent'),
        output: undefined,
    }));

    function stepElapsed(nodeId: string): string | null {
        const step = stepByNodeId.value[nodeId];
        if (!step) return null;
        if (step.status === 'working' && step.startedAtMs) {
            return formatDuration(Math.max(0, nowMs.value - step.startedAtMs));
        }
        if (step.status === 'completed' && step.durationMs !== undefined) {
            return formatDuration(step.durationMs);
        }
        return null;
    }

    const traceByNode = computed<Record<string, AgentTraceEntry[]>>(() => {
        const entries = props.traceEntries ?? [];
        const buckets: Record<string, AgentTraceEntry[]> = {
            planning: [],
            context: [],
            composition: [],
            output: [],
        };
        entries.forEach((entry) => {
            if (entry.agent === 'planning') buckets.planning.push(entry);
            if (entry.agent === 'context') buckets.context.push(entry);
            if (entry.agent === 'composition') buckets.composition.push(entry);
            if (entry.agent === 'system') buckets.output.push(entry);
        });
        return {
            planning: buckets.planning.slice(-3),
            context: buckets.context.slice(-3),
            composition: buckets.composition.slice(-3),
            output: buckets.output.slice(-3),
        };
    });

    watch(
        traceByNode,
        (buckets) => {
            (Object.keys(buckets) as Array<keyof typeof buckets>).forEach((nodeId) => {
                const latest = buckets[nodeId][buckets[nodeId].length - 1];
                if (!latest) return;
                if (activeTypedTraceByNode.value[nodeId] === latest.id) return;
                activeTypedTraceByNode.value = {
                    ...activeTypedTraceByNode.value,
                    [nodeId]: latest.id,
                };
                typedTraceLengths.value = {
                    ...typedTraceLengths.value,
                    [latest.id]: 0,
                };
            });
        },
        { immediate: true }
    );

    function isActiveTypedTrace(nodeId: string, traceId: string): boolean {
        return activeTypedTraceByNode.value[nodeId] === traceId;
    }

    function renderedTraceMessage(nodeId: string, trace: AgentTraceEntry): string {
        if (!isActiveTypedTrace(nodeId, trace.id)) return trace.message;
        const typedLength = typedTraceLengths.value[trace.id] ?? 0;
        if (typedLength >= trace.message.length) return trace.message;
        return `${trace.message.slice(0, typedLength)}▌`;
    }

    function nodeCardStyle(node: PipelineNode): Record<string, string> {
        return {
            '--node-rgb': node.accentRgb,
            '--node-border': `rgba(${node.accentRgb}, ${activeVisualProfile.borderAlpha})`,
            '--node-bg-1': `rgba(${node.accentRgb}, ${activeVisualProfile.tintPrimaryAlpha})`,
            '--node-bg-2': `rgba(${node.accentRgb}, ${activeVisualProfile.tintSecondaryAlpha})`,
            '--node-glow': `rgba(${node.accentRgb}, ${activeVisualProfile.glowAlpha})`,
            '--node-shadow-base': activeVisualProfile.shadowBase,
            '--node-shadow-hover': activeVisualProfile.shadowHover,
            '--node-hover-translate-y': `${activeVisualProfile.hoverTranslateY}px`,
        };
    }
</script>

<style scoped>
    .workflow-shell {
        border: 1px solid var(--app-divider);
        border-radius: 12px;
        background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--app-surface) 92%, white 8%),
            var(--app-surface)
        );
        padding: 14px;
    }

    .workflow-grid {
        display: grid;
        grid-template-columns:
            minmax(0, 1fr)
            22px
            minmax(0, 1fr)
            22px
            minmax(0, 1fr)
            22px
            minmax(0, 1fr);
        gap: 12px;
    }

    .workflow-node {
        position: relative;
        border: 1px solid var(--node-border, var(--app-divider));
        border-radius: 10px;
        padding: 14px;
        background: linear-gradient(
            165deg,
            var(--node-bg-1, color-mix(in srgb, var(--app-surface) 97%, white 3%)) 0%,
            var(--node-bg-2, color-mix(in srgb, var(--app-surface) 92%, white 8%)) 100%
        );
        box-shadow:
            0 0 0 1px color-mix(in srgb, var(--node-border, var(--app-divider)) 30%, transparent),
            var(--node-shadow-base, 0 14px 30px -20px) var(--node-glow, transparent);
        transition:
            box-shadow 0.2s ease,
            border-color 0.2s ease,
            transform 0.2s ease;
    }

    .workflow-node:hover {
        transform: translateY(var(--node-hover-translate-y, -1px));
        box-shadow:
            0 0 0 1px color-mix(in srgb, var(--node-border, var(--app-divider)) 36%, transparent),
            var(--node-shadow-hover, 0 18px 36px -20px) var(--node-glow, transparent);
    }

    .workflow-node--output {
        background: linear-gradient(
            165deg,
            var(--node-bg-1, color-mix(in srgb, var(--app-surface) 95%, var(--v-theme-primary) 5%))
                0%,
            var(--node-bg-2, color-mix(in srgb, var(--app-surface) 90%, var(--v-theme-primary) 10%))
                100%
        );
    }

    .state-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
        background: color-mix(in srgb, var(--v-theme-on-surface) 45%, transparent 55%);
    }

    .input-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .asset-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid var(--app-divider);
        color: var(--dynamic-text-muted);
        font-size: 0.72rem;
        line-height: 1.2;
    }

    .asset-chip--active {
        color: var(--dynamic-text-primary);
        border-color: color-mix(in srgb, var(--v-theme-primary) 45%, var(--app-divider));
        background: color-mix(in srgb, var(--v-theme-primary) 12%, transparent);
    }

    .activity-snippet {
        border-left: 2px solid var(--app-divider-strong);
        border-radius: 6px;
        padding: 6px 8px;
        background: color-mix(in srgb, var(--app-surface) 84%, white 16%);
    }

    .activity-examples {
        margin: 0;
        padding-left: 16px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .activity-snippet--planning {
        border-left-color: rgba(var(--v-theme-primary), 0.5);
    }

    .activity-snippet--context {
        border-left-color: color-mix(in srgb, var(--v-theme-info) 70%, var(--app-divider));
    }

    .activity-snippet--composition {
        border-left-color: color-mix(in srgb, var(--v-theme-warning) 70%, var(--app-divider));
    }

    .produces-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .trace-stream {
        border-top: 1px dashed var(--app-divider);
        padding-top: 8px;
    }

    .trace-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 88px;
        overflow-y: auto;
    }

    .trace-line {
        display: flex;
        gap: 6px;
        color: var(--dynamic-text-secondary);
        line-height: 1.3;
    }

    .trace-message {
        overflow-wrap: anywhere;
    }

    .trace-message--typing {
        color: var(--dynamic-text-primary);
    }

    .trace-time {
        color: var(--dynamic-text-muted);
        font-family:
            ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
            monospace;
        flex-shrink: 0;
    }

    .connector-cell {
        min-width: 22px;
    }

    .connector {
        white-space: nowrap;
        opacity: 0.7;
    }

    @media (max-width: 1240px) {
        .workflow-grid {
            grid-template-columns: 1fr;
            gap: 12px;
        }

        .connector-cell {
            min-width: 0;
            justify-content: flex-start !important;
            padding-left: 8px;
        }

        .connector :deep(.v-icon) {
            transform: rotate(90deg);
        }
    }
</style>
