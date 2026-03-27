<template>
    <v-toolbar
        density="compact"
        rounded="t"
        :style="{
            background: `linear-gradient(135deg, ${currentThemeColors.headerGradientStart}, ${currentThemeColors.headerGradientEnd})`,
            color: '#ffffff',
        }"
        class="px-3"
    >
        <v-icon v-if="icon" class="mr-2" color="white">{{ icon }}</v-icon>
        <v-toolbar-title :style="{ color: '#ffffff' }">{{ title }}</v-toolbar-title>

        <v-spacer />

        <slot name="actions">
            <!-- Default slot for action buttons -->
        </slot>
    </v-toolbar>
</template>

<script setup lang="ts">
    import { useAppColorMode } from '~/composables/useAppColorMode';

    interface Props {
        title: string;
        icon?: string;
    }

    defineProps<Props>();

    const { currentThemeColors } = useAppColorMode();
</script>

<style scoped>
    /* Ensure all text and icons in the toolbar are white */
    :deep(.v-toolbar__content) {
        min-height: 56px !important;
        height: auto !important;
        flex-wrap: wrap;
        row-gap: 8px;
    }

    :deep(.v-toolbar__content) {
        color: white;
    }

    :deep(.v-btn) {
        color: white;
    }

    :deep(.v-icon) {
        color: white;
    }
</style>
