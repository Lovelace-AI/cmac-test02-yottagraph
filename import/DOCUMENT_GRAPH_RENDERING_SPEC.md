# Document Graph Rendering

## Combined Agent Spec and Engineering Spec

**Version:** 1.0  
**Date:** 2026-03-26  
**Owner:** Lovelace  
**Status:** Extracted from production implementation

---

## 0. Document Purpose

This document describes how the Document Graph module renders knowledge graphs extracted from document collections. It covers the full pipeline: data model, graph construction, visual rendering, interaction, theming, and AI-enhanced clustering. The goal is to allow another application using the same MCP server and Knowledge Graph to reproduce the same look, feel, and behavior.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Data Source                                            │
│  MCP / API → document_graph.json                        │
│  (entities, relationships, events, documents)           │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Composable: useDocumentGraph()                         │
│  Persistent reactive state, filtering, collection mgmt  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Page: Document Graph (tabbed layout)                   │
│  ┌──────────┬─────────┬──────────┬─────────┬──────────┐ │
│  │ Overview │ Graph   │ Entities │ Rels    │ Events   │ │
│  │          │         │          │         │          │ │
│  └──────────┴────┬────┴──────────┴─────────┴──────────┘ │
│                  │                                       │
│  ┌───────────────▼───────────────────────────────────┐  │
│  │  DocumentGraphNetwork.vue                          │  │
│  │  Sigma.js + Graphology + ForceAtlas2               │  │
│  │  + Leaflet (geo mode) + Louvain (clustering)       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  EntityPropertyPanel.vue (right drawer)             │  │
│  │  EgoNetworkMini.vue (canvas mini-graph)             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Data Model

### 2.1 Document Graph JSON Structure

The knowledge graph is a single JSON payload (`document_graph.json`) with the following top-level shape:

```typescript
interface DocumentGraph {
    extraction_metadata: ExtractionMetadata;
    documents: GraphDocument[];
    entities: GraphEntity[];
    relationships: GraphRelationship[];
    events?: GraphEvent[];
    resolution_log?: ResolutionLog;
    lineage?: LineageRecord[];
}
```

### 2.2 Entity Types

Five entity types with a fixed color and icon mapping:

| Type              | Color (hex)        | Icon             | Label                |
| ----------------- | ------------------ | ---------------- | -------------------- |
| `organization`    | `#42A5F5` (blue)   | `mdi-domain`     | Organization         |
| `person`          | `#FFA726` (orange) | `mdi-account`    | Person               |
| `instrument`      | `#66BB6A` (green)  | `mdi-chart-line` | Financial Instrument |
| `location`        | `#AB47BC` (purple) | `mdi-map-marker` | Location             |
| `legal_agreement` | `#EF5350` (red)    | `mdi-file-sign`  | Legal Agreement      |

These colors and icons are defined in `features/document-graph/types/index.ts` as `ENTITY_COLORS` and `ENTITY_TYPE_LABELS`. All graph components reference them.

### 2.3 Entity Structure

```typescript
interface GraphEntity {
    id: string;
    name: string;
    entity_type: EntityType;
    sub_type?: string;
    description?: string;
    properties: Record<string, PropertyValue>;
    properties_by_document?: Record<string, Record<string, PropertyValue>>;
    sources: DocumentSource[];
    mention_snippets?: MentionSnippet[];
    also_known_as?: string[];
    sec_linkage?: { cik?: string; neid?: string; lei?: string /* ... */ };
}

interface PropertyValue {
    value: string | number | boolean | null;
    type: 'string' | 'number' | 'currency' | 'percentage' | 'date' | 'boolean';
    snippet?: string;
}
```

### 2.4 Relationship Structure

```typescript
interface GraphRelationship {
    id: string;
    from_entity: string;
    from_name: string;
    to_entity: string;
    to_name: string;
    type: string; // e.g. "trustee_of", "subsidiary_of"
    snippet: string;
    properties: Record<string, PropertyValue>;
    source: { document: string; page_start?: number; page_end?: number };
}
```

### 2.5 Event Structure

```typescript
interface GraphEvent {
    id: string;
    event_type: string;
    canonical_type: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    event_date: string | null;
    date_precision: 'day' | 'month' | 'quarter' | 'year';
    description: string;
    ai_context?: string;
    speculative: boolean;
    entity_ids: string[];
    primary_entity_id?: string;
    affected_entities?: { entity_id: string; role: string; sentiment?: number }[];
    sources: DocumentSource[];
    snippet?: string;
}
```

---

