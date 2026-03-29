// https://nuxt.com/docs/api/configuration/nuxt-config

import {
    copyFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';

// Read tenant config from broadchurch.yaml (committed by tenant-init) so the
// runtime config has correct defaults even when .env is missing or stale.
// Env vars (from .env or Vercel) still take precedence via Nuxt's override.
function readBroadchurchYaml() {
    const empty = {
        found: false,
        appId: '',
        appName: '',
        gatewayUrl: '',
        tenantOrgId: '',
        queryServerAddress: '',
        auth0ClientId: '',
    };
    try {
        if (!existsSync('broadchurch.yaml')) return empty;
        const yaml = readFileSync('broadchurch.yaml', 'utf-8');

        function sectionBlock(name: string): string {
            const re = new RegExp(`^${name}:\\s*$`, 'm');
            const idx = yaml.search(re);
            if (idx === -1) return '';
            const nl = yaml.indexOf('\n', idx);
            if (nl === -1) return '';
            const rest = yaml.slice(nl + 1);
            const end = rest.search(/^\S/m);
            return end === -1 ? rest : rest.slice(0, end);
        }

        function urlFrom(section: string): string {
            const m = sectionBlock(section).match(/url:\s*["']?(https?:\/\/[^\s"']+)/);
            return m ? m[1] : '';
        }

        function valueFrom(section: string, key: string): string {
            const m = sectionBlock(section).match(new RegExp(`${key}:\\s*["']?([^\\s"'#]+)`));
            return m ? m[1] : '';
        }

        return {
            found: true,
            appId: valueFrom('tenant', 'project_name'),
            appName: valueFrom('tenant', 'display_name'),
            gatewayUrl: urlFrom('gateway'),
            tenantOrgId: valueFrom('tenant', 'org_id'),
            queryServerAddress: urlFrom('query_server'),
            auth0ClientId: valueFrom('auth', 'client_id'),
            qsApiKey: valueFrom('gateway', 'qs_api_key'),
        };
    } catch {
        return empty;
    }
}

const bcYaml = readBroadchurchYaml();

export default defineNuxtConfig({
    devtools: { enabled: false },

    devServer: {
        host: '0.0.0.0',
    },

    ssr: false,

    app: {
        baseURL: '/',
        head: {},
    },

    nitro: {
        preset: process.env.VERCEL ? 'vercel' : undefined,
        ...(!process.env.VERCEL && {
            output: {
                publicDir: '.output/public',
            },
        }),
    },

    components: [{ path: '~/components', pathPrefix: false }],

    modules: ['vuetify-nuxt-module'],

    vuetify: {
        vuetifyOptions: {
            theme: {
                defaultTheme: 'lovelaceDark',
                themes: {
                    lovelaceDark: {
                        dark: true,
                        colors: {
                            background: '#090D14',
                            surface: '#141B28',
                            'surface-variant': '#1C2534',
                            primary: '#3fea00',
                            secondary: '#003bff',
                            warning: '#ff5c00',
                            error: '#ef4444',
                            info: '#003bff',
                            success: '#3fea00',
                            'on-background': '#f3f6fc',
                            'on-surface': '#f3f6fc',
                        },
                    },
                    lovelaceLight: {
                        dark: false,
                        colors: {
                            background: '#F6F8FB',
                            surface: '#FFFFFF',
                            'surface-variant': '#EEF2F8',
                            primary: '#2F9D00',
                            secondary: '#003BFF',
                            warning: '#C77700',
                            error: '#D92D20',
                            info: '#003BFF',
                            success: '#2F9D00',
                            'on-background': '#101828',
                            'on-surface': '#101828',
                        },
                    },
                },
            },
            defaults: {
                VBtn: { variant: 'flat', rounded: 'lg' },
                VCard: { rounded: 'xl', variant: 'outlined' },
                VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary' },
                VSelect: { variant: 'outlined', density: 'comfortable', color: 'primary' },
                VChip: { size: 'small', variant: 'tonal' },
                VDialog: {
                    VCard: { variant: 'flat' },
                },
            },
        },
    },

    // Remove utils/ from auto-import scanning. Nuxt scans composables/ and utils/
    // by default and `imports.dirs` only ADDS directories, it doesn't replace them.
    // The utils/ scan causes false-positive exports (function parameters like 'options'
    // get detected as named exports → SyntaxError → blank page at runtime).
    hooks: {
        'imports:dirs': (dirs: string[]) => {
            const idx = dirs.findIndex((d) => d.endsWith('/utils'));
            if (idx !== -1) dirs.splice(idx, 1);
        },
    },

    // fonts.css expects licensed font binaries in /public/fonts.
    // Keep global styles without attempting missing font downloads.
    css: ['~/assets/brand-globals.css', '~/assets/theme-styles.css', '~/assets/app-theme.css'],

    // Runtime configuration with sensible defaults
    // Nuxt automatically overrides these with environment variables following the pattern:
    // NUXT_PUBLIC_[KEY_NAME] for public config (e.g., NUXT_PUBLIC_APP_ID overrides appId)
    // See: https://nuxt.com/docs/guide/going-further/runtime-config
    runtimeConfig: {
        qsApiKey: bcYaml.qsApiKey || '',
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        geminiModel: 'gemini-2.5-pro',
        geminiTemperature: 3,
        geminiTimeoutMs: 25000,
        public: {
            qsApiKey: '',
            // App Identity — broadchurch.yaml provides defaults for provisioned projects
            appId: bcYaml.appId,
            appName: bcYaml.appName || 'Document Collection Intelligence',
            appShortName: 'Elemental',

            // Auth0 Configuration
            auth0Audience: '',
            auth0ClientId: bcYaml.auth0ClientId,
            auth0ClientSecret: '',
            auth0CookieName: 'llai-cookie',
            auth0IssuerBaseUrl: 'https://auth.lovelace.ai',
            cookieSecret: 'Our-cool-elemental-cookie-secret',

            // Server Configuration
            queryServerAddress: bcYaml.queryServerAddress,

            // Agent Gateway
            gatewayUrl: bcYaml.gatewayUrl,
            tenantOrgId: bcYaml.tenantOrgId,
            agents: '',

            // User Configuration — bypass Auth0 in dev mode for provisioned projects
            userName: bcYaml.found && process.env.NODE_ENV !== 'production' ? 'dev-user' : '',

            // App Configuration
            versionString: 'release_internal-dev',
        },
    },

    vite: {
        build: {
            target: 'esnext', //browsers can handle the latest ES features
        },
        define: {
            'process.env.NODE_DEBUG': JSON.stringify(''),
        },
        optimizeDeps: {
            include: ['vuetify'],
            esbuildOptions: {
                define: {
                    global: 'globalThis',
                },
            },
        },
        resolve: {
            dedupe: ['vue', 'vue-router', 'vuetify'],
            preserveSymlinks: true,
        },
    },

    compatibilityDate: '2025-08-25',
});
