<template>
    <div class="build-network">
        <div class="build-network__content">
            <div class="text-overline text-medium-emphasis">Step 1</div>
            <h1 class="text-h4 mb-2">Build Network</h1>
            <p class="text-body-1 text-medium-emphasis mb-6">
                Choose an existing project or build one from document NEIDs or a seed entity.
            </p>

            <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
                {{ error }}
            </v-alert>
            <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-4">
                {{ successMessage }}
            </v-alert>

            <v-card variant="tonal" class="mb-6">
                <v-card-title class="text-subtitle-1">Available Projects</v-card-title>
                <v-card-text>
                    <div class="project-grid">
                        <v-card
                            v-for="project in projects"
                            :key="project.id"
                            class="project-card"
                            :variant="activeProject?.id === project.id ? 'flat' : 'outlined'"
                            :color="activeProject?.id === project.id ? 'primary' : undefined"
                        >
                            <v-card-title
                                class="text-subtitle-2 d-flex align-center justify-space-between"
                            >
                                <span>{{ project.name }}</span>
                                <v-chip size="x-small" :color="project.preset ? 'info' : 'default'">
                                    {{ project.preset ? 'Preset' : 'Custom' }}
                                </v-chip>
                            </v-card-title>
                            <v-card-text class="text-caption">
                                <div class="mb-2 text-medium-emphasis">
                                    {{ project.description }}
                                </div>
                                <div>Seeds: {{ project.seedNeids.length }}</div>
                                <div>Type: {{ project.type }}</div>
                            </v-card-text>
                            <v-card-actions>
                                <v-btn
                                    size="small"
                                    color="primary"
                                    @click="activateProject(project.id)"
                                >
                                    Use Project
                                </v-btn>
                                <v-spacer />
                                <v-btn
                                    v-if="!project.preset"
                                    size="small"
                                    variant="text"
                                    color="error"
                                    @click="removeProject(project.id)"
                                >
                                    Delete
                                </v-btn>
                            </v-card-actions>
                        </v-card>
                    </div>
                </v-card-text>
            </v-card>

            <v-card>
                <v-tabs v-model="buildTab" density="comfortable" color="primary">
                    <v-tab value="preset">Preset</v-tab>
                    <v-tab value="documents">From Documents</v-tab>
                    <v-tab value="entity">From Entity</v-tab>
                </v-tabs>
                <v-divider />
                <v-window v-model="buildTab">
                    <v-window-item value="preset">
                        <v-card-text>
                            <div class="text-subtitle-1 mb-2">Start with the BNY demo network</div>
                            <p class="text-body-2 text-medium-emphasis mb-4">
                                Uses the original 5 document NEIDs and curated extracted seed graph.
                            </p>
                            <v-btn
                                color="primary"
                                :loading="activatingPreset"
                                @click="activateProject(BNY_PRESET_PROJECT.id)"
                            >
                                Use BNY Preset
                            </v-btn>
                        </v-card-text>
                    </v-window-item>

                    <v-window-item value="documents">
                        <v-card-text>
                            <v-text-field
                                v-model="docProjectName"
                                label="Project Name"
                                variant="outlined"
                                class="mb-2"
                            />
                            <v-textarea
                                v-model="docProjectDescription"
                                label="Description"
                                variant="outlined"
                                rows="2"
                                class="mb-2"
                            />
                            <v-textarea
                                v-model="documentNeidInput"
                                label="Document NEIDs (comma or newline separated)"
                                variant="outlined"
                                rows="4"
                                class="mb-3"
                            />
                            <div class="d-flex ga-2 mb-4">
                                <v-btn
                                    variant="tonal"
                                    :loading="validatingDocuments"
                                    @click="validateDocumentNeids"
                                >
                                    Validate NEIDs
                                </v-btn>
                                <v-btn
                                    color="primary"
                                    :disabled="validatedDocuments.length === 0"
                                    :loading="savingDocumentProject"
                                    @click="saveDocumentProject"
                                >
                                    Save Project
                                </v-btn>
                            </div>
                            <v-list v-if="validatedDocuments.length > 0" density="compact">
                                <v-list-item
                                    v-for="doc in validatedDocuments"
                                    :key="doc.neid"
                                    :title="doc.name || doc.neid"
                                    :subtitle="`${doc.neid} • ${doc.flavor || 'unknown'}`"
                                />
                            </v-list>
                        </v-card-text>
                    </v-window-item>

                    <v-window-item value="entity">
                        <v-card-text>
                            <v-text-field
                                v-model="entityProjectName"
                                label="Project Name"
                                variant="outlined"
                                class="mb-2"
                            />
                            <v-textarea
                                v-model="entityProjectDescription"
                                label="Description"
                                variant="outlined"
                                rows="2"
                                class="mb-2"
                            />
                            <v-text-field
                                v-model="entityQuery"
                                label="Search seed entity"
                                variant="outlined"
                                class="mb-3"
                            />
                            <div class="d-flex ga-2 mb-4">
                                <v-btn
                                    variant="tonal"
                                    :loading="searchingEntity"
                                    @click="searchEntity"
                                >
                                    Find Entity
                                </v-btn>
                                <v-btn
                                    variant="tonal"
                                    :disabled="!selectedEntityNeid"
                                    :loading="loadingNeighborhood"
                                    @click="loadNeighborhood"
                                >
                                    Preview Neighborhood
                                </v-btn>
                                <v-btn
                                    color="primary"
                                    :disabled="!selectedEntityNeid"
                                    :loading="savingEntityProject"
                                    @click="saveEntityProject"
                                >
                                    Save Project
                                </v-btn>
                            </div>
                            <v-card v-if="selectedEntityNeid" variant="outlined" class="mb-3">
                                <v-card-text class="text-caption">
                                    <div class="text-subtitle-2">{{ selectedEntityName }}</div>
                                    <div class="text-medium-emphasis">{{ selectedEntityNeid }}</div>
                                </v-card-text>
                            </v-card>
                            <v-list v-if="neighborhood.length > 0" density="compact">
                                <v-list-subheader>Neighborhood Preview</v-list-subheader>
                                <v-list-item
                                    v-for="neighbor in neighborhood"
                                    :key="neighbor.neid"
                                    :title="neighbor.name || neighbor.neid"
                                    :subtitle="`${neighbor.neid} • influence ${Math.round(neighbor.influence ?? 0)}`"
                                />
                            </v-list>
                        </v-card-text>
                    </v-window-item>
                </v-window>
            </v-card>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { BNY_PRESET_PROJECT } from '~/utils/collectionTypes';

    interface SimpleEntity {
        neid: string;
        name?: string;
        flavor?: string;
    }

    interface NeighborhoodEntity extends SimpleEntity {
        influence?: number;
    }

    const { projects, activeProject, loadProjects, selectProject, deleteProject, createProject } =
        useProjectStore();

    const buildTab = ref<'preset' | 'documents' | 'entity'>('preset');
    const error = ref('');
    const successMessage = ref('');

    const activatingPreset = ref(false);

    const docProjectName = ref('');
    const docProjectDescription = ref('');
    const documentNeidInput = ref('');
    const validatedDocuments = ref<SimpleEntity[]>([]);
    const validatingDocuments = ref(false);
    const savingDocumentProject = ref(false);

    const entityProjectName = ref('');
    const entityProjectDescription = ref('');
    const entityQuery = ref('');
    const selectedEntityNeid = ref('');
    const selectedEntityName = ref('');
    const neighborhood = ref<NeighborhoodEntity[]>([]);
    const searchingEntity = ref(false);
    const loadingNeighborhood = ref(false);
    const savingEntityProject = ref(false);

    onMounted(async () => {
        await loadProjects();
    });

    function clearMessages() {
        error.value = '';
        successMessage.value = '';
    }

    async function activateProject(projectId: string) {
        clearMessages();
        activatingPreset.value = true;
        try {
            await selectProject(projectId);
            successMessage.value = 'Project selected. Continue to analysis workflow.';
        } catch (e: any) {
            error.value = e?.message || 'Failed to activate project';
        } finally {
            activatingPreset.value = false;
        }
    }

    async function removeProject(projectId: string) {
        clearMessages();
        await deleteProject(projectId);
        successMessage.value = 'Project deleted.';
    }

    function parseNeidInput(input: string): string[] {
        return [
            ...new Set(
                input
                    .split(/[\n, ]+/)
                    .map((token) => token.trim())
                    .filter(Boolean)
            ),
        ];
    }

    async function validateDocumentNeids() {
        clearMessages();
        validatingDocuments.value = true;
        try {
            const neids = parseNeidInput(documentNeidInput.value);
            if (neids.length === 0) {
                error.value = 'Enter at least one document NEID.';
                validatedDocuments.value = [];
                return;
            }

            const resolved: SimpleEntity[] = [];
            for (const neid of neids.slice(0, 25)) {
                const result = await $fetch<{
                    entity: { neid: string; name?: string; flavor?: string } | null;
                }>('/api/collection/entity-search', {
                    method: 'POST',
                    body: { query: neid },
                });
                if (result?.entity?.neid) {
                    resolved.push(result.entity);
                }
            }

            validatedDocuments.value = resolved;
            if (resolved.length === 0) {
                error.value = 'No valid entities were resolved from those NEIDs.';
            } else {
                successMessage.value = `Validated ${resolved.length} NEIDs.`;
            }
        } catch (e: any) {
            error.value = e?.message || 'Failed to validate NEIDs';
        } finally {
            validatingDocuments.value = false;
        }
    }

    async function saveDocumentProject() {
        clearMessages();
        savingDocumentProject.value = true;
        try {
            const name = docProjectName.value.trim() || 'Document Seed Project';
            const description =
                docProjectDescription.value.trim() || 'Custom document-seeded project';
            await createProject({
                name,
                description,
                type: 'document',
                seedNeids: validatedDocuments.value.map((item) => item.neid),
                seedDocuments: validatedDocuments.value.map((item, index) => ({
                    neid: item.neid,
                    documentId: item.neid,
                    title: item.name || `Document ${index + 1}`,
                    kind: 'User selected document',
                })),
            });
            successMessage.value = 'Document project created and selected.';
        } catch (e: any) {
            error.value = e?.message || 'Failed to save project';
        } finally {
            savingDocumentProject.value = false;
        }
    }

    async function searchEntity() {
        clearMessages();
        searchingEntity.value = true;
        try {
            const query = entityQuery.value.trim();
            if (!query) {
                error.value = 'Enter an entity name or NEID.';
                return;
            }
            const result = await $fetch<{
                entity: { neid: string; name?: string } | null;
            }>('/api/collection/entity-search', {
                method: 'POST',
                body: { query },
            });
            selectedEntityNeid.value = result?.entity?.neid || '';
            selectedEntityName.value = result?.entity?.name || query;
            neighborhood.value = [];
            if (!selectedEntityNeid.value) {
                error.value = 'No entity match found.';
            }
        } catch (e: any) {
            error.value = e?.message || 'Entity search failed';
        } finally {
            searchingEntity.value = false;
        }
    }

    async function loadNeighborhood() {
        clearMessages();
        loadingNeighborhood.value = true;
        try {
            if (!selectedEntityNeid.value) return;
            const result = await $fetch<{ neighbors: NeighborhoodEntity[] }>(
                '/api/collection/entity-neighborhood',
                {
                    method: 'POST',
                    body: { neid: selectedEntityNeid.value, size: 15 },
                }
            );
            neighborhood.value = result.neighbors || [];
            if (neighborhood.value.length === 0) {
                successMessage.value = 'No neighborhood neighbors returned for this entity.';
            }
        } catch (e: any) {
            error.value = e?.message || 'Neighborhood lookup failed';
        } finally {
            loadingNeighborhood.value = false;
        }
    }

    async function saveEntityProject() {
        clearMessages();
        savingEntityProject.value = true;
        try {
            if (!selectedEntityNeid.value) {
                error.value = 'Select an entity first.';
                return;
            }
            const name = entityProjectName.value.trim() || `${selectedEntityName.value} Network`;
            const description =
                entityProjectDescription.value.trim() || 'Entity-seeded project with neighborhood';
            const neighborSeeds = neighborhood.value.map((item) => item.neid).filter(Boolean);
            const seedNeids = [...new Set([selectedEntityNeid.value, ...neighborSeeds])];
            await createProject({
                name,
                description,
                type: 'entity',
                seedNeids,
                seedEntities: [
                    {
                        neid: selectedEntityNeid.value,
                        name: selectedEntityName.value || selectedEntityNeid.value,
                        flavor: 'unknown',
                    },
                    ...neighborhood.value.map((item) => ({
                        neid: item.neid,
                        name: item.name || item.neid,
                        flavor: item.flavor || 'unknown',
                    })),
                ],
            });
            successMessage.value = 'Entity project created and selected.';
        } catch (e: any) {
            error.value = e?.message || 'Failed to save entity project';
        } finally {
            savingEntityProject.value = false;
        }
    }
</script>

<style scoped>
    .build-network {
        min-height: calc(100vh - 120px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 24px;
    }

    .build-network__content {
        width: min(1100px, 100%);
    }

    .project-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
    }

    .project-card {
        height: 100%;
    }
</style>
