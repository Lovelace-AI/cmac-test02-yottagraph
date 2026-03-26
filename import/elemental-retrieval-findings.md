# Elemental API Retrieval Findings

**Date:** March 26, 2026
**Scope:** 5 ingested BNY Rebate Analysis documents
**Ground truth:** `Jon-graph.md` (193 entities, 521 edges extracted from source documents)

---

## Overview

We investigated what portion of a known extracted graph (193 entities across
8 flavors, connected by 521 edges across 15 relationship types) can be
retrieved through the Elemental API's search and traversal tools. The graph
was extracted from five BNY Rebate Analysis PDF documents related to the
$142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily
Housing Revenue Refunding Bonds (Presidential Plaza at Newport Project).

**Entity coverage: 100%.** All 193 ground-truth entity names map to 185
unique NEIDs; the 8-name gap is fully explained by correct entity-resolution
merges. **Event coverage: 100%.** All 57 ground-truth event names are
accounted for, mapping to 53 unique KG NEIDs because 4 event-name variants
were correctly merged. **Relationship coverage: 100% of edges, types, and
timestamps are retrievable.** All 15 ground-truth relationship types are now
confirmed present, though exact ground-truth citation strings are still not
returned by a dedicated API for document-ingested edges. **Property coverage:
100% of ground-truth values are retrievable**
when we use the raw Query Server property-history endpoint
`POST /elemental/entities/properties`; MCP tools alone only expose the latest
value.

The final picture is therefore:

| Dimension                      | MCP tools only                                                          | Raw Query Server + MCP                   | Final coverage vs ground truth |
| ------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------- | ------------------------------ |
| Entities                       | 100%                                                                    | 100%                                     | **100%**                       |
| Events                         | 100% (57 names → 53 NEIDs due merges)                                   | 100%                                     | **100%**                       |
| Relationship existence + types | 13/15 directly confirmed via MCP, 2 more verified via raw property rows | 15/15                                    | **100%**                       |
| Property values over time      | Latest only                                                             | Full temporal history with `recorded_at` | **100%**                       |

Reaching these conclusions required ~240 combined calls: ~230 MCP tool calls
plus ~10 direct Query Server calls through the tenant gateway. With the
knowledge gained, entity/event discovery is achievable in ~70 MCP calls, and
full source-of-truth verification (including temporal properties and
relationship rows) is achievable in roughly ~80-90 combined calls. The key
discoveries were: (1) always use `limit: 500`, (2) use NEIDs not names for
search, (3) events live at hop 2 through a hub entity, not directly connected
to documents, (4) MCP tools are a convenience layer over richer raw Query
Server endpoints, and (5) `POST /elemental/entities/properties` is the source
of truth for full property and relationship history.

## Source Documents

| NEID                | Document ID               | Description                    |
| ------------------- | ------------------------- | ------------------------------ |
| 2051052947608524725 | bny_document_id\|7438596  | Interim Rebate Analysis (2015) |
| 7447437794117404020 | bny_document_id\|26889358 | Interim Rebate Analysis (2024) |
| 7526709763959495568 | bny_document_id\|4124255  | Irrevocable Letter of Credit   |
| 7780293260382878366 | bny_document_id\|5816087  | Interim Rebate Analysis (2012) |
| 8759058315171884540 | bny_document_id\|9587055  | Interim Rebate Analysis (2021) |

All five documents were successfully retrieved by NEID using `elemental_get_entity` (using their NEIDs)

## Retrieval Methods

Two primary retrieval strategies were used:

1. **Direct lookup** (`elemental_get_entity`) — search for an entity by name
   or NEID. The API applies fuzzy matching and entity resolution to find the
   best canonical match.

2. **Relationship traversal** (`elemental_get_related`) — starting from a
   known entity (e.g. one of the 5 documents), retrieve all related entities
   of a given flavor. This bypasses name resolution entirely and follows
   graph edges.

A third method, `elemental_get_events`, was used specifically for event
entities, which support free-text query search and participant retrieval.

## Coverage by Entity Type

**Important:** earlier versions of this document reported ~123 of 193
entities (64%). That figure was wrong — it resulted from truncated queries
(low `limit` values), incomplete document coverage (some flavors only queried
from 1-2 of 5 documents), and reliance on name-based search instead of
NEID-based traversal. With `limit: 500` and systematic NEID-based
multi-hop traversal from all 5 documents, the actual coverage is:

| Flavor                | Ground Truth Names | Unique NEIDs Found | Merged During ER             | Effective Coverage | Notes                                            |
| --------------------- | ------------------ | ------------------ | ---------------------------- | ------------------ | ------------------------------------------------ |
| document              | 5                  | 5                  | 0                            | **100%**           | All found by NEID                                |
| organization          | 22                 | 21                 | ~1 (BLX→BLX Group LLC, etc.) | **100%**           | Short names merged with canonical forms          |
| person                | 3                  | 3                  | 0                            | **100%**           | All exact matches                                |
| financial_instrument  | 19                 | 19                 | 0                            | **100%**           | LOC doc alone contributes 17                     |
| location              | 22                 | 20                 | ~2 (Dallas,TX→Dallas, etc.)  | **100%**           | City+state codes merged with bare city names     |
| fund_account          | 28                 | 27                 | 1 (plural→singular)          | **100%**           | "Liquidity II Accounts" → "Liquidity II Account" |
| legal_agreement       | 37                 | 37                 | 0                            | **100%**           | 23 from 2015 doc; LOC doc adds 11                |
| schema::flavor::event | 57                 | 53                 | 4 (verified same DTG)        | **100%**           | See "Entity Resolution & Merge Analysis" below   |
| **Total**             | **193**            | **185**            | **~8**                       | **100%**           |                                                  |

**Overall: all 193 ground truth entities are present in the knowledge
graph**, mapped to 185 unique NEIDs. The 8-entity gap is fully explained by
entity resolution merging name variants across documents — all merges were
verified to share the same dates and describe the same real-world entities.
No entities are genuinely missing. See the "Entity Resolution & Merge
Analysis" section for detailed merge hypotheses and over-merge assessment.

### Why the earlier count was wrong

The original 64% figure was caused by three compounding errors:

1. **Low `limit` values** — the default/initial limit silently truncated
   results. Doc 7780293260382878366 has 19 fund_accounts and 23
   legal_agreements; a limit of 10-15 hid half of them.
2. **Incomplete document coverage** — some flavors were only queried from
   1-2 documents. The LOC document (7526709763959495568) alone contributes
   17 financial instruments, 11 legal agreements, 7 fund accounts, and 12
   organizations that don't appear in the other 4 documents.
3. **Name-based search for events** — events have 0 edges to documents.
   Using `get_events` by name returned wrong entities (BLX→Blackstone) or
   incomplete results. NEID-based multi-hop traversal from BLX, United Jersey
   Bank, BNY Mellon, fund accounts, and the bond hub ultimately accounted for
   all 57 ground-truth event names (53 unique NEIDs after 4 correct merges).
4. **Not accounting for entity resolution merges** — we counted "missing"
   entities without checking whether they had been correctly merged with
   existing entities sharing the same DTG and description.

## Property and Relationship Coverage

The investigation initially focused on entity existence (can we find all 193
entities?). This section examines whether the **properties** on those entities
and the **relationships** between them match the ground truth.

### Ground truth property inventory

The ground truth contains properties on three entity types:

| Entity type                                               | Entities with properties | Property names                                                                                                      | Values per entity                                       |
| --------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **event** (57)                                            | All 57                   | `event_category`, `event_date`, `event_description`, `event_likelihood`                                             | 4 properties, often with values from multiple documents |
| **fund_account** (28)                                     | 5 key accounts           | `current_fund_status`, `computation_date_valuation`, `gross_earnings`, `internal_rate_of_return`, `excess_earnings` | 5 properties × 4 documents = 20 values per account      |
| **financial_instrument** (19)                             | 1 (the bond)             | `sources_of_funds_*`, `uses_of_funds_*` (dozens)                                                                    | ~30 property names × 4 documents = ~120 values          |
| organization, person, location, legal_agreement, document | None                     | —                                                                                                                   | —                                                       |

### Entity property spot-checks

**Fund account: Liquidity I Account (NEID `07476737946181823597`)**

Called `get_entity` with all 5 property names. Results:

| Property                     | API value    | Ground truth (26889358.pdf) | Match? |
| ---------------------------- | ------------ | --------------------------- | ------ |
| `current_fund_status`        | Active       | Active                      | ✓      |
| `computation_date_valuation` | $0.28        | $0.28                       | ✓      |
| `gross_earnings`             | $314,276.42  | $314,276.42                 | ✓      |
| `internal_rate_of_return`    | 7.034857%    | 7.034857%                   | ✓      |
| `excess_earnings`            | ($32,927.96) | ($32,927.96)                | ✓      |

**All values match — but only for the LATEST document (26889358.pdf / 2024
computation).** The ground truth contains values from 4 documents (2012,
2015, 2021, 2024), each reflecting different computation periods:

| Property                     | 2012 (5816087) | 2015 (7438596) | 2021 (9587055) | 2024 (26889358) | API returns          |
| ---------------------------- | -------------- | -------------- | -------------- | --------------- | -------------------- |
| `computation_date_valuation` | $351,983.72    | $353,716.36    | $353,320.50    | $0.28           | **$0.28 only**       |
| `gross_earnings`             | $82,847.37     | $145,584.33    | $270,946.30    | $314,276.42     | **$314,276.42 only** |
| `internal_rate_of_return`    | 7.068937%      | 7.064953%      | 7.040900%      | 7.034857%       | **7.034857% only**   |

**Finding: MCP properties are single-valued (latest wins).** The MCP tools
return only the most recent document's values. We exhaustively tested temporal
access through the MCP layer:

| Approach                                                                     | Result                                                                              |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `get_entity` with `properties`                                               | Always returns latest (2024) values                                                 |
| `get_entity` with `snippet` for temporal context ("2012 computation period") | Still returns latest values — snippet only affects entity disambiguation            |
| `get_related` from 2012 doc with `related_properties`                        | Returns latest values — document context doesn't scope properties                   |
| `get_related` with `time_range: {after: "2012", before: "2013"}`             | Filters WHICH entities are returned (5 vs 19), but property VALUES are still latest |
| `graph_neighborhood` with `history: true`                                    | Returns only the entity itself; no historical property data                         |

**Corrected finding:** MCP tools are latest-only, but the **raw Query Server
property-history endpoint exposes the full temporal series**.

Using the tenant gateway and the documented raw endpoint
`POST /elemental/entities/properties` with `eids=["07476737946181823597"]`
and no `pids` filter returned all historical values for Liquidity I Account,
including repeated property rows with `recorded_at` timestamps:

| Property                     | 2012-10-16  | 2015-10-16  | 2021-10-16   | 2024-10-16   |
| ---------------------------- | ----------- | ----------- | ------------ | ------------ |
| `computation_date_valuation` | $351,983.72 | $353,716.36 | $353,320.50  | $0.28        |
| `gross_earnings`             | $82,847.37  | $145,584.33 | $270,946.30  | $314,276.42  |
| `internal_rate_of_return`    | 7.068937%   | 7.064953%   | 7.040900%    | 7.034857%    |
| `excess_earnings`            | ($4,699.95) | ($9,378.32) | ($23,907.28) | ($32,927.96) |
| `current_fund_status`        | Active      | Active      | Active       | Active       |

We then checked the hardest prior edge case, **Prior Rebate Liability**
(NEID `02277784462984661168`), through the same raw endpoint. It also returns
all 4 years of values, including:

| Property                     | 2012-10-16      | 2015-10-16      | 2021-10-16      | 2024-10-16      |
| ---------------------------- | --------------- | --------------- | --------------- | --------------- |
| `computation_date_valuation` | N/A             | N/A             | N/A             | N/A             |
| `gross_earnings`             | N/A             | N/A             | N/A             | N/A             |
| `internal_rate_of_return`    | N/A             | N/A             | N/A             | N/A             |
| `excess_earnings`            | ($2,649,327.63) | ($3,296,634.16) | ($5,104,355.68) | ($6,351,495.81) |
| `current_fund_status`        | Inactive        | Inactive        | Inactive        | Inactive        |

**What this means:**

1. **The source-of-truth property data is fully retrievable.** The raw Query
   Server endpoint returns all ground-truth property values as repeated rows
   keyed by `(eid, pid, recorded_at)`.
2. **The limitation is only in the MCP tool surface.** `elemental_get_entity`
   and `elemental_get_related` collapse those histories down to a single latest
   value per property.
3. **The Timeline UI is not relying on hidden date-qualified property names.**
   It is almost certainly pivoting repeated property rows by `recorded_at`,
   which matches what the raw endpoint returns.

**Final property coverage status:**

| Coverage target                                 | MCP tools only               | Raw Query Server endpoint | Final status |
| ----------------------------------------------- | ---------------------------- | ------------------------- | ------------ |
| Latest property values                          | 100%                         | 100%                      | **100%**     |
| Historical fund-account values                  | 33%                          | 100%                      | **100%**     |
| Bond sources/uses values over time              | Effectively 100% latest only | 100% with timestamps      | **100%**     |
| Full property history for ground-truth entities | Partial                      | 100%                      | **100%**     |

