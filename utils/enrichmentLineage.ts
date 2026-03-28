import type { EntityRecord, RelationshipRecord } from '~/utils/collectionTypes';

function normalizeRelationshipType(type: string): string {
    return type.replace(/^schema::relationship::/, '');
}

function representativeFor(neid: string, predecessorToSuccessor: Map<string, string>): string {
    const seen = new Set<string>();
    let cursor = neid;
    while (predecessorToSuccessor.has(cursor) && !seen.has(cursor)) {
        seen.add(cursor);
        cursor = predecessorToSuccessor.get(cursor)!;
    }
    return cursor;
}

function mergedOrigin(cluster: EntityRecord[]): EntityRecord['origin'] {
    if (cluster.some((entity) => entity.origin === 'document')) return 'document';
    if (cluster.some((entity) => entity.origin === 'enriched')) return 'enriched';
    return 'agent';
}

export function projectCollapsedOrganizationLineage(
    entities: EntityRecord[],
    relationships: RelationshipRecord[]
): {
    representativeByNeid: Map<string, string>;
    entities: EntityRecord[];
    relationships: RelationshipRecord[];
    collapsedOrganizationCount: number;
} {
    const entityByNeid = new Map(entities.map((entity) => [entity.neid, entity]));
    const predecessorToSuccessor = new Map<string, string>();

    for (const relationship of relationships) {
        const relType = normalizeRelationshipType(relationship.type);
        if (relType !== 'successor_to' && relType !== 'predecessor_of') continue;
        const source = entityByNeid.get(relationship.sourceNeid);
        const target = entityByNeid.get(relationship.targetNeid);
        if (!source || !target) continue;
        if (source.flavor !== 'organization' || target.flavor !== 'organization') continue;

        // predecessor_of(A, B) => A is predecessor, B is successor.
        if (relType === 'predecessor_of') {
            predecessorToSuccessor.set(source.neid, target.neid);
            continue;
        }
        // successor_to(A, B) => A is successor, B is predecessor.
        predecessorToSuccessor.set(target.neid, source.neid);
    }

    const representativeByNeid = new Map<string, string>();
    for (const entity of entities) {
        if (entity.flavor !== 'organization') {
            representativeByNeid.set(entity.neid, entity.neid);
            continue;
        }
        representativeByNeid.set(
            entity.neid,
            representativeFor(entity.neid, predecessorToSuccessor)
        );
    }

    const organizationClusters = new Map<string, EntityRecord[]>();
    for (const entity of entities) {
        const representative = representativeByNeid.get(entity.neid) ?? entity.neid;
        const cluster = organizationClusters.get(representative) ?? [];
        cluster.push(entity);
        organizationClusters.set(representative, cluster);
    }

    const collapsedEntities: EntityRecord[] = [];
    const addedEntityNeids = new Set<string>();
    for (const [representativeNeid, cluster] of organizationClusters.entries()) {
        const representativeEntity = entityByNeid.get(representativeNeid);
        if (!representativeEntity) continue;

        const merged = {
            ...representativeEntity,
            sourceDocuments: Array.from(new Set(cluster.flatMap((item) => item.sourceDocuments))),
            origin: mergedOrigin(cluster),
        } satisfies EntityRecord;
        collapsedEntities.push(merged);
        addedEntityNeids.add(representativeNeid);
    }

    const relationshipByKey = new Map<string, RelationshipRecord>();
    for (const relationship of relationships) {
        const sourceRepresentative =
            representativeByNeid.get(relationship.sourceNeid) ?? relationship.sourceNeid;
        const targetRepresentative =
            representativeByNeid.get(relationship.targetNeid) ?? relationship.targetNeid;
        if (sourceRepresentative === targetRepresentative) continue;

        const key = `${sourceRepresentative}|${targetRepresentative}|${relationship.type}`;
        const existing = relationshipByKey.get(key);
        if (!existing) {
            relationshipByKey.set(key, {
                ...relationship,
                sourceNeid: sourceRepresentative,
                targetNeid: targetRepresentative,
            });
            continue;
        }
        relationshipByKey.set(key, {
            ...existing,
            citations: Array.from(
                new Set([...(existing.citations ?? []), ...(relationship.citations ?? [])])
            ),
            sourceDocumentNeid: existing.sourceDocumentNeid ?? relationship.sourceDocumentNeid,
        });
    }

    const collapsedOrganizationCount = entities.filter(
        (entity) =>
            entity.flavor === 'organization' &&
            (representativeByNeid.get(entity.neid) ?? entity.neid) !== entity.neid
    ).length;

    return {
        representativeByNeid,
        entities: collapsedEntities.filter((entity) => addedEntityNeids.has(entity.neid)),
        relationships: Array.from(relationshipByKey.values()),
        collapsedOrganizationCount,
    };
}
