<template>
    <div>
        <!-- Traversal Summary Header -->
        <v-card class="mb-4" color="surface-variant" variant="tonal">
            <v-card-item>
                <v-card-title class="text-body-1">
                    <v-icon size="small" class="mr-2">mdi-graph-outline</v-icon>
                    Graph Traversal — 5 BNY Documents
                </v-card-title>
                <v-card-subtitle class="text-caption">
                    Starting from the 5 document seeds, the MCP pipeline traversed hop-1 entities,
                    event hubs, typed relationships, and property history via
                    <code>elemental_get_related</code>, <code>elemental_get_events</code>, and
                    <code>elemental_get_entity(history:…)</code>.
                </v-card-subtitle>
            </v-card-item>
            <v-card-text>
                <v-row dense>
                    <v-col
                        v-for="kpi in traversalKpis"
                        :key="kpi.label"
                        cols="6"
                        sm="3"
                        class="text-center"
                    >
                        <div class="text-h5 font-weight-bold">{{ kpi.value }}</div>
                        <div class="text-caption text-medium-emphasis">{{ kpi.label }}</div>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>

        <!-- Traversal Pipeline Steps -->
        <v-card class="mb-4">
            <v-card-item>
                <v-card-title class="text-body-1">Traversal Pipeline</v-card-title>
            </v-card-item>
            <v-card-text class="pa-0">
                <v-table density="compact">
                    <thead>
                        <tr>
                            <th class="text-left pl-4">Step</th>
                            <th class="text-left">Method</th>
                            <th class="text-left">Seeds</th>
                            <th class="text-right pr-4">Discovered</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="step in pipelineSteps" :key="step.label">
                            <td class="text-body-2 pl-4">{{ step.label }}</td>
                            <td class="text-caption font-mono text-primary">{{ step.method }}</td>
                            <td class="text-caption text-medium-emphasis">{{ step.seeds }}</td>
                            <td class="text-right text-body-2 font-weight-medium pr-4">
                                {{ step.count }}
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
        </v-card>

        <!-- Entity breakdown + Relationship breakdown -->
        <v-row class="mb-4">
            <v-col cols="12" md="6">
                <v-card height="100%">
                    <v-card-item>
                        <v-card-title class="text-body-1">Entities by Type</v-card-title>
                        <v-card-subtitle class="text-caption">
                            Discovered via hop-1 traversal from the 5 document NEIDs
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text>
                        <div v-for="row in entityTypeRows" :key="row.flavor" class="mb-3">
                            <div class="d-flex align-center justify-space-between mb-1">
                                <span class="text-body-2 text-capitalize">
                                    {{ row.label }}
                                </span>
                                <span class="text-body-2 font-weight-medium">{{ row.count }}</span>
                            </div>
                            <v-progress-linear
                                :model-value="
                                    maxEntityCount > 0 ? (row.count / maxEntityCount) * 100 : 0
                                "
                                color="primary"
                                height="6"
                                rounded
                            />
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card height="100%">
                    <v-card-item>
                        <v-card-title class="text-body-1">Relationships by Type</v-card-title>
                        <v-card-subtitle class="text-caption">
                            Discovered via typed probes and event participant traversal
                        </v-card-subtitle>
                    </v-card-item>
                    <v-card-text>
                        <div v-for="row in relTypeRows" :key="row.type" class="mb-3">
                            <div class="d-flex align-center justify-space-between mb-1">
                                <span class="text-body-2 font-mono text-caption">
                                    {{ row.label }}
                                </span>
                                <span class="text-body-2 font-weight-medium">{{ row.count }}</span>
                            </div>
                            <v-progress-linear
                                :model-value="maxRelCount > 0 ? (row.count / maxRelCount) * 100 : 0"
                                :color="row.color"
                                height="6"
                                rounded
                            />
                        </div>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>

        <!-- Document Provenance -->
        <v-card class="mb-4">
            <v-card-item>
                <v-card-title class="text-body-1">Document Provenance</v-card-title>
                <v-card-subtitle class="text-caption">
                    How many entities each source document contributed to the graph
                </v-card-subtitle>
            </v-card-item>
            <v-card-text class="pa-0">
                <v-table density="compact">
                    <thead>
                        <tr>
                            <th class="text-left pl-4">Document</th>
                            <th class="text-right">Entities</th>
                            <th class="text-right pr-4">Unique to Doc</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="doc in docProvenanceRows" :key="doc.neid">
                            <td class="text-body-2 pl-4">{{ doc.name }}</td>
                            <td class="text-right text-body-2">{{ doc.entityCount }}</td>
                            <td class="text-right text-caption text-medium-emphasis pr-4">
                                {{ doc.uniqueCount }}
                            </td>
                        </tr>
                    </tbody>
                </v-table>
            </v-card-text>
        </v-card>

        <!-- Data pipeline -->
        <v-row>
            <v-col cols="12" md="6">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">MCP Tools Used</v-card-title>
                    </v-card-item>
                    <v-card-text>
                        <v-list density="compact" class="pa-0">
                            <v-list-item v-for="tool in mcpTools" :key="tool.name">
                                <template #prepend>
                                    <v-icon size="small" color="primary" class="mr-2">
                                        mdi-api
                                    </v-icon>
                                </template>
                                <v-list-item-title class="text-body-2 font-mono">
                                    {{ tool.name }}
                                </v-list-item-title>
                                <v-list-item-subtitle class="text-caption">
                                    {{ tool.usage }}
                                </v-list-item-subtitle>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>

            <v-col cols="12" md="6">
                <v-card>
                    <v-card-item>
                        <v-card-title class="text-body-1">Data Characteristics</v-card-title>
                    </v-card-item>
                    <v-card-text>
                        <v-list density="compact" class="pa-0">
                            <v-list-item v-for="note in dataNotes" :key="note.text">
                                <template #prepend>
                                    <v-icon size="small" :color="note.color" class="mr-2">
                                        {{ note.icon }}
                                    </v-icon>
                                </template>
                                <v-list-item-title class="text-body-2 text-wrap">
                                    {{ note.text }}
                                </v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>

