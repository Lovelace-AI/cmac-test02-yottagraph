# Agent Pipeline UX

## PRD for Reusable Agent Steps and Summary Meta Bar Components

**Version:** 1.0  
**Date:** 2026-03-26  
**Owner:** Lovelace  
**Status:** Extracted from production implementation

---

## 0. Document Purpose

This PRD defines the reusable **Agent Pipeline UX** pattern: the animated multi-step agent progress indicator and the companion summary meta bar used to show token usage, cost, and generation metadata. The pattern is designed for any application that calls an LLM-backed pipeline through an MCP server and Knowledge Graph, and wants to give the user real-time visibility into what the system is doing.

This document extracts the pattern from the existing FSI Monitor implementation so that other applications built on the same MCP / Knowledge Graph infrastructure can adopt it without reverse-engineering component internals.

---

## 1. Executive Summary

When a user triggers an AI-powered operation (summary generation, chat Q&A, entity analysis), the system does not simply show a spinner. Instead, it displays a **multi-step agent pipeline** that names each agent in the pipeline, shows its current status (pending, working, completed), and optionally reports per-step duration and detail text. After completion, a **summary meta bar** shows the model used, token counts (prompt and completion), estimated cost, entity counts, read time, and user feedback controls.

Together, these two elements accomplish three goals:

1. **Transparency** — the user sees what the system is doing, not just that it is loading.
2. **Trust** — naming the agents (Dialogue Agent, Context Agent, etc.) makes the AI pipeline legible.
3. **Observability** — token usage, cost, and per-step duration give operators and analysts concrete metrics without opening a debug console.

---

## 2. Problem Statement

A plain loading spinner or skeleton screen tells the user nothing about what is happening inside an LLM pipeline. For applications built on MCP-backed Knowledge Graphs, the pipeline often involves multiple logical stages — intent parsing, entity resolution, context assembly, composition — that each take measurable time. Hiding that structure:

- makes long waits feel arbitrary
- prevents users from diagnosing which stage is slow or failing
- misses an opportunity to demonstrate the sophistication of the agent architecture
- provides no cost or token feedback to operators managing LLM spend

---

## 3. Product Thesis

Every AI-powered operation in a Lovelace application should expose its agent pipeline structure to the user through a consistent, branded progress animation and a post-completion metadata bar. This pattern should be portable across applications without requiring each app to re-invent the UX.

---

## 4. Goals

### 4.1 Product Goals

- Give users real-time visibility into multi-step AI operations.
- Make the agent taxonomy (Dialogue, Extraction, Context, Composition) a visible product concept.
- Show post-completion metadata (model, tokens, cost, duration) without requiring a separate diagnostics view.
- Support user feedback (thumbs up/down) on generated output.

### 4.2 Engineering Goals

- Provide a purely presentational agent-steps component that any application can drop in.
- Keep the component stateless — the host application owns the step data and animation timing.
- Provide a companion meta bar component with a chip-based layout for usage, cost, model, and entity counts.
- Define clear TypeScript interfaces so host applications can produce step data from any backend shape.

### 4.3 Demo Goals

- During a live demo, the agent pipeline animation makes the system look intentional and sophisticated rather than "loading."
- The meta bar gives the presenter concrete numbers to cite ("that summary used 4.9k input tokens and cost less than a penny").

---

## 5. Non-Goals

- Real-time server-push of agent traces (the presentational component accepts props; the host app decides how to source them).
- A universal agent orchestration framework — this PRD covers the UX layer only.
- Persisting agent step history to a database (the host app may choose to do this, but the components do not require it).
- Error recovery or retry logic — the components display error states but do not manage retries.

---

## 6. Component Architecture

### 6.1 Component 1: Agent Steps (`SummaryAgentSteps`)

A stateless, presentational component that renders a vertical list of agent pipeline steps.

#### Props

| Prop          | Type                    | Default  | Description                                              |
| ------------- | ----------------------- | -------- | -------------------------------------------------------- |
| `steps`       | `GenerationAgentStep[]` | required | The ordered list of pipeline steps to display            |
| `showDetails` | `boolean`               | `false`  | Whether to show the optional `detail` text for each step |

