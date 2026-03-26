# BNY Exact Reconstruction README

This document explains **exactly how to reconstruct the entities, events,
relationships, and associated properties that were extracted from the 5 BNY
documents**.

This is not a generic pattern doc. It is the exact retrieval recipe for the
validated BNY graph analyzed in `import/elemental-retrieval-findings.md`.

## Reconstruction Target

The source-of-truth graph extracted from the 5 documents contains:

- `193` entity names
- `57` event names
- `521` relationship edges
- `15` relationship types
- fund-account historical property series across 4 report dates
- bond sources/uses property rows across the same report set

### Final validated coverage

| Category           | Ground truth       | KG result                  | Interpretation                          |
| ------------------ | ------------------ | -------------------------- | --------------------------------------- |
| Entity names       | `193`              | `185` unique NEIDs         | `8` gaps explained by correct merges    |
| Event names        | `57`               | `53` unique event NEIDs    | `4` gaps explained by correct merges    |
| Relationship types | `15`               | `15` present               | all confirmed                           |
| Properties         | full extracted set | full extracted set present | full history recoverable through raw QS |

## Required Inputs

You need:

- the 5 document NEIDs
- tenant gateway or direct Query Server auth
- schema access for PID -> property-name mapping

### Exact document seeds

| Document ID | Meaning                        | Document NEID         |
| ----------- | ------------------------------ | --------------------- |
| `7438596`   | Interim Rebate Analysis (2015) | `2051052947608524725` |
| `26889358`  | Interim Rebate Analysis (2024) | `7447437794117404020` |
| `4124255`   | Irrevocable Letter of Credit   | `7526709763959495568` |
| `5816087`   | Interim Rebate Analysis (2012) | `7780293260382878366` |
| `9587055`   | Interim Rebate Analysis (2021) | `8759058315171884540` |

### Exact report-date mapping used in the graph

| Recorded date          | Source document             | Document NEID         |
| ---------------------- | --------------------------- | --------------------- |
| `2012-10-16T00:00:00Z` | 5816087                     | `7780293260382878366` |
| `2015-10-16T00:00:00Z` | 7438596                     | `2051052947608524725` |
| `2021-10-16T00:00:00Z` | 9587055                     | `8759058315171884540` |
| `2024-10-16T00:00:00Z` | 26889358                    | `7447437794117404020` |
| `2026-03-25...`        | 4124255 LOC extraction rows | `7526709763959495568` |

## Two-Layer Retrieval Model

Use two layers together:

### Layer 1: MCP

Use MCP for:

- entity discovery
- hop traversal
- event discovery
- typed relationship probing

Primary tools:

- `elemental_get_related`
- `elemental_get_events`
- `elemental_get_entity`
- `elemental_get_schema`

### Layer 2: Raw Query Server

Use raw Query Server for:

- full temporal property history
- relationship-row timestamps
- validation of the final relationship types not cleanly exposed through MCP

Primary endpoint:

```text
POST /elemental/entities/properties
```

Tenant-gateway form:

```text
{gateway}/api/qs/{org_id}/elemental/entities/properties
```

## Exact Reconstruction Workflow

## Step 1: Discover hop-1 entities from the 5 documents

For **each** of the 5 document NEIDs, call `elemental_get_related` with:

- `limit: 500`
- one flavor at a time:
    - `organization`
    - `person`
    - `financial_instrument`
    - `location`
    - `fund_account`
    - `legal_agreement`
    - optionally `schema::flavor::event` only to confirm it returns `0`

### Expected result after de-duplication

From all 5 documents combined, hop 1 should contain:

- `21` organizations
- `3` persons
- `19` financial instruments
- `20` locations
- `27` fund accounts
- `37` legal agreements
- `0` events

Total hop-1 unique NEIDs: `127`

If you include the 5 documents themselves, the graph state at this stage is:

- hop 0: `5` documents
- hop 1: `127` unique non-document NEIDs

Important:

- there are **no document -> event edges**
- if your counts are materially lower, you probably used too small a limit

## Step 2: Build the canonical entity table

Construct a canonical entity table keyed by NEID:

```ts
type EntityNode = {
    neid: string;
    name: string;
    flavor: string;
    sourceDocuments: string[];
};
```

Rules:

- de-duplicate by `neid`
- accumulate all source-document NEIDs where the entity appears
- treat traversal names as canonical
- never switch back to name-based lookup once a NEID is known

