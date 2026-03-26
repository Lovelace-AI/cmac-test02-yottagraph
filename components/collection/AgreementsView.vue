<template>
    <div>
        <div class="text-body-1 mb-3">{{ agreements.length }} legal agreements in collection</div>

        <v-card v-if="agreements.length === 0">
            <v-card-text class="text-center text-medium-emphasis py-8">
                <v-icon size="48" class="mb-2">mdi-file-document-outline</v-icon>
                <div>Load the graph to discover legal agreements.</div>
            </v-card-text>
        </v-card>

        <v-row v-else>
            <v-col v-for="agreement in agreements" :key="agreement.neid" cols="12" md="6" lg="4">
                <v-card height="100%" class="cursor-pointer" @click="selectEntity(agreement.neid)">
                    <v-card-item>
                        <v-card-title class="text-body-1">{{ agreement.name }}</v-card-title>
                        <v-card-subtitle class="text-caption">
                            <v-chip
                                size="x-small"
                                variant="tonal"
                                :color="agreement.origin === 'document' ? 'success' : 'info'"
                                class="mr-1"
                            >
                                {{ agreement.origin }}
                            </v-chip>
                            {{ agreement.sourceDocuments.length }} source doc(s)
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text class="pt-0">
                        <div class="text-caption text-medium-emphasis font-mono">
                            {{ agreement.neid }}
                        </div>
                        <div v-if="getRelatedEntities(agreement.neid).length" class="mt-2">
                            <div class="text-caption text-medium-emphasis mb-1">
                                Related parties:
                            </div>
                            <v-chip
                                v-for="rel in getRelatedEntities(agreement.neid).slice(0, 5)"
                                :key="rel"
                                size="x-small"
                                variant="outlined"
                                class="mr-1 mb-1"
                            >
                                {{ resolveEntityName(rel) }}
                            </v-chip>
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
    const { agreements, relationships, selectEntity, resolveEntityName } = useCollectionWorkspace();

    function getRelatedEntities(neid: string): string[] {
        const related = new Set<string>();
        for (const r of relationships.value) {
            if (r.sourceNeid === neid) related.add(r.targetNeid);
            if (r.targetNeid === neid) related.add(r.sourceNeid);
        }
        return Array.from(related);
    }
</script>