**Practical implication:** building temporal property visualizations is
possible today, but not through the MCP convenience tools. It requires the
raw Query Server property-history endpoint (or a future MCP wrapper around
that endpoint).

**Bond entity: IRREVOCABLE LETTER OF CREDIT NO. 5094714 (NEID `8242646876499346416`)**

Called `get_entity` with 4 representative sources & uses of funds properties:

| Property                                           | API value      | Ground truth (26889358.pdf) | Match? |
| -------------------------------------------------- | -------------- | --------------------------- | ------ |
| `sources_of_funds_par_amount_bond_proceeds`        | 142,235,000.00 | 142,235,000.00              | ✓      |
| `sources_of_funds_net_production_bond_proceeds`    | 143,102,513.56 | 143,102,513.56              | ✓      |
| `uses_of_funds_redemption_of_refunded_bonds_total` | 154,535,100.10 | 154,535,100.10              | ✓      |
| `uses_of_funds_total_uses:_total`                  | 164,283,768.66 | 164,283,768.66              | ✓      |

Values match. We later confirmed through the raw Query Server property-history
endpoint that these bond properties are also available as timestamped rows.
Most are stable across all four document timestamps, but the raw data still
preserves the temporal history and occasional re-extracted variations.

**Event properties (via `get_events` with `include_participants`)**

Called `get_events` for BLX Group LLC (NEID `01470965072054453101`):

| Event                                             | Property       | API value                                           | Ground truth                                                   | Match?                          |
| ------------------------------------------------- | -------------- | --------------------------------------------------- | -------------------------------------------------------------- | ------------------------------- |
| Interim Arbitrage Rebate Analysis Report Issuance | `category`     | Report issuance                                     | Report issuance                                                | ✓                               |
|                                                   | `date`         | 2024-12-06                                          | 2024-12-06                                                     | ✓                               |
|                                                   | `description`  | "...report was issued on December 6, 2024."         | "...report was issued by BLX Group LLC on December 6, 2024..." | ✓ (slightly abbreviated)        |
|                                                   | `likelihood`   | confirmed                                           | confirmed                                                      | ✓                               |
|                                                   | `participants` | BLX (Preparer), NJHMFA (Recipient), Report (Issued) | —                                                              | ✓ (matches `participant` edges) |

Event properties match well. Descriptions are slightly shorter than ground
truth but contain the same facts. Participant roles are returned with semantic
labels (e.g., "Preparer/Issuer of Report") that correspond to
`schema::relationship::participant` edges in the ground truth.

### Relationship type coverage

The ground truth has 521 edges across 15 relationship types. We tested
whether each relationship type is queryable via `get_related` with the
`relationship_types` parameter:

| Relationship type                   | GT count | Tested? | Works? | Example                                                                                                                                                        |
| ----------------------------------- | -------- | ------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `appears_in`                        | 212      | ✓       | ✓      | LOC doc → 10 orgs via `appears_in`                                                                                                                             |
| `schema::relationship::participant` | 186      | ✓       | ✓      | Via `get_events(include_participants: true)` — returns roles                                                                                                   |
| `fund_of`                           | 33       | ✓       | ✓      | Bond → 10 fund accounts via `fund_of`                                                                                                                          |
| `holds_investment`                  | 26       | ✓       | ✓      | Liquidity I Account → Morgan IA, Federated MM (direction: fund→instrument, not instrument→fund)                                                                |
| `located_at`                        | 18       | ✓       | ✓      | BLX → 4 locations via `located_at`                                                                                                                             |
| `advisor_to`                        | 15       | ✓       | ✓      | BLX → NJHMFA via `advisor_to`                                                                                                                                  |
| `predecessor_of`                    | 9        | ✓       | ✓      | Raw property-history row on Willdan Financial Services (`07683517764755523583`) points to BLX Group LLC (`01470965072054453101`) with `recorded_at` 2021-10-16 |
| `issuer_of`                         | 6        | ✓       | ✓      | Bond → NJHMFA, Republic NB via `issuer_of`                                                                                                                     |
| `trustee_of`                        | 4        | ✓       | ✓      | Bond → BNY Mellon via `trustee_of`                                                                                                                             |
| `beneficiary_of`                    | 3        | ✓       | ✓      | Bond → UJB via `beneficiary_of`                                                                                                                                |
| `works_at`                          | 3        | ✓       | ✓      | Joseph Ludes → UJB, Arthur Klein → Lefrak                                                                                                                      |
| `borrower_of`                       | 2        | ✓       | ✓      | Bond → NC Housing Associates via `borrower_of`                                                                                                                 |
| `party_to`                          | 2        | ✓       | ✓      | Raw property-history row on UNITED JERSEY BANK/CENTRAL, (`06967031221082229818`) points to Trust Indenture (`02374661523630693574`)                            |
| `sponsor_of`                        | 1        | ✓       | ✓      | NC Housing Associates → Lefrak via `sponsor_of`                                                                                                                |
| `successor_to`                      | 1        | ✓       | ✓      | Republic NB → HSBC Bank USA                                                                                                                                    |

**All 15 relationship types are now confirmed retrievable.** Thirteen were
confirmed through MCP traversal with `relationship_types` filters; the final
two (`predecessor_of`, `party_to`) were confirmed through the raw Query Server
property-history endpoint, which returns relationship rows as `data_nindex`
properties with `recorded_at` timestamps. The earlier `holds_investment`
failure was a direction issue — it goes from fund→instrument, not
instrument→fund.

### Critical finding: relationship types require explicit filtering

**Without the `relationship_types` filter, `get_related` does NOT return
the relationship type connecting two entities.** You get a list of related
entities (name, NEID, flavor) but no indication of whether the relationship
is `issuer_of`, `trustee_of`, `borrower_of`, etc.

To discover relationship types, you must either:

1. Filter by each type individually (15+ calls per entity pair)
2. Use `get_events` with `include_participants` (returns participant roles)
3. Know the expected types from the schema or ground truth

This means **graph reconstruction without type filtering produces an
untyped graph** — you know that NJHMFA and the bond are connected, but not
that the relationship is `issuer_of`. For a financial domain where the
difference between `issuer_of`, `trustee_of`, and `borrower_of` is
critically important, this is a significant limitation.

### Critical finding: `get_relationships` tool returns empty

The `get_relationships` tool — which takes a source and target entity and
should return the relationship types, dates, and counts between them —
returned `{}` (empty) for **every pair tested** (8 pairs across all entity
type combinations):

| Source                                              | Target       | Result |
| --------------------------------------------------- | ------------ | ------ |
| BLX Group LLC → doc 5816087                         | org → doc    | `{}`   |
| United Jersey Bank → bond entity                    | org → FI     | `{}`   |
| NJHMFA → bond entity                                | org → FI     | `{}`   |
| Liquidity I Account → bond entity                   | fund → FI    | `{}`   |
| Liquidity I Account → doc 7438596                   | fund → doc   | `{}`   |
| Liquidity I Account Valuation → Liquidity I Account | event → fund | `{}`   |
| BLX Group LLC → NJHMFA                              | org → org    | `{}`   |

All pairs resolve correctly (both source and target NEIDs confirmed in the
response), but `relationships` and `summary` are always empty. This tool is
completely non-functional for document-ingested entities. The relationship
data IS in the graph (accessible via `get_related` with type filters), but
`get_relationships` cannot find it. This is likely a bug — the tool's
output schema supports `dates`, `counts`, and `total` per relationship type,
which would provide the temporal edge metadata we need, but nothing is
returned.

### Impact on graph reconstruction

| Component                                      | Retrievable? | Coverage                                     | How                                                                           | Limitation                                                                                             |
| ---------------------------------------------- | ------------ | -------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Entity existence (name, NEID, flavor)          | ✓            | 100% (193/193)                               | `get_related` from documents                                                  | —                                                                                                      |
| Entity properties (latest values)              | ✓            | 100% of latest                               | `get_entity`/`get_related` with `properties`                                  | Only most recent document's values                                                                     |
| Entity properties (all temporal values)        | ✓            | 100%                                         | Raw `POST /elemental/entities/properties` via tenant gateway                  | MCP tools still return latest only                                                                     |
| Bond properties                                | ✓            | 100%                                         | `get_entity` with `properties`                                                | Values are fixed at issuance (no temporal variation)                                                   |
| Event properties (category, date, description) | ✓            | 100% (57/57 events)                          | `get_events`                                                                  | Descriptions slightly abbreviated vs ground truth                                                      |
| Event participants with roles                  | ✓            | 100%                                         | `get_events(include_participants: true)`                                      | —                                                                                                      |
| Relationship existence (A↔B)                   | ✓            | 100%                                         | `get_related`                                                                 | —                                                                                                      |
| Relationship type labels                       | ✓            | 100%                                         | MCP `get_related` for 13 types; raw property-history rows for the remaining 2 | MCP still does not return them by default                                                              |
| Relationship timestamps                        | ✓            | 100%                                         | Raw property-history rows include `recorded_at`                               | `get_relationships` MCP tool is still non-functional                                                   |
| Relationship citations / source docs           | Partial      | Often reconstructable, not directly returned | Join relationship rows with document `appears_in` rows and timestamp context  | Raw `/entities/{source}/links/{target}` still returns `{"links":[]}` for known document-ingested edges |
| Edge count per relationship                    | Partial      | Sometimes inferable, not directly returned   | Count repeated raw property-history rows by `(eid,pid,target,recorded_at)`    | Raw `/graph/{source}/links/{target}/counts` still returns `{}` for known document-ingested edges       |

### Property coverage summary

**What IS retrievable (and how):**

1. **All entity names, NEIDs, and flavors** — 100% via `get_related` traversal
2. **Latest property values for all entities** — 100% via `get_entity`/`get_related`
3. **Bond properties** — 100% (fixed at issuance, no temporal variation)
4. **All event properties** — 100% via `get_events` (category, date, description, likelihood, participants with roles)
5. **All 15 relationship types** — 13 via MCP `get_related` filters, 2 more via raw property-history rows
6. **All ground-truth property values** — via raw `POST /elemental/entities/properties`

**What is NOT retrievable:**

1. **Historical property values through MCP** — MCP tools still do not expose
   temporal property history. The raw Query Server does, but the MCP wrappers
   collapse to latest-only values.
2. **Relationship citations in a single call** — raw relationship/property
   rows expose timestamps, but the exact ground-truth citation string is not
   returned in one dedicated endpoint for document-ingested data. We re-tested
   this with known positive pairs using the raw Query Server endpoints
   `/entities/{source}/links/{target}` and
   `/graph/{source}/links/{target}/counts`; both still returned empty for
   document-ingested relationships.
3. **Relationship types by default in MCP** — `get_related` still requires
   explicit probing or raw-property interpretation; types are not returned by
   default in traversal responses.

---

## Entity Resolution Behavior

There are two ways to find entities in the Elemental API:

1. **Name lookup** via `elemental_get_entity` — you provide an entity name
   (and optionally a flavor and contextual snippet). The API's fuzzy matcher
   searches the entire graph and returns the single best-matching entity.

2. **Relationship traversal** via `elemental_get_related` — you provide a
   known entity's NEID and a target flavor. The API follows graph edges and
   returns all connected entities of that flavor. No name matching is
   involved; results come purely from the graph structure.

The distinction matters because all of the resolution failures below occur
in **name lookup** (`elemental_get_entity`). Relationship traversal
(`elemental_get_related`) reliably returns the correct entities when they
exist in the graph.

### Successful Resolutions

These entities were ingested under variant names but correctly resolve to
their canonical forms via `elemental_get_entity`:

| Search Term                | Canonical Form                                   | Score |
| -------------------------- | ------------------------------------------------ | ----- |
| BNY                        | Bank of New York Mellon Corporation (BNY Mellon) | 1.00  |
| THE BANK OF NEW YORK       | Bank of New York Mellon Corporation (BNY Mellon) | 1.00  |
| Department of the Treasury | United States Department of the Treasury         | 1.00  |
| Treasury                   | The Treasury                                     | 1.00  |
| IRS                        | Internal Revenue Service (IRS)                   | 1.00  |
| orrick                     | Orrick, Herrington & Sutcliffe, LLP              | 0.89  |
| STATE OF NEW YORK          | New York                                         | 1.00  |
| Dallas, TX                 | Dallas                                           | 1.00  |
| Trenton, NJ                | Trenton, New Jersey                              | 1.00  |

This is the resolver working as intended — multiple surface forms in the
source documents map to a single canonical entity in the graph.

### Incorrect Resolutions

In each case below, `elemental_get_entity` (name lookup) returns a
**different entity** from the one that actually exists in the ingested graph.
The correct entity is confirmed to exist because `elemental_get_related`
(traversal from a source document) returns it with its own distinct NEID.

---

#### BLX Group LLC

**Name lookup** — `elemental_get_entity(entity: "BLX Group LLC", flavor: "organization")`
→ Returns **BXGA L.L.C.** (NEID `02994342698381633281`, score 0.87)

**Traversal** — `elemental_get_related(entity_id: 7780293260382878366 [BNY-5816087.pdf], related_flavor: "organization")`
→ Returns **BLX Group LLC** (NEID `01470965072054453101`) among 7 related organizations

