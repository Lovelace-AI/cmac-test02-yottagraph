# Document Collection Module Tab UI

## PRD for Events, Legal Agreements, Timeline, Insights, and Agents

**Version:** 1.0  
**Date:** 2026-03-28  
**Owner:** Lovelace  
**Status:** Proposed

---

## 0. Document Purpose

This PRD defines how to build the five most analyst-facing tabs in the `Document Collection` module:

1. `Events`
2. `Legal Agreements`
3. `Timeline`
4. `Insights`
5. `Agents`

The goal is not to invent five isolated screens. The goal is to define one coherent analyst workflow that moves from extracted evidence, to legal structure, to temporal reasoning, to analytical synthesis, to explainable AI assistance.

This document is grounded in the current `features/document-graph` implementation, but it reframes the UI around the `Document Collection` product language and clarifies which behaviors are essential versus incidental.

---

## 1. Executive Summary

The `Document Collection` module should feel like an analyst workstation for a case file, not a generic tabbed dashboard.

These five tabs serve distinct jobs:

- `Events` is the operational event explorer.
- `Legal Agreements` is the contractual structure and agreement-inspection workspace.
- `Timeline` is the cross-document change analysis workspace.
- `Insights` is the guided analytical Q&A and report-generation workspace.
- `Agents` is the explainability and guided-question workspace.

Together they should answer five analyst questions:

1. What happened?
2. What governs the deal?
3. How did facts change across documents and time?
4. What analytical questions can the system answer from this corpus, and what report can it produce?
5. How does the AI system reason over this corpus, and what should I ask next?

---

## 2. Product Thesis

The UI should expose extracted structure in the order analysts naturally use it:

1. scan material events
2. inspect the governing agreements
3. compare the evolution of facts across documents
4. ask and answer analytical questions over the graph
5. use agents to synthesize and interrogate the graph

The tabs should therefore be:

- evidence-first
- visibly grounded in source documents
- optimized for side-panel pivots into entities
- consistent in controls, layout rhythm, and empty states

---

## 3. Goals

### 3.1 Product Goals

- Make the five tabs feel like core product surfaces, not supporting diagnostics.
- Preserve analyst trust by keeping all views visibly tied to extracted graph data.
- Support both demo storytelling and real exploration of dense document collections.
- Make handoff into entity detail and AI chat feel natural from every tab.

### 3.2 UX Goals

- Keep each tab focused on one primary job.
- Minimize mode confusion inside each tab.
- Use compact controls for scanning, but provide rich detail on demand.
- Keep the right-side entity panel and chat panel as shared cross-tab pivots.

### 3.3 Engineering Goals

- Build each tab as a feature-local component under `features/document-graph/components/`.
- Keep tab state local unless it is reused across tabs or drawers.
- Reuse shared data already normalized by `useDocumentGraph()`.
- Prefer presentational components plus composables over route-level logic.

---

## 4. Non-Goals

- Rebuilding the entire module information architecture
- Defining extraction or backend pipeline changes
- Replacing the overview, graph, entities, relationships, or insights tabs
- Turning the `Agents` tab into a general-purpose prompt playground
- Building full document review or redlining tooling inside `Legal Agreements`

---

## 5. Primary Users and Jobs

### 5.1 Users

- analysts reviewing complex filings or deal packages
- solutions engineers demoing document intelligence
- product and engineering teams validating extraction quality
- compliance or diligence users trying to understand obligations and chronology

### 5.2 Core Jobs

- "Show me the most important events and let me filter noise."
- "Show me which agreements matter and who the key parties are."
- "Show me how important facts changed across versions or source documents."
- "Show me what questions this collection can answer and give me an exportable brief."
- "Show me how the agent system reaches answers, and help me ask the next question."

---

## 6. Shared Shell and Navigation Rules

These five tabs should share a common shell pattern so the module feels coherent.

### 6.1 Shared Layout Contract

- `FeatureHeader` remains at the page level.
- `DocumentSelector` remains directly above the tabs.
- Tab content fills the remaining height inside one `v-card`.
- Each tab owns one primary scroll container.
- Right-side drawers stay global:
- entity drawer for click-through detail
- chat drawer for AI follow-up

