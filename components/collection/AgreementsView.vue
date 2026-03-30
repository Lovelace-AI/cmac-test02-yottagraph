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
                        <v-btn value="cards" size="small">Cards</v-btn>
                        <v-btn value="list" size="small">List</v-btn>
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

                <div v-else-if="inventoryMode === 'cards'" class="agreement-card-grid">
                    <v-card
                        v-for="agreement in filteredAgreements"
                        :key="agreement.neid"
                        variant="outlined"
                        class="app-click-target agreement-snapshot-card"
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
                            <div class="text-caption text-medium-emphasis mt-1">
                                {{ agreementMiniAbstract(agreement) }}
                            </div>
                            <div class="text-caption mt-2">
                                {{ agreementRelationshipSnapshot(agreement) }}
                            </div>
                        </v-card-text>
                    </v-card>
                </div>

                <div v-else class="d-flex flex-column ga-2">
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
                        >
                            {{ resolveDocumentName(docNeid) }}
                        </v-chip>
                    </div>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
    import type { EntityRecord } from '~/utils/collectionTypes';

    const {
        agreements,
        documentEntities: entities,
        documents,
        documentRelationships: relationships,
        resolveEntityName,
        selectEntity,
    } = useCollectionWorkspace();

    const searchQuery = ref('');
    const selectedPartyNeid = ref<string | null>(null);
    const inventoryMode = ref<'cards' | 'list'>('cards');
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
    const entityByNeid = computed(
        () => new Map(entities.value.map((entity) => [entity.neid, entity]))
    );
    const agreementNeidSet = computed(() => new Set(agreements.value.map((item) => item.neid)));
    const documentTitleByNeid = computed(
        () =>
            new Map(
                documents.value.map((doc) => [doc.neid, doc.title || doc.documentId || doc.neid])
            )
    );

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
        void structureVersion.value;
        return [
            `${agreements.value.length} agreements are currently mapped across ${subtypeCounts.value.length} contract type${subtypeCounts.value.length === 1 ? '' : 's'}.`,
            dominantSubtype
                ? `Most of the legal package is ${dominantSubtype.label} (${dominantSubtype.count} agreements).`
                : 'Contract subtype patterns are still being inferred.',
            topParty
                ? `${resolveEntityName(topParty.neid)} appears most often (${topParty.count} linked agreements).`
                : 'No recurring counterparties have been identified yet.',
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

    const selectedAgreement = computed(
        () => agreements.value.find((item) => item.neid === selectedAgreementNeid.value) ?? null
    );

    function relatedPartyNeids(agreementNeid: string): string[] {
        const related = new Set<string>();
        for (const rel of relationships.value) {
            if (rel.sourceNeid === agreementNeid) related.add(rel.targetNeid);
            if (rel.targetNeid === agreementNeid) related.add(rel.sourceNeid);
        }
        return Array.from(related)
            .filter((neid) => neid !== agreementNeid && !agreementNeidSet.value.has(neid))
            .filter((neid) => {
                const entity = entityByNeid.value.get(neid);
                if (!entity) return false;
                return entity.flavor !== 'legal_agreement' && entity.flavor !== 'event';
            })
            .sort((a, b) => resolveEntityName(a).localeCompare(resolveEntityName(b)));
    }

    function agreementSubtype(agreement: EntityRecord): string {
        const fromProperties =
            (agreement.properties?.agreement_subtype as { value?: string } | undefined)?.value ??
            (agreement.properties?.subtype as { value?: string } | undefined)?.value;
        return fromProperties || agreement.flavor.replace(/_/g, ' ');
    }

    function toNaturalList(values: string[]): string {
        if (!values.length) return '';
        if (values.length === 1) return values[0];
        if (values.length === 2) return `${values[0]} and ${values[1]}`;
        return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
    }

    function resolveDocumentName(neid: string): string {
        return documentTitleByNeid.value.get(neid) ?? resolveEntityName(neid);
    }

    function propertyText(value: unknown): string | null {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed || null;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        }
        if (typeof value === 'object' && value && 'value' in (value as Record<string, unknown>)) {
            const nested = (value as Record<string, unknown>).value;
            return propertyText(nested);
        }
        return null;
    }

    function agreementDate(agreement: EntityRecord): string | null {
        const keys = ['date', 'effective_date', 'dated', 'execution_date', 'signed_date'];
        for (const key of keys) {
            const maybe = propertyText(
                (agreement.properties as Record<string, unknown> | undefined)?.[key]
            );
            if (maybe) return maybe.slice(0, 10);
        }
        return null;
    }

    function agreementMiniAbstract(agreement: EntityRecord): string {
        const subtype = agreementSubtype(agreement);
        const date = agreementDate(agreement);
        if (date) return `${subtype} dated ${date}.`;
        return `${subtype}.`;
    }

    function agreementRelationshipSnapshot(agreement: EntityRecord): string {
        const partyNames = relatedPartyNeids(agreement.neid).map((neid) => resolveEntityName(neid));
        const documentNames = agreement.sourceDocuments
            .map((docNeid) => resolveDocumentName(docNeid))
            .filter(Boolean);
        if (!partyNames.length) {
            return 'Counterparties are not fully extracted yet. Open the agreement to verify parties from the linked source documents.';
        }
        const leadParties = partyNames.slice(0, 2);
        const extraParties = Math.max(0, partyNames.length - leadParties.length);
        const partyText =
            extraParties > 0
                ? `${toNaturalList(leadParties)} and ${extraParties} additional party${extraParties === 1 ? '' : 'ies'}`
                : toNaturalList(leadParties);
        const sourceText = documentNames.length
            ? `Primary evidence: ${documentNames[0]}${documentNames.length > 1 ? ' and related filings' : ''}.`
            : 'Source-document evidence is still being attached.';
        return `This agreement ties together ${partyText}. ${sourceText}`;
    }

    function agreementDetailSummary(agreementNeid: string): string {
        const agreement = agreements.value.find((item) => item.neid === agreementNeid);
        if (!agreement) return 'Agreement details are unavailable.';
        const partyNames = relatedPartyNeids(agreementNeid).map((neid) => resolveEntityName(neid));
        if (!partyNames.length) {
            return 'No specific counterparties were extracted for this agreement yet. Use source documents and related entities to verify who is bound by this contract.';
        }
        const leadParties = partyNames.slice(0, 4);
        const extraParties = Math.max(0, partyNames.length - leadParties.length);
        const partyText =
            extraParties > 0
                ? `${toNaturalList(leadParties)} and ${extraParties} more party${extraParties === 1 ? '' : 'ies'}`
                : toNaturalList(leadParties);
        return [
            `This contract sets obligations among ${partyText}.`,
            'Use it as your legal baseline: follow the same parties in Graph, Events, and Financials to separate contract terms from later operational or financial activity.',
        ].join(' ');
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
    .agreement-card-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    }

    .agreement-snapshot-card {
        min-height: 126px;
    }

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