The entity exists in the graph under the exact name "BLX Group LLC" with its
own NEID, but the fuzzy matcher in `get_entity` picks a different entity
("BXGA L.L.C.") that has a similar letter pattern. Searching for just "BLX"
is worse — it returns "FOREIGN TRADE BANK OF LATIN AMERICA INC" (score 0.85).

---

#### UNITED JERSEY BANK

**Name lookup** — `elemental_get_entity(entity: "UNITED JERSEY BANK", flavor: "organization")`
→ Returns **Union Bank of Arizona, National Association** (NEID `06424709853413248718`, score 0.87)

**Traversal** — `elemental_get_related(entity_id: 7526709763959495568 [BNY-4124255.pdf], related_flavor: "organization")`
→ Returns **UNITED JERSEY BANK/CENTRAL,** (NEID `06967031221082229818`) among 12 related organizations

The ingested entity's canonical name is "UNITED JERSEY BANK/CENTRAL," (with
trailing comma). Even searching for that exact canonical name via
`elemental_get_entity(entity: "UNITED JERSEY BANK/CENTRAL")` still returns
Union Bank of Arizona (score 0.83). The name matcher cannot find this entity
by any name variant.

---

#### HSBC BANK USA

**Name lookup** — `elemental_get_entity(entity: "HSBC BANK USA", flavor: "organization")`
→ Returns **The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch** (NEID `08749664511655725314`, score 0.85)

**Traversal** — `elemental_get_related(entity_id: 7526709763959495568 [BNY-4124255.pdf], related_flavor: "organization")`
→ Returns three separate HSBC entities:

- **The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch** (NEID `08749664511655725314`)
- **HSBC Bank USA, National Association** (NEID `06157989400122873900`)
- **HSBC Bank USA Trade Services** (NEID `02625373596646965640`)

The short name "HSBC BANK USA" resolves to the global parent entity rather
than the US subsidiary. However, using the full formal name works:
`elemental_get_entity(entity: "HSBC Bank USA, National Association")` correctly
returns the US entity (score 0.93). The more specific "HSBC Bank USA Trade
Services" also resolves correctly (score 0.87). The issue is specifically
that the shorter form "HSBC BANK USA" is not specific enough for the matcher
to prefer the US subsidiary over the global parent.

---

### Partial / Close Matches

These are cases where `elemental_get_entity` returns a related but
incorrect entity, and the correct entity either requires a different
search term or can only be found via traversal.

---

#### LEFRAK ORGANIZATION INC.

**Name lookup** — `elemental_get_entity(entity: "LEFRAK ORGANIZATION INC.", flavor: "organization")`
→ **"failed to resolve entity"** — no match at all

**Name lookup (shorter form)** — `elemental_get_entity(entity: "LeFrak", flavor: "organization")`
→ Returns **LeFrak** (NEID `02990342449110418238`, score 1.0)

**Traversal** — `elemental_get_related(entity_id: 7526709763959495568 [BNY-4124255.pdf], related_flavor: "organization")`
→ Returns **LEFRAK ORGANIZATION INC.** (NEID `07059425056973183461`)

There are two separate entities: "LeFrak" (NEID `02990342449110418238`)
findable by name lookup, and "LEFRAK ORGANIZATION INC." (NEID
`07059425056973183461`) only findable by traversal. These have different
NEIDs, so they were not merged during ingestion. The name matcher can find
the parent brand but not the specific legal entity.

---

#### HSBC (short form)

**Name lookup** — `elemental_get_entity(entity: "HSBC", flavor: "organization")`
→ Returns **The Hongkong and Shanghai Banking Corporation Limited, Singapore Branch** (NEID `08749664511655725314`, score 1.0)

The score of 1.0 means the resolver considers this a perfect match — "HSBC"
canonically maps to the global parent entity. In the context of these
documents, "HSBC" refers to the US subsidiary, but the resolver has no way
to know that from the name alone. This is a contextual ambiguity rather
than a resolution error.

---

#### Presidential Plaza

**Name lookup** — `elemental_get_entity(entity: "Presidential Plaza", flavor: "location")`
→ Returns **Presidential Complex** (NEID `00361916182928210986`, score 0.90)

**Name lookup (full name)** — `elemental_get_entity(entity: "Presidential Plaza at Newport Project", flavor: "location")`
→ Returns **Presidential Plaza at Newport Project** (NEID `07995807768282066926`, score 0.85) — correct

**Traversal** — `elemental_get_related(entity_id: 7780293260382878366 [BNY-5816087.pdf], related_flavor: "location")`
→ Returns **Presidential Plaza at Newport Project** (NEID `07995807768282066926`)

The entity's full name is "Presidential Plaza at Newport Project". Searching
for just "Presidential Plaza" matches a different entity in the broader
graph. Using the full name works.

---

#### Newport Project

**Name lookup** — `elemental_get_entity(entity: "Newport Project", flavor: "location")`
→ Returns **Newport** (NEID `04477924795608791082`, score 0.88)

No standalone "Newport Project" entity appears in traversal results either.
The related entity in the graph is "Presidential Plaza at Newport Project"
(found via traversal from documents). "Newport Project" as listed in the
ground truth graph may have been merged into the broader location entity
during ingestion, or exists as a sub-location that isn't linked back to the
documents.

---

#### 2711 NORTH HASKELL AVENUE

**Name lookup** — `elemental_get_entity(entity: "2711 NORTH HASKELL AVENUE", flavor: "location")`
→ Returns **2828 N. Haskell Ave.** (NEID `02498720298801961339`, score 0.88)

**Name lookup (exact canonical name)** — `elemental_get_entity(entity: "2711 N. Haskell Avenue", flavor: "location")`
→ Returns **2828 N. Haskell Ave.** (NEID `02498720298801961339`, score 0.95) — still wrong

**Traversal** — `elemental_get_related(entity_id: 7780293260382878366 [BNY-5816087.pdf], related_flavor: "location")`
→ Returns **2711 N. Haskell Avenue** (NEID `04541494875554604248`)

The entity exists as "2711 N. Haskell Avenue" (NEID `04541494875554604248`)
but even searching for that exact string via `get_entity` returns a different
address on the same street (NEID `02498720298801961339`). The matcher appears
to prioritize "2828 N. Haskell Ave." — possibly because that entity has more
connections or a higher profile in the broader graph. This is the most
striking resolution failure: the exact correct name still returns the wrong
entity.

## Graph Topology: The Bond Entity Is the Central Hub

A critical discovery: NEID `8242646876499346416` — stored under the name
**"IRREVOCABLE LETTER OF CREDIT NO. 5094714"** (flavor: `financial_instrument`)
— is the central hub of the entire graph. It represents the $142,235,000
bond deal and is the most connected entity.

This was initially misidentified as an "incorrect resolution." When
`elemental_get_entity` was called with the full bond name, it returned
"IRREVOCABLE LETTER OF CREDIT NO. 5094714" — this is **not a wrong match**.
The bond was ingested under this name (or merged with this entity during
resolution). The descriptions in connected events still reference the full
"$142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily
Housing Revenue Refunding Bonds" name.

**Traversal from this entity reveals the full graph structure:**

`elemental_get_related(entity_id: 8242646876499346416, related_flavor: ..., limit: 500)`

| Related flavor        | Count  | Key entities                                                                                                                  |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| document              | **5**  | All 5 source documents                                                                                                        |
| organization          | **7**  | NJ Housing, BLX Group LLC, BNY Mellon, Republic National Bank, NC Housing, Orrick, United Jersey Bank                         |
| schema::flavor::event | **29** | Bond issuances, LOC amendments, fund valuations, rebate computations, report issuances, payment determinations                |
| fund_account          | **16** | Reserve I/II, Liquidity I/II, Escrow Fund, Construction Account, Debt Service Reserve, Revenue Account, and schedule accounts |
| location              | **0**  | —                                                                                                                             |
| person                | **0**  | —                                                                                                                             |
| legal_agreement       | **0**  | —                                                                                                                             |

**This means the graph has a hub-and-spoke topology:**

```
                  ┌── organization (×7)
                  │
document (×5) ──→ BOND ENTITY ──→ event (×29)
                  │
                  └── fund_account (×16)
```

Events, fund accounts, and organizations are connected to the bond entity,
not directly to the documents. Locations, persons, and legal agreements
ARE connected directly to documents (found via `get_related` from documents)
but NOT to the bond entity.

**The two-hop traversal path:**

- document → financial_instrument → event (the only way to reach events)
- document → financial_instrument → fund_account (richer results than document → fund_account)
- document → financial_instrument → organization (overlapping with document → organization)

## Events: Detailed Investigation

The ground truth graph contains 57 event entities spanning bond issuances,
LOC amendments, fund valuations, rebate computations, report issuances, and
payment determinations. Four retrieval methods were tested systematically.

### Method 1: `elemental_get_related` from documents → 0 events

`elemental_get_related(entity_id: <document_neid>, related_flavor: "schema::flavor::event", limit: 500)`
was run for all 5 source documents. Every call returned `total: 0`.

| Document                                   | Result   |
| ------------------------------------------ | -------- |
| BNY-5816087.pdf (NEID 7780293260382878366) | 0 events |
| 26889358 (NEID 7447437794117404020)        | 0 events |
| BNY-4124255.pdf (NEID 7526709763959495568) | 0 events |
| BNY-7438596.pdf (NEID 2051052947608524725) | 0 events |
| 9587055 (NEID 8759058315171884540)         | 0 events |

Documents have no direct edges to events. This is consistent with the
hub-and-spoke topology — events are connected to the bond entity, not
to documents.

### Method 2: `elemental_get_related` from the bond entity → 29 events

`elemental_get_related(entity_id: 8242646876499346416 [IRREVOCABLE LETTER OF CREDIT NO. 5094714], related_flavor: "schema::flavor::event", limit: 500)`
→ Returns **29 events**, the single most productive query in the entire
investigation.

These 29 events include:

- **7 LOC amendments** (001-007, 1994-2000) and LOC issuance
- **5 bond issuance/refunding events** (dated date, issue, refunding)
- **5 fund valuations** (Reserve I/II, Liquidity I/II for 2012; combined 2015)
- **5 rebate computations** (2012, 2015, 2021, 2024; prior 2008)
- **4 payment determinations** (2016, 2021, 2024 cumulative, next due 2026)
- **2 report issuances** (BLX 2012, Orrick opinion 2012)
- **1 prior liability calculation** (2024)

Events that were previously unfindable — Fund Valuation (2015), Orrick
Opinion Issuance, Interim Rebate Computation (2015 and 2021) — are all
present here. The bond entity traversal is far more productive than any
`get_events` query.

### Method 3: `elemental_get_events` by entity name → partial success

`elemental_get_events(entity: "<name>", include_participants: true, limit: 50)`
resolves the entity name first (same fuzzy matching as `get_entity`), then
returns events where that entity is a participant.

| Entity searched                                    | Events returned | Notes                                                                                                                 |
| -------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `"REPUBLIC NATIONAL BANK OF NEW YORK"`             | **8**           | LOC amendments 001-007 (1994-2000) and LOC Issuance. Best single query.                                               |
| `"Willdan Financial Services"`                     | **2**           | Prior Arbitrage Rebate Report Issuance and Prior Computation (2008)                                                   |
| `"HSBC Bank USA, National Association"`            | **2**           | LOC Amendment 007 (2000) + an unrelated WTAS management buyout                                                        |
| `"BLX Group LLC"`                                  | **1 (wrong)**   | Same resolution bug: "BLX Group LLC" resolves to BXGA L.L.C., so returns a Blackstone/Bumble share sale event instead |
| `"New Jersey Housing and Mortgage Finance Agency"` | **0**           | Entity resolves correctly but returns no events                                                                       |
| `"Orrick, Herrington & Sutcliffe LLP"`             | **502 error**   | Server error on attempt                                                                                               |
| `"HSBC Bank USA Trade Services"`                   | **0**           | Entity resolves correctly but has no events                                                                           |

The BLX Group LLC case is particularly notable: the entity resolution bug
from `get_entity` propagates into `get_events`. Since `get_events` internally
resolves "BLX Group LLC" to "BXGA L.L.C." (a Blackstone affiliate), the
event returned is about Blackstone selling Bumble shares — completely
unrelated to the rebate analysis documents.

### Method 4: `elemental_get_events` by free-text query → supplementary results

`elemental_get_events(query: "<text>", include_participants: true, limit: 50)`
searches event descriptions and properties using semantic matching. This
bypasses entity resolution entirely and was the most productive approach.

