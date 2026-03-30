import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BNY_DOCUMENTS } from '~/utils/collectionTypes';

const QUAD_CSV_PATHS = [
    'import/quads-document-0-hop - quads-document-0-hop.csv',
    'import/quads-document-1-hop - quads-document-1-hop.csv',
] as const;

type QuadRow = {
    hop: 0 | 1;
    time: string;
    sourceName: string;
    sourceNindex: string;
    propertyName: string;
    pid: string;
    propertyType: string;
    value: string;
    destNindex: string;
};

export interface QuadSeedEntityNode {
    key: string;
    name: string;
    flavor: string;
    nodeId: string;
    canonicalNeid?: string;
    sourceDocumentNeids: string[];
    properties?: Record<string, unknown>;
}

export interface QuadSeedEventNode {
    key: string;
    name: string;
    nodeId: string;
    sourceDocumentNeids: string[];
    properties?: Record<string, unknown>;
}

export interface QuadSeedRelationship {
    sourceKey: string;
    targetKey: string;
    type: string;
    citations: string[];
    recordedAt?: string;
    sourceDocumentNeids: string[];
}

export interface QuadSeedGraph {
    entities: QuadSeedEntityNode[];
    events: QuadSeedEventNode[];
    relationships: QuadSeedRelationship[];
}

export interface QuadDerivedNeids {
    documentNeids: string[];
    eventHubNeids: string[];
    propertyBearingNeids: string[];
}

type ParsedNodeRef = {
    flavor: string;
    name: string;
    key: string;
};

const documentNeidByDocumentId = new Map(
    BNY_DOCUMENTS.map((doc) => [doc.documentId, normalizeNeid(doc.neid)])
);
const knownDocumentNeids = new Set(BNY_DOCUMENTS.map((doc) => normalizeNeid(doc.neid)));

let cachedSeedGraph: QuadSeedGraph | null = null;
let cachedDerivedNeids: QuadDerivedNeids | null = null;

function normalizeNeid(neid: string): string {
    if (!neid) return '';
    const digits = neid.replace(/\D/g, '');
    if (!digits) return '';
    const unpadded = digits.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function normalizeFlavor(type: string): string {
    if (!type) return type;
    return type.replace(/^schema::flavor::/, '').trim();
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

function seedKey(name: string, flavor: string): string {
    return `${normalizeName(name)}|${normalizeFlavor(flavor)}`;
}

function parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
                continue;
            }
            inQuotes = !inQuotes;
            continue;
        }
        if (char === ',' && !inQuotes) {
            cells.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    cells.push(current);
    return cells;
}

function parseNodeName(raw: string): ParsedNodeRef | null {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) return null;
    const documentMatch = trimmed.match(/^bny_document_id\|(\d+)$/i);
    if (documentMatch) {
        const docId = documentMatch[1];
        return {
            flavor: 'document',
            name: `bny_document_id|${docId}`,
            key: `bny_document_id|${docId}`,
        };
    }
    const parts = trimmed.split('|').map((part) => part.trim());
    const rawFlavor = normalizeFlavor(parts[0] ?? '');
    if (!rawFlavor) return null;
    const bestName = parts.find((part, idx) => idx > 0 && part) || parts[0];
    return {
        flavor: rawFlavor,
        name: bestName,
        key: seedKey(bestName, rawFlavor),
    };
}

function parseQuadRows(): QuadRow[] {
    const rows: QuadRow[] = [];
    for (const relativePath of QUAD_CSV_PATHS) {
        const hop: 0 | 1 = relativePath.includes('0-hop') ? 0 : 1;
        const absolutePath = resolve(process.cwd(), relativePath);
        if (!existsSync(absolutePath)) continue;
        const raw = readFileSync(absolutePath, 'utf8');
        const lines = raw.split(/\r?\n/).filter(Boolean);
        if (lines.length <= 1) continue;
        for (let i = 1; i < lines.length; i += 1) {
            const cells = parseCsvLine(lines[i]);
            if (cells.length < 8) continue;
            rows.push({
                hop,
                time: cells[0] ?? '',
                sourceName: cells[1] ?? '',
                sourceNindex: cells[2] ?? '',
                propertyName: cells[3] ?? '',
                pid: cells[4] ?? '',
                propertyType: cells[5] ?? '',
                value: cells[6] ?? '',
                destNindex: cells[7] ?? '',
            });
        }
    }
    return rows;
}

