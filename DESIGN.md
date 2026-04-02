# Context Intelligence - Design Document

## Project Overview

This app is evolving into a document intelligence demonstration workspace for
BNY-style document collections. It will let users inspect a source corpus,
reconstruct the document-derived knowledge graph, validate provenance, and then
expand selected entities into the broader Yottagraph graph. The experience will
also include agent-driven analysis over the normalized graph and source
documents.

**Created:** 2026-03-25  
**App ID:** cmac-test02  
**Description:** Context Intelligence workspace  
**Last updated:** 2026-03-31 (Ask Yotta now preserves a scrolling multi-turn conversation with follow-up context, evidence-used callouts, and stronger brief/gap-answer routing; overview corpus narrative upgraded with richer relationship/property grounding; enrichment tab refresh with degree-based comparison cards, full curated 1-degree graph defaults, article-backed recent coverage, Graph & Entities header cleanup, an editorial-style News/Recent Coverage feed hierarchy, and a graph-aware deduped News feed with explicit primary/secondary entity context, snippet expansion, analytical sorting, and stable filter-loading skeleton states; corporate lineage tab redesigned into a compact evidence-first analyst view with structured expandable support panels and scan controls; rebuild pipeline now hydrates flavor-specific core entity/event properties and context-agent guidance documents explicit schema-to-PID property retrieval; new Build Network project-first onboarding supports preset/document/entity seeded network creation, project-scoped cache bootstrap/rebuild, dynamic seed NEID orchestration, richer live workspace-preparation progress detail with in-flight event hub activity/ETA reporting, and explicit MCP failure messages in verbose rebuild progress)

## Vision

Build a collection-first intelligence app that:

- anchors the experience in a known document collection
- reconstructs entities, properties, events, and relationships from that
  collection
- distinguishes document-derived graph facts from broader graph enrichment
- lets users inspect provenance and temporal property history
- demonstrates agents working over the graph and source documents
- supports one-hop and two-hop graph expansion for contextual enrichment

## Configuration

| Setting        | Value                            |
| -------------- | -------------------------------- |
| Authentication | Not yet configured               |
| Query Server   | https://stable-query.lovelace.ai |

## Cross-Cutting Concepts

- The app uses a two-layer data model:
    - MCP tools for graph discovery, traversal, and interactive exploration
    - raw Query Server property-history access for full temporal fidelity
- The experience is collection-first, not tool-first.
- The app must preserve explicit origin labeling for:
    - document-derived graph data
    - enriched broader-graph data
    - agent-generated synthesis
- Agent workflows should be grounded in normalized graph state and source
  provenance, not ad hoc prompt-only reasoning.

## Query Server Best Practices

- Treat document-derived graph reconstruction as a **two-layer workflow**:
    - MCP tools for discovery, traversal, and interactive debugging
    - raw Query Server property-history access for full temporal fidelity
- Always start document-centric graph exploration from **document NEIDs**.
- Always use `limit: 500` on `get_related` unless there is a strong reason not to.
- Use traversal NEIDs as the source of truth. Do not rely on name lookup for verification once a NEID has been discovered.
- Expect events to live at **hop 2**, not hop 1, for document-derived graphs like the BNY dataset.
- For full property history, use raw `POST /elemental/entities/properties` through the tenant gateway. MCP wrappers typically expose only the latest property value.
- For canonical entity profiles, do not assume a default entity lookup returns
  hard IDs, addresses, aliases, or descriptions. Explicitly request
  flavor-specific core property names, map those names to PIDs from
  `GET /elemental/metadata/schema`, and then fetch values via
  `POST /elemental/entities/properties`.
- Maintain a curated core-property set per flavor
  (`organization`, `person`, `financial_instrument`, `location`,
  `fund_account`, `event`) so the app and agents consistently ask for
  company IDs, address fields, summaries, and other canonical metadata.
- Treat relationships and events as supporting context when scalar properties
  are absent, not as a substitute for schema-backed entity profiles.
- For app design, separate:
    - entity discovery
    - event discovery
    - typed relationship assembly
    - temporal property series
- If a future UI displays timeline or comparison views, build those from raw property-history rows keyed by `(eid, pid, recorded_at)`, not from MCP property snapshots.
- Document coverage should be described in two ways:
    - graph existence coverage (entities/events/relationships present in KG)
    - tool-surface coverage (what MCP directly exposes vs what raw Query Server exposes)

## Pages

### Home: Collection Intelligence Workspace

Name: Document Collections Intelligence Workspace  
Route: `/`  
Description: Main workspace for the BNY collection, including source documents,
document-derived graph exploration, validation, agent actions, and enrichment.  
Implementation status: **v1 complete**  
Details:

