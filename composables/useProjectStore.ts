import { KVPrefsStore } from '~/utils/kvPrefsStore';
import type { Project } from '~/utils/collectionTypes';
import { BNY_PRESET_PROJECT } from '~/utils/collectionTypes';

interface CreateProjectInput {
    name: string;
    description: string;
    type: Project['type'];
    seedNeids: string[];
    seedEntities?: Project['seedEntities'];
    seedDocuments?: Project['seedDocuments'];
}

const PROJECTS_STATE_KEY = 'build-network-projects';
const ACTIVE_PROJECT_STATE_KEY = 'build-network-active-project-id';
const LOADED_STATE_KEY = 'build-network-loaded';
const KV_AVAILABLE_STATE_KEY = 'build-network-kv-available';

function normalizeNeid(neid: string): string {
    return neid.trim().replace(/\D/g, '').padStart(20, '0');
}

function slugify(name: string): string {
    const base = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base || 'project';
}

function uniqueProjectId(name: string): string {
    return `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useProjectStore() {
    const config = useRuntimeConfig();
    const appId = config.public.appId || 'aether-default';
    const { userId } = useUserState();
    const kvStore = new KVPrefsStore();

    const projects = useState<Project[]>(PROJECTS_STATE_KEY, () => [BNY_PRESET_PROJECT]);
    const activeProjectId = useState<string | null>(ACTIVE_PROJECT_STATE_KEY, () => null);
    const loaded = useState<boolean>(LOADED_STATE_KEY, () => false);
    const kvAvailable = useState<boolean>(KV_AVAILABLE_STATE_KEY, () => false);

    const currentUserId = computed(() => userId.value || 'dev-user');
    const projectCollectionPath = computed(
        () => `/users/${currentUserId.value}/apps/${appId}/features/build-network/projects`
    );
    const settingsDocPath = computed(
        () => `/users/${currentUserId.value}/apps/${appId}/features/build-network/settings/general`
    );
    const localProjectsKey = computed(
        () => `${appId}:build-network:projects:${currentUserId.value}`
    );
    const localActiveProjectKey = computed(
        () => `${appId}:build-network:active-project:${currentUserId.value}`
    );

    const activeProject = computed<Project | null>(
        () => projects.value.find((project) => project.id === activeProjectId.value) || null
    );
    const hasActiveProject = computed(() => Boolean(activeProject.value));

    function mergeProjects(baseProjects: Project[], nextProjects: Project[]): Project[] {
        const byId = new Map<string, Project>();
        for (const project of [...baseProjects, ...nextProjects]) {
            if (!project?.id) continue;
            byId.set(project.id, project);
        }
        return Array.from(byId.values());
    }

    async function detectKvAvailability(): Promise<boolean> {
        try {
            const status = await $fetch<{ available: boolean }>('/api/kv/status');
            kvAvailable.value = Boolean(status?.available);
        } catch {
            kvAvailable.value = false;
        }
        return kvAvailable.value;
    }

    function readLocalProjects(): Project[] {
        if (!import.meta.client) return [];
        const raw = localStorage.getItem(localProjectsKey.value);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw) as Project[];
            if (!Array.isArray(parsed)) return [];
            return parsed;
        } catch {
            return [];
        }
    }

    function writeLocalProjects(nextProjects: Project[]) {
        if (!import.meta.client) return;
        localStorage.setItem(localProjectsKey.value, JSON.stringify(nextProjects));
    }

    function readLocalActiveProjectId(): string | null {
        if (!import.meta.client) return null;
        return localStorage.getItem(localActiveProjectKey.value);
    }

    function writeLocalActiveProjectId(projectId: string | null) {
        if (!import.meta.client) return;
        if (!projectId) {
            localStorage.removeItem(localActiveProjectKey.value);
            return;
        }
        localStorage.setItem(localActiveProjectKey.value, projectId);
    }

    async function loadProjects() {
        if (loaded.value) return;

        let baseProjects: Project[] = [BNY_PRESET_PROJECT];
        const localProjects = readLocalProjects().filter((project) => !project.preset);
        const localActiveProjectId = readLocalActiveProjectId();
        const kvIsAvailable = await detectKvAvailability();

        if (kvIsAvailable) {
            const docIds = await kvStore.listDocuments(projectCollectionPath.value);
            const kvProjects: Project[] = [];
            for (const docId of docIds) {
                const doc = await kvStore.readDoc(`${projectCollectionPath.value}/${docId}`);
                const serialized = doc?.project;
                if (!serialized || typeof serialized !== 'string') continue;
                try {
                    const project = JSON.parse(serialized) as Project;
                    if (project?.id && !project.preset) kvProjects.push(project);
                } catch {
                    continue;
                }
            }
            const settings = await kvStore.readDoc(settingsDocPath.value);
            const storedActive = settings?.activeProjectId;
            activeProjectId.value =
                typeof storedActive === 'string' && storedActive.trim().length > 0
                    ? storedActive
                    : localActiveProjectId;
            baseProjects = mergeProjects(baseProjects, localProjects);
            baseProjects = mergeProjects(baseProjects, kvProjects);
        } else {
            baseProjects = mergeProjects(baseProjects, localProjects);
            activeProjectId.value = localActiveProjectId;
        }

        projects.value = baseProjects;
        if (
            activeProjectId.value &&
            !projects.value.some((project) => project.id === activeProjectId.value)
        ) {
            activeProjectId.value = null;
        }
        loaded.value = true;
    }

    async function persistActiveProject(projectId: string | null) {
        writeLocalActiveProjectId(projectId);
        if (kvAvailable.value) {
            await kvStore.setValue(settingsDocPath.value, 'activeProjectId', projectId ?? '');
            return;
        }
    }

    async function selectProject(projectId: string | null) {
        activeProjectId.value = projectId;
        await persistActiveProject(projectId);
    }

    async function createProject(input: CreateProjectInput): Promise<Project> {
        const project: Project = {
            id: uniqueProjectId(input.name),
            name: input.name.trim(),
            description: input.description.trim(),
            type: input.type,
            seedNeids: [...new Set(input.seedNeids.map(normalizeNeid))],
            seedEntities: input.seedEntities,
            seedDocuments: input.seedDocuments,
            createdAt: new Date().toISOString(),
            preset: false,
        };

        projects.value = [...projects.value.filter((entry) => entry.id !== project.id), project];
        if (kvAvailable.value) {
            await kvStore.setValue(
                `${projectCollectionPath.value}/${project.id}`,
                'project',
                JSON.stringify(project)
            );
        }
        const localProjects = projects.value.filter((entry) => !entry.preset);
        writeLocalProjects(localProjects);
        await selectProject(project.id);
        return project;
    }

    async function deleteProject(projectId: string) {
        const existing = projects.value.find((project) => project.id === projectId);
        if (!existing || existing.preset) return;

        projects.value = projects.value.filter((project) => project.id !== projectId);
        if (kvAvailable.value) {
            await kvStore.deleteDoc(`${projectCollectionPath.value}/${projectId}`);
        }
        const localProjects = projects.value.filter((project) => !project.preset);
        writeLocalProjects(localProjects);

        if (activeProjectId.value === projectId) {
            await selectProject(null);
        }
    }

    return {
        projects: computed(() => projects.value),
        activeProject,
        hasActiveProject,
        loaded: computed(() => loaded.value),
        kvAvailable: computed(() => kvAvailable.value),
        loadProjects,
        createProject,
        selectProject,
        clearActiveProject: () => selectProject(null),
        deleteProject,
    };
}
