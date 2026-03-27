<template>
    <v-card>
        <v-card-item>
            <v-card-title class="text-body-1">Source Documents</v-card-title>
            <v-card-subtitle>{{ documents.length }} documents in collection</v-card-subtitle>
        </v-card-item>
        <v-card-text class="pt-0">
            <v-list density="compact" class="pa-0">
                <v-list-item
                    v-for="doc in documents"
                    :key="doc.neid"
                    class="px-0"
                    :active="selectedDocumentNeid === doc.neid"
                    tabindex="0"
                    role="button"
                    @click="focusDocument(doc.neid)"
                    @keydown.enter.prevent="focusDocument(doc.neid)"
                    @keydown.space.prevent="focusDocument(doc.neid)"
                >
                    <template v-slot:prepend>
                        <v-icon size="small" color="info" class="mr-2"> mdi-file-pdf-box </v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">{{ doc.title }}</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                        <span v-if="doc.kind">{{ doc.kind }}</span>
                        <span v-if="doc.date"> &middot; {{ doc.date }}</span>
                        <span class="font-mono ml-1 app-visually-muted">
                            {{ doc.documentId }}
                        </span>
                    </v-list-item-subtitle>
                </v-list-item>
            </v-list>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
    const { documents, selectedDocumentNeid, focusDocument } = useCollectionWorkspace();
</script>
