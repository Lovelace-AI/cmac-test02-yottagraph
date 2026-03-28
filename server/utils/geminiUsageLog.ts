export interface GeminiUsageLogEntry {
    id: number;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    latencyMs: number;
    timestamp: string;
    label: string;
    status: 'success' | 'error';
    error?: string;
}

const GEMINI_LOG_LIMIT = 400;
const usageLog: GeminiUsageLogEntry[] = [];
let usageId = 0;

export function recordGeminiUsage(
    entry: Omit<GeminiUsageLogEntry, 'id' | 'timestamp'> & { timestamp?: string }
): GeminiUsageLogEntry {
    const nextEntry: GeminiUsageLogEntry = {
        id: ++usageId,
        timestamp: entry.timestamp ?? new Date().toISOString(),
        ...entry,
    };
    usageLog.push(nextEntry);
    if (usageLog.length > GEMINI_LOG_LIMIT) {
        usageLog.splice(0, usageLog.length - GEMINI_LOG_LIMIT);
    }
    return nextEntry;
}

export function getGeminiUsageLog(): GeminiUsageLogEntry[] {
    return usageLog.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
