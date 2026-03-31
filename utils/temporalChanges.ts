import type { DocumentRecord, PropertyPoint, PropertySeriesRecord } from '~/utils/collectionTypes';

export type ChangeDirection = 'increase' | 'decrease' | 'flat' | 'informational';
export type ChangeSeverity = 'major' | 'moderate' | 'minor';
export type ValueKind = 'currency' | 'percent' | 'number' | 'text';
export type ChangeSortMode =
    | 'significance'
    | 'largest_increase'
    | 'largest_decrease'
    | 'most_recent'
    | 'metric_name'
    | 'source_period';
export type ViewMode = 'grouped' | 'feed';

export interface TemporalChangeEntry {
    id: string;
    metricKey: string;
    metricLabel: string;
    fromDocument: string;
    toDocument: string;
    fromDate?: string;
    toDate?: string;
    periodLabel: string;
    fromValue: unknown;
    toValue: unknown;
    fromDisplay: string;
    toDisplay: string;
    valueKind: ValueKind;
    direction: ChangeDirection;
    deltaNumeric: number | null;
    deltaDisplay: string;
    percentDelta: number | null;
    percentDeltaDisplay: string | null;
    severity: ChangeSeverity;
    severityScore: number;
    interpretation: string;
    sourceRecordedAt?: string;
    targetRecordedAt?: string;
}

export interface MetricChangeGroup {
    metricKey: string;
    metricLabel: string;
    changes: TemporalChangeEntry[];
    severityScore: number;
    volatilityScore: number;
}

export interface TemporalChangesSummary {
    totalChanges: number;
    metricsChanged: number;
    largestIncrease: TemporalChangeEntry | null;
    largestDecrease: TemporalChangeEntry | null;
    mostVolatileMetric: MetricChangeGroup | null;
    mostRecentComparison: TemporalChangeEntry | null;
}

export interface TemporalChangesModel {
    changes: TemporalChangeEntry[];
    grouped: MetricChangeGroup[];
    summary: TemporalChangesSummary;
}

interface ParsedValue {
    numeric: number | null;
    valueKind: ValueKind;
}

interface PointSnapshot {
    value: unknown;
    recordedAt?: string;
}

const CURRENCY_HINT = /(amount|earnings|valuation|liability|balance|price|cost|value|premium)/i;
const PERCENT_HINT = /(percent|percentage|rate|irr|yield|ratio|return|margin)/i;

export function buildTemporalChangesModel(
    series: PropertySeriesRecord[],
    documents: DocumentRecord[]
): TemporalChangesModel {
    const sortedDocuments = documents
        .slice()
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const changes: TemporalChangeEntry[] = [];

    for (const row of series) {
        for (let i = 1; i < sortedDocuments.length; i += 1) {
            const prevDoc = sortedDocuments[i - 1];
            const nextDoc = sortedDocuments[i];
            const fromSnapshot = valueAtDateRaw(row.points, prevDoc.date);
            const toSnapshot = valueAtDateRaw(row.points, nextDoc.date);
            if (!hasMeaningfulValue(fromSnapshot.value) || !hasMeaningfulValue(toSnapshot.value))
                continue;
            if (areValuesEquivalent(fromSnapshot.value, toSnapshot.value)) continue;

            const entry = buildChangeEntry(
                row.propertyName,
                prevDoc,
                nextDoc,
                fromSnapshot,
                toSnapshot
            );
            if (entry) changes.push(entry);
        }
    }

    const groupedMap = new Map<string, MetricChangeGroup>();
    for (const change of changes) {
        const existing = groupedMap.get(change.metricKey);
        if (existing) {
            existing.changes.push(change);
            existing.severityScore += change.severityScore;
            existing.volatilityScore += Math.abs(change.percentDelta ?? change.deltaNumeric ?? 0);
        } else {
            groupedMap.set(change.metricKey, {
                metricKey: change.metricKey,
                metricLabel: change.metricLabel,
                changes: [change],
                severityScore: change.severityScore,
                volatilityScore: Math.abs(change.percentDelta ?? change.deltaNumeric ?? 0),
            });
        }
    }

    const grouped = Array.from(groupedMap.values())
        .map((group) => ({
            ...group,
            changes: sortChanges(group.changes, 'most_recent'),
        }))
        .sort((a, b) => b.severityScore - a.severityScore);

    return {
        changes: sortChanges(changes, 'significance'),
        grouped,
        summary: summarizeChanges(changes, grouped),
    };
}

