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

## How Tool Usage Is Structured (Detailed)

This section is the concrete "how it works" view for debugging performance.

### Phase 1 - Entity Discovery (MCP `elemental_get_related`)

- **Input seed set:** 5 core BNY document NEIDs.
- **Entity flavors queried per document:** 6 flavors.
- **Base call volume:** `5 documents x 6 flavors = 30 MCP calls`.
- **Execution model:** parallel fan-out with bounded concurrency (currently higher
  than earlier conservative settings).
- **Why parallel here:** each `(document, flavor)` query is independent.
- **Retry model:** limited retry to avoid multiplying total runtime when the
  gateway is unstable.

### Phase 2 - Event Discovery (MCP `elemental_get_events`)

- **Input seed set:** 11 event hub NEIDs.
- **Base call volume:** `11 MCP calls` (one per hub).
- **Execution model:** parallel fan-out with bounded concurrency.
- **Why this can still feel slow or time out in some runs:**
    - each hub call can return large event payloads and participant metadata
    - if MCP gateway has intermittent 502/latency spikes, a few hub calls can
      dominate phase duration
    - retries on heavy responses can push this phase from seconds to minutes

### Phase 3 - Relationship Assembly (MCP + raw rows)

- **Primary source (MCP):** grouped `relationship_types` calls via
  `elemental_get_related`.
- **Probe groups:** 6 grouped relationship sets.
- **Observed task count in current shape:** 111 grouped MCP calls (derived from
  discovered source entities per source flavor).
- **Execution model:** parallel fan-out with bounded concurrency.
- **Reasoning:** grouping compatible relationship types reduces call explosion vs
  one-call-per-type-per-source.
- **Secondary source (raw rows):** additive pass to recover repeated
  document-scoped occurrences/timestamps for stronger provenance.
- **Important:** raw rows are not replacing MCP traversal; they supplement
  document-level occurrence detail.

### Phase 4 - Property History (MCP `elemental_get_entity(history)`)

- **Input seed set:** 6 known property-bearing entities.
- **Base call volume:** `6 MCP calls`.
- **Execution model:** parallel fan-out.
- **Key requirement:** explicit property-family lists are passed for this
  dataset to reliably receive `historical_properties`.

### Phase 5 - Finalizing

- No significant external call volume; mostly in-memory normalization/merge.

## Sequence vs Parallel Reasoning

- **Sequential across phases:** we run phases in order because later phases
  depend on earlier outputs:
    - events depend on entities/hubs
    - relationship probing depends on discovered entities
    - property history depends on known property-bearing entities
- **Parallel inside phases:** independent calls are batched/fanned out because
  there is no data dependency between tasks in the same phase.
- **Why bounded (not unbounded) parallelism:** protects MCP gateway stability and
  reduces request storms that increase 502s/timeouts.

## Why We Make These Calls (Decision Rationale)

This is the "why this design exists" explanation, not just "what we call."

### 1) Start from document seeds first

- We start from the 5 document NEIDs because the product goal is
  **document-derived truth**, not general graph discovery.
- This constrains retrieval to collection-relevant context and keeps output
  aligned with provenance expectations.

### 2) Separate entities, events, relationships, and properties into phases

- We intentionally split phases because each data surface has different API
  behavior and payload shape.
- If we combine all discovery into one broad traversal loop, we lose
  observability and cannot tune bottlenecks by phase.

### 3) Use MCP as the primary runtime source

- MCP gives typed graph traversal primitives (`get_related`, `get_events`,
  `get_entity(history)`), which is the closest fit to live graph reconstruction.
- We keep raw row access as additive for relationship occurrence/provenance
  detail, not as a replacement for traversal logic.

### 4) Why we still traverse heavily today

- Current MCP primitives are adjacency-oriented, so reconstructing a
  document-grounded subgraph requires many node-centered calls.
- Relationship completeness currently needs probing across multiple source
  flavors and relationship groups.