function resolveDocumentNeidForAppearsIn(row: QuadRow): string | null {
    const valueMatch = row.value.match(/^bny_document_id\|(\d+)$/i);
    if (valueMatch) {
        const mapped = documentNeidByDocumentId.get(valueMatch[1]);
        if (mapped) return mapped;
    }
    const normalizedDest = normalizeNeid(row.destNindex);
    if (knownDocumentNeids.has(normalizedDest)) return normalizedDest;
    return null;
}

export function loadQuadSeedGraph(): QuadSeedGraph {
    if (cachedSeedGraph) return cachedSeedGraph;

    const rows = parseQuadRows();
    const sourceDocsByNeid = new Map<string, Set<string>>();
    const zeroHopCoreNeids = new Set<string>();

    for (const row of rows) {
        if (row.propertyName !== 'appears_in') continue;
        const sourceNeid = normalizeNeid(row.sourceNindex);
        if (!sourceNeid) continue;
        const docNeid = resolveDocumentNeidForAppearsIn(row);
        if (!docNeid) continue;
        if (!sourceDocsByNeid.has(sourceNeid)) sourceDocsByNeid.set(sourceNeid, new Set());
        sourceDocsByNeid.get(sourceNeid)?.add(docNeid);
        if (row.hop === 0) zeroHopCoreNeids.add(sourceNeid);
    }

    const entityByKey = new Map<string, QuadSeedEntityNode>();
    const eventByKey = new Map<string, QuadSeedEventNode>();
    const relationshipByKey = new Map<string, QuadSeedRelationship>();

    const upsertEntity = (node: ParsedNodeRef, neid: string, docNeids: string[]) => {
        if (node.flavor === 'document' || node.flavor === 'event') return;
        const existing = entityByKey.get(node.key);
        if (!existing) {
            entityByKey.set(node.key, {
                key: node.key,
                name: node.name,
                flavor: node.flavor,
                nodeId: neid || node.key,
                canonicalNeid: neid || undefined,
                sourceDocumentNeids: [...new Set(docNeids)],
            });
            return;
        }
        existing.sourceDocumentNeids = [
            ...new Set([...(existing.sourceDocumentNeids ?? []), ...docNeids]),
        ];
        if (!existing.canonicalNeid && neid) existing.canonicalNeid = neid;
    };

    const upsertEvent = (node: ParsedNodeRef, neid: string, docNeids: string[]) => {
        if (node.flavor !== 'event') return;
        const existing = eventByKey.get(node.key);
        if (!existing) {
            eventByKey.set(node.key, {
                key: node.key,
                name: node.name,
                nodeId: neid || node.key,
                sourceDocumentNeids: [...new Set(docNeids)],
                properties: {},
            });
            return;
        }
        existing.sourceDocumentNeids = [
            ...new Set([...(existing.sourceDocumentNeids ?? []), ...docNeids]),
        ];
    };

    const upsertRelationship = (
        sourceKey: string,
        targetKey: string,
        type: string,
        recordedAt: string | undefined,
        sourceDocumentNeids: string[]
    ) => {
        const relationshipKey = `${sourceKey}|${targetKey}|${type}|${recordedAt ?? ''}`;
        const existing = relationshipByKey.get(relationshipKey);
        if (!existing) {
            relationshipByKey.set(relationshipKey, {
                sourceKey,
                targetKey,
                type,
                citations: [],
                recordedAt,
                sourceDocumentNeids: [...new Set(sourceDocumentNeids)],
            });
            return;
        }
        existing.sourceDocumentNeids = [
            ...new Set([...(existing.sourceDocumentNeids ?? []), ...sourceDocumentNeids]),
        ];
    };

    for (const row of rows) {
        const sourceNeid = normalizeNeid(row.sourceNindex);
        if (!sourceNeid) continue;
        const targetNeidForScope = normalizeNeid(row.destNindex);
        const sourceInCore = zeroHopCoreNeids.has(sourceNeid);
        const targetInCore = targetNeidForScope ? zeroHopCoreNeids.has(targetNeidForScope) : false;
        if (row.hop === 1 && !sourceInCore && !targetInCore) continue;
        const sourceNode = parseNodeName(row.sourceName);
        if (!sourceNode || sourceNode.flavor === 'document') continue;

        const docNeids = [...(sourceDocsByNeid.get(sourceNeid) ?? new Set<string>())];
        const isAppearsIn = row.propertyName === 'appears_in';
        const isSourceDocumentBacked = docNeids.length > 0;
        if (!isAppearsIn && !isSourceDocumentBacked) continue;

        if (sourceNode.flavor === 'event') {
            upsertEvent(sourceNode, sourceNeid, docNeids);
        } else {
            upsertEntity(sourceNode, sourceNeid, docNeids);
        }

        if (isAppearsIn) {
            const docNeid = resolveDocumentNeidForAppearsIn(row);
            if (!docNeid) continue;
            if (sourceNode.flavor === 'event') {
                const eventRecord = eventByKey.get(sourceNode.key);
                if (eventRecord) {
                    eventRecord.sourceDocumentNeids = [
                        ...new Set([...(eventRecord.sourceDocumentNeids ?? []), docNeid]),
                    ];
                }
            } else {
                const entityRecord = entityByKey.get(sourceNode.key);
                if (entityRecord) {
                    entityRecord.sourceDocumentNeids = [
                        ...new Set([...(entityRecord.sourceDocumentNeids ?? []), docNeid]),
                    ];
                }
            }
            continue;
        }

        if (row.propertyType === 'categorical') {
            if (sourceNode.flavor !== 'event') continue;
            const eventRecord = eventByKey.get(sourceNode.key);
            if (!eventRecord) continue;
            const propName = row.propertyName.replace(/^schema::property::/, '');
            if (!propName) continue;
            eventRecord.properties = {
                ...(eventRecord.properties ?? {}),
                [propName]: {
                    value: row.value,
                    timestamp: row.time || undefined,
                },
            };
            continue;
        }

        if (row.propertyType !== 'relational') continue;
        const targetNeid = targetNeidForScope;
        const targetNode = parseNodeName(row.value);
        if (!targetNode || !targetNeid || targetNode.flavor === 'document') continue;
        if (!sourceDocsByNeid.has(targetNeid)) continue;

        if (targetNode.flavor === 'event') {
            upsertEvent(targetNode, targetNeid, docNeids);
        } else {
            upsertEntity(targetNode, targetNeid, docNeids);
        }

        upsertRelationship(sourceNode.key, targetNode.key, row.propertyName, row.time, docNeids);
    }

    cachedSeedGraph = {
        entities: Array.from(entityByKey.values()),
        events: Array.from(eventByKey.values()),
        relationships: Array.from(relationshipByKey.values()),
    };
    return cachedSeedGraph;
}

