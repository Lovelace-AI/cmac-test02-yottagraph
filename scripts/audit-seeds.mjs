import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const BASE_URL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3000';
const OUT_JSON = resolve(process.cwd(), 'design/seed-audit-2026-03-30.json');
const OUT_MD = resolve(process.cwd(), 'design/seed-audit-2026-03-30.md');

const DOC_NEIDS = [
    '02051052947608524725',
    '07447437794117404020',
    '07526709763959495568',
    '07780293260382878366',
    '08759058315171884540',
];

const HOP1_FLAVORS = [
    'organization',
    'person',
    'financial_instrument',
    'location',
    'fund_account',
    'legal_agreement',
];

const EVENT_HUB_FLAVORS = new Set(['organization', 'financial_instrument', 'fund_account']);

const EVENT_TIME_WINDOWS = [
    { after: '2018-01-01', before: '2026-12-31' },
    { before: '2018-01-01' },
];

function normalizeName(name) {
    return String(name ?? '')
        .trim()
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\b(the|inc|llc|ltd|corp|corporation|co|company|na|assoc|association)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeFlavor(type) {
    return String(type ?? '').replace(/^schema::flavor::/, '');
}

function normalizeNeid(neid) {
    const raw = String(neid ?? '');
    if (!raw) return raw;
    const unpadded = raw.replace(/^0+(?=\d)/, '') || '0';
    return unpadded.padStart(20, '0');
}

function keyFor(name, flavor) {
    return `${normalizeName(name)}|${normalizeFlavor(flavor)}`;
}

async function parseJsonResponse(res) {
    const text = await res.text();
    if (!text.trim()) return {};
    try {
        return JSON.parse(text);
    } catch {
        const blocks = text.split(/\r?\n\r?\n/);
        for (const block of blocks) {
            const lines = block.split(/\r?\n/);
            const dataLines = [];
            for (const line of lines) {
                if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
            }
            if (!dataLines.length) continue;
            const payload = dataLines.join('\n').trim();
            if (!payload || payload === '[DONE]') continue;
            try {
                const parsed = JSON.parse(payload);
                if (parsed?.jsonrpc || parsed?.result !== undefined || parsed?.error) return parsed;
                if (parsed?.data?.jsonrpc || parsed?.data?.result !== undefined) return parsed.data;
            } catch {
                // Continue scanning SSE blocks.
            }
        }
        throw new Error(`Non-JSON response: ${text.slice(0, 200)}`);
    }
}

function parseToolResult(payload) {
    const result = payload?.result;
    if (!result) return payload;
    if (result.structuredContent !== undefined) return result.structuredContent;
    const content = result.content;
    if (!Array.isArray(content)) return result;
    const parsed = content
        .map((item) => {
            if (!item || typeof item !== 'object') return undefined;
            if (item.type === 'json') return item.json;
            if (item.type === 'text' && typeof item.text === 'string') {
                try {
                    return JSON.parse(item.text);
                } catch {
                    return item.text;
                }
            }
            return undefined;
        })
        .filter((item) => item !== undefined);
    if (parsed.length === 1) return parsed[0];
    if (parsed.length > 1) return parsed;
    return result;
}

async function createRpc() {
    const endpoint = `${BASE_URL}/api/mcp/elemental`;
    let sessionId = null;
    let nextId = 1;

    async function send(method, params, attempts = 3) {
        let lastErr = null;
        for (let i = 0; i < attempts; i += 1) {
            try {
                const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
                if (sessionId) headers['Mcp-Session-Id'] = sessionId;
                const isNotification = method.startsWith('notifications/');
                const body = { jsonrpc: '2.0', method, ...(params ? { params } : {}) };
                if (!isNotification) body.id = nextId++;
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                });
                const returnedSession = res.headers.get('mcp-session-id');
                if (returnedSession) sessionId = returnedSession;
                const payload = await parseJsonResponse(res);
                if (!res.ok) {
                    throw new Error(
                        payload?.statusMessage ||
                            payload?.message ||
                            `RPC ${method} failed with ${res.status}`
                    );
                }
                if (payload?.error) {
                    throw new Error(payload.error.message || `RPC ${method} error`);
                }
                return payload;
            } catch (err) {
                lastErr = err;
                await new Promise((r) => setTimeout(r, 400 * (i + 1)));
            }
        }
        throw lastErr;
    }

    await send('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'seed-audit', version: '1.0.0' },
    });
    await send('notifications/initialized', {});

    return async function callTool(name, args, attempts = 3) {
        const payload = await send('tools/call', { name, arguments: args }, attempts);
        return parseToolResult(payload);
    };
}