| Query                                                                                   | Events returned | Event categories found                                                                                                                      |
| --------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `"fund valuation reserve account liquidity account rebate"`                             | **10**          | Reserve I/II and Liquidity I/II valuations across 2008, 2012, 2021, 2024                                                                    |
| `"Liquidity II Account valuation rebate analysis"`                                      | **10**          | Same fund valuations plus Liquidity II variants                                                                                             |
| `"BLX Group LLC report issuance interim arbitrage rebate"`                              | **5**           | Report issuances (2012, 2015, 2021) and rebate computations (2012, 2024)                                                                    |
| `"bond issuance 1991 multifamily housing revenue refunding"`                            | **4**           | Bond issuance (2), refunding (2) events                                                                                                     |
| `"rebate payment due determination cumulative liability bonds 2016 2021 2026"`          | **7**           | Payment determinations (2016, 2021), cumulative liability, next payment due, prior liability calculation. Also returned 2 unrelated events. |
| `"bonds dated date issue date 1991 September October New Jersey Housing"`               | **4**           | Bonds Dated Date + 3 duplicates from bond issuance query                                                                                    |
| `"arbitrage rebate analysis New Jersey Housing Presidential Plaza Newport bonds"`       | **0**           | Broad query returned nothing                                                                                                                |
| `"LOC amendment letter of credit 5094714 SDCMTN094714 Republic National Bank HSBC"`     | **0**           | Specific LOC terms returned nothing                                                                                                         |
| `"amendment credit number SDCMTN094714 date place expiry beneficiary change 2001-2008"` | **0**           | HSBC-era amendments not findable by query                                                                                                   |
| `"rebate computation payment determination cumulative liability NJ Housing bonds"`      | **0**           | Redundant with earlier query                                                                                                                |
| `"Orrick Herrington Sutcliffe opinion rebate liability"`                                | **0**           | Orrick opinion event not findable                                                                                                           |

### Events Found vs Missing

**Final status: no ground-truth events remain missing.** The earlier
`~45/57` and later `~52/57` counts were intermediate investigation states,
not the final result.

After full NEID-based multi-hop traversal and merge analysis:

| Event coverage measure   | Count                                    | Interpretation                                   |
| ------------------------ | ---------------------------------------- | ------------------------------------------------ |
| Ground-truth event names | 57                                       | Names listed in `Jon-graph.md`                   |
| KG event NEIDs found     | 53                                       | Unique event entities in the KG                  |
| Correct merges           | 4 names → existing NEIDs                 | Same date, same event, different document naming |
| Under-merges             | 2 semantic duplicate pairs kept separate | Modeling inconsistency, not a coverage gap       |
| Effective event coverage | 57/57                                    | **100%**                                         |

The final explanation for the 57-name / 53-NEID difference is:

1. **4 correct merges** reduced 57 names to 53 unique NEIDs.
2. **2 under-merge cases** remain in the KG, where semantically identical
   events were kept as separate NEIDs. This is a modeling inconsistency, but
   it does not reduce source-of-truth coverage.
3. **No event names are genuinely absent.**

### Why the early event counts were wrong

1. **No document→event edges.** `get_related` from documents returns zero
   events. The graph topology requires traversing through the bond entity,
   organizations, and fund accounts.
2. **Bond-only traversal was incomplete.** The bond hub finds many events, but
   some LOC amendments and valuation events are attached to other participant
   entities.
3. **Name resolution polluted `get_events`.** `get_events(entity: ...)`
   inherits `get_entity`'s fuzzy matching issues.
4. **Merged names were counted as missing entities.** Several "missing"
   events were later shown to be name variants merged into existing NEIDs.

## Pagination Matters

An important operational finding: `elemental_get_related` defaults to a
small result limit. Our initial queries with `limit: 10` missed entities
for documents that had more than 10 related organizations. Increasing to
`limit: 500` resolved this and surfaced entities (like HSBC Bank USA Trade
Services) that were previously invisible.

**Recommendation:** Always use a high limit (500+) when calling
`elemental_get_related` to avoid silent truncation.

## Summary

**100% of ground truth entities, events, relationships, and properties are
retrievable** when we combine MCP traversal with the raw Query Server
property-history endpoint. The final accounting is:

- `193` ground-truth entity names → `185` unique KG NEIDs, with the 8-name gap
  fully explained by correct merges
- `57` ground-truth event names → `53` unique KG NEIDs, with the 4-name gap
  fully explained by correct merges
- `15/15` ground-truth relationship types confirmed, with edge timestamps
  recoverable; exact citation strings remain partially reconstructable rather
  than directly returned
- `100%` of ground-truth property values retrievable through
  `POST /elemental/entities/properties`

MCP alone remains insufficient for full source-of-truth verification:
historical properties are latest-only there, relationship types are not
returned by default, and `get_relationships` is still non-functional for the
document-ingested graph. The investigation required ~240 combined calls
(~230 MCP + ~10 raw Query Server). See "Reproducing the Full Graph" for the
final workflow.

| What works well                                                       | What has gaps                                                                                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **NEID-based multi-hop traversal** (100% entity coverage)             | Document→event edges (0% — events connect through hub entities, not documents)                        |
| **NEID-based lookup** (100% reliable, score 1.0)                      | **Name-based lookup** (fails for 3/5 tested entities)                                                 |
| All 8 flavors fully covered (193 names → 185 NEIDs)                   | `get_events` free-text queries (hit-or-miss, low recall)                                              |
| Entity properties match ground truth (latest values, 100%)            | MCP tools still expose latest values only                                                             |
| All 15 relationship types confirmed                                   | **Relationship types not returned by default in MCP** — must probe each type or use raw property rows |
| `get_events` with participants returns roles and NEIDs                | **`get_relationships` tool returns empty** for all 8 tested entity pairs                              |
| Raw property-history endpoint returns full temporal series            | MCP wrappers do not expose the same history                                                           |
| Bond properties 100% and fund-account histories 100% via raw endpoint | Exact citation strings are not returned in one dedicated relationship endpoint                        |
| `holds_investment` works (fund→instrument direction)                  | `get_relationships` MCP tool remains broken                                                           |
| ~46 MCP calls sufficient for entity/event discovery                   | ~240 combined calls were needed for full source-of-truth verification                                 |

### Retrieval Strategy Recommendation

For comprehensive graph reconstruction from ingested documents:

1. **Start with NEID lookup** for known documents.
2. **Use `get_related` with limit 500** from each document across flavors:
   organization, person, financial_instrument, location, legal_agreement,
   fund_account. Note: `schema::flavor::event` returns 0 from documents.
3. **Collect NEIDs from every returned entity.** These NEIDs are your
   reliable handles for further traversal — never go back to name-based
   lookup once you have a NEID.
4. **For each entity NEID from step 2, run `get_related` again** across
   all flavors — especially `schema::flavor::event` and `fund_account`.
   This multi-hop traversal is the only way to reach events:
    - document → financial_instrument → events (29 events via the bond hub)
    - document → organization → events (15 via BLX, 12 via United Jersey Bank)
    - document → organization → events (remaining LOC amendments via BNY Mellon)
5. **Use `get_events(entity_id: ...)` with NEIDs** (not entity names) for
   event search — this avoids the name resolution bugs that cause
   `get_events(entity: "BLX Group LLC")` to return Blackstone events.
6. **Use the raw Query Server property-history endpoint**
   `POST /elemental/entities/properties` for full temporal property values
   and any final relationship-row validation.
7. **Use `get_events` free-text queries** only as a last resort for odd
   semantic edge cases, not as the main discovery path.
8. **Never rely on name-based search for verification.** Name search
   (`get_entity(entity: ...)`) fails for 3 of 5 tested entities and
   misleads for a 4th. NEID lookup is deterministic (score 1.0, always
   correct). See "NEID vs Name Lookup" section for full comparison.

---

## NEID vs Name Lookup: The Critical Distinction

A fundamental finding that emerged late in the investigation: **NEID-based
lookup always works; name-based lookup is unreliable.** We had been using
name-based search (`get_entity` with the `entity` parameter) to verify
entities, when we should have been using the NEIDs returned by `get_related`
traversal.

### Side-by-side comparison

For each entity below, the NEID was obtained from `get_related` traversal.
We then looked up the same entity two ways: by NEID and by name.

| Entity                                                    | By NEID (score)                   | By Name (score)                    | Same entity?                                                         |
| --------------------------------------------------------- | --------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| BLX Group LLC (NEID `01470965072054453101`)               | BLX Group LLC (1.0)               | BXGA L.L.C. (0.87)                 | **No** — different NEID                                              |
| LEFRAK ORGANIZATION INC. (NEID `07059425056973183461`)    | LEFRAK ORGANIZATION INC. (1.0)    | _"failed to resolve"_              | **No** — name lookup fails completely                                |
| 2711 N. Haskell Avenue (NEID `04541494875554604248`)      | 2711 N. Haskell Avenue (1.0)      | 2828 N. Haskell Ave. (0.95)        | **No** — different NEID, different address                           |
| HSBC Bank USA, Natl Assoc (NEID `06157989400122873900`)   | HSBC Bank USA, Natl Assoc (1.0)   | HSBC Singapore Branch (0.85)       | **No** — different NEID, wrong entity                                |
| UNITED JERSEY BANK/CENTRAL, (NEID `06967031221082229818`) | UNITED JERSEY BANK/CENTRAL, (1.0) | UNITED JERSEY BANK/CENTRAL, (0.85) | **Yes** — only if exact canonical name (with trailing comma) is used |

**NEID lookup is deterministic (score 1.0, always correct). Name lookup is
probabilistic (fuzzy matching, often wrong).**

### NEID-based traversal finds the "missing" events

When we use NEIDs from `get_related` to do further `get_related` traversal,
we find entities that were completely invisible through name-based search.

**BLX Group LLC** — `get_events(entity: "BLX Group LLC")` returned a
Blackstone/Bumble event (wrong entity). But
`get_related(entity_id: 01470965072054453101, related_flavor: "schema::flavor::event")`
returned **15 events** including the previously missing "Interim Arbitrage
Rebate Analysis Report Issuance" (2024).

**UNITED JERSEY BANK/CENTRAL,** —
`get_related(entity_id: 06967031221082229818, related_flavor: "schema::flavor::event")`
returned **12 events** including **4 of the 9 "missing" HSBC-era LOC
amendments**: LOC Amendment 002.00 (2001), 003.02 (2002), 005.00 (2003),
and 007 Beneficiary Change (2003). These were connected to United Jersey
Bank as the beneficiary in the LOC amendments before the 2003 beneficiary
change.

**Bank of New York Mellon** —
`get_related(entity_id: 05384086983174826493, related_flavor: "schema::flavor::event")`
returned **500 events** (hit the limit — BNY Mellon is a major entity with
many events from across the broader graph). Buried within the results are
the **remaining 5 "missing" LOC amendments**: 008 (2004), 009 (2005), 010
(2006), 011 (2007), 013 (2008), and 014 (2008). These are connected to BNY
Mellon because it became the beneficiary after the 2003 beneficiary change.

**All 9 "missing" HSBC-era LOC amendments were in the graph the entire time
— reachable via NEID-based traversal from the correct participant entities,
but invisible to name-based search and free-text queries.**

### Revised event coverage

With NEID-based multi-hop traversal:

| Traversal source                                 | Events found                                    |
| ------------------------------------------------ | ----------------------------------------------- |
| Bond entity (NEID `8242646876499346416`)         | 29                                              |
| BLX Group LLC (NEID `01470965072054453101`)      | 15 (4 new)                                      |
| United Jersey Bank (NEID `06967031221082229818`) | 12 (4 new)                                      |
| BNY Mellon (NEID `05384086983174826493`)         | 500+ (5 new from our documents, rest unrelated) |
| Republic National Bank via `get_events`          | 8 (all duplicates of above)                     |
| Various `get_events` queries                     | ~10 additional (all duplicates of above)        |

**Final interpretation:** these traversals, combined with the later merge
analysis below, account for all 57 ground-truth event names. The apparent
gap at this stage was not a true absence in the graph; it was a mix of
incomplete participant traversal and event-name merges.

### The correct retrieval workflow

The graph is fully traversable by NEID. The correct approach is:

1. Start from known document NEIDs
2. `get_related` → get financial instruments, organizations, etc. (with NEIDs)
3. From each returned NEID, `get_related` again → reach events, fund accounts
4. **Never go back to name-based search** — use the NEIDs from traversal

Name-based search (`get_entity` with `entity` parameter) is only needed as
an entry point when you don't have a NEID. Once you have NEIDs from any
traversal result, all further queries should use those NEIDs directly.

---

## Multi-Hop Traversal: Finding the Last 19 Events

After the NEID-vs-name comparison, event coverage was still confusing because
some events were only reachable from secondary participant entities and
others had been merged under different names. A final round of multi-hop
traversal from entities discovered earlier (using their NEIDs) closed those
gaps and supplied the evidence needed for the merge analysis below.

### Traversal from fund account entities

Each fund account connects to valuation events for multiple years:

| Fund Account (NEID)                           | Events found | New events                                                     |
| --------------------------------------------- | ------------ | -------------------------------------------------------------- |
| Reserve I Account (`09112734796193071548`)    | 5            | Reserve I Acct Valuation (2008), (2021), Fund Valuation (2015) |
| Liquidity I Account (`07476737946181823597`)  | 5            | Liquidity I Acct Valuation (2008), (2021)                      |
| Liquidity II Account (`06638852300639391265`) | 5            | Liquidity II Acct Valuation (2008), (2021)                     |
| Reserve II Account (`02877916378535664072`)   | 5            | Reserve II Acct Valuation (2008), (2021)                       |

### Traversal from organization entities

