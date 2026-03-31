<template>
    <div class="snippet-wrap">
        <p
            :class="['snippet', { 'snippet--clamped': !expanded }]"
            :style="!expanded ? { WebkitLineClamp: String(clampLines) } : undefined"
        >
            {{ textToRender }}
        </p>
        <button v-if="isExpandable" type="button" class="toggle" @click="expanded = !expanded">
            {{ expanded ? 'Show less' : 'Show more' }}
        </button>
    </div>
</template>

<script setup lang="ts">
    const props = defineProps<{
        text: string;
        fallbackText?: string;
        clampLines?: number;
    }>();

    const expanded = ref(false);
    const clampLines = computed(() => Math.max(2, props.clampLines ?? 3));
    const textToRender = computed(
        () => props.text?.trim() || props.fallbackText || 'No summary available.'
    );
    const isExpandable = computed(() => textToRender.value.length > 200);
</script>

<style scoped>
    .snippet-wrap {
        margin-top: 5px;
    }

    .snippet {
        margin: 0;
        font-size: 0.8rem;
        line-height: 1.45;
        color: var(--dynamic-text-secondary);
        white-space: pre-wrap;
    }

    .snippet--clamped {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .toggle {
        margin-top: 4px;
        border: 0;
        background: transparent;
        color: var(--dynamic-primary);
        font-size: 0.72rem;
        padding: 0;
        cursor: pointer;
    }

    .toggle:hover {
        text-decoration: underline;
    }
</style>