### 6.2 Shared Interaction Rules

- Clicking an entity anywhere should open or update the entity side panel.
- Tabs should preserve their own local filter state while the collection remains loaded.
- When the selected collection changes, tab-local filters reset unless the user benefit of persistence is obvious.
- Empty states must explain why the tab is empty:
- no extracted data
- filters excluded all results
- the selected entity or document lacks comparable data

### 6.3 Shared Visual Rules

- Use compact filter bars at the top of dense tabs.
- Use chips for counts, facets, and active scope.
- Prefer one strong primary visualization plus one supporting detail region.
- Avoid multiple competing scroll areas inside the same tab.

---

## 7. Shared Entity Detail Panel

### 7.1 Purpose

The `Entity Detail Panel` is the shared drill-down surface for the entire `Document Collection` module. It should give the user one consistent place to inspect an entity without losing their position in the current tab.

### 7.2 Naming and Surface Rule

The product can refer to this surface as the `Entity Detail Panel`. The current implementation uses a right-side drawer, and that should remain the default interaction pattern rather than a centered modal.

Reasoning:

- the user should retain visual context from the originating tab
- entity inspection is usually a side-task, not a route change
- side-panel behavior supports rapid compare-and-close workflows

### 7.3 Invocation Rules

The panel should open when the user:

- clicks an entity in the graph
- clicks an entity row or chip in a tab
- clicks an entity reference inside generated `Insights` or chat prose
- clicks an entity-linked party from `Legal Agreements`
- pivots from an event whose primary entity is known

Opening a new entity should replace the current panel contents rather than stacking multiple modals.

### 7.4 Layout Contract

The panel should be a right-side temporary drawer with:

1. fixed header
2. fixed tab strip
3. one scrollable content region

The recommended default width is approximately `480px`, with responsive adjustment on narrower screens.

### 7.5 Header Requirements

The header should include:

- entity icon by type
- entity display name
- entity type chip
- subtype chip when available
- short description when available
- alias or `also known as` chips when available

The header should make the entity legible in under a second.

### 7.6 Entity Linkage and Verification Banner

When enrichment or database-linkage context exists, the panel should show a dedicated verification banner below the header.

This banner should support:

- matched database name when different from extracted label
- confidence indicator
- identifier chips such as `CIK`, `ticker`, or other canonical IDs
- document-only / tranche-only badge when the match is document-scoped rather than canonical
- outbound pivot such as `View in Studio` when a richer entity destination exists

### 7.7 Corporate and Career Context

When available, the panel should also surface:

- confirmed employer for people
- career chain summary for people
- parent entity linkage for organizations
- successor entity linkage for organizations
- short explanatory note when entity-resolution context is partial or nuanced

These linked entities should be clickable and should replace the panel contents with the newly selected entity.

### 7.8 Panel Tab Structure

The panel should support a stable tab set, with conditional rendering when data is missing:

1. `Properties`
2. `Relationships`
3. `Events`
4. `Sources`
5. `Compare`

`Events` should only appear when entity-linked events exist.

`Compare` should only appear when document-level property history exists.

### 7.9 Properties Tab Requirements

The `Properties` tab should be the default tab.

It should include:

- a summary of which source documents mention the entity
- a property table
- inline snippet support when property evidence exists
- a short narrative that interprets the captured property set

The property table should suppress noisy internal keys and foreground analyst-meaningful fields.

### 7.10 Relationships Tab Requirements

The `Relationships` tab should help the user understand how the entity connects to the rest of the collection.

It should include:

- a compact ego-network or mini-graph when relationships exist
- a short narrative explaining the relationship posture of the entity
- a list of inbound and outbound relationships
- relationship type chips
- source document linkage
- snippet evidence when available

If no relationships are present, the tab should say so explicitly.

### 7.11 Events Tab Requirements

The `Events` tab should render the entity-specific event history in a compact form.

It should include:

- a vertical timeline list
- event date
- event title or type
- severity treatment
- speculative-state treatment
- click-through to the parent event context when relevant

This tab should be a focused entity event view, not a duplicate of the main `Events` tab.

