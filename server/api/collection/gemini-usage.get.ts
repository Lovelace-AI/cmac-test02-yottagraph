import { getGeminiUsageLog } from '~/server/utils/geminiUsageLog';

export default defineEventHandler(() => {
    return {
        entries: getGeminiUsageLog(),
    };
});
