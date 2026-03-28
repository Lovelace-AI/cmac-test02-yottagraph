import { computed, ref } from 'vue';
import type { CollectionState } from '~/utils/collectionTypes';

export interface InsightCitation {
    type: 'entity' | 'event' | 'document' | 'relationship';
    neid: string;
    label: string;
}

export interface InsightQuestion {
    id: string;
    text: string;
}

export interface InsightQuestionCategory {
    id: string;
    title: string;
    icon: string;
    questions: InsightQuestion[];
}

export interface InsightQuestionAnswer {
    status: 'idle' | 'loading' | 'answered' | 'error';
    answer: string;
    citations: InsightCitation[];
    error: string | null;
    cached: boolean;
    matchedEntityNeids: string[];
    usage?: {
        model: string;
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        costUsd: number;
        latencyMs?: number;
    };
    updatedAt?: string;
}

interface PersistedInsightsState {
    fingerprint: string;
    answers: Record<string, InsightQuestionAnswer>;
}

const categories: InsightQuestionCategory[] = [
    {
        id: 'executive',
        title: 'Executive Context',
        icon: 'mdi-briefcase-outline',
        questions: [
            {
                id: 'executive-summary',
                text: 'Summarize this collection for an executive audience in plain language.',
            },
            {
                id: 'material-findings',
                text: 'What are the most material findings and why do they matter for the deal narrative?',
            },
        ],
    },
    {
        id: 'evidence',
        title: 'Evidence and Coverage',
        icon: 'mdi-shield-check-outline',
        questions: [
            {
                id: 'evidence-gaps',
                text: 'Where is evidence strongest, and where are the biggest coverage or confidence gaps?',
            },
            {
                id: 'inferred-links',
                text: 'Which inferred links should be verified before external reporting?',
            },
        ],
    },
    {
        id: 'timeline',
        title: 'Timeline and Change',
        icon: 'mdi-chart-timeline-variant',
        questions: [
            {
                id: 'timeline-shifts',
                text: 'What changed across the collection over time, and which shifts are most significant?',
            },
            {
                id: 'event-signals',
                text: 'Which events most influence the interpretation of this transaction history?',
            },
        ],
    },
    {
        id: 'agreements',
        title: 'Agreements and Parties',
        icon: 'mdi-file-document-outline',
        questions: [
            {
                id: 'agreement-structure',
                text: 'What agreement structure emerges from the documents, and which parties are central?',
            },
            {
                id: 'cross-party-obligations',
                text: 'Which recurring parties or obligations appear across multiple agreements and events?',
            },
        ],
    },
];

const answers = ref<Record<string, InsightQuestionAnswer>>({});
const bulkRunning = ref(false);
const bulkCompleted = ref(0);
const bulkTotal = ref(0);
const bulkCurrentQuestionId = ref<string | null>(null);
const cacheRestored = ref(false);
const cacheFingerprint = ref<string>('');

const insightNarrative = ref<string | null>(null);
const insightEntitySummaries = ref<Record<string, string>>({});
const insightEventSummaries = ref<Record<string, string>>({});

function storageKey(): string {
    return 'collection-insights-state-v1';
}

function createEmptyAnswer(): InsightQuestionAnswer {
    return {
        status: 'idle',
        answer: '',
        citations: [],
        error: null,
        cached: false,
        matchedEntityNeids: [],
    };
}

function detectEntityMentions(
    answer: string,
    entities: Array<{ neid: string; name: string }>
): string[] {
    const lowered = answer.toLowerCase();
    return entities
        .filter((entity) => entity.name && lowered.includes(entity.name.toLowerCase()))
        .map((entity) => entity.neid)
        .slice(0, 10);
}

function restoreFromStorage(fingerprint: string): void {
    if (!import.meta.client) {
        cacheRestored.value = false;
        return;
    }
    try {
        const raw = window.localStorage.getItem(storageKey());
        if (!raw) {
            cacheRestored.value = false;
            return;
        }
        const parsed = JSON.parse(raw) as PersistedInsightsState;
        if (parsed.fingerprint !== fingerprint || !parsed.answers) {
            cacheRestored.value = false;
            return;
        }
        answers.value = parsed.answers;
        for (const key of Object.keys(answers.value)) {
            answers.value[key].cached = true;
        }
        cacheRestored.value = true;
    } catch {
        cacheRestored.value = false;
    }
}

function persistToStorage(fingerprint: string): void {
    if (!import.meta.client) return;
    try {
        const payload: PersistedInsightsState = {
            fingerprint,
            answers: answers.value,
        };
        window.localStorage.setItem(storageKey(), JSON.stringify(payload));
    } catch {
        // Ignore persistence issues so UI remains interactive.
    }
}