### 7.12 Sources Tab Requirements

The `Sources` tab is the provenance view.

It should include:

- mention snippets
- source-document links
- page references when available
- a short provenance narrative summarizing how broadly the entity appears across the corpus

If the entity has neither source documents nor snippets, the tab should say that clearly.

### 7.13 Compare Tab Requirements

The `Compare` tab should appear when the entity has per-document properties.

It should show:

- one section per source document
- document identifier and report date
- the extracted properties for that document

This tab is a localized version of the main `Timeline` concept, but scoped to one entity and designed for quick inspection rather than full comparative analysis.

### 7.14 Cross-Panel Navigation Rules

The panel should support quick pivots without disorienting the user.

Rules:

- clicking a linked entity inside the panel replaces the current entity in-place
- the originating page tab stays unchanged
- closing the panel returns the user to the same scroll position and tab context they started from

### 7.15 Responsive Behavior

- On desktop, use the right drawer pattern.
- On smaller screens, the panel may expand to a larger percentage of viewport width.
- If necessary on mobile, the same content can become a full-screen sheet, but the information architecture should remain the same.

### 7.16 Accessibility Requirements

- The panel must be keyboard reachable and dismissible.
- The active tab must be conveyed through text and state, not color alone.
- Relationship and source links must have readable labels.
- Evidence snippets must remain selectable and readable for screen magnification.

### 7.17 Success Criteria

- A user can inspect an entity without losing the context of the originating tab.
- A user can understand what the entity is, how it connects, and where it appears in the documents from one surface.
- A user can pivot from one entity to another in a single continuous side-panel workflow.

---

## 8. Information Architecture

Recommended top-level order for these tabs:

1. `Events`
2. `Legal Agreements`
3. `Timeline`
4. `Insights`
5. `Agents`

Reasoning:

- `Events` is the highest-value first analytical pass.
- `Legal Agreements` explains structure and governing instruments.
- `Timeline` is more comparative and analytical, so it should follow after basic orientation.
- `Insights` should follow once the user has enough context to ask analytical questions or generate a report.
- `Agents` should come last because it explains and extends the system rather than being the first raw-data surface.

If the broader module retains additional tabs, these five should still preserve that relative order.

---

## 9. Tab 1: Events

### 8.1 Purpose

The `Events` tab is the main event intelligence workspace. It should help a user filter, scan, and interpret extracted events across the collection.

### 8.2 User Promise

"I can quickly understand the event landscape, identify material developments, and pivot into the related entities."

### 8.3 Core UX Pattern

The tab should support two primary modes and one secondary mode:

1. `Timeline` mode for dense temporal exploration
2. `Table` mode for precise scanning and sorting
3. `Simulation` mode as an optional advanced view for event dynamics

The primary default should be `Timeline`.

### 8.4 Layout

The tab should use a three-band layout:

1. top filter bar
2. optional legend row when timeline mode is active
3. main content area

### 8.5 Top Filter Bar Requirements

The filter bar should include:

- total event count chip
- canonical event type chip filters
- severity multi-select
- speculative toggle
- free-text search
- from/to date filters
- view-mode toggle
- zoom controls when timeline mode is active

The filter bar should remain compact and always visible.

### 8.6 Timeline View Requirements

The timeline view should be the signature surface for this tab.

It should support:

- horizontal time axis
- swim lanes by canonical event type
- colored event dots by category
- event size by severity
- special treatment for speculative events
- wheel zoom
- drag pan
- hover preview
- click to select the event and associated entity
- visible "today" line when the time domain includes the present

### 8.7 Table View Requirements

The table view should be optimized for exact lookup and validation.

It should support:

- sortable rows
- compact event title / type / severity / date columns
- source document visibility
- entity click-through
- consistent filter behavior with the timeline view

### 8.8 Event Detail Behavior

Clicking an event should:

1. highlight the event in the active view
2. open the related entity in the shared side panel when a primary entity exists
3. preserve the current filters and viewport

### 8.9 Empty and Error States

- If the collection has no events, explain that no extracted events were found.
- If filters remove all results, show a clear "no events match your filters" state with one-click reset.
- If event dates are incomplete, still render the table view and degrade the timeline gracefully.

