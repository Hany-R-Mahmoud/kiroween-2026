/** Tables that hold rows of one legend: `legends` by `id`, the rest by `legend_id` (fact_puzzle_types has none, so it is counted through facts). */
export const TABLES_WITH_LEGEND = ['legends', 'anchors', 'chapters', 'versions', 'documented_told', 'facts', 'leads', 'scenes', 'hotspots', 'puzzle_slots', 'fear_events', 'assets', 'sources'] as const;