async function loadSeedSnapshot() {
    const jsonPath = resolve(process.cwd(), 'import/recordeval_graph_extracted.json');
    const raw = await readFile(jsonPath, 'utf-8');
    const graph = JSON.parse(raw);

    const seedEntities = new Map();
    const seedEvents = new Map();
    const seedEntityPropertyKeys = new Set();
    const seedEventPropertyKeys = new Set();

    for (const node of graph.nodes ?? []) {
        const flavor = normalizeFlavor(node.type);
        if (flavor === 'document') continue;
        const entry = {
            name: node.name,
            flavor,
            nodeId: node.id,
            propertyKeys: Array.isArray(node.properties)
                ? node.properties.map((p) => p.name).filter(Boolean)
                : [],
        };
        if (flavor === 'event') {
            seedEvents.set(keyFor(node.name, flavor), entry);
            for (const k of entry.propertyKeys) seedEventPropertyKeys.add(k);
        } else {
            seedEntities.set(keyFor(node.name, flavor), entry);
            for (const k of entry.propertyKeys) seedEntityPropertyKeys.add(k);
        }
    }

    return {
        seedEntities,
        seedEvents,
        seedEntityPropertyKeys: [...seedEntityPropertyKeys].sort(),
        seedEventPropertyKeys: [...seedEventPropertyKeys].sort(),
    };
}

function toSortedArray(setLike) {
    return [...setLike].sort((a, b) => String(a).localeCompare(String(b)));
}