<script setup lang="ts">
    import {
        BNY_DOCUMENTS,
        EVENT_HUB_NEIDS,
        PROPERTY_BEARING_NEIDS,
    } from '~/utils/collectionTypes';

    const { meta, entities, relationships, events, propertySeries } = useCollectionWorkspace();

    // ── Traversal KPIs ────────────────────────────────────────────────────────
    const traversalKpis = computed(() => [
        { label: 'Entities', value: entities.value.length },
        { label: 'Events', value: events.value.length },
        { label: 'Relationships', value: relationships.value.length },
        { label: 'Prop Series', value: propertySeries.value.length },
    ]);

    // ── Pipeline steps ────────────────────────────────────────────────────────
    const liveRelTypeCounts = computed(() => {
        const counts: Record<string, number> = {};
        for (const r of relationships.value) {
            counts[r.type] = (counts[r.type] ?? 0) + 1;
        }
        return counts;
    });

    const pipelineSteps = computed(() => [
        {
            label: 'Phase 1 — Entity Discovery',
            method: 'elemental_get_related',
            seeds: '5 docs × 6 flavors (30 parallel calls)',
            count: `${entities.value.length} entities`,
        },
        {
            label: 'Phase 2 — Event Discovery',
            method: 'elemental_get_events',
            seeds: `${EVENT_HUB_NEIDS.length} hub NEIDs (parallel)`,
            count: `${events.value.length} events`,
        },
        {
            label: 'Phase 3 — Typed Relationships',
            method: 'elemental_get_related',
            seeds: `${entities.value.length} entities × 14 probes (parallel)`,
            count: `${relationships.value.length} edges`,
        },
        {
            label: 'Phase 4 — Property History',
            method: 'elemental_get_entity(history:…)',
            seeds: `${PROPERTY_BEARING_NEIDS.length} property-bearing NEIDs (parallel)`,
            count: `${propertySeries.value.length} series`,
        },
    ]);

    // ── Entity type breakdown ─────────────────────────────────────────────────
    const FLAVOR_LABELS: Record<string, string> = {
        organization: 'Organizations',
        person: 'People',
        financial_instrument: 'Financial Instruments',
        location: 'Locations',
        fund_account: 'Fund Accounts',
        legal_agreement: 'Legal Agreements',
    };

    const entityTypeRows = computed(() => {
        const counts: Record<string, number> = {};
        for (const e of entities.value) {
            counts[e.flavor] = (counts[e.flavor] ?? 0) + 1;
        }
        return Object.entries(counts)
            .map(([flavor, count]) => ({
                flavor,
                label: FLAVOR_LABELS[flavor] ?? flavor,
                count,
            }))
            .sort((a, b) => b.count - a.count);
    });

    const maxEntityCount = computed(() => Math.max(...entityTypeRows.value.map((r) => r.count), 1));

    // ── Relationship type breakdown ───────────────────────────────────────────
    const REL_COLORS: Record<string, string> = {
        appears_in: 'blue-grey',
        'schema::relationship::participant': 'purple',
        fund_of: 'green',
        holds_investment: 'teal',
        located_at: 'orange',
        advisor_to: 'amber',
        predecessor_of: 'indigo',
        issuer_of: 'cyan',
        trustee_of: 'deep-purple',
        beneficiary_of: 'lime',
        works_at: 'brown',
        borrower_of: 'red',
        party_to: 'deep-orange',
        sponsor_of: 'pink',
        successor_to: 'light-blue',
    };

    const relTypeRows = computed(() =>
        Object.entries(liveRelTypeCounts.value)
            .map(([type, count]) => ({
                type,
                label: type.replace('schema::relationship::', ''),
                count,
                color: REL_COLORS[type] ?? 'primary',
            }))
            .sort((a, b) => b.count - a.count)
    );

    const maxRelCount = computed(() => Math.max(...relTypeRows.value.map((r) => r.count), 1));

    // ── Document provenance ───────────────────────────────────────────────────
    const docProvenanceRows = computed(() =>
        BNY_DOCUMENTS.map((doc) => {
            const docNeid = doc.neid;
            const entityCount = entities.value.filter((e) =>
                e.sourceDocuments.includes(docNeid)
            ).length;
            const uniqueCount = entities.value.filter(
                (e) => e.sourceDocuments.length === 1 && e.sourceDocuments[0] === docNeid
            ).length;
            return { neid: docNeid, name: doc.name, entityCount, uniqueCount };
        })
    );

    // ── MCP tools ─────────────────────────────────────────────────────────────
    const mcpTools = [
        {
            name: 'elemental_get_related',
            usage: 'Hop-1 entity discovery (limit: 500) and typed relationship probing',
        },
        {
            name: 'elemental_get_events',
            usage: `Event traversal from ${EVENT_HUB_NEIDS.length} hub entities with participant lists`,
        },
        {
            name: 'elemental_get_entity',
            usage: 'Property history (history: { after, before, limit: 100 })',
        },
    ];

    // ── Data notes ────────────────────────────────────────────────────────────
    const dataNotes = [
        {
            icon: 'mdi-information-outline',
            color: 'primary',
            text: 'All data discovered via live MCP traversal from the 5 BNY document NEIDs. No pre-loaded data.',
        },
        {
            icon: 'mdi-merge',
            color: 'primary',
            text: 'Entity names from multiple documents resolve to a single NEID in the live graph — this is correct merge behavior.',
        },
        {
            icon: 'mdi-alert-circle-outline',
            color: 'warning',
            text: 'Property series require historical_properties support in elemental_get_entity. Count will be 0 if the tenant graph has not ingested property rows.',
        },
        {
            icon: 'mdi-swap-horizontal',
            color: 'success',
            text: 'NEID normalization applied: leading zeros stripped for consistent cross-tool comparison.',
        },
    ];
</script>
