<template>
    <div class="overview-briefing">
        <v-card class="mb-3 summary-strip" variant="flat">
            <v-card-text class="py-3 px-4">
                <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                    <div class="strip-copy">
                        <div class="text-body-1 font-weight-medium">{{ meta.name }}</div>
                        <div class="text-caption text-medium-emphasis mt-1">
                            {{ summaryLine }}
                        </div>
                    </div>
                    <div class="d-flex align-center flex-wrap ga-2">
                        <v-chip
                            size="small"
                            :color="isReady ? 'success' : 'warning'"
                            variant="tonal"
                        >
                            {{
                                isReady
                                    ? COLLECTION_COPY.status.ready
                                    : COLLECTION_COPY.status.notReady
                            }}
                        </v-chip>
                        <span class="text-caption text-medium-emphasis">
                            {{ collectionSummary }}
                        </span>
                        <span v-if="meta.lastRebuilt" class="text-caption text-medium-emphasis">
                            Updated {{ new Date(meta.lastRebuilt).toLocaleString() }}
                        </span>
                    </div>
                </div>
            </v-card-text>
        </v-card>

        <v-card v-if="!isReady" variant="tonal" color="info" class="mb-3">
            <v-card-text class="py-3 px-4 d-flex align-center ga-2 text-body-2">
                <v-icon size="18">mdi-timer-sand</v-icon>
                Awaiting analysis. Run initial analysis to populate key entities, event drivers, and
                trust coverage evidence.
            </v-card-text>
        </v-card>

        <v-row v-else class="mb-1">
            <v-col cols="6" md="2.4" v-for="metric in primaryMetrics" :key="metric.label">
                <InsightMetricCard
                    :label="metric.label"
                    :value="metric.value"
                    :description="metric.description"
                />
            </v-col>
        </v-row>

        <v-row class="mb-1">
            <v-col cols="12" lg="4">
                <RankedInsightList
                    title="Most Important Entities"
                    subtitle="Ranked by connectivity and evidence"
                    :items="entityItems"
                    empty-text="Run extraction to identify key entities."
                    @select="(id) => selectEntity(id)"
                />
            </v-col>
            <v-col cols="12" lg="4">
                <RankedInsightList
                    title="Key Events"
                    subtitle="Highest-impact events in this collection"
                    :items="eventItems"
                    empty-text="No events detected yet."
                    @select="selectEventEntity"
                />
            </v-col>
            <v-col cols="12" lg="4">
                <TrustCoveragePanel :summary="trustCoverageSummary" :notes="keyCoverageNotes" />
            </v-col>
        </v-row>

        <v-row class="supporting-row">
            <v-col cols="12" lg="6">
                <v-card variant="flat" class="supporting-card">
                    <v-card-item>
                        <v-card-title class="text-body-2">Source Documents</v-card-title>
                    </v-card-item>
                    <v-card-text class="pa-0">
                        <DocumentList />
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" lg="6">
                <v-card variant="flat" class="supporting-card">
                    <v-card-item>
                        <v-card-title class="text-body-2">Relationship Highlights</v-card-title>
                        <template #append>
                            <span class="text-caption text-medium-emphasis"
                                >{{ relationshipHighlights.length }} types</span
                            >
                        </template>
                    </v-card-item>
                    <v-card-text class="pt-0 pb-2">
                        <v-list density="compact" class="pa-0 bg-transparent">
                            <v-list-item
                                v-for="item in relationshipHighlights"
                                :key="item.type"
                                class="px-0"
                            >
                                <v-list-item-title class="text-body-2">
                                    {{ formatRelationshipType(item.type) }}
                                </v-list-item-title>
                                <template #append>
                                    <span class="text-caption text-medium-emphasis">{{
                                        item.count
                                    }}</span>
                                </template>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <TaskActionStrip :actions="recommendedActions" class="mt-2" @run="runTaskAction" />
    </div>
</template>

<script setup lang="ts">
    import type { RankedInsightItem } from '~/components/collection/RankedInsightList.vue';
    import { COLLECTION_COPY, formatRelationshipType } from '~/utils/collectionCopy';

    const {
        meta,
        isReady,
        collectionSummary,
        topEntities,
        topEvents,
        relationshipHighlights,
        trustCoverageSummary,
        keyCoverageNotes,
        recommendedActions,
        propertySeries,
        selectEntity,
        setTab,
        resolveEntityName,
    } = useCollectionWorkspace();

    const summaryLine = computed(
        () =>
            meta.value.description ||
            'Collection-level analysis with traceable entities, events, and evidence.'
    );

    const primaryMetrics = computed(() => [
        {
            label: 'Entities',
            value: meta.value.entityCount,
            description: 'Distinct entities in this collection',
        },
        {
            label: 'Events',
            value: meta.value.eventCount,
            description: 'Key events connected to entities',
        },
        {
            label: 'Relationships',
            value: meta.value.relationshipCount,
            description: 'Links between parties and instruments',
        },
        {
            label: 'Agreements',
            value: meta.value.agreementCount,
            description: 'Legal agreements identified',
        },
        {
            label: COLLECTION_COPY.terms.propertyHistory,
            value: propertySeries.value.length,
            description: 'Historical property series available',
        },
    ]);

    const entityItems = computed<RankedInsightItem[]>(() =>
        topEntities.value.map((entity) => ({
            id: entity.neid,
            title: entity.name,
            subtitle: `${entity.flavor.replace(/_/g, ' ')} · ${entity.relationshipCount} linked relationships`,
            meta: `${entity.eventCount} events`,
            actionable: true,
        }))
    );

    const eventItems = computed<RankedInsightItem[]>(() =>
        topEvents.value.map((event) => ({
            id: event.neid,
            title: event.name,
            subtitle: `${event.category || 'uncategorized'}${event.date ? ` · ${event.date.slice(0, 10)}` : ''}`,
            meta: `${event.participantCount} participants`,
            actionable: true,
        }))
    );

    function runTaskAction(actionId: string) {
        const action = recommendedActions.value.find((item) => item.id === actionId);
        if (!action) return;
        setTab(action.tab);
    }

    function selectEventEntity(eventNeid: string) {
        const event = topEvents.value.find((item) => item.neid === eventNeid);
        if (!event) return;
        const matching = topEntities.value.find((entity) =>
            event.name.toLowerCase().includes(resolveEntityName(entity.neid).toLowerCase())
        );
        if (matching) {
            selectEntity(matching.neid);
            setTab('graph');
        } else {
            setTab('events');
        }
    }
</script>

<style scoped>
    .overview-briefing :deep(.v-card-item) {
        min-height: auto;
        padding-top: 10px;
        padding-bottom: 6px;
    }

    .summary-strip {
        border: 1px solid var(--app-divider-strong);
        background: linear-gradient(
            145deg,
            color-mix(in srgb, var(--dynamic-secondary) 8%, transparent),
            color-mix(in srgb, var(--dynamic-primary) 6%, transparent)
        );
    }

    .strip-copy {
        max-width: 520px;
    }

    .supporting-row :deep(.v-card-text) {
        padding-top: 0;
    }

    .supporting-card {
        border: 1px solid var(--app-divider);
    }
</style>