- Single-page workspace with task-oriented tabs: overview, graph & entities, events, timeline, agreements, trust & coverage, ask yotta, enrichment.
- Workspace now starts with a Build Network step when no project is active, where users can select a preset project or create one from document/entity NEIDs before entering the analysis tabs.
- Overview is an executive intelligence briefing with a collection header, synthesized deal summary, extraction stats, a narrative case-study card without cross-tab jumps, a streamlined source-documents table that renders the first eight entries up front, lazy-loads the rest, and enriches project seed rows with resolved flavor/date metadata when the graph has that context, and launch cards into deeper tabs.
- Overview pending/processing states are strictly project-scoped: header labels, seed-source counts, source metadata, and date ranges must derive from the active project and currently traversed graph evidence, never from legacy preset collections.
- Overview corpus narrative generation now includes relationship-type patterns, concrete relationship evidence samples, entity property highlights, and historical property-series coverage so the corpus description reads as graph-grounded intelligence rather than metadata-only summary.
- Overview supports complete, pending, and partial extraction states with intentional product copy and guided placeholders instead of empty analytics panels.
- Graph tab now supports analytical view modes, relationship filters, evidence-focused toggles, and shortest-path inspection between entities; the main Graph & Entities view now defaults Source-backed only to on so initial exploration is document-backed.
- Timeline tab emphasizes significance and confidence, supports richer filtering (domain, confidence, participant, source document, date), and keeps table/episode/timeline views aligned.
- Timeline Financials now includes a structured Notable Changes analysis module with grouped-by-metric and feed modes, severity-ranked deltas, summary stats, expandable provenance details, and an optional Gemini narrative with deterministic fallback.
- Agreements tab reduces metadata clutter and uses expandable related-party summaries for easier scanning.
- Trust & Coverage tab reframes validation into completeness, partial coverage, provenance, and next recommended checks.
- Ask Yotta now behaves as a true in-session conversation: new questions append to a scrolling thread instead of replacing the prior answer, and follow-up turns carry compact recent chat context into orchestration.
- Ask Yotta surfaces evidence-used lines alongside each answer so users can see what collection grounding informed the response instead of only seeing a final narrative.
- Agent Workflow Architecture now surfaces explainable, example-rich live status updates per stage (planning targets, context entity/property examples, composition evidence previews), uses a typewriter-style reveal for incoming trace lines, removes connector label clutter, and applies agent-color card accents for faster visual parsing.
- Ask Yotta tab offers contextual prompts, confidence framing, and evidence-linked outputs grounded in entities/events/documents.
- Enrichment now opens with an Enriched Graph comparison view that separates document truth from live 1-degree and 2-degree context, and it presents the "What The World Graph Adds" signal cards directly below the comparison metrics.
- Corporate Lineage in enrichment now uses a compact conclusion-first list with structured metadata (relationship type, date, support, confidence) and expandable evidence sections (documents, event anchors, referenced entities, grounding notes) instead of chip-heavy narrative cards.
- Full 2-hop enrichment context is loaded during the main rebuild pipeline so enrichment views are available immediately after analysis, while primary tabs remain strict document-backed projections.
- The enrichment Graph tab now renders the full curated 1-degree entity/event neighborhood without the previous collapsed simplified default, while lineage remains available as its own subview.
- Recent Coverage in enrichment now uses article-backed results for key organizations, people, and verified project-linked locations instead of reusing graph events as a press proxy.
- Enrichment News and Recent Coverage now render with reusable editorial feed components: compact filter bars, lightweight group headers, headline-first article rows, mandatory date/fallback metadata, and subdued sentiment/relevance treatment across light and dark modes.
- Enrichment News now defaults to a deduped graph-aware article view that merges repeated cross-entity articles, surfaces primary vs also-mentioned matched entities with unique-mention counts, explains why each match occurred, supports strongest-connection/recent/relevance sorting, and preserves layout with in-place loading indicators during filter refreshes.
- Entity detail panel (right drawer) is a shared tabbed surface with fixed header/tab strip and a single scroll region; it now supports Properties, Relationships, Events (conditional), Sources, and Compare (conditional), plus in-place entity pivots from graph, events, agreements, and enrichment.
- App shell supports both dark mode and light mode, with a header toggle and settings control for switching.
- Dark mode polish pass introduced layered charcoal/slate surfaces, stronger card hierarchy, improved narrative readability, and consistent pill styling across overview and analysis surfaces.
- Server routes under `/api/collection/` handle bootstrap, rebuild (MCP traversal + event discovery), entity detail, property history (raw QS), enrichment, agent actions, insight language summaries, and insight export assembly.
- Bootstrap and rebuild are now project-scoped (`projectId`) and accept dynamic seed NEIDs; rebuild now starts directly from the active project's seeded entity roots instead of preloading the legacy extracted document baseline, and the BNY 5-document set remains available as a preset project.
- Workspace-preparation progress now emits live event-expansion heartbeat detail, including active hub labels, recent completions, elapsed runtime, and rough ETA so long-running initial analysis no longer appears stalled.
- Verbose rebuild progress now preserves and displays real MCP failure messages from the server log so cloud runs expose timeout/gateway/session issues instead of only showing a generic error badge.
- The rebuild pipeline explicitly hydrates flavor-specific core properties for
  resolved entities and events so the detail panel and agent context have
  access to canonical profile fields, not just relationship-derived context.
- In Ask Yotta orchestration, treat deterministic collection context as
  authoritative and only merge context-agent additions that pass NEID and row
  shape validation.
- Ask Yotta planning now heuristically routes broad briefing prompts toward
  `executive_summary` and evidence-quality questions toward `risk_gaps` when
  planner output is too generic, so the context/composition stages avoid
  devolving into top-entity/top-event inventories.
- Ask Yotta fallback context now includes coverage heuristics, relationship
  examples, event milestones, and recent turn history hints so the composition
  stage has narrative-ready evidence for both briefing and gap-analysis
  questions.
- For context-agent retrieval, once a valid NEID exists (from planner input,
  fallback context, or prior tool call), reuse that NEID directly and do not
  re-resolve by name unless identity verification is explicitly requested.
- Context-agent profile evidence must be grounded to tool-returned
  schema-backed scalar properties (for example, from
  `get_entity_profile_record`), not synthesized placeholders.
- All data is normalized into stable models: documents, entities, relationships, events, and property series with explicit origin labels.
- Property reporting distinguishes broad extracted/latest entity properties from narrower historical property-series coverage.
- `composables/useCollectionWorkspace.ts` manages all client state.