export function useInsightsWorkspace() {
    const {
        collection,
        entities,
        addGeminiUsage,
        collectionSummary,
        isReady,
        meta,
        selectedDocumentNeid,
    } = useCollectionWorkspace();

    const allQuestions = computed(() => categories.flatMap((category) => category.questions));
    const totalQuestions = computed(() => allQuestions.value.length);
    const answeredCount = computed(
        () =>
            allQuestions.value.filter(
                (question) => answers.value[question.id]?.status === 'answered'
            ).length
    );
    const usageTotals = computed(() => {
        const usageRows = Object.values(answers.value)
            .filter((entry) => entry.status === 'answered' && entry.usage)
            .map((entry) => entry.usage!);
        return usageRows.reduce(
            (acc, usage) => ({
                totalTokens: acc.totalTokens + usage.totalTokens,
                costUsd: acc.costUsd + usage.costUsd,
            }),
            { totalTokens: 0, costUsd: 0 }
        );
    });
    const hasAnswers = computed(() => answeredCount.value > 0);
    const collectionFingerprint = computed(() =>
        JSON.stringify({
            name: collection.value.meta.name,
            lastRebuilt: collection.value.meta.lastRebuilt ?? '',
            docCount: collection.value.meta.documentCount,
            entityCount: collection.value.meta.entityCount,
            eventCount: collection.value.meta.eventCount,
            relCount: collection.value.meta.relationshipCount,
            selectedDocumentNeid: selectedDocumentNeid.value ?? '',
        })
    );

    const categoriesWithStatus = computed(() =>
        categories.map((category) => {
            const answered = category.questions.filter(
                (question) => answers.value[question.id]?.status === 'answered'
            ).length;
            return {
                ...category,
                answered,
                total: category.questions.length,
            };
        })
    );

    const bulkProgress = computed(() => ({
        running: bulkRunning.value,
        completed: bulkCompleted.value,
        total: bulkTotal.value,
        currentQuestionId: bulkCurrentQuestionId.value,
    }));

    async function initializeInsightsState(): Promise<void> {
        if (cacheFingerprint.value !== collectionFingerprint.value) {
            cacheFingerprint.value = collectionFingerprint.value;
            restoreFromStorage(collectionFingerprint.value);
        }
        if (!isReady.value) return;
        try {
            const language = await $fetch<{
                entitySummaries: Record<string, string>;
                eventSummaries: Record<string, string>;
            }>('/api/collection/key-insight-language');
            insightEntitySummaries.value = language.entitySummaries ?? {};
            insightEventSummaries.value = language.eventSummaries ?? {};
        } catch {
            insightEntitySummaries.value = {};
            insightEventSummaries.value = {};
        }
        insightNarrative.value = collectionSummary.value;
    }

    async function answerQuestion(questionId: string, force = false): Promise<void> {
        const question = allQuestions.value.find((item) => item.id === questionId);
        if (!question) return;
        const existing = answers.value[question.id] ?? createEmptyAnswer();
        if (!force && existing.status === 'answered') return;

        answers.value[question.id] = {
            ...existing,
            status: 'loading',
            error: null,
            cached: false,
        };

        const startedAt = Date.now();
        try {
            const result = await $fetch<{
                output: string;
                citations: InsightCitation[];
                usage?: {
                    model: string;
                    promptTokens: number;
                    completionTokens: number;
                    totalTokens: number;
                    costUsd: number;
                };
            }>('/api/collection/agent-actions', {
                method: 'POST',
                body: {
                    action: 'answer_question',
                    question: question.text,
                },
            });

            const usage = result.usage
                ? {
                      ...result.usage,
                      latencyMs: Date.now() - startedAt,
                  }
                : undefined;

            if (usage) {
                addGeminiUsage({
                    model: usage.model,
                    promptTokens: usage.promptTokens,
                    completionTokens: usage.completionTokens,
                    totalTokens: usage.totalTokens,
                    costUsd: usage.costUsd,
                    latencyMs: usage.latencyMs ?? 0,
                    timestamp: new Date().toISOString(),
                    label: `insights_${question.id}`,
                });
            }

            answers.value[question.id] = {
                status: 'answered',
                answer: result.output || 'No answer returned.',
                citations: result.citations ?? [],
                error: null,
                cached: false,
                usage,
                matchedEntityNeids: detectEntityMentions(result.output || '', entities.value),
                updatedAt: new Date().toISOString(),
            };
            persistToStorage(collectionFingerprint.value);
        } catch (error: any) {
            answers.value[question.id] = {
                ...createEmptyAnswer(),
                status: 'error',
                error: error?.data?.statusMessage || error?.message || 'Question execution failed.',
                updatedAt: new Date().toISOString(),
            };
        }
    }

    async function answerAllQuestions(): Promise<void> {
        bulkRunning.value = true;
        bulkCompleted.value = 0;
        bulkTotal.value = allQuestions.value.length;
        bulkCurrentQuestionId.value = null;
        try {
            for (const question of allQuestions.value) {
                bulkCurrentQuestionId.value = question.id;
                await answerQuestion(question.id, true);
                bulkCompleted.value += 1;
            }
        } finally {
            bulkRunning.value = false;
            bulkCurrentQuestionId.value = null;
        }
    }

    function resetAnswers(): void {
        answers.value = {};
        cacheRestored.value = false;
        persistToStorage(collectionFingerprint.value);
    }

    function answerFor(questionId: string): InsightQuestionAnswer {
        return answers.value[questionId] ?? createEmptyAnswer();
    }

    function resolveCitationEntityName(neid: string): string {
        const entity = entities.value.find((item) => item.neid === neid);
        return entity?.name ?? neid;
    }

    return {
        categoriesWithStatus,
        answeredCount,
        totalQuestions,
        hasAnswers,
        answerFor,
        answerQuestion,
        answerAllQuestions,
        resetAnswers,
        bulkProgress,
        cacheRestored: computed(() => cacheRestored.value),
        usageTotals,
        initializeInsightsState,
        collectionFingerprint,
        insightNarrative: computed(() => insightNarrative.value),
        insightEntitySummaries: computed(() => insightEntitySummaries.value),
        insightEventSummaries: computed(() => insightEventSummaries.value),
        resolveCitationEntityName,
        collectionMeta: meta,
    };
}
