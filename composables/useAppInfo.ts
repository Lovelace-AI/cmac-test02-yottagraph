// Composable for accessing centralized app configuration

export const useAppInfo = () => {
    const config = useRuntimeConfig();
    const rawAppName = String(config.public.appName || '').trim();
    const appName =
        rawAppName && rawAppName !== 'cmac-test02'
            ? rawAppName
            : 'Document Collection Intelligence';

    return {
        appName,
        appShortName: config.public.appShortName,
    };
};
