import { getCachedCollection } from '~/server/api/collection/bootstrap.get';
import { readCollectionCache } from '~/server/utils/collectionCache';
import { generateGeminiText } from '~/server/utils/gemini';
import type { EntityRecord, EventRecord, RelationshipRecord } from '~/utils/collectionTypes';

interface ScoredEntity extends EntityRecord {
    relationshipCount: number;
    eventCount: number;
    score: number;
}

interface ScoredEvent extends EventRecord {
    participantCount: number;
    score: number;
}

function countBy<T>(items: T[], keyFn: (item: T) => string): Array<[string, number]> {
    const counts = new Map<string, number>();
    for (const item of items) {
        const key = keyFn(item);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function topEntities(
    entities: EntityRecord[],
    relationships: RelationshipRecord[],
    events: EventRecord[]
): ScoredEntity[] {
    const entityConnectionCount = new Map<string, number>();
    for (const rel of relationships) {
        entityConnectionCount.set(
            rel.sourceNeid,
            (entityConnectionCount.get(rel.sourceNeid) ?? 0) + 1
        );
        entityConnectionCount.set(
            rel.targetNeid,
            (entityConnectionCount.get(rel.targetNeid) ?? 0) + 1
        );
    }

    const eventCountByEntity = new Map<string, number>();
    for (const evt of events) {
        for (const neid of evt.participantNeids) {
            eventCountByEntity.set(neid, (eventCountByEntity.get(neid) ?? 0) + 1);
        }
    }

    return entities
        .map((entity) => {
            const relationshipCount = entityConnectionCount.get(entity.neid) ?? 0;
            const eventCount = eventCountByEntity.get(entity.neid) ?? 0;
            const sourceCount = entity.sourceDocuments.length;
            return {
                ...entity,
                relationshipCount,
                eventCount,
                score: relationshipCount * 2 + eventCount * 1.5 + sourceCount,
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
}

function topEvents(events: EventRecord[]): ScoredEvent[] {
    return events
        .map((event) => {
            const participantCount = event.participantNeids.length;
            const sourceCount = event.sourceDocuments.length;
            const likelihoodBoost =
                event.likelihood === 'confirmed' ? 2 : event.likelihood === 'likely' ? 1 : 0.25;
            return {
                ...event,
                participantCount,
                score: participantCount * 1.8 + sourceCount + likelihoodBoost,
            };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}

function parseJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = (fenced?.[1] ?? trimmed).trim();
    try {
        return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
        const start = candidate.indexOf('{');
        const end = candidate.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) return null;
        try {
            return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
        } catch {
            return null;
        }
    }
}

function withIndefiniteArticle(noun: string): string {
    return `${/^[aeiou]/i.test(noun) ? 'an' : 'a'} ${noun}`;
}

function fallbackEntityRole(flavor: string): string {
    const roles: Record<string, string> = {
        organization: 'a key party in the financing structure',
        person: 'an individual involved in the deal record',
        financial_instrument: 'a core financing instrument referenced across the deal documents',
        location: 'a place or project site tied to the financing',
        fund_account: 'an account used to hold, value, or move deal funds',
        legal_agreement: 'a legal document that defines obligations in the financing',
    };
    return roles[flavor] ?? `${withIndefiniteArticle(flavor.replace(/_/g, ' '))} in the collection`;
}

function entityContextSummary(
    entity: ScoredEntity,
    relationships: RelationshipRecord[],
    events: EventRecord[],
    entityNameByNeid: Map<string, string>
) {
    const related = relationships.filter(
        (rel) => rel.sourceNeid === entity.neid || rel.targetNeid === entity.neid
    );
    const topRelationshipTypes = countBy(related, (rel) => rel.type)
        .slice(0, 3)
        .map(
            ([type, count]) =>
                `${type.replace(/schema::relationship::/, '').replace(/_/g, ' ')} (${count})`
        );
    const counterparties = related
        .map((rel) => (rel.sourceNeid === entity.neid ? rel.targetNeid : rel.sourceNeid))
        .filter((neid) => neid !== entity.neid)
        .map((neid) => entityNameByNeid.get(neid))
        .filter((name): name is string => Boolean(name));
    const topCounterparties = countBy(counterparties, (name) => name)
        .slice(0, 4)
        .map(([name]) => name);
    const relatedEvents = events
        .filter((event) => event.participantNeids.includes(entity.neid))
        .slice(0, 3)
        .map((event) => event.name);
    return {
        topRelationshipTypes,
        topCounterparties,
        relatedEvents,
    };
}

function eventContextSummary(event: ScoredEvent, entityNameByNeid: Map<string, string>) {
    const participants = event.participantNeids
        .map((neid) => entityNameByNeid.get(neid))
        .filter((name): name is string => Boolean(name))
        .slice(0, 5);
    return { participants };
}

function fallbackEntitySummary(entity: ScoredEntity): string {
    return `${entity.name} is ${fallbackEntityRole(entity.flavor)}, linking ${entity.relationshipCount} relationships and ${entity.eventCount} events across the document set.`;
}

function fallbackEventSummary(event: ScoredEvent): string {
    const datePart = event.date ? ` on ${event.date.slice(0, 10)}` : '';
    const categoryPart = event.category ? `${event.category.toLowerCase()} event` : 'event';
    return `${event.name} is a ${categoryPart}${datePart} that marks a meaningful step in the financing timeline with ${event.participantCount} participants.`;
}

export default defineEventHandler(async () => {
    const inMemoryCollection = getCachedCollection();
    const collection =
        inMemoryCollection ?? (await readCollectionCache()).state ?? inMemoryCollection;
    if (!collection) {
        throw createError({
            statusCode: 409,
            statusMessage: 'Collection not loaded. Run a rebuild first.',
        });
    }

    const keyEntities = topEntities(
        collection.entities,
        collection.relationships,
        collection.events
    );
    const keyEvents = topEvents(collection.events);
    const entityNameByNeid = new Map(
        collection.entities.map((entity) => [entity.neid, entity.name])
    );

    const fallbackEntitySummaries = Object.fromEntries(
        keyEntities.map((entity) => [entity.neid, fallbackEntitySummary(entity)])
    );
    const fallbackEventSummaries = Object.fromEntries(
        keyEvents.map((event) => [event.neid, fallbackEventSummary(event)])
    );

    try {
        const generated = await generateGeminiText({
            label: 'key_insight_language',
            systemInstruction:
                'You write concise collection-grounded descriptions. Return strict JSON only. Each summary must be exactly one sentence, neutral, and under 28 words.',
            prompt: [
                'Return a JSON object with exactly these keys:',
                '- entitySummaries: object keyed by entity NEID with one-sentence summaries',
                '- eventSummaries: object keyed by event NEID with one-sentence summaries',
                '',
                'Write plain-English summaries for an analyst, not graph-engineering labels.',
                'Explain what each item is in real-world terms and why it matters to the meaning of this financing-related document collection.',
                'Do not just restate the KG flavor such as organization, financial instrument, or event.',
                'If the item is a financing instrument or legal document, explain its business role in ordinary language.',
                'Prefer significance, role, and context over counts, but you may use counts when they support significance.',
                'Do not mention missing data, confidence, or speculate beyond the provided facts.',
                '',
                'Entities:',
                ...keyEntities.map((entity) => {
                    const context = entityContextSummary(
                        entity,
                        collection.relationships,
                        collection.events,
                        entityNameByNeid
                    );
                    return JSON.stringify({
                        neid: entity.neid,
                        name: entity.name,
                        flavor: entity.flavor,
                        sourceDocuments: entity.sourceDocuments.length,
                        relationships: entity.relationshipCount,
                        events: entity.eventCount,
                        topRelationshipTypes: context.topRelationshipTypes,
                        counterparties: context.topCounterparties,
                        relatedEvents: context.relatedEvents,
                    });
                }),
                '',
                'Events:',
                ...keyEvents.map((event) => {
                    const context = eventContextSummary(event, entityNameByNeid);
                    return JSON.stringify({
                        neid: event.neid,
                        name: event.name,
                        category: event.category,
                        date: event.date,
                        participants: event.participantCount,
                        sourceDocuments: event.sourceDocuments.length,
                        participantNames: context.participants,
                        description: event.description,
                    });
                }),
                '',
                'Bad summary example: "IRREVOCABLE LETTER OF CREDIT NO. 5094714 is a financial instrument that appears across 5 source documents in this collection."',
                'Better summary style: explain that it is the credit support backing the bond structure, liquidity, repayment, or another concrete role shown by the supplied relationships and events.',
            ].join('\n'),
            temperature: 0.3,
            maxOutputTokens: 900,
            retries: 1,
        });

        let entitySummaries = fallbackEntitySummaries;
        let eventSummaries = fallbackEventSummaries;

        try {
            const parsed = parseJsonObject(generated.text);
            if (parsed?.entitySummaries && typeof parsed.entitySummaries === 'object') {
                entitySummaries = {
                    ...fallbackEntitySummaries,
                    ...Object.fromEntries(
                        Object.entries(parsed.entitySummaries).filter(
                            ([key, value]) => typeof key === 'string' && typeof value === 'string'
                        )
                    ),
                };
            }
            if (parsed?.eventSummaries && typeof parsed.eventSummaries === 'object') {
                eventSummaries = {
                    ...fallbackEventSummaries,
                    ...Object.fromEntries(
                        Object.entries(parsed.eventSummaries).filter(
                            ([key, value]) => typeof key === 'string' && typeof value === 'string'
                        )
                    ),
                };
            }
        } catch {
            // fall back to deterministic descriptions when model output is invalid
        }

        return {
            entitySummaries,
            eventSummaries,
            usage: {
                model: generated.usage.model,
                promptTokens: generated.usage.promptTokens,
                completionTokens: generated.usage.completionTokens,
                totalTokens: generated.usage.totalTokens,
                costUsd: 0,
            },
        };
    } catch {
        return {
            entitySummaries: fallbackEntitySummaries,
            eventSummaries: fallbackEventSummaries,
            usage: {
                model: 'fallback',
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                costUsd: 0,
            },
        };
    }
});
