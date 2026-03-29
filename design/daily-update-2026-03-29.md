# Daily Update - 2026-03-29

## What We Worked On Today

Today focused on two related threads:

- tightening the Enrichment tab so it is trustworthy in demo flow
- understanding exactly how extracted document entities resolve into canonical
  Yottagraph entities through MCP, especially for banks and other ambiguous
  organizations

The most important outcome is that we now have a clearer model for what
"resolved in the graph" means in this app and we have patched rebuild-time
canonicalization for the most important bank entities.

## MCP Process We Used

We used MCP as the primary verification surface for entity resolution.

### 1. Start from extracted labels and current app state

We compared three views of the same collection:

- the raw extracted JSON in `import/recordeval_graph_extracted.json`
- the extracted-to-NEID inventory in
  `design/extracted-entity-neid-map-2026-03-28.md`
- the live collection state from `/api/collection/bootstrap`

This let us distinguish between:

- labels present in the source documents
- labels present in app state
- labels already canonicalized to real NEIDs
- labels still exposed as `seed:` placeholders

### 2. Probe exact entity resolution through MCP

We used `elemental_get_entity` in three ways:

- exact NEID lookups
- exact strong-ID lookups such as `fdic_certificate_number`
- plain name/alias lookups

This was necessary because some entities failed strong-ID lookup but still
resolved correctly by name, while others only resolved safely through strong
IDs.

### 3. Cross-check graph adjacency through MCP

After resolving candidate entities, we used relationship/event calls such as:

- `elemental_get_related`
- `elemental_get_events`

This helped confirm whether an entity was merely resolvable or actually useful
for enrichment.

### 4. Patch rebuild-time canonicalization only when confidence was high

We only promoted extracted labels to canonical NEIDs when the resolution path
was specific and repeatable. We avoided fuzzy mappings when the same label could
resolve to the wrong entity.

## What We Learned

### The extracted JSON does not carry canonical NEIDs

The raw extracted graph is label-first, not NEID-first.

That means:

- the docs clearly mention entities like `HSBC BANK USA` and `THE BANK OF NEW YORK`
- but rebuild must still canonicalize those labels into Yottagraph NEIDs
- if rebuild does not do that, the UI will still show `seed:` entities even
  though the graph contains a valid canonical target

### "Present in documents" and "canonicalized in app state" are different

A label can be:

- present in extracted JSON
- present in live app state
- still not canonicalized to a real Yottagraph NEID

That distinction explained why some important banks were missing from the
Enrichment tab anchor preview even though they were clearly in the source
documents.

### Strong IDs are best when they work, but they do not always work uniformly

We confirmed:

- `HSBC Bank USA, National Association` resolves correctly via
  `fdic_certificate_number = 57890`
- `Bank of New York Mellon Corporation (BNY Mellon)` resolves correctly via
  `fdic_certificate_number = 639`

But we also found inconsistent behavior:

- `fdic_certificate_number = 625` did not resolve in the current tenant context
  even though the FDIC record exists
- some EDGAR/CIK lookups still fail or drift

So "the data source has the identifier" does not always mean "the MCP resolver
will return the entity through that identifier in this tenant context."

### Alias lookup is helpful but dangerous

Examples:

- `THE BANK OF NEW YORK` safely resolves to canonical BNY Mellon
- `HSBC BANK USA` by plain name can drift to the wrong HSBC-family entity
- `UNITED JERSEY BANK` by plain name drifted to an unrelated bank
- `BLX Group LLC` by plain name drifted to `BXGA L.L.C.`

Conclusion:

- exact alias-based canonicalization can be useful
- fuzzy automatic canonicalization is risky for banks and abbreviations

## What We Struggled With

### 1. Seed nodes can hide real graph availability

At first glance, seeing `seed:` nodes suggested the graph might not contain the
bank entities at all.

In reality, the graph often did contain them, but the rebuild process had not
yet canonicalized the extracted labels onto those NEIDs.

### 2. MCP resolution is not uniform across identifier families

FDIC worked well for some institutions and poorly for others.
EDGAR/CIK was even less consistent in this tenant context.

This makes it hard to rely on a single generic "look up by strong ID" rule for
all entities.

### 3. Ambiguous bank names are especially risky

These labels were problematic:

- `HSBC`
- `HSBC BANK USA`
- `THE BANK OF NEW YORK`
- `UNITED JERSEY BANK`

The graph often knows the right institution, but a generic string lookup can
land on the wrong branch, holding company, or unrelated bank.

### 4. Insight copy can overstate what enrichment adds

We also saw that if canonicalization is incomplete, enrichment insight cards can
sound more authoritative than the underlying resolution actually supports.

This was especially visible in:

- successor/acquisition lineage language
- event timeline cards that mixed extracted history with external enrichment
- people/affiliation cards when the relationship was already present in the
  document graph

## Concrete Resolution Results From Today

### Confirmed canonical bank mappings

- `HSBC BANK USA` -> `06157989400122873900`
- `THE BANK OF NEW YORK` -> `05384086983174826493`
- `HSBC Bank USA Trade Services` -> `02625373596646965640`
- `REPUBLIC NATIONAL BANK OF NEW YORK` was already correctly canonicalized as
  `04824620677155774613`

### Labels we intentionally did not auto-map

- `HSBC`
- `BLX`
- generic `UNITED JERSEY BANK`

Reason:

- current MCP behavior made these too ambiguous for safe automatic
  canonicalization

### Entities that still need caution

- `BLX Group LLC` exists as extracted entity `01470965072054453101`, but current
  name-based lookup can drift to the wrong organization
- some EDGAR/CIK-based expectations remain unresolved in this tenant context

## Code Change We Made

We patched rebuild-time seed canonicalization in:

- `server/utils/extractedSeedGraph.ts`

We added high-confidence canonical overrides for the recovered bank entities so
the streamed rebuild now seeds them directly on verified Yottagraph NEIDs rather
than temporary `seed:` IDs.

We also removed duplicate local override logic from:

- `server/api/collection/rebuild-stream.get.ts`

This keeps the canonicalization logic in one place.

## Runtime Verification

After patching, a full rebuild confirmed that the live collection now includes:

- `HSBC Bank USA, National Association`
- `Bank of New York Mellon Corporation (BNY Mellon)`
- `HSBC Bank USA Trade Services`
- `REPUBLIC NATIONAL BANK OF NEW YORK`

with canonical NEIDs and `mcpConfirmed: true`.

`npm run build` also passed after the patch.

## Product Implications

This matters for the Enrichment tab because:

- the auto-anchor preview depends on document entities already being
  canonicalized
- if a bank stays as a `seed:` node, it may not show up where users expect
- if the bank is canonicalized correctly, enrichment can use the real graph
  entity and produce more credible results

## Recommendations Going Forward

1. Keep a curated set of high-confidence canonical overrides for ambiguous but
   business-critical entities.
2. Prefer strong-ID resolution when it works; fall back to exact alias mapping
   only when validated.
3. Do not auto-map short or broad labels like `HSBC` or `BLX` without an
   additional constraint.
4. Keep documenting tenant-specific resolver failures separately from product UI
   issues.
5. Update the enrichment analysis and insight copy so they reflect the new bank
   canonicalization status and do not overstate uncertain lineage.

## Suggested Next Steps

1. Refresh `Docs/enrichment-analysis.md` to reflect the recovered bank NEIDs and
   current resolver behavior.
2. Re-test the Enrichment tab anchor preview and graph after rebuild.
3. Tighten lineage/timeline insight wording so claims align with confirmed MCP
   evidence.
