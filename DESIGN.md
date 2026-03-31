# Document Collection Intelligence - Design Document

## Project Overview

This app is evolving into a document intelligence demonstration workspace for
BNY-style document collections. It will let users inspect a source corpus,
reconstruct the document-derived knowledge graph, validate provenance, and then
expand selected entities into the broader Yottagraph graph. The experience will
also include agent-driven analysis over the normalized graph and source
documents.

**Created:** 2026-03-25  
**App ID:** cmac-test02  
**Description:** Document Collection Intelligence workspace  
**Last updated:** 2026-03-31 (overview corpus narrative upgraded with richer relationship/property grounding; enrichment tab refresh with degree-based comparison cards, full curated 1-degree graph defaults, article-backed recent coverage, and Graph & Entities header cleanup)

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

- Single-page workspace with task-oriented tabs: overview, graph & entities, events, insights, timeline, agreements, trust & coverage, ask yotta, enrichment.
- Overview is an executive intelligence briefing with a collection header, synthesized deal summary, extraction stats, a narrative case-study card without cross-tab jumps, a streamlined source-documents table, and launch cards into deeper tabs.
- Overview corpus narrative generation now includes relationship-type patterns, concrete relationship evidence samples, entity property highlights, and historical property-series coverage so the corpus description reads as graph-grounded intelligence rather than metadata-only summary.
- Overview supports complete, pending, and partial extraction states with intentional product copy and guided placeholders instead of empty analytics panels.
- Graph tab now supports analytical view modes, relationship filters, evidence-focused toggles, and shortest-path inspection between entities.
- Timeline tab emphasizes significance and confidence, supports richer filtering (domain, confidence, participant, source document, date), and keeps table/episode/timeline views aligned.
- Agreements tab reduces metadata clutter and uses expandable related-party summaries for easier scanning.
- Trust & Coverage tab reframes validation into completeness, partial coverage, provenance, and next recommended checks.
- Ask Yotta tab offers contextual prompts, confidence framing, and evidence-linked outputs grounded in entities/events/documents.
- Insights tab now provides a curated multi-category question deck, per-question execution, cache restoration, citation-first answer panels, entity pivots, and Markdown/HTML export with PDF graceful fallback.
- Enrichment now opens with an Enriched Graph comparison view that separates document truth from live 1-degree and 2-degree context, and it breaks out enrichable entities/events by type.
- Full 2-hop enrichment context is loaded during the main rebuild pipeline so enrichment views are available immediately after analysis, while primary tabs remain strict document-backed projections.
- The enrichment Graph tab now renders the full curated 1-degree entity/event neighborhood without the previous collapsed simplified default, while lineage remains available as its own subview.
- Recent Coverage in enrichment now uses article-backed results for key organizations, people, and verified project-linked locations instead of reusing graph events as a press proxy.
- Entity detail panel (right drawer) is a shared tabbed surface with fixed header/tab strip and a single scroll region; it now supports Properties, Relationships, Events (conditional), Sources, and Compare (conditional), plus in-place entity pivots from graph, events, insights, agreements, and enrichment.
- App shell supports both dark mode and light mode, with a header toggle and settings control for switching.
- Dark mode polish pass introduced layered charcoal/slate surfaces, stronger card hierarchy, improved narrative readability, and consistent pill styling across overview and analysis surfaces.
- Server routes under `/api/collection/` handle bootstrap, rebuild (MCP traversal + event discovery), entity detail, property history (raw QS), enrichment, agent actions, insight language summaries, and insight export assembly.
- All data is normalized into stable models: documents, entities, relationships, events, and property series with explicit origin labels.
- Property reporting distinguishes broad extracted/latest entity properties from narrower historical property-series coverage.
- `composables/useCollectionWorkspace.ts` manages all client state.
