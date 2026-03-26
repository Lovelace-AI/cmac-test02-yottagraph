<template>
    <div>
        <!-- Toolbar -->
        <div class="d-flex align-center justify-space-between mb-3 flex-wrap ga-2">
            <div class="d-flex align-center ga-2">
                <span class="text-body-2 text-medium-emphasis">
                    {{ filteredEvents.length }} of {{ events.length }} events
                </span>
                <v-chip size="x-small" variant="tonal" color="orange">
                    hop-2 from document hubs
                </v-chip>
            </div>
            <div class="d-flex align-center ga-2">
                <v-btn-toggle v-model="viewMode" density="compact" variant="outlined" divided>
                    <v-btn value="table" size="small" prepend-icon="mdi-table">Table</v-btn>
                    <v-btn value="narrative" size="small" prepend-icon="mdi-timeline"
                        >Narrative</v-btn
                    >
                    <v-btn value="dense" size="small" prepend-icon="mdi-chart-timeline"
                        >Timeline</v-btn
                    >
                </v-btn-toggle>
                <v-select
                    v-if="viewMode !== 'dense'"
                    v-model="filterCategory"
                    :items="categoryOptions"
                    label="Category"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    style="max-width: 180px"
                />
                <v-text-field
                    v-if="viewMode !== 'dense'"
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

        <!-- Empty state -->
        <v-card v-if="events.length === 0">
            <v-card-text class="text-center text-medium-emphasis py-8">
                <v-icon size="48" class="mb-2">mdi-calendar-blank</v-icon>
                <div>Load the graph to discover events from hub entities.</div>
            </v-card-text>
        </v-card>

        <!-- Table view -->
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
                        <v-chip v-if="item.category" size="x-small" variant="tonal" color="orange">
                            {{ item.category }}
                        </v-chip>
                    </template>
                    <template v-slot:item.likelihood="{ item }">
                        <v-chip
                            v-if="item.likelihood"
                            size="x-small"
                            variant="tonal"
                            :color="item.likelihood === 'confirmed' ? 'success' : 'warning'"
                        >
                            {{ item.likelihood }}
                        </v-chip>
                    </template>
                    <template v-slot:item.participantNeids="{ item }">
                        <div class="d-flex flex-wrap ga-1">
                            <v-chip
                                v-for="neid in item.participantNeids.slice(0, 3)"
                                :key="neid"
                                size="x-small"
                                variant="outlined"
                                color="primary"
                                class="cursor-pointer"
                                @click.stop="selectEntity(neid)"
                            >
                                {{ resolveEntityName(neid).slice(0, 20) }}
                            </v-chip>
                            <v-chip
                                v-if="item.participantNeids.length > 3"
                                size="x-small"
                                variant="tonal"
                            >
                                +{{ item.participantNeids.length - 3 }}
                            </v-chip>
                        </div>
                    </template>
                    <template v-slot:item.description="{ item }">
                        <span class="text-caption text-medium-emphasis">
                            {{ truncate(item.description || '', 100) }}
                        </span>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>

        <!-- Narrative timeline -->
        <NarrativeTimeline v-else-if="viewMode === 'narrative'" :events="filteredEventsSorted" />

        <!-- Dense analytical timeline -->
        <div v-else-if="viewMode === 'dense'" style="position: relative">
            <DenseTimeline
                :events="events"
                @select="(e) => selectEntity(e.participantNeids[0] ?? null)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
    const { events, selectEntity, resolveEntityName } = useCollectionWorkspace();

    const filterCategory = ref<string | null>(null);
    const searchQuery = ref('');
    const viewMode = ref<'table' | 'narrative' | 'dense'>('table');

    const categoryOptions = computed(() => {
        const cats = new Set(events.value.map((e) => e.category).filter(Boolean));
        return Array.from(cats).sort() as string[];
    });

    const filteredEvents = computed(() => {
        let list = events.value;
        if (filterCategory.value) list = list.filter((e) => e.category === filterCategory.value);
        if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase();
            list = list.filter(
                (e) =>
                    e.name.toLowerCase().includes(q) ||
                    (e.description?.toLowerCase().includes(q) ?? false)
            );
        }
        return list;
    });

    const filteredEventsSorted = computed(() =>
        [...filteredEvents.value].sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.localeCompare(b.date);
        })
    );

    const headers = [
        { title: 'Event', key: 'name', sortable: true },
        { title: 'Category', key: 'category', sortable: true },
        { title: 'Date', key: 'date', sortable: true },
        { title: 'Status', key: 'likelihood', sortable: true },
        { title: 'Participants', key: 'participantNeids', sortable: false },
        { title: 'Description', key: 'description', sortable: false },
    ];

    function truncate(text: string, max: number): string {
        return text.length > max ? text.slice(0, max) + '…' : text;
    }
</script>

<style scoped>
    .cursor-pointer {
        cursor: pointer;
    }
</style>
