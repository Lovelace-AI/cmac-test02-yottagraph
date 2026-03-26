<template>
    <div>
        <v-row class="mb-4">
            <v-col cols="12">
                <v-card>
                    <v-card-text>
                        <div class="text-h5 font-headline mb-1">{{ meta.name }}</div>
                        <div class="text-body-2 text-medium-emphasis">{{ meta.description }}</div>
                        <div v-if="meta.lastRebuilt" class="text-caption text-medium-emphasis mt-1">
                            Last rebuilt: {{ new Date(meta.lastRebuilt).toLocaleString() }}
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <v-row class="mb-4">
            <v-col v-for="metric in metrics" :key="metric.label" cols="6" sm="4" md="2">
                <v-card class="text-center pa-3" height="100%">
                    <div class="text-h4 font-weight-bold" :class="metric.color">
                        {{ metric.value }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">{{ metric.label }}</div>
                </v-card>
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12" md="7">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Entity Distribution</v-card-title>
                    </v-card-item>
                    <v-card-text>
                        <div
                            v-for="[flavor, count] in sortedFlavors"
                            :key="flavor"
                            class="d-flex align-center justify-space-between py-1"
                        >
                            <div class="d-flex align-center ga-2">
                                <v-icon size="small" :color="flavorColor(flavor)">
                                    {{ flavorIcon(flavor) }}
                                </v-icon>
                                <span class="text-body-2">{{ flavor }}</span>
                            </div>
                            <v-chip size="x-small" variant="tonal" :color="flavorColor(flavor)">
                                {{ count }}
                            </v-chip>
                        </div>
                        <div
                            v-if="sortedFlavors.length === 0"
                            class="text-body-2 text-medium-emphasis py-4 text-center"
                        >
                            Load the graph to see entity distribution.
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="5">
                <DocumentList />
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
    const { meta, flavorCounts, isReady } = useCollectionWorkspace();

    const metrics = computed(() => [
        { label: 'Documents', value: meta.value.documentCount, color: 'text-blue' },
        { label: 'Entities', value: meta.value.entityCount, color: 'text-green' },
        { label: 'Events', value: meta.value.eventCount, color: 'text-orange' },
        { label: 'Relationships', value: meta.value.relationshipCount, color: '' },
        { label: 'Agreements', value: meta.value.agreementCount, color: 'text-finance-blue' },
        {
            label: 'Status',
            value: isReady.value ? 'Ready' : 'Idle',
            color: isReady.value ? 'text-green' : 'text-medium-emphasis',
        },
    ]);

    const sortedFlavors = computed(() =>
        Array.from(flavorCounts.value.entries()).sort((a, b) => b[1] - a[1])
    );

    function flavorIcon(flavor: string): string {
        const icons: Record<string, string> = {
            organization: 'mdi-domain',
            person: 'mdi-account',
            financial_instrument: 'mdi-bank',
            location: 'mdi-map-marker',
            fund_account: 'mdi-wallet',
            legal_agreement: 'mdi-file-document-outline',
        };
        return icons[flavor] ?? 'mdi-circle-small';
    }

    function flavorColor(flavor: string): string {
        const colors: Record<string, string> = {
            organization: 'primary',
            person: 'info',
            financial_instrument: 'warning',
            location: 'secondary',
            fund_account: 'success',
            legal_agreement: 'info',
        };
        return colors[flavor] ?? 'grey';
    }
</script>