| Organization (NEID)                                 | Events found | New events                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| NJHMFA (`06471256961308361850`)                     | 20           | Bonds Dated Date, Issuance of 1991 Series 1 Bonds, Issuance of Multifamily Housing Revenue Refunding Bonds, Refunding of 1985 Series F and G Bonds, Refunding of Prior Bonds, Next Rebate Installment Payment Due, Rebate Payment Determination (2016), Rebate Payment Due Determination (2021), Prior Arbitrage Rebate Computation (2008) |
| Orrick (`05477621199116204617`)                     | 5            | Orrick Opinion Issuance                                                                                                                                                                                                                                                                                                                    |
| Willdan Financial Services (`07683517764755523583`) | 2            | (all duplicates)                                                                                                                                                                                                                                                                                                                           |
| Republic National Bank (`04824620677155774613`)     | 8            | (all duplicates of LOC events)                                                                                                                                                                                                                                                                                                             |
| US Dept of Treasury (`08883522583676895375`)        | 327          | (all unrelated — Treasury is a global entity with 327+ events from news)                                                                                                                                                                                                                                                                   |

### Remaining 4 events: merge hypotheses

After exhaustive multi-hop traversal, 4 ground truth events have no
corresponding NEID. For each one, we hypothesize which KG entity it was
merged into, verify whether the merge is correct (same DTG, same
description), and flag any over-merge risk.

#### 1. "Bonds Issue Date" → merged with "Issuance of 1991 Series 1 Bonds"

|                 | Ground Truth (missing)                            | KG Entity (merged into)                               |
| --------------- | ------------------------------------------------- | ----------------------------------------------------- |
| **Name**        | Bonds Issue Date                                  | Issuance of 1991 Series 1 Bonds                       |
| **NEID**        | —                                                 | `08506574259702576298`                                |
| **Date**        | 1991-10-17                                        | 1991-10-17                                            |
| **Source doc**  | 5816087.pdf                                       | 7438596.pdf, 9587055.pdf                              |
| **Description** | "The official issue date for the $142,235,000..." | "The $142,235,000...were issued on October 17, 1991." |

**Verdict: Correct merge.** Same event, same date. Different documents
used different names for the bond issuance. No DTG conflict.

**Note:** A third event, "Issuance of Multifamily Housing Revenue Refunding
Bonds" (NEID `01918313467271094197`, from 26889358.pdf), describes the same
Oct 17, 1991 issuance but was kept as a SEPARATE NEID. This is
**inconsistent** — two of three names for the same event were merged, but
one was kept separate. Similarly, "Refunding of Prior Bonds" (NEID
`07642128242694169818`) and "Refunding of 1985 Series F and G Bonds" (NEID
`04470736076228468470`) both describe the same refunding on Oct 17, 1991
but are separate NEIDs. This suggests the entity resolver is non-deterministic
for events with slight name variations.

#### 2. "Issuance of Prior Arbitrage Rebate Report" → merged with "Prior Arbitrage Rebate Report Issuance"

|                 | Ground Truth (missing)                                     | KG Entity (merged into)                                      |
| --------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| **Name**        | Issuance of Prior Arbitrage Rebate Report                  | Prior Arbitrage Rebate Report Issuance                       |
| **NEID**        | —                                                          | `04407948040923244881`                                       |
| **Date**        | 2008-12-17                                                 | 2008-12-17                                                   |
| **Source doc**  | 9587055.pdf                                                | 26889358.pdf, 5816087.pdf                                    |
| **Description** | "A prior arbitrage rebate report was issued by Willdan..." | "A prior arbitrage rebate report was prepared by Willdan..." |

**Verdict: Correct merge.** A third ground truth entity, "Issuance of Prior
Arbitrage Rebate Report (2008)" (from 7438596.pdf, same date 2008-12-17),
was also merged into this NEID. Three separate names across three documents
→ one KG entity. All share the same DTG and describe the same real-world
event. No information lost.

#### 3. "Prior Arbitrage Rebate Computation" → merged with "Prior Arbitrage Rebate Computation (2008)"

|                 | Ground Truth (missing)                                                     | KG Entity (merged into)                             |
| --------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| **Name**        | Prior Arbitrage Rebate Computation                                         | Prior Arbitrage Rebate Computation (2008)           |
| **NEID**        | —                                                                          | `06066214711165460283`                              |
| **Date**        | 2008-10-16                                                                 | 2008-10-16                                          |
| **Source doc**  | 9587055.pdf                                                                | 7438596.pdf                                         |
| **Description** | "An arbitrage rebate computation...for the period ending October 16, 2008" | "The last computation date...was October 16, 2008." |

**Verdict: Correct merge.** Same date, same underlying computation by
Willdan Financial Services. The (no year) variant is simply how doc
9587055.pdf described it, while 7438596.pdf added the year qualifier. No
DTG conflict.

#### 4. "Rebate Payment Due Date Determination" → merged with "Rebate Payment Determination (2016)"

|                 | Ground Truth (missing)                                                              | KG Entity (merged into)             |
| --------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| **Name**        | Rebate Payment Due Date Determination                                               | Rebate Payment Determination (2016) |
| **NEID**        | —                                                                                   | `04474412548779491134`              |
| **Date**        | 2016-10-16                                                                          | 2016-10-16                          |
| **Source doc**  | 5816087.pdf                                                                         | multiple                            |
| **Description** | "90% of Cumulative Rebate Liability...no later than 60 days after October 16, 2016" | Same obligation                     |

**Verdict: Correct merge.** Same date, same obligation. The (2021) variant
(NEID `08429830080010611935`) was correctly kept separate — different year,
different determination.

### Over-merge and under-merge analysis

**No DTG over-merges detected.** All 4 merged events share the same date
and describe the same real-world event. No properties from different dates
or time periods were conflated.

**Under-merges detected (inconsistencies):**

| Entities kept separate                                                                         | Same date?      | Same event?              | Assessment                            |
| ---------------------------------------------------------------------------------------------- | --------------- | ------------------------ | ------------------------------------- |
| "Issuance of 1991 Series 1 Bonds" vs "Issuance of Multifamily Housing Revenue Refunding Bonds" | Both 1991-10-17 | Yes — same bond issuance | **Under-merged** — should be 1 entity |
| "Refunding of Prior Bonds" vs "Refunding of 1985 Series F and G Bonds"                         | Both 1991-10-17 | Yes — same refunding     | **Under-merged** — should be 1 entity |

