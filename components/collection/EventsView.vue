<template>
    <div>
        <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-body-1">
                {{ events.length }} events discovered
                <span class="text-medium-emphasis">(hop-2 from hub entities)</span>
            </div>
            <div class="d-flex ga-2">
                <v-select
                    v-model="filterCategory"
                    :items="categoryOptions"
                    label="Category"
                    density="compact"
                    variant="outlined"
                    clearable
                    hide-details
                    style="max-width: 200px"
                />
                <v-text-field
                    v-model="searchQuery"
                    label="Search events"
                    density="compact"
                    variant="outlined"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    hide-details
                    style="max-width: 220px"
                />
            </div>
        </div>

        <v-card v-if="filteredEvents.length === 0">
            <v-card-text class="text-center text-medium-emphasis py-8">
                <v-icon size="48" class="mb-2">mdi-calendar-blank</v-icon>
                <div>
                    {{
                        events.length === 0
                            ? 'Load the graph to discover events from hub entities.'
                            : 'No events match the current filters.'
                    }}
                </div>
            </v-card-text>
        </v-card>

        <v-card v-else>
            <v-card-text class="pa-0">
                <v-data-table
                    :headers="headers"
                    :items="filteredEvents"
                    :items-per-page="20"
                    density="compact"
                    hover
                >
                    <template v-slot:item.name="{ item }">
                        <span class="text-body-2">{{ item.name }}</span>
                    </template>
                    <template v-slot:item.category="{ item }">
                        <v-chip v-if="item.category" size="x-small" variant="tonal">
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
                        {{ item.participantNeids.length }}
                    </template>
                    <template v-slot:item.description="{ item }">
                        <span
                            class="text-caption text-medium-emphasis"
                            style="max-width: 300px; display: inline-block"
                        >
                            {{ truncate(item.description || '', 120) }}
                        </span>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    const { events } = useCollectionWorkspace();

    const filterCategory = ref<string | null>(null);
    const searchQuery = ref('');

    const categoryOptions = computed(() => {
        const cats = new Set(events.value.map((e) => e.category).filter(Boolean));
        return Array.from(cats).sort() as string[];
    });

    const filteredEvents = computed(() => {
        let list = events.value;
        if (filterCategory.value) {
            list = list.filter((e) => e.category === filterCategory.value);
        }
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