- This is why Phase 3 naturally has the highest fan-out.

### 5) Why this is slower than provenance-first retrieval

- Traversal-first discovers structure from the graph outward.
- Provenance-first would ask: "what facts are supported by these 5 documents?"
  and pull that directly.
- Today, we approximate provenance-first behavior by combining traversal with
  raw rows and citation mapping, but the core retrieval still fans out via graph
  traversal.

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

## Measured Runtime Snapshots (today)

Two realities are true at the same time:

- In one stable end-to-end run, we observed:
    - Phase 1: ~41s
    - Phase 2: ~30s
    - Phase 3: ~116s
    - Phase 4: ~30s
    - Total: ~218s
- In some interactive app runs, users observed behavior like:
    - entity discovery around ~32s
    - event discovery taking much longer or appearing to hang/time out

Interpretation:

- The pipeline is functionally correct but runtime is **variable**.
- Variability is dominated by gateway behavior + large fan-out phases,
  not by a single deterministic code path.

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

## How We Can Make It Faster (next concrete levers)

1. **Phase 2 hardening**
    - add per-hub sub-step logging in UI so "slow" vs "stuck" is visible
    - apply adaptive retry/backoff only on transient failures
    - cap worst-case per-hub timeout more aggressively

2. **Phase 3 call budget control**
    - keep grouped relationship types (already done)
    - add soft call budget / early warning when call volume exceeds expected band
    - prioritize high-signal relationship groups first for faster partial value

3. **Concurrency tuning by phase**
    - tune each phase separately (Phase 1/2/3 have different payload profiles)
    - keep enough parallelism for speed while avoiding gateway saturation

4. **Operational observability**
    - track per-tool p50/p95 latency in MCP log view
    - surface timeout/error counts by phase directly in progress panel

## Recommended Improvements (including potential new tools)

The biggest speed/correctness gain would come from adding provenance-first
retrieval primitives so we do less graph fan-out work at runtime.

### A) Provenance-first retrieval mode (recommended)

Use document IDs as primary selectors and ask for facts tied to those docs
directly, instead of discovering most facts by repeated adjacency traversal.

Suggested capabilities:

- `elemental_get_document_facts`
    - input: `document_neids[]`
    - output: normalized entities, relationships, events, and citations that are
      directly supported by those documents
- `elemental_get_document_relationships`
    - input: `document_neids[]`, optional filters (`types`, `date range`)
    - output: relationship rows with source doc and timestamp metadata
- `elemental_get_document_events`
    - input: `document_neids[]`
    - output: events with participants and provenance links to source docs

Why this helps:

- Reduces fan-out call count in Phase 2/3
- Improves determinism for parity checks
- Keeps output grounded in document provenance by construction

### B) Batch traversal primitive for current MCP model

If provenance-first tools are not yet available, add a batch form for existing
adjacency APIs to reduce round trips:

- `elemental_get_related_batch`
    - input: array of source entities + flavor/type filters
    - output: grouped adjacency results keyed by source entity

Why this helps:

- Removes client-side loop overhead across 100+ calls in Phase 3
- Allows server-side query planning and dedup before returning payloads

### C) Materialized document-subgraph endpoint (fast path)

Precompute a "document collection subgraph" for the 5 BNY docs and expose:

- `elemental_get_collection_subgraph(collection_id | document_neids[])`
    - returns entities/events/relationships/provenance in one response
    - optionally include incremental refresh watermark

Why this helps:

- Near-instant demo startup
- Fewer runtime failures from gateway variability
- Predictable parity behavior

### D) Runtime strategy recommendation right now

Until new tools exist, keep current architecture but shift toward
provenance-prioritized behavior:

1. Run a minimal document-first pass (`appears_in`, event/doc citations,
   property history) for fast initial UI.
2. Defer broad relationship expansion to a second pass.
3. Surface first-pass completeness immediately in UI so users see useful data
   without waiting for full Phase 3 completion.

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
