# BNY KG Reconstruction README

This document explains how to reconstruct the BNY document-derived graph for
app display: entities, relationships, events, and historical properties.

It is based on the validated workflow documented in
`import/elemental-retrieval-findings.md`.

## Goal

Build an app-facing graph model from the 5 BNY rebate-analysis documents that
supports:

- entity lists and detail views
- typed relationships
- event timelines
- historical property charts
- document-scoped provenance where possible

## Inputs Required

You need:

- the 5 BNY document NEIDs
- tenant gateway access or authenticated Query Server access
- schema access for mapping property IDs to names

### BNY Document NEIDs

| Document | NEID                  |
| -------- | --------------------- |
| 7438596  | `2051052947608524725` |
| 26889358 | `7447437794117404020` |
| 4124255  | `7526709763959495568` |
| 5816087  | `7780293260382878366` |
| 9587055  | `8759058315171884540` |

## Retrieval Model

Use two layers:

### 1. MCP layer

Use MCP for:

- entity discovery
- graph traversal
- event discovery
- debugging individual entities

Primary MCP tools:

- `elemental_get_related`
- `elemental_get_events`
- `elemental_get_entity`
- `elemental_get_schema`

### 2. Raw Query Server layer

Use raw Query Server property history for:

- full historical property series
- relationship-row timestamp recovery
- final validation of document-ingested edges

Primary raw endpoint:

```text
POST /elemental/entities/properties
```

Use it through the tenant gateway:

```text
{gateway}/api/qs/{org_id}/elemental/entities/properties
```

## Step-By-Step Workflow

### Step 1: Fan out from documents

For each document NEID, call `get_related` with:

- `limit: 500`
- flavors:
    - `organization`
    - `person`
    - `financial_instrument`
    - `location`
    - `fund_account`
    - `legal_agreement`

Do not depend on document -> event traversal; it returns zero useful event
edges in this dataset.

### Step 2: Build the hop-1 entity index

Create a canonical entity map keyed by NEID:

```ts
type EntityNode = {
    neid: string;
    name: string;
    flavor: string;
    sourceDocuments: string[];
};
```

As you collect entities from documents:

- de-duplicate by NEID
- record all documents where each entity appears
- keep canonical names from traversal, not from fuzzy name search

### Step 3: Traverse hop-2 for events

Use hop-1 hubs to find events:

- bond / main financial instrument
- fund accounts
- key organizations

For BNY, the key pattern is:

- documents -> non-event entities at hop 1
- events at hop 2

Useful event sources in this dataset:

- bond entity
- NJHMFA
- BLX Group LLC
- fund accounts
- selected banks / trustees / counterparties

### Step 4: Assemble typed relationships

MCP path:

- use `get_related` with `relationship_types` filters for typed discovery

Raw path:

- use `POST /elemental/entities/properties` to retrieve `data_nindex` rows
- interpret relationship properties as typed edges with timestamps

Suggested app edge model:

```ts
type GraphEdge = {
    sourceNeid: string;
    targetNeid: string;
    relationshipType: string;
    recordedAt?: string;
    sourceDocumentNeid?: string;
};
```

### Step 5: Retrieve full property history

For entities that need time-series display, call raw:

```text
POST /elemental/entities/properties
```

Parameters:

- `eids`: JSON-stringified array of NEIDs
- optionally `pids`: JSON-stringified array of property IDs
- `include_attributes=true`

The response contains rows like:

- `eid`
- `pid`
- `value`
- `recorded_at`

Build series by grouping on `(eid, pid)` and sorting by `recorded_at`.

Suggested app model:

```ts
type PropertyPoint = {
    neid: string;
    pid: number;
    propertyName: string;
    value: string | number | boolean | null;
    recordedAt: string;
};
```

### Step 6: Map property IDs to names

Use schema:

- MCP `elemental_get_schema`, or
- raw `GET /schema`

Store a `pid -> propertyName` map so the app can render labels and construct
per-property charts.

## Recommended App Data Shapes

### Entities

```ts
type EntityRecord = {
    neid: string;
    name: string;
    flavor: string;
    sourceDocuments: string[];
};
```

### Events

```ts
type EventRecord = {
    neid: string;
    name: string;
    date?: string;
    category?: string;
    description?: string;
    participantNeids: string[];
};
```

### Relationships

```ts
type RelationshipRecord = {
    sourceNeid: string;
    targetNeid: string;
    type: string;
    recordedAt?: string;
    sourceDocumentNeid?: string;
};
```

### Property Series

```ts
type PropertySeriesRecord = {
    neid: string;
    pid: number;
    propertyName: string;
    points: Array<{
        recordedAt: string;
        value: string | number | boolean | null;
    }>;
};
```

## Provenance Guidance

What is easy:

- entity existence
- event existence
- relationship existence
- relationship type
- relationship timestamp
- property history by timestamp

What is harder:

- exact edge citation string in one clean response
- dedicated per-edge counts for document-ingested edges

For this dataset, source document provenance can often be reconstructed by:

1. matching `recorded_at` timestamps
2. matching document `appears_in` rows
3. aligning those rows to the 5 document NEIDs

This is usually sufficient for app display, but it is not as clean as a
single dedicated provenance endpoint.

## BNY-Specific Lessons

- Always use `limit: 500`
- Never trust name-based verification after a NEID has been found
- Expect events to be hop 2
- Use the bond as a hub, but not the only hub
- Use raw property history for any time-series UI
- Distinguish:
    - unique NEID coverage
    - merged-name coverage

## Final Coverage

For the BNY dataset:

- entities: **100%**
- events: **100%**
- relationship existence/types/timestamps: **100%**
- ground-truth property values: **100%**

Remaining non-cleanly-exposed area:

- exact edge citation strings and dedicated count endpoints are still not
  returned cleanly for document-ingested relationships

## Related Docs

- `import/elemental-retrieval-findings.md`
- `import/Jon-graph.md`
- `.cursor/skills/document-kg-reconstruction/SKILL.md`
