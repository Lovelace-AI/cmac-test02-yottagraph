<template>
    <div>
        <v-card class="mb-4" variant="flat">
            <v-card-item>
                <v-card-title class="text-body-1">Trust & Coverage</v-card-title>
                <v-card-subtitle>
                    Understand what is directly evidenced, what is inferred, and where
                    interpretation is limited.
                </v-card-subtitle>
            </v-card-item>
            <v-card-text>
                <v-row>
                    <v-col cols="12" md="4">
                        <InsightMetricCard
                            label="Extracted baseline entities"
                            :value="extractedEntityCount"
                            description="Entities extracted directly from the source JSON graph."
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <InsightMetricCard
                            label="MCP-confirmed entities"
                            :value="mcpConfirmedEntityCount"
                            description="Extracted entities confirmed through live MCP NEID calls."
                        />
                    </v-col>
                    <v-col cols="12" md="4">
                        <InsightMetricCard
                            label="MCP-only extra doc links"
                            :value="mcpOnlyExtraRelationshipCount"
                            description="Additional document mentions returned by MCP beyond extracted baseline."
                        />
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <v-row class="mb-4">
            <v-col cols="12" md="6">
                <v-card variant="flat" class="h-100">
                    <v-card-item>
                        <v-card-title class="text-body-1">What Is Complete</v-card-title>
                    </v-card-item>
                    <v-card-text class="pt-0">
                        <v-list density="compact" class="pa-0 bg-transparent">
                            <v-list-item v-for="item in completeItems" :key="item" class="px-0">
                                <template #prepend>
                                    <v-icon size="16" color="success" class="mr-2"
                                        >mdi-check-circle</v-icon
                                    >
                                </template>
                                <v-list-item-title class="text-body-2 text-wrap">{{
                                    item
                                }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>
            <v-col cols="12" md="6">
                <v-card variant="flat" class="h-100">
                    <v-card-item>
                        <v-card-title class="text-body-1">What Is Partial</v-card-title>
                    </v-card-item>
                    <v-card-text class="pt-0">
                        <v-list density="compact" class="pa-0 bg-transparent">
                            <v-list-item v-for="item in partialItems" :key="item" class="px-0">
                                <template #prepend>
                                    <v-icon size="16" color="warning" class="mr-2"
                                        >mdi-alert-circle</v-icon
                                    >
                                </template>
                                <v-list-item-title class="text-body-2 text-wrap">{{
                                    item
                                }}</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-card class="mb-4" variant="flat">
            <v-card-item>
                <v-card-title class="text-body-1">Provenance Breakdown</v-card-title>
            </v-card-item>
            <v-card-text class="pt-0">
                <v-row>
                    <v-col cols="12" md="6">
                        <div class="text-caption text-medium-emphasis mb-1">Entity origin</div>
                        <v-progress-linear
                            :model-value="entityOriginBreakdown.document"
                            rounded
                            color="success"
                            class="mb-1"
                        />
                        <div class="text-caption text-medium-emphasis mb-2">
                            {{ entityOriginBreakdown.document }}% document-derived ·
                            {{ entityOriginBreakdown.enriched }}% enriched
                        </div>
                    </v-col>
                    <v-col cols="12" md="6">
                        <div class="text-caption text-medium-emphasis mb-1">
                            Relationship provenance
                        </div>
                        <v-progress-linear
                            :model-value="relationshipEvidenceShare"
                            rounded
                            color="primary"
                            class="mb-1"
                        />
                        <div class="text-caption text-medium-emphasis mb-2">
                            {{ relationshipEvidenceShare }}% source-backed ·
                            {{ 100 - relationshipEvidenceShare }}% inferred
                        </div>
                    </v-col>
                </v-row>
                <v-divider class="my-2" />
                <div class="text-caption text-medium-emphasis mb-2">
                    Origin labels used in this app
                </div>
                <v-list density="compact" class="pa-0 bg-transparent">
                    <v-list-item class="px-0">
                        <template #prepend>
                            <v-icon size="15" color="success" class="mr-2"
                                >mdi-file-check-outline</v-icon
                            >
                        </template>
                        <v-list-item-title class="text-body-2">
                            Directly extracted: appears in source documents with explicit evidence.
                        </v-list-item-title>
                    </v-list-item>
                    <v-list-item class="px-0">
                        <template #prepend>
                            <v-icon size="15" color="info" class="mr-2">mdi-graph-outline</v-icon>
                        </template>
                        <v-list-item-title class="text-body-2">
                            Inferred/resolved: linked by graph reasoning or entity resolution.
                        </v-list-item-title>
                    </v-list-item>
                    <v-list-item class="px-0">
                        <template #prepend>
                            <v-icon size="15" color="warning" class="mr-2"
                                >mdi-robot-outline</v-icon
                            >
                        </template>
                        <v-list-item-title class="text-body-2">
                            Agent-generated: narrative synthesis that should be validated against
                            citations.
                        </v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>

        <v-card variant="flat">
            <v-card-item>
                <v-card-title class="text-body-1">What To Verify Next</v-card-title>
            </v-card-item>
            <v-card-text class="pt-0">
                <v-list density="comfortable" class="pa-0 bg-transparent">
                    <v-list-item v-for="step in recommendedChecks" :key="step" class="px-0">
                        <template #prepend>
                            <v-icon size="16" color="primary" class="mr-2"
                                >mdi-arrow-right-circle</v-icon
                            >
                        </template>
                        <v-list-item-title class="text-body-2 text-wrap">{{
                            step
                        }}</v-list-item-title>
                    </v-list-item>
                </v-list>
            </v-card-text>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    const {
        entities,
        relationships,
        trustCoverageSummary,
        keyCoverageNotes,
        topEntities,
        topEvents,
    } = useCollectionWorkspace();

    const extractedEntityCount = computed(
        () => entities.value.filter((entity) => entity.extractedSeed).length
    );
    const mcpConfirmedEntityCount = computed(
        () => entities.value.filter((entity) => entity.mcpConfirmed).length
    );
    const mcpOnlyExtraRelationshipCount = computed(
        () => relationships.value.filter((rel) => rel.mcpOnly).length
    );

    const relationshipEvidenceShare = computed(() => {
        const total = Math.max(relationships.value.length, 1);
        return Math.round((trustCoverageSummary.value.evidenceBackedRelationships / total) * 100);
    });

    const entityOriginBreakdown = computed(() => {
        const total = Math.max(entities.value.length, 1);
        const documentCount = entities.value.filter(
            (entity) => entity.origin === 'document'
        ).length;
        const enrichedCount = entities.value.filter(
            (entity) => entity.origin === 'enriched'
        ).length;
        return {
            document: Math.round((documentCount / total) * 100),
            enriched: Math.round((enrichedCount / total) * 100),
        };
    });

    const completeItems = computed(() => {
        const items = [
            `${extractedEntityCount.value} extracted baseline entities are loaded with stable IDs.`,
            `${mcpConfirmedEntityCount.value} extracted entities have live MCP confirmation.`,
            `${relationships.value.length} relationships are available for cross-entity analysis.`,
            `${topEvents.value.length} high-signal events are ranked for timeline review.`,
        ];
        if (trustCoverageSummary.value.coverageScore >= 75) {
            items.push('Coverage score indicates strong traceability for core findings.');
        }
        return items;
    });

    const partialItems = computed(() => {
        const items = [...keyCoverageNotes.value];
        if (mcpOnlyExtraRelationshipCount.value > 0) {
            items.push(
                `${mcpOnlyExtraRelationshipCount.value} MCP-only document links are additive evidence beyond the extracted baseline.`
            );
        }
        if (trustCoverageSummary.value.inferredRelationships > 0) {
            items.push(
                `${trustCoverageSummary.value.inferredRelationships} relationships are inferred and should be checked before external reporting.`
            );
        }
        return items;
    });

    const recommendedChecks = computed(() => {
        const checks = [
            'Validate top entities against the source document list and citations.',
            'Review inferred links with no direct source evidence.',
            'Cross-check high-impact events against agreement or filing evidence.',
            'Use Ask Yotta for targeted questions, then inspect linked citations.',
        ];
        if (topEntities.value[0]) {
            checks.unshift(`Start with ${topEntities.value[0].name}, the most connected entity.`);
        }
        return checks;
    });
</script>
