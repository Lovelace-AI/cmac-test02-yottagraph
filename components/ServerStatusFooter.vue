<template>
    <v-footer v-if="configuredServers.length > 0" app class="server-status-footer">
        <v-container
            fluid
            class="pa-0 d-flex align-center justify-space-between"
            style="min-height: 36px"
        >
            <div class="d-flex align-center flex-wrap py-1">
                <span class="text-caption mr-3">Server Status:</span>

                <div
                    v-for="(server, index) in configuredServers"
                    :key="server.type"
                    class="d-flex align-center"
                >
                    <v-icon
                        :icon="getStatusIcon(server.status)"
                        :color="getStatusColor(server.status)"
                        size="small"
                        :class="{ rotating: server.status === 'checking' }"
                    />
                    <span class="text-caption mx-1">{{ server.name }}:</span>
                    <span
                        class="text-caption font-weight-medium mr-3"
                        :class="getStatusTextClass(server.status)"
                    >
                        {{ getStatusText(server.status) }}
                    </span>

                    <!-- Show address for available servers -->
                    <span
                        v-if="server.status === 'available' && server.address"
                        class="text-caption text-medium-emphasis mr-3"
                    >
                        ({{ formatAddress(server.address) }})
                    </span>

                    <!-- Divider between servers -->
                    <v-divider v-if="index < configuredServers.length - 1" vertical class="mx-2" />
                </div>
            </div>
            <v-btn
                v-if="isWorkspaceRoute"
                size="small"
                color="warning"
                variant="tonal"
                class="ask-yotta-footer-btn mr-2"
                prepend-icon="mdi-robot-outline"
                @click="state.showCollectionChat = !state.showCollectionChat"
            >
                Ask Yotta
            </v-btn>
        </v-container>
    </v-footer>
</template>

<script setup lang="ts">
    import { computed } from 'vue';
    import { useServerStatus } from '~/composables/useServerStatus';
    import { state } from '~/utils/appState';

    const { getConfiguredServers } = useServerStatus();
    const route = useRoute();
    const configuredServers = computed(() => getConfiguredServers());
    const isWorkspaceRoute = computed(() => route.path === '/');

    function getStatusColor(status: string) {
        switch (status) {
            case 'available':
                return 'success';
            case 'unavailable':
                return 'error';
            case 'checking':
                return 'warning';
            default:
                return 'grey';
        }
    }

    function getStatusIcon(status: string) {
        switch (status) {
            case 'available':
                return 'mdi-check-circle';
            case 'unavailable':
                return 'mdi-alert-circle';
            case 'checking':
                return 'mdi-loading';
            default:
                return 'mdi-help-circle';
        }
    }

    function getStatusText(status: string) {
        switch (status) {
            case 'available':
                return 'Connected';
            case 'unavailable':
                return 'Disconnected';
            case 'checking':
                return 'Checking...';
            default:
                return 'Unknown';
        }
    }

    function getStatusTextClass(status: string) {
        switch (status) {
            case 'available':
                return 'text-success';
            case 'unavailable':
                return 'text-error';
            case 'checking':
                return 'text-warning';
            default:
                return 'text-medium-emphasis';
        }
    }

    function formatAddress(address: string) {
        // Remove https:// and trailing slashes for cleaner display
        return address.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
</script>

<style scoped>
    .server-status-footer {
        border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
        height: auto !important;
        min-height: 36px;
    }

    .rotating {
        animation: rotate 1s linear infinite;
    }

    .ask-yotta-footer-btn {
        text-transform: none;
        letter-spacing: 0;
    }

    @keyframes rotate {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
