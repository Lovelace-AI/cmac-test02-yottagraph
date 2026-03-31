# Document Collections Intelligence Demo PRD

## Document Status

- Version: 0.2
- Date: 2026-03-26
- Owner: Lovelace
- Status: Draft

## Product Summary

This app is a document intelligence workspace for demonstrating how a small
collection of source documents can be turned into an explorable knowledge graph
and then extended with broader Yottagraph intelligence.

The product is not a storytelling shell. Its purpose is to provide the concrete
functional surface that makes storytelling credible:

- inspect the source corpus
- reconstruct entities, properties, events, and relationships from the corpus
- validate provenance and coverage
- run agents over the extracted graph and source documents
- expand outward into broader graph context

The initial release is centered on the five BNY rebate-analysis documents and
the validated graph-reconstruction workflow already documented in this repo.

## Problem Statement

We currently have the ingredients for a strong demo, but not a single product
definition that explains what the app itself must do.

The gap is not presentation. The gap is product functionality:

- there is no focused workspace for collection-level graph reconstruction
- there is no clear separation between document-derived facts and enriched graph
  context
- there is no dedicated surface for showing agents operating over the extracted
  graph and grounded source material

As a result, a live demo can drift toward either a generic MCP tool runner or a
static visualization that does not demonstrate real analytical leverage.

## Product Objective

Create a demonstration app that proves four capabilities:

1. A document collection can be converted into a trustworthy graph of entities,
   events, properties, and relationships.
2. That graph can be inspected and validated in a way that is grounded in the
   underlying source documents.
3. Agents can operate over that graph to answer questions, summarize structure,
   and identify important entities with grounded contextual analysis.
4. The extracted graph can be expanded one to two hops into the broader
   knowledge graph to provide materially richer context than the source corpus
   alone.

## Users

### Primary users

- solutions engineers running product demos
- prospects or customers evaluating document intelligence workflows
- product and engineering teams validating MCP-backed document graph UX

### Core user jobs

- "Let me inspect the source corpus and verify what was extracted."
- "Let me explore entities, events, agreements, and relationships from the
  collection."
- "Let me see how an agent reasons over the extracted graph and sources."
- "Let me compare what came from the documents versus what was added by broader
  graph intelligence."

## Product Principles

- The app must be useful as an analytical surface, not just as a scripted demo.
- Document-derived data and enriched graph data must remain visibly distinct.
- Agent outputs must be grounded in graph data and source citations.
- The app should demonstrate analytical leverage, not generic chat.
- The app should support a guided walkthrough without hard-coding a single path.

## Goals

### Product goals

- Make document collections a first-class intelligence workspace.
- Make graph reconstruction inspectable and explainable.
- Show that agents can operate over structured graph context plus document
  provenance.
- Show that one-hop and two-hop enrichment materially improve understanding of
  the entities in the collection.

### Functional goals

- Support source document access and inspection.
- Support document-derived graph exploration by entity type, relationship type,
  event, and agreement structure.
- Support validation of extraction coverage and provenance.
- Support agent workflows that read from the normalized graph model rather than
  from isolated text snippets.
- Support enriched graph expansion from selected anchor entities.

### Engineering goals

- Use MCP as the primary discovery and traversal interface.
- Use raw Query Server property history for complete temporal fidelity where MCP
  is latest-only.
- Normalize the data into stable app-facing models for documents, entities,
  relationships, events, and property series.
- Keep the app modular enough to evolve beyond the initial BNY demo.

## Non-Goals

- Building a full document ingestion or extraction pipeline in this app
- Rebuilding the entire prior FSI document module
- Shipping enterprise permissions, corpus management, or authoring workflows
- Creating a fully general-purpose graph analysis platform in v1

## Source Material

- Demo script: `import/260325-BNY Documents Script.pdf`
- Draft collections PRD: `import/DOCUMENT_COLLECTIONS_MODULE_PRD.md`
- BNY reconstruction guide: `import/BNY-README.md`
- Retrieval evidence: `import/elemental-retrieval-findings.md`

## Core Product Areas

### 1. Collection workspace

The app must provide a collection-level landing experience that includes:

- collection identity
- document list
- collection summary metrics
- graph readiness state
- clear entry points into graph, events, agreements, validation, and agent
  workflows

### 2. Source document access

The app must let the user:

- view the BNY corpus as a concrete set of five source documents
- open the source PDFs
- understand document type, date, and role in the collection where available

### 3. Document-derived graph exploration

The app must provide an explorable view of the graph reconstructed from the
collection, including:

- entities by flavor
- typed relationships
- event nodes and participant structure
- agreement-related structures
- property detail and property history where relevant

### 4. Validation and provenance

The app must make it easy to verify:

- where an entity or relationship came from
- whether a surfaced fact is document-derived or enriched
- what extraction coverage is available for entities, events, relationships, and
  temporal properties
