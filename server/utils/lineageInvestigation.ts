import { mcpCallTool } from '~/server/utils/collectionConfig';
import type {
    CollectionState,
    LineageInvestigationChain,
    LineageInvestigationProgressEntry,
    LineageInvestigationRelationship,
    LineageInvestigationResult,
} from '~/utils/collectionTypes';

interface LineageInvestigationOptions {
    maxHops?: number;
    maxOrganizations?: number;
    onProgress?: (
        progress: LineageInvestigationProgressEntry & {
            // Backward-compatible counters for existing callers.
            scannedOrganizations: number;
            queueSize: number;
            relationshipCount: number;
            roots: number;
        }
    ) => void;
}

const DEFAULT_MAX_HOPS = 6;
const DEFAULT_MAX_ORGANIZATIONS = 250;
const RELATED_LIMIT = 100_000;
const LINEAGE_RELATIONSHIP_TYPES = [
    'direct_parent',
    'ultimate_parent',
    'subsidiary_of',
    'owns',
    'parent_of',
    'acquired_by',
];
const EXCLUDED_LINEAGE_NEID_PAIRS = new Set([
    // Explicitly exclude service-provider predecessor edge that is not a corporate action.
    '01470965072054453101|07683517764755523583',
    '07683517764755523583|01470965072054453101',
]);

const LINEAGE_TYPE_PATTERN =
    /(predecessor|successor|acquir|acquisition|merge|merger|sold|sale|buy|bought|purchase|owner|ownership|parent|subsidiary|absorbed|transfer)/i;