export function loadQuadDerivedNeids(): QuadDerivedNeids {
    if (cachedDerivedNeids) return cachedDerivedNeids;
    const graph = loadQuadSeedGraph();
    const nodeFlavorByKey = new Map<string, string>();
    const canonicalNeidByKey = new Map<string, string>();

    for (const entity of graph.entities) {
        nodeFlavorByKey.set(entity.key, entity.flavor);
        if (entity.canonicalNeid)
            canonicalNeidByKey.set(entity.key, normalizeNeid(entity.canonicalNeid));
    }
    for (const eventItem of graph.events) {
        nodeFlavorByKey.set(eventItem.key, 'event');
    }

    const documentNeids = new Set<string>();
    for (const entity of graph.entities) {
        for (const docNeid of entity.sourceDocumentNeids ?? []) {
            const normalized = normalizeNeid(docNeid);
            if (normalized) documentNeids.add(normalized);
        }
    }
    for (const eventItem of graph.events) {
        for (const docNeid of eventItem.sourceDocumentNeids ?? []) {
            const normalized = normalizeNeid(docNeid);
            if (normalized) documentNeids.add(normalized);
        }
    }

    const eventHubNeids = new Set<string>();
    for (const rel of graph.relationships) {
        if (rel.type !== 'schema::relationship::participant') continue;
        const sourceFlavor = nodeFlavorByKey.get(rel.sourceKey);
        const targetFlavor = nodeFlavorByKey.get(rel.targetKey);
        if (sourceFlavor === 'event' && targetFlavor && targetFlavor !== 'event') {
            const neid = canonicalNeidByKey.get(rel.targetKey);
            if (neid) eventHubNeids.add(neid);
        }
        if (targetFlavor === 'event' && sourceFlavor && sourceFlavor !== 'event') {
            const neid = canonicalNeidByKey.get(rel.sourceKey);
            if (neid) eventHubNeids.add(neid);
        }
    }

    const propertyBearingNeids = new Set<string>();
    for (const entity of graph.entities) {
        const neid = entity.canonicalNeid ? normalizeNeid(entity.canonicalNeid) : '';
        if (!neid) continue;
        if (entity.flavor === 'fund_account' || entity.flavor === 'financial_instrument') {
            propertyBearingNeids.add(neid);
        }
    }

    cachedDerivedNeids = {
        documentNeids: Array.from(documentNeids),
        eventHubNeids: Array.from(eventHubNeids),
        propertyBearingNeids: Array.from(propertyBearingNeids),
    };
    return cachedDerivedNeids;
}
