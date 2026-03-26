# Document Collections Module

## PRD for Separate MCP-Backed App

**Version:** 0.3  
**Date:** 2026-03-25  
**Owner:** Lovelace  
**Status:** Proposed

---

## 0. Document Purpose

This PRD defines a standalone `Document Collections` app that can browse, inspect, and analyze multi-document corpora, starting with the BNY document set accessible through the Elemental MCP staging environment.

The major architectural difference from the FSI app module is:

- the standalone app does **not** perform document ingestion
- the standalone app does **not** perform document extraction
- the standalone app does **not** assemble entities, relationships, and events from a local database
- the standalone app reads documents and graph data from the configured MCP-backed source, starting with `pip.stg`

---

## 1. Executive Summary

The existing app already has a generalized document-collection model and extraction lifecycle, but it is embedded inside a larger multi-module product. We should turn that capability into a focused standalone app because document collections are a distinct analyst workflow with their own operational needs, UX, and deployment cadence.

The immediate product reason is simple: we should be able to access the BNY documents through the `pip.stg` Elemental MCP server and use that as the anchor corpus for a standalone collection-centric experience.

V1 should prioritize:

1. MCP-backed access to BNY documents and collection metadata
2. a clean collection browser and document viewer
3. MCP-backed retrieval of entities, relationships, and events for the active collection
4. graph-backed handoff into downstream analysis views

---

## 2. Problem Statement

Today, document collections live inside a broader application that also covers portfolio monitoring, news, lineage, sanctions, and many unrelated workflows. That creates three problems:

1. The document workflow is harder to explain, demo, and evolve because it is not the primary product surface.
2. The current FSI app implementation assumes local collection/extraction concepts that are not the right model for a read-only MCP-backed app.
3. The integration point that matters most for the next step, MCP-backed access to BNY documents and graph data in `pip.stg`, deserves a product surface designed around collections rather than around local extraction jobs.

---

## 3. Product Thesis

`Document Collections` should be a collection-first app, not a graph feature hidden inside a larger product.

The separate app should make one idea obvious:

`A user can connect to Elemental MCP, open a collection such as BNY, inspect the underlying documents, retrieve entities/relationships/events for that collection from MCP, and move from raw corpus to graph-backed analysis in one focused workflow.`

---

## 4. Goals

### 4.1 Product Goals

- Make document collections a first-class product surface.
- Support BNY as the first high-value MCP-backed corpus.
- Let users move from collection -> document -> MCP graph context without switching products.
- Reduce dependence on baked-in local document snapshots for core access paths.

### 4.2 Engineering Goals

- Keep the app modular so it can live independently from FSI Monitor.
- Prefer MCP-backed retrieval as the system of record for collection and graph data.
- Avoid coupling the standalone app to local upload/extraction/database workflows.
- Keep credential handling server-side or environment-driven where possible.

### 4.3 Demo Goals

- Open a BNY collection from `pip.stg`.
- Show the source documents.
- Show collection-linked entities, relationships, and events from MCP.
- Open graph-backed outputs without exposing implementation clutter.

---

## 5. Non-Goals

- Rebuilding the entire FSI Monitor app
- Reproducing every Document Graph visualization in v1
- Multi-tenant permissions and enterprise admin tooling in v1
- Local upload, extraction, or corpus authoring workflows in v1
- Long-term archival/storage strategy for all corpora in v1

---

## 6. Users

### 6.1 Primary Users

- solutions engineers
- demo operators
- analysts reviewing a known collection
- product and engineering teams validating MCP-backed document access

### 6.2 Core User Jobs

- "Open the BNY collection and verify the documents are available."
- "Inspect what documents exist and then load the graph context for this collection."
- "See the entities, relationships, and events without waiting for a local pipeline."
- "Open the graph-backed artifacts for analysis."

---

## 7. Product Scope

### 7.1 V1 Scope

- collection list view
- collection detail page
- document list with metadata
- in-app document open/view flow
- MCP-backed graph summary for the active collection
- entities / relationships / events retrieval for the active collection
- ready-state indicator for MCP graph availability
- MCP connectivity diagnostics for the configured environment

### 7.2 V1.1 Scope

- collection search and filters
- per-document preview summaries
- richer MCP diagnostics and failure-state messaging
- direct handoff into graph/chat/case-study tabs

### 7.3 Future Scope

- multi-collection comparison
- saved analyst annotations
- collection-level sharing and permissions
- bulk collection onboarding workflows owned by upstream systems

---

## 8. MCP Connectivity Requirements

### 8.1 Required MCP Endpoint

The separate app should target the Elemental MCP staging deployment:

- **MCP URL:** `https://mcp.pip.stg.g.lovelace.ai/elemental`

### 8.2 Authentication Contract

The deployed MCP environment requires bearer-token authentication.

- **Authorization header:** `Authorization: Bearer <dev-token>`

### 8.3 Dev Token Requirement

Use the existing dev-token flow documented for Elemental MCP:

```bash
moongoose/golib/api/auth/generate-dev-token.sh "yourname@lovelace.ai" "Your Name"
```

Then configure the MCP client with:

```json
{
    "mcpServers": {
        "lovelace-elemental": {
            "type": "streamableHttp",
            "url": "https://mcp.pip.stg.g.lovelace.ai/elemental",
            "headers": {
                "Authorization": "Bearer <your-dev-token>"
            }
        }
    }
}
```

### 8.4 Credential Handling Requirement

The app must support a real bearer token at runtime, but the live token should not be committed into versioned product docs or source files. The implementation should accept the token via environment variable, secret manager, or secure operator input.

Suggested runtime variables:

- `NUXT_ELEMENTAL_MCP_URL=https://mcp.pip.stg.g.lovelace.ai/elemental`
- `NUXT_ELEMENTAL_MCP_AUTH_TOKEN=<dev-token>`

### 8.5 MCP as Graph Source of Truth

For the standalone app, `pip.stg` MCP is the source of truth for graph data.

- collection-linked `entities` must come from MCP, not a local app database
- collection-linked `relationships` must come from MCP, not a local app database
- collection-linked `events` must come from MCP, not a local app database
- the app may normalize or cache MCP responses for UX, but it should not derive primary graph state from local extraction tables

---

## 9. Why BNY First

BNY is the right initial corpus because:

- it is already used as a known document-collection example in this repo
- it is valuable for proving real document access rather than synthetic demo content
- it gives the separate app a concrete "MCP-backed collection" story on day one
- it exercises the exact workflow we care about: collection access, document viewing, and MCP-backed graph retrieval

---

## 10. Functional Requirements

### 10.0 Core Architecture Rule

- The standalone app is a read-only MCP consumer for collection and graph data.
- The standalone app must not require local upload, local extraction, or local graph assembly to function.
- The standalone app may include a thin server adapter for auth, normalization, and proxying, but not a document-processing pipeline.

### 10.1 Collection Discovery

- The app must list available collections from the configured provider.
- Each collection should expose:
- `id`
- `name`
- `description`
- `status`
- `document_count`
- graph availability / MCP readiness
- last updated timestamp

### 10.2 Collection Detail

- The app must show collection metadata and current lifecycle state.
- The app must show whether graph artifacts are available.
- The app should show collection-level graph summary counts when available.

### 10.3 Document Access

- The app must list source documents for a collection.
- The app must let the user open a document in-browser.
- The app must support at least PDF access for BNY documents.
- The app should preserve document filenames and source ordering where possible.

### 10.4 MCP Graph Retrieval

- The app must retrieve collection-linked entities from MCP.
- The app must retrieve collection-linked relationships from MCP.
- The app must retrieve collection-linked events from MCP.
- The app must make clear that these payloads are remote MCP-backed data, not locally extracted session state.

### 10.5 Graph Readiness

- The app must indicate when graph artifacts are available.
- The app should provide a clean handoff into graph-backed views or downstream apps.

### 10.6 MCP Diagnostics

- The app must show whether the MCP URL is configured.
- The app must show whether a token is configured.
- The app should expose a lightweight connectivity check before the user starts work.

---

## 11. Relationship to the Existing FSI Module

The current FSI app module is useful as a UX and domain reference, but the standalone app should not inherit its local ingestion/extraction assumptions.

The key difference must remain explicit:

- FSI module: local collection model with upload/extract/status concepts
- standalone app: MCP-backed collection model with remote documents and remote graph data

Reusable concepts from the FSI module:

- collection-first navigation
- document viewing
- graph-readiness indicators
- normalized client-side collection state

Concepts that should **not** be carried over as core app behavior:

- upload routes
- extraction trigger routes
- extraction progress polling
- local database as the source for collection entities/relationships/events

---

## 12. Product Architecture

### 12.1 Recommended Architecture

- frontend: standalone Nuxt app
- backend: thin server adapter for MCP auth, collection normalization, document proxying, and graph-payload normalization
- provider layer: MCP-first

### 12.2 Provider Strategy

- **Primary mode:** Elemental MCP provider for BNY and future remote collections
- **No local extraction mode:** local ingestion/extraction should not be a requirement for the standalone app

### 12.3 Security Boundary

- The browser should not be the only holder of the MCP secret.
- A server-side adapter should be able to attach the bearer token to MCP requests.
- Logs and diagnostics must never echo the raw token value.