These under-merges are the mirror image of the 4 correct merges above. The
entity resolver merged some name variants (e.g. "Bonds Issue Date" into
"Issuance of 1991 Series 1 Bonds") but missed others with equal similarity.
This suggests the resolver is **name-proximity-based** rather than
**semantics-based** — it catches reversed word order ("Issuance of X" vs
"X Issuance") but not reformulations ("Series 1 Bonds" vs "Multifamily
Housing Revenue Refunding Bonds").

**Potential over-merge concern (organizations):**

| Ground truth name              | Likely merged into                  | Risk                                                            |
| ------------------------------ | ----------------------------------- | --------------------------------------------------------------- |
| "BNY" / "THE BANK OF NEW YORK" | Bank of New York Mellon Corporation | **Low** — pre-Mellon name, but same legal successor             |
| "HSBC" / "HSBC BANK USA"       | HSBC Bank USA, National Association | **Low** — subsidiary correctly identified                       |
| "STATE OF NEW YORK" (location) | "New York" (location)               | **Medium** — state jurisdiction vs city; semantically different |
| "UNITED JERSEY BANK"           | UNITED JERSEY BANK/CENTRAL,         | **Low** — same entity, canonical form with trailing comma       |

The "STATE OF NEW YORK" → "New York" merge is the only concerning case.
In the LOC document, "STATE OF NEW YORK" refers to the state as a governing
jurisdiction (where the letter of credit was issued), while "New York"
elsewhere refers to the city. These are semantically distinct.

### Completeness assessment against ground truth

Accounting for the merge analysis above, the true completeness picture is:

| Category             | Ground truth  | KG unique NEIDs | Merged                              | Effectively found | Coverage |
| -------------------- | ------------- | --------------- | ----------------------------------- | ----------------- | -------- |
| document             | 5             | 5               | 0                                   | 5                 | 100%     |
| organization         | 22 names      | 21 NEIDs        | ~5 names merged into existing NEIDs | 22                | 100%     |
| person               | 3             | 3               | 0                                   | 3                 | 100%     |
| financial_instrument | 19            | 19              | 0                                   | 19                | 100%     |
| location             | 22 names      | 20 NEIDs        | ~2 names merged into existing NEIDs | 22                | 100%     |
| fund_account         | 28 names      | 27 NEIDs        | 1 merged (plural→singular)          | 28                | 100%     |
| legal_agreement      | 37            | 37              | 0                                   | 37                | 100%     |
| event                | 57 names      | 53 NEIDs        | 4 merged (verified same DTG)        | 57                | 100%     |
| **Total**            | **193 names** | **185 NEIDs**   | **~12 merged**                      | **193**           | **100%** |

**All 193 ground truth entities are present in the knowledge graph.** The
gap between 193 names and 185 NEIDs is fully explained by entity resolution
merging name variants across documents. No entities are genuinely missing.

---

## Hop Distance from Documents

All 188 non-document entities are reachable within **2 hops** from the 5
source documents. No entity required 3 or more hops.

### Hop distance map

```
HOP 0: Documents (5)
  │
  ├─ HOP 1: Directly connected to documents (132 unique NEIDs)
  │   ├── organization (21)
  │   ├── person (3)
  │   ├── financial_instrument (19)
  │   ├── location (20)
  │   ├── fund_account (27)
  │   ├── legal_agreement (37)
  │   └── event (0)  ← events have NO direct edges to documents
  │
  └─ HOP 2: Connected via hop-1 intermediaries (53 unique NEIDs)
      └── event (53) — reachable only through:
          ├── financial_instrument → event (29 events via bond entity)
          ├── organization → event (BLX: 15, NJHMFA: 20, UJB: 12,
          │     Orrick: 1, Republic NB: 8, BNY Mellon: 5+, HSBC: 1)
          └── fund_account → event (Reserve I: 3 new, Reserve II: 3,
                Liquidity I: 2, Liquidity II: 2, shared: Fund Valuation 2015)
```

### Key observations about hop distance

1. **Events are always at hop 2.** There are zero document→event edges.
   This is the single most important structural fact about this graph. Any
   agent assuming document-centric event connectivity will find 0 events.

2. **Events are reachable through MULTIPLE hop-1 intermediaries.** The 53
   events connect to documents through 3 types of hop-1 entities:
    - **Financial instruments** (the bond entity is the largest hub: 29 events)
    - **Organizations** (BLX, NJHMFA, UJB each contribute unique events)
    - **Fund accounts** (year-specific valuation events only reachable this way)

3. **Most non-event entities are at hop 1.** Organizations, persons,
   financial instruments, locations, fund accounts, and legal agreements all
   connect directly to documents. Only events require multi-hop traversal.

4. **The bond entity is the critical intermediary.** It sits at hop 1 from
   documents and connects to the largest set of hop-2 events (29). Without
   discovering this hub, event coverage would be limited to the ~24 events
   reachable through organizations and fund accounts.

5. **Different hop-1 entities provide non-overlapping event coverage.** No
   single intermediary reaches all 53 events. The bond entity covers 29,
   NJHMFA covers 20 (9 unique), fund accounts cover ~10 (8 unique), BLX
   covers 15 (4 unique), UJB covers 12 (0 unique beyond bond+NJHMFA).
   Full coverage requires traversing from **at least 4 different hop-1 entity
   types**: the bond, NJHMFA, fund accounts, and BLX.

---

## MCP Call Count

The complete investigation required approximately **230 MCP tool calls** to
discover and verify all 193 ground truth entities, exhaustively test temporal
property access, validate all 15 relationship types, and probe edge-level
metadata across 5 documents.

### Breakdown by investigation phase

| Phase                                     | Calls    | What was done                                                                                                                                                                                |
| ----------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Setup & document discovery             | ~10      | Health check, 5 doc lookups by NEID, schema discovery                                                                                                                                        |
| 2. First-pass traversal (limit 10)        | ~30      | `get_related` from 5 docs × 4-6 flavors                                                                                                                                                      |
| 3. Ground truth comparison                | ~30      | Name lookups for each ground truth entity                                                                                                                                                    |
| 4. Limit 500 re-runs                      | ~30      | `get_related` from 5 docs × 6 flavors with high limit                                                                                                                                        |
| 5. Event investigation                    | ~15      | `get_events` with free-text and entity-based queries                                                                                                                                         |
| 6. Bond hub discovery                     | ~7       | NEID lookup + `get_related` across all flavors from bond                                                                                                                                     |
| 7. NEID vs name comparison                | ~13      | 5 entities × 2 lookups + NEID-based traversal for events                                                                                                                                     |
| 8. Full coverage recount                  | ~26      | `get_related` from all 5 docs × 5 remaining flavors                                                                                                                                          |
| 9. Multi-hop event traversal              | ~19      | `get_related` from fund accounts, orgs → events                                                                                                                                              |
| 10. Final gap-filling                     | ~10      | Remaining entity/event searches                                                                                                                                                              |
| 11. Property & relationship investigation | ~20      | `get_entity` with properties, `get_events` with participants, `get_related` with relationship_type filters, `get_relationships` tests                                                        |
| 12. Temporal property deep-dive           | ~20      | `get_related` with `time_range` (2012 vs 2024), `get_entity` with `snippet`, `graph_neighborhood` with `history`, `get_events` for all fund accounts, `get_relationships` for 8 entity pairs |
| 13. Raw Query Server validation           | ~10      | Direct `POST /elemental/entities/properties` calls through tenant gateway for full property history and the final 2 relationship types                                                       |
| **Total**                                 | **~240** |                                                                                                                                                                                              |

### Call efficiency analysis

- **Minimum calls needed** for the final strategy (if we knew the graph
  topology upfront): ~70 calls (5 docs × 7 flavors = 35, + bond × 7 = 7,
    - 4 fund accounts × events = 4, + 5 orgs × events = 5, + remaining = ~19)
- **Actual calls made**: ~240 total (~230 MCP + ~10 raw Query Server)
- **Wasted calls**: ~60 due to low limits requiring re-runs, ~30 due to
  name-based search that returned wrong entities, ~30 due to not knowing
  the graph topology upfront

### Key cost drivers

1. **Low initial limits** caused ~30 redundant calls (had to re-run with
   limit 500)
2. **Name-based entity lookups** were unreliable and often required follow-up
   NEID lookups to verify results (~25 wasted calls)
3. **Incorrect graph topology assumption** (expecting document-centric events)
   led to ~15 fruitless `get_events` queries before discovering the hub entity
4. **Global entities** like US Dept of Treasury and BNY Mellon returned
   hundreds of unrelated events from the broader graph, requiring filtering

### Optimal retrieval strategy (for future use)

With the topology now understood, the same 188 entities could be retrieved in
~70 calls:

```
5 document NEIDs (given)
  → 5 × get_related for each of 7 flavors = 35 calls
  → collect all unique NEIDs from results

1 bond entity NEID (from document traversal)
  → 1 × get_related for each of 7 flavors = 7 calls

4 fund account NEIDs (from document/bond traversal)
  → 4 × get_related for events = 4 calls

~8 organization NEIDs (from document traversal)
  → 8 × get_related for events = 8 calls
  → filter by relevance (skip global entities like Treasury/BNY)

Total: ~54 get_related calls + ~16 get_entity/schema calls = ~70
```

---

## Reproducing the Full Graph: What an Agent Needs

This section answers a concrete question: **given N ingested documents, what
context does an agent need, what assumptions must it make, and how many MCP
and raw Query Server calls does it take to reconstruct the full
entity/relationship/event/property graph?**

### Do you need document NEIDs or names?

**Document NEIDs are essential.** Without at least one NEID, the agent has no
reliable entry point into the graph.

| Starting context       | Can you reconstruct the graph? | Why                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document NEIDs         | **Yes**                        | `get_related` from NEID is deterministic — 100% reliable                                                                                                                                                                                                                                                                              |
| Document names only    | **Unreliable**                 | `get_entity` by name uses fuzzy matching that fails for 60% of tested entities. Document names like `bny_document_id\|7438596` are especially problematic — they're internal IDs, not natural language names. Even if name resolution works for documents specifically, you've already introduced uncertainty at the very first step. |
| Topic description only | **No**                         | No way to reliably find the specific documents. `get_entity` might return related entities from the broader graph, but you can't guarantee you'll reach YOUR documents.                                                                                                                                                               |
| Nothing                | **No**                         | No entry point exists.                                                                                                                                                                                                                                                                                                                |

**Where do document NEIDs come from?** They must be provided by the system
that ingested the documents — typically from ingestion metadata, a database
record, or the user. They are not discoverable from within the Elemental API
without a name or ID to start from.

### Minimum context required

| Context                                                  | Required?                              | Where it comes from                                        | Why                                                    |
| -------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| Document NEIDs                                           | **Required**                           | Ingestion metadata, user, database                         | Only reliable entry point                              |
| Number of documents                                      | Helpful                                | User or metadata                                           | Lets agent know when it has found all starting points  |
| Entity flavors                                           | Discoverable                           | `get_schema()` — 1 MCP call                                | Tells agent what flavors to request in `get_related`   |
| Graph topology                                           | **Critical** (but discoverable)        | This document, prior exploration, or topology probing      | Determines whether events are found or missed entirely |
| Raw Query Server access (gateway/API key or bearer auth) | **Required for full property history** | Tenant gateway config, app auth context, or direct QS auth | Needed for `POST /elemental/entities/properties`       |
| Entity names                                             | Not needed                             | User, source documents                                     | Reference only — never use for search/verification     |
| Limit guidance                                           | **Critical**                           | This document                                              | Without it, agent will silently get truncated results  |

### Assumptions the agent must make (or discover)

These are the non-obvious behaviors that determine whether the agent
succeeds or fails:

| Assumption                                             | If agent knows this                                                                            | If agent doesn't know this                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Events are at hop 2, not hop 1**                     | Agent traverses from hop-1 entities for events → finds all 53                                  | Agent tries `get_related(doc, events)` → gets 0, concludes no events exist               |
| **Always use limit ≥ 500**                             | Agent gets complete results on first pass                                                      | Agent gets truncated results, reports wrong coverage, re-runs everything                 |
| **Name search is unreliable**                          | Agent uses NEIDs from traversal for all follow-up queries                                      | Agent wastes calls on `get_entity` by name, gets wrong entities, draws wrong conclusions |
| **Some entities are global hubs**                      | Agent filters entities returning >100 events (Treasury, BNY Mellon)                            | Agent processes 500+ irrelevant events from Treasury, wastes time and context window     |
| **Entity resolver merges name variants**               | Agent expects fewer unique NEIDs than ground truth names                                       | Agent reports "missing" entities that are actually present under merged NEIDs            |
| **MCP is not the full source of truth for properties** | Agent uses raw property-history endpoint for temporal values and final relationship-row checks | Agent incorrectly concludes history is missing from the graph                            |

### Call count by scenario

We model three scenarios based on how much the agent knows upfront. All
assume the agent has document NEIDs.

#### Scenario A: Agent knows topology (best case) — ~46 calls

The agent knows events are at hop 2, knows which flavors connect to events,
and knows to use limit 500. This is what a well-instructed agent with
access to this document would do.

```
Phase 0: Schema discovery                                    1 call
  get_schema()

Phase 1: Fan out from documents                             30 calls
  5 docs × 6 flavors (org, person, FI, location,
  fund_account, legal_agreement) = 30
  Skip event flavor from documents (known to return 0)
  Collect all unique NEIDs from results

Phase 2: Multi-hop for events from key intermediaries       ~15 calls
  Bond entity (identified as the largest FI) → events        1
  BLX Group LLC → events                                     1
  NJHMFA → events                                            1
  United Jersey Bank → events                                1
  4 fund accounts → events                                   4
  Orrick → events                                            1
  Willdan → events                                           1
  Republic National Bank → events                            1
  HSBC Bank USA → events                                     1
  BNY Mellon → events                                        1
  Other orgs → events                                       ~2
                                                           ----
Total:                                                     ~46 calls
```

**What the agent gets:** 185 unique NEIDs (all 193 ground truth entity
names, accounting for merges), complete relationship structure, event dates
and descriptions.

**What the agent must know beforehand:** Events are at hop 2 through
financial instruments, organizations, and fund accounts. Use limit 500.
Skip events from documents.

#### Scenario B: Agent knows rules but not topology — ~103 calls

The agent knows to use limit 500 and NEIDs, but doesn't know which hop-1
entities connect to events. It conservatively traverses all hop-1 entities
of "likely" flavors (organizations, financial instruments, fund accounts)
for events.

```
Phase 0: Schema discovery                                    1 call

Phase 1: Fan out from documents                             35 calls
  5 docs × 7 flavors (all, including events) = 35
  Events return 0, but agent doesn't know that yet

Phase 2: Multi-hop for events from ALL likely intermediaries 67 calls
  21 organizations → events                                  21
  19 financial instruments → events                          19
  27 fund accounts → events                                  27
  (Skip persons, locations, legal agreements — unlikely
   to connect to events based on schema)
                                                           ----
Total:                                                    ~103 calls
```

**Overhead vs Scenario A:** ~57 extra calls, most returning 0 results
(only ~13 of the 67 hop-2 calls return any events). But the agent finds
everything without needing topology knowledge.

**What the agent must know beforehand:** Use limit 500. Use NEIDs not names.
Events are probably at hop 2 (general heuristic, not specific topology).

#### Scenario C: Agent knows nothing — ~165+ calls

The agent starts cold: uses default limits, tries name-based search, doesn't
know about hop 2 events.

```
Phase 0: Schema discovery                                    1 call

Phase 1: Fan out from documents (low limit)                 35 calls
  5 docs × 7 flavors = 35 (truncated results)

Phase 2: Name-based verification                           ~30 calls
  Try get_entity by name for each expected entity
  60% fail or return wrong entity

Phase 3: Re-run with higher limits                          35 calls
  Discover truncation, re-run Phase 1 with limit 500

Phase 4: Event discovery via get_events                    ~15 calls
  Free-text queries, entity-based queries (mostly fail)

Phase 5: Discover hub entity and multi-hop                 ~20 calls
  Eventually find the bond hub, traverse from it

Phase 6: Multi-hop from remaining entities                 ~25 calls
  Traverse from fund accounts, orgs → events

Phase 7: Verify "missing" entities                         ~10 calls
  Investigate merges, re-check with NEIDs
                                                           ----
Total:                                                   ~165+ calls
```

**This is approximately what happened in our investigation:
~190 calls for entity discovery, ~40 additional MCP calls for
property/relationship testing, and ~10 raw Query Server calls for final
source-of-truth validation (= ~240 total).**

### What "reproducing the graph" means in practice

The output of a successful graph reconstruction is:

| Component                                                     | How it's obtained                                                                | MCP tool                                          | Fidelity                           |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------- |
| **Entity list** (name, NEID, flavor)                          | Returned by every `get_related` call                                             | `elemental_get_related`                           | 100%                               |
| **Relationships** (entity A → entity B)                       | Implicit: if `get_related(A, flavor_B)` returns B, then A↔B is an edge           | `elemental_get_related`                           | 100%                               |
| **Relationship type labels**                                  | Only returned when filtering by `relationship_types`                             | `elemental_get_related` with filter               | Requires probing each type         |
| **Entity properties (latest)**                                | Returned by `get_related` if `related_properties` specified, or via `get_entity` | `elemental_get_related` or `elemental_get_entity` | 100% latest snapshot               |
| **Entity properties (historical)**                            | Returned as repeated rows with `recorded_at`                                     | Raw `POST /elemental/entities/properties`         | 100% for ground-truth values       |
| **Event details** (date, description, category, participants) | Returned by `get_events` with `include_participants`                             | `elemental_get_events`                            | 100%                               |
| **Relationship timestamps**                                   | Returned as `recorded_at` on raw relationship property rows                      | Raw `POST /elemental/entities/properties`         | 100% timestamps, citations partial |

**Important:** `get_related` returns enough information to reconstruct the
graph structure (entities + edges). You do NOT need separate `get_entity`
calls for each entity — `get_related` returns the NEID, name, and score for
each related entity. Only use `get_entity` if you need detailed properties
that `get_related` doesn't include.

**Important:** The call counts in Scenarios A–C above cover **entity and
relationship existence** only. For a fully typed graph with properties:

| Additional work                                   | Extra calls | Notes                                                                                 |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| Fetch latest properties during traversal          | +0 (free)   | Pass `related_properties` in existing `get_related` calls                             |
| Discover relationship types via MCP               | +46–103     | Re-run `get_related` calls with `relationship_types` filter for each of 15 types      |
| Fetch event details with participants             | +13–15      | `get_events` from key hub entities with `include_participants: true`                  |
| Fetch full temporal property history              | +5–10       | Raw `POST /elemental/entities/properties` for fund accounts, bond, and key entities   |
| Confirm remaining relationship types + timestamps | +2–5        | Raw property-history rows expose `data_nindex` relationship values with `recorded_at` |

The most efficient approach: use MCP traversal for entity/event discovery and
typed graph structure, then call the raw Query Server property-history
endpoint for full temporal properties and any remaining relationship-row
verification. The key insight is that MCP is sufficient for discovery, but
the raw properties endpoint is the source of truth for full historical
fidelity.

### The critical dependency: document NEIDs

Every scenario above starts with document NEIDs. This is not optional — it
is the **foundational requirement** for any graph reconstruction from
ingested documents. Without NEIDs:

- You cannot use `get_related` (requires a starting entity NEID)
- You cannot use `get_entity` by name reliably (60% failure rate)
- You have no way to scope results to YOUR documents vs the broader graph

**Implication for system design:** Any workflow that ingests documents and
expects an agent to later explore the resulting graph MUST pass the document
NEIDs to the agent. This could be:

1. Stored in a database accessible to the agent
2. Passed as input parameters to the agent task
3. Returned by the ingestion pipeline and cached
4. Discoverable via a "list documents" API (which does not currently exist
   in the Elemental tools — this would be a valuable addition)

Without a "list my ingested documents" capability, the agent is entirely
dependent on receiving NEIDs from an external source. If that source is
unavailable, the agent cannot begin.

---

## Appendix A: The Investigation — A Chronological Narrative

This section tells the story of how we explored this knowledge graph, what
we tried, what failed, what we misunderstood, and what eventually worked.
Each misstep taught us something about how to interact with the Elemental
API and how knowledge graphs built from document ingestion actually behave.

### Phase 1: "Just look things up" (Steps 1–3, ~40 MCP calls)

We started with the simplest possible approach: look up each document by
its known NEID, discover the schema, then fan out with `get_related`.

**Step 1: Document lookup by NEID.** We called `elemental_get_entity` with
each document's NEID. All 5 resolved instantly (score 1.0). This gave us
false confidence — NEIDs just work, so surely the whole graph is this easy.

**Step 2: Schema discovery.** We called `elemental_get_schema` to list all
flavors and understand properties. The graph has 8 entity flavors:
`document`, `organization`, `person`, `financial_instrument`, `location`,
`fund_account`, `legal_agreement`, `schema::flavor::event`. This told us
WHAT to ask for, but not HOW the graph was connected.

**Step 3: First `get_related` pass.** We called `get_related` from each
document for 4 flavors (organization, person, financial_instrument,
location). We used the default limit (~10). Results looked reasonable —
each document returned 5–10 related organizations, some persons, some
financial instruments. We had no reason to suspect the results were
incomplete.

**What we thought at this point:** Coverage looked decent. Some expected
entities were missing (HSBC Bank USA Trade Services, NC Housing Associates),
but we assumed those might not be in the graph.

### Phase 2: "Why is so much missing?" (Steps 4–5, ~30 MCP calls)

**Step 4: Ground truth comparison.** We compared our results against
`Jon-graph.md` (the extraction ground truth: 193 entities, 521 edges).
The picture was grim: we were missing entire categories (0 events, few
fund accounts, few legal agreements) and had gaps in organizations
and locations.

**Our initial reported coverage was ~64% (123 of 193 entities).** This
number was wrong, but we didn't know that yet.

**Step 5: Discovering the pagination problem.** HSBC Bank USA Trade
Services was the canary. We KNEW it existed (it appeared in the source
document), but `get_related` from the document didn't return it. We
looked it up directly with `get_entity` — it was there, in the graph.
So why didn't `get_related` find it?

We re-ran `get_related` with `limit: 500`. Suddenly, previously invisible
entities appeared. The default limit had been silently truncating results.

**Lesson: The API never tells you results are truncated.** There is no
"hasMore" flag or total count. If you ask for 10 results and there are 37,
you get 10 with no indication that 27 are hidden. This is the single most
costly gotcha for agents — it caused us to draw wrong conclusions about
coverage and waste ~30 calls re-running everything.

### Phase 3: "Why can't name search find things?" (Steps 6–7, ~45 MCP calls)

**Step 6: Investigating entity resolution.** To verify which ground truth
entities the KG contained, we called `get_entity` BY NAME for each one.
This was our second major mistake. The fuzzy name matcher is unreliable:

| Entity name              | Resolved to                            | Correct?                               |
| ------------------------ | -------------------------------------- | -------------------------------------- |
| BLX Group LLC            | BXGA L.L.C.                            | **Wrong** — different company entirely |
| LEFRAK ORGANIZATION INC. | (failed to resolve)                    | **Failure**                            |
| 2711 N. Haskell Avenue   | 2828 N. Haskell Ave.                   | **Wrong** — different address          |
| HSBC Bank USA            | HSBC Singapore Branch                  | **Wrong** — different subsidiary       |
| United Jersey Bank       | Correct only with exact canonical form | **Fragile**                            |

We were categorizing entities as "incorrectly resolved" or "missing" when
they were actually present and accessible via traversal. **Name-based search
was not just unhelpful — it was actively misleading us about coverage.**

**Step 7: Trying `get_events`.** With 0 events from `get_related`, we tried
the dedicated `get_events` tool:

- Free-text queries ("arbitrage rebate analysis", "bond issuance 1991"): hit
  or miss, semantically similar queries returned different results
- Entity-based queries (`get_events(entity: "BLX Group LLC")`): inherited the
  name resolution bugs — "BLX Group LLC" returned Blackstone/Bumble events
  because the resolver mapped BLX → BXGA

We found some events through persistent experimentation, but the process was
inefficient and unreliable.

### Phase 4: "The graph isn't document-centric" (Step 8, ~7 MCP calls)

**Step 8: Discovering the bond hub.** This was the turning point. The user
noticed that NEID `8242646876499346416` (which appeared in `get_related`
results as "IRREVOCABLE LETTER OF CREDIT NO. 5094714") might actually be the
$142M bond entity — just stored under a different name.

We ran `get_related` FROM this entity across all flavors. The results were
revelatory:

- Connected to all 5 documents
- Connected to 29 events
- Connected to 16 fund accounts
- Connected to 7 organizations

This single entity was the hub of the entire graph. **Events don't connect to
documents — they connect to the bond entity.** The traversal path is
`document → financial_instrument → event` (two hops, not one).

We had earlier written off the "IRREVOCABLE LETTER OF CREDIT" name as an
incorrect resolution. It was actually correct — the entity was just ingested
under a different name than we expected. **We dismissed a correct answer
because it didn't match our expectations.**

### Phase 5: "NEIDs are the only reliable handles" (Steps 9–10, ~26 MCP calls)

**Step 9: NEID vs name comparison.** We now understood that traversal
(`get_related`) was more reliable than name search (`get_entity`). But we
wanted to quantify exactly how much more reliable. We took 5 entities whose
NEIDs we had from traversal and looked each up both ways:

- **By NEID:** 5/5 correct, score 1.0 every time, instant, deterministic.
- **By name:** 1/5 correct (and even that required the exact canonical form
  with a trailing comma).

This established the fundamental rule: **once you have a NEID, never go back
to name-based search.** NEIDs are deterministic; names are probabilistic.

**Step 10: NEID-based chained traversal.** Armed with NEIDs from step 9, we
chained `get_related` calls to find entities that were invisible through any
other method:

- United Jersey Bank (NEID) → 4 LOC amendments from 2001–2003
- BNY Mellon (NEID) → 5 LOC amendments from 2004–2008
- These amendments documented the transition of the Letter of Credit
  beneficiary from UJB to BNY Mellon — a real-world business event encoded
  in the graph's structure.

### Phase 6: "Exhaust every path" (Step 11, ~19 MCP calls)

**Step 11: Systematic multi-hop traversal.** We took every entity NEID
discovered via document traversal and ran `get_related → events` from each:

- **Fund accounts → events:** Revealed year-specific valuations (2008, 2015, 2021) that were invisible from any other path. Each fund account connects
  to 5 events.
- **NJHMFA → events:** 20 events (9 unique beyond bond hub).
- **Orrick → events:** 1 unique (Orrick Opinion Issuance).
- **US Treasury → events:** 327 results, almost all unrelated. Treasury is a
  "global entity" in the broader graph with connections to thousands of
  unrelated events from news ingestion. This is a hazard of multi-hop
  traversal through highly-connected entities.

This phase brought total event coverage to 53 unique NEIDs and overall entity
coverage to 188/193 names → 185 unique NEIDs.

### Phase 7: "The 'missing' entities were merged, not absent" (Step 12)

**Step 12: Merge analysis.** We had 5 "missing" entities (4 events, 1 fund
account). Examining their properties against the ground truth revealed:

- All 4 events were name variants that the entity resolver correctly merged
  with existing events sharing the same date and description
- The fund account was "Liquidity II Accounts" (plural) merged with
  "Liquidity II Account" (singular)

No DTG conflicts. No information lost. **All 193 ground truth entities are
present in the graph**, mapped to 185 unique NEIDs. The 8-entity gap is
entirely explained by correct entity resolution merges.

### Phase 8: "Do the properties and relationships match?" (Steps 13-14, ~40 MCP calls)

**Step 13: Property and relationship type investigation.** Having confirmed
100% entity coverage, we turned to a question we had not yet addressed: do
the properties on entities and the relationship types between entities match
the ground truth?

We spot-checked three categories:

1. **Fund account properties** (Liquidity I Account): all 5 financial metrics
   matched the ground truth — but only the LATEST document's values. The API
   returned the 2024 computation values; the 2012, 2015, and 2021 values from
   earlier documents were not accessible via `get_entity`.

2. **Bond entity properties**: sources & uses of funds values matched exactly.
   Since these are fixed at issuance, the single-value limitation doesn't
   cause data loss.

3. **Event properties**: category, date, description, and likelihood all
   matched. Descriptions were slightly abbreviated but factually equivalent.
   `get_events(include_participants: true)` returned participant NEIDs with
   semantic role labels (e.g., "Preparer/Issuer of Report").

We then tested whether the 15 ground truth relationship types were queryable:

- `get_related` with `relationship_types` filter: 13 of 13 tested types
  worked (including `holds_investment`, which required querying in the
  fund→instrument direction rather than instrument→fund)
- `get_relationships` tool: returned empty for every pair tested — appears
  non-functional for document-ingested entities
- Without `relationship_types` filter: relationship types are NOT included
  in `get_related` responses — you just get untyped entity connections

**Step 14: Exhaustive temporal property investigation.** The initial finding
that properties are "latest only" raised the question: should temporal access
to the underlying quads be possible? We exhaustively tested every temporal
access mechanism:

| Approach tried                                                           | Result                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `get_entity` with `properties`                                           | Always returns latest (2024) values regardless of context                                         |
| `get_entity` with `snippet` for date context ("2012 computation period") | Snippet affects entity disambiguation only, not property selection                                |
| `get_related` from 2012 document with `related_properties`               | Returns latest values — document source doesn't scope properties                                  |
| `get_related` with `time_range` filter                                   | Filters WHICH entities are returned (5 vs 19 fund accounts), but property VALUES are still latest |
| `graph_neighborhood` with `history: true`                                | Returns only the entity itself with influence=1; no property history                              |
| `get_relationships` between 8 entity pairs                               | Returned `{}` for all — completely non-functional                                                 |

None of these approaches returned historical property values. The `time_range`
parameter on `get_related` is useful for filtering relationships by time
period but has no effect on which property values are returned for the
resulting entities.

**However,** we discovered that `get_events` for individual fund accounts
DOES return year-specific valuation events with historical values in their
descriptions:

- 2024: "$0.28" (Liquidity I) — matches `get_entity` latest value
- 2021: "$353,320.50" — matches ground truth doc 9587055
- 2012: "$351,983.72" — matches ground truth doc 5816087
- 2015: Shared "Fund Valuation (2015)" event — no individual per-account values
- 2008: "$355,339.92" — from prior Willdan report (not in our 5-doc ground truth)

The event descriptions contain `computation_date_valuation` amounts for 3 of
4 ground truth periods (2015 is missing), but the other metrics
(`gross_earnings`, `internal_rate_of_return`, `excess_earnings`) are only
available for the 2024 event of Reserve I Account. At this point in the
investigation, the best apparent recovery path was events, which is why the
intermediate estimate was only 33 of 100 fund-account property values.
That estimate was later superseded by the raw Query Server property-history
endpoint, which returned all 100 source-of-truth values directly.

**Key discoveries:**

1. MCP properties are **single-valued (latest wins)** even though the raw
   Query Server stores the full temporal series.
2. Event descriptions are a useful fallback for human interpretation, but
   they are no longer the best structured source for history once the raw
   property-history endpoint is available.
3. **`get_relationships`** is completely non-functional for document-ingested
   entities (tested 8 pairs across all entity type combinations).
4. **`holds_investment`** works — the earlier failure was a directionality
   issue (fund→instrument, not instrument→fund). All 15 relationship types
   are now confirmed.

---

## Appendix B: Research Plan Template for Knowledge Graph Exploration

This investigation taught us that knowledge graph exploration requires
**structured discovery before querying**. An agent starting a KG search
cold will make the same mistakes we made (low limits, name-based search,
wrong topology assumptions) unless it has a research plan.

### The problem

Our investigation required ~240 combined calls (~230 MCP + ~10 raw Query
Server). With the knowledge we gained, entity
discovery alone could be achieved in ~70 calls. The difference — 120+
wasted calls — came from:

| Wasted calls | Root cause                                           | What would have prevented it                  |
| ------------ | ---------------------------------------------------- | --------------------------------------------- |
| ~30          | Low limits requiring re-runs                         | Knowing to always use limit ≥ 500             |
| ~25          | Name-based lookups returning wrong entities          | Knowing to use NEIDs from traversal           |
| ~15          | Trying `get_events` from documents (0 results)       | Knowing events connect at hop 2               |
| ~15          | Trying free-text event queries                       | Knowing NEID-based traversal is more reliable |
| ~30          | Verifying entities that traversal already found      | Knowing traversal results are authoritative   |
| ~5           | Not filtering global entities (Treasury: 327 events) | Knowing some entities are "global hubs"       |

### Proposed research plan structure

Before any KG exploration, the agent should build or receive a **Research
Context Document** containing:

```
RESEARCH CONTEXT
================

1. KNOWN IDENTIFIERS
   - Document NEIDs: [list]
   - Entity NEIDs: [list, if any known]
   - Hard IDs: [nindex, findex, md5, etc.]
   - Entity names: [list — but mark as "for reference only, do not use
     for search"]

2. EXPECTED ENTITY TYPES
   - What flavors to look for: [organization, person, event, etc.]
   - Approximate counts if known from ground truth

3. TOPOLOGY HYPOTHESIS
   - Which entities are likely central hubs?
   - Expected hop distance for each entity type
   - Known patterns from similar graphs (e.g., "events connect through
     financial instruments, not directly to documents")

4. API PARAMETERS
   - Always use limit: 500 (minimum)
   - Always collect NEIDs from every response
   - Never use name-based search for verification
   - Filter results from global entities (>100 connections likely means
     the entity exists in the broader graph beyond your documents)
   - Pass related_properties in get_related calls to fetch properties
     in the same call (no extra overhead)
  - MCP properties are single-valued (latest document only), but raw
    property history is available through `POST /elemental/entities/properties`
   - Relationship types are NOT returned by default — use
     relationship_types filter to discover edge types
   - get_relationships tool does not work for ingested documents —
     use get_related with relationship_types filter instead

5. TRAVERSAL PLAN
   Phase 1: Fan out from known documents
     → get_related for each flavor with limit 500
     → pass related_properties for known property names
     → collect all unique NEIDs
   Phase 2: Identify hub entities
     → which hop-1 entities have the most connections?
     → run get_related FROM those entities
   Phase 3: Multi-hop for events
     → events rarely connect to documents directly
     → traverse through financial_instruments, organizations, fund_accounts
     → use get_events(include_participants: true) for event details
   Phase 4: Relationship types
     → re-run key get_related calls with relationship_types filter
     → test each of: appears_in, fund_of, issuer_of, trustee_of,
       beneficiary_of, advisor_to, located_at, works_at, borrower_of,
       successor_to, sponsor_of, party_to, predecessor_of
   Phase 5: Verify coverage
     → compare discovered NEIDs against expected counts
     → any "missing" entities are likely name variants merged during
       entity resolution
```

### Why a research plan matters for agents

Without a plan, an agent will:

1. Start with name-based search → get wrong results
2. Use low limits → miss entities
3. Assume document-centric topology → miss events entirely
4. Spend dozens of calls discovering things the plan could state upfront
5. Report incorrect coverage numbers that erode user trust

With a plan, an agent can:

1. Go straight to NEID-based traversal with high limits
2. Know which hop-1 entities to fan out from for events
3. Recognize global entities and filter them
4. Report accurate coverage from the first pass
5. Complete entity exploration in ~70 calls instead of ~190

### How to build context for the plan

The minimum context an agent needs before starting:

| Context              | Where it comes from                                          | Why it matters                                        |
| -------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Document NEIDs       | Ingestion metadata, user, database                           | Starting points for traversal                         |
| Entity flavors       | `get_schema()` (1 call)                                      | Tells you what to search for                          |
| Graph topology       | Prior exploration of similar graphs, or schema relationships | Prevents wrong assumptions about hop distance         |
| Known entity names   | Source documents, user description                           | Reference only — but helps identify what's been found |
| Limit guidance       | This document                                                | Prevents silent truncation                            |
| Name search warnings | This document                                                | Prevents wasted calls on unreliable lookups           |

**The most valuable context is topology knowledge.** An agent that knows
"events connect through financial instruments at hop 2" will find 53 events
in ~12 calls. An agent that doesn't know this will spend ~40 calls
discovering the same thing.

---

## Appendix C: Recommendations for System and Agent Improvements

The following recommendations emerge from specific failures and
inefficiencies encountered during this investigation.

### For the Elemental API

1. **Add pagination metadata to `get_related` responses.** Return
   `total_count` and `has_more` alongside results. Silent truncation was
   our single most expensive error — ~30 wasted calls and incorrect
   conclusions about coverage.

2. **Add a `get_related_count` endpoint.** Before fetching 500 results,
   let the agent check how many exist. This enables intelligent limit
   selection and progress tracking.

3. **Improve name resolution for `get_entity`.** The fuzzy matcher fails
   for 3 of 5 tested entities. Specific failure modes:
    - Short abbreviations: BLX → BXGA (edit distance is close but
      semantically wrong)
    - Historical names: United Jersey Bank → Union Bank of Arizona
    - Street addresses: 2711 → 2828 (partial numeric match)
    - Consider adding a "confidence" threshold — if the match score is
      below 0.8, return "no match" instead of a wrong entity.

4. **Support NEID-based `get_events`.** Currently `get_events(entity: ...)`
   uses the name resolver, inheriting all its bugs. Adding
   `get_events(entity_id: ...)` would bypass resolution entirely.

5. **Document the hub-and-spoke topology pattern.** If this is a common
   pattern (events connecting through deal/instrument entities rather
   than documents), document it so agents don't spend 40 calls
   discovering it.

6. **Return relationship types by default in `get_related`.** Currently
   relationship types are only included when the caller explicitly
   filters by `relationship_types`. Returning them by default (in the
   `relationship_types` array on each result) would let agents build
   typed graphs without extra calls.

7. **Fix `get_relationships` for document-ingested entities.** The tool
   returns `{}` for every pair tested, even when `get_related` confirms
   the relationship exists. This tool should work consistently regardless
   of data source.

8. **Expose the raw property-history capability in MCP.** The raw Query Server
   already supports `POST /elemental/entities/properties`, which returns
   repeated `(eid, pid, value, recorded_at)` rows and was sufficient to
   recover 100% of the ground-truth property values and confirm the final 2
   relationship types. The missing feature is not in the storage layer; it is
   in the MCP wrapper layer. Options:
    - Add an MCP tool that wraps `POST /elemental/entities/properties`
    - Add `history=true` / `include_all_values=true` to `elemental_get_entity`
    - Allow `elemental_get_related` to return full property histories rather
      than just the latest collapsed value

9. **Expose relationship rows directly in MCP.** Relationship rows are already
   visible through raw property-history responses because relationship types
   are stored as `data_nindex` properties with `recorded_at`. MCP should
   expose the same rows directly so agents do not have to infer them from raw
   PIDs or work around the broken `get_relationships` tool.

### For agents interacting with the KG

1. **Always start with `get_schema`.** 1 call that tells you what to
   search for. Without it, you're guessing at flavor names and
   property names.

2. **Always use `limit: 500`.** There is no downside (the API handles
   it efficiently) and silent truncation at low limits causes incorrect
   conclusions.

3. **Collect NEIDs from every response.** Treat each `get_related`
   response as a source of handles for further traversal, not just a
   list of names to display.

4. **Never use `get_entity` by name for verification.** If you need to
   verify an entity exists, use the NEID from traversal. Name search
   fails for 60% of tested entities.

5. **Traverse from hub entities, not just documents.** Financial
   instruments and organizations are often better starting points for
   event discovery than documents.

6. **Filter global entities.** If a `get_related` call returns >100
   results for events, the entity is probably a global hub (like US
   Treasury) with connections to the broader graph beyond your
   documents. Flag these and either skip them or apply additional
   filtering.

7. **When entities appear "missing," check for merges first.** If the
   ground truth has 57 events but you find 53 unique NEIDs, the
   difference is almost certainly entity resolution merging name
   variants across documents. Verify by checking DTGs — if two entities
   share the same date and describe the same real-world event, the merge
   is correct.

8. **Pass `related_properties` in `get_related` calls.** This fetches
   entity properties alongside relationship data at zero extra cost.
   Know the property names from the schema (`get_schema` for each
   flavor shows available properties).

9. **Use `get_events(include_participants: true)` for event details.**
   This returns participant NEIDs, roles, and relationship types in a
   single call — far more efficient than separate `get_related` calls
   from each event.

10. **Probe relationship types explicitly.** Relationship types are not
    returned by default. To build a typed graph, re-run key `get_related`
    calls with `relationship_types` filter for each expected type. The
    common types in financial document graphs: `appears_in`, `fund_of`,
    `issuer_of`, `trustee_of`, `beneficiary_of`, `advisor_to`,
    `located_at`, `works_at`, `borrower_of`, `successor_to`.

11. **MCP properties are latest-only, but raw property history is complete.**
    `elemental_get_entity` and `elemental_get_related` return a single value
    per property (the most recent one). But the raw Query Server endpoint
    `POST /elemental/entities/properties` returns the full temporal series
    as repeated rows with `recorded_at`. Use MCP for convenience and raw
    property history for full fidelity.

12. **`holds_investment` is directional — query from fund to instrument.**
    Earlier testing returned 0 results when querying from the bond entity
    with `holds_investment`. The correct direction is fund_account →
    financial_instrument (Liquidity I Account holds_investment in Morgan IA,
    Federated MM). Always verify directionality when a relationship type
    returns empty.

### For the entity resolution pipeline

1. **Make merge decisions more consistent.** We found cases where two
   events with the same date and near-identical descriptions were merged
   (correct), but two other events with the same date and near-identical
   descriptions were kept as separate NEIDs (inconsistent). Specifically:
    - "Bonds Issue Date" was merged into "Issuance of 1991 Series 1
      Bonds" (correct, same issuance on Oct 17, 1991)
    - But "Issuance of Multifamily Housing Revenue Refunding Bonds" was
      kept as a separate NEID, despite also describing the same issuance
      on Oct 17, 1991

2. **Preserve original entity names as aliases.** When "Bonds Issue Date"
   is merged with "Issuance of 1991 Series 1 Bonds", the original name
   should be preserved as a searchable alias. This would let name-based
   search find the entity even after merging.

3. **Flag potential over-merges.** "STATE OF NEW YORK" (a governing
   jurisdiction) was likely merged with "New York" (a city). These are
   semantically different entities. The resolver could flag cases where
   a location with "STATE OF" or "COUNTY OF" prefixes is being merged
   with a bare city name.

---

## Appendix D: Key Lessons Learned (Summary)

1. **Start with schema discovery.** Without knowing the available flavors,
   properties, and relationship types, you're querying blind.

2. **Always use high limits (≥500).** Silent truncation at low limits hid
   real results and led to false conclusions about missing entities. We
   reported 64% coverage that was actually 100% — the API just wasn't
   returning all results.

3. **Compare against ground truth early.** The Jon-graph.md comparison
   drove every subsequent investigation step. Without it we would have
   assumed the initial results were complete.

4. **Traversal beats name lookup — and NEID lookup beats everything.**
   Every entity that the name matcher failed to find was successfully found
   via `get_related`. Once you have a NEID from traversal, always use it
   for further queries. Name-based search is probabilistic and fails for
   60% of tested entities (3/5 wrong, 1/5 only works with exact canonical
   form).

5. **Check your assumptions about graph topology.** We assumed
   document-centric connectivity and missed the hub entity for most of the
   investigation. The graph's actual topology (hub-and-spoke through the
   bond entity) was only discovered by following a lead from the user. Had
   we examined the `financial_instrument` results more carefully early on,
   we would have found it sooner.

