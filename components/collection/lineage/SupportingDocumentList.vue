<template>
    <div>
        <div v-if="!documents.length" class="text-body-2 text-medium-emphasis">
            No source documents were attached for this relationship.
        </div>
        <v-list v-else density="compact" class="bg-transparent py-0">
            <v-list-item
                v-for="document in documents"
                :key="`lineage-doc:${document.neid}`"
                class="px-0"
            >
                <template #title>
                    <span class="text-body-2 text-high-emphasis">{{ document.title }}</span>
                </template>
                <template #subtitle>
                    <span class="text-caption text-medium-emphasis">
                        {{
                            [document.kind, document.date]
                                .filter((item): item is string => Boolean(item))
                                .join(' • ') || 'Type/date unavailable'
                        }}
                    </span>
                </template>
            </v-list-item>
        </v-list>
    </div>
</template>

<script setup lang="ts">
    import type { LineageSupportingDocument } from '~/utils/collectionTypes';

    defineProps<{
        documents: LineageSupportingDocument[];
    }>();
</script>