#### `GenerationAgentStep` Interface

```typescript
interface GenerationAgentStep {
    agent: string; // Display name, e.g. "Dialogue Agent"
    icon: string; // MDI icon key, e.g. "mdi-head-question"
    color: string; // Vuetify color or hex, e.g. "deep-purple"
    status: 'completed' | 'working' | 'pending';
    summary: string; // Short status text, e.g. "Understanding your question..."
    detail?: string; // Optional longer description of what this step does
    durationMs?: number; // Elapsed time once completed
}
```

#### Visual Behavior

| Status      | Icon                     | Color   | Text                                   |
| ----------- | ------------------------ | ------- | -------------------------------------- |
| `pending`   | `mdi-circle-outline`     | grey    | Summary text (dimmed)                  |
| `working`   | `mdi-loading` (spinning) | primary | Summary text (active)                  |
| `completed` | `mdi-check-circle`       | success | Summary text + optional duration badge |

#### Rendering Rules

- Steps render in array order, top to bottom.
- Only the `working` step shows a spinning icon.
- Duration is formatted as `Xms` (under 1s) or `X.Xs` (1s and above).
- The component does **not** manage timers, polling, or animation sequencing. The host application mutates the `steps` array to drive transitions.

---

### 6.2 Component 2: Summary Meta Bar (`SummaryMetaBar`)

A horizontal chip bar that displays post-generation metadata and user feedback controls.

#### Props

| Prop                  | Type                               | Default               | Description                                 |
| --------------------- | ---------------------------------- | --------------------- | ------------------------------------------- |
| `entityCount`         | `number?`                          | —                     | Total entities in scope                     |
| `selectedEntityCount` | `number?`                          | —                     | If subset selected, shows `X/Y` format      |
| `entityLabel`         | `string`                           | `"companies"`         | Label for entity count chip                 |
| `eventCount`          | `number?`                          | —                     | Number of events analyzed                   |
| `readTime`            | `string?`                          | —                     | Estimated read time, e.g. `"~5 min read"`   |
| `timePeriod`          | `string?`                          | —                     | Analysis window, e.g. `"30-day analysis"`   |
| `model`               | `string?`                          | —                     | Model identifier, e.g. `"gemini-2.5-flash"` |
| `usage`               | `SummaryUsage?`                    | —                     | Token usage and cost data                   |
| `showUsage`           | `boolean`                          | `true`                | Whether to show token and cost chips        |
| `feedback`            | `'positive' \| 'negative' \| null` | —                     | Current feedback state                      |
| `feedbackLoading`     | `boolean`                          | `false`               | Whether feedback submission is in progress  |
| `feedbackLabel`       | `string`                           | `"Was this helpful?"` | Label for feedback section                  |
| `showFeedback`        | `boolean`                          | `true`                | Whether to show feedback controls           |
| `agentSteps`          | `SummaryAgentStep[]`               | `[]`                  | Completed steps for compact inline summary  |
| `showAgentDetails`    | `boolean`                          | `false`               | Whether the detail expansion is open        |

#### `SummaryUsage` Interface

```typescript
interface SummaryUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    model?: string;
    latency_ms?: number;
}
```

#### Chip Layout (left to right)

1. **Entity count** — primary color, flat variant, icon `mdi-domain`
2. **Event count** — grey tonal, icon `mdi-calendar-alert`
3. **Read time** — grey tonal, icon `mdi-clock-outline`
4. **Time period** — grey tonal, icon `mdi-calendar`
5. **AI Model** — deep-purple tonal, icon `mdi-robot`
6. **Token usage** — blue-grey tonal, icon `mdi-counter`, format: `Xk in / Yk out`
7. **Cost** — success tonal, icon `mdi-currency-usd`, format: `$X.XX` or `<$0.01`
8. **Agent summary** — compact inline text, e.g. `"4 steps in 8.2s"` with show/hide toggle

Right side: **Feedback** — thumbs up/down with label.

#### Slots

- `prepend` — content before the first chip
- `append` — content after the last standard chip

#### Events

- `feedback(type: 'positive' | 'negative')` — user clicked a feedback button
- `update:showAgentDetails(value: boolean)` — user toggled agent detail visibility

