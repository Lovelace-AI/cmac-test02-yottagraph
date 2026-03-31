<template>
    <div class="d-flex flex-column fill-height">
        <!-- Header -->
        <div class="workspace-header flex-shrink-0 px-4 pt-3 pb-0">
            <div class="d-flex align-start justify-space-between flex-wrap ga-3 mb-3">
                <div class="workspace-tabs-wrap flex-grow-1">
                    <v-tabs
                        v-model="currentTab"
                        density="compact"
                        color="primary"
                        slider-color="primary"
                        class="workspace-tabs"
                    >
                        <v-tab v-for="tab in tabs" :key="tab.value" :value="tab.value" size="small">
                            <v-icon start size="small">{{ tab.icon }}</v-icon>
                            {{ tab.label }}
                        </v-tab>
                    </v-tabs>
                </div>
                <div class="d-flex align-center ga-2 flex-shrink-0">
                    <v-chip
                        v-if="rebuilding && currentTab !== 'overview'"
                        size="small"
                        color="info"
                        variant="tonal"
                        class="pipeline-inline-chip"
                    >
                        <v-icon start size="12" class="pipeline-inline-chip__spinner">
                            mdi-loading
                        </v-icon>
                        Pipeline running
                    </v-chip>
                    <template v-if="currentTab !== 'overview'">
                        <v-chip
                            size="small"
                            :color="isReady ? 'success' : 'default'"
                            variant="tonal"
                        >
                            {{ isReady ? 'Analysis complete' : 'Analysis pending' }}
                        </v-chip>
                        <v-btn
                            size="small"
                            variant="tonal"
                            prepend-icon="mdi-refresh"
                            :loading="rebuilding"
                            :disabled="rebuilding"
                            @click="handleRebuild"
                        >
                            {{ isReady ? 'Re-run Extraction' : 'Run Initial Analysis' }}
                        </v-btn>
                    </template>
                </div>
            </div>
        </div>

        <!-- Post-rebuild meta bar -->
        <div
            v-if="isReady && !rebuilding && currentTab !== 'overview' && currentTab !== 'graph'"
            class="meta-bar flex-shrink-0 px-4 py-1"
        >
            <div class="workspace-content-shell">
                <SummaryMetaBar
                    :entity-count="primaryMeta.entityCount"
                    :event-count="primaryMeta.eventCount"
                    :relationship-count="primaryMeta.relationshipCount"
                    :property-count="extractedPropertyCount"
                    :property-record-count="propertyBearingRecordCount"
                    :property-series="propertySeries.length"
                />
            </div>
        </div>

        <div class="workspace-main-shell flex-grow-1">
            <div
                class="workspace-scroll-region px-4"
                :class="currentTab === 'overview' ? 'py-2' : 'py-4'"
            >
                <div class="workspace-content-shell">
                    <v-alert
                        v-if="collection.error"
                        type="error"
                        variant="tonal"
                        class="mb-4"
                        closable
                    >
                        {{ collection.error }}
                    </v-alert>
                    <v-alert
                        v-if="
                            !isReady &&
                            !rebuilding &&
                            !collection.error &&
                            currentTab !== 'overview'
                        "
                        type="info"
                        variant="tonal"
                        class="mb-4"
                    >
                        Run initial analysis to extract entities, events, relationships, and
                        evidence-linked summaries from this document collection.
                    </v-alert>

                    <TaskActionStrip
                        v-if="tabQuickActions.length"
                        :actions="tabQuickActions"
                        class="mb-3"
                        @run="runTabQuickAction"
                    />

                    <CollectionOverview v-if="currentTab === 'overview'" />
                    <GraphWorkspace
                        v-else-if="currentTab === 'graph'"
                        key="document-graph-workspace"
                        :initial-source-backed-only="true"
                        :initial-include-context-endpoints="true"
                        :initial-analysis-mode="'centrality'"
                    />
                    <EventsView v-else-if="currentTab === 'events'" />
                    <TimelineComparisonView v-else-if="currentTab === 'timeline'" />
                    <ValidationView v-else-if="currentTab === 'validation'" />
                    <AgentWorkspace
                        v-else-if="currentTab === 'agent'"
                        @launch-question="launchStarterQuestion"
                    />
                    <EnrichmentView
                        v-else-if="currentTab === 'enrichment'"
                        @open-chat="launchStarterQuestion"
                    />
                </div>
            </div>
            <div v-if="showEntityAsDrawer && entityDrawerOpen" class="entity-overlay-layer pa-2">
                <div ref="entityPanelRoot" class="entity-panel-shell entity-panel-shell--desktop">
                    <EventDetailPanel v-if="selectedEvent" />
                    <EntityDetailPanel v-else />
                </div>
            </div>
        </div>

        <v-dialog
            v-if="!showEntityAsDrawer"
            v-model="entityDrawerOpen"
            :fullscreen="entityDialogFullscreen"
            max-width="760"
            scrollable
            class="entity-dialog"
        >
            <div ref="entityPanelRoot" class="entity-dialog-shell entity-panel-shell">
                <EventDetailPanel v-if="selectedEvent" />
                <EntityDetailPanel v-else />
            </div>
        </v-dialog>

        <v-navigation-drawer
            v-if="showChatAsDrawer"
            v-model="chatDrawerOpen"
            location="right"
            width="430"
            temporary
            class="pa-2 chat-overlay-top"
        >
            <v-card class="chat-drawer-card" elevation="0">
                <v-card-item>
                    <v-card-title class="text-body-2 d-flex align-center ga-2">
                        <v-icon size="16" color="warning">mdi-robot</v-icon>
                        Ask Yotta
                        <v-chip size="x-small" variant="tonal">{{ currentTabLabel }}</v-chip>
                    </v-card-title>
                    <v-card-subtitle
                        >Evidence-backed chat scoped to this collection.</v-card-subtitle
                    >
                </v-card-item>
                <v-card-text class="pt-0 chat-content">
                    <div ref="askYottaScrollEl" class="chat-scroll-region">
                        <!-- Starter questions (shown when idle) -->
                        <template v-if="!hasAskYottaTurns && !askYottaLoading">
                            <div class="text-caption text-medium-emphasis mb-2">
                                Starter questions
                            </div>
                            <div class="d-flex flex-wrap ga-1 mb-2">
                                <v-btn
                                    v-for="prompt in askYottaPrompts"
                                    :key="prompt"
                                    size="x-small"
                                    variant="outlined"
                                    :disabled="!isReady || askYottaLoading"
                                    @click="runAskYottaPrompt(prompt)"
                                >
                                    {{ prompt }}
                                </v-btn>
                            </div>
                        </template>

                        <!-- Conversation thread -->
                        <template v-for="(turn, index) in askYottaThread" :key="turn.id">
                            <div class="chat-bubble-row chat-bubble-row--user">
                                <div class="chat-bubble chat-bubble--user text-caption">
                                    {{ turn.question }}
                                </div>
                            </div>

                            <div
                                v-if="turn.steps.length"
                                class="chat-bubble-row chat-bubble-row--assistant mt-2"
                            >
                                <div class="chat-agent-steps">
                                    <SummaryAgentSteps :steps="turn.steps" />
                                </div>
                            </div>

                            <div
                                v-if="turn.answer?.output"
                                class="chat-bubble-row chat-bubble-row--assistant mt-1"
                            >
                                <div
                                    class="chat-bubble chat-bubble--assistant text-caption"
                                    @click="handleOutputClick"
                                    v-html="renderLinkedOutput(turn.answer)"
                                />
                            </div>

                            <div
                                v-if="turn.answer?.generationSource || turn.answer?.usage"
                                class="d-flex align-center ga-1 flex-wrap mt-2"
                            >
                                <v-chip
                                    v-if="askTurnModelLabel(turn)"
                                    size="x-small"
                                    variant="tonal"
                                    color="deep-purple"
                                >
                                    {{ askTurnModelLabel(turn) }}
                                </v-chip>
                                <v-chip
                                    v-if="askTurnTokenLabel(turn)"
                                    size="x-small"
                                    variant="tonal"
                                    color="blue-grey"
                                >
                                    {{ askTurnTokenLabel(turn) }}
                                </v-chip>
                                <v-chip
                                    v-if="turn.answer?.generationSource === 'fallback'"
                                    size="x-small"
                                    variant="tonal"
                                    color="error"
                                >
                                    Gemini fallback
                                </v-chip>
                            </div>
                            <div
                                v-if="
                                    turn.answer?.generationSource === 'fallback' &&
                                    turn.answer?.generationNote
                                "
                                class="text-caption text-error mt-1"
                            >
                                {{ turn.answer.generationNote }}
                            </div>
                            <div v-if="askTurnEvidenceLines(turn).length" class="mt-2">
                                <div class="text-caption text-medium-emphasis mb-1">
                                    Evidence used
                                </div>
                                <div class="d-flex flex-column ga-1">
                                    <div
                                        v-for="line in askTurnEvidenceLines(turn)"
                                        :key="`${turn.id}-${line}`"
                                        class="text-caption text-medium-emphasis"
                                    >
                                        {{ line }}
                                    </div>
                                </div>
                            </div>

                            <div
                                v-if="
                                    index === askYottaThread.length - 1 &&
                                    turn.answer &&
                                    !askYottaLoading
                                "
                                class="d-flex flex-wrap ga-1 mt-3"
                            >
                                <v-btn
                                    v-for="prompt in askYottaPrompts"
                                    :key="prompt"
                                    size="x-small"
                                    variant="outlined"
                                    :disabled="!isReady || askYottaLoading"
                                    @click="runAskYottaPrompt(prompt)"
                                >
                                    {{ prompt }}
                                </v-btn>
                            </div>
                        </template>
                    </div>
                    <div class="chat-composer">
                        <div class="d-flex ga-1">
                            <v-text-field
                                v-model="askYottaQuestion"
                                density="compact"
                                variant="outlined"
                                hide-details
                                placeholder="Ask a question..."
                                :disabled="!isReady || askYottaLoading"
                                @keydown.enter="runAskYottaQuestion"
                            />
                            <v-btn
                                icon
                                size="small"
                                color="primary"
                                :loading="askYottaLoading"
                                :disabled="!isReady || !askYottaQuestion"
                                @click="runAskYottaQuestion"
                            >
                                <v-icon size="18">mdi-send</v-icon>
                            </v-btn>
                        </div>
                    </div>
                </v-card-text>
            </v-card>
        </v-navigation-drawer>

        <v-dialog
            v-else
            v-model="chatDrawerOpen"
            :fullscreen="chatDialogFullscreen"
            max-width="720"
            scrollable
            class="chat-dialog"
        >
            <div class="chat-dialog-shell">
                <v-card class="chat-drawer-card" elevation="0">
                    <v-card-item>
                        <v-card-title class="text-body-2 d-flex align-center ga-2">
                            <v-icon size="16" color="warning">mdi-robot</v-icon>
                            Ask Yotta
                            <v-chip size="x-small" variant="tonal">{{ currentTabLabel }}</v-chip>
                        </v-card-title>
                        <v-card-subtitle
                            >Evidence-backed chat scoped to this collection.</v-card-subtitle
                        >
                    </v-card-item>
                    <v-card-text class="pt-0 chat-content">
                        <div ref="askYottaScrollEl" class="chat-scroll-region">
                            <template v-if="!hasAskYottaTurns && !askYottaLoading">
                                <div class="text-caption text-medium-emphasis mb-2">
                                    Starter questions
                                </div>
                                <div class="d-flex flex-wrap ga-1 mb-2">
                                    <v-btn
                                        v-for="prompt in askYottaPrompts"
                                        :key="prompt"
                                        size="x-small"
                                        variant="outlined"
                                        :disabled="!isReady || askYottaLoading"
                                        @click="runAskYottaPrompt(prompt)"
                                    >
                                        {{ prompt }}
                                    </v-btn>
                                </div>
                            </template>

                            <template v-for="(turn, index) in askYottaThread" :key="turn.id">
                                <div class="chat-bubble-row chat-bubble-row--user">
                                    <div class="chat-bubble chat-bubble--user text-caption">
                                        {{ turn.question }}
                                    </div>
                                </div>

                                <div
                                    v-if="turn.steps.length"
                                    class="chat-bubble-row chat-bubble-row--assistant mt-2"
                                >
                                    <div class="chat-agent-steps">
                                        <SummaryAgentSteps :steps="turn.steps" />
                                    </div>
                                </div>

                                <div
                                    v-if="turn.answer?.output"
                                    class="chat-bubble-row chat-bubble-row--assistant mt-1"
                                >
                                    <div
                                        class="chat-bubble chat-bubble--assistant text-caption"
                                        @click="handleOutputClick"
                                        v-html="renderLinkedOutput(turn.answer)"
                                    />
                                </div>

                                <div
                                    v-if="turn.answer?.generationSource || turn.answer?.usage"
                                    class="d-flex align-center ga-1 flex-wrap mt-2"
                                >
                                    <v-chip
                                        v-if="askTurnModelLabel(turn)"
                                        size="x-small"
                                        variant="tonal"
                                        color="deep-purple"
                                    >
                                        {{ askTurnModelLabel(turn) }}
                                    </v-chip>
                                    <v-chip
                                        v-if="askTurnTokenLabel(turn)"
                                        size="x-small"
                                        variant="tonal"
                                        color="blue-grey"
                                    >
                                        {{ askTurnTokenLabel(turn) }}
                                    </v-chip>
                                    <v-chip
                                        v-if="turn.answer?.generationSource === 'fallback'"
                                        size="x-small"
                                        variant="tonal"
                                        color="error"
                                    >
                                        Gemini fallback
                                    </v-chip>
                                </div>
                                <div
                                    v-if="
                                        turn.answer?.generationSource === 'fallback' &&
                                        turn.answer?.generationNote
                                    "
                                    class="text-caption text-error mt-1"
                                >
                                    {{ turn.answer.generationNote }}
                                </div>
                                <div v-if="askTurnEvidenceLines(turn).length" class="mt-2">
                                    <div class="text-caption text-medium-emphasis mb-1">
                                        Evidence used
                                    </div>
                                    <div class="d-flex flex-column ga-1">
                                        <div
                                            v-for="line in askTurnEvidenceLines(turn)"
                                            :key="`${turn.id}-${line}`"
                                            class="text-caption text-medium-emphasis"
                                        >
                                            {{ line }}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    v-if="
                                        index === askYottaThread.length - 1 &&
                                        turn.answer &&
                                        !askYottaLoading
                                    "
                                    class="d-flex flex-wrap ga-1 mt-3"
                                >
                                    <v-btn
                                        v-for="prompt in askYottaPrompts"
                                        :key="prompt"
                                        size="x-small"
                                        variant="outlined"
                                        :disabled="!isReady || askYottaLoading"
                                        @click="runAskYottaPrompt(prompt)"
                                    >
                                        {{ prompt }}
                                    </v-btn>
                                </div>
                            </template>
                        </div>
                        <div class="chat-composer">
                            <div class="d-flex ga-1">
                                <v-text-field
                                    v-model="askYottaQuestion"
                                    density="compact"
                                    variant="outlined"
                                    hide-details
                                    placeholder="Ask a question..."
                                    :disabled="!isReady || askYottaLoading"
                                    @keydown.enter="runAskYottaQuestion"
                                />
                                <v-btn
                                    icon
                                    size="small"
                                    color="primary"
                                    :loading="askYottaLoading"
                                    :disabled="!isReady || !askYottaQuestion"
                                    @click="runAskYottaQuestion"
                                >
                                    <v-icon size="18">mdi-send</v-icon>
                                </v-btn>
                            </div>
                        </div>
                    </v-card-text>
                </v-card>
            </div>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
    import { useDisplay } from 'vuetify';
    import type { AskYottaPipelineResponse } from '~/utils/agentPipeline';
    import type { WorkspaceTab } from '~/utils/collectionTypes';
    import { state } from '~/utils/appState';

    const {
        collection,
        isReady,
        rebuilding,
        rebuildSteps,
        rebuild,
        bootstrap,
        activeTab,
        setTab,
        primaryMeta,
        propertySeries,
        extractedPropertyCount,
        propertyBearingRecordCount,
        recommendedActions,
        runAgentAction,
        runAskYottaAction,
        askYottaLoading,
        askYottaThread,
        selectedEntity,
        selectedEvent,
        selectEntity,
    } = useCollectionWorkspace();

    const currentTab = computed<WorkspaceTab>({
        get: () => activeTab.value,
        set: (tab) => setTab(tab),
    });
    const { mdAndUp, xs } = useDisplay();
    const askYottaQuestion = ref('');
    const askYottaScrollEl = ref<HTMLElement | null>(null);
    const entityPanelRoot = ref<HTMLElement | null>(null);

    const tabs: Array<{ value: WorkspaceTab; label: string; icon: string }> = [
        { value: 'overview', label: 'Overview', icon: 'mdi-view-dashboard-outline' },
        { value: 'graph', label: 'Graph & Entities', icon: 'mdi-graph-outline' },
        { value: 'events', label: 'Events', icon: 'mdi-calendar-star-outline' },
        { value: 'timeline', label: 'Financials', icon: 'mdi-chart-timeline-variant' },
        { value: 'enrichment', label: 'Enrichment', icon: 'mdi-arrow-expand-all' },
        { value: 'agent', label: 'Agents', icon: 'mdi-robot-outline' },
    ];
    const tabLabelByValue = Object.fromEntries(tabs.map((tab) => [tab.value, tab.label])) as Record<
        WorkspaceTab,
        string
    >;
    const currentTabLabel = computed(() => tabLabelByValue[currentTab.value] ?? 'Overview');
    const entityDrawerOpen = computed<boolean>({
        get: () => Boolean(selectedEntity.value || selectedEvent.value),
        set: (isOpen) => {
            if (!isOpen) selectEntity(null);
        },
    });
    const showEntityAsDrawer = computed(() => mdAndUp.value);
    const entityDialogFullscreen = computed(() => xs.value);
    const showChatAsDrawer = computed(() => mdAndUp.value);
    const chatDialogFullscreen = computed(() => xs.value);
    const chatDrawerOpen = computed<boolean>({
        get: () => state.showCollectionChat,
        set: (isOpen) => {
            state.showCollectionChat = isOpen;
        },
    });

    const tabQuickActions = computed(() =>
        currentTab.value === 'graph' ||
        currentTab.value === 'events' ||
        currentTab.value === 'timeline' ||
        currentTab.value === 'agent'
            ? []
            : recommendedActions.value.filter((action) => action.tab === currentTab.value)
    );
    const askYottaPromptMap: Record<WorkspaceTab, string[]> = {
        overview: [
            'Summarize this collection in plain English.',
            'Which entities matter most and why?',
        ],
        graph: [
            'Explain the most important relationship clusters.',
            'Which links are source-backed vs inferred?',
        ],
        events: [
            'Summarize the event timeline.',
            'Which events have the strongest document evidence?',
        ],
        timeline: [
            'How did key financial properties change across documents?',
            'Which financial values show the largest deltas?',
        ],
        validation: ['Where are current evidence gaps?', 'What should we verify manually next?'],
        agent: [
            'Give me a grounded executive brief.',
            'Recommend high-value anchors for enrichment.',
        ],
        enrichment: [
            'What one-hop expansion should we run first?',
            'Which anchors will add the most context?',
        ],
    };
    const askYottaPrompts = computed(() => askYottaPromptMap[currentTab.value] ?? []);
    const hasAskYottaTurns = computed(() => askYottaThread.value.length > 0);
    const latestAskYottaTurn = computed(() => askYottaThread.value.at(-1) ?? null);

    function escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderLinkedOutput(answer: AskYottaPipelineResponse | null | undefined): string {
        const output = answer?.output;
        if (!output) return '';
        const citations = answer?.citations ?? [];
        const entityCitations = citations.filter(
            (c) => (c.type === 'entity' || c.type === 'event') && c.label && c.neid
        );
        if (!entityCitations.length) return escapeHtml(output);

        const sorted = [...entityCitations].sort((a, b) => b.label.length - a.label.length);
        type Segment = { text: string; linked: boolean; neid?: string; label?: string };
        let segments: Segment[] = [{ text: output, linked: false }];

        for (const citation of sorted) {
            const pattern = new RegExp(citation.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const next: Segment[] = [];
            for (const seg of segments) {
                if (seg.linked) {
                    next.push(seg);
                    continue;
                }
                let lastIndex = 0;
                let match: RegExpExecArray | null;
                let found = false;
                while ((match = pattern.exec(seg.text)) !== null) {
                    found = true;
                    if (match.index > lastIndex) {
                        next.push({ text: seg.text.slice(lastIndex, match.index), linked: false });
                    }
                    next.push({
                        text: match[0],
                        linked: true,
                        neid: citation.neid,
                        label: citation.label,
                    });
                    lastIndex = match.index + match[0].length;
                }
                if (!found) {
                    next.push(seg);
                } else if (lastIndex < seg.text.length) {
                    next.push({ text: seg.text.slice(lastIndex), linked: false });
                }
            }
            segments = next;
        }

        return segments
            .map((seg) => {
                if (seg.linked && seg.neid) {
                    return `<a class="entity-link" data-neid="${escapeHtml(seg.neid)}" title="Open ${escapeHtml(seg.label ?? seg.text)}">${escapeHtml(seg.text)}</a>`;
                }
                return escapeHtml(seg.text);
            })
            .join('');
    }

    function handleOutputClick(e: MouseEvent) {
        const target = e.target as HTMLElement | null;
        const link = target?.closest('.entity-link') as HTMLElement | null;
        const neid = link?.dataset.neid;
        if (neid) selectEntity(neid);
    }

    function askTurnModelLabel(turn: (typeof askYottaThread.value)[number]): string | null {
        if (turn.answer?.usage?.model) return turn.answer.usage.model;
        if (turn.answer?.generationSource === 'gateway') return 'gateway-agent';
        if (turn.answer?.generationSource) return 'model unavailable';
        return null;
    }

    function askTurnTokenLabel(turn: (typeof askYottaThread.value)[number]): string | null {
        const totalTokens = turn.answer?.usage?.totalTokens;
        return typeof totalTokens === 'number' ? `${totalTokens.toLocaleString()} tokens` : null;
    }

    function askTurnEvidenceLines(turn: (typeof askYottaThread.value)[number]): string[] {
        return (turn.answer?.evidenceLines ?? []).slice(0, 6);
    }

    function resolveAskAction(prompt: string): 'summarize_collection' | 'answer_question' {
        const lowered = prompt.toLowerCase();
        if (
            lowered.includes('summarize this collection') ||
            lowered.includes('executive brief') ||
            lowered.includes('brief me')
        ) {
            return 'summarize_collection';
        }
        return 'answer_question';
    }

    async function runAskYottaPrompt(prompt: string) {
        if (askYottaLoading.value) return;
        askYottaQuestion.value = prompt;
        const action = resolveAskAction(prompt);
        await runAskYottaAction(action, prompt);
    }

    async function runAskYottaQuestion() {
        const question = askYottaQuestion.value.trim();
        if (!question || askYottaLoading.value) return;
        askYottaQuestion.value = '';
        const action = resolveAskAction(question);
        await runAskYottaAction(action, question);
    }

    function runTabQuickAction(actionId: string) {
        const action = recommendedActions.value.find((item) => item.id === actionId);
        if (!action) return;
        setTab(action.tab);
        if (action.id === 'ask-grounded-question') {
            if (!chatDrawerOpen.value) chatDrawerOpen.value = true;
        }
    }

    async function launchStarterQuestion(prompt: string) {
        askYottaQuestion.value = prompt;
        if (!chatDrawerOpen.value) chatDrawerOpen.value = true;
        await nextTick();
        await runAskYottaPrompt(prompt);
    }

    async function handleRebuild() {
        await rebuild();
    }

    const handleGlobalEsc = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        if (entityDrawerOpen.value) {
            entityDrawerOpen.value = false;
        }
    };
    const handleGlobalPointerDown = (event: PointerEvent) => {
        if (!entityDrawerOpen.value) return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (entityPanelRoot.value?.contains(target)) return;
        entityDrawerOpen.value = false;
    };

    onMounted(() => {
        bootstrap();
        window.addEventListener('keydown', handleGlobalEsc);
        document.addEventListener('pointerdown', handleGlobalPointerDown, true);
    });
    onBeforeUnmount(() => {
        window.removeEventListener('keydown', handleGlobalEsc);
        document.removeEventListener('pointerdown', handleGlobalPointerDown, true);
        state.showCollectionChat = false;
    });

    watch(
        () => currentTab.value,
        (tab) => {
            if (tab === 'agreements') {
                setTab('graph');
            }
        },
        { immediate: true }
    );
    watch(
        () => [
            askYottaThread.value.length,
            latestAskYottaTurn.value?.answer?.output ?? '',
            latestAskYottaTurn.value?.status ?? '',
        ],
        async () => {
            await nextTick();
            if (!askYottaScrollEl.value) return;
            askYottaScrollEl.value.scrollTo({
                top: askYottaScrollEl.value.scrollHeight,
                behavior: 'smooth',
            });
        }
    );
