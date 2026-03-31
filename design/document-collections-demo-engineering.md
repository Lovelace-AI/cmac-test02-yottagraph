# Feature Overview

Build a demonstration app that reconstructs a graph from a known collection of
documents, presents the extracted entities, properties, events, and
relationships, and then expands selected anchor entities into the broader
Yottagraph graph to show added context.

The first target is the five-document BNY corpus already analyzed in this repo.

# Details

## Reference inputs

- Demo script: `import/260325-BNY Documents Script.pdf`
- Product draft: `import/DOCUMENT_COLLECTIONS_MODULE_PRD.md`
- BNY reconstruction notes: `import/BNY-README.md`
- Retrieval evidence: `import/elemental-retrieval-findings.md`

## Core technical model

The app should use a two-layer retrieval architecture:

1. MCP layer for discovery, traversal, and interactive graph expansion
2. Raw Query Server layer for complete property history and relationship-row
   validation

This follows the validated BNY retrieval workflow:

- Start from document NEIDs
- Use `elemental_get_related` with `limit: 500`
- Traverse hop-1 entities by flavor
- Treat events as hop-2 discoveries
- Use `elemental_get_entity` for spot inspection and detail panels
- Use `elemental_graph_neighborhood` for outward enrichment and context
- Use raw `POST /elemental/entities/properties` for time-series properties and
  relationship timestamps

## Known BNY document anchors

- `2051052947608524725`
- `7447437794117404020`
- `7526709763959495568`
- `7780293260382878366`
- `8759058315171884540`

## Proposed app architecture

### Frontend

Nuxt 3 single-page app with a collection-first home route and tabbed or
sectioned work areas:

- overview
- graph
- events
- agreements
- validation
- enrichment

### Server routes

Use Nitro server routes as the boundary for:

- MCP proxy and normalization
- raw Query Server property-history requests
- document metadata and PDF proxying if direct client access is not ideal
- caching precomputed demo payloads where needed

### App state

Normalize the dataset into a stable app model:

```ts
type DocumentRecord = {
    neid: string;
    title: string;
    kind?: string;
    date?: string;
};

type EntityRecord = {
    neid: string;
    name: string;
    flavor: string;
    sourceDocuments: string[];
    origin: 'document' | 'enriched';
};

type RelationshipRecord = {
    sourceNeid: string;
    targetNeid: string;
    type: string;
    recordedAt?: string;
    sourceDocumentNeid?: string;
    origin: 'document' | 'enriched';
};

type EventRecord = {
    neid: string;
    name: string;
    category?: string;
    date?: string;
    description?: string;
    participantNeids: string[];
    sourceDocuments: string[];
};

type PropertySeriesRecord = {
    neid: string;
    propertyName: string;
    points: Array<{ recordedAt: string; value: unknown }>;
};
```

## Retrieval plan

### Phase A: collection bootstrap

- Hardcode or configure the BNY collection metadata for the first demo
- Store the five document NEIDs as the initial document set
- Resolve document metadata and display titles in a stable order

### Phase B: document-derived graph reconstruction

- For each document NEID, call `elemental_get_related` across these flavors:
    - organization
    - person
    - financial_instrument
    - location
    - fund_account
    - legal_agreement
- Merge results by NEID into a canonical entity map
- Track `sourceDocuments` for each discovered entity
- Identify key hubs for event traversal, especially the bond, NJHMFA, BLX Group
  LLC, and fund accounts
- Call `elemental_get_events` from those hubs to collect hop-2 events

### Phase C: relationship and property normalization

- Use MCP traversal for typed relationship discovery where cleanly exposed
- Use raw property-history rows to confirm relationship types and recover
  timestamps when needed
- Build property series for timeline or comparison UI from
  `(eid, pid, recorded_at)` rows
- Build and cache a schema-derived `pid -> propertyName` map

### Phase D: enrichment expansion

- Allow the user to select a document-derived anchor entity
- Expand one hop using `elemental_get_related` or
  `elemental_graph_neighborhood`
- Expand two hops selectively from top-ranked first-hop neighbors
- Score or filter neighbors so the enriched view stays legible
- Label every enriched node and edge distinctly from document-derived content

## UX recommendations

### Overview

- Show the corpus, narrative summary, and extraction counts immediately
- Make this the quickest path to "we understood your documents"

### Graph

- Start with document-derived nodes only
- Add an explicit toggle to layer in enriched graph context
- Keep a clear detail panel for node properties, relationships, and citations

### Events

