# Daily Update - 2026-03-27

## What This Project Is (for anyone new)

This app is a document-intelligence demo for a fixed set of five BNY source
documents. The app reconstructs a graph from those documents and then lets users
inspect:

- entities (organizations, people, instruments, agreements, locations, accounts)
- relationships between those entities
- events connected to those entities
- historical property series (time-based values)
- provenance/citations back to source documents

The reconstruction pipeline runs in the backend and streams progress to the UI.

## What "Phase 1/2/3/4" Means

When the app says "Phase X," this is what it means:

1. **Phase 1 - Entity Discovery**  
   Starting from the 5 document NEIDs, call MCP `elemental_get_related` to find
   document-adjacent entities.

2. **Phase 2 - Event Discovery**  
   Starting from known event hub entities, call MCP `elemental_get_events` to
   find relevant events and participants.

3. **Phase 3 - Relationship Assembly**  
   Build typed edges between entities (for example `fund_of`, `issuer_of`,
   `party_to`, `located_at`) and recover repeated document-scoped occurrences.

4. **Phase 4 - Property History**  
   Call MCP `elemental_get_entity(history: ...)` to retrieve
   `entity.historical_properties` for key entities.

5. **Phase 5 - Finalizing**  
   Merge all results into normalized app state for UI tabs (overview, graph,
   events, validation, agent, etc.).

## Why This Took Longer Than Expected

The difficult part is **Phase 3 (relationships)**, not entities or property
history.

- Relationship extraction needed to balance:
    - correctness (right relationship type and direction)
    - provenance (which document/timestamp supports the edge)
    - performance (not making too many MCP calls)
- Earlier logic mixed multiple fallback paths, which improved recall but made
  behavior harder to reason about and tune.
- MCP gateway instability (intermittent 502s) introduced variability between
  runs, especially during high fan-out phases.

## What We Changed Today

- Reconfirmed the right overall architecture:
    - MCP is the primary runtime source for traversal
    - extracted JSON is a guide/validation artifact, not a runtime replacement
- Simplified relationship strategy:
    - MCP typed adjacency is primary in Phase 3
    - raw relationship/property rows are additive for repeated
      document-scoped occurrences and timestamps
- Improved efficiency:
    - grouped compatible `relationship_types` in MCP calls
    - raised bounded concurrency from very conservative settings
    - reduced retry amplification where it caused long stalls
- Revalidated property history approach:
    - MCP `elemental_get_entity(history: ...)` works for this dataset when
      explicit property families are passed

## Current Status (latest stable run)

- Entities: 126
- Events: 50
- Relationships: 489 (target parity reference is 521)
- Property series: 69

Interpretation:

- Entities/events/property series are in strong shape.
- Relationship parity is improved but still not at target.
- Remaining gap is primarily Phase 3 relationship completeness/provenance tuning.

## Decisions Locked In

- Keep MCP-first reconstruction.
- Keep extracted graph JSON for guidance and validation only.
- Keep provenance and citations focused on strong signals:
    - document mentions (`appears_in`)
    - event citations
    - property-series citations/points
    - validated relationship occurrences from raw rows

## Next Session Priorities

1. Continue tightening Phase 3 relationship completeness toward parity.
2. Re-check per-type relationship deltas against reference extraction.
3. Run another full browser pass after Phase 3 tuning.
4. Confirm citations remain usable and grounded after parity changes.
