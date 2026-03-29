import { GoogleGenAI } from '@google/genai';
import { recordGeminiUsage } from '~/server/utils/geminiUsageLog';

interface GeminiUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string;
}

interface GenerateGeminiTextOptions {
    prompt: string;
    systemInstruction?: string;
    model?: string;
    label?: string;
    temperature?: number;
    maxOutputTokens?: number;
    timeoutMs?: number;
    retries?: number;
}

let aiClient: GoogleGenAI | null = null;

function getRuntimeGeminiConfig() {
    const runtime = useRuntimeConfig();
    return {
        apiKey: runtime.geminiApiKey as string,
        model: (runtime.geminiModel as string) || 'gemini-2.5-pro',
        temperature: Number(runtime.geminiTemperature ?? 3),
        timeoutMs: Number(runtime.geminiTimeoutMs ?? 25000),
    };
}

function getGeminiClient(): GoogleGenAI {
    if (aiClient) return aiClient;
    const { apiKey } = getRuntimeGeminiConfig();
    if (!apiKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Gemini API key is missing (GEMINI_API_KEY).',
        });
    }
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
}

function normalizeTemperature(value: number): number {
    if (Number.isNaN(value)) return 1;
    if (value < 0) return 0;
    if (value > 2) {
        console.warn(`[gemini] Temperature ${value} exceeds max 2. Clamping to 2.`);
        return 2;
    }
    return value;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Gemini request timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
        promise
            .then((result) => resolve(result))
            .catch((error) => reject(error))
            .finally(() => clearTimeout(timer));
    });
}

export async function generateGeminiText(options: GenerateGeminiTextOptions): Promise<{
    text: string;
    usage: GeminiUsage;
}> {
    const runtime = getRuntimeGeminiConfig();
    const model = options.model || runtime.model;
    const temperature = normalizeTemperature(options.temperature ?? runtime.temperature);
    const retries = options.retries ?? 1;
    const timeoutMs = options.timeoutMs ?? runtime.timeoutMs;

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        const startedAt = Date.now();
        try {
            const client = getGeminiClient();
            const response = await withTimeout(
                client.models.generateContent({
                    model,
                    contents: options.prompt,
                    config: {
                        maxOutputTokens: options.maxOutputTokens ?? 800,
                        temperature,
                        systemInstruction: options.systemInstruction,
                    },
                }),
                timeoutMs
            );
            const text = (response.text || '').trim();
            const usage = response.usageMetadata;
            const promptTokens = usage?.promptTokenCount ?? 0;
            const completionTokens = usage?.candidatesTokenCount ?? 0;
            const totalTokens = usage?.totalTokenCount ?? 0;
            recordGeminiUsage({
                model,
                promptTokens,
                completionTokens,
                totalTokens,
                costUsd: 0,
                latencyMs: Date.now() - startedAt,
                label: options.label ?? 'generate_text',
                status: 'success',
            });
            return {
                text,
                usage: {
                    model,
                    promptTokens,
                    completionTokens,
                    totalTokens,
                },
            };
        } catch (error) {
            lastError = error;
            if (attempt >= retries) {
                recordGeminiUsage({
                    model,
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    costUsd: 0,
                    latencyMs: Date.now() - startedAt,
                    label: options.label ?? 'generate_text',
                    status: 'error',
                    error: String(
                        (error as any)?.message ?? error ?? 'Gemini generation failed'
                    ).slice(0, 220),
                });
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Gemini generation failed.');
}