### Expected final entity totals

After merge interpretation:

| Flavor                  | Ground-truth names | Unique KG NEIDs | Effective coverage |
| ----------------------- | -----------------: | --------------: | -----------------: |
| `document`              |                  5 |               5 |               100% |
| `organization`          |                 22 |              21 |               100% |
| `person`                |                  3 |               3 |               100% |
| `financial_instrument`  |                 19 |              19 |               100% |
| `location`              |                 22 |              20 |               100% |
| `fund_account`          |                 28 |              27 |               100% |
| `legal_agreement`       |                 37 |              37 |               100% |
| `schema::flavor::event` |                 57 |              53 |               100% |
| **Total**               |            **193** |         **185** |           **100%** |

## Step 3: Traverse hop-2 events from the exact BNY hubs

To recover the event graph, traverse from these known hubs.

### Required hubs

| Entity                                               | NEID                   | Why it matters                           |
| ---------------------------------------------------- | ---------------------- | ---------------------------------------- |
| Bond hub: `IRREVOCABLE LETTER OF CREDIT NO. 5094714` | `8242646876499346416`  | largest event hub                        |
| New Jersey Housing and Mortgage Finance Agency       | `06471256961308361850` | unique issuance/refunding/payment events |
| BLX Group LLC                                        | `01470965072054453101` | report-issuance and analysis events      |
| Reserve I Account                                    | `09112734796193071548` | valuation events                         |
| Reserve II Account                                   | `02877916378535664072` | valuation events                         |
| Liquidity I Account                                  | `07476737946181823597` | valuation events                         |
| Liquidity II Account                                 | `06638852300639391265` | valuation events                         |

### Useful secondary audit hubs

These are helpful for validation, but not strictly required once the main hubs
above have been traversed:

| Entity                              | NEID                   |
| ----------------------------------- | ---------------------- |
| UNITED JERSEY BANK/CENTRAL,         | `06967031221082229818` |
| Orrick, Herrington & Sutcliffe      | `05477621199116204617` |
| REPUBLIC NATIONAL BANK OF NEW YORK  | `04824620677155774613` |
| Bank of New York Mellon Corporation | `05384086983174826493` |
| HSBC Bank USA, Natl Assoc           | `06157989400122873900` |

### Expected event coverage from major hubs

These counts are the observed totals returned from those hubs, not the final
deduplicated count:

| Hub                                                | Events returned |
| -------------------------------------------------- | --------------: |
| Bond hub `8242646876499346416`                     |              29 |
| NJHMFA `06471256961308361850`                      |              20 |
| BLX Group LLC `01470965072054453101`               |              15 |
| UNITED JERSEY BANK/CENTRAL, `06967031221082229818` |              12 |
| Reserve I Account `09112734796193071548`           |               5 |
| Reserve II Account `02877916378535664072`          |               5 |
| Liquidity I Account `07476737946181823597`         |               5 |
| Liquidity II Account `06638852300639391265`        |               5 |

### Expected final event result

- `53` unique event NEIDs recovered
- these account for all `57` ground-truth event names after `4` correct merges

### Event merge interpretation

Do **not** classify the remaining `57 - 53 = 4` event names as missing.
They are correct merges.

## Step 4: Build the relationship set

The ground-truth graph has `521` edges across `15` relationship types:

| Relationship type                   | GT count |
| ----------------------------------- | -------: |
| `appears_in`                        |      212 |
| `schema::relationship::participant` |      186 |
| `fund_of`                           |       33 |
| `holds_investment`                  |       26 |
| `located_at`                        |       18 |
| `advisor_to`                        |       15 |
| `predecessor_of`                    |        9 |
| `issuer_of`                         |        6 |
| `trustee_of`                        |        4 |
| `beneficiary_of`                    |        3 |
| `works_at`                          |        3 |
| `borrower_of`                       |        2 |
| `party_to`                          |        2 |
| `sponsor_of`                        |        1 |
| `successor_to`                      |        1 |

### Relationship retrieval rule

Use MCP first:

- `get_related` with `relationship_types` filters for the relationship types above

Then use raw Query Server property rows to finish validation:

- relationship types can appear as `data_nindex` rows in
  `POST /elemental/entities/properties`
- those rows provide:
    - source entity
    - target entity
    - relationship type
    - `recorded_at`