- where MCP is sufficient and where raw property-history access is required

### 5. Agent workspace

The app must include a surface where agents can operate over the collection
graph and its source material. The goal is not open-ended chat alone. The goal
is to demonstrate structured work over the data.

Required agent capabilities for v1:

- summarize the collection using graph-backed facts
- answer grounded questions over entities, events, agreements, and properties
- explain why a node or relationship matters in the collection
- compare document-derived context with enriched graph context
- identify promising anchor nodes for one-hop and two-hop expansion

### 6. Enrichment workspace

The app must support expansion outward from selected anchor entities to show
broader graph context, while keeping the enriched layer distinguishable from the
document-derived layer.

## Agent Requirements

### Agent inputs

Agents must be able to work over:

- normalized document metadata
- normalized entity, relationship, and event records
- property series where relevant
- provenance and origin labels
- selected graph neighborhoods

### Agent constraints

- Agent responses must remain grounded in available graph and document context.
- The app must make it possible to cite or inspect the underlying supporting
  entities, relationships, events, or documents.
- The app must distinguish between agent synthesis and source facts.

### Agent interaction patterns

The product should support both:

- guided actions such as "summarize this collection," "explain this entity," or
  "expand this node"
- freeform questions over the loaded collection graph

## Functional Requirements

### Collection and documents

- The app must anchor the demo in a named document collection.
- The app must display the five BNY documents as the initial corpus.
- The app must preserve document identity and support opening the PDF source.

### Graph reconstruction

- The app must reconstruct entities, events, relationships, and property series
  from the BNY collection.
- The app must maintain source-document associations where available.
- The app must expose counts and filtered views by flavor, relationship type,
  and event category.

### Graph inspection

- The app must allow entity detail inspection.
- The app must show properties, relationships, and relevant provenance for a
  selected node.
- The app must support visual graph exploration without requiring direct MCP
  tool use by the end user.

### Event and agreement analysis

- The app must show the events extracted from the collection.
- The app must support timeline and structured-list views for events.
- The app must provide a dedicated agreement or legal-structure surface.

### Validation

- The app must expose provenance and coverage framing for entities, events,
  relationships, and temporal properties.
- The app must not imply that enriched facts came directly from the source PDFs.

### Agent operations

- The app must provide prebuilt agent actions over the loaded collection graph.
- The app should show the inputs or evidence the agent used when feasible.
- The app should allow the user to pivot from an agent answer into the
  underlying graph entities or source documents.

### Enrichment

- The app must support outward expansion from selected anchor entities.
- The app must clearly label which nodes and edges are document-derived versus
  broader-graph enrichment.
- The app should default to one hop and support expansion to two hops for
  selected anchors.

## Functional Scope

### V1

- BNY collection landing experience
- document list and PDF open flow
- overview summary with extraction counts
- graph view for document-derived nodes and edges
- event timeline or table
- agreement structure view
- validation and provenance summary
- agent workspace with grounded graph actions
- one-hop and two-hop enrichment from selected anchor entities

### V1.1

- richer agent task presets
- side-by-side comparison of document-derived context vs enriched context
- saved workspace states for anchor entities and graph views
- stronger citation overlays on graph and agent outputs

## Data and System Requirements

- MCP is the discovery and traversal layer for graph exploration.
- Raw `POST /elemental/entities/properties` is required for complete temporal
  property history and relationship-row validation.
- The app must use document NEIDs as the starting point for reconstruction.
- The app must use NEIDs, not names, as canonical internal identifiers once
  traversal begins.
- The app must treat events as hop-2 discoveries in the BNY dataset.
- The app must preserve an origin model that distinguishes at least:
    - document-derived data
    - enriched graph data
    - agent-generated synthesis

## Success Metrics

- A user can inspect the five BNY documents and the reconstructed graph in one
  workspace.
- A user can distinguish document-derived facts from enriched graph facts.
- At least one agent workflow clearly demonstrates useful work over the loaded
  graph, not just conversational output.
- One-hop and two-hop expansion reveal context that is not obvious from the
  document set alone.

## Risks

- Document-derived relationship provenance is not exposed in one perfectly clean
  endpoint and may require normalization.
- MCP property responses are latest-only, which can confuse timeline work if the
  raw property-history layer is omitted.
- A two-hop expansion can become noisy without strong entity selection and
  filtering.
- Agent UX can collapse into generic chat if tasks, evidence, and pivots are
  not explicit in the product design.

## Open Questions

1. Which agent actions are required for the first usable demo?
2. Which enriched entity types should be visible by default in one-hop and
   two-hop expansion views?
3. Should agreement structure be its own surface or a filtered mode of the main
   graph workspace?
4. Should the first version compute the BNY graph live on demand, or ship with
   a precomputed base graph and on-demand enrichment?