### 8.10 Success Criteria

- A user can isolate a small set of high-severity events in under 10 seconds.
- A user can switch between timeline and table views without losing context.
- A user can pivot from an event to an entity without changing tabs.

---

## 10. Tab 2: Legal Agreements

### 9.1 Purpose

The `Legal Agreements` tab is the contractual structure workspace. It should help users understand the agreement set, the governing deal framework, and the major parties involved.

### 9.2 Naming Rule

The user-facing label should be `Legal Agreements`, not just `Agreements`, because the longer label is clearer and more analyst-friendly.

### 9.3 User Promise

"I can see which legal instruments define this deal, how they relate structurally, and which agreements deserve close review."

### 9.4 Core UX Pattern

This tab should combine:

1. one high-level structural visualization
2. one explanatory narrative
3. one searchable agreement inventory
4. one drill-down detail surface

### 9.5 Layout

The tab should use a vertically stacked analytical layout:

1. summary banner
2. legal structure card
3. key parties card
4. searchable agreement inventory
5. agreement detail modal or side surface

### 9.6 Summary Banner Requirements

The summary banner should show:

- total agreement count
- counts by agreement subtype
- source document count

This banner should make the scope legible before the user scrolls.

### 9.7 Legal Structure Card Requirements

The top card should combine visual structure and explanatory context.

It should include:

- a concise AI-generated narrative summarizing the deal framework
- a regenerate action
- a radial or hub-and-spoke structural diagram
- visual emphasis for the most important agreements
- a legend by agreement subtype
- an affordance to jump to the full inventory

The structure visualization does not need to claim literal legal dependency unless the underlying data supports that claim. It should instead present a practical structural summary based on significance, subtype, and party relationships.

### 9.8 Key Parties Requirements

The tab should surface recurring parties across agreements as chips or ranked items.

Clicking a party should:

- filter the inventory, or
- open the entity side panel if that party resolves to a graph entity

### 9.9 Agreement Inventory Requirements

The inventory should support:

- text search across agreement name, subtype, and parties
- grouped and flat modes
- count feedback for filtered results
- strong empty states when no agreements match search
- click-through to agreement detail

### 9.10 Agreement Detail Requirements

The detail surface should show:

- agreement name
- subtype
- date if known
- key parties
- source documents
- extracted summary or notable clauses when available
- links or actions to inspect related entities

### 9.11 Success Criteria

- A user can understand the agreement landscape without reading every filing.
- A user can locate one agreement by name, subtype, or party in seconds.
- A user can explain the deal structure from the top card alone during a demo.

---

## 11. Tab 3: Timeline

### 11.1 Purpose

The `Timeline` tab is not another event browser. It is the cross-document comparison workspace for entity facts over time.

### 11.2 User Promise

"I can select an entity and see how its properties changed across the document set."

### 11.3 Product Distinction

This tab must remain clearly distinct from `Events`:

- `Events` answers: what happened and when?
- `Timeline` answers: how did entity facts evolve across documents?

### 11.4 Core UX Pattern

The tab should be entity-driven:

1. select an entity
2. inspect numeric trends
3. inspect document-by-document value changes
4. scan highlighted changes

### 11.5 Layout

The layout should be:

1. entity selector row
2. selection empty state when no entity is chosen
3. numeric trend cards when numeric properties exist
4. property-by-document comparison table
5. notable changes list

### 11.6 Entity Selector Requirements

The selector should:

- only include entities with useful document-level property history
- show entity type icon
- show document-count badge
- support search and clear

### 11.7 Trend Card Requirements

When numeric temporal properties exist, the tab should render sparkline cards that show:

- property name
- latest value
- percent change when computable
- first and last date labels
- visual directionality

These cards are for fast scanning, not statistical precision.

### 11.8 Comparison Table Requirements

The table is the core analytical artifact in this tab.

It should provide:

- sticky property column
- one column per document ordered chronologically
- document date labels
- value cells with visual change highlighting
- graceful missing-value treatment

### 11.9 Notable Changes Requirements

The tab should derive a concise list of notable property changes and show:

