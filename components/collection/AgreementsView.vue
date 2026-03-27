<template>
    <div>
        <div class="text-body-1 mb-3">
            {{ agreements.length }} legal agreements in this collection
        </div>

        <v-card v-if="agreements.length === 0">
            <v-card-text class="text-center text-medium-emphasis py-8">
                <v-icon size="48" class="mb-2">mdi-file-document-outline</v-icon>
                <div>No agreements have been identified yet.</div>
            </v-card-text>
        </v-card>

        <v-row v-else>
            <v-col v-for="agreement in agreements" :key="agreement.neid" cols="12" md="6" lg="4">
                <v-card
                    height="100%"
                    class="cursor-pointer app-click-target"
                    tabindex="0"
                    role="button"
                    @click="selectEntity(agreement.neid)"
                    @keydown.enter.prevent="selectEntity(agreement.neid)"
                    @keydown.space.prevent="selectEntity(agreement.neid)"
                >
                    <v-card-item>
                        <v-card-title class="text-body-1">{{ agreement.name }}</v-card-title>
                        <v-card-subtitle class="text-caption text-medium-emphasis">
                            {{ agreement.sourceDocuments.length }} source documents ·
                            {{
                                agreement.origin === 'document'
                                    ? 'directly extracted'
                                    : 'enriched context'
                            }}
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text class="pt-0">
                        <div class="text-caption text-medium-emphasis font-mono mb-2">
                            {{ agreement.neid }}
                        </div>
                        <div class="text-body-2 mb-2">{{ agreementSummary(agreement.neid) }}</div>
                        <div v-if="getRelatedEntities(agreement.neid).length" class="mt-2">
                            <div class="text-caption text-medium-emphasis mb-1">
                                Related parties
                            </div>
                            <v-list density="compact" class="pa-0 bg-transparent">
                                <v-list-item
                                    v-for="rel in getRelatedEntities(agreement.neid).slice(
                                        0,
                                        expandedCount(agreement.neid)
                                    )"
                                    :key="rel"
                                    class="px-0"
                                >
                                    <v-list-item-title class="text-body-2">
                                        {{ resolveEntityName(rel) }}
                                    </v-list-item-title>
                                </v-list-item>
                            </v-list>
                            <v-btn
                                v-if="getRelatedEntities(agreement.neid).length > 3"
                                variant="text"
                                size="small"
                                class="px-0"
                                @click.stop="toggleExpanded(agreement.neid)"
                            >
                                {{
                                    isExpanded(agreement.neid)
                                        ? 'Show fewer parties'
                                        : `Show all ${getRelatedEntities(agreement.neid).length} parties`
                                }}
                            </v-btn>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
    const { agreements, relationships, selectEntity, resolveEntityName } = useCollectionWorkspace();
    const expandedAgreementIds = ref<Set<string>>(new Set());

    function getRelatedEntities(neid: string): string[] {
        const related = new Set<string>();
        for (const r of relationships.value) {
            if (r.sourceNeid === neid) related.add(r.targetNeid);
            if (r.targetNeid === neid) related.add(r.sourceNeid);
        }
        return Array.from(related);
    }

    function agreementSummary(neid: string): string {
        const relatedCount = getRelatedEntities(neid).length;
        if (relatedCount === 0) return 'No linked parties were identified for this agreement.';
        if (relatedCount === 1) return 'Connected to 1 party in the current collection context.';
        return `Connected to ${relatedCount} parties in the current collection context.`;
    }

    function toggleExpanded(neid: string) {
        const next = new Set(expandedAgreementIds.value);
        if (next.has(neid)) next.delete(neid);
        else next.add(neid);
        expandedAgreementIds.value = next;
    }

    function isExpanded(neid: string): boolean {
        return expandedAgreementIds.value.has(neid);
    }

    function expandedCount(neid: string): number {
        return isExpanded(neid) ? 20 : 3;
    }
</script>