### Relationship status

What you can recover exactly:

- edge existence
- relationship type
- timestamp

What is still not returned cleanly in one endpoint:

- exact citation string for each edge
- dedicated per-edge count endpoint for document-ingested relationships

## Step 5: Retrieve exact property history

This is the key part that the README needs to be explicit about:

**Do not use MCP alone for historical properties.**

Use raw:

```text
POST /elemental/entities/properties
```

Parameters:

- `eids`: JSON-stringified array of NEIDs
- omit `pids` to get all properties
- set `include_attributes=true`

### Exact property-bearing entities from the extracted graph

For this BNY dataset, the key property-bearing entities are:

#### Fund accounts (time series)

| Entity                 | NEID                   |
| ---------------------- | ---------------------- |
| Liquidity I Account    | `07476737946181823597` |
| Liquidity II Account   | `06638852300639391265` |
| Reserve I Account      | `09112734796193071548` |
| Reserve II Account     | `02877916378535664072` |
| Prior Rebate Liability | `02277784462984661168` |

Expected property families:

- `current_fund_status`
- `computation_date_valuation`
- `gross_earnings`
- `internal_rate_of_return`
- `excess_earnings`

Expected report dates:

- `2012-10-16`
- `2015-10-16`
- `2021-10-16`
- `2024-10-16`

#### Bond / financial instrument properties

| Entity                                   | NEID                  |
| ---------------------------------------- | --------------------- |
| IRREVOCABLE LETTER OF CREDIT NO. 5094714 | `8242646876499346416` |

Expected property families:

- `sources_of_funds_*`
- `uses_of_funds_*`

#### Event properties

Use MCP `get_events` for:

- `category`
- `date`
- `description`
- `likelihood`
- participants + participant roles

### Output format to build

Build time series by grouping raw property rows on:

- `(eid, pid)` for a single property series
- sorted by `recorded_at`

Suggested record:

```ts
type PropertyPoint = {
    neid: string;
    pid: number;
    propertyName: string;
    value: string | number | boolean | null;
    recordedAt: string;
};
```

## Exact app assembly outputs

Your app data pipeline should produce these 5 artifacts:

### 1. `entities.json`

All canonical entities keyed by NEID.

### 2. `events.json`

All `53` canonical event NEIDs, plus a merge map from the `57` source names to
those `53` event entities.

### 3. `relationships.json`

Typed edge list with:

- `sourceNeid`
- `targetNeid`
- `type`
- `recordedAt`
- optional inferred `sourceDocumentNeid`

### 4. `property-series.json`

Historical series from raw Query Server property rows.

### 5. `merge-map.json`

A map from ground-truth names to canonical KG NEIDs when multiple source names
resolved to one entity/event.

## Provenance rule for this dataset

If you need to approximate which document a relationship came from:

1. take the relationship row `recorded_at`
2. match that date to the known document-date table above
3. use document `appears_in` rows as an additional check

This is sufficient for most app views over this BNY graph, but it is still not
the same as having a clean dedicated edge-provenance endpoint.

## Minimal exact recipe

If someone asks, “What is the minimal exact recipe to rebuild the BNY graph?”,
the answer is:

1. Start from the 5 document NEIDs listed above
2. MCP `get_related` across the 6 non-event flavors with `limit: 500`
3. De-duplicate hop-1 entities by NEID
4. Traverse events from:
    - bond `8242646876499346416`
    - NJHMFA `06471256961308361850`
    - BLX `01470965072054453101`
    - the 4 fund accounts listed above
5. Use MCP `get_related` with `relationship_types` filters for the core typed graph
6. Use raw `POST /elemental/entities/properties` for:
    - all historical property series
    - final relationship-row validation
    - timestamp recovery
7. Apply the validated merge map:
    - `193` entity names -> `185` NEIDs
    - `57` event names -> `53` event NEIDs

## Final Result

Following the procedure above reproduces the extracted 5-document graph with:

- entities: **100%**
- events: **100%**
- relationship existence/types/timestamps: **100%**
- ground-truth property values: **100%**

Remaining limitation:

- exact edge citation strings and dedicated count endpoints are still not
  cleanly returned for document-ingested relationships

## Related docs

- `import/elemental-retrieval-findings.md`
- `import/Jon-graph.md`
- `.cursor/skills/document-kg-reconstruction/SKILL.md`
