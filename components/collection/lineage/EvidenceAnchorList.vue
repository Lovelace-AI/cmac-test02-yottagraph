<template>
    <div>
        <div v-if="!anchors.length" class="text-body-2 text-medium-emphasis">
            No event anchors were attached.
        </div>
        <v-list v-else density="compact" class="bg-transparent py-0">
            <v-list-item
                v-for="anchor in anchors"
                :key="`lineage-anchor:${anchor.neid}`"
                class="px-0"
            >
                <template #title>
                    <span class="text-body-2 text-high-emphasis">{{ anchor.title }}</span>
                </template>
                <template #subtitle>
                    <div class="text-caption text-medium-emphasis">
                        {{
                            [
                                anchorTypeLabel(anchor.anchorType),
                                anchor.dateLabel ? `Date: ${anchor.dateLabel}` : null,
                            ]
                                .filter((item): item is string => Boolean(item))
                                .join(' • ')
                        }}
                    </div>
                    <div v-if="anchor.snippet" class="text-caption text-medium-emphasis mt-1">
                        {{ anchor.snippet }}
                    </div>
                </template>
            </v-list-item>
        </v-list>
    </div>
</template>

<script setup lang="ts">
    import type { LineageEventAnchor } from '~/utils/collectionTypes';

    defineProps<{
        anchors: LineageEventAnchor[];
    }>();

    function anchorTypeLabel(type: LineageEventAnchor['anchorType']): string {
        if (type === 'bank_succession') return 'Bank succession';
        if (type === 'beneficiary_change') return 'Beneficiary transition';
        return 'Related event';
    }
</script>