export function sortChanges(
    changes: TemporalChangeEntry[],
    mode: ChangeSortMode
): TemporalChangeEntry[] {
    const list = changes.slice();
    switch (mode) {
        case 'largest_increase':
            return list.sort(
                (a, b) =>
                    (b.deltaNumeric ?? Number.NEGATIVE_INFINITY) -
                    (a.deltaNumeric ?? Number.NEGATIVE_INFINITY)
            );
        case 'largest_decrease':
            return list.sort(
                (a, b) =>
                    (a.deltaNumeric ?? Number.POSITIVE_INFINITY) -
                    (b.deltaNumeric ?? Number.POSITIVE_INFINITY)
            );
        case 'most_recent':
            return list.sort((a, b) => (b.toDate || '').localeCompare(a.toDate || ''));
        case 'metric_name':
            return list.sort((a, b) => a.metricLabel.localeCompare(b.metricLabel));
        case 'source_period':
            return list.sort((a, b) =>
                `${a.fromDate || ''}-${a.toDate || ''}`.localeCompare(
                    `${b.fromDate || ''}-${b.toDate || ''}`
                )
            );
        case 'significance':
        default:
            return list.sort((a, b) => {
                if (b.severityScore !== a.severityScore) return b.severityScore - a.severityScore;
                const byDate = (b.toDate || '').localeCompare(a.toDate || '');
                if (byDate !== 0) return byDate;
                return Math.abs(b.deltaNumeric ?? 0) - Math.abs(a.deltaNumeric ?? 0);
            });
    }
}

function summarizeChanges(
    changes: TemporalChangeEntry[],
    groups: MetricChangeGroup[]
): TemporalChangesSummary {
    const numericChanges = changes.filter((change) => change.deltaNumeric != null);
    const increases = numericChanges.filter((change) => (change.deltaNumeric ?? 0) > 0);
    const decreases = numericChanges.filter((change) => (change.deltaNumeric ?? 0) < 0);

    const largestIncrease =
        increases.sort((a, b) => (b.deltaNumeric ?? 0) - (a.deltaNumeric ?? 0))[0] ?? null;
    const largestDecrease =
        decreases.sort((a, b) => (a.deltaNumeric ?? 0) - (b.deltaNumeric ?? 0))[0] ?? null;
    const mostRecentComparison =
        changes.slice().sort((a, b) => (b.toDate || '').localeCompare(a.toDate || ''))[0] ?? null;
    const mostVolatileMetric =
        groups.slice().sort((a, b) => b.volatilityScore - a.volatilityScore)[0] ?? null;

    return {
        totalChanges: changes.length,
        metricsChanged: groups.length,
        largestIncrease,
        largestDecrease,
        mostVolatileMetric,
        mostRecentComparison,
    };
}