</script>

<style scoped>
    .workspace-header {
        border-bottom: 1px solid var(--app-divider);
        background: linear-gradient(
            180deg,
            color-mix(in srgb, var(--dynamic-surface) 92%, var(--dynamic-background) 8%),
            color-mix(in srgb, var(--dynamic-background) 84%, var(--dynamic-surface) 16%)
        );
    }

    .workspace-tabs :deep(.v-tab) {
        text-transform: none;
        letter-spacing: normal;
        font-size: 0.8125rem;
        min-width: 0;
        padding: 0 12px;
    }

    .workspace-tabs-wrap {
        min-width: 340px;
    }

    .pipeline-inline-chip {
        font-weight: 600;
    }

    .pipeline-inline-chip__spinner {
        animation: pipeline-inline-spin 1s linear infinite;
    }

    @keyframes pipeline-inline-spin {
        to {
            transform: rotate(360deg);
        }
    }

    .meta-bar {
        border-bottom: 1px solid var(--app-divider);
        background: color-mix(
            in srgb,
            var(--dynamic-panel-background) 86%,
            var(--dynamic-background) 14%
        );
    }

    .workspace-main-shell {
        min-height: 0;
        position: relative;
    }

    .workspace-scroll-region {
        height: 100%;
        overflow-y: auto;
    }

    .workspace-content-shell {
        width: 100%;
        max-width: 1420px;
        margin: 0 auto;
    }

    .mcp-payload {
        font-size: 0.72rem;
        background: var(--app-subtle-surface);
        border: 1px solid var(--app-divider-strong);
        border-radius: 4px;
        padding: 8px;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-all;
    }

    .chat-drawer-card {
        height: 100%;
        border: 1px solid var(--app-divider-strong);
        background: linear-gradient(
            165deg,
            color-mix(in srgb, var(--dynamic-surface) 90%, var(--dynamic-background) 10%),
            color-mix(in srgb, var(--dynamic-panel-background) 90%, var(--dynamic-background) 10%)
        );
    }

    .chat-bubble-row {
        display: flex;
    }

    .chat-bubble-row--user {
        justify-content: flex-end;
    }

    .chat-bubble-row--assistant {
        justify-content: flex-start;
    }

    .chat-bubble {
        max-width: 88%;
        padding: 8px 12px;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.45;
    }

    .chat-bubble--user {
        background: color-mix(in srgb, rgb(var(--v-theme-primary)) 18%, transparent);
        border: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 30%, transparent);
        border-radius: 14px 14px 4px 14px;
        color: rgb(var(--v-theme-on-surface));
    }

    .chat-bubble--assistant {
        background: color-mix(
            in srgb,
            var(--dynamic-panel-background) 88%,
            var(--dynamic-background) 12%
        );
        border: 1px solid var(--app-divider);
        border-radius: 14px 14px 14px 4px;
        max-height: 340px;
        overflow-y: auto;
    }

    .chat-agent-steps {
        max-width: 88%;
    }

    .chat-bubble--assistant :deep(.entity-link) {
        color: rgb(var(--v-theme-primary));
        text-decoration: underline;
        text-decoration-style: dotted;
        text-underline-offset: 2px;
        cursor: pointer;
        transition: opacity 0.15s ease;
    }

    .chat-bubble--assistant :deep(.entity-link:hover) {
        opacity: 0.8;
        text-decoration-style: solid;
    }

    .chat-content {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
    }

    .chat-scroll-region {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        padding-bottom: 8px;
    }

    .chat-composer {
        flex: 0 0 auto;
        position: sticky;
        bottom: 0;
        z-index: 2;
        border-top: 1px solid var(--app-divider);
        padding-top: 8px;
        padding-bottom: 4px;
        background: var(--dynamic-surface);
        box-shadow: 0 -2px 8px color-mix(in srgb, var(--dynamic-background) 88%, transparent);
    }

    .entity-panel-shell {
        height: 100%;
    }

    .entity-panel-shell--desktop {
        width: min(480px, 94vw);
    }

    .entity-overlay-layer {
        position: absolute;
        inset: 0;
        display: flex;
        justify-content: flex-end;
        z-index: 12020;
        pointer-events: none;
    }

    .entity-overlay-layer .entity-panel-shell {
        pointer-events: auto;
    }

    :deep(.chat-overlay-top.v-navigation-drawer) {
        z-index: 12040 !important;
    }

    .entity-dialog-shell {
        width: min(760px, 96vw);
        max-height: min(92vh, 960px);
        margin: 0 auto;
    }

    :deep(.entity-dialog .v-overlay__content) {
        width: min(760px, 96vw);
        margin: 24px auto;
    }

    :deep(.entity-dialog .v-overlay__content > .entity-dialog-shell) {
        width: 100%;
    }

    :deep(.entity-dialog .v-overlay__content .entity-panel) {
        max-height: min(92vh, 960px);
        overflow: hidden;
    }

    .chat-dialog-shell {
        width: min(720px, 96vw);
        max-height: min(92vh, 960px);
        margin: 0 auto;
    }

    :deep(.chat-dialog .v-overlay__content) {
        width: min(720px, 96vw);
        margin: 24px auto;
    }

    :deep(.chat-dialog .v-overlay__content > .chat-dialog-shell) {
        width: 100%;
    }
</style>