- property name
- from value
- to value
- from document
- to document
- directional icon

### 11.10 Empty and Edge Cases

- If no entity is selected, explain what the tab does.
- If the selected entity lacks numeric trends, still render the comparison table.
- If there are no cross-document properties, show that clearly rather than presenting an empty table silently.

### 11.11 Success Criteria

- A user can explain how one entity changed across the document set without opening raw documents.
- Numeric and non-numeric evolution are both visible from one workflow.
- The tab is clearly understood as comparison, not event chronology.

---

## 12. Tab 4: Agents

### 12.1 Purpose

The `Agents` tab explains the multi-agent system and gives the user a guided handoff into AI interaction.

### 12.2 Naming Rule

The product label should be `Agents`. The current `How It Works` phrasing is useful as subtitle copy inside the tab, but the tab label should be short and scannable.

### 12.3 User Promise

"I can understand how the system answers questions over the collection, and I can immediately try that workflow."

### 12.4 Core UX Pattern

This tab is a guided explainer plus launch surface. It should combine:

1. a system-level overview
2. an answer-pipeline visualization
3. per-agent cards
4. example workflow cards
5. clickable starter questions

### 12.5 Layout

The tab should use a long-form explanatory layout with sections:

1. header bar with `Ask a Question` CTA
2. hero section
3. question-to-answer pipeline
4. agent detail grid
5. production workflows
6. starter questions

### 12.6 Hero Requirements

The hero should make three things obvious:

- this is a multi-agent system
- it works over the knowledge graph extracted from the collection
- answers are evidence-backed rather than freeform

The hero stats should reflect live collection context when available:

- entities
- relationships
- documents
- properties

### 12.7 Pipeline Requirements

The pipeline should visualize the default question flow from user input to answer output.

It should support:

- ordered step nodes
- active state highlighting
- visual continuity between steps
- clear role text for each stage

When live chat orchestration state is available, the pipeline should reflect it.

### 12.8 Agent Card Requirements

Each card should explain:

- agent name
- role
- capabilities
- current active/idle state
- "in this system" translation of its job

The goal is legibility, not technical exhaustiveness.

### 12.9 Workflow Card Requirements

Workflow cards should demonstrate that the same agent types support different analytical tasks. They should map:

- a user question
- the participating agents
- the role each agent plays

At least one card should represent the current document collection demo flow.

### 12.10 Starter Question Requirements

Starter questions should behave as launch affordances, not static examples.

Clicking one should:

1. open the shared chat panel
2. prefill or trigger the suggested question
3. preserve the current collection scope

### 12.11 Success Criteria

- A first-time user can understand the system in under one minute.
- The tab increases trust rather than reading like marketing copy.
- Users naturally transition from explanation into asking a question.

---

## 13. Tab 5: Insights

### 13.1 Purpose

The `Insights` tab is the analytical question-and-answer workspace for the collection. It should turn the extracted graph into a reusable set of evidence-backed investigations and exportable deliverables.

### 13.2 Naming Rule

The user-facing label should remain `Insights`. That is the clearest label for a tab that combines guided questions, generated answers, and report export.

### 13.3 User Promise

"I can run a curated set of analytical questions against this collection, inspect evidence-backed answers, and export the results as a polished deliverable."

### 13.4 Core UX Pattern

This tab should combine five jobs in one coherent workflow:

1. orient the user with a collection overview
2. organize analytical questions by category
3. let the user answer one question or all questions
4. expose evidence, entity pivots, and usage metadata
5. generate exportable reports and briefings

The tab is therefore both:

- an analyst workbench
- a report assembly surface

### 13.5 Layout

The tab should use a vertically scrollable narrative layout with:

1. sticky toolbar
2. progress state when bulk answering is active
3. document overview section
4. categorized question sections
5. report-generation dialog when export is in progress
6. podcast player surface when audio briefing output exists

### 13.6 Toolbar Requirements

The top toolbar should include:

- primary `Answer All Questions` action
- `Reset` action when answers exist
- `Export Analysis` menu with multiple formats
- quick `Export PDF` action when applicable
- `Ask a Question` action that opens the shared chat drawer
- answered-count chip
- cache-status chip when results are restored from cache
- token and cost summary when usage exists

