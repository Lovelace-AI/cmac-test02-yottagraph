<template>
    <v-card class="briefing-card h-100" variant="flat">
        <v-card-item class="pb-1">
            <v-card-title class="section-title">Initial Sources</v-card-title>
            <template #append>
                <span class="text-caption text-medium-emphasis">{{ sources.length }} total</span>
            </template>
        </v-card-item>
        <v-card-text class="pt-0 pb-3">
            <v-table density="compact" class="documents-table">
                <tbody>
                    <tr v-for="source in visibleSources" :key="source.id">
                        <td class="cell-document">
                            <div>{{ source.label }}</div>
                            <div class="text-caption text-medium-emphasis">
                                {{ source.sourceType }}
                            </div>
                        </td>
                        <td class="cell-date">{{ source.date || 'N/A' }}</td>
                    </tr>
                </tbody>
            </v-table>
            <div v-if="sources.length > visibleSources.length" class="sources-footer mt-2">
                <span class="text-caption text-medium-emphasis">
                    Showing {{ visibleSources.length }} of {{ sources.length }} sources.
                </span>
                <div ref="loadMoreSentinel" class="load-more-sentinel" aria-hidden="true" />
            </div>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    import type { InitialSourceRow } from '~/utils/overviewBriefing';

    const props = defineProps<{
        sources: InitialSourceRow[];
    }>();

    const INITIAL_SOURCE_BATCH = 8;
    const SOURCE_BATCH_SIZE = 8;

    const visibleCount = ref(Math.min(INITIAL_SOURCE_BATCH, props.sources.length));
    const loadMoreSentinel = ref<HTMLElement | null>(null);
    const canLoadMore = computed(() => visibleCount.value < props.sources.length);
    const visibleSources = computed(() => props.sources.slice(0, visibleCount.value));

    let sentinelObserver: IntersectionObserver | null = null;

    function resetVisibleCount() {
        visibleCount.value = Math.min(INITIAL_SOURCE_BATCH, props.sources.length);
    }

    function loadMoreSources() {
        if (!canLoadMore.value) return;
        visibleCount.value = Math.min(visibleCount.value + SOURCE_BATCH_SIZE, props.sources.length);
    }

    function disconnectObserver() {
        sentinelObserver?.disconnect();
        sentinelObserver = null;
    }

    function observeSentinel() {
        disconnectObserver();
        if (import.meta.server || !canLoadMore.value || !loadMoreSentinel.value) return;
        sentinelObserver = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    loadMoreSources();
                }
            },
            {
                rootMargin: '160px 0px',
                threshold: 0.1,
            }
        );
        sentinelObserver.observe(loadMoreSentinel.value);
    }

    watch(
        () => props.sources.length,
        () => {
            resetVisibleCount();
        }
    );

    watch([canLoadMore, loadMoreSentinel], async () => {
        await nextTick();
        observeSentinel();
    });

    onMounted(() => {
        observeSentinel();
    });

    onBeforeUnmount(() => {
        disconnectObserver();
    });
</script>

<style scoped>
    .briefing-card {
        border: 1px solid var(--app-divider-strong);
        background: color-mix(in srgb, var(--dynamic-surface) 94%, var(--dynamic-background) 6%);
    }

    .section-title {
        font-size: 0.92rem;
        font-weight: 600;
    }

    .documents-table {
        border: 1px solid var(--app-divider);
        border-radius: 10px;
        overflow: hidden;
    }

    .documents-table th {
        white-space: nowrap;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--dynamic-text-muted);
        border-bottom: 1px solid var(--app-divider-strong) !important;
        background: color-mix(
            in srgb,
            var(--dynamic-panel-background) 84%,
            var(--dynamic-background) 16%
        );
        padding: 8px 10px !important;
    }

    .documents-table :deep(tbody tr td) {
        border-bottom: 1px solid var(--app-divider);
        padding: 8px 10px !important;
        font-size: 0.8rem;
        line-height: 1.3;
        vertical-align: middle;
    }

    .documents-table :deep(tbody tr:hover td) {
        background: color-mix(in srgb, var(--dynamic-primary) 6%, transparent);
    }

    .cell-document {
        font-weight: 500;
    }

    .cell-date {
        white-space: nowrap;
        color: var(--dynamic-text-secondary);
    }

    .sources-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .load-more-sentinel {
        width: 100%;
        height: 1px;
    }
</style>