### 12.4 MCP Tool Mapping

The app should map its graph views to MCP-native calls rather than DB reads.

- entity lookup / summary: `elemental_get_entity`
- related graph context: `elemental_get_related` and `elemental_graph_neighborhood`
- relationship retrieval: `elemental_get_relationships`
- event retrieval: `elemental_get_events`

If collection-specific document enumeration or binary fetch requires an additional adapter layer, that adapter should still treat MCP-backed systems as the upstream source of truth.

---

## 13. UX Requirements

- The default landing screen should be the collection list, not a graph.
- The collection detail page should prioritize clarity over density.
- The document list should make it obvious which files are available and clickable.
- The app should make it obvious that graph data is loaded from MCP, not from a local processing run.
- Error states should clearly separate:
- missing collection
- missing documents
- missing MCP graph data
- graph not ready
- MCP misconfiguration
- authentication failure

---

## 14. Success Metrics

- BNY collection can be opened successfully from `pip.stg`
- users can retrieve and open BNY source documents reliably
- users can retrieve collection-linked entities, relationships, and events from MCP reliably
- graph-ready state is visible and trustworthy
- demo operators can explain the workflow in under two minutes

---

## 15. Risks

- MCP collection/document semantics may not exactly match the current filesystem-backed app model.
- BNY access may have environment-specific auth or availability constraints.
- A separate app can drift from the current document-graph logic if payload normalization is not explicit.
- Collection-to-graph mapping may require an intermediate normalization layer if MCP does not expose a first-class collection object.
- Putting raw credentials into product docs or source control would create unnecessary operational risk.

---

## 16. Open Questions

1. Does `pip.stg` expose BNY as a first-class collection object, or will the app need a thin server-side mapping layer?
2. What is the canonical MCP path for enumerating documents inside a collection and retrieving the binary payload?
3. What is the canonical MCP contract for scoping entities, relationships, and events to a specific collection?
4. Do we want BNY branded explicitly in the standalone app, or keep the demo-safe naming pattern used elsewhere in this repo?

---

## 17. Recommended Delivery Phases

### Phase 1

- standalone app shell
- MCP config
- collection listing
- BNY collection detail
- document open flow

### Phase 2

- MCP graph summary
- graph readiness indicators
- diagnostics panel

### Phase 3

- graph handoff
- richer previews
- operational hardening

---

## 18. Build Recommendation

The implementation should start as an MCP-first standalone app with a thin normalization layer, not as a copy of the full FSI Monitor document-graph feature. The core rule is that collection documents plus collection-linked entities, relationships, and events come from `pip.stg` MCP, not from local ingestion, extraction, or database assembly inside the app.

---

## 19. Appendix: Reusable UX Patterns

This appendix captures four interaction patterns already proven in the FSI app and related document-graph experiences. The standalone `Document Collections` app should reuse these patterns rather than reinventing them.

### 19.1 Timeline UI Pattern

The app currently uses two complementary timeline patterns, and both are relevant to the standalone document app:

1. **Dense analytical timeline**
2. **Narrative event card timeline**

#### A. Dense analytical timeline

For high-volume event exploration, the existing app uses a horizontally scrollable / zoomable SVG timeline with:

- time-axis ticks
- swim lanes by canonical event type or sentiment band
- zoom presets
- pan and wheel interaction
- filter controls for event type, severity, date range, and search
- a toggle between timeline and table views

This is the right pattern when the user needs to inspect many events across a document collection and understand temporal clustering, event density, and category distribution.

For the standalone app, this pattern should be used for:

- collection-level event exploration
- entity-specific event history
- event filtering before graph pivots

#### B. Narrative event card timeline

For story-like or briefing-style views, the app also uses a reusable vertical timeline card pattern where each event renders as:

- a connector line and dot
- event date and optional time
- event type badge
- title and description
- related entity chips
- provenance/source link

This is the right pattern when the user is reading a curated narrative rather than scanning a dense event set.

For the standalone app, this pattern should be used for:

- document collection summaries
- AI-generated case briefs
- "key developments" or "what changed" views

#### Timeline implementation rule

The standalone app should support both modes:

- **analysis mode:** dense interactive timeline
- **briefing mode:** vertical narrative timeline cards

The app should not force a single timeline component to serve both jobs poorly.

### 19.2 Citation Pattern

The citation model in the broader Lovelace stack is evidence-first and should carry over directly.

#### A. Data model

Elemental MCP already supports session-scoped citation tracking:

- individual properties can carry inline citation refs such as `[1]`
- the MCP session bibliography provides the resolved citation list
- citations can represent filings, articles, sanctions, events, and other source types