The toolbar should make three states obvious:

- how much analysis has already been completed
- whether results are cached
- whether the current collection has enough extracted data to export

### 13.7 Document Overview Requirements

The top section should orient the user before they read any generated answer.

It should include:

- a short narrative summary of what the collection covers
- the analyzed document list with type and date
- entity breakdown by type
- extraction stats such as relationship count, property count, and top relationship types

The overview should read like a case-study preface, not a raw debug dump.

### 13.8 Question Deck Requirements

Questions should be grouped into clear analytical categories.

Each category section should show:

- icon
- title
- answered count versus total count
- the ordered set of questions in that category

Each question card should include:

- question number
- question text
- run button when unanswered
- loading state while the answer is being generated
- completion status once answered

### 13.9 Answer Presentation Requirements

Answered question cards should render:

- the formatted answer body
- interactive entity references inside the answer text
- supporting sources or snippets in a collapsible section

The answer surface should prioritize readability:

- markdown rendering
- moderate line length
- clear spacing between question and answer
- compact but visible evidence controls

### 13.10 Evidence and Citation Requirements

Every answered question should support evidence inspection without leaving the tab.

The minimum evidence surface is:

- collapsible supporting sources
- source snippet text
- associated entity name
- property or fact label when available

The tab should preserve the repo-wide evidence-first pattern:

- inline interactive references in prose
- explicit supporting-source disclosure below the answer

### 13.11 Entity Interaction Requirements

The tab should turn answer prose into navigation.

Known entity names in rendered answers should be post-processed into clickable references that:

- carry entity metadata
- show a lightweight hover affordance
- open the shared entity side panel on click

This behavior should not depend on the model emitting custom markup.

### 13.12 Question Execution Requirements

The tab should support:

- single-question execution
- bulk `Answer All Questions`
- reset of the current answer set
- persistent restoration of prior answers when the collection fingerprint matches

Bulk execution should show visible progress so the user understands that the system is working through a question deck rather than stalling.

### 13.13 Cache and Usage Requirements

The tab should expose operational metadata in a lightweight way:

- whether the current answer set is cached
- total token usage
- total estimated cost
- answered count versus total questions

This should improve trust and observability without pushing the user into a diagnostics view.

### 13.14 Export Requirements

The `Insights` tab is the primary export surface for collection analysis.

It should support:

- `HTML` report export
- `Markdown` report export
- `PDF` report export
- `Podcast` or narrated briefing export when supported

Export should be framed as `Export Analysis`, not just file download, because the system is assembling a multi-section analytical artifact.

### 13.15 Report Assembly Requirements

When generating a report, the tab should show an explicit multi-step progress dialog.

The report pipeline should include at least:

1. graph visualization capture
2. case study overview generation
3. summary narrative generation
4. agreements overview generation
5. timeline analysis generation
6. agent architecture narrative generation
7. final assembly

This progress UI should show that export is a real synthesis workflow, not an instantaneous file conversion.

### 13.16 Report Content Requirements

The exported artifact should feel like a coherent case-study report.

It should include:

- collection and generation metadata
- overview narrative
- executive summary
- document inventory
- entity and relationship summary
- legal agreements overview
- graph visuals when available
- events timeline visual when available
- timeline analysis
- answered analytical questions
- agent architecture or methodology section

The report should degrade gracefully when screenshots or optional sections are unavailable.

### 13.17 Audio Briefing Requirements

If podcast export is supported, the user experience should include:

- visible generation state
- player surface when audio is ready
- clear error message when generation fails

The audio artifact should be presented as an analytical briefing, not a novelty feature.

### 13.18 Relationship to Chat

`Insights` and the shared chat drawer serve different jobs:

- `Insights` = curated question deck and exportable analysis
- chat drawer = open-ended follow-up questioning

The `Ask a Question` action in this tab should therefore open the chat drawer as an extension of the analysis flow, not as a replacement for the tab.

### 13.19 Success Criteria