#### Formatting Rules

- Token counts: `1234` → `1.2k`, `1234567` → `1.2M`
- Cost: `0` → `$0.00`, `0.003` → `<$0.01`, `1.23` → `$1.23`
- Model names: map internal identifiers to display names (e.g. `gemini-2.5-flash` → `Gemini 2.5 Flash`)

---

### 6.3 Component 3: Summary Chat Section (`SummaryChatSection`)

A collapsible chat panel that integrates `SummaryAgentSteps` for in-chat loading state.

#### Props

| Prop               | Type                      | Default                         | Description                                       |
| ------------------ | ------------------------- | ------------------------------- | ------------------------------------------------- |
| `endpoint`         | `string`                  | required                        | POST endpoint for follow-up messages              |
| `requestBody`      | `Record<string, unknown>` | required                        | Base request body merged with message and history |
| `title`            | `string`                  | `"Portfolio Q&A"`               | Chat section heading                              |
| `assistantLabel`   | `string`                  | `"Portfolio Assistant"`         | Name shown on assistant messages                  |
| `collapsedLabel`   | `string`                  | `"Ask a follow-up question"`    | CTA button text when collapsed                    |
| `inputPlaceholder` | `string`                  | `"Ask a follow-up question..."` | Input field placeholder                           |
| `suggestions`      | `string[]`                | `[]`                            | Quick-start suggestion chips                      |

#### Behavior

1. Chat starts collapsed with a CTA button.
2. On expand, shows chat history, input field, and suggestion chips (if no history).
3. On send, seeds 3-step agent animation (Dialogue → Context → Response).
4. On API response, marks all steps completed, then fades agent steps after 2.5 seconds.
5. Renders assistant responses as markdown.

---

## 7. Standard Agent Taxonomy

The following agent names and icons are used consistently across the codebase. New applications should adopt this taxonomy for visual consistency.

### Summary Generation Pipeline (4 steps)

| Step | Agent Name             | Icon                             | Color                      | Working Text                 | Completed Text        |
| ---- | ---------------------- | -------------------------------- | -------------------------- | ---------------------------- | --------------------- |
| 1    | Dialogue Agent         | `mdi-head-question`              | `deep-purple`              | Interpreting question        | Intent understood     |
| 2    | Data Extraction Agent  | `mdi-magnify-scan`               | `blue`                     | Identifying relevant data... | Data targets selected |
| 3    | Context Assembly Agent | `mdi-database-search`            | `teal` / `purple`          | Assembling context...        | Context assembled     |
| 4    | Composition Agent      | `mdi-file-document-edit-outline` | `amber-darken-2` / `green` | Generating response...       | Analysis complete     |

### Chat Pipeline (3 steps)

| Step | Agent Name     | Icon                            | Color            | Working Text               |
| ---- | -------------- | ------------------------------- | ---------------- | -------------------------- |
| 1    | Dialogue Agent | `mdi-head-question`             | `deep-purple`    | Interpreting question      |
| 2    | Context Agent  | `mdi-newspaper-variant-outline` | `teal`           | Fetching relevant evidence |
| 3    | Response Agent | `mdi-creation`                  | `amber-darken-2` | Composing response         |

### Knowledge Graph Insights Pipeline (4 steps)

| Step | Agent Name              | Icon | Working Text                     | Completed Text      |
| ---- | ----------------------- | ---- | -------------------------------- | ------------------- |
| 1    | Dialogue Agent          | —    | Understanding your question...   | Question understood |
| 2    | Entity Extraction Agent | —    | Identifying relevant entities... | Entities identified |
| 3    | Context Assembly Agent  | —    | Querying knowledge graph...      | Context assembled   |
| 4    | Composition Agent       | —    | Generating answer with Gemini... | Answer generated    |

Applications may extend this taxonomy with domain-specific agents (e.g. Entity Resolution, Solvency Agent) but should keep the Dialogue → Extraction → Context → Composition backbone.

---

## 8. Animation Timing Pattern

Since MCP-backed pipelines typically process synchronously on the server, the frontend uses **timed step transitions** to simulate progressive agent activity. The recommended timing:

```
t = 0ms     Step 1 → working
t = 700ms   Step 1 → completed, Step 2 → working
t = 1400ms  Step 2 → completed, Step 3 → working
t = 2100ms  Step 3 → completed, Step 4 → working (if 4-step)
```

When the API response arrives:

- If the response includes `agent_steps` from the server, hydrate those (with real durations) and replace the timed animation.
- If not, mark all remaining steps as completed.
- After a short delay (2–2.5 seconds), optionally collapse the agent steps into the compact meta bar summary.

### Implementation Pattern

```typescript
function seedAgentSteps(): GenerationAgentStep[] {
    return [
        {
            agent: 'Dialogue Agent',
            icon: 'mdi-head-question',
            color: 'deep-purple',
            status: 'working',
            summary: 'Interpreting question...',
        },
        {
            agent: 'Context Agent',
            icon: 'mdi-database-search',
            color: 'teal',
            status: 'pending',
            summary: 'Waiting...',
        },
        {
            agent: 'Composition Agent',
            icon: 'mdi-creation',
            color: 'amber-darken-2',
            status: 'pending',
            summary: 'Waiting...',
        },
    ];
}

function startStepAnimation(steps: Ref<GenerationAgentStep[]>) {
    const interval = setInterval(() => {
        const currentIdx = steps.value.findIndex((s) => s.status === 'working');
        if (currentIdx < 0 || currentIdx >= steps.value.length - 1) {
            clearInterval(interval);
            return;
        }
        steps.value[currentIdx].status = 'completed';
        steps.value[currentIdx].durationMs = Date.now() - startTime;
        steps.value[currentIdx + 1].status = 'working';
    }, 700);
}
```

---

## 9. Server Response Contract

When the backend returns agent step data, it should follow this shape so the frontend can hydrate real (not simulated) step data:

```typescript
interface ServerAgentStep {
    agent: string;
    status: 'completed' | 'error';
    summary: string;
    detail?: string;
    duration_ms?: number;
}

interface ServerUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    model: string;
    latency_ms?: number;
}

interface GenerationResponse {
    summary: string;
    generated_at: string;
    cached?: boolean;
    summary_id?: number;
    agent_steps?: ServerAgentStep[];
    usage?: ServerUsage;
}
```

When `agent_steps` is present, the frontend should:

1. Stop the timed animation.
2. Map server steps to `GenerationAgentStep[]` with appropriate icons and colors.
3. Display the real `duration_ms` values.

When `agent_steps` is absent, the frontend completes the timed animation and omits per-step durations.

---

## 10. Integration Guide for New Applications

### Step 1: Install Dependencies

The components use Vuetify 3 (`v-icon`, `v-chip`, `v-btn`, `v-progress-circular`) and MDI icons. Ensure your application has:

- `vuetify@3.x`
- `@mdi/font` or equivalent icon set

### Step 2: Copy or Import Components

Copy the following files into your application:

- `components/brand/SummaryAgentSteps.vue`
- `components/brand/SummaryMetaBar.vue`
- `components/brand/SummaryChatSection.vue` (if using follow-up chat)
- `composables/useSummaryGeneration.ts` (shared types and helper composable)

### Step 3: Wire Up Agent Steps to Your API Call

```vue
<template>
    <SummaryAgentSteps v-if="isGenerating" :steps="agentSteps" />
    <SummaryMetaBar
        v-if="!isGenerating && summary"
        :usage="usage"
        :model="usage?.model"
        :agent-steps="agentSteps"
        :entity-count="entityCount"
        @feedback="handleFeedback"
    />
    <div v-if="summary" v-html="renderedSummary" />
</template>

<script setup>
    const agentSteps = ref(seedAgentSteps());
    const isGenerating = ref(false);
    const usage = ref(null);

    async function generate() {
      isGenerating.value = true;
      agentSteps.value = seedAgentSteps();
      startStepAnimation(agentSteps);

      const response = await $fetch('/api/your-endpoint', { method: 'POST', body: { ... } });

      if (response.agent_steps) {
        hydrateAgentSteps(response.agent_steps);
      } else {
        agentSteps.value.forEach(s => s.status = 'completed');
      }

      usage.value = response.usage;
      summary.value = response.summary;
      isGenerating.value = false;
    }
</script>
```

