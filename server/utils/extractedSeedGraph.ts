import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BNY_DOCUMENTS, EVENT_HUB_NEIDS, PROPERTY_BEARING_NEIDS } from '~/utils/collectionTypes';
import extractedGraphJson from '~/import/recordeval_graph_extracted.json';
import { loadQuadDerivedNeids, loadQuadSeedGraph } from '~/server/utils/quadSeedGraph';

interface ExtractedNode {
    id: string;
    name: string;
    type: string;
    properties?: Array<{
        name: string;
        value: unknown;
        value_type?: string;
        citations?: string[];
        timestamp?: string;
    }>;
}

interface ExtractedEdge {
    source: string;
    target: string;
    relationship: string;
    citations?: string[];
    timestamp?: string;
}

interface ExtractedGraph {
    nodes: ExtractedNode[];
    edges: ExtractedEdge[];
}

export interface SeedEntityNode {
    key: string;
    name: string;
    flavor: string;
    nodeId: string;
    canonicalNeid?: string;
    sourceDocumentNeids: string[];
    properties?: Record<string, unknown>;
}

export interface SeedEventNode {
    key: string;
    name: string;
    nodeId: string;
    sourceDocumentNeids: string[];
    properties?: Record<string, unknown>;
}

export interface SeedRelationship {
    sourceKey: string;
    targetKey: string;
    type: string;
    citations: string[];
    recordedAt?: string;
    sourceDocumentNeids: string[];
}

export interface ExtractedSeedGraph {
    entities: SeedEntityNode[];
    events: SeedEventNode[];
    relationships: SeedRelationship[];
}

export interface SeedGraphHints {
    documentNeids: string[];
    eventHubNeids: string[];
    propertyBearingNeids: string[];
}