async function main() {
    const callTool = await createRpc();
    const seed = await loadSeedSnapshot();

    const discoveredEntitiesByNeid = new Map();
    const sourceDocsByEntityNeid = new Map();
    const relatedCalls = [];

    for (const docNeid of DOC_NEIDS) {
        for (const flavor of HOP1_FLAVORS) {
            const args = {
                entity_id: { id_type: 'neid', id: docNeid },
                related_flavor: flavor,
                limit: 500,
                direction: 'both',
            };
            const result = await callTool('elemental_get_related', args);
            const rows = result?.relationships ?? [];
            relatedCalls.push({ docNeid, flavor, rows: rows.length });
            for (const row of rows) {
                if (!row?.neid) continue;
                const neid = normalizeNeid(row.neid);
                const record = discoveredEntitiesByNeid.get(neid) ?? {
                    neid,
                    name: row.name || neid,
                    flavor: normalizeFlavor(row.flavor || flavor),
                    propertyKeys: new Set(),
                };
                const props = row.properties ?? {};
                for (const key of Object.keys(props)) record.propertyKeys.add(key);
                discoveredEntitiesByNeid.set(neid, record);
                const docs = sourceDocsByEntityNeid.get(neid) ?? new Set();
                docs.add(docNeid);
                sourceDocsByEntityNeid.set(neid, docs);
            }
        }
    }

    const eventHubs = [...discoveredEntitiesByNeid.values()]
        .filter((entity) => EVENT_HUB_FLAVORS.has(entity.flavor))
        .map((entity) => entity.neid);

    const discoveredEventsByNeid = new Map();
    const eventHubCounts = new Map();
    const eventCallStats = [];
    const participantNeidsByEvent = new Map();

    for (const hubNeid of eventHubs) {
        const eventsByNeid = new Map();
        let callErrors = 0;
        for (const time_range of EVENT_TIME_WINDOWS) {
            try {
                const result = await callTool(
                    'elemental_get_events',
                    {
                        entity_id: { id_type: 'neid', id: hubNeid },
                        limit: 500,
                        include_participants: true,
                        time_range,
                    },
                    2
                );
                for (const evt of result?.events ?? []) {
                    if (!evt?.neid) continue;
                    eventsByNeid.set(normalizeNeid(evt.neid), evt);
                }
            } catch {
                callErrors += 1;
            }
        }
        eventCallStats.push({ hubNeid, count: eventsByNeid.size, callErrors });
        eventHubCounts.set(hubNeid, eventsByNeid.size);
        for (const evt of eventsByNeid.values()) {
            const neid = normalizeNeid(evt.neid);
            const props = evt.properties ?? {};
            const existing = discoveredEventsByNeid.get(neid) ?? {
                neid,
                name: evt.name || neid,
                propertyKeys: new Set(),
                category: props.event_category?.value ?? props.category?.value,
                date: props.event_date?.value ?? props.date?.value,
                likelihood: props.event_likelihood?.value ?? props.likelihood?.value,
            };
            for (const key of Object.keys(props)) existing.propertyKeys.add(key);
            discoveredEventsByNeid.set(neid, existing);
            const participants = participantNeidsByEvent.get(neid) ?? new Set();
            for (const p of evt.participants ?? []) {
                if (!p?.neid) continue;
                participants.add(normalizeNeid(p.neid));
            }
            participantNeidsByEvent.set(neid, participants);
        }
    }

    const discoveredEntityPropertyKeys = new Set();
    for (const entity of discoveredEntitiesByNeid.values()) {
        for (const key of entity.propertyKeys) discoveredEntityPropertyKeys.add(key);
    }
    const discoveredEventPropertyKeys = new Set();
    for (const evt of discoveredEventsByNeid.values()) {
        for (const key of evt.propertyKeys) discoveredEventPropertyKeys.add(key);
    }

    const seedEntityKeys = new Set(seed.seedEntities.keys());
    const seedEventNameKeys = new Set(seed.seedEvents.keys());

    const mcpEntityByKey = new Map(
        [...discoveredEntitiesByNeid.values()].map((entity) => [
            keyFor(entity.name, entity.flavor),
            {
                neid: entity.neid,
                name: entity.name,
                flavor: entity.flavor,
                sourceDocuments: toSortedArray(sourceDocsByEntityNeid.get(entity.neid) ?? []),
                propertyKeyCount: entity.propertyKeys.size,
            },
        ])
    );
    const mcpEventByNameKey = new Map(
        [...discoveredEventsByNeid.values()].map((evt) => [
            keyFor(evt.name, 'event'),
            {
                neid: evt.neid,
                name: evt.name,
                date: evt.date ?? null,
                category: evt.category ?? null,
                propertyKeyCount: evt.propertyKeys.size,
                participantCount: (participantNeidsByEvent.get(evt.neid) ?? new Set()).size,
            },
        ])
    );

    const missingSeedEntities = [...seedEntityKeys]
        .filter((key) => !mcpEntityByKey.has(key))
        .map((key) => seed.seedEntities.get(key))
        .filter(Boolean);
    const mcpOnlyEntities = [...mcpEntityByKey.entries()]
        .filter(([key]) => !seedEntityKeys.has(key))
        .map(([, entity]) => entity);

    const missingSeedEvents = [...seedEventNameKeys]
        .filter((key) => !mcpEventByNameKey.has(key))
        .map((key) => seed.seedEvents.get(key))
        .filter(Boolean);
    const mcpOnlyEvents = [...mcpEventByNameKey.entries()]
        .filter(([key]) => !seedEventNameKeys.has(key))
        .map(([, event]) => event);

    const newEntityPropertyKeys = [...discoveredEntityPropertyKeys].filter(
        (key) => !seed.seedEntityPropertyKeys.includes(key)
    );
    const newEventPropertyKeys = [...discoveredEventPropertyKeys].filter(
        (key) => !seed.seedEventPropertyKeys.includes(key)
    );

    const topEventHubs = [...eventHubCounts.entries()]
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([neid, eventCount]) => {
            const entity = discoveredEntitiesByNeid.get(neid);
            return {
                neid,
                name: entity?.name ?? neid,
                flavor: entity?.flavor ?? 'unknown',
                eventCount,
            };
        });

    const audit = {
        generatedAt: new Date().toISOString(),
        sourceDocuments: DOC_NEIDS,
        counts: {
            seedEntities: seed.seedEntities.size,
            seedEvents: seed.seedEvents.size,
            mcpEntities: discoveredEntitiesByNeid.size,
            mcpEvents: discoveredEventsByNeid.size,
            missingSeedEntities: missingSeedEntities.length,
            missingSeedEvents: missingSeedEvents.length,
            mcpOnlyEntities: mcpOnlyEntities.length,
            mcpOnlyEvents: mcpOnlyEvents.length,
            newEntityPropertyKeys: newEntityPropertyKeys.length,
            newEventPropertyKeys: newEventPropertyKeys.length,
        },
        traversal: {
            relatedCalls,
            eventCallStats,
        },
        deltas: {
            missingSeedEntities,
            missingSeedEvents,
            mcpOnlyEntities,
            mcpOnlyEvents,
            newEntityPropertyKeys: newEntityPropertyKeys.sort(),
            newEventPropertyKeys: newEventPropertyKeys.sort(),
            topEventHubs,
        },
    };

    await writeFile(OUT_JSON, `${JSON.stringify(audit, null, 2)}\n`, 'utf-8');

    const md = [
        '# Seed Audit (2026-03-30)',
        '',
        `Generated: ${audit.generatedAt}`,
        '',
        '## Counts',
        `- Seed entities: ${audit.counts.seedEntities}`,
        `- Seed events: ${audit.counts.seedEvents}`,
        `- MCP entities (doc-hop1): ${audit.counts.mcpEntities}`,
        `- MCP events (doc-hop2): ${audit.counts.mcpEvents}`,
        `- Seed entities missing in MCP traversal: ${audit.counts.missingSeedEntities}`,
        `- Seed events missing in MCP traversal: ${audit.counts.missingSeedEvents}`,
        `- MCP-only entities: ${audit.counts.mcpOnlyEntities}`,
        `- MCP-only events: ${audit.counts.mcpOnlyEvents}`,
        `- New entity property keys (vs seed): ${audit.counts.newEntityPropertyKeys}`,
        `- New event property keys (vs seed): ${audit.counts.newEventPropertyKeys}`,
        '',
        '## Top Event Hubs (MCP traversal)',
        ...audit.deltas.topEventHubs.map(
            (hub) => `- ${hub.name} (${hub.flavor}) | ${hub.neid} | events=${hub.eventCount}`
        ),
        '',
        '## New Entity Property Keys',
        ...audit.deltas.newEntityPropertyKeys.map((key) => `- ${key}`),
        '',
        '## New Event Property Keys',
        ...audit.deltas.newEventPropertyKeys.map((key) => `- ${key}`),
        '',
        `Full machine-readable audit: \`${OUT_JSON}\``,
        '',
    ].join('\n');
    await writeFile(OUT_MD, `${md}\n`, 'utf-8');

    console.log(`Wrote ${OUT_JSON}`);
    console.log(`Wrote ${OUT_MD}`);
    console.log(JSON.stringify(audit.counts, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

