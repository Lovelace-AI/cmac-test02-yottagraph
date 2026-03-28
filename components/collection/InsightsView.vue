<template>
    <div class="insights-layout">
        <v-card variant="flat" class="insights-toolbar">
            <v-card-text class="py-3">
                <div class="d-flex flex-wrap align-center ga-2">
                    <v-btn
                        color="primary"
                        prepend-icon="mdi-robot-outline"
                        :loading="bulkProgress.running"
                        @click="answerAllQuestions"
                    >
                        Answer All Questions
                    </v-btn>
                    <v-btn
                        variant="outlined"
                        prepend-icon="mdi-refresh"
                        :disabled="!hasAnswers"
                        @click="resetAnswers"
                    >
                        Reset
                    </v-btn>

                    <v-menu location="bottom">
                        <template #activator="{ props: menuProps }">
                            <v-btn
                                v-bind="menuProps"
                                variant="tonal"
                                prepend-icon="mdi-export-variant"
                                :loading="exporting"
                            >
                                Export Analysis
                            </v-btn>
                        </template>
                        <v-list density="compact">
                            <v-list-item @click="runExport('markdown')">
                                <v-list-item-title>Export Markdown</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="runExport('html')">
                                <v-list-item-title>Export HTML</v-list-item-title>
                            </v-list-item>
                            <v-list-item @click="runExport('pdf')">
                                <v-list-item-title>Export PDF</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>

                    <v-btn
                        variant="outlined"
                        prepend-icon="mdi-file-pdf-box"
                        :loading="exporting"
                        @click="runExport('pdf')"
                    >
                        Export PDF
                    </v-btn>
                    <v-btn
                        variant="text"
                        prepend-icon="mdi-chat-outline"
                        @click="
                            emit(
                                'open-chat',
                                'What are the top executive insights from this collection?'
                            )
                        "
                    >
                        Ask a Question
                    </v-btn>
                </div>

                <div class="d-flex flex-wrap align-center ga-2 mt-2">
                    <v-chip size="small" variant="outlined" color="primary">
                        {{ answeredCount }} / {{ totalQuestions }} answered
                    </v-chip>
                    <v-chip
                        v-if="cacheRestored"
                        size="small"
                        variant="outlined"
                        color="info"
                        prepend-icon="mdi-database-check-outline"
                    >
                        Restored from cache
                    </v-chip>
                    <v-chip
                        size="small"
                        variant="outlined"
                        prepend-icon="mdi-counter"
                        color="secondary"
                    >
                        {{ usageTotals.totalTokens.toLocaleString() }} tokens
                    </v-chip>
                    <v-chip size="small" variant="outlined" prepend-icon="mdi-currency-usd">
                        ${{ usageTotals.costUsd.toFixed(4) }}
                    </v-chip>
                </div>
            </v-card-text>
        </v-card>

        <v-alert
            v-if="exportMessage"
            class="mt-3"
            :type="exportMessage.type"
            variant="tonal"
            closable
            @click:close="exportMessage = null"
        >
            {{ exportMessage.text }}
        </v-alert>

        <v-card variant="flat" class="mt-3 insights-section">
            <v-card-item>
                <v-card-title class="text-body-1">Collection Overview</v-card-title>
                <v-card-subtitle>
                    Orient the analysis before running or reviewing question answers.
                </v-card-subtitle>
            </v-card-item>
            <v-card-text class="pt-0">
                <p class="text-body-2 mb-3 insight-narrative">
                    {{ insightNarrative || fallbackNarrative }}
                </p>
                <v-row>
                    <v-col cols="12" md="4">
                        <InsightMetricCard
                            label="Documents in scope"
                            :value="collectionMeta.documentCount"
                            description="Source inventory available for this collection."
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <InsightMetricCard
                            label="Entities"
                            :value="collectionMeta.entityCount"
                            description="Detected entities available for analysis and evidence pivots."
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <InsightMetricCard
                            label="Relationships / Events"
                            :value="`${collectionMeta.relationshipCount} / ${collectionMeta.eventCount}`"
                            description="Graph coverage currently loaded into the workspace."
                        />
                    </v-col>
                </v-row>
                <div class="text-caption text-medium-emphasis mt-2">
                    {{ collectionFingerprint }}
                </div>
            </v-card-text>
        </v-card>

        <v-card
            v-if="bulkProgress.running"
            variant="flat"
            class="mt-3 insights-section"
            color="surface"
        >
            <v-card-text>
                <div class="text-body-2 font-weight-medium mb-1">Bulk answering in progress</div>
                <div class="text-caption text-medium-emphasis mb-2">
                    {{ bulkProgress.completed }} / {{ bulkProgress.total }} completed
                </div>
                <v-progress-linear
                    :model-value="
                        bulkProgress.total ? (bulkProgress.completed / bulkProgress.total) * 100 : 0
                    "
                    color="primary"
                    rounded
                />
            </v-card-text>
        </v-card>

        <div class="mt-3 d-flex flex-column ga-3">
            <v-card
                v-for="category in categoriesWithStatus"
                :key="category.id"
                variant="flat"
                class="insights-section"
            >
                <v-card-item>
                    <template #prepend>
                        <v-icon class="mr-2">{{ category.icon }}</v-icon>
                    </template>
                    <v-card-title class="text-body-1">{{ category.title }}</v-card-title>
                    <template #append>
                        <v-chip size="small" variant="outlined">
                            {{ category.answered }} / {{ category.total }}
                        </v-chip>
                    </template>
                </v-card-item>
                <v-card-text class="pt-0">
                    <v-card
                        v-for="question in category.questions"
                        :key="question.id"
                        variant="tonal"
                        class="mb-3 question-card"
                    >
                        <v-card-text>
                            <div class="d-flex justify-space-between align-start flex-wrap ga-2">
                                <div>
                                    <div class="text-caption text-medium-emphasis mb-1">
                                        Question
                                    </div>
                                    <div class="text-body-2 font-weight-medium">
                                        {{ question.text }}
                                    </div>
                                </div>
                                <div class="d-flex ga-2">
                                    <v-chip
                                        v-if="answerFor(question.id).status === 'answered'"
                                        size="small"
                                        color="success"
                                        variant="outlined"
                                    >
                                        Answered
                                    </v-chip>
                                    <v-chip
                                        v-else-if="answerFor(question.id).status === 'loading'"
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                    >
                                        Running
                                    </v-chip>
                                    <v-btn
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        :loading="answerFor(question.id).status === 'loading'"
                                        @click="answerQuestion(question.id, true)"
                                    >
                                        Run
                                    </v-btn>
                                </div>
                            </div>

                            <v-alert
                                v-if="answerFor(question.id).status === 'error'"
                                type="error"
                                variant="tonal"
                                class="mt-3"
                            >
                                {{ answerFor(question.id).error }}
                            </v-alert>

                            <div
                                v-if="answerFor(question.id).status === 'answered'"
                                class="answer-body mt-3"
                            >
                                <div
                                    v-for="(line, lineIdx) in normalizeAnswer(
                                        answerFor(question.id).answer
                                    )"
                                    :key="`${question.id}-line-${lineIdx}`"
                                    class="mb-2"
                                >
                                    <template
                                        v-for="(segment, segmentIdx) in entityLinkedSegments(
                                            question.id,
                                            line
                                        )"
                                        :key="`${question.id}-line-${lineIdx}-segment-${segmentIdx}`"
                                    >
                                        <v-btn
                                            v-if="segment.neid"
                                            size="x-small"
                                            variant="tonal"
                                            color="primary"
                                            class="mr-1 mb-1 entity-inline-link"
                                            @click="selectEntity(segment.neid)"
                                        >
                                            {{ segment.text }}
                                        </v-btn>
                                        <span v-else>{{ segment.text }}</span>
                                    </template>
                                </div>

                                <div
                                    v-if="answerFor(question.id).matchedEntityNeids.length > 0"
                                    class="mt-3"
                                >
                                    <div class="text-caption text-medium-emphasis mb-1">
                                        Referenced entities
                                    </div>
                                    <div class="d-flex flex-wrap ga-2">
                                        <v-chip
                                            v-for="neid in answerFor(question.id)
                                                .matchedEntityNeids"
                                            :key="`${question.id}-entity-${neid}`"
                                            size="small"
                                            variant="outlined"
                                            class="app-click-target"
                                            @click="selectEntity(neid)"
                                        >
                                            {{ resolveCitationEntityName(neid) }}
                                        </v-chip>
                                    </div>
                                </div>

                                <v-expansion-panels variant="accordion" class="mt-3">
                                    <v-expansion-panel>
                                        <v-expansion-panel-title>
                                            Supporting Evidence ({{
                                                answerFor(question.id).citations.length
                                            }})
                                        </v-expansion-panel-title>
                                        <v-expansion-panel-text>
                                            <v-list density="compact" class="pa-0 bg-transparent">
                                                <v-list-item
                                                    v-for="citation in answerFor(question.id)
                                                        .citations"
                                                    :key="`${question.id}-${citation.neid}-${citation.label}`"
                                                    class="px-0"
                                                >
                                                    <template #prepend>
                                                        <v-icon size="15" class="mr-2"
                                                            >mdi-link-variant</v-icon
                                                        >
                                                    </template>
                                                    <v-list-item-title class="text-body-2">
                                                        {{ citation.label }}
                                                    </v-list-item-title>
                                                    <v-list-item-subtitle class="text-caption">
                                                        {{ citation.type }} · {{ citation.neid }}
                                                    </v-list-item-subtitle>
                                                </v-list-item>
                                            </v-list>
                                        </v-expansion-panel-text>
                                    </v-expansion-panel>
                                </v-expansion-panels>

                                <div class="mt-3 d-flex flex-wrap ga-2">
                                    <v-btn
                                        size="x-small"
                                        variant="text"
                                        @click="setTabForAnswer(category.id)"
                                    >
                                        Open Related Tab
                                    </v-btn>
                                    <v-btn
                                        size="x-small"
                                        variant="text"
                                        prepend-icon="mdi-chat-outline"
                                        @click="
                                            emit(
                                                'open-chat',
                                                `Follow-up on this finding: ${question.text}`
                                            )
                                        "
                                    >
                                        Ask follow-up
                                    </v-btn>
                                </div>
                            </div>
                        </v-card-text>
                    </v-card>
                </v-card-text>
            </v-card>
        </div>

        <v-dialog v-model="exportProgressOpen" max-width="560">
            <v-card>
                <v-card-title class="text-body-1">Export Analysis</v-card-title>
                <v-card-subtitle class="pt-1"
                    >Assembling your case-study artifact...</v-card-subtitle
                >
                <v-card-text class="pt-4">
                    <v-list density="compact" class="pa-0 bg-transparent">
                        <v-list-item v-for="(step, idx) in exportSteps" :key="step" class="px-0">
                            <template #prepend>
                                <v-icon
                                    size="16"
                                    class="mr-2"
                                    :color="idx <= exportStepIndex ? 'primary' : ''"
                                >
                                    {{
                                        idx < exportStepIndex
                                            ? 'mdi-check-circle'
                                            : 'mdi-progress-clock'
                                    }}
                                </v-icon>
                            </template>
                            <v-list-item-title class="text-body-2">{{ step }}</v-list-item-title>
                        </v-list-item>
                    </v-list>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
    type ExportFormat = 'markdown' | 'html' | 'pdf';

    const emit = defineEmits<{
        'open-chat': [prompt?: string];
    }>();

    const {
        categoriesWithStatus,
        answeredCount,
        totalQuestions,
        hasAnswers,
        answerFor,
        answerQuestion,
        answerAllQuestions,
        resetAnswers,
        bulkProgress,
        cacheRestored,
        usageTotals,
        initializeInsightsState,
        collectionFingerprint,
        insightNarrative,
        resolveCitationEntityName,
        collectionMeta,
    } = useInsightsWorkspace();
    const { setTab, selectEntity } = useCollectionWorkspace();

    const fallbackNarrative = computed(
        () =>
            'Run the curated question set to generate evidence-backed findings, then review supporting citations and export a polished analytical deliverable.'
    );
    const exportProgressOpen = ref(false);
    const exporting = ref(false);
    const exportStepIndex = ref(-1);
    const exportMessage = ref<null | { type: 'success' | 'warning' | 'error'; text: string }>(null);
    const exportSteps = [
        'Graph visualization capture',
        'Case study overview generation',
        'Summary narrative generation',
        'Agreements overview generation',
        'Timeline analysis generation',
        'Agent methodology narrative generation',
        'Final assembly',
    ];

    function normalizeAnswer(answer: string): string[] {
        return answer
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
    }

    function escapeRegex(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function entityLinkedSegments(
        questionId: string,
        line: string
    ): Array<{ text: string; neid?: string }> {
        const answer = answerFor(questionId);
        const entityEntries = answer.matchedEntityNeids
            .map((neid) => ({
                neid,
                name: resolveCitationEntityName(neid),
            }))
            .filter((item) => item.name && item.name !== item.neid)
            .sort((a, b) => b.name.length - a.name.length);
        if (!entityEntries.length) return [{ text: line }];
        const pattern = entityEntries.map((item) => escapeRegex(item.name)).join('|');
        const regex = new RegExp(`(${pattern})`, 'gi');
        const rawParts = line.split(regex).filter((part) => part.length > 0);
        return rawParts.map((part) => {
            const hit = entityEntries.find(
                (entry) => entry.name.toLowerCase() === part.toLowerCase()
            );
            if (!hit) return { text: part };
            return { text: part, neid: hit.neid };
        });
    }

    function setTabForAnswer(categoryId: string): void {
        if (categoryId === 'timeline') {
            setTab('timeline');
            return;
        }
        if (categoryId === 'agreements') {
            setTab('agreements');
            return;
        }
        if (categoryId === 'evidence') {
            setTab('validation');
            return;
        }
        setTab('events');
    }

    function buildExportPayload() {
        return {
            collectionName: collectionMeta.value.name,
            generatedAt: new Date().toISOString(),
            overview: insightNarrative.value || fallbackNarrative.value,
            answers: categoriesWithStatus.value.flatMap((category) =>
                category.questions
                    .filter((question) => answerFor(question.id).status === 'answered')
                    .map((question) => ({
                        category: category.title,
                        question: question.text,
                        answer: answerFor(question.id).answer,
                        citations: answerFor(question.id).citations,
                    }))
            ),
        };
    }

    function decodeBase64(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    function triggerDownload(
        filename: string,
        mimeType: string,
        content: string,
        encoding: 'utf8' | 'base64' = 'utf8'
    ): void {
        const blob =
            encoding === 'base64'
                ? new Blob([decodeBase64(content)], { type: mimeType })
                : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    async function runExport(format: ExportFormat): Promise<void> {
        if (!hasAnswers.value) {
            exportMessage.value = {
                type: 'warning',
                text: 'Answer at least one question before exporting analysis.',
            };
            return;
        }
        exporting.value = true;
        exportProgressOpen.value = true;
        exportStepIndex.value = -1;
        for (let idx = 0; idx < exportSteps.length; idx += 1) {
            exportStepIndex.value = idx;
            await new Promise((resolve) => setTimeout(resolve, 150));
        }
        try {
            const result = await $fetch<{
                format: ExportFormat;
                filename: string;
                mimeType: string;
                content: string;
                encoding?: 'utf8' | 'base64';
            }>('/api/collection/insights-export', {
                method: 'POST',
                body: {
                    format,
                    ...buildExportPayload(),
                },
            });
            triggerDownload(
                result.filename,
                result.mimeType,
                result.content,
                result.encoding || 'utf8'
            );
            exportMessage.value = {
                type: 'success',
                text: `Exported ${result.format.toUpperCase()} analysis successfully.`,
            };
        } catch (error: any) {
            exportMessage.value = {
                type: 'error',
                text: error?.data?.statusMessage || error?.message || 'Failed to export analysis.',
            };
        } finally {
            exportProgressOpen.value = false;
            exporting.value = false;
        }
    }

    onMounted(async () => {
        await initializeInsightsState();
    });
    watch(
        () => collectionFingerprint.value,
        async () => {
            await initializeInsightsState();
        }
    );
</script>

<style scoped>
    .insights-layout {
        max-width: 1420px;
        margin: 0 auto;
        padding: 6px 4px 24px;
    }

    .insights-toolbar {
        position: sticky;
        top: 0;
        z-index: 3;
        border: 1px solid var(--app-divider-strong);
        background: linear-gradient(
            170deg,
            color-mix(in srgb, var(--dynamic-surface) 92%, var(--dynamic-background) 8%),
            color-mix(in srgb, var(--dynamic-panel-background) 90%, var(--dynamic-background) 10%)
        );
        backdrop-filter: blur(6px);
    }

    .insights-section {
        border: 1px solid var(--app-divider-strong);
        background: linear-gradient(
            160deg,
            color-mix(in srgb, var(--dynamic-surface) 92%, var(--dynamic-background) 8%),
            color-mix(in srgb, var(--dynamic-panel-background) 88%, var(--dynamic-background) 12%)
        );
    }

    .question-card {
        border: 1px solid color-mix(in srgb, var(--dynamic-primary) 18%, var(--app-divider-strong));
        background: color-mix(
            in srgb,
            var(--dynamic-card-background) 84%,
            var(--dynamic-background) 16%
        );
    }

    .answer-body {
        line-height: 1.62;
        max-width: 86ch;
    }

    .insight-narrative {
        line-height: 1.7;
        max-width: 92ch;
        color: color-mix(
            in srgb,
            var(--dynamic-text-primary) 94%,
            var(--dynamic-text-secondary) 6%
        );
    }

    .entity-inline-link {
        text-transform: none;
        letter-spacing: 0;
        min-width: 0;
        padding-inline: 6px;
    }
</style>