- A user can run a full analytical question set without leaving the tab.
- A user can inspect supporting evidence for each answered question.
- A user can export a credible case-study artifact directly from the tab.
- The tab feels like a synthesis workspace, not a pile of generated text.

---

## 14. Cross-Tab Interaction Requirements

These five tabs should reinforce each other.

### 14.1 Shared Pivots

- `Events` -> entity side panel
- `Legal Agreements` -> entity side panel or agreement detail
- `Timeline` -> selected entity context
- `Insights` -> entity side panel, supporting evidence, export flow, and chat drawer
- `Agents` -> chat panel

### 14.2 Recommended Future Pivots

- `Events` -> prefiltered `Timeline` for a clicked entity
- `Legal Agreements` -> prefiltered `Events` for agreement-linked parties
- `Timeline` -> `Events` for the selected entity
- `Insights` -> deep link to `Events`, `Legal Agreements`, or `Timeline` when a generated answer centers on one of those domains
- `Agents` -> deep link into the relevant tab when an answer references events or agreements

---

## 15. Data and State Requirements

These tabs should rely on normalized collection data from `useDocumentGraph()` or its renamed successor.

### 15.1 Required Frontend Data Shapes

- `events`
- `entities`
- `relationships`
- `documents`
- per-entity `properties_by_document`
- agreement-like entities with subtype and source metadata
- persisted insights question set, answers, supporting snippets, usage, and cache fingerprint state
- enrichment / verification / linkage state for entity detail rendering

### 15.2 State Ownership

- collection-level graph data lives in the shared composable
- tab-local filters live in the tab component
- selected entity lives in shared state so the side panel stays global
- insights question/answer/cache state should live in a dedicated composable so it survives tab switches
- chat panel visibility and live agent activity remain shared page state

---

## 16. Accessibility and Responsiveness

- All interactive charts must have keyboard-accessible fallbacks where practical.
- Dense visualizations must preserve a usable table or list alternative.
- Long chip rows should wrap rather than overflow invisibly.
- Generated answers and supporting-source toggles must be keyboard reachable.
- Export progress should be visible through both text and progress indicators.
- On narrower screens, the module may stack controls or simplify legends, but it should not remove the primary task of the tab.

---

## 17. Delivery Plan

### Phase 1: Naming and Shell Alignment

- Align tab labels to `Events`, `Legal Agreements`, `Timeline`, `Insights`, and `Agents`
- Ensure shared top-level shell and drawer behavior are consistent
- Normalize empty-state copy
- Formalize the shared `Entity Detail Panel` contract across all tab pivots

### Phase 2: Core Tab Polish

- Finalize `Events` timeline/table behavior
- Finalize `Legal Agreements` structure card and inventory drill-down
- Finalize `Timeline` comparison workflow
- Finalize `Insights` question deck, evidence presentation, and export flow
- Finalize `Agents` handoff into chat
- Finalize the entity panel tabs, linkage banner, and cross-entity replacement behavior

### Phase 3: Cross-Tab Pivots

- Add deep links and prefiltered transitions between tabs
- Add richer source-document linking from events and agreements
- Add answer-driven tab pivots from agent responses

---

## 18. Success Metrics

- Users can identify a material event, a governing agreement, one cross-document fact change, and at least one evidence-backed analytical answer in a single session without assistance.
- Demo operators can explain the difference between `Events`, `Legal Agreements`, `Timeline`, and `Agents` clearly.
- Demo operators can explain the difference between `Insights` and `Agents` clearly.
- Users can open the entity panel from any major tab and understand the entity without additional navigation.
- Users click from one tab into side-panel detail or chat often enough to show the tabs are connected rather than siloed.
- The tabs feel collection-native and evidence-backed rather than generic BI screens.

---

## 19. Recommendation

Build these five tabs as one coherent analyst workflow, but keep each tab narrow in purpose:

- `Events` for event exploration
- `Legal Agreements` for contractual structure
- `Timeline` for fact evolution across documents
- `Insights` for curated analytical Q&A and exportable reporting
- `Agents` for system explainability and guided questioning

That separation is what makes the module understandable. If any tab starts trying to answer multiple jobs at once, the UI will feel impressive but harder to use.
