# BNY Example Reference

Use the BNY rebate-analysis dataset as the reference pattern for a document-derived graph.

## Inputs

- 5 document NEIDs
- MCP access to `elemental_get_related`, `elemental_get_events`, and `elemental_get_entity`
- optional raw Query Server access for extra relationship-row validation

## Final Coverage Model

- Entity names: `193`
- Unique entity NEIDs: `185`
- Event names: `57`
- Unique event NEIDs: `53`
- Relationship types: `15`

Interpretation:

- `193 -> 185` is explained by correct entity merges
- `57 -> 53` is explained by correct event merges

## Topology

- Hop 0: documents
- Hop 1: non-event entities
- Hop 2: events

There are no direct `document -> event` edges in this dataset.

## Best Traversal Sources

- bond / financial instrument
- key organizations
- fund accounts

Those hubs provide most of the event coverage.

## Property Retrieval Rule

- use `elemental_get_entity(history: ...)` for full historical series
- use `get_related` properties for latest-snapshot traversal context

MCP history returns all historical values needed for:

- fund-account time series
- bond sources/uses history
- final relationship-row validation still benefits from raw Query Server access

## Remaining Limitation

The current MCP surface is sufficient to reconstruct the graph and entity time
series for this dataset, but exact edge citation strings and dedicated
per-edge count endpoints are still not cleanly exposed in one convenience API
for document-ingested relationships.

## Local Project Docs

See:

- `import/elemental-retrieval-findings.md`
- `import/BNY-README.md`
