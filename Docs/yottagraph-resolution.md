# Yottagraph Resolution

## Purpose

This note tracks how document-extracted entities map into canonical Yottagraph
entities for the BNY collection, what collapsed during resolution/projection,
how much wider-graph connectivity is currently present, and what misses remain.

## Resolution Semantics (Do Not Conflate)

- `resolved_neid`: extracted label currently maps to a canonical NEID.
- `seed_only`: extracted label still has a temporary `seed:` identifier.
- `missing_from_app`: extracted label is not present under the same label in
  current app state.
- `merged_by_er`: extracted labels that collapse to the same resolved ID in the
  inventory.
- `collapsed organization lineage` (projection-time): additional organization
  collapse via `predecessor_of`/`successor_to` in
  `utils/enrichmentLineage.ts`; this is separate from raw label merges.

## Collection-Level Resolution Snapshot

### Artifact-based counts (2026-03-28)

From `design/extracted-entity-neid-map-2026-03-28.md`:

- Extracted entities: `131`
- Resolved to canonical NEIDs: `116`
- Still seed-only: `13`
- Missing from app under same extracted label: `2`

From `design/extracted-graph-full-inventory-2026-03-28.md`:

- Extracted relationships: `521`
- Bootstrap entities: `129`
- Bootstrap relationship records: `650`
- Explicit entity-resolution merge groups: `2`
- Event-ID merge groups: `1`

From `design/remaining-seed-node-audit-2026-03-28.md`:

- Remaining seed entities: `13`
- Remaining seed events: `12`
- Total remaining seed nodes: `25`

### Live bootstrap check (local `/api/collection/bootstrap`)

Current app snapshot used for this check:

- Entities total: `129`
- Document-origin entities: `129`
- Enriched-origin entities: `0`
- MCP-confirmed entities: `116`
- Relationships total: `722`
- Document-origin relationships: `722`
- Enriched-origin relationships: `0`
- Evidence-backed relationships: `722`
- Inferred relationships: `0`

Notes:

- The design artifact (`650` relationships) and live bootstrap (`722`) differ.
  Treat the design files as point-in-time inventory docs.
- Resolution confirmations (`mcpConfirmed`) and enriched graph expansion
  (`origin === enriched`) are different concepts.

## Merge vs Collapse Reconciliation

The reported "collapsed" count depends on which mechanism you mean:

1. **Entity-resolution label merges (inventory-level):**
    - Current explicit groups in `extracted-graph-full-inventory`: `2`
2. **Organization lineage collapse (projection-level):**
    - Computed by `projectCollapsedOrganizationLineage(...)`
    - Current bootstrap calculation: `2` organization entities collapse into
      representative successors.

These are both valid and should be reported separately.

## Wider Knowledge Graph Connectivity

Wider-graph connectivity in this app is represented by enriched-origin entities
and relationships added through enrichment.

Current snapshot:

- Enriched entities: `0`
- Enriched relationships: `0`

Interpretation:

- Canonical resolution to Yottagraph exists for many entities (`116`
  `mcpConfirmed`), but no expanded wider-graph subnetwork is currently present
  in state until enrichment is run.

## Misses and Follow-ups

Known unresolved/missing examples (from inventory):

- `$142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond`
  (`financial_instrument`) -> `missing_from_app`
- `HSBC Bank USA Trade Services` (`organization`) -> `missing_from_app`

### BLX Group LLC (Miss Tracking)

Entity:

- `BLX Group LLC`
- NEID in current collection: `01470965072054453101`

Expected external identifier to verify:

- CIK: `0001610628`

Raw tenant-level checks run against Query Server proxy:

- Name expression (`BLX Group`) resolves to `01470965072054453101`.
- Exact `company_cik = 0001610628` expression currently returns HTTP `500`.
- Exact `company_cik = 1610628` returns no matches.

Current status:

- Treat BLX CIK linkage as **unresolved in this tenant context**.
- Keep BLX listed as a miss/suspected miss for canonical identifier coverage
  until CIK lookup is stable or validated in the same tenant/graph context.

## References

- `design/extracted-entity-neid-map-2026-03-28.md`
- `design/extracted-graph-full-inventory-2026-03-28.md`
- `design/remaining-seed-node-audit-2026-03-28.md`
- `composables/useCollectionWorkspace.ts`
- `utils/enrichmentLineage.ts`
- `utils/collectionTypes.ts`
