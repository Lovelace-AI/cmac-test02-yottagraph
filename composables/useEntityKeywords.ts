/**
 * useEntityKeywords — post-processes rendered AI response HTML to wrap
 * known entity names as clickable, color-coded, dashed-underline spans.
 *
 * Usage:
 *   const { wrapKeywords, handleKeywordClick } = useEntityKeywords();
 *
 *   // In template: attach @click.native delegated handler and v-html
 *   <div ref="contentEl" v-html="wrapKeywords(htmlContent)" @click="handleKeywordClick" />
 */

import { computed } from 'vue';

export interface KeywordEntity {
    neid: string;
    name: string;
    flavor: string;
}

const FLAVOR_COLORS: Record<string, string> = {
    organization: '#42A5F5',
    person: '#FFA726',
    financial_instrument: '#66BB6A',
    location: '#AB47BC',
    fund_account: '#66BB6A',
    legal_agreement: '#EF5350',
};

function flavorColor(flavor: string): string {
    return FLAVOR_COLORS[flavor] ?? '#9E9E9E';
}

export function useEntityKeywords() {
    const { entities, selectEntity } = useCollectionWorkspace();

    // Build sorted entity list (longest names first to avoid partial-match collisions)
    const sortedEntities = computed<KeywordEntity[]>(() =>
        [...entities.value]
            .filter((e) => e.name.length > 3)
            .sort((a, b) => b.name.length - a.name.length)
            .map((e) => ({ neid: e.neid, name: e.name, flavor: e.flavor }))
    );

    /**
     * Post-processes HTML string, wrapping known entity names with
     * clickable spans carrying data-entity-* attributes.
     */
    function wrapKeywords(html: string): string {
        if (!html || sortedEntities.value.length === 0) return html;

        let result = html;
        const processed = new Set<string>();

        for (const entity of sortedEntities.value) {
            if (processed.has(entity.neid)) continue;

            // Escape special regex chars in entity name
            const escaped = entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const color = flavorColor(entity.flavor);

            // Match entity name as a whole word, not inside existing spans
            const re = new RegExp(`(?<!data-entity-name="[^"]*)(${escaped})(?=[^"]*(?:"|$))`, 'g');

            result = result.replace(re, (match) => {
                processed.add(entity.neid);
                return `<span
                    class="entity-keyword"
                    data-entity-id="${entity.neid}"
                    data-entity-name="${entity.name}"
                    data-entity-type="${entity.flavor}"
                    style="color:${color};text-decoration:underline dashed;text-decoration-thickness:1px;cursor:pointer;"
                    title="${entity.flavor.replace(/_/g, ' ')}: ${entity.name}"
                >${match}</span>`;
            });
        }

        return result;
    }

    /**
     * Delegated click handler for containers rendering wrapKeywords output.
     * Attach as @click on the container element.
     */
    function handleKeywordClick(e: MouseEvent) {
        const target = e.target as HTMLElement;
        const span = target.closest('[data-entity-id]') as HTMLElement | null;
        if (!span) return;
        const neid = span.dataset.entityId;
        if (neid) selectEntity(neid);
    }

    return { wrapKeywords, handleKeywordClick, sortedEntities };
}
