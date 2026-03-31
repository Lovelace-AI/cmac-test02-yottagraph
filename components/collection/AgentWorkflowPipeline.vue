<template>
    <div class="workflow-shell">
        <div class="workflow-grid">
            <template v-for="(node, index) in pipelineNodes" :key="node.id">
                <div
                    class="workflow-node"
                    :class="{ 'workflow-node--output': node.type === 'output' }"
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

                    <div class="text-body-2 mt-3">{{ node.description }}</div>

                    <div
                        v-if="node.type !== 'output' && nodeActivity[node.id]"
                        class="activity-snippet mt-2"
                        :class="`activity-snippet--${node.id}`"
                    >
                        <div class="d-flex align-start justify-space-between ga-2">
                            <div class="text-caption">{{ nodeActivity[node.id]?.line1 }}</div>
                            <v-chip
                                v-if="nodeActivity[node.id]?.badge"
                                size="x-small"
                                variant="tonal"
                                class="flex-shrink-0"
                            >
                                {{ nodeActivity[node.id]?.badge }}
                            </v-chip>
                        </div>
                        <div
                            v-if="nodeActivity[node.id]?.line2"
                            class="text-caption text-medium-emphasis mt-1"
                        >
                            {{ nodeActivity[node.id]?.line2 }}
                        </div>
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
                </div>

                <div
                    v-if="index < pipelineNodes.length - 1"
                    class="connector-cell d-flex align-center justify-center"
                >
                    <div class="connector d-flex align-center ga-1 text-medium-emphasis">
                        <span class="text-caption">{{ connectorLabels[index] }}</span>
                        <v-icon size="16">mdi-chevron-right</v-icon>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { AgentPipelineStep, AgentRunDetails } from '~/utils/agentPipeline';

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
        status: NodeStatus;
        assets: GraphAssetChip[];
    }

    const props = defineProps<{
        steps: AgentPipelineStep[];
        runDetails: AgentRunDetails;
    }>();

    const connectorLabels = ['plan', 'evidence', 'grounded output'];

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
            status:
                statusByLabel.value.get('Composition Agent') === 'completed' ? 'completed' : 'idle',
            assets: [],
        },
    ]);

    const nodeActivity = computed(() => {
        const planningStatus = statusByLabel.value.get('Planning Agent') ?? 'idle';
        const contextStatus = statusByLabel.value.get('Context Agent') ?? 'idle';
        const compositionStatus = statusByLabel.value.get('Composition Agent') ?? 'idle';

        return {
            planning:
                planningStatus === 'working'
                    ? { line1: 'Interpreting your question and selecting strategy.' }
                    : props.runDetails.planning && planningStatus === 'completed'
                      ? {
                            line1: `Intent: ${props.runDetails.planning.intent}`,
                            badge: props.runDetails.planning.answerStyle,
                        }
                      : null,
            context:
                contextStatus === 'working'
                    ? { line1: 'Querying knowledge graph for relevant evidence...' }
                    : props.runDetails.context && contextStatus === 'completed'
                      ? {
                            line1: `Retrieved ${props.runDetails.context.stats.entityCount} entities, ${props.runDetails.context.stats.eventCount} events, ${props.runDetails.context.stats.relationshipCount} relationships.`,
                            line2: props.runDetails.context.topEntityNames.length
                                ? `Top entities: ${props.runDetails.context.topEntityNames.slice(0, 3).join(', ')}`
                                : undefined,
                            badge: `${props.runDetails.context.evidenceLineCount} evidence lines`,
                        }
                      : null,
            composition:
                compositionStatus === 'working'
                    ? { line1: 'Composing grounded answer from assembled evidence...' }
                    : props.runDetails.composition && compositionStatus === 'completed'
                      ? {
                            line1: props.runDetails.composition.outputPreview
                                ? props.runDetails.composition.outputPreview.slice(0, 120)
                                : 'Generated grounded response.',
                            badge: `${props.runDetails.composition.citationCount} citations`,
                        }
                      : null,
            output: null,
        };
    });
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
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(
                0,
                1fr
            );
        gap: 10px;
    }

    .workflow-node {
        position: relative;
        border: 1px solid var(--app-divider);
        border-radius: 10px;
        padding: 12px;
        background: color-mix(in srgb, var(--app-surface) 95%, white 5%);
    }

    .workflow-node--output {
        background: color-mix(in srgb, var(--app-surface) 92%, var(--v-theme-primary) 8%);
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
        background: color-mix(in srgb, var(--app-surface) 88%, white 12%);
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

    .connector-cell {
        min-width: 56px;
    }

    .connector {
        white-space: nowrap;
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
