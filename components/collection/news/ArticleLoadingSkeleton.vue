<template>
    <div class="skeleton-card">
        <v-skeleton-loader type="text" class="mb-1" />
        <v-skeleton-loader type="text" class="mb-1 meta-line" />
        <div class="chip-row mb-1">
            <v-skeleton-loader type="chip" width="120" />
            <v-skeleton-loader type="chip" width="100" />
            <v-skeleton-loader type="chip" width="90" />
        </div>
        <v-skeleton-loader type="paragraph" />
        <div class="chip-row mt-1">
            <v-skeleton-loader type="chip" width="90" />
            <v-skeleton-loader type="chip" width="110" />
        </div>
    </div>
</template>

<style scoped>
    .skeleton-card {
        border: 1px solid color-mix(in srgb, var(--app-divider) 80%, transparent);
        border-radius: 10px;
        padding: 10px 12px;
    }

    .meta-line :deep(.v-skeleton-loader__text) {
        max-width: 55%;
    }

    .chip-row {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }
</style>