## 3. Dependencies

| Package                          | Version   | Purpose                                       |
| -------------------------------- | --------- | --------------------------------------------- |
| `sigma`                          | `^3.0.2`  | WebGL graph renderer                          |
| `graphology`                     | `^0.26.0` | In-memory graph data structure                |
| `graphology-layout-forceatlas2`  | (bundled) | Force-directed layout algorithm               |
| `graphology-communities-louvain` | (bundled) | Community detection for clustering            |
| `leaflet`                        | `^1.9.4`  | Map tile layer for geo mode                   |
| `@sigma/layer-leaflet`           | (bundled) | Sigma ↔ Leaflet integration                   |
| `@sigma/export-image`            | (bundled) | Export graph as PNG blob                      |
| `html2canvas`                    | `^1.4.1`  | Capture Leaflet tiles for geo export          |
| `vuetify`                        | `3.x`     | UI components (chips, drawers, tables, icons) |
| `@mdi/font`                      | —         | Material Design Icons                         |

---

## 4. Graph Rendering Engine (`DocumentGraphNetwork.vue`)

### 4.1 Layout Modes

The graph supports two mutually exclusive layout modes, toggled via a `v-btn-toggle`:

**Force-Directed (`force`)** — Default. Uses ForceAtlas2 for spatial positioning.

**Geographic (`geo`)** — Places entities on a Leaflet map using real or inferred coordinates. Only available when geocoded location entities exist.

### 4.2 Force-Directed Layout

#### Node Construction

For each visible entity, a Graphology node is added with:

```typescript
graph.addNode(entity.id, {
    label: truncate(entity.name, 40),
    x: Math.random() * 100, // random initial position
    y: Math.random() * 100,
    size: Math.max(6, Math.min(22, 6 + propCount * 0.6)), // scale by property count
    color: ENTITY_COLORS[entity.entity_type],
    type: 'circle',
    entity_type: entity.entity_type,
    eventCount: evtCounts[entity.id] || 0,
    severityRingColor: severityRingColor, // red/orange ring for critical/high events
});
```

**Node sizing rule:** Base size 6, scaled by `propCount * 0.6`, capped at 22. Enriched (Yottagraph) nodes use a smaller scale (`0.3` multiplier, alpha `0.4` color) to visually distinguish document-native from enriched nodes.

**Severity ring:** Entities with `critical` severity events get a red ring (`#E53935`), `high` gets orange (`#FB8C00`), via an enlarged node size (+2).

#### Edge Construction

```typescript
graph.addEdge(fromId, toId, {
    label: rel.type.replace(/_/g, ' '),
    color: getRelationshipEdgeColor(rel.type, 0.55), // rgba with alpha
    size: 1.2,
    type: 'arrow',
});
```

#### ForceAtlas2 Settings

```typescript
forceAtlas2.assign(graph, {
    iterations: Math.min(300, Math.max(100, Math.round(50000 / nodeCount))),
    settings: {
        gravity: 1.0,
        scalingRatio: nodeCount > 1000 ? 30 : nodeCount > 300 ? 20 : 10,
        barnesHutOptimize: nodeCount > 100,
        strongGravityMode: false,
        linLogMode: true,
        outboundAttractionDistribution: true,
        adjustSizes: true,
        edgeWeightInfluence: 1,
        slowDown: 1,
    },
});
```

**Key tuning:** `linLogMode: true` and `outboundAttractionDistribution: true` produce cleaner separation between clusters. `scalingRatio` increases with graph size to prevent nodes from collapsing.

### 4.3 Sigma Configuration

```typescript
new Sigma(graph, container, {
    renderEdgeLabels: false,
    allowInvalidContainer: true,
    labelFont: '"Inter", "Roboto", sans-serif',
    labelSize: 14,
    labelWeight: 'bold',
    labelColor: { color: labelTextColor },
    labelRenderedSizeThreshold: 3,
    labelDensity: 0.15,
    labelGridCellSize: 100,
    defaultDrawNodeLabel: drawLabelWithHalo,
    defaultDrawNodeHover: drawHoverWithHalo,
    defaultEdgeType: 'arrow',
    defaultEdgeColor: 'rgba(150, 150, 150, 0.5)',
});
```

**`labelDensity: 0.15`** is critical — it prevents label overlap by only showing labels for the most prominent nodes. Combined with `labelGridCellSize: 100`, this gives a clean look at any zoom level.

### 4.4 Custom Label Renderer

The default Sigma label renderer is replaced with a custom `drawLabelWithHalo` function that draws:

1. **A pill-shaped background** behind each label (rounded rectangle with `border-radius: 4px`)
2. **Bold white text** (dark mode) or bold dark text (light mode) on the pill
3. **An event count badge** — orange circle with white number text, positioned top-right of the node (`x + size*0.7, y - size*0.7`)

The hover renderer (`drawHoverWithHalo`) is similar but with:

- Slightly larger font (+2px)
- Larger pill padding
- A colored border stroke matching the node color

#### Theme-Aware Colors

Label pill colors update when the Vuetify theme changes:

| Token           | Dark Mode                | Light Mode                  |
| --------------- | ------------------------ | --------------------------- |
| Pill background | `rgba(18, 18, 30, 0.88)` | `rgba(255, 255, 255, 0.92)` |
| Text color      | `#FFFFFF`                | `#1A1A2E`                   |
| Badge stroke    | `rgba(18, 18, 30, 0.8)`  | `rgba(255, 255, 255, 0.8)`  |

### 4.5 Community Label Nodes

When clustering is active, the renderer also handles community label nodes — invisible (`size: 0.1`, `color: transparent`) nodes placed at the centroid of each cluster. These render as:

- Large bold text (18px) centered on the node position
- A semi-transparent pill with the community color at 30% opacity
- A border stroke at 60% opacity of the community color

---

## 5. Relationship Color Coding

Edges are color-coded by semantic category:

| Category   | Color                 | Relationship Types                                                                                           |
| ---------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Financial  | `#66BB6A` (green)     | `manages`, `pays`, `refunds`, `funds`, `invests_in`, `sponsor_of`, `servicer_of`                             |
| Structural | `#78909C` (blue-grey) | `subsidiary_of`, `parent_of`, `affiliate_of`, `employs`, `member_of`, `successor_to`, `predecessor_of`       |
| M&A        | `#AB47BC` (purple)    | `acquired_by`, `merged_with`, `disposed_to`                                                                  |
| Legal      | `#42A5F5` (blue)      | `trustee_of`, `insures`, `secures`, `amends`, `guarantees`, `regulates`, `audits`, `counsel_for`, `services` |
| Location   | `#FFA726` (orange)    | `located_in`, `headquartered_in`, `operates_in`                                                              |
| Other      | `#9E9E9E` (grey)      | Any unrecognized type                                                                                        |

Edge alpha defaults to `0.55` (document-native) or `0.25` (enriched/Yottagraph edges).

---

## 6. Community Detection and Clustering

### 6.1 Algorithm

Louvain community detection from `graphology-communities-louvain`:

```typescript
const communities = louvain(graph, { resolution: clusterResolution });
```

`clusterResolution` is user-adjustable via a slider (range `0.1` to `3.0`, step `0.1`, default `1.0`). Higher values produce more, smaller communities.

### 6.2 Spatial Separation

Communities are placed using a **golden-angle spiral** layout:

```typescript
const goldenAngle = Math.PI * (3 - Math.sqrt(5));
const baseSpacing = Math.max(15000, nodeCount * 1.5);

// Community 0 at origin; others on golden-angle spiral
communityPositions[index] = {
    x: baseSpacing * Math.sqrt(index) * 3 * Math.cos(index * goldenAngle),
    y: baseSpacing * Math.sqrt(index) * 3 * Math.sin(index * goldenAngle),
};
```

Nodes within each community are randomly placed in a circle of radius `Math.sqrt(groupSize) * 120` around the centroid, then refined with a zero-gravity ForceAtlas2 pass to untangle internal edges.

### 6.3 Cluster Naming

Clusters are named by a heuristic in `lib/clusterNaming.ts`:

1. **Person-dominated clusters** (>50% persons) with a company hub → `"[Company] Leadership"`
2. **Hub entity name** (prefer organizations over persons, most connected first)
3. **Industry** (if available from EDGAR data)
4. **Hub + size** as uniqueness tiebreaker
5. **Fallback:** `"Entity Cluster N (size)"`

### 6.4 AI-Enhanced Naming

After the heuristic pass, an optional fire-and-forget API call enhances names using Gemini:

```typescript
POST /api/lovelace/document-graph-report
{
  section: 'cluster_names',
  context: { clusters: clusterSummaries }
}
```

Each cluster summary includes: `size`, `typeCounts`, `topEntities` (top 8 by degree), and `topRelTypes` (top 5 relationship types). The API returns AI-generated names which replace the heuristic names in the legend and on the graph.

### 6.5 Cluster Color Palette