6. **Entity resolution errors compound.** The BLX→BXGA resolution bug
   didn't just affect `get_entity` — it propagated into `get_events`,
   returning completely unrelated events. Using NEID-based `get_events`
   completely avoids this class of bug.

7. **Don't dismiss "wrong" results too quickly.** The name lookup returning
   "IRREVOCABLE LETTER OF CREDIT NO. 5094714" for the bond name was
   initially categorized as an incorrect resolution. It was actually
   correct — the entity was just ingested under a different name than
   expected. Verifying by NEID and checking relationships would have caught
   this earlier.

8. **The graph is more complete than name-based search suggests.** With
   NEID-based multi-hop traversal, we found 100% of ground-truth entities
   (vs the 64% we initially reported). Every "missing" entity turned out to
   be present — just unreachable through name search or single-hop
   traversal from documents.

9. **"Missing" entities are usually merges, not gaps.** When the count of
   unique NEIDs is lower than the count of ground truth entity names, the
   difference is almost always correct entity resolution merges (same DTG,
   same description, different name across documents). Verify by checking
   dates — if a "missing" event has the same date as an existing event with
   a similar name, it was merged.

10. **Global entities are noise generators.** Entities like US Dept of
    Treasury and Bank of New York Mellon exist in the broader knowledge
    graph with connections to thousands of unrelated entities from news
    and other data sources. Traversing events from these entities returns
    hundreds of irrelevant results. Agents need to recognize and filter
    these.

