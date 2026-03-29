import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BNY_DOCUMENTS } from '~/utils/collectionTypes';

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

export function loadExtractedSeedGraph(): ExtractedSeedGraph {
    if (cached) return cached;
    const canonicalEntityNeids = loadExtractedEntityNeidMap();
    const path = resolve(process.cwd(), 'import/recordeval_graph_extracted.json');
    let graph: ExtractedGraph;
    try {
        graph = JSON.parse(readFileSync(path, 'utf-8')) as ExtractedGraph;
    } catch (error: any) {
        console.warn(
            `[extractedSeedGraph] Seed graph file unavailable at ${path}; falling back to MCP-only rebuild mode.`
        );
        cached = { entities: [], events: [], relationships: [] };
        return cached;
    }

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

    cached = {
        entities: Array.from(entityByKey.values()),
        events: Array.from(eventByKey.values()),
        relationships,
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
