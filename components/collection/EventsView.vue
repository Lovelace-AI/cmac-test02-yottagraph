<template>
    <div>
        <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
            <div class="d-flex align-center ga-2">
                <span class="text-body-2 text-medium-emphasis">
                    {{ filteredEvents.length }} of {{ events.length }} events
                </span>
                <v-chip size="x-small" variant="outlined">Derived from linked entities</v-chip>
            </div>
            <div class="d-flex align-center ga-2 flex-wrap justify-end">
                <v-btn-toggle v-model="viewMode" density="compact" variant="outlined" divided>
                    <v-btn value="table" size="small" prepend-icon="mdi-table">Table</v-btn>
                    <v-btn value="narrative" size="small" prepend-icon="mdi-timeline"
                        >Episodes</v-btn
                    >
                    <v-btn value="dense" size="small" prepend-icon="mdi-chart-timeline"
                        >Timeline</v-btn
                    >
                </v-btn-toggle>
                <v-select
                    v-model="filterCategory"
                    :items="categoryOptions"
                    label="Event type"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    style="max-width: 180px"
                />
                <v-select
                    v-model="filterDomain"
                    :items="domainOptions"
                    label="Domain"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    style="max-width: 170px"
                />
                <v-select
                    v-model="filterConfidence"
                    :items="confidenceOptions"
                    label="Confidence"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    style="max-width: 170px"
                />
                <v-text-field
                    v-model="searchQuery"
                    label="Search events"
                    density="compact"
                    variant="outlined"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    hide-details
                    style="max-width: 200px"
                />
            </div>
        </div>

        <div class="d-flex align-center ga-2 flex-wrap mb-3">
            <v-text-field
                v-model="participantQuery"
                label="Participant"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                style="max-width: 180px"
            />
            <v-select
                v-model="sourceDocumentFilter"
                :items="sourceDocumentOptions"
                label="Source document"
                density="compact"
                variant="outlined"
                hide-details
                clearable
                style="max-width: 250px"
            />
            <v-text-field
                v-model="fromDate"
                label="From date"
                type="date"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 180px"
            />
            <v-text-field
                v-model="toDate"
                label="To date"
                type="date"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 180px"
            />
        </div>

        <v-card v-if="events.length === 0">
            <v-card-text class="text-center text-medium-emphasis py-8">
                <v-icon size="48" class="mb-2">mdi-calendar-blank</v-icon>
                <div>No events are available yet. Run extraction to generate a timeline.</div>
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
                    <template v-slot:item.significance="{ item }">
                        <span class="text-body-2 font-weight-medium">{{ item.significance }}</span>
                    </template>
                    <template v-slot:item.likelihood="{ item }">
                        <span class="text-body-2">{{ item.likelihood || 'unknown' }}</span>
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
                        <span class="text-caption text-medium-emphasis">
                            {{ truncate(item.description || '', 100) }}
                        </span>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>

        <NarrativeTimeline v-else-if="viewMode === 'narrative'" :events="filteredEventsSorted" />

        <div v-else-if="viewMode === 'dense'" style="position: relative">
            <DenseTimeline
                :events="filteredEventsSorted"
                @select="(eventItem) => selectEntity(eventItem.participantNeids[0] ?? null)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
    const { events, selectEntity, resolveEntityName } = useCollectionWorkspace();

    const filterCategory = ref<string | null>(null);
    const filterDomain = ref<string | null>(null);
    const filterConfidence = ref<string | null>(null);
    const sourceDocumentFilter = ref<string | null>(null);
    const participantQuery = ref('');
    const fromDate = ref('');
    const toDate = ref('');
    const searchQuery = ref('');
    const viewMode = ref<'table' | 'narrative' | 'dense'>('table');

    const categoryOptions = computed(() => {
        const cats = new Set(events.value.map((eventItem) => eventItem.category).filter(Boolean));
        return Array.from(cats).sort() as string[];
    });

    const confidenceOptions = ['confirmed', 'likely', 'possible'];
    const domainOptions = ['legal', 'financial', 'operational'];

    const sourceDocumentOptions = computed(() =>
        Array.from(
            new Set(
                events.value.flatMap((eventItem) =>
                    eventItem.sourceDocuments.filter((docNeid) => Boolean(docNeid))
                )
            )
        )
    );

    const filteredEvents = computed(() => {
        let list = events.value;
        if (filterCategory.value)
            list = list.filter((eventItem) => eventItem.category === filterCategory.value);
        if (filterConfidence.value) {
            list = list.filter(
                (eventItem) => (eventItem.likelihood || 'possible') === filterConfidence.value
            );
        }
        if (filterDomain.value) {
            list = list.filter((eventItem) => inferDomain(eventItem) === filterDomain.value);
        }
        if (sourceDocumentFilter.value) {
            list = list.filter((eventItem) =>
                eventItem.sourceDocuments.includes(sourceDocumentFilter.value as string)
            );
        }
        if (participantQuery.value) {
            const query = participantQuery.value.toLowerCase();
            list = list.filter((eventItem) =>
                eventItem.participantNeids.some((neid) =>
                    resolveEntityName(neid).toLowerCase().includes(query)
                )
            );
        }
        if (fromDate.value) {
            list = list.filter(
                (eventItem) => !eventItem.date || eventItem.date.slice(0, 10) >= fromDate.value
            );
        }
        if (toDate.value) {
            list = list.filter(
                (eventItem) => !eventItem.date || eventItem.date.slice(0, 10) <= toDate.value
            );
        }
        if (searchQuery.value) {
            const query = searchQuery.value.toLowerCase();
            list = list.filter(
                (eventItem) =>
                    eventItem.name.toLowerCase().includes(query) ||
                    (eventItem.description?.toLowerCase().includes(query) ?? false)
            );
        }
        return list
            .map((eventItem) => ({
                ...eventItem,
                significance: computeSignificance(eventItem),
            }))
            .sort((a, b) => {
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
        { title: 'Importance', key: 'significance', sortable: true },
        { title: 'Confidence', key: 'likelihood', sortable: true },
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

    function inferDomain(eventItem: (typeof events.value)[number]): string {
        const category = (eventItem.category || '').toLowerCase();
        if (
            category.includes('agreement') ||
            category.includes('contract') ||
            category.includes('legal')
        )
            return 'legal';
        if (
            category.includes('fund') ||
            category.includes('rebate') ||
            category.includes('finance')
        )
            return 'financial';
        return 'operational';
    }

    function truncate(text: string, max: number): string {
        return text.length > max ? text.slice(0, max) + '…' : text;
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
