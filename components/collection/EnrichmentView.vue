<template>
    <div class="enrichment-layout d-flex flex-column ga-3">
        <v-tabs v-model="activeSubtab" density="compact" color="primary" class="mb-1">
            <v-tab value="summary">
                <v-icon start size="small">mdi-star-four-points-outline</v-icon>
                What Enrichment Added
            </v-tab>
            <v-tab value="proof">
                <v-icon start size="small">mdi-lightbulb-on-outline</v-icon>
                Proof &amp; Stories
            </v-tab>
            <v-tab value="graph">
                <v-icon start size="small">mdi-graph-outline</v-icon>
                Explore Graph
            </v-tab>
            <v-tab value="setup">
                <v-icon start size="small">mdi-tune-variant</v-icon>
                Settings
            </v-tab>
        </v-tabs>

        <v-window v-model="activeSubtab">
            <v-window-item value="summary">
                <v-alert v-if="!hasEnrichmentRun" type="info" variant="tonal" class="mb-3">
                    Expand context after document extraction to reveal additional counterparties,
                    lineage links, and related events outside the source documents.
                </v-alert>
                <template v-else>
                    <v-card class="mb-3">
                        <v-card-item>
                            <v-card-title class="text-body-1"
                                >Enrichment Value Summary</v-card-title
                            >
                            <v-card-subtitle>
                                Documents gave us a strong baseline; context expansion adds broader
                                network coverage around those same participants.
                            </v-card-subtitle>
                        </v-card-item>
                        <v-card-text>
                            <v-row>
                                <v-col cols="12" md="6">
                                    <div class="text-caption text-medium-emphasis mb-1">
                                        From extracted documents
                                    </div>
                                    <div class="d-flex justify-space-between py-1">
                                        <span class="text-body-2">Entities</span>
                                        <span class="text-body-2 font-weight-medium">
                                            {{ enrichmentValueSummary.documentEntityCount }}
                                        </span>
                                    </div>
                                    <div class="d-flex justify-space-between py-1">
                                        <span class="text-body-2">Relationships</span>
                                        <span class="text-body-2 font-weight-medium">
                                            {{ enrichmentValueSummary.documentRelationshipCount }}
                                        </span>
                                    </div>
                                    <div class="d-flex justify-space-between py-1">
                                        <span class="text-body-2">Events</span>
                                        <span class="text-body-2 font-weight-medium">
                                            {{
                                                enrichmentValueSummary.totalEventCount -
                                                enrichmentValueSummary.outsideEventCount
                                            }}
                                        </span>
                                    </div>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <div class="text-caption text-medium-emphasis mb-1">
                                        Added by context expansion
                                    </div>
                                    <div class="d-flex justify-space-between py-1">
                                        <span class="text-body-2">New entities</span>
                                        <span class="text-body-2 font-weight-medium text-blue">
                                            {{ enrichmentValueSummary.enrichedEntityCount }}
                                        </span>
                                    </div>
                                    <div class="d-flex justify-space-between py-1">
                                        <span class="text-body-2">New relationships</span>
                                        <span class="text-body-2 font-weight-medium text-blue">
                                            {{ enrichmentValueSummary.enrichedRelationshipCount }}
                                        </span>
                                    </div>
                                    <div class="d-flex justify-space-between py-1">
                                        <span class="text-body-2">Outside related events</span>
                                        <span class="text-body-2 font-weight-medium text-blue">
                                            {{ enrichmentValueSummary.outsideEventCount }}
                                        </span>
                                    </div>
                                    <div class="d-flex justify-space-between py-1">
                                        <span class="text-body-2">Total events surfaced</span>
                                        <span class="text-body-2 font-weight-medium text-blue">
                                            {{ enrichmentValueSummary.totalEventCount }}
                                        </span>
                                    </div>
                                </v-col>
                            </v-row>
                        </v-card-text>
                    </v-card>

                    <v-card>
                        <v-card-item>
                            <v-card-title class="text-body-1">Top Takeaways</v-card-title>
                            <v-card-subtitle>
                                The clearest additions from 2-hop context, rewritten for a business
                                audience.
                            </v-card-subtitle>
                        </v-card-item>
                        <v-card-text>
                            <ul class="takeaway-list mb-0">
                                <li
                                    v-for="(bullet, idx) in enrichmentTakeawayBullets"
                                    :key="`takeaway:${idx}`"
                                    class="takeaway-list__item text-body-2"
                                >
                                    {{ bullet }}
                                </li>
                            </ul>
                        </v-card-text>
                    </v-card>
                </template>
            </v-window-item>

            <v-window-item value="proof">
                <v-alert v-if="!hasEnrichmentRun" type="info" variant="tonal" class="mb-3">
                    Expand context first. This view surfaces evidence-backed stories connected to
                    extracted entities.
                </v-alert>
                <template v-else>
                    <div
                        v-if="enrichmentInsights.length > 0"
                        class="proof-toolbar d-flex align-start justify-space-between flex-wrap ga-3 mb-1"
                    >
                        <div>
                            <div class="text-body-2 font-weight-medium">
                                {{ enrichmentInsights.length }} evidence-backed stories
                            </div>
                            <div class="text-caption text-medium-emphasis">
                                Later activity is shown only when it adds context beyond the
                                uploaded documents.
                            </div>
                        </div>
                        <div class="d-flex align-center ga-2 flex-wrap">
                            <v-chip
                                v-if="enrichmentLanguageLoading"
                                size="small"
                                variant="tonal"
                                color="info"
                            >
                                Rewriting summaries...
                            </v-chip>
                            <v-btn
                                size="small"
                                variant="tonal"
                                color="primary"
                                prepend-icon="mdi-chat-question-outline"
                                @click="
                                    launchAskYotta(
                                        'Synthesize the main themes across these enrichment findings and ground each theme in specific entities and events.'
                                    )
                                "
                            >
                                Ask Yotta for themes
                            </v-btn>
                        </div>
                    </div>
                    <v-alert v-if="enrichmentInsights.length === 0" type="info" variant="tonal">
                        No enrichment stories were derived from this run. Try 2-hop expansion or
                        include related events.
                    </v-alert>

                    <div v-if="enrichmentInsights.length > 0" class="d-flex flex-column ga-3">
                        <v-card v-if="lineageInsights.length > 0">
                            <v-card-item>
                                <v-card-title class="text-body-1">Corporate Lineage</v-card-title>
                                <v-card-subtitle>
                                    Successor and predecessor links provide broader legal-entity
                                    history around extracted participants.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text class="d-flex flex-column ga-3">
                                <v-card
                                    v-for="insight in lineageInsights"
                                    :key="insight.id"
                                    variant="outlined"
                                >
                                    <v-card-item>
                                        <v-card-title class="text-body-2">{{
                                            insight.title
                                        }}</v-card-title>
                                        <v-card-subtitle>{{ insight.subtitle }}</v-card-subtitle>
                                    </v-card-item>
                                    <v-card-text>
                                        <div class="insight-summary mb-2">
                                            {{ insight.plainSummary }}
                                        </div>
                                        <div class="d-flex flex-wrap ga-1 mb-2">
                                            <v-chip
                                                v-if="insight.relevanceLabel"
                                                size="x-small"
                                                variant="tonal"
                                                color="blue-grey"
                                            >
                                                Context:
                                                {{ insight.relevanceLabel.replace(/_/g, ' ') }}
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.totalEventCount !== undefined"
                                                size="x-small"
                                                variant="tonal"
                                                color="info"
                                            >
                                                {{ insight.totalEventCount }} linked events
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.relationshipDateLabel"
                                                size="x-small"
                                                variant="tonal"
                                                color="success"
                                            >
                                                {{ insight.relationshipDateLabel }}
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.sizeLabel"
                                                size="x-small"
                                                variant="tonal"
                                                color="deep-purple"
                                            >
                                                {{ insight.sizeLabel }}
                                            </v-chip>
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            In your documents
                                        </div>
                                        <div class="insight-context-text mb-2">
                                            {{ insight.documentContext }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            What broader graph adds
                                        </div>
                                        <div class="insight-context-text mb-2">
                                            {{ insight.kgContext }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            Example evidence
                                        </div>
                                        <ul class="pl-5 mb-2">
                                            <li
                                                v-for="line in insight.evidence.slice(0, 3)"
                                                :key="`${insight.id}:${line}`"
                                                class="text-body-2"
                                            >
                                                {{ line }}
                                            </li>
                                        </ul>
                                        <div class="d-flex align-center ga-2 flex-wrap">
                                            <v-btn
                                                v-if="insight.evidence.length > 3"
                                                size="x-small"
                                                variant="text"
                                                disabled
                                            >
                                                +{{ insight.evidence.length - 3 }} more evidence
                                                line(s)
                                            </v-btn>
                                        </div>
                                        <div class="d-flex align-center ga-2 mt-1">
                                            <v-btn
                                                size="small"
                                                variant="tonal"
                                                color="primary"
                                                prepend-icon="mdi-chat-question-outline"
                                                @click="launchAskYotta(insight.askPrompt)"
                                            >
                                                Ask Yotta
                                            </v-btn>
                                            <v-btn
                                                v-if="insight.anchorNeid"
                                                size="small"
                                                variant="text"
                                                @click="selectEntity(insight.anchorNeid)"
                                            >
                                                Open anchor
                                            </v-btn>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-card-text>
                        </v-card>

                        <v-card v-if="broaderActivityInsights.length > 0">
                            <v-card-item>
                                <v-card-title class="text-body-1">
                                    Broader Participant Activity
                                </v-card-title>
                                <v-card-subtitle>
                                    These are outside events linked to the same participants. They
                                    may be adjacent context rather than the same underlying deal.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text class="d-flex flex-column ga-3">
                                <v-card
                                    v-for="insight in broaderActivityInsights"
                                    :key="insight.id"
                                    variant="outlined"
                                >
                                    <v-card-item>
                                        <v-card-title class="text-body-2">{{
                                            insight.title
                                        }}</v-card-title>
                                    </v-card-item>
                                    <v-card-text>
                                        <div class="insight-summary mb-2">
                                            {{ insight.plainSummary }}
                                        </div>
                                        <div class="d-flex flex-wrap ga-1 mb-2">
                                            <v-chip
                                                v-if="insight.relevanceLabel"
                                                size="x-small"
                                                variant="tonal"
                                                color="blue-grey"
                                            >
                                                Context:
                                                {{ insight.relevanceLabel.replace(/_/g, ' ') }}
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.outsideEventCount !== undefined"
                                                size="x-small"
                                                variant="tonal"
                                                color="info"
                                            >
                                                {{ insight.outsideEventCount }} outside events
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.counterpartyCount !== undefined"
                                                size="x-small"
                                                variant="tonal"
                                                color="primary"
                                            >
                                                {{ insight.counterpartyCount }} counterparties
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.dateRangeLabel"
                                                size="x-small"
                                                variant="tonal"
                                                color="indigo"
                                            >
                                                {{ insight.dateRangeLabel }}
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.sizeLabel"
                                                size="x-small"
                                                variant="tonal"
                                                color="deep-purple"
                                            >
                                                {{ insight.sizeLabel }}
                                            </v-chip>
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            In your documents
                                        </div>
                                        <div class="insight-context-text mb-2">
                                            {{ insight.documentContext }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            What broader graph adds
                                        </div>
                                        <div class="insight-context-text mb-2">
                                            {{ insight.kgContext }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            Example evidence
                                        </div>
                                        <ul class="pl-5 mb-2">
                                            <li
                                                v-for="line in insight.evidence.slice(0, 4)"
                                                :key="`${insight.id}:${line}`"
                                                class="text-body-2"
                                            >
                                                {{ line }}
                                            </li>
                                        </ul>
                                        <div class="d-flex align-center ga-2 mt-1">
                                            <v-btn
                                                size="small"
                                                variant="tonal"
                                                color="primary"
                                                prepend-icon="mdi-chat-question-outline"
                                                @click="launchAskYotta(insight.askPrompt)"
                                            >
                                                Ask Yotta
                                            </v-btn>
                                            <v-btn
                                                v-if="insight.anchorNeid"
                                                size="small"
                                                variant="text"
                                                @click="selectEntity(insight.anchorNeid)"
                                            >
                                                Open anchor
                                            </v-btn>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-card-text>
                        </v-card>

                        <v-card v-if="eventTimelineInsights.length > 0">
                            <v-card-item>
                                <v-card-title class="text-body-1"
                                    >Expanded Timeline Context</v-card-title
                                >
                                <v-card-subtitle>
                                    Timeline sequencing shows collection events alongside broader
                                    participant-linked activity.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text class="d-flex flex-column ga-3">
                                <v-card
                                    v-for="insight in eventTimelineInsights"
                                    :key="insight.id"
                                    variant="outlined"
                                >
                                    <v-card-item>
                                        <v-card-title class="text-body-2">{{
                                            insight.title
                                        }}</v-card-title>
                                    </v-card-item>
                                    <v-card-text>
                                        <div class="insight-summary mb-2">
                                            {{ insight.plainSummary }}
                                        </div>
                                        <div class="d-flex flex-wrap ga-1 mb-2">
                                            <v-chip
                                                v-if="insight.totalEventCount !== undefined"
                                                size="x-small"
                                                variant="tonal"
                                                color="info"
                                            >
                                                {{ insight.totalEventCount }} total events
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.sameDealEventCount !== undefined"
                                                size="x-small"
                                                variant="tonal"
                                                color="success"
                                            >
                                                {{ insight.sameDealEventCount }} collection events
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.outsideEventCount !== undefined"
                                                size="x-small"
                                                variant="tonal"
                                                color="primary"
                                            >
                                                {{ insight.outsideEventCount }} outside events
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.dateRangeLabel"
                                                size="x-small"
                                                variant="tonal"
                                                color="indigo"
                                            >
                                                {{ insight.dateRangeLabel }}
                                            </v-chip>
                                            <v-chip
                                                v-if="insight.sizeLabel"
                                                size="x-small"
                                                variant="tonal"
                                                color="deep-purple"
                                            >
                                                {{ insight.sizeLabel }}
                                            </v-chip>
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            In your documents
                                        </div>
                                        <div class="insight-context-text mb-2">
                                            {{ insight.documentContext }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            What broader graph adds
                                        </div>
                                        <div class="insight-context-text mb-2">
                                            {{ insight.kgContext }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            Timeline points
                                        </div>
                                        <ul class="pl-5 mb-2">
                                            <li
                                                v-for="line in insight.evidence.slice(0, 5)"
                                                :key="`${insight.id}:${line}`"
                                                class="text-body-2"
                                            >
                                                {{ line }}
                                            </li>
                                        </ul>
                                        <v-btn
                                            size="small"
                                            variant="tonal"
                                            color="primary"
                                            prepend-icon="mdi-chat-question-outline"
                                            @click="launchAskYotta(insight.askPrompt)"
                                        >
                                            Ask Yotta
                                        </v-btn>
                                    </v-card-text>
                                </v-card>
                            </v-card-text>
                        </v-card>

                        <v-card v-if="peopleAffiliationInsights.length > 0">
                            <v-card-item>
                                <v-card-title class="text-body-1"
                                    >People and Affiliations</v-card-title
                                >
                                <v-card-subtitle>
                                    Person-to-organization links reveal context outside extraction.
                                </v-card-subtitle>
                            </v-card-item>
                            <v-card-text class="d-flex flex-column ga-3">
                                <v-card
                                    v-for="insight in peopleAffiliationInsights"
                                    :key="insight.id"
                                    variant="outlined"
                                >
                                    <v-card-item>
                                        <v-card-title class="text-body-2">{{
                                            insight.title
                                        }}</v-card-title>
                                    </v-card-item>
                                    <v-card-text>
                                        <div class="insight-summary mb-2">
                                            {{ insight.plainSummary }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            In your documents
                                        </div>
                                        <div class="insight-context-text mb-2">
                                            {{ insight.documentContext }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            What broader graph adds
                                        </div>
                                        <div class="insight-context-text mb-2">
                                            {{ insight.kgContext }}
                                        </div>
                                        <div class="insight-section-label mb-1">
                                            Example evidence
                                        </div>
                                        <ul class="pl-5 mb-2">
                                            <li
                                                v-for="line in insight.evidence.slice(0, 3)"
                                                :key="`${insight.id}:${line}`"
                                                class="text-body-2"
                                            >
                                                {{ line }}
                                            </li>
                                        </ul>
                                        <v-btn
                                            size="small"
                                            variant="tonal"
                                            color="primary"
                                            prepend-icon="mdi-chat-question-outline"
                                            @click="launchAskYotta(insight.askPrompt)"
                                        >
                                            Ask Yotta
                                        </v-btn>
                                    </v-card-text>
                                </v-card>
                            </v-card-text>
                        </v-card>
                    </div>
                </template>
            </v-window-item>

            <v-window-item value="graph">
                <v-card class="mb-3">
                    <v-card-text class="d-flex align-center justify-space-between flex-wrap ga-3">
                        <div class="d-flex align-center ga-2 flex-wrap">
                            <v-switch
                                v-model="showEnrichedEntities"
                                hide-details
                                density="compact"
                                color="info"
                                label="Show expanded entities"
                                class="mr-1"
                            />
                            <v-switch
                                v-model="showEnrichedRelationships"
                                hide-details
                                density="compact"
                                color="info"
                                label="Show expanded relationships"
                            />
                        </div>
                        <div class="text-caption text-medium-emphasis">
                            {{ graphModeDescription }}
                        </div>
                    </v-card-text>
                </v-card>

                <v-alert
                    v-if="
                        hasEnrichmentRun &&
                        showEnrichedEntities &&
                        enrichmentCollapsedOrganizationCount > 0
                    "
                    type="info"
                    variant="tonal"
                    class="mb-3"
                >
                    Expanded view adds broader platform context while merging acquired banks into
                    surviving parent organizations to keep the graph readable.
                </v-alert>

                <v-card
                    v-if="
                        hasEnrichmentRun &&
                        showEnrichedEntities &&
                        collapsedOrganizationMappings.length
                    "
                    class="mb-3"
                >
                    <v-card-item>
                        <v-card-title class="text-body-2">
                            Collapsed Corporate Lineage
                            <v-chip size="x-small" variant="tonal" color="info" class="ml-2">
                                {{ collapsedOrganizationMappings.length }} surviving orgs
                            </v-chip>
                        </v-card-title>
                        <v-card-subtitle>
                            Each row lists acquired organizations merged into one surviving parent
                            node.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text class="pt-0">
                        <v-list density="compact" class="pa-0 bg-transparent">
                            <v-list-item
                                v-for="mapping in collapsedOrganizationMappings"
                                :key="mapping.representativeNeid"
                                class="px-0"
                            >
                                <v-list-item-title class="text-body-2 font-weight-medium mb-1">
                                    <button
                                        type="button"
                                        class="lineage-entity-btn app-click-target"
                                        @click="selectEntity(mapping.representativeNeid)"
                                    >
                                        {{ mapping.representativeName }}
                                    </button>
                                </v-list-item-title>
                                <div class="d-flex flex-wrap ga-1">
                                    <v-chip
                                        v-for="member in mapping.collapsedMembers"
                                        :key="`${mapping.representativeNeid}:${member.neid}`"
                                        size="x-small"
                                        variant="tonal"
                                        color="blue-grey"
                                        class="app-click-target"
                                        @click="selectEntity(member.neid)"
                                    >
                                        {{ member.name }}
                                    </v-chip>
                                </div>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>

                <GraphWorkspace
                    :entities-override="activeGraphEntities"
                    :relationships-override="activeGraphRelationships"
                    :show-enriched-entities="showEnrichedEntities"
                    :show-enriched-relationships="showEnrichedRelationships"
                />
            </v-window-item>

            <v-window-item value="setup">
                <v-alert v-if="!enrichmentLastRun" type="info" variant="tonal" class="mb-3">
                    <div class="text-body-2 font-weight-medium mb-1">Quick start</div>
                    <ol class="pl-5 mb-1">
                        <li>Choose expansion depth.</li>
                        <li>Turn on related events if you want timeline context.</li>
                        <li>Run Expand Context to load broader graph coverage.</li>
                    </ol>
                </v-alert>

                <v-row class="mb-4">
                    <v-col cols="12" md="6">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-1">Expansion Settings</v-card-title>
                            </v-card-item>
                            <v-card-text>
                                <div class="text-body-2 mb-2">
                                    Enrichable anchors in this collection:
                                    {{ autoEnrichmentAnchors.length }}
                                </div>
                                <div
                                    v-if="autoEnrichmentAnchors.length === 0"
                                    class="text-caption text-medium-emphasis mb-2"
                                >
                                    No enrichable anchors were found in extracted entities.
                                </div>
                                <v-expansion-panels
                                    v-else
                                    variant="accordion"
                                    class="mb-3"
                                    density="compact"
                                >
                                    <v-expansion-panel>
                                        <v-expansion-panel-title class="text-body-2 py-2">
                                            Included anchors ({{
                                                autoEnrichmentAnchorEntities.length
                                            }})
                                        </v-expansion-panel-title>
                                        <v-expansion-panel-text class="pt-2">
                                            <div class="d-flex flex-wrap ga-1">
                                                <v-chip
                                                    v-for="entity in autoEnrichmentAnchorEntities"
                                                    :key="entity.neid"
                                                    size="x-small"
                                                    variant="tonal"
                                                    :title="entity.name"
                                                    :color="
                                                        entity.presentInCollection
                                                            ? 'primary'
                                                            : 'secondary'
                                                    "
                                                    :class="
                                                        entity.presentInCollection
                                                            ? 'app-click-target'
                                                            : undefined
                                                    "
                                                    @click="
                                                        entity.presentInCollection &&
                                                        selectEntity(entity.neid)
                                                    "
                                                >
                                                    {{ entity.label }} · {{ entity.typeLabel }}
                                                </v-chip>
                                            </div>
                                            <div
                                                v-if="autoEnrichmentContextAnchorCount > 0"
                                                class="text-caption text-medium-emphasis mt-2"
                                            >
                                                Added {{ autoEnrichmentContextAnchorCount }} related
                                                context anchor{{
                                                    autoEnrichmentContextAnchorCount === 1
                                                        ? ''
                                                        : 's'
                                                }}
                                                based on extracted participants.
                                            </div>
                                        </v-expansion-panel-text>
                                    </v-expansion-panel>
                                </v-expansion-panels>

                                <v-radio-group v-model="hopsModel" inline hide-details class="mb-3">
                                    <v-radio label="1-hop (focused)" :value="1" />
                                    <v-radio label="2-hop (broader)" :value="2" />
                                </v-radio-group>
                                <v-switch
                                    v-model="includeEventsModel"
                                    color="primary"
                                    hide-details
                                    density="comfortable"
                                    label="Include related events"
                                    class="mb-2"
                                />
                                <div class="text-caption text-medium-emphasis mb-3">
                                    Start with 1-hop for quick signal, then use 2-hop for broader
                                    context.
                                </div>

                                <v-btn
                                    color="primary"
                                    block
                                    prepend-icon="mdi-arrow-expand-all"
                                    :loading="enriching"
                                    :disabled="
                                        !isReady ||
                                        documentEntities.length === 0 ||
                                        autoEnrichmentAnchors.length === 0
                                    "
                                    @click="runEnrichment"
                                >
                                    Expand Context
                                </v-btn>

                                <v-expand-transition>
                                    <v-card
                                        v-if="enriching"
                                        variant="tonal"
                                        color="primary"
                                        class="mt-3"
                                    >
                                        <v-card-text class="pb-2">
                                            <div
                                                class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2"
                                            >
                                                <div class="d-flex align-center ga-2">
                                                    <v-icon size="18" class="enrichment-spinner">
                                                        mdi-sync
                                                    </v-icon>
                                                    <span class="text-body-2 font-weight-medium">
                                                        Context expansion in progress
                                                    </span>
                                                </div>
                                                <span class="text-caption text-medium-emphasis">
                                                    {{ enrichmentProgressSeconds }}s elapsed
                                                </span>
                                            </div>
                                            <div class="text-caption text-medium-emphasis mb-2">
                                                {{ enrichmentProgressStage }}
                                            </div>
                                            <v-progress-linear
                                                indeterminate
                                                color="primary"
                                                rounded
                                                height="6"
                                            />
                                        </v-card-text>
                                    </v-card>
                                </v-expand-transition>

                                <div
                                    v-if="enrichmentLastRun"
                                    class="text-caption text-medium-emphasis mt-3"
                                >
                                    Last run: {{ enrichmentLastRun.anchorNeids.length }} anchors,
                                    {{ enrichmentLastRun.hops }}-hop
                                    <span v-if="enrichmentLastRun.includeEvents">
                                        , with related events
                                    </span>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="6">
                        <v-card>
                            <v-card-item>
                                <v-card-title class="text-body-1">Impact Preview</v-card-title>
                            </v-card-item>
                            <v-card-text>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2">Document entities</span>
                                    <span class="text-body-2 font-weight-medium text-green">
                                        {{ documentEntities.length }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2">Added context entities</span>
                                    <span class="text-body-2 font-weight-medium text-blue">
                                        {{ enrichedEntities.length }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2">Document relationships</span>
                                    <span class="text-body-2 font-weight-medium text-green">
                                        {{ documentRelationshipCount }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2">Added context relationships</span>
                                    <span class="text-body-2 font-weight-medium text-blue">
                                        {{ enrichedRelationshipCount }}
                                    </span>
                                </div>
                                <v-divider class="my-2" />
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2 font-weight-medium">
                                        Combined entities
                                    </span>
                                    <span class="text-body-2 font-weight-medium">
                                        {{ documentEntities.length + enrichedEntities.length }}
                                    </span>
                                </div>
                                <div class="d-flex justify-space-between py-1">
                                    <span class="text-body-2 font-weight-medium">
                                        Combined relationships
                                    </span>
                                    <span class="text-body-2 font-weight-medium">
                                        {{ documentRelationshipCount + enrichedRelationshipCount }}
                                    </span>
                                </div>
                            </v-card-text>
                        </v-card>
                    </v-col>
                </v-row>

                <v-card v-if="enrichedEntities.length > 0">
                    <v-card-item>
                        <v-card-title class="text-body-1">
                            Added Context Entities
                            <v-chip size="x-small" variant="tonal" color="info" class="ml-2">
                                {{ enrichedEntities.length }}
                            </v-chip>
                        </v-card-title>
                    </v-card-item>
                    <v-card-text class="pa-0">
                        <v-data-table
                            :headers="enrichedHeaders"
                            :items="enrichedEntities"
                            :items-per-page="15"
                            density="compact"
                            hover
                            @click:row="(_: any, row: any) => selectEntity(row.item.neid)"
                        >
                            <template #item.origin="{ item }">
                                <v-chip size="x-small" variant="tonal" color="info">
                                    {{ originLabel(item.origin) }}
                                </v-chip>
                            </template>
                        </v-data-table>
                    </v-card-text>
                </v-card>
            </v-window-item>
        </v-window>
    </div>
</template>

<script setup lang="ts">
    const emit = defineEmits<{
        (e: 'open-chat', prompt: string): void;
    }>();

    const ENRICHABLE_ANCHOR_NEIDS = new Set<string>([
        // Enrichable extracted entities from Docs/enrichment-analysis.md executive summary
        '08749664511655725314', // The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch
        '05384086983174826493', // Bank of New York Mellon Corporation (BNY Mellon)
        '06157989400122873900', // HSBC Bank USA, National Association
        '05477621199116204617', // Orrick, Herrington & Sutcliffe, LLP
        '02080889041561724035', // Orrick
        '07683517764755523583', // Willdan Financial Services
        '06967031221082229818', // UNITED JERSEY BANK/CENTRAL,
        '06471256961308361850', // New Jersey Housing and Mortgage Finance Agency
        '04104505588419472813', // NC HOUSING ASSOCIATES #200 CO.
        '04008955034518895738', // ARTHUR KLEIN
        '07942829951042429385', // 97-77 QUEENS BLVD. REGO PARK, N.Y. 11374
    ]);
    const CURATED_CONTEXT_ANCHORS = [
        {
            neid: '08749664511655725314',
            name: 'The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch',
            label: 'HSBC Singapore Branch',
            typeLabel: 'organization',
        },
        {
            neid: '06967031221082229818',
            name: 'UNITED JERSEY BANK/CENTRAL,',
            label: 'United Jersey Bank/Central',
            typeLabel: 'organization',
        },
    ] as const;
    const HSBC_US_NEID = '06157989400122873900';
    const REPUBLIC_NEID = '04824620677155774613';

    const {
        documentEntities,
        enrichedEntities,
        relationships,
        enriching,
        isReady,
        enrich,
        selectEntity,
        enrichmentHops,
        enrichmentIncludeEvents,
        hasEnrichmentRun,
        enrichmentLastRun,
        enrichmentDocumentGraphEntities,
        enrichmentDocumentGraphRelationships,
        enrichmentSupersetGraphEntities,
        enrichmentSupersetGraphRelationships,
        enrichmentCollapsedOrganizationCount,
        enrichmentCollapsedRepresentativeByNeid,
        enrichmentInsights,
        enrichmentTakeawayBullets,
        enrichmentValueSummary,
        lineageInsights,
        broaderActivityInsights,
        eventTimelineInsights,
        peopleAffiliationInsights,
        enrichmentLanguageLoading,
        setEnrichmentHops,
        setEnrichmentIncludeEvents,
    } = useCollectionWorkspace();

    const activeSubtab = ref<'summary' | 'proof' | 'graph' | 'setup'>(
        enrichmentLastRun.value || enriching.value ? 'summary' : 'setup'
    );
    const showEnrichedEntities = ref(true);
    const showEnrichedRelationships = ref(true);
    const enrichmentProgressStartMs = ref<number | null>(null);
    const enrichmentProgressNowMs = ref(Date.now());
    let enrichmentProgressTimer: ReturnType<typeof setInterval> | null = null;

    const enrichmentProgressSeconds = computed(() => {
        if (!enrichmentProgressStartMs.value) return 0;
        return Math.max(
            1,
            Math.floor((enrichmentProgressNowMs.value - enrichmentProgressStartMs.value) / 1000)
        );
    });
    const enrichmentProgressStage = computed(() => {
        if (!enriching.value) return '';
        const seconds = enrichmentProgressSeconds.value;
        if (seconds < 4) return 'Finding connected entities from selected anchors...';
        if (seconds < 9) return 'Loading relationships across the expanded context...';
        if (seconds < 15) return 'Collecting related events and participants...';
        return 'Finalizing expanded graph results...';
    });

    function startEnrichmentProgressAnimation(): void {
        enrichmentProgressStartMs.value = Date.now();
        enrichmentProgressNowMs.value = Date.now();
        if (enrichmentProgressTimer) clearInterval(enrichmentProgressTimer);
        enrichmentProgressTimer = setInterval(() => {
            enrichmentProgressNowMs.value = Date.now();
        }, 300);
    }

    function stopEnrichmentProgressAnimation(): void {
        if (enrichmentProgressTimer) {
            clearInterval(enrichmentProgressTimer);
            enrichmentProgressTimer = null;
        }
        enrichmentProgressStartMs.value = null;
    }

    function normalizeAnchorName(name: string): string {
        return name.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function anchorDisplayLabel(entity: { neid: string; name: string }): string {
        if (entity.neid === '05384086983174826493') return 'BNY Mellon';
        if (entity.neid === '06157989400122873900') return 'HSBC Bank USA';
        if (entity.neid === '08749664511655725314') return 'HSBC Singapore Branch';
        if (entity.neid === '06967031221082229818') return 'United Jersey Bank/Central';
        return entity.name;
    }

    const documentEntityByNeid = computed(
        () => new Map(documentEntities.value.map((entity) => [entity.neid, entity] as const))
    );
    const documentEntityNames = computed(
        () => new Set(documentEntities.value.map((entity) => normalizeAnchorName(entity.name)))
    );
    const hasHsbcFamilyDocumentContext = computed(
        () =>
            documentEntityByNeid.value.has(HSBC_US_NEID) ||
            documentEntityByNeid.value.has(REPUBLIC_NEID) ||
            documentEntities.value.some((entity) =>
                normalizeAnchorName(entity.name).includes('hsbc')
            )
    );
    const hasUnitedJerseyDocumentContext = computed(
        () =>
            documentEntityByNeid.value.has('06967031221082229818') ||
            documentEntityNames.value.has(normalizeAnchorName('UNITED JERSEY BANK')) ||
            documentEntities.value.some((entity) =>
                normalizeAnchorName(entity.name).includes('united jersey bank')
            )
    );
    const autoEnrichmentAnchorEntities = computed(() => {
        const anchors = new Map<
            string,
            {
                neid: string;
                name: string;
                label: string;
                typeLabel: string;
                presentInCollection: boolean;
                source: 'document' | 'context';
            }
        >();

        for (const entity of documentEntities.value) {
            if (!ENRICHABLE_ANCHOR_NEIDS.has(entity.neid)) continue;
            anchors.set(entity.neid, {
                neid: entity.neid,
                name: entity.name,
                label: anchorDisplayLabel(entity),
                typeLabel: entity.flavor.replace(/_/g, ' '),
                presentInCollection: true,
                source: 'document',
            });
        }

        if (hasHsbcFamilyDocumentContext.value) {
            const branchAnchor = CURATED_CONTEXT_ANCHORS[0];
            if (!anchors.has(branchAnchor.neid)) {
                anchors.set(branchAnchor.neid, {
                    ...branchAnchor,
                    presentInCollection: false,
                    source: 'context',
                });
            }
        }

        if (hasUnitedJerseyDocumentContext.value) {
            const ujbAnchor = CURATED_CONTEXT_ANCHORS[1];
            if (!anchors.has(ujbAnchor.neid)) {
                anchors.set(ujbAnchor.neid, {
                    ...ujbAnchor,
                    presentInCollection: false,
                    source: 'context',
                });
            }
        }

        return Array.from(anchors.values()).sort((a, b) => a.name.localeCompare(b.name));
    });
    const autoEnrichmentAnchors = computed(() =>
        autoEnrichmentAnchorEntities.value.map((entity) => entity.neid)
    );
    const autoEnrichmentContextAnchorCount = computed(
        () =>
            autoEnrichmentAnchorEntities.value.filter((entity) => entity.source === 'context')
                .length
    );
    const hopsModel = computed<1 | 2>({
        get: () => enrichmentHops.value,
        set: (hops) => setEnrichmentHops(hops),
    });
    const includeEventsModel = computed({
        get: () => enrichmentIncludeEvents.value,
        set: (includeEvents: boolean) => setEnrichmentIncludeEvents(includeEvents),
    });

    const activeGraphEntities = computed(() =>
        hasEnrichmentRun.value
            ? enrichmentSupersetGraphEntities.value
            : enrichmentDocumentGraphEntities.value
    );
    const activeGraphRelationships = computed(() =>
        hasEnrichmentRun.value
            ? enrichmentSupersetGraphRelationships.value
            : enrichmentDocumentGraphRelationships.value
    );
    const graphModeDescription = computed(() => {
        if (!hasEnrichmentRun.value) {
            return 'Showing the document-only graph. Run Expand Context to reveal broader connections.';
        }
        if (!showEnrichedEntities.value && !showEnrichedRelationships.value) {
            return 'Expanded graph is loaded, with added entities and relationships hidden.';
        }
        if (!showEnrichedEntities.value) {
            return 'Showing document entities while hiding added entities.';
        }
        if (!showEnrichedRelationships.value) {
            return 'Showing added entities while hiding added relationships.';
        }
        return 'Expanded graph overlays broader platform context on top of document-derived structure.';
    });
    const documentRelationshipCount = computed(
        () =>
            relationships.value.filter((relationship) => relationship.origin === 'document').length
    );
    const enrichedRelationshipCount = computed(
        () =>
            relationships.value.filter((relationship) => relationship.origin === 'enriched').length
    );
    const entityNameByNeid = computed(() => {
        const byNeid = new Map<string, string>();
        for (const entity of [...documentEntities.value, ...enrichedEntities.value]) {
            byNeid.set(entity.neid, entity.name);
        }
        return byNeid;
    });
    const collapsedOrganizationMappings = computed(() => {
        const byRepresentative = new Map<
            string,
            {
                representativeNeid: string;
                representativeName: string;
                collapsedMembers: Array<{ neid: string; name: string }>;
            }
        >();
        for (const [neid, representativeNeid] of Object.entries(
            enrichmentCollapsedRepresentativeByNeid.value
        )) {
            if (neid === representativeNeid) continue;
            const representativeName =
                entityNameByNeid.value.get(representativeNeid) ?? representativeNeid;
            const collapsedName = entityNameByNeid.value.get(neid) ?? neid;
            const entry = byRepresentative.get(representativeNeid) ?? {
                representativeNeid,
                representativeName,
                collapsedMembers: [],
            };
            entry.collapsedMembers.push({ neid, name: collapsedName });
            byRepresentative.set(representativeNeid, entry);
        }
        return Array.from(byRepresentative.values())
            .map((entry) => ({
                ...entry,
                collapsedMembers: Array.from(
                    new Map(
                        entry.collapsedMembers.map((member) => [member.neid, member] as const)
                    ).values()
                ).sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => b.collapsedMembers.length - a.collapsedMembers.length);
    });

    async function runEnrichment() {
        const anchors = autoEnrichmentAnchors.value;
        if (anchors.length === 0) return;
        startEnrichmentProgressAnimation();
        try {
            await enrich(anchors, hopsModel.value, includeEventsModel.value);
            showEnrichedEntities.value = true;
            showEnrichedRelationships.value = true;
            activeSubtab.value = 'summary';
        } finally {
            stopEnrichmentProgressAnimation();
        }
    }

    function launchAskYotta(prompt: string) {
        emit('open-chat', prompt);
    }

    function originLabel(origin: string): string {
        if (origin === 'document') return 'Document';
        if (origin === 'enriched') return 'Context';
        return 'Agent';
    }

    onBeforeUnmount(() => {
        stopEnrichmentProgressAnimation();
    });

    watch(
        () => enrichmentLastRun.value?.ranAt,
        (ranAt) => {
            if (!ranAt) return;
            activeSubtab.value = 'summary';
        }
    );
    watch(
        () => enriching.value,
        (isRunning) => {
            if (!isRunning || enrichmentLastRun.value) return;
            activeSubtab.value = 'summary';
        }
    );

    const enrichedHeaders = [
        { title: 'Name', key: 'name', sortable: true },
        { title: 'Type', key: 'flavor', sortable: true },
        { title: 'Source', key: 'origin', sortable: false },
    ];
</script>

<style scoped>
    .enrichment-layout {
        width: min(1180px, 100%);
        margin: 0 auto;
    }

    .proof-toolbar {
        padding: 2px 2px 6px;
    }

    .takeaway-list {
        padding-left: 0;
        list-style: none;
        display: grid;
        gap: 10px;
    }

    .takeaway-list__item {
        position: relative;
        padding-left: 16px;
        line-height: 1.45;
    }

    .takeaway-list__item::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0.58rem;
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--v-theme-primary) 78%, white 22%);
    }

    .insight-summary {
        font-size: 0.9rem;
        line-height: 1.35;
        font-weight: 600;
    }

    .insight-section-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--dynamic-text-muted);
        font-weight: 600;
    }

    .insight-context-text {
        font-size: 0.86rem;
        line-height: 1.35;
        color: var(--dynamic-text-secondary);
    }

    .lineage-entity-btn {
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        font: inherit;
        padding: 0;
        cursor: pointer;
    }

    .lineage-entity-btn:hover {
        text-decoration: underline;
    }

    .enrichment-spinner {
        animation: enrichment-spin 1s linear infinite;
    }

    @keyframes enrichment-spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