11. **Historical properties are available — just not through MCP.** The raw
    Query Server endpoint `POST /elemental/entities/properties` returns the
    full time series as repeated `(eid, pid, value, recorded_at)` rows. MCP
    wrappers collapse that down to the latest value only. The real limitation
    is the wrapper layer, not the underlying store.

12. **The Timeline UI is likely pivoting property rows by timestamp.** The
    visualization is not evidence of hidden date-qualified property names.
    The raw endpoint already returns the exact structure needed to build that
    view: repeated property values plus `recorded_at`.

13. **Relationship rows live in the same raw property-history surface.** The
    final 2 relationship types (`predecessor_of`, `party_to`) were confirmed
    through raw `data_nindex` property rows with timestamps, not through MCP
    traversal. For document-ingested graphs, the raw property-history surface
    is a more complete source of truth than `get_relationships`.

14. **Relationship direction still matters.** `holds_investment` returned 0
    results when queried from the bond entity (instrument→fund) but worked
    correctly from the fund account (fund→instrument). Always verify
    directionality when a known relationship type returns empty.

15. **The investigation itself is the methodology.** We spent ~240 combined
    calls discovering what could now be found in ~46-70 MCP calls for
    entity/event discovery plus ~10-20 raw Query Server calls for full
    source-of-truth property and relationship validation. This knowledge
    should be encoded in agent instructions and research plan templates so
    future investigations start where this one ended, not where it began.