function normalizeName(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\b(the|inc|llc|ltd|corp|corporation|co|company|na|assoc|association)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeFlavor(type: string): string {
    if (!type) return type;
    return type.replace(/^schema::flavor::/, '');
}

function parseNodeRef(ref: string): { name: string; type: string; key: string } {
    const raw = String(ref);
    const bnyDocMatch = raw.match(/^bny_document_id\|(\d+)$/i);
    if (bnyDocMatch) {
        const documentId = bnyDocMatch[1];
        return {
            name: `bny_document_id|${documentId}`,
            type: 'document',
            key: `bny_document_id|${documentId}`,
        };
    }
    const [name = '', type = ''] = String(ref).split('\0');
    const flavor = normalizeFlavor(type);
    return {
        name,
        type: flavor,
        key: `${normalizeName(name)}|${flavor}`,
    };
}

function resolveCitationToDocumentNeid(citation: string | undefined): string | undefined {
    if (!citation) return undefined;
    const match = citation.match(/(\d+)\.pdf/i);
    if (!match) return undefined;
    const documentId = match[1];
    return BNY_DOCUMENTS.find((doc) => doc.documentId === documentId)?.neid;
}

function resolveDocumentRefToNeid(name: string | undefined): string | undefined {
    if (!name) return undefined;
    const m = name.match(/^bny_document_id\|(\d+)$/i);
    if (!m) return undefined;
    const documentId = m[1];
    return BNY_DOCUMENTS.find((doc) => doc.documentId === documentId)?.neid;
}

function materializeNodeProperties(
    properties:
        | Array<{
              name: string;
              value: unknown;
              value_type?: string;
              citations?: string[];
              timestamp?: string;
          }>
        | undefined
): Record<string, unknown> | undefined {
    if (!properties?.length) return undefined;
    const result: Record<string, unknown> = {};
    for (const prop of properties) {
        if (!prop?.name) continue;
        const citation = prop.citations?.[0];
        result[prop.name] = {
            value: prop.value,
            valueType: prop.value_type,
            citation,
            citations: prop.citations ?? [],
            timestamp: prop.timestamp,
        };
    }
    return Object.keys(result).length ? result : undefined;
}

function documentNeidsFromNodeProperties(
    properties:
        | Array<{
              name: string;
              value: unknown;
              value_type?: string;
              citations?: string[];
              timestamp?: string;
          }>
        | undefined
): string[] {
    if (!properties?.length) return [];
    const citations = properties.flatMap((prop) => prop.citations ?? []);
    return [
        ...new Set(
            citations.map((citation) => resolveCitationToDocumentNeid(citation)).filter(Boolean)
        ),
    ] as string[];
}

let cached: ExtractedSeedGraph | null = null;
let cachedEntityNeidMap: Map<string, string> | null = null;
let cachedHints: SeedGraphHints | null = null;

const CANONICAL_ENTITY_NEID_OVERRIDES: Record<string, string> = {
    // High-confidence canonicalizations verified against the current tenant graph.
    [seedKeyFromNameAndFlavor(
        '$142,235,000 New Jersey Housing and Mortgage Finance Agency Multifamily Housing Revenue Refunding Bond',
        'financial_instrument'
    )]: '08242646876499346416',
    [seedKeyFromNameAndFlavor('HSBC BANK USA', 'organization')]: '06157989400122873900',
    [seedKeyFromNameAndFlavor('THE BANK OF NEW YORK', 'organization')]: '05384086983174826493',
    [seedKeyFromNameAndFlavor('HSBC Bank USA Trade Services', 'organization')]:
        '02625373596646965640',
    // Additional canonicalizations from document-rooted MCP seed audit (2026-03-30).
    [seedKeyFromNameAndFlavor('Department of the Treasury', 'organization')]:
        '08883522583676895375',
    [seedKeyFromNameAndFlavor('HSBC', 'organization')]: '06157989400122873900',
    [seedKeyFromNameAndFlavor('Liquidity II Accounts', 'fund_account')]: '06638852300639391265',
    [seedKeyFromNameAndFlavor('UNITED JERSEY BANK', 'organization')]: '06967031221082229818',
    [seedKeyFromNameAndFlavor('New York, NY', 'location')]: '04648605347073135218',
    [seedKeyFromNameAndFlavor('Trenton, NJ', 'location')]: '01054548445358605934',
    [seedKeyFromNameAndFlavor('BNY', 'organization')]: '05384086983174826493',
    [seedKeyFromNameAndFlavor('STATE OF NEW YORK', 'location')]: '04648605347073135218',
    [seedKeyFromNameAndFlavor('Dallas, TX', 'location')]: '05716789654794197421',
    [seedKeyFromNameAndFlavor('BLX', 'organization')]: '01470965072054453101',
    [seedKeyFromNameAndFlavor('2711 NORTH HASKELL AVENUE', 'location')]: '04541494875554604248',
};

function normalizeNeid(neid: string): string {
    const unpadded = neid.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function loadExtractedEntityNeidMap(): Map<string, string> {
    if (cachedEntityNeidMap) return cachedEntityNeidMap;
    const map = new Map<string, string>();
    try {
        const path = resolve(process.cwd(), 'design/extracted-entity-neid-map-2026-03-28.md');
        const raw = readFileSync(path, 'utf-8');
        for (const line of raw.split('\n')) {
            // Format:
            // - `Entity Name` | `flavor` | `01234567890123456789` | `resolved_neid`
            const m = line.match(
                /^-\s+`([^`]+)`\s+\|\s+`([^`]+)`\s+\|\s+`([^`]+)`\s+\|\s+`resolved_neid`/
            );
            if (!m) continue;
            const [, name, flavor, neidRaw] = m;
            if (!/^\d+$/.test(neidRaw)) continue;
            const key = `${normalizeName(name)}|${normalizeFlavor(flavor)}`;
            map.set(key, normalizeNeid(neidRaw));
        }
    } catch {
        // Optional helper file; keep behavior unchanged when absent.
    }
    cachedEntityNeidMap = map;
    return map;
}

function mergeSeedEntities(
    base: Map<string, SeedEntityNode>,
    incoming: SeedEntityNode[]
): Map<string, SeedEntityNode> {
    for (const entity of incoming) {
        const existing = base.get(entity.key);
        if (!existing) {
            base.set(entity.key, {
                ...entity,
                sourceDocumentNeids: [...new Set(entity.sourceDocumentNeids ?? [])],
            });
            continue;
        }
        existing.sourceDocumentNeids = [
            ...new Set([
                ...(existing.sourceDocumentNeids ?? []),
                ...(entity.sourceDocumentNeids ?? []),
            ]),
        ];
        if (!existing.canonicalNeid && entity.canonicalNeid) {
            existing.canonicalNeid = entity.canonicalNeid;
        }
        if (entity.properties) {
            existing.properties = {
                ...(existing.properties ?? {}),
                ...entity.properties,
            };
        }
    }
    return base;
}

function mergeSeedEvents(
    base: Map<string, SeedEventNode>,
    incoming: SeedEventNode[]
): Map<string, SeedEventNode> {
    for (const eventItem of incoming) {
        const existing = base.get(eventItem.key);
        if (!existing) {
            base.set(eventItem.key, {
                ...eventItem,
                sourceDocumentNeids: [...new Set(eventItem.sourceDocumentNeids ?? [])],
            });
            continue;
        }
        existing.sourceDocumentNeids = [
            ...new Set([
                ...(existing.sourceDocumentNeids ?? []),
                ...(eventItem.sourceDocumentNeids ?? []),
            ]),
        ];
        if (eventItem.properties) {
            existing.properties = {
                ...(existing.properties ?? {}),
                ...eventItem.properties,
            };
        }
    }
    return base;
}

function mergeSeedRelationships(
    base: SeedRelationship[],
    incoming: SeedRelationship[]
): SeedRelationship[] {
    const byKey = new Map<string, SeedRelationship>();
    const keyFor = (rel: SeedRelationship) =>
        `${rel.sourceKey}|${rel.targetKey}|${rel.type}|${rel.recordedAt ?? ''}`;
    for (const rel of [...base, ...incoming]) {
        const key = keyFor(rel);
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, {
                ...rel,
                sourceDocumentNeids: [...new Set(rel.sourceDocumentNeids ?? [])],
                citations: [...new Set(rel.citations ?? [])],
            });
            continue;
        }
        existing.sourceDocumentNeids = [
            ...new Set([
                ...(existing.sourceDocumentNeids ?? []),
                ...(rel.sourceDocumentNeids ?? []),
            ]),
        ];
        existing.citations = [
            ...new Set([...(existing.citations ?? []), ...(rel.citations ?? [])]),
        ];
    }
    return Array.from(byKey.values());
}

export function loadExtractedSeedGraph(): ExtractedSeedGraph {
    if (cached) return cached;
    const canonicalEntityNeids = loadExtractedEntityNeidMap();
    const graph = extractedGraphJson as unknown as ExtractedGraph;

    const entityByKey = new Map<string, SeedEntityNode>();
    const eventByKey = new Map<string, SeedEventNode>();
    const relationships: SeedRelationship[] = [];

    for (const node of graph.nodes ?? []) {
        const flavor = normalizeFlavor(node.type);
        if (flavor === 'document') continue;
        const key = `${normalizeName(node.name)}|${flavor}`;
        if (flavor === 'event') {
            if (!eventByKey.has(key)) {
                const citedDocs = documentNeidsFromNodeProperties(node.properties);
                eventByKey.set(key, {
                    key,
                    name: node.name,
                    nodeId: node.id,
                    sourceDocumentNeids: citedDocs,
                    properties: materializeNodeProperties(node.properties),
                });
            }
            continue;
        }
        if (!entityByKey.has(key)) {
            const citedDocs = documentNeidsFromNodeProperties(node.properties);
            entityByKey.set(key, {
                key,
                name: node.name,
                flavor,
                nodeId: node.id,
                canonicalNeid:
                    CANONICAL_ENTITY_NEID_OVERRIDES[key] ?? canonicalEntityNeids.get(key),
                sourceDocumentNeids: citedDocs,
                properties: materializeNodeProperties(node.properties),
            });
        }
    }

    for (const edge of graph.edges ?? []) {
        const source = parseNodeRef(edge.source);
        const target = parseNodeRef(edge.target);
        const sourceDocNeids = [
            ...new Set(
                (edge.citations ?? []).map((citation) => resolveCitationToDocumentNeid(citation))
            ),
        ].filter((neid): neid is string => Boolean(neid));
        const targetDocNeid = resolveDocumentRefToNeid(target.name);
        if (targetDocNeid && !sourceDocNeids.includes(targetDocNeid)) {
            sourceDocNeids.push(targetDocNeid);
        }

        if (edge.relationship === 'appears_in') {
            const sourceDocNeid = resolveDocumentRefToNeid(source.name);
            const targetDocNeid = resolveDocumentRefToNeid(target.name);
            const linkedDocNeids = [
                ...new Set([...sourceDocNeids, sourceDocNeid, targetDocNeid].filter(Boolean)),
            ] as string[];

            if (target.type === 'document') {
                const entity = entityByKey.get(source.key);
                const event = eventByKey.get(source.key);
                if (entity) {
                    entity.sourceDocumentNeids = [
                        ...new Set([...entity.sourceDocumentNeids, ...linkedDocNeids]),
                    ];
                } else if (event) {
                    event.sourceDocumentNeids = [
                        ...new Set([...event.sourceDocumentNeids, ...linkedDocNeids]),
                    ];
                }
                continue;
            }

            if (source.type === 'document') {
                const entity = entityByKey.get(target.key);
                const event = eventByKey.get(target.key);
                if (entity) {
                    entity.sourceDocumentNeids = [
                        ...new Set([...entity.sourceDocumentNeids, ...linkedDocNeids]),
                    ];
                } else if (event) {
                    event.sourceDocumentNeids = [
                        ...new Set([...event.sourceDocumentNeids, ...linkedDocNeids]),
                    ];
                }
            }
            continue;
        }

        if (source.type === 'document') continue;
        if (target.type === 'document') continue;

        relationships.push({
            sourceKey: source.key,
            targetKey: target.key,
            type: edge.relationship,
            citations: edge.citations ?? [],
            recordedAt: edge.timestamp,
            sourceDocumentNeids: sourceDocNeids,
        });
    }

    const quadSeed = loadQuadSeedGraph();
    const mergedEntityByKey = mergeSeedEntities(entityByKey, quadSeed.entities);
    const mergedEventByKey = mergeSeedEvents(eventByKey, quadSeed.events);
    const mergedRelationships = mergeSeedRelationships(relationships, quadSeed.relationships);

    cached = {
        entities: Array.from(mergedEntityByKey.values()),
        events: Array.from(mergedEventByKey.values()),
        relationships: mergedRelationships,
    };
    return cached;
}

export function seedIdForKey(prefix: 'entity' | 'event', key: string): string {
    const encoded = Buffer.from(key).toString('base64url');
    return `seed:${prefix}:${encoded.slice(0, 24)}`;
}

export function seedKeyFromNameAndFlavor(name: string, flavor: string): string {
    return `${normalizeName(name)}|${normalizeFlavor(flavor)}`;
}

export function citationToDocumentNeid(citation: string | undefined): string | undefined {
    return resolveCitationToDocumentNeid(citation);
}

export function loadSeedGraphHints(): SeedGraphHints {
    if (cachedHints) return cachedHints;
    const quadHints = loadQuadDerivedNeids();
    cachedHints = {
        documentNeids: [
            ...new Set([
                ...BNY_DOCUMENTS.map((doc) => normalizeNeid(doc.neid)),
                ...quadHints.documentNeids,
            ]),
        ],
        eventHubNeids: [
            ...new Set([
                ...EVENT_HUB_NEIDS.map((neid) => normalizeNeid(neid)),
                ...quadHints.eventHubNeids,
            ]),
        ],
        propertyBearingNeids: [
            ...new Set([
                ...PROPERTY_BEARING_NEIDS.map((neid) => normalizeNeid(neid)),
                ...quadHints.propertyBearingNeids,
            ]),
        ],
    };
    return cachedHints;
}
