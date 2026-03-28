<template>
    <div class="agreements-view">
        <v-card class="mb-3" variant="tonal">
            <v-card-text class="d-flex align-center ga-3 flex-wrap py-3">
                <v-chip size="small" color="primary" variant="tonal">
                    {{ agreements.length }} legal agreements
                </v-chip>
                <v-chip size="small" variant="outlined">
                    {{ subtypeCounts.length }} subtypes
                </v-chip>
                <v-chip size="small" variant="outlined">
                    {{ sourceDocumentCount }} source documents
                </v-chip>
            </v-card-text>
        </v-card>

        <v-card class="mb-3">
            <v-card-item>
                <v-card-title class="text-body-1">Legal Structure</v-card-title>
                <v-card-subtitle
                    >High-level contractual structure and governing framework.</v-card-subtitle
                >
                <template #append>
                    <v-btn
                        size="small"
                        variant="tonal"
                        prepend-icon="mdi-refresh"
                        @click="regenerateNarrative"
                    >
                        Regenerate
                    </v-btn>
                </template>
            </v-card-item>
            <v-card-text>
                <div class="text-body-2 mb-3">{{ structureNarrative }}</div>
                <div class="structure-grid">
                    <div
                        v-for="subtype in subtypeCounts"
                        :key="subtype.label"
                        class="structure-node"
                    >
                        <div class="text-caption text-medium-emphasis">{{ subtype.label }}</div>
                        <div class="text-body-2 font-weight-medium">
                            {{ subtype.count }} agreements
                        </div>
                    </div>
                </div>
            </v-card-text>
        </v-card>

        <v-card class="mb-3">
            <v-card-item>
                <v-card-title class="text-body-1">Key Parties</v-card-title>
                <v-card-subtitle>Recurring parties across agreements.</v-card-subtitle>
            </v-card-item>
            <v-card-text>
                <div class="d-flex flex-wrap ga-2">
                    <v-chip
                        v-for="party in topParties"
                        :key="party.neid"
                        size="small"
                        :variant="selectedPartyNeid === party.neid ? 'flat' : 'tonal'"
                        color="primary"
                        class="app-chip-button"
                        @click="togglePartyFilter(party.neid)"
                    >
                        {{ resolveEntityName(party.neid) }} ({{ party.count }})
                    </v-chip>
                </div>
            </v-card-text>
        </v-card>

        <v-card>
            <v-card-item>
                <v-card-title class="text-body-1">Agreement Inventory</v-card-title>
                <v-card-subtitle
                    >{{ filteredAgreements.length }} matching agreements</v-card-subtitle
                >
                <template #append>
                    <v-btn-toggle
                        v-model="inventoryMode"
                        density="compact"
                        variant="outlined"
                        divided
                    >
                        <v-btn value="flat" size="small">Flat</v-btn>
                        <v-btn value="grouped" size="small">Grouped</v-btn>
                    </v-btn-toggle>
                </template>
            </v-card-item>
            <v-card-text>
                <div class="d-flex align-center ga-2 flex-wrap mb-3">
                    <v-text-field
                        v-model="searchQuery"
                        label="Search agreement, subtype, or party"
                        density="compact"
                        variant="outlined"
                        prepend-inner-icon="mdi-magnify"
                        hide-details
                        clearable
                        style="max-width: 420px"
                    />
                    <v-btn
                        v-if="selectedPartyNeid"
                        size="small"
                        variant="text"
                        prepend-icon="mdi-close-circle-outline"
                        @click="selectedPartyNeid = null"
                    >
                        Clear party filter
                    </v-btn>
                </div>

                <v-alert v-if="agreements.length === 0" type="info" variant="tonal">
                    No legal agreements have been identified in this collection yet.
                </v-alert>
                <v-alert v-else-if="filteredAgreements.length === 0" type="info" variant="tonal">
                    No agreements match your current search or party filter.
                </v-alert>

                <div v-else-if="inventoryMode === 'flat'" class="d-flex flex-column ga-2">
                    <v-card
                        v-for="agreement in filteredAgreements"
                        :key="agreement.neid"
                        variant="outlined"
                        class="app-click-target"
                        @click="openAgreementDetail(agreement.neid)"
                    >
                        <v-card-text class="py-3">
                            <div class="d-flex align-center justify-space-between ga-2 flex-wrap">
                                <div class="text-body-2 font-weight-medium">
                                    {{ agreement.name }}
                                </div>
                                <v-chip size="x-small" variant="tonal">
                                    {{ agreementSubtype(agreement) }}
                                </v-chip>
                            </div>
                            <div class="text-caption text-medium-emphasis mt-1">
                                {{ relatedPartyNeids(agreement.neid).length }} parties ·
                                {{ agreement.sourceDocuments.length }} source docs
                            </div>
                        </v-card-text>
                    </v-card>
                </div>

                <v-expansion-panels v-else variant="accordion">
                    <v-expansion-panel
                        v-for="group in groupedAgreements"
                        :key="group.subtype"
                        :title="`${group.subtype} (${group.items.length})`"
                    >
                        <v-expansion-panel-text>
                            <v-list density="compact">
                                <v-list-item
                                    v-for="agreement in group.items"
                                    :key="agreement.neid"
                                    class="px-0 app-click-target"
                                    @click="openAgreementDetail(agreement.neid)"
                                >
                                    <v-list-item-title>{{ agreement.name }}</v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ relatedPartyNeids(agreement.neid).length }} parties ·
                                        {{ agreement.sourceDocuments.length }} source docs
                                    </v-list-item-subtitle>
                                </v-list-item>
                            </v-list>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-card-text>
        </v-card>

        <v-dialog v-model="detailOpen" max-width="760" scrollable>
            <v-card v-if="selectedAgreement">
                <v-card-item>
                    <v-card-title>{{ selectedAgreement.name }}</v-card-title>
                    <v-card-subtitle>{{ agreementSubtype(selectedAgreement) }}</v-card-subtitle>
                    <template #append>
                        <v-btn icon="mdi-close" variant="text" @click="detailOpen = false" />
                    </template>
                </v-card-item>
                <v-card-text>
                    <div class="text-caption text-medium-emphasis mb-2 font-mono">
                        {{ selectedAgreement.neid }}
                    </div>
                    <div class="text-body-2 mb-3">
                        {{ agreementDetailSummary(selectedAgreement.neid) }}
                    </div>
                    <div class="text-subtitle-2 mb-1">Key parties</div>
                    <div class="d-flex flex-wrap ga-1 mb-3">
                        <v-chip
                            v-for="partyNeid in relatedPartyNeids(selectedAgreement.neid)"
                            :key="partyNeid"
                            size="small"
                            variant="tonal"
                            class="app-chip-button"
                            @click="openPartyEntity(partyNeid)"
                        >
                            {{ resolveEntityName(partyNeid) }}
                        </v-chip>
                    </div>
                    <div class="text-subtitle-2 mb-1">Source documents</div>
                    <div class="d-flex flex-wrap ga-1">
                        <v-chip
                            v-for="docNeid in selectedAgreement.sourceDocuments"
                            :key="docNeid"
                            size="small"
                            variant="outlined"
                            @click="focusDocument(docNeid)"
                        >
                            {{ resolveEntityName(docNeid) }}
                        </v-chip>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
    import type { EntityRecord } from '~/utils/collectionTypes';

    const { agreements, relationships, resolveEntityName, selectEntity, focusDocument } =
        useCollectionWorkspace();

    const searchQuery = ref('');
    const selectedPartyNeid = ref<string | null>(null);
    const inventoryMode = ref<'flat' | 'grouped'>('flat');
    const detailOpen = ref(false);
    const selectedAgreementNeid = ref<string | null>(null);
    const structureVersion = ref(0);

    const sourceDocumentCount = computed(() => {
        const docSet = new Set<string>();
        for (const agreement of agreements.value) {
            for (const doc of agreement.sourceDocuments) docSet.add(doc);
        }
        return docSet.size;
    });

    const subtypeCounts = computed(() => {
        const counts = new Map<string, number>();
        for (const agreement of agreements.value) {
            const subtype = agreementSubtype(agreement);
            counts.set(subtype, (counts.get(subtype) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([label, count]) => ({ label, count }))
            .sort((a, b) => b.count - a.count);
    });

    const topParties = computed(() => {
        const counts = new Map<string, number>();
        for (const agreement of agreements.value) {
            for (const partyNeid of relatedPartyNeids(agreement.neid)) {
                counts.set(partyNeid, (counts.get(partyNeid) ?? 0) + 1);
            }
        }
        return Array.from(counts.entries())
            .map(([neid, count]) => ({ neid, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    });

    const structureNarrative = computed(() => {
        const dominantSubtype = subtypeCounts.value[0];
        const topParty = topParties.value[0];
        const versionSuffix = structureVersion.value % 2 === 0 ? 'primary' : 'secondary';
        return [
            `The collection contains ${agreements.value.length} agreements distributed across ${subtypeCounts.value.length} subtype group(s).`,
            dominantSubtype
                ? `The dominant subtype is ${dominantSubtype.label}, representing ${dominantSubtype.count} agreements.`
                : 'No subtype pattern is available yet.',
            topParty
                ? `Most recurring party: ${resolveEntityName(topParty.neid)} (${topParty.count} linked agreements).`
                : 'No recurring parties identified yet.',
            `Narrative profile: ${versionSuffix} structural interpretation.`,
        ].join(' ');
    });

    const filteredAgreements = computed(() => {
        const query = searchQuery.value.trim().toLowerCase();
        return agreements.value.filter((agreement) => {
            if (
                selectedPartyNeid.value &&
                !relatedPartyNeids(agreement.neid).includes(selectedPartyNeid.value)
            ) {
                return false;
            }
            if (!query) return true;
            const partyNames = relatedPartyNeids(agreement.neid)
                .map((neid) => resolveEntityName(neid).toLowerCase())
                .join(' ');
            return (
                agreement.name.toLowerCase().includes(query) ||
                agreementSubtype(agreement).toLowerCase().includes(query) ||
                partyNames.includes(query)
            );
        });
    });

    const groupedAgreements = computed(() => {
        const groups = new Map<string, EntityRecord[]>();
        for (const agreement of filteredAgreements.value) {
            const subtype = agreementSubtype(agreement);
            const list = groups.get(subtype) ?? [];
            list.push(agreement);
            groups.set(subtype, list);
        }
        return Array.from(groups.entries())
            .map(([subtype, items]) => ({ subtype, items }))
            .sort((a, b) => a.subtype.localeCompare(b.subtype));
    });

    const selectedAgreement = computed(
        () => agreements.value.find((item) => item.neid === selectedAgreementNeid.value) ?? null
    );

    function relatedPartyNeids(agreementNeid: string): string[] {
        const related = new Set<string>();
        for (const rel of relationships.value) {
            if (rel.sourceNeid === agreementNeid) related.add(rel.targetNeid);
            if (rel.targetNeid === agreementNeid) related.add(rel.sourceNeid);
        }
        return Array.from(related);
    }

    function agreementSubtype(agreement: EntityRecord): string {
        const fromProperties =
            (agreement.properties?.agreement_subtype as { value?: string } | undefined)?.value ??
            (agreement.properties?.subtype as { value?: string } | undefined)?.value;
        return fromProperties || agreement.flavor.replace(/_/g, ' ');
    }

    function agreementDetailSummary(agreementNeid: string): string {
        const partyCount = relatedPartyNeids(agreementNeid).length;
        if (!partyCount) return 'No related parties were extracted for this agreement.';
        return `This agreement links ${partyCount} party ${partyCount === 1 ? 'entity' : 'entities'} in the current graph and can be used as a legal anchor for cross-tab analysis.`;
    }

    function regenerateNarrative() {
        structureVersion.value += 1;
    }

    function openAgreementDetail(neid: string) {
        selectedAgreementNeid.value = neid;
        detailOpen.value = true;
    }

    function openPartyEntity(neid: string) {
        detailOpen.value = false;
        selectEntity(neid);
    }

    function togglePartyFilter(neid: string) {
        selectedPartyNeid.value = selectedPartyNeid.value === neid ? null : neid;
    }
</script>

<style scoped>
    .structure-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }

    .structure-node {
        border: 1px solid var(--app-divider);
        border-radius: 8px;
        padding: 10px;
        background: var(--app-subtle-surface);
    }
</style>
