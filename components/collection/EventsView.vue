<template>
    <div class="events-view">
        <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
            <div class="d-flex align-center ga-1 flex-wrap">
                <v-chip size="small" variant="tonal" color="primary">
                    {{ formatNumber(filteredEvents.length) }} events
                </v-chip>
                <v-chip size="small" variant="outlined"
                    >{{ formatNumber(events.length) }} total</v-chip
                >
                <v-chip size="small" variant="outlined">Evidence-linked</v-chip>
            </div>
            <v-btn-toggle v-model="viewMode" density="compact" variant="outlined" divided>
                <v-btn value="timeline" size="small" prepend-icon="mdi-chart-timeline"
                    >Timeline</v-btn
                >
                <v-btn value="table" size="small" prepend-icon="mdi-table">Table</v-btn>
            </v-btn-toggle>
        </div>

        <v-card v-if="events.length === 0">
            <v-card-text class="text-center text-medium-emphasis py-8">
                <v-icon size="48" class="mb-2">mdi-calendar-blank</v-icon>
                <div>No extracted events found for this collection yet.</div>
            </v-card-text>
        </v-card>

        <v-card v-else-if="viewMode === 'table'">
            <v-card-text class="pa-0">
                <v-data-table
                    :headers="headers"
                    :items="filteredEvents"
                    :items-per-page="20"
                    density="compact"
                    hover
                    @click:row="
                        (_: any, row: any) => selectEntity(row.item.participantNeids[0] ?? null)
                    "
                >
                    <template v-slot:item.name="{ item }">
                        <span class="text-body-2">{{ item.name }}</span>
                    </template>
                    <template v-slot:item.category="{ item }">
                        <span class="text-body-2">{{ item.category || 'Uncategorized' }}</span>
                    </template>
                    <template v-slot:item.participantNeids="{ item }">
                        <div class="d-flex flex-wrap ga-1 align-center">
                            <span
                                v-for="neid in item.participantNeids.slice(0, 2)"
                                :key="neid"
                                class="text-body-2 participant-link"
                                tabindex="0"
                                role="button"
                                @click.stop="selectEntity(neid)"
                                @keydown.enter.stop.prevent="selectEntity(neid)"
                                @keydown.space.stop.prevent="selectEntity(neid)"
                            >
                                {{ resolveEntityName(neid).slice(0, 22) }}
                            </span>
                            <span
                                v-if="item.participantNeids.length > 2"
                                class="text-caption text-medium-emphasis"
                            >
                                +{{ item.participantNeids.length - 2 }} more
                            </span>
                        </div>
                    </template>
                    <template v-slot:item.sourceDocuments="{ item }">
                        <span class="text-caption text-medium-emphasis">
                            {{ item.sourceDocuments.length }} docs
                        </span>
                    </template>
                    <template v-slot:item.description="{ item }">
                        <span
                            class="text-caption text-medium-emphasis"
                            :title="item.description || ''"
                        >
                            {{ truncate(item.description || '', 100) }}
                        </span>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>

        <div v-else-if="viewMode === 'timeline'" style="position: relative">
            <DenseTimeline
                :events="filteredEventsSorted"
                @select="(eventItem) => selectEntity(eventItem.participantNeids[0] ?? null)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
    const { documentEvents: events, selectEntity, resolveEntityName } = useCollectionWorkspace();

    type EventViewMode = 'timeline' | 'table';
    const viewMode = ref<EventViewMode>('timeline');

    const filteredEvents = computed(() => {
        let list = events.value.map((eventItem) => {
            const significance = computeSignificance(eventItem);
            const resolvedDate = resolveEventDate(eventItem);
            return {
                ...eventItem,
                date: resolvedDate ?? eventItem.date,
                significance,
            };
        });
        return list.sort((a, b) => {
            if (b.significance !== a.significance) return b.significance - a.significance;
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
        });
    });

    const filteredEventsSorted = computed(() => filteredEvents.value);

    const headers = [
        { title: 'Event', key: 'name', sortable: true },
        { title: 'Type', key: 'category', sortable: true },
        { title: 'Date', key: 'date', sortable: true },
        { title: 'Key participants', key: 'participantNeids', sortable: false },
        { title: 'Sources', key: 'sourceDocuments', sortable: false },
        { title: 'Summary', key: 'description', sortable: false },
    ];

    function computeSignificance(eventItem: (typeof events.value)[number]): number {
        const participantWeight = eventItem.participantNeids.length * 2;
        const sourceWeight = eventItem.sourceDocuments.length;
        const confidenceWeight =
            eventItem.likelihood === 'confirmed'
                ? 3
                : eventItem.likelihood === 'likely'
                  ? 2
                  : eventItem.likelihood === 'possible'
                    ? 1
                    : 0;
        return participantWeight + sourceWeight + confidenceWeight;
    }

    function resolveEventDate(eventItem: (typeof events.value)[number]): string | undefined {
        if (eventItem.date) return eventItem.date;
        const props = (eventItem.properties ?? {}) as Record<string, unknown>;
        const candidateKeys = [
            'event_date',
            'date',
            'schema::property::event_date',
            'schema::property::date',
        ];
        for (const key of candidateKeys) {
            if (!(key in props)) continue;
            const value = props[key] as any;
            const scalar =
                value && typeof value === 'object' && !Array.isArray(value) ? value.value : value;
            const text = String(scalar ?? '').trim();
            if (text) return text;
        }
        return undefined;
    }

    function truncate(text: string, max: number): string {
        return text.length > max ? text.slice(0, max) + '…' : text;
    }

    function formatNumber(value: number): string {
        return value.toLocaleString();
    }
</script>

<style scoped>
    .participant-link {
        cursor: pointer;
        color: rgb(var(--v-theme-primary));
        text-decoration: underline;
        text-underline-offset: 2px;
    }

    .participant-link:focus-visible {
        outline: 2px solid var(--app-focus-ring);
        outline-offset: 2px;
        border-radius: 3px;
    }
</style>