The important implementation rule is:

- answers and summaries should keep inline citation references in the body
- the UI should also provide a structured supporting-sources panel

#### B. UI presentation

The existing UI uses two complementary citation surfaces:

1. **Inline references inside generated prose**
2. **Collapsible supporting citations below the answer**

The collapsible citation section should include:

- source name
- source type
- date or qualifier
- short excerpt or detail
- outbound link when available

For filings and provenance strings, the app already uses compact provenance links that resolve into a clickable SEC filing URL. The standalone app should preserve that pattern for filing-style citations and use the same compact-chip presentation where possible.

#### C. Standalone app requirement

For the `Document Collections` app:

- every material AI-generated claim should be traceable to a citation
- MCP bibliography/session provenance should be normalized into a frontend citation model
- citations should be readable without opening a separate debug view
- citations should be clickable when the source URL or document route is available

### 19.3 Tooltip Pattern

The current app uses three tooltip layers, each for a different job.

#### A. Lightweight hover hints

For inline highlighted entities or simple controls, the app uses light hover hints such as:

- native `title` text
- small Vuetify tooltips

These are appropriate when the user only needs a fast label or type hint.

#### B. Rich explanatory tooltips

For chips, risk indicators, and compact analytical UI, the app uses richer tooltips with:

- a clear header
- supporting explanation text
- lists of contributing signals
- short, domain-specific interpretation

These are appropriate when the UI surface is compact but the concept needs explanation.

#### C. Entity preview tooltips

For graph nodes and entity previews, the app uses custom tooltip panels that can show:

- entity name
- type icon and color
- ticker / CIK / identifier
- degree or connection count
- a "click for details" affordance

These are appropriate when the user is hovering in a graph or over a compact entity surface and needs just enough preview context to decide whether to click.

#### Tooltip implementation rule

The standalone app should use tooltips intentionally:

- **light hint** for inline references and controls
- **rich tooltip** for compact explanatory metrics
- **entity preview tooltip** for graph or network hover states

Tooltips should not become mini-pages. If the user needs deeper context, hover should lead naturally into a click target or side panel.

### 19.4 Clickable Entity Keywords in Responses

This is an important existing pattern and should be treated as a first-class UX feature in the standalone app.

#### A. Rendering model

The current app renders markdown or answer HTML first, then post-processes the rendered HTML to wrap known entity names in clickable spans.

The proven pattern is:

1. build a list of known entities in scope
2. sort longest names first to avoid partial-match collisions
3. regex-wrap matching entity names in `<span>` elements
4. attach metadata as `data-*` attributes such as:

- `data-entity-id`
- `data-entity-name`
- `data-entity-type`
- optional identifiers like CIK or jurisdiction

5. style the wrapped text with:

- semantic color
- dashed underline
- pointer cursor
- hover title/tooltip

This allows plain generated prose to become interactive without requiring the model itself to emit app-specific markup.

#### B. Click handling model

The current app uses delegated click handling on the container that owns the rendered `v-html` content.

That is the correct pattern because:

- the highlighted spans are created after markdown rendering
- direct Vue event binding is not available inside raw HTML
- delegated click handling keeps the implementation simple and robust

On click, the app can:

- open an entity side panel
- select the entity in the graph
- trigger a pivot to an entity detail screen
- load additional detail from already-fetched collection data

#### C. Hover behavior

The clickable entities should also carry a lightweight hover affordance:

- entity type in the tooltip/title
- semantic color by type
- visible underline or style change on hover

This helps users recognize that the text is interactive before they click.

#### D. Standalone app requirement

For the `Document Collections` app:

- AI responses should support clickable entity references by default
- the entity list used for wrapping should come from the MCP-backed collection context
- clicking an entity reference should open a side panel or graph pivot
- the app should not depend on the LLM to emit its own entity tags

### 19.5 Recommended Integration Sequence

The standalone app should implement these four patterns in this order:

1. Normalize MCP entities, relationships, events, and bibliography into a stable frontend model.
2. Use that model to drive timeline views and provenance/citation surfaces.
3. Post-process rendered AI responses to wrap collection-scoped entity names as clickable references.
4. Attach delegated click handlers so hover and click behavior stay consistent across summaries, chat answers, and briefing panels.

### 19.6 Why This Appendix Matters

Without these patterns, the standalone app would still be able to show documents and graph data, but it would lose much of the usability and explainability already proven in the FSI app:

- timelines make temporal reasoning legible
- citations make claims defensible
- tooltips make dense UI understandable
- clickable entity references turn generated prose into navigation

Those are not cosmetic features. They are a core part of how the app becomes analyst-usable rather than just data-accessible.