function buildChangeEntry(
    propertyName: string,
    fromDoc: DocumentRecord,
    toDoc: DocumentRecord,
    fromSnapshot: PointSnapshot,
    toSnapshot: PointSnapshot
): TemporalChangeEntry | null {
    const metricLabel = humanizeMetricLabel(propertyName);
    const parsedFrom = parseComparableValue(fromSnapshot.value, propertyName);
    const parsedTo = parseComparableValue(toSnapshot.value, propertyName);
    const valueKind = resolveValueKind(parsedFrom, parsedTo, propertyName);
    const fromDisplay = formatComparableValue(fromSnapshot.value, valueKind);
    const toDisplay = formatComparableValue(toSnapshot.value, valueKind);
    const deltaNumeric =
        parsedFrom.numeric != null && parsedTo.numeric != null
            ? parsedTo.numeric - parsedFrom.numeric
            : null;
    const percentDelta =
        deltaNumeric != null && parsedFrom.numeric != null && parsedFrom.numeric !== 0
            ? (deltaNumeric / Math.abs(parsedFrom.numeric)) * 100
            : null;
    const direction = deriveDirection(deltaNumeric, fromDisplay, toDisplay);
    const deltaDisplay = formatDelta(deltaNumeric, valueKind, direction);
    const percentDeltaDisplay =
        percentDelta != null && Number.isFinite(percentDelta)
            ? `${signed(percentDelta)}${percentDelta.toFixed(2)}%`
            : null;
    const severityScore = scoreSeverity(deltaNumeric, percentDelta, direction);
    const severity = labelSeverity(severityScore);
    const periodLabel = `${documentLabel(fromDoc)} -> ${documentLabel(toDoc)}`;

    return {
        id: `${propertyName}-${fromDoc.neid}-${toDoc.neid}`,
        metricKey: propertyName,
        metricLabel,
        fromDocument: documentLabel(fromDoc),
        toDocument: documentLabel(toDoc),
        fromDate: fromDoc.date,
        toDate: toDoc.date,
        periodLabel,
        fromValue: fromSnapshot.value,
        toValue: toSnapshot.value,
        fromDisplay,
        toDisplay,
        valueKind,
        direction,
        deltaNumeric,
        deltaDisplay,
        percentDelta,
        percentDeltaDisplay,
        severity,
        severityScore,
        interpretation: buildInterpretation(metricLabel, direction, severity, fromDoc, toDoc),
        sourceRecordedAt: fromSnapshot.recordedAt,
        targetRecordedAt: toSnapshot.recordedAt,
    };
}

function valueAtDateRaw(points: PropertyPoint[], date?: string): PointSnapshot {
    if (!points.length) return { value: null };
    const sorted = points
        .slice()
        .filter((point) => point.recordedAt)
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    if (!sorted.length) return { value: points[points.length - 1]?.value ?? null };
    if (!date) {
        const latest = sorted[sorted.length - 1];
        return { value: latest.value, recordedAt: latest.recordedAt };
    }
    let candidate: PropertyPoint | null = null;
    for (const point of sorted) {
        if (point.recordedAt.slice(0, 10) <= date.slice(0, 10)) candidate = point;
    }
    if (!candidate) candidate = sorted[0];
    return { value: candidate.value, recordedAt: candidate.recordedAt };
}

function parseComparableValue(value: unknown, metricKey: string): ParsedValue {
    if (typeof value === 'number' && Number.isFinite(value))
        return { numeric: value, valueKind: inferFromMetric(metricKey) };
    const text = String(value ?? '').trim();
    if (!text) return { numeric: null, valueKind: 'text' };

    const hasPercent = /%/.test(text);
    const hasCurrency = /\$/.test(text);
    const numericText = text.replace(/[$,%\s]/g, '').replace(/,/g, '');
    const numeric = Number(numericText);
    if (!Number.isFinite(numeric)) return { numeric: null, valueKind: 'text' };

    if (hasCurrency) return { numeric, valueKind: 'currency' };
    if (hasPercent) return { numeric, valueKind: 'percent' };
    return { numeric, valueKind: inferFromMetric(metricKey) };
}

function inferFromMetric(metricKey: string): ValueKind {
    if (PERCENT_HINT.test(metricKey)) return 'percent';
    if (CURRENCY_HINT.test(metricKey)) return 'currency';
    return 'number';
}

function resolveValueKind(from: ParsedValue, to: ParsedValue, metricKey: string): ValueKind {
    if (from.valueKind === 'currency' || to.valueKind === 'currency') return 'currency';
    if (from.valueKind === 'percent' || to.valueKind === 'percent') return 'percent';
    if (from.valueKind === 'number' || to.valueKind === 'number') return inferFromMetric(metricKey);
    return 'text';
}

