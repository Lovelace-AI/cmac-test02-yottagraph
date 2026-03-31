<template>
    <div class="match-reason-row">
        <v-icon size="x-small" color="primary">mdi-source-branch</v-icon>
        <span>{{ text }}</span>
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        text: string;
    }>();
</script>

<style scoped>
    .match-reason-row {
        margin-top: 7px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.7rem;
        color: var(--dynamic-text-secondary);
    }
</style>
