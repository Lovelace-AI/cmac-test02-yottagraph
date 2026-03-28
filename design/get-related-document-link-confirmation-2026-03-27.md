# What We Tested and What It Means (Plain-English Version)

## The short version

We checked whether the system can correctly answer a simple question:

**"For each entity, which source documents does it appear in?"**

We ran this check using only NEIDs (the unique IDs), as requested.

## Why this test matters

This app depends on linking entities back to the 5 BNY source documents.
If those links are wrong, the dashboard and validation views can be confusing.

## How we tested it (without technical jargon)

For each entity in the current app state:

1. We took the entity's unique ID (NEID).
2. We asked MCP for that entity's document links (`appears_in`).
3. We compared MCP's answer to what the app currently stores as that entity's source documents.

Important detail: some IDs come back with extra leading zeros.
We normalized those so we do not count formatting differences as errors.

## Results (after padded-NEID update + fresh rebuild)

- Rebuild completed at: `2026-03-28T02:33:12.616Z`
- Total entities checked: **108**
- Perfect matches: **99**
- Not perfect matches: **9**

### Good news

There were **zero cases** where expected document links were missing.
So MCP did not "lose" the core links we expected.

### What is still off

In 9 cases, MCP returned **one extra document link** compared to what the app currently stores.
All 9 extras point to the same source document:

- `02051052947608524725` -> **Interim Rebate Analysis (2015)** (`docId 7438596`)

So the issue is not "missing links."
The issue is "MCP says this entity appears in one more document than our app list currently shows."

## What this means in plain terms

The NEID-based retrieval path is working.

The remaining mismatch is a **sync/parity issue** between:

- live MCP `appears_in` output, and
- the app's stored `sourceDocuments` values.

In other words, the data sources are close, but not fully in lockstep for 9 entities.
The gap is now very specific: these 9 entities include one additional mention in the 2015 document.

## The 9 entities with an extra document link

1. `Report` (`08879090567778783678`) -> extra doc `02051052947608524725`
2. `Certificate as to Arbitrage` (`09073217463430168172`) -> extra doc `02051052947608524725`
3. `Transmittal Letter` (`05121003150070824032`) -> extra doc `02051052947608524725`
4. `INTERIM ARBITRAGE REBATE ANALYSIS` (`05651499468729638165`) -> extra doc `02051052947608524725`
5. `Notes and Assumptions` (`09013206385896288509`) -> extra doc `02051052947608524725`
6. `Prior Report` (`03844814106996110754`) -> extra doc `02051052947608524725`
7. `Schedule B - Sources & Uses of Funds` (`04662206365284782208`) -> extra doc `02051052947608524725`
8. `Schedule A - Summary of Rebate Analysis` (`03190929743969324823`) -> extra doc `02051052947608524725`
9. `Temporary Treasury Regulations Section 1.148-4T(e)(2)` (`00996175972460951893`) -> extra doc `02051052947608524725`

## Bottom line

If your main question is "Are NEID-based document relationships working?":
**Yes.**

If your main question is "Are we at exact parity everywhere?":
**Not yet.** We still have 9 "extra-link" differences to reconcile in app state.