40-color colorblind-friendly palette in `lib/clusterNaming.ts`:

```typescript
export const COMMUNITY_COLORS = [
    '#e6194B',
    '#3cb44b',
    '#ffe119',
    '#4363d8',
    '#f58231',
    '#911eb4',
    '#42d4f4',
    '#f032e6',
    '#bfef45',
    '#fabed4',
    '#469990',
    '#dcbeff',
    '#9A6324',
    '#fffac8',
    '#800000',
    '#aaffc3',
    '#808000',
    '#ffd8b1',
    '#000075',
    '#a9a9a9',
    // ... 20 more
];
export const OTHER_CLUSTER_COLOR = 'rgba(100, 100, 100, 0.3)';
```

---

## 7. Entity Type Filtering

The legend panel (top-left overlay) doubles as an interactive filter. Clicking an entity type toggles its visibility. Implementation:

- A `Set<EntityType>` called `hiddenEntityTypes` tracks which types are hidden.
- Default hidden types: `location`, `instrument`, `legal_agreement` — to focus the graph on organizations and people.
- `visibleEntities` and `visibleRelationships` are computed from the full data minus hidden types.
- At least one type must remain visible (toggle is blocked when only one type remains).
- The graph is fully rebuilt (`buildCurrentLayout()`) on every filter change.

---

## 8. Geographic Layout

### 8.1 Coordinate Resolution

Entities are placed on the map using a multi-strategy coordinate resolver:

