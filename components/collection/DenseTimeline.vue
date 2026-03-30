<template>
    <div class="dense-timeline">
        <!-- Controls -->
        <div class="d-flex align-center ga-2 mb-2 flex-wrap">
            <v-btn-toggle
                v-model="zoom"
                density="compact"
                variant="outlined"
                divided
                size="x-small"
            >
                <v-btn value="year">Year</v-btn>
                <v-btn value="decade">Decade</v-btn>
                <v-btn value="all">All</v-btn>
            </v-btn-toggle>
            <v-chip-group v-model="selectedCategories" multiple density="compact">
                <v-chip
                    v-for="cat in categories"
                    :key="cat"
                    :value="cat"
                    size="x-small"
                    variant="tonal"
                    filter
                >
                    {{ cat }}
                </v-chip>
            </v-chip-group>
        </div>

        <!-- SVG timeline -->
        <div class="timeline-scroll-wrapper" @scroll="onScroll">
            <svg :width="svgWidth" :height="svgHeight" class="timeline-svg">
                <!-- Time axis -->
                <line
                    :x1="marginLeft"
                    :y1="axisY"
                    :x2="svgWidth - marginRight"
                    :y2="axisY"
                    :stroke="axisLineColor"
                    stroke-width="1"
                />

                <!-- Tick marks and labels -->
                <g v-for="tick in ticks" :key="tick.label">
                    <line
                        :x1="tick.x"
                        :y1="axisY - 4"
                        :x2="tick.x"
                        :y2="axisY + 4"
                        :stroke="tickLineColor"
                        stroke-width="1"
                    />
                    <text
                        :x="tick.x"
                        :y="axisY + 18"
                        text-anchor="middle"
                        :fill="tickLabelColor"
                        font-size="10"
                    >
                        {{ tick.label }}
                    </text>
                </g>

                <!-- Swim lanes -->
                <g v-for="(lane, laneIdx) in swimLanes" :key="lane.category">
                    <text
                        :x="marginLeft - 6"
                        :y="laneY(laneIdx) + laneHeight / 2 + 4"
                        text-anchor="end"
                        :fill="laneLabelColor"
                        font-size="9"
                    >
                        {{ lane.category.slice(0, 14) }}
                    </text>
                    <line
                        :x1="marginLeft"
                        :y1="laneY(laneIdx)"
                        :x2="svgWidth - marginRight"
                        :y2="laneY(laneIdx)"
                        :stroke="laneLineColor"
                        stroke-width="1"
                    />
                    <!-- Events in this lane -->
                    <g v-for="evt in lane.events" :key="evt.neid">
                        <circle
                            :cx="dateToX(resolveEventDate(evt))"
                            :cy="laneY(laneIdx) + laneHeight / 2"
                            :r="hoveredNeid === evt.neid ? 7 : 5"
                            :fill="categoryColor(lane.category)"
                            :opacity="hoveredNeid === evt.neid ? 1 : eventPointOpacity"
                            style="cursor: pointer; transition: r 0.1s"
                            @mouseenter="onEnter(evt, $event)"
                            @mouseleave="onLeave"
                            @click="$emit('select', evt)"
                        />
                    </g>
                </g>
            </svg>
        </div>

        <!-- Hover tooltip -->
        <div
            v-if="hoverEvt"
            class="dense-tooltip"
            :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
        >
            <div class="text-caption font-weight-bold">{{ hoverEvt.name }}</div>
            <div v-if="resolveEventDate(hoverEvt)" class="text-caption text-medium-emphasis">
                {{ resolveEventDate(hoverEvt)?.slice(0, 10) }}
            </div>
            <div v-if="hoverEvt.category" class="text-caption text-medium-emphasis">
                {{ hoverEvt.category }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { EventRecord } from '~/utils/collectionTypes';

    const props = defineProps<{ events: EventRecord[] }>();
    const emit = defineEmits<{ select: [evt: EventRecord] }>();

    const zoom = ref<'year' | 'decade' | 'all'>('all');
    const selectedCategories = ref<string[]>([]);
    const hoveredNeid = ref<string | null>(null);
    const hoverEvt = ref<EventRecord | null>(null);
    const tooltipX = ref(0);
    const tooltipY = ref(0);
    const { colorMode } = useAppColorMode();

    const marginLeft = 100;
    const marginRight = 20;
    const marginTop = 20;
    const laneHeight = 30;
    const axisY = 20;

    const categories = computed(() => {
        const cats = new Set(props.events.map((e) => e.category).filter(Boolean) as string[]);
        return Array.from(cats).sort();
    });

    const filteredEvents = computed(() => {
        let evts = props.events.filter((e) => Boolean(resolveEventDate(e)));
        if (selectedCategories.value.length > 0) {
            evts = evts.filter((e) => selectedCategories.value.includes(e.category ?? ''));
        }
        return evts;
    });

    const swimLanes = computed(() => {
        const laneMap = new Map<string, EventRecord[]>();
        for (const evt of filteredEvents.value) {
            const cat = evt.category ?? 'Other';
            const lane = laneMap.get(cat) ?? [];
            lane.push(evt);
            laneMap.set(cat, lane);
        }
        return Array.from(laneMap.entries()).map(([category, events]) => ({ category, events }));
    });

    const svgHeight = computed(
        () => marginTop + axisY + 24 + swimLanes.value.length * laneHeight + 16
    );
    const svgWidth = computed(() => Math.max(800, window?.innerWidth ?? 800));

    const dateRange = computed(() => {
        const dates = filteredEvents.value
            .map((e) => new Date(resolveEventDate(e)!).getTime())
            .filter(isFinite);
        if (!dates.length) return { min: Date.now() - 1e10, max: Date.now() };
        return { min: Math.min(...dates), max: Math.max(...dates) };
    });

    const ticks = computed(() => {
        const { min, max } = dateRange.value;
        const range = max - min || 1;
        const tickCount = 8;
        return Array.from({ length: tickCount }, (_, i) => {
            const t = min + (range * i) / (tickCount - 1);
            const d = new Date(t);
            return {
                x: marginLeft + ((t - min) / range) * (svgWidth.value - marginLeft - marginRight),
                label: d.getFullYear().toString(),
            };
        });
    });

    const axisLineColor = computed(() =>
        colorMode.value === 'light' ? 'rgba(16,24,40,0.24)' : 'rgba(255,255,255,0.22)'
    );
    const tickLineColor = computed(() =>
        colorMode.value === 'light' ? 'rgba(16,24,40,0.35)' : 'rgba(255,255,255,0.38)'
    );
    const tickLabelColor = computed(() =>
        colorMode.value === 'light' ? 'rgba(16,24,40,0.78)' : 'rgba(255,255,255,0.68)'
    );
    const laneLabelColor = computed(() =>
        colorMode.value === 'light' ? 'rgba(16,24,40,0.76)' : 'rgba(255,255,255,0.60)'
    );
    const laneLineColor = computed(() =>
        colorMode.value === 'light' ? 'rgba(16,24,40,0.10)' : 'rgba(255,255,255,0.08)'
    );
    const eventPointOpacity = computed(() => (colorMode.value === 'light' ? 0.92 : 0.75));

    function dateToX(dateStr?: string): number {
        const resolved = dateStr ? dateStr : undefined;
        if (!resolved) return marginLeft;
        const t = new Date(resolved).getTime();
        const { min, max } = dateRange.value;
        const range = max - min || 1;
        return marginLeft + ((t - min) / range) * (svgWidth.value - marginLeft - marginRight);
    }

    function resolveEventDate(evt: EventRecord): string | undefined {
        if (evt.date) return evt.date;
        const props = (evt.properties ?? {}) as Record<string, unknown>;
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

    function laneY(idx: number): number {
        return marginTop + axisY + 24 + idx * laneHeight;
    }

    function categoryColor(cat: string): string {
        const c = cat.toLowerCase();
        if (c.includes('issu') || c.includes('bond')) return '#42A5F5';
        if (c.includes('rebate') || c.includes('valuation')) return '#66BB6A';
        if (c.includes('payment') || c.includes('refund')) return '#FFA726';
        if (c.includes('legal') || c.includes('credit')) return '#EF5350';
        return '#AB47BC';
    }

    function onEnter(evt: EventRecord, e: MouseEvent) {
        hoveredNeid.value = evt.neid;
        hoverEvt.value = evt;
        tooltipX.value = e.offsetX + 12;
        tooltipY.value = e.offsetY - 10;
    }

    function onLeave() {
        hoveredNeid.value = null;
        hoverEvt.value = null;
    }

    function onScroll() {
        hoverEvt.value = null;
    }
</script>

<style scoped>
    .timeline-scroll-wrapper {
        overflow-x: auto;
        overflow-y: hidden;
        background: color-mix(in srgb, var(--dynamic-surface) 92%, var(--dynamic-background) 8%);
        border: 1px solid var(--app-divider);
        border-radius: 6px;
        position: relative;
    }

    .timeline-svg {
        display: block;
    }

    .dense-tooltip {
        position: absolute;
        background: color-mix(in srgb, var(--dynamic-surface) 95%, var(--dynamic-background) 5%);
        border: 1px solid var(--app-divider-strong);
        border-radius: 6px;
        padding: 6px 8px;
        pointer-events: none;
        z-index: 20;
        backdrop-filter: blur(6px);
        color: var(--dynamic-text-primary);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
    }
</style>
