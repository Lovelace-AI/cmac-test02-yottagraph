<template>
    <div class="lineage-meta-row d-flex flex-wrap align-center ga-2 text-body-2">
        <span class="meta-pill">{{ relationshipTypeLabel }}</span>
        <span class="meta-separator">•</span>
        <span class="text-medium-emphasis">
            {{ effectiveDateLabel ? `Effective date: ${effectiveDateLabel}` : 'Date: inferred' }}
        </span>
        <span class="meta-separator">•</span>
        <span class="text-medium-emphasis">{{ supportLabel }}</span>
        <span class="meta-separator">•</span>
        <span class="text-medium-emphasis">{{ evidenceModeLabel }}</span>
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        relationshipTypeLabel: string;
        effectiveDateLabel: string | null;
        supportLabel: string;
        evidenceModeLabel: string;
    }>();
</script>

<style scoped>
    .lineage-meta-row {
        min-height: 24px;
    }

    .meta-pill {
        font-weight: 600;
        color: rgb(var(--v-theme-on-surface));
    }

    .meta-separator {
        color: rgba(var(--v-theme-on-surface), 0.35);
    }
</style>