function formatComparableValue(value: unknown, valueKind: ValueKind): string {
    if (!hasMeaningfulValue(value)) return '';
    if (typeof value === 'string' && /[$,%]/.test(value)) return value.trim();
    const numeric = Number(String(value).replace(/,/g, ''));
    if (!Number.isFinite(numeric) || valueKind === 'text') return String(value);
    if (valueKind === 'currency') {
        return Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numeric);
    }
    if (valueKind === 'percent') {
        const precision = Math.abs(numeric) < 1 ? 4 : 2;
        return `${numeric.toFixed(precision)}%`;
    }
    return Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(numeric);
}

function formatDelta(
    delta: number | null,
    valueKind: ValueKind,
    direction: ChangeDirection
): string {
    if (delta == null || !Number.isFinite(delta))
        return direction === 'informational' ? 'Value changed' : 'N/A';
    if (valueKind === 'currency') {
        return `${direction === 'increase' ? '↑' : '↓'} ${Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            signDisplay: 'always',
        }).format(delta)}`;
    }
    if (valueKind === 'percent') {
        return `${direction === 'increase' ? '↑' : '↓'} ${signed(delta)}${delta.toFixed(4)}%`;
    }
    return `${direction === 'increase' ? '↑' : '↓'} ${signed(delta)}${Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(delta)}`;
}

function deriveDirection(
    deltaNumeric: number | null,
    fromDisplay: string,
    toDisplay: string
): ChangeDirection {
    if (deltaNumeric == null) return fromDisplay === toDisplay ? 'flat' : 'informational';
    if (Math.abs(deltaNumeric) < 1e-9) return 'flat';
    return deltaNumeric > 0 ? 'increase' : 'decrease';
}

function scoreSeverity(
    deltaNumeric: number | null,
    percentDelta: number | null,
    direction: ChangeDirection
): number {
    if (direction === 'flat') return 0;
    if (deltaNumeric == null) return direction === 'informational' ? 12 : 8;
    const percentComponent = Math.min(100, Math.abs(percentDelta ?? 0));
    const absoluteComponent = Math.min(60, Math.log10(Math.abs(deltaNumeric) + 1) * 20);
    return percentComponent * 0.65 + absoluteComponent * 0.35;
}

function labelSeverity(score: number): ChangeSeverity {
    if (score >= 45) return 'major';
    if (score >= 20) return 'moderate';
    return 'minor';
}

function buildInterpretation(
    metricLabel: string,
    direction: ChangeDirection,
    severity: ChangeSeverity,
    fromDoc: DocumentRecord,
    toDoc: DocumentRecord
): string {
    const qualifier =
        severity === 'major' ? 'materially' : severity === 'moderate' ? 'meaningfully' : 'slightly';
    if (direction === 'increase') {
        return `${metricLabel} increased ${qualifier} between ${documentLabel(fromDoc)} and ${documentLabel(toDoc)}.`;
    }
    if (direction === 'decrease') {
        return `${metricLabel} declined ${qualifier} between ${documentLabel(fromDoc)} and ${documentLabel(toDoc)}.`;
    }
    return `${metricLabel} changed between ${documentLabel(fromDoc)} and ${documentLabel(toDoc)}.`;
}

function documentLabel(document: DocumentRecord): string {
    const datePart = document.date ? ` (${document.date.slice(0, 10)})` : '';
    return `${document.title}${datePart}`;
}

function humanizeMetricLabel(raw: string): string {
    const normalized = raw.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return 'Unknown metric';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function hasMeaningfulValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    const text = String(value).trim().toLowerCase();
    return Boolean(text) && text !== 'null' && text !== 'undefined';
}

function areValuesEquivalent(a: unknown, b: unknown): boolean {
    const normalizedA = String(a ?? '').trim();
    const normalizedB = String(b ?? '').trim();
    if (normalizedA === normalizedB) return true;
    const parsedA = Number(normalizedA.replace(/[$,%\s]/g, '').replace(/,/g, ''));
    const parsedB = Number(normalizedB.replace(/[$,%\s]/g, '').replace(/,/g, ''));
    if (!Number.isFinite(parsedA) || !Number.isFinite(parsedB)) return false;
    return Math.abs(parsedA - parsedB) < 1e-9;
}

function signed(value: number): string {
    return value >= 0 ? '+' : '';
}