### Step 4: Customize Agent Names for Your Domain

Override the default agent taxonomy if your pipeline has different stages:

```typescript
const steps = [
  { agent: 'Query Parser', icon: 'mdi-code-braces', color: 'indigo', ... },
  { agent: 'MCP Retrieval Agent', icon: 'mdi-cloud-search', color: 'cyan', ... },
  { agent: 'Graph Traversal Agent', icon: 'mdi-graph', color: 'orange', ... },
  { agent: 'Report Generator', icon: 'mdi-file-chart', color: 'green', ... },
];
```

---

## 11. Accessibility Requirements

- Agent step status must be conveyed through both icon and text (not icon color alone).
- The spinning icon on the `working` step must use `aria-label="Loading"`.
- Feedback buttons must have `title` attributes ("Helpful" / "Not helpful").
- Token and cost chips must be readable by screen readers (text content is sufficient).

---

## 12. Success Metrics

- Every AI-powered operation across Lovelace applications uses the agent pipeline UX rather than a generic spinner.
- Users can identify which agent stage is active during any LLM operation.
- Operators can read token usage and cost without opening browser DevTools.
- New applications can integrate the pattern in under one hour using this PRD.

---

## 13. Existing Usage in FSI Monitor

For reference, the pattern is currently used in the following locations:

| Feature                  | Component                          | Pipeline Steps                                                         |
| ------------------------ | ---------------------------------- | ---------------------------------------------------------------------- |
| News Portfolio Update    | `PortfolioUpdateTab.vue`           | 4-step (Dialogue → Entity Resolution → Context → Response)             |
| Stock Summary            | `StockSummaryTab.vue`              | 4-step                                                                 |
| Edgar Summary            | `EdgarSummaryTab.vue`              | 4-step                                                                 |
| Polymarket Summary       | `PolymarketSummaryTab.vue`         | 4-step                                                                 |
| Studio Portfolio Summary | `PortfolioSummaryTab.vue`          | 4-step                                                                 |
| Corporate Lineage        | `CorporateLineageTab.vue`          | 4-step                                                                 |
| FHS Solvency Explanation | `FhsSolvencyExplanationDialog.vue` | 4-step                                                                 |
| Summary Chat (shared)    | `SummaryChatSection.vue`           | 3-step (Dialogue → Context → Response)                                 |
| Ask Yotta Chatbot        | `AskYottaDrawer.vue`               | 4-step (Dialogue → Data Extraction → Context Assembly → Composition)   |
| Document Graph Insights  | `InsightsChatPanel.vue`            | 4-step (Dialogue → Entity Extraction → Context Assembly → Composition) |

---

## 14. Relationship to `AgentThinkingAnimation`

The Lovelace Studio feature includes a heavier-weight variant (`AgentThinkingAnimation.vue`) that is **not** recommended for reuse. Key differences:

| Aspect             | `SummaryAgentSteps` (recommended) | `AgentThinkingAnimation` (Studio-only)               |
| ------------------ | --------------------------------- | ---------------------------------------------------- |
| State management   | Stateless — host owns data        | Stateful — polls `/api/lovelace/agents/sessions/:id` |
| Steps              | Caller-defined (flexible)         | Hardcoded 4-step pipeline                            |
| Visuals            | Lightweight list                  | Card with pulse animation, connectors, progress bar  |
| Tool calls         | Not shown                         | Renders per-step MCP tool call chips                 |
| Backend dependency | None — works with any API         | Requires agent session and trace endpoints           |
| Portability        | High — copy and use               | Low — coupled to Studio agent infrastructure         |

New applications should use `SummaryAgentSteps` + `SummaryMetaBar`. Use `AgentThinkingAnimation` only if your application has a real-time agent session backend with trace polling.

---

## 15. Open Questions

1. Should we publish these components as an npm package for cross-app reuse, or continue with file-copy integration?
2. Should the server response contract for `agent_steps` be formalized in the Elemental API spec?
3. Should we add a `warning` status to `GenerationAgentStep` for partial-success scenarios?
4. Should the meta bar support configurable chip ordering or filtering for apps that only need a subset of chips?
