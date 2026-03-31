export interface NewsDatePresentation {
    absolute: string;
    relative?: string;
    isUnavailable: boolean;
}

function parseDate(value?: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

export function formatNewsDate(value?: string): NewsDatePresentation {
    const parsed = parseDate(value);
    if (!parsed) {
        return {
            absolute: 'Date unavailable',
            isUnavailable: true,
        };
    }
    return {
        absolute: new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
        }).format(parsed),
        relative: formatRelativeNewsDate(parsed),
        isUnavailable: false,
    };
}

export function formatRelativeNewsDate(date: Date, nowInput = new Date()): string {
    const now = nowInput.getTime();
    const then = date.getTime();
    const deltaMs = now - then;
    const isFuture = deltaMs < 0;
    const absMs = Math.abs(deltaMs);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (absMs < hour) {
        const minutes = Math.max(1, Math.round(absMs / minute));
        return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
    }
    if (absMs < day) {
        const hours = Math.max(1, Math.round(absMs / hour));
        return isFuture ? `in ${hours}h` : `${hours}h ago`;
    }
    const days = Math.max(1, Math.round(absMs / day));
    return isFuture ? `in ${days}d` : `${days}d ago`;
}

export function truncateNewsSummary(text: string, maxLength: number): string {
    return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}

export function formatSentiment(value: number): string {
    return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

export function formatConfidence(value: number): string {
    return value >= 0 && value <= 1 ? `${Math.round(value * 100)}%` : value.toFixed(2);
}