1. **Entity properties** — check for `latitude`/`longitude` in entity properties
2. **Static geocode table** — a hardcoded lookup for known addresses and cities
3. **1-hop relationship walk** — find a connected `location` entity with coordinates
4. **2-hop walk** — entity → organization → location (for people placed at their employer's location)
5. **Fallback** — random scatter around US center (`39°N, 98°W`)

Non-location entities are offset from their resolved location by `0.008 + random * 0.015` degrees at a random angle, to prevent stacking.

### 8.2 Map Tiles

```typescript
const tileConfig = {
    urlTemplate: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap © CARTO',
};
leafletLayer = bindLeafletLayer(sigmaInstance, { tileLayer: tileConfig });
```

### 8.3 Dark Mode Map Inversion

In dark mode, Voyager tiles are inverted with a CSS filter on the tile pane:

```css
.dark-map :deep(.leaflet-tile-pane) {
    filter: invert(1) hue-rotate(180deg) brightness(1.8) contrast(1.1);
}
```

---

## 9. Hover Tooltip

When the user hovers a node, a floating tooltip appears adjacent to the cursor:

```html
<div class="node-tooltip">
    <div class="d-flex align-center gap-2">
        <v-icon :color="entityColor" size="16">{{ entityIcon }}</v-icon>
        <span class="text-caption font-weight-bold">{{ name }}</span>
    </div>
    <div class="text-caption">{{ entity_type }} · {{ sub_type }}</div>
    <div class="text-caption">{{ degree }} connections</div>
    <div class="text-caption" style="color: #ffa726">{{ eventCount }} events</div>
</div>
```

**Styling:**

| Mode  | Background                  | Border                      | Text                   |
| ----- | --------------------------- | --------------------------- | ---------------------- |
| Dark  | `rgba(20, 20, 30, 0.95)`    | `rgba(255, 255, 255, 0.15)` | White / grey hierarchy |
| Light | `rgba(255, 255, 255, 0.96)` | `rgba(0, 0, 0, 0.12)`       | Dark / grey hierarchy  |

Both modes use `backdrop-filter: blur(8px)` and `border-radius: 8px`.

---

## 10. Legend Panel

The legend panel (top-left, overlaid on the graph) shows:

### 10.1 Entity Types Section

A filterable list of entity types with colored dots and counts. Each row is clickable to toggle visibility.

### 10.2 Source Section (when enriched nodes present)

Two rows showing document-native vs. Yottagraph-enriched node counts, with blue dot at full and 40% opacity respectively.

### 10.3 Geocoded Location Count (geo mode)

Shows `"N geocoded locations"` in subtle text.

### 10.4 Community Legend (clustering mode)

Lists up to 12 communities by name, color, and size. Shows `"+N more"` if truncated.

### 10.5 Relationship Types Section (non-clustering mode)

Top 8 relationship types by frequency with colored line indicators and counts. Shows `"+N more types"` if truncated.

### Overlay Styling

```css
.graph-overlay {
    background: rgba(28, 28, 36, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.14);
}
.graph-overlay--light {
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(19, 26, 42, 0.2);
}
```

---

## 11. Entity Property Panel (Right Drawer)

When a node is clicked, a 480px right drawer opens showing the selected entity:

### 11.1 Header

- Entity type icon + color
- Entity name (`text-h6`)
- Type chip (tonal, entity color)
- Sub-type chip (outlined)
- Description text
- "Also known as" alias chips

### 11.2 Database Linkage Banner

If the entity has SEC linkage data (`sec_linkage`), shows identifiers (CIK, NEID, LEI) and match confidence.

### 11.3 Tabs Within the Drawer

- **Properties** — `PropertyTable.vue` showing key-value pairs with type-aware formatting (currency with `$`, percentages with `%`, dates formatted). Snippets shown as tooltips.
- **Relationships** — filtered list of relationships involving this entity
- **Ego Network** — `EgoNetworkMini.vue`, a small canvas-rendered radial graph showing the selected entity at center with its 1-hop neighbors

### 11.4 Ego Network Mini

A 440×260 canvas that renders a radial layout:

- **Center node** — the selected entity, drawn larger
- **Neighbor nodes** — 1-hop connected entities arranged in a circle
- **Edges** — colored by relationship category (same palette as the main graph)
- **Labels** — truncated to 15 characters, drawn with background pills
- **Hover** — shows full entity name in a tooltip

---

## 12. Events Tab

A full-height filterable data table with:

### 12.1 Filter Bar

- Event count chip
- Canonical type chip-group (multi-select, colored)
- Severity multi-select dropdown
- Speculative toggle switch
- Search text field
- Date range (from/to) fields

### 12.2 Event Rows

Each event row shows: severity chip (colored), event type, date, description, AI context, entity references, and source document links.

### 12.3 Severity Colors

| Severity   | Color              |
| ---------- | ------------------ |
| `critical` | red (`error`)      |
| `high`     | orange (`warning`) |
| `medium`   | blue (`info`)      |
| `low`      | grey               |

---

## 13. Overview Tab

A deal-summary dashboard that auto-extracts key metrics from entity properties:

### 13.1 Deal Summary Header

A gradient card showing deal name, type, closing date, and metric cards (par amount, interest rate, maturity, etc.) extracted from instrument and agreement entities.

### 13.2 Source Documents Table

Lists all documents with file type icon, document type chip (colored), date, and subject.

### 13.3 Entity Statistics

Type-by-type breakdown with counts and entity name chips.

### 13.4 Relationship Heatmap

A matrix-style visualization of relationship types between entity type pairs.

---

## 14. Graph Export

### 14.1 Force Layout Export

```typescript
async function exportGraphImage(): Promise<Blob | null> {
    const blob = await toBlob(sigmaInstance, {
        backgroundColor: isDarkMode ? '#1a1a2e' : '#ffffff',
        width: 1920,
        height: 1080,
        layers: ['edges', 'nodes', 'labels', 'hovers'],
    });
    return blob;
}
```

### 14.2 Geo Layout Export

A composite approach for geo exports:

1. Capture Leaflet tiles via `html2canvas` (DOM images)
2. Capture Sigma graph via `toBlob` (WebGL layer)
3. Composite onto a single canvas — tiles first (with dark-mode filter), then graph overlay

Before export, the map auto-fits bounds to all geocoded entities with 40px padding. A polling loop waits up to 5 seconds for all map tiles to finish loading before capture.

---

## 15. Page Layout and Tab Structure

The Document Graph page is a full-height container with:

1. **FeatureHeader** — title, refresh button, generation date
2. **DocumentSelector** — collection picker and document filter bar
3. **Tab navigation** — 11 tabs: Overview, Graph, Entities, Relationships, Events, Agreements, Validation, Timeline, Insights, How It Works, Yottagraph Enrichment
4. **Tab content** — each tab fills remaining height with `overflow: hidden`

The Graph tab contains `DocumentGraphNetwork.vue` at full height with overlaid controls.

---

## 16. Theming

### 16.1 Graph Canvas

```css
.sigma-container {
    width: 100%;
    height: 100%;
    min-height: 78vh;
    background: #1a1a2e; /* dark navy, matches dark mode */
}
```

In light mode, the Sigma `backgroundColor` option is set to `#ffffff`.

### 16.2 Dark/Light Mode Reactivity

The graph watches `theme.global.current.value.dark` and:

- Updates label pill colors
- Updates Sigma `labelColor` setting
- Refreshes the Sigma renderer
- Toggles the `dark-map` CSS class for Leaflet tile inversion

---

## 17. Integration Guide for New Applications

### Step 1: Install Dependencies

```bash
npm install sigma graphology graphology-layout-forceatlas2 graphology-communities-louvain \
  leaflet @sigma/layer-leaflet @sigma/export-image html2canvas
```

### Step 2: Copy Core Files

| File                                                          | Purpose                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| `features/document-graph/types/index.ts`                      | Type definitions, `ENTITY_COLORS`, `ENTITY_TYPE_LABELS` |
| `features/document-graph/components/DocumentGraphNetwork.vue` | Main graph renderer                                     |
| `features/document-graph/components/EntityPropertyPanel.vue`  | Entity detail drawer                                    |
| `features/document-graph/components/EgoNetworkMini.vue`       | Mini radial graph                                       |
| `features/document-graph/components/PropertyTable.vue`        | Typed property display                                  |
| `features/document-graph/components/RelationshipTable.vue`    | Relationship list                                       |
| `features/document-graph/components/EventsTab.vue`            | Event table with filters                                |
| `features/document-graph/composables/useDocumentGraph.ts`     | State management                                        |
| `lib/clusterNaming.ts`                                        | Cluster naming utilities + color palette                |

### Step 3: Feed Data

The graph component accepts three required props:

```vue
<DocumentGraphNetwork
    :entities="filteredEntities"
    :relationships="filteredRelationships"
    :loading="loading"
    :event-count-by-entity="eventCountByEntity"
    :max-severity-by-entity="maxSeverityByEntity"
    :enriched-node-ids="enrichedNodeIds"
    :enriched-edge-keys="enrichedEdgeKeys"
    @select-entity="selectEntity"
    @load="loadGraph"
/>
```

If your MCP data is in a different shape, map it to the `GraphEntity[]` and `GraphRelationship[]` interfaces before passing.

### Step 4: Customize Entity Types

If your domain has different entity types, update:

- `ENTITY_COLORS` — the hex color for each type
- `ENTITY_TYPE_LABELS` — the display label
- `getEntityIcon()` — the MDI icon
- `hiddenEntityTypes` — which types to hide by default
- `RELATIONSHIP_CATEGORIES` — the edge color mapping

### Step 5: Supply Coordinates for Geo Mode

If your entities have geographic data, ensure location entities populate `properties.latitude` and `properties.longitude`, or add entries to the static geocode lookup table.

---

## 18. Performance Considerations

| Graph Size     | ForceAtlas2 Iterations | BarnesHut | Notes                                                            |
| -------------- | ---------------------- | --------- | ---------------------------------------------------------------- |
| < 100 nodes    | 300                    | No        | Fast, high quality                                               |
| 100–300 nodes  | 166                    | Yes       | Good balance                                                     |
| 300–1000 nodes | 100                    | Yes       | Reduce `scalingRatio` to 20                                      |
| > 1000 nodes   | 50                     | Yes       | Increase `scalingRatio` to 30, consider limiting displayed nodes |

The iteration count formula is `Math.min(300, Math.max(100, Math.round(50000 / nodeCount)))`.

Cluster refinement adds another `Math.min(50, Math.max(20, Math.round(100000 / nodeCount)))` iterations with zero gravity.

---

## 19. Visual Identity Checklist

When reproducing this graph in another application, verify:

- [ ] Node colors match the entity type palette (`#42A5F5`, `#FFA726`, `#66BB6A`, `#AB47BC`, `#EF5350`)
- [ ] Edge colors are category-coded (green/grey/blue/purple/orange)
- [ ] Labels use "Inter" or "Roboto" font, bold, 14px
- [ ] Label pills have semi-transparent backgrounds matching the theme
- [ ] Event count badges are orange circles with white text at top-right of nodes
- [ ] The legend panel has a glass-morphism overlay style
- [ ] The graph background is `#1a1a2e` in dark mode
- [ ] Hover shows an enlarged label pill with a colored border
- [ ] Community labels use large centered text with the community color at 30% opacity
- [ ] Map tiles use CARTO Voyager with dark-mode inversion

---

## 20. Open Questions

1. Should we extract `DocumentGraphNetwork.vue` into a standalone npm package, or continue with file-copy integration?
2. Should the cluster naming API endpoint be standardized across applications?
3. Should we support WebGPU rendering for graphs exceeding 5,000 nodes?
4. Should the relationship category mapping be configurable at the app level rather than hardcoded?
5. Should the geo mode support dynamic geocoding via an API, or is static lookup sufficient for MCP-backed corpora?