- Offer a timeline view first and a structured table second
- Let the user filter by participant and event category

### Agreements

- Optimize for explaining deal structure, parties, and linked instruments

### Validation

- Explain the retrieval model directly:
    - MCP for discovery and traversal
    - raw property history for temporal completeness
- Show coverage metrics grounded in the BNY findings

### Enrichment

- Make the UI answer one question: "What do we know beyond the source PDFs?"
- Default to a constrained set of high-signal neighbors rather than full graph
  explosion

## Implementation strategy

### Recommended first build

1. Replace the current MCP operations dashboard with a collection intelligence
   landing page
2. Build a server-side reconstruction layer for the BNY corpus
3. Render overview, graph, and events first
4. Add agreements and validation next
5. Add one-hop then two-hop enrichment last

### Suggested file areas

- `pages/` for the main collection workspace
- `components/` for graph panels, counts, timelines, and detail cards
- `composables/` for document-collection and graph state orchestration
- `server/api/` for MCP and raw Query Server adapters
- `utils/` for normalization and graph shaping helpers

## Operational decisions

- Prefer server-side token handling and proxying for remote calls
- Do not expose bearer tokens in client code or logs
- Cache stable demo payloads where it improves reliability or startup speed
- Keep raw and MCP-derived provenance fields separate in normalized state

## Testing and validation

- Verify reconstructed counts match the validated BNY findings
- Confirm all five documents render and open
- Confirm property timeline views use raw property-history rows, not latest-only
  MCP snapshots
- Confirm enriched nodes are visually distinct from document-derived nodes
- Confirm the demo still tells a clear story when network latency is present

# Implementation Steps

- [x] Create a collection-focused home experience that matches the demo story
- [x] Define server-side configuration for the BNY document set
- [x] Implement MCP-backed hop-1 entity reconstruction from the five document
      NEIDs
- [x] Implement hop-2 event retrieval from selected hub entities
- [x] Implement raw property-history retrieval and schema normalization
- [x] Build normalized app models for documents, entities, relationships,
      events, and property series
- [x] Build the overview surface with summary metrics and source document list
- [x] Build the graph surface with entity detail panel and origin labeling
- [x] Build the events surface with table view and filtering
- [x] Build the agreements surface
- [x] Build the validation surface with coverage and provenance messaging
- [x] Build the one-hop and two-hop enrichment workflow
- [x] Add agent workspace with guided actions and evidence-backed output
- [x] Update `DESIGN.md` as implementation decisions solidify

# Implementation Notes (v1)

## Architecture decisions

- **Navigation:** Single-page workspace with 6 in-page tabs (not multi-route or sidebar).
- **Graph loading:** On-demand live rebuild via MCP traversal, not precomputed seed. The bootstrap route returns document metadata and empty state; the rebuild route fetches everything live.
- **Agent workspace:** In-app guided actions over normalized graph state rather than deployed ADK agent. Actions are server-side functions that work over the cached collection state.
- **Visual design:** Borrows typography, spacing, and card/table density from the CRM reference doc but uses in-page tab navigation instead of sidebar or multi-route.

## Files created

| Layer         | Files                                                                                                                                                                                                                       |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types         | `utils/collectionTypes.ts`                                                                                                                                                                                                  |
| Server config | `server/utils/collectionConfig.ts`                                                                                                                                                                                          |
| Server routes | `server/api/collection/bootstrap.get.ts`, `rebuild.post.ts`, `entity/[neid].get.ts`, `enrich.post.ts`, `properties.post.ts`, `agent-actions.post.ts`                                                                        |
| Composable    | `composables/useCollectionWorkspace.ts`                                                                                                                                                                                     |
| Components    | `components/collection/CollectionOverview.vue`, `DocumentList.vue`, `GraphWorkspace.vue`, `EntityDetailPanel.vue`, `EventsView.vue`, `AgreementsView.vue`, `ValidationView.vue`, `AgentWorkspace.vue`, `EnrichmentView.vue` |
| Page          | `pages/index.vue` (replaced)                                                                                                                                                                                                |

## Open questions (resolved)

- **Precomputed vs live:** v1 uses live rebuild. A seed payload can be added later by running rebuild once and persisting the result.
- **Extracted vs enriched UX:** Green color + solid lines for extracted, blue color + dashed lines for enriched. Origin chips on entity cards and table rows.
- **Agreements:** Separate tab with card layout showing related parties.
- **Demo anchors:** Auto-select top-5 by connection count in the enrichment tab.
