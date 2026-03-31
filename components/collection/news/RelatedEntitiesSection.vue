<template>
    <div class="related-entities">
        <div class="row">
            <span class="label">Primary entity:</span>
            <EntityChip v-if="primaryEntity" :label="primaryEntity.name" />
            <span v-else class="muted">Not resolved</span>
        </div>
        <div v-if="secondaryEntities.length" class="row">
            <span class="label">Also mentions:</span>
            <div class="entity-list">
                <EntityChip
                    v-for="entity in secondaryEntities"
                    :key="`secondary:${entity.neid}`"
                    :label="entity.name"
                />
            </div>
        </div>
        <div class="mentions-line">Graph mentions: {{ mentionCount }} entities</div>
    </div>
</template>

<script setup lang="ts">
    import type { GraphMatchedEntity } from '~/composables/useCollectionWorkspace';

    defineProps<{
        primaryEntity: GraphMatchedEntity | null;
        secondaryEntities: GraphMatchedEntity[];
        mentionCount: number;
    }>();
</script>

<style scoped>
    .related-entities {
        margin-top: 7px;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .row {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        flex-wrap: wrap;
    }

    .label {
        font-size: 0.7rem;
        color: var(--dynamic-text-muted);
        margin-top: 2px;
    }

    .entity-list {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .mentions-line {
        font-size: 0.7rem;
        color: var(--dynamic-text-muted);
    }

    .muted {
        font-size: 0.72rem;
        color: var(--dynamic-text-muted);
    }
</style>
