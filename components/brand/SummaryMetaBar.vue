<template>
    <div class="d-flex align-center flex-wrap ga-1">
        <v-chip
            v-if="entityCount != null"
            size="x-small"
            color="primary"
            variant="flat"
            prepend-icon="mdi-domain"
        >
            {{ entityCount }} {{ entityLabel }}
        </v-chip>

        <v-chip
            v-if="eventCount != null"
            size="x-small"
            variant="outlined"
            prepend-icon="mdi-calendar-alert"
        >
            {{ eventCount }} events
        </v-chip>

        <v-chip
            v-if="relationshipCount != null"
            size="x-small"
            variant="outlined"
            prepend-icon="mdi-graph-outline"
        >
            {{ relationshipCount }} edges
        </v-chip>

        <v-chip
            v-if="propertySeries != null"
            size="x-small"
            variant="outlined"
            prepend-icon="mdi-chart-line"
        >
            {{ propertySeries }} prop series
        </v-chip>

        <v-chip v-if="readTime" size="x-small" variant="outlined" prepend-icon="mdi-clock-outline">
            {{ readTime }}
        </v-chip>

        <v-chip
            v-if="model"
            size="x-small"
            color="deep-purple"
            variant="tonal"
            prepend-icon="mdi-robot"
        >
            {{ displayModel(model) }}
        </v-chip>

        <template v-if="showUsage && usage">
            <v-chip
                size="x-small"
                variant="outlined"
                prepend-icon="mdi-counter"
                :title="`${usage.prompt_tokens} in / ${usage.completion_tokens} out`"
            >
                {{ formatTokens(usage.prompt_tokens) }} in /
                {{ formatTokens(usage.completion_tokens) }} out
            </v-chip>
            <v-chip size="x-small" color="success" variant="tonal" prepend-icon="mdi-currency-usd">
                {{ formatCost(usage.cost_usd) }}
            </v-chip>
        </template>

        <div v-if="showFeedback" class="d-flex align-center ga-1 ml-auto">
            <span class="text-caption text-medium-emphasis">{{ feedbackLabel }}</span>
            <v-btn
                :icon="feedback === 'positive' ? 'mdi-thumb-up' : 'mdi-thumb-up-outline'"
                size="x-small"
                variant="text"
                :color="feedback === 'positive' ? 'success' : undefined"
                :loading="feedbackLoading"
                @click="emit('feedback', 'positive')"
            />
            <v-btn
                :icon="feedback === 'negative' ? 'mdi-thumb-down' : 'mdi-thumb-down-outline'"
                size="x-small"
                variant="text"
                :color="feedback === 'negative' ? 'error' : undefined"
                :loading="feedbackLoading"
                @click="emit('feedback', 'negative')"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
    interface SummaryUsage {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        cost_usd: number;
        model?: string;
        latency_ms?: number;
    }

    const props = withDefaults(
        defineProps<{
            entityCount?: number;
            eventCount?: number;
            relationshipCount?: number;
            propertySeries?: number;
            entityLabel?: string;
            readTime?: string;
            model?: string;
            usage?: SummaryUsage;
            showUsage?: boolean;
            feedback?: 'positive' | 'negative' | null;
            feedbackLoading?: boolean;
            feedbackLabel?: string;
            showFeedback?: boolean;
        }>(),
        {
            entityLabel: 'entities',
            showUsage: true,
            showFeedback: false,
            feedbackLabel: 'Was this helpful?',
        }
    );

    const emit = defineEmits<{
        feedback: [type: 'positive' | 'negative'];
    }>();

    function formatTokens(n: number): string {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
        return String(n);
    }

    function formatCost(usd: number): string {
        if (usd === 0) return '$0.00';
        if (usd < 0.01) return '<$0.01';
        return `$${usd.toFixed(2)}`;
    }

    function displayModel(m: string): string {
        return m
            .replace('gemini-', 'Gemini ')
            .replace('-', ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
</script>
