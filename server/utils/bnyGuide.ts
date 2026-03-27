import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BNY_DOCUMENTS } from '~/utils/collectionTypes';

interface GuideGraph {
    nodes: Array<{ id: string; name: string; type: string }>;
    edges: Array<{
        source: string;
        target: string;
        relationship: string;
        citations?: string[];
        timestamp?: string;
    }>;
}

interface GuideRelationshipOccurrence {
    type: string;
    sourceName: string;
    targetName: string;
    citations: string[];
    timestamp?: string;
}

let _graph: GuideGraph | null = null;
let _relationshipsByKey: Map<string, GuideRelationshipOccurrence[]> | null = null;
let _relationshipsByEndpoints: Map<string, GuideRelationshipOccurrence[]> | null = null;
let _eventNames: Set<string> | null = null;

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

function parseNodeRef(ref: string): { name: string; type: string } {
    const [name, type] = ref.split('\0');
    return { name, type };
}

function loadGraph(): GuideGraph {
    if (_graph) return _graph;
    const path = resolve(process.cwd(), 'import/recordeval_graph_extracted.json');
    _graph = JSON.parse(readFileSync(path, 'utf-8')) as GuideGraph;
    return _graph;
}

function buildRelationshipKey(type: string, sourceName: string, targetName: string): string {
    return `${type}|${normalizeName(sourceName)}|${normalizeName(targetName)}`;
}

export function getGuideRelationshipOccurrences(
    type: string,
    sourceName: string,
    targetName: string
): GuideRelationshipOccurrence[] {
    if (!_relationshipsByKey) {
        _relationshipsByKey = new Map();
        for (const edge of loadGraph().edges) {
            const source = parseNodeRef(edge.source);
            const target = parseNodeRef(edge.target);
            const key = buildRelationshipKey(edge.relationship, source.name, target.name);
            const list = _relationshipsByKey.get(key) ?? [];
            list.push({
                type: edge.relationship,
                sourceName: source.name,
                targetName: target.name,
                citations: edge.citations ?? [],
                timestamp: edge.timestamp,
            });
            _relationshipsByKey.set(key, list);
        }
    }
    return _relationshipsByKey.get(buildRelationshipKey(type, sourceName, targetName)) ?? [];
}

export function getGuideRelationshipOccurrencesByEndpoints(
    sourceName: string,
    targetName: string,
    recordedAt?: string
): GuideRelationshipOccurrence[] {
    if (!_relationshipsByEndpoints) {
        _relationshipsByEndpoints = new Map();
        for (const edge of loadGraph().edges) {
            const source = parseNodeRef(edge.source);
            const target = parseNodeRef(edge.target);
            const key = `${normalizeName(source.name)}|${normalizeName(target.name)}`;
            const list = _relationshipsByEndpoints.get(key) ?? [];
            list.push({
                type: edge.relationship,
                sourceName: source.name,
                targetName: target.name,
                citations: edge.citations ?? [],
                timestamp: edge.timestamp,
            });
            _relationshipsByEndpoints.set(key, list);
        }
    }
    const key = `${normalizeName(sourceName)}|${normalizeName(targetName)}`;
    const matches = _relationshipsByEndpoints.get(key) ?? [];
    if (!recordedAt) return matches;
    const day = recordedAt.slice(0, 10);
    const dated = matches.filter((match) => (match.timestamp ?? '').slice(0, 10) === day);
    return dated.length ? dated : matches;
}

export function isGuideEventName(name: string): boolean {
    if (!_eventNames) {
        _eventNames = new Set(
            loadGraph()
                .nodes.filter((node) => node.type === 'schema::flavor::event')
                .map((node) => normalizeName(node.name))
        );
    }
    return _eventNames.has(normalizeName(name));
}

export function resolveCitationToDocumentNeid(citation: string | undefined): string | undefined {
    if (!citation) return undefined;
    const match = citation.match(/(\d+)\.pdf/i);
    if (!match) return undefined;
    const documentId = match[1];
    return BNY_DOCUMENTS.find((doc) => doc.documentId === documentId)?.neid;
}

export function getGuideDocumentNameByNeid(neid: string): string | undefined {
    const doc = BNY_DOCUMENTS.find((item) => item.neid === neid);
    return doc ? `BNY-${doc.documentId}.pdf` : undefined;
}
