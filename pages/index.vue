<template>
    <div class="d-flex flex-column fill-height">
        <div class="workspace-header flex-shrink-0 px-4 pt-3 pb-0">
            <div class="d-flex align-center justify-space-between mb-3">
                <div>
                    <div class="text-h6 font-headline">Collection Intelligence</div>
                    <div class="text-caption text-medium-emphasis">
                        BNY Rebate Analysis — 5 source documents
                    </div>
                </div>
                <div class="d-flex align-center ga-2">
                    <v-chip size="small" :color="isReady ? 'success' : 'default'" variant="tonal">
                        {{ isReady ? 'Graph Loaded' : 'Not Loaded' }}
                    </v-chip>
                    <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-refresh"
                        :loading="rebuilding"
                        @click="rebuild"
                    >
                        {{ isReady ? 'Rebuild' : 'Load Graph' }}
                    </v-btn>
                </div>
            </div>

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

        <v-progress-linear v-if="isLoading" indeterminate color="primary" class="flex-shrink-0" />

        <div class="flex-grow-1 overflow-y-auto px-4 py-4">
            <v-alert v-if="collection.error" type="error" variant="tonal" class="mb-4" closable>
                {{ collection.error }}
            </v-alert>

            <CollectionOverview v-if="currentTab === 'overview'" />
            <GraphWorkspace v-else-if="currentTab === 'graph'" />
            <EventsView v-else-if="currentTab === 'events'" />
            <AgreementsView v-else-if="currentTab === 'agreements'" />
            <ValidationView v-else-if="currentTab === 'validation'" />
            <AgentWorkspace v-else-if="currentTab === 'agent'" />
            <EnrichmentView v-else-if="currentTab === 'enrichment'" />
        </div>

        <EntityDetailPanel />
    </div>
</template>

<script setup lang="ts">
    import type { WorkspaceTab } from '~/utils/collectionTypes';

    const { collection, isReady, isLoading, rebuilding, rebuild, bootstrap, setTab } =
        useCollectionWorkspace();

    const currentTab = ref<WorkspaceTab>('overview');

    watch(currentTab, (tab) => setTab(tab));

    const tabs: Array<{ value: WorkspaceTab; label: string; icon: string }> = [
        { value: 'overview', label: 'Overview', icon: 'mdi-view-dashboard-outline' },
        { value: 'graph', label: 'Graph', icon: 'mdi-graph-outline' },
        { value: 'events', label: 'Events', icon: 'mdi-calendar-outline' },
        { value: 'agreements', label: 'Agreements', icon: 'mdi-file-document-outline' },
        { value: 'validation', label: 'Validation', icon: 'mdi-check-decagram-outline' },
        { value: 'agent', label: 'Agent', icon: 'mdi-robot-outline' },
        { value: 'enrichment', label: 'Enrichment', icon: 'mdi-arrow-expand-all' },
    ];

    onMounted(() => {
        bootstrap();
    });
</script>

<style scoped>
    .workspace-header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .workspace-tabs :deep(.v-tab) {
        text-transform: none;
        letter-spacing: normal;
        font-size: 0.8125rem;
        min-width: 0;
        padding: 0 12px;
    }
</style>