function normalizeNeid(value: string): string {
    const unpadded = value.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function normalizeRelationshipType(value: string): string {
    return String(value ?? '')
        .trim()
        .replace(/^schema::relationship::/, '')
        .toLowerCase();
}

function relationshipTypesFromRow(row: any): string[] {
    const values: unknown[] = [];
    if (Array.isArray(row?.relationship_types)) values.push(...row.relationship_types);
    if (typeof row?.relationship_type === 'string') values.push(row.relationship_type);
    if (typeof row?.type === 'string') values.push(row.type);
    if (typeof row?.relationship === 'string') values.push(row.relationship);
    if (typeof row?.relationship?.type === 'string') values.push(row.relationship.type);
    return Array.from(
        new Set(values.map((item) => String(item ?? '').trim()).filter((item) => item.length > 0))
    );
}

function collectRelationshipTypeCandidates(value: unknown, output: Set<string>): void {
    if (Array.isArray(value)) {
        for (const item of value) collectRelationshipTypeCandidates(item, output);
        return;
    }
    if (!value || typeof value !== 'object') return;
    const row = value as Record<string, unknown>;
    for (const [key, nested] of Object.entries(row)) {
        if (
            typeof nested === 'string' &&
            (key.toLowerCase().includes('relationship') ||
                nested.startsWith('schema::relationship::') ||
                LINEAGE_TYPE_PATTERN.test(nested))
        ) {
            output.add(nested);
        }
        collectRelationshipTypeCandidates(nested, output);
    }
}

function typeMatchesLineage(type: string): boolean {
    return LINEAGE_TYPE_PATTERN.test(normalizeRelationshipType(type));
}

function edgeId(edge: LineageInvestigationRelationship): string {
    return `${edge.sourceNeid}|${edge.targetNeid}|${edge.type}`;
}

function excludedPair(sourceNeid: string, targetNeid: string): boolean {
    return EXCLUDED_LINEAGE_NEID_PAIRS.has(`${sourceNeid}|${targetNeid}`);
}

function buildChains(
    roots: string[],
    relationships: LineageInvestigationRelationship[],
    maxHops: number
): LineageInvestigationChain[] {
    const nextBySource = new Map<string, LineageInvestigationRelationship[]>();
    for (const relationship of relationships) {
        const list = nextBySource.get(relationship.sourceNeid) ?? [];
        list.push(relationship);
        nextBySource.set(relationship.sourceNeid, list);
    }
    const chains: LineageInvestigationChain[] = [];
    for (const root of roots) {
        const stack: Array<{
            cursor: string;
            path: string[];
            types: string[];
            depth: number;
        }> = [{ cursor: root, path: [root], types: [], depth: 0 }];
        while (stack.length) {
            const current = stack.pop()!;
            const outgoing = nextBySource.get(current.cursor) ?? [];
            if (!outgoing.length || current.depth >= maxHops) {
                if (current.path.length > 1) {
                    chains.push({
                        rootNeid: root,
                        nodeNeids: current.path,
                        relationshipTypes: current.types,
                    });
                }
                continue;
            }
            let extended = false;
            for (const edge of outgoing) {
                if (current.path.includes(edge.targetNeid)) continue;
                extended = true;
                stack.push({
                    cursor: edge.targetNeid,
                    path: [...current.path, edge.targetNeid],
                    types: [...current.types, edge.type],
                    depth: current.depth + 1,
                });
            }
            if (!extended && current.path.length > 1) {
                chains.push({
                    rootNeid: root,
                    nodeNeids: current.path,
                    relationshipTypes: current.types,
                });
            }
        }
    }
    return chains;
}

export async function runCorporateLineageInvestigation(
    collection: CollectionState,
    options: LineageInvestigationOptions = {}
): Promise<LineageInvestigationResult> {
    const startedAt = new Date().toISOString();
    const maxHops = Math.max(1, Math.min(options.maxHops ?? DEFAULT_MAX_HOPS, 12));
    const maxOrganizations = Math.max(
        10,
        Math.min(options.maxOrganizations ?? DEFAULT_MAX_ORGANIZATIONS, 2000)
    );
    const strictSeedNeids = new Set(
        collection.documents.map((document) => normalizeNeid(document.neid))
    );
    const roots = collection.entities
        .filter(
            (entity) =>
                entity.flavor === 'organization' &&
                entity.sourceDocuments.some((docNeid) =>
                    strictSeedNeids.has(normalizeNeid(docNeid))
                )
        )
        .map((entity) => normalizeNeid(entity.neid));

    if (!roots.length) {
        return {
            status: 'ready',
            startedAt,
            completedAt: new Date().toISOString(),
            roots: [],
            scannedRelationshipTypes: [],
            matchedRelationshipTypes: [],
            scannedOrganizations: 0,
            traversedHops: 0,
            relationships: [],
            chains: [],
            rootsProcessed: 0,
            organizationsDiscovered: 0,
            queueRemaining: 0,
            progressLog: [],
        };
    }

    const schemaTypeCandidates = new Set<string>();
    const progressLog: LineageInvestigationProgressEntry[] = [];
    const runtimeTypeCandidates = new Set<string>();
    const matchedRelationshipTypes = new Set<string>();
    const seenOrganizations = new Set<string>(roots);
    const seenEdgeIds = new Set<string>();
    const relationships: LineageInvestigationRelationship[] = [];
    const queue: Array<{ neid: string; hop: number; rootNeid: string }> = roots.map((neid) => ({
        neid,
        hop: 0,
        rootNeid: neid,
    }));
    let processedOrganizations = 0;

    const publishProgress = (
        progress: Omit<
            LineageInvestigationProgressEntry,
            | 'timestamp'
            | 'rootsDiscovered'
            | 'rootsProcessed'
            | 'organizationsDiscovered'
            | 'queueRemaining'
            | 'edgesCollected'
        >
    ) => {
        const entry: LineageInvestigationProgressEntry = {
            timestamp: new Date().toISOString(),
            rootsDiscovered: roots.length,
            rootsProcessed: processedOrganizations,
            organizationsDiscovered: seenOrganizations.size,
            queueRemaining: queue.length,
            edgesCollected: relationships.length,
            ...progress,
        };
        progressLog.push(entry);
        options.onProgress?.({
            ...entry,
            scannedOrganizations: entry.rootsProcessed,
            queueSize: entry.queueRemaining,
            relationshipCount: entry.edgesCollected,
            roots: entry.rootsDiscovered,
        });
    };

    publishProgress({
        stage: 'schema',
        detail: `Preparing lineage scan from ${roots.length} root organizations...`,
        currentHop: 0,
        rootNeids: [...roots],
    });

    try {
        const schemaResult = await mcpCallTool('elemental_get_schema', {}, { timeoutMs: 20_000 });
        collectRelationshipTypeCandidates(schemaResult, schemaTypeCandidates);
        publishProgress({
            stage: 'schema',
            detail: `Loaded schema hints for lineage scan (${schemaTypeCandidates.size} candidate relationship types).`,
            currentHop: 0,
            rootNeids: [...roots],
        });
    } catch (error: any) {
        // Continue with runtime relationship detection from related results.
        publishProgress({
            stage: 'schema',
            detail: 'Schema lookup unavailable; continuing with runtime lineage detection only.',
            currentHop: 0,
            rootNeids: [...roots],
            error: error?.message || 'Schema lookup failed',
        });
    }

    // Seed from currently loaded relationships first.
    for (const relationship of collection.relationships) {
        const sourceNeid = normalizeNeid(relationship.sourceNeid);
        const targetNeid = normalizeNeid(relationship.targetNeid);
        const sourceFlavor = collection.entities.find(
            (entity) => normalizeNeid(entity.neid) === sourceNeid
        )?.flavor;
        const targetFlavor = collection.entities.find(
            (entity) => normalizeNeid(entity.neid) === targetNeid
        )?.flavor;
        if (sourceFlavor !== 'organization' || targetFlavor !== 'organization') continue;
        const type = relationship.type;
        runtimeTypeCandidates.add(type);
        if (!typeMatchesLineage(type)) continue;
        if (excludedPair(sourceNeid, targetNeid)) continue;
        matchedRelationshipTypes.add(type);
        const edge: LineageInvestigationRelationship = {
            sourceNeid,
            targetNeid,
            type,
            recordedAt: relationship.recordedAt,
            citations: relationship.citations ?? [],
            properties: relationship.properties ?? {},
            hop: 0,
            source: 'cached',
        };
        const id = edgeId(edge);
        if (seenEdgeIds.has(id)) continue;
        seenEdgeIds.add(id);
        relationships.push(edge);
    }
    publishProgress({
        stage: 'crawl',
        detail: `Starting lineage crawl across ${roots.length} root organizations...`,
        currentHop: 0,
        rootNeids: [...roots],
    });
    while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.hop >= maxHops) continue;
        if (seenOrganizations.size >= maxOrganizations) break;
        processedOrganizations += 1;
        publishProgress({
            stage: 'crawl',
            detail: `Scanning organization ${processedOrganizations} of up to ${maxOrganizations} at hop ${current.hop + 1}/${maxHops}...`,
            currentHop: current.hop,
            currentRootNeid: current.rootNeid,
            request: {
                tool: 'elemental_get_related',
                entityNeid: current.neid,
                relatedFlavor: 'organization',
                direction: 'both',
                limit: RELATED_LIMIT,
                relationshipTypes: [...LINEAGE_RELATIONSHIP_TYPES],
            },
        });
        try {
            const result = await mcpCallTool(
                'elemental_get_related',
                {
                    entity_id: { id_type: 'neid', id: current.neid },
                    related_flavor: 'organization',
                    direction: 'both',
                    limit: RELATED_LIMIT,
                    relationship_types: LINEAGE_RELATIONSHIP_TYPES,
                },
                { timeoutMs: 15_000 }
            );
            const rows = Array.isArray(result?.relationships) ? result.relationships : [];
            let rowLineageMatchCount = 0;
            let rowQueuedCount = 0;
            for (const row of rows) {
                if (!row?.neid) continue;
                const targetNeid = normalizeNeid(String(row.neid));
                const relationshipTypes = relationshipTypesFromRow(row);
                for (const relationshipType of relationshipTypes) {
                    runtimeTypeCandidates.add(relationshipType);
                    if (!typeMatchesLineage(relationshipType)) continue;
                    if (excludedPair(current.neid, targetNeid)) continue;
                    matchedRelationshipTypes.add(relationshipType);
                    const edge: LineageInvestigationRelationship = {
                        sourceNeid: current.neid,
                        targetNeid,
                        type: relationshipType,
                        recordedAt:
                            (row?.timestamp as string | undefined) ??
                            (row?.recorded_at as string | undefined),
                        citations: Array.isArray(row?.citations) ? row.citations : [],
                        properties: row?.properties ?? {},
                        hop: current.hop + 1,
                        source: 'crawl',
                    };
                    const id = edgeId(edge);
                    if (seenEdgeIds.has(id)) continue;
                    seenEdgeIds.add(id);
                    relationships.push(edge);
                    rowLineageMatchCount += 1;
                    if (
                        !seenOrganizations.has(targetNeid) &&
                        seenOrganizations.size < maxOrganizations
                    ) {
                        seenOrganizations.add(targetNeid);
                        queue.push({
                            neid: targetNeid,
                            hop: current.hop + 1,
                            rootNeid: current.rootNeid,
                        });
                        rowQueuedCount += 1;
                    }
                }
            }
            publishProgress({
                stage: 'crawl',
                detail: `Scanned ${processedOrganizations} organizations; ${queue.length} remaining in queue and ${relationships.length} lineage edges found so far.`,
                currentHop: current.hop,
                currentRootNeid: current.rootNeid,
                result: {
                    relatedCount: rows.length,
                    lineageMatchCount: rowLineageMatchCount,
                    queuedCount: rowQueuedCount,
                },
            });
        } catch (error: any) {
            // Ignore per-node failures and continue breadth-first crawl.
            publishProgress({
                stage: 'crawl',
                detail: `Skipped one organization after a related-entity error; continuing with ${queue.length} remaining in queue.`,
                currentHop: current.hop,
                currentRootNeid: current.rootNeid,
                error: error?.message || 'elemental_get_related failed',
            });
        }
    }

    const scannedRelationshipTypes = Array.from(
        new Set([...schemaTypeCandidates, ...runtimeTypeCandidates])
    )
        .map((type) => String(type))
        .sort((a, b) => normalizeRelationshipType(a).localeCompare(normalizeRelationshipType(b)));
    const matchedTypes = Array.from(matchedRelationshipTypes).sort((a, b) =>
        normalizeRelationshipType(a).localeCompare(normalizeRelationshipType(b))
    );

    publishProgress({
        stage: 'crawl',
        detail: `Lineage crawl complete: ${processedOrganizations} processed, ${seenOrganizations.size} discovered, ${queue.length} remaining, ${relationships.length} edges collected.`,
        currentHop: maxHops,
    });

    return {
        status: 'ready',
        startedAt,
        completedAt: new Date().toISOString(),
        roots,
        scannedRelationshipTypes,
        matchedRelationshipTypes: matchedTypes,
        scannedOrganizations: seenOrganizations.size,
        traversedHops: maxHops,
        relationships,
        chains: buildChains(roots, relationships, maxHops),
        rootsProcessed: processedOrganizations,
        organizationsDiscovered: seenOrganizations.size,
        queueRemaining: queue.length,
        progressLog,
    };
}
