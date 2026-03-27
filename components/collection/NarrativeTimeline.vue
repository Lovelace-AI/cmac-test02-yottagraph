<template>
    <div class="narrative-timeline">
        <div v-if="events.length === 0" class="text-center text-medium-emphasis py-8">
            <v-icon size="40" class="mb-2">mdi-timeline</v-icon>
            <div>No events to display.</div>
        </div>
        <div v-else class="timeline-list">
            <div v-for="(evt, idx) in events" :key="evt.neid" class="timeline-item d-flex ga-3">
                <!-- Connector column -->
                <div class="timeline-connector d-flex flex-column align-center" style="width: 24px">
                    <div
                        class="timeline-dot"
                        :style="{ background: categoryColor(evt.category) }"
                    />
                    <div v-if="idx < events.length - 1" class="timeline-line" />
                </div>

                <!-- Card -->
                <v-card
                    class="mb-3 flex-grow-1"
                    density="compact"
                    variant="outlined"
                    :style="{ borderColor: categoryColor(evt.category) + '44' }"
                >
                    <v-card-text class="pa-3">
                        <div class="d-flex align-start justify-space-between mb-1">
                            <div class="text-body-2 font-weight-medium" style="max-width: 80%">
                                {{ evt.name }}
                            </div>
                            <div class="d-flex align-center ga-1 flex-shrink-0 ml-2">
                                <v-chip
                                    v-if="evt.likelihood"
                                    size="x-small"
                                    :color="evt.likelihood === 'confirmed' ? 'success' : 'warning'"
                                    variant="tonal"
                                >
                                    {{ evt.likelihood }}
                                </v-chip>
                                <span v-if="evt.date" class="text-caption text-medium-emphasis">
                                    {{ evt.date.slice(0, 10) }}
                                </span>
                            </div>
                        </div>

                        <div class="d-flex align-center ga-1 mb-2">
                            <v-chip
                                v-if="evt.category"
                                size="x-small"
                                variant="tonal"
                                :color="categoryColor(evt.category)"
                            >
                                {{ evt.category }}
                            </v-chip>
                        </div>

                        <div
                            v-if="evt.description"
                            class="text-caption text-medium-emphasis mb-2"
                            style="line-height: 1.4"
                        >
                            {{ evt.description.slice(0, 200)
                            }}{{ evt.description.length > 200 ? '…' : '' }}
                        </div>

                        <!-- Participant summary -->
                        <div
                            v-if="participantEntities(evt).length > 0"
                            class="d-flex flex-wrap ga-1 align-center"
                        >
                            <span
                                v-for="ent in participantEntities(evt).slice(0, 5)"
                                :key="ent.neid"
                                class="participant-link text-body-2"
                                tabindex="0"
                                role="button"
                                @click="selectEntity(ent.neid)"
                                @keydown.enter.prevent="selectEntity(ent.neid)"
                                @keydown.space.prevent="selectEntity(ent.neid)"
                            >
                                {{ ent.name }}
                            </span>
                            <span
                                v-if="participantEntities(evt).length > 5"
                                class="text-caption text-medium-emphasis"
                            >
                                +{{ participantEntities(evt).length - 5 }}
                            </span>
                        </div>
                    </v-card-text>
                </v-card>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { EventRecord } from '~/utils/collectionTypes';

    defineProps<{ events: EventRecord[] }>();

    const { entities, selectEntity } = useCollectionWorkspace();

    const entityByNeid = computed(() => {
        const m = new Map<string, (typeof entities.value)[0]>();
        for (const e of entities.value) m.set(e.neid, e);
        return m;
    });

    function participantEntities(evt: EventRecord) {
        return evt.participantNeids.map((n) => entityByNeid.value.get(n)).filter(Boolean) as any[];
    }

    function categoryColor(cat?: string): string {
        if (!cat) return '#9E9E9E';
        const c = cat.toLowerCase();
        if (c.includes('issu') || c.includes('bond')) return '#42A5F5';
        if (c.includes('rebate') || c.includes('valuation')) return '#66BB6A';
        if (c.includes('payment') || c.includes('refund')) return '#FFA726';
        if (c.includes('legal') || c.includes('credit')) return '#EF5350';
        return '#AB47BC';
    }
</script>

<style scoped>
    .timeline-connector {
        padding-top: 6px;
    }

    .timeline-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        flex-shrink: 0;
        margin-bottom: 2px;
    }

    .timeline-line {
        width: 2px;
        flex-grow: 1;
        background: var(--app-divider-strong);
        margin-top: 2px;
        margin-bottom: -12px;
    }

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
