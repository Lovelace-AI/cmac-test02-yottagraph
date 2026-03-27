---
name: document-kg-reconstruction
description: Reconstruct document-derived knowledge graphs from ingested document NEIDs. Use when validating KG coverage, comparing against a ground-truth graph, tracing entities/relationships/events/properties from documents, or building an app that needs full historical property series through MCP.
---

# Document KG Reconstruction

## When To Use

Use this skill when the task involves:

- a set of ingested documents with known document NEIDs
- validating whether the KG contains all expected entities, events, relationships, and properties
- building an app view over a document-derived graph
- reconciling MCP-tool behavior with lower-level Query Server behavior when relationship provenance is ambiguous

## Core Rule

Treat **MCP traversal + MCP history** as the primary workflow, with raw Query
Server access as an optional validation layer:

1. Use MCP (`get_related`, `get_events`, `get_entity`) for discovery, graph traversal, and full entity property history.
2. Use raw Query Server only when you need final relationship-row validation or lower-level debugging.

Do not assume every MCP surface exposes history the same way: use
`elemental_get_entity(history: ...)` when temporal values matter.

## Required Inputs

- Document NEIDs
- Optional Query Server access through either:
    - tenant gateway + QS API key, or
    - bearer-authenticated direct Query Server access

Without document NEIDs, discovery becomes unreliable.

## Standard Workflow

### 1. Start from documents

- Call `get_related` from each document NEID
- Always use `limit: 500`
- Pull these flavors first:
    - `organization`
    - `person`
    - `financial_instrument`
    - `location`
    - `fund_account`
    - `legal_agreement`

Collect every returned NEID.

### 2. Treat events as hop-2

- Do not expect `document -> event` edges
- Traverse from hop-1 hubs:
    - bond / financial instrument
    - organizations
    - fund accounts

Use `get_events(entity_id: ...)` and `get_related(... related_flavor: "schema::flavor::event")` from those NEIDs.

### 3. Use NEIDs, not names

- Name lookup is only for the first entry point when no NEID exists
- After traversal begins, always reuse NEIDs from graph results
- If counts differ from ground truth, check for merges before declaring anything missing

### 4. Get historical properties through MCP

Use `elemental_get_entity` with:

- `entity_id`: exact NEID
- optional `properties`: list to narrow returned fields
- `history.after`
- `history.before`
- `history.limit`

Interpret `historical_properties` as repeated values per property:

- property name
- `value`
- `recorded_at`
- optional `citation`

Build time series by grouping on `(entity_id, propertyName)` and sorting by
`recorded_at`.

### 5. Interpret relationship rows carefully

Some relationship types are exposed as `data_nindex` rows in the raw Query
Server surface.

Use that raw path to:

- confirm relationship types that are awkward through MCP
- recover relationship timestamps
- validate document-ingested edges when `get_relationships` is empty

### 6. Distinguish coverage categories

Report coverage separately for:

- entity names vs unique NEIDs
- event names vs unique event NEIDs
- relationship existence/type/timestamp
- property latest snapshot vs full temporal history

If names > NEIDs, that often indicates correct entity-resolution merges rather than missing data.

## Known Pitfalls

- `get_related` with low limits silently truncates results
- `get_entity` by name can resolve to the wrong entity
- `get_relationships` may return empty for document-ingested data
- generic raw link endpoints may not return document-ingested relationship provenance cleanly
- `get_related` property access usually collapses to the latest value only

## Output Shape For Apps

Prefer separating the data into:

- `entities`: canonical node list keyed by NEID
- `events`: event list keyed by event NEID
- `relationships`: typed edges with source, target, type, timestamp
- `propertySeries`: time-series rows keyed by `(entity_id, propertyName)`
- `documents`: source document metadata keyed by document NEID

## BNY Example

For a concrete example of this workflow on the BNY rebate-analysis documents, see:

- [reference.md](reference.md)
