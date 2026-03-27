import { useTheme } from 'vuetify';

export type AppColorMode = 'light' | 'dark';

interface AppThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    cardBackground: string;
    panelBackground: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    hover: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    headerGradientStart: string;
    headerGradientEnd: string;
    graphBackground: string;
    graphOverlay: string;
    graphOverlayBorder: string;
    tooltipBackground: string;
    tooltipBorder: string;
}

const themePalettes: Record<AppColorMode, AppThemeColors> = {
    dark: {
        primary: '#3FEA00',
        secondary: '#003BFF',
        accent: '#FF5C00',
        background: '#0A0A0A',
        surface: '#141414',
        cardBackground: '#1E1E1E',
        panelBackground: '#111111',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0AEC0',
        textMuted: '#8A8A8A',
        hover: '#1E1E1E',
        border: '#2A2A2A',
        success: '#3FEA00',
        warning: '#FF9F0A',
        error: '#EF4444',
        headerGradientStart: '#0A0A0A',
        headerGradientEnd: '#141414',
        graphBackground: '#1A1A2E',
        graphOverlay: 'rgba(28, 28, 36, 0.92)',
        graphOverlayBorder: 'rgba(255, 255, 255, 0.14)',
        tooltipBackground: 'rgba(20, 20, 30, 0.95)',
        tooltipBorder: 'rgba(255, 255, 255, 0.15)',
    },
    light: {
        primary: '#2F9D00',
        secondary: '#003BFF',
        accent: '#FF5C00',
        background: '#F6F8FB',
        surface: '#FFFFFF',
        cardBackground: '#F3F6FB',
        panelBackground: '#EEF2F8',
        textPrimary: '#101828',
        textSecondary: '#475467',
        textMuted: '#667085',
        hover: '#EEF2F8',
        border: '#D0D5DD',
        success: '#2F9D00',
        warning: '#C77700',
        error: '#D92D20',
        headerGradientStart: '#0D1424',
        headerGradientEnd: '#1D2940',
        graphBackground: '#FFFFFF',
        graphOverlay: 'rgba(255, 255, 255, 0.94)',
        graphOverlayBorder: 'rgba(16, 24, 40, 0.10)',
        tooltipBackground: 'rgba(255, 255, 255, 0.96)',
        tooltipBorder: 'rgba(16, 24, 40, 0.12)',
    },
};

const colorMode = ref<AppColorMode>('dark');
let initialized = false;

function getStorageKey(appId: string): string {
    return `${appId || 'aether'}:color-mode`;
}

function resolveInitialColorMode(appId: string): AppColorMode {
    if (typeof window === 'undefined') return 'dark';

    const savedMode = window.localStorage.getItem(getStorageKey(appId));
    if (savedMode === 'light' || savedMode === 'dark') {
        return savedMode;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeCssVariables(colors: AppThemeColors): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    root.style.setProperty('--dynamic-primary', colors.primary);
    root.style.setProperty('--dynamic-secondary', colors.secondary);
    root.style.setProperty('--dynamic-accent', colors.accent);
    root.style.setProperty('--dynamic-background', colors.background);
    root.style.setProperty('--dynamic-surface', colors.surface);
    root.style.setProperty('--dynamic-card-background', colors.cardBackground);
    root.style.setProperty('--dynamic-panel-background', colors.panelBackground);
    root.style.setProperty('--dynamic-text-primary', colors.textPrimary);
    root.style.setProperty('--dynamic-text-secondary', colors.textSecondary);
    root.style.setProperty('--dynamic-text-muted', colors.textMuted);
    root.style.setProperty('--dynamic-hover', colors.hover);
    root.style.setProperty('--dynamic-border', colors.border);
    root.style.setProperty('--dynamic-success', colors.success);
    root.style.setProperty('--dynamic-warning', colors.warning);
    root.style.setProperty('--dynamic-error', colors.error);
    root.style.setProperty('--dynamic-header-gradient-start', colors.headerGradientStart);
    root.style.setProperty('--dynamic-header-gradient-end', colors.headerGradientEnd);
}

function applyDocumentMode(mode: AppColorMode, colors: AppThemeColors, appId: string): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    root.dataset.appColorMode = mode;
    root.style.backgroundColor = colors.background;
    root.style.color = colors.textPrimary;
    document.body.style.backgroundColor = colors.background;
    document.body.style.color = colors.textPrimary;

    window.localStorage.setItem(getStorageKey(appId), mode);
    applyThemeCssVariables(colors);
}

export const useAppColorMode = () => {
    const theme = useTheme();
    const runtimeConfig = useRuntimeConfig();
    const appId = String(runtimeConfig.public.appId || 'cmac-test02');

    if (typeof window !== 'undefined' && !initialized) {
        colorMode.value = resolveInitialColorMode(appId);
        initialized = true;
    }

    const currentThemeColors = computed(() => themePalettes[colorMode.value]);
    const isDarkMode = computed(() => colorMode.value === 'dark');
    const themeClass = computed(() => `app-color-mode-${colorMode.value}`);

    const syncTheme = (mode: AppColorMode = colorMode.value) => {
        const themeName = mode === 'dark' ? 'lovelaceDark' : 'lovelaceLight';
        const colors = themePalettes[mode];

        if (theme.global.name.value !== themeName) {
            theme.change(themeName);
        }

        applyDocumentMode(mode, colors, appId);
    };

    const setColorMode = (mode: AppColorMode) => {
        colorMode.value = mode;
        syncTheme(mode);
    };

    const toggleColorMode = () => {
        setColorMode(isDarkMode.value ? 'light' : 'dark');
    };

    syncTheme();

    return {
        colorMode,
        currentThemeColors,
        isDarkMode,
        setColorMode,
        toggleColorMode,
        themeClass,
    };
};
