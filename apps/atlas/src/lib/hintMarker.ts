/** Reads the `?hint=1` marker the game adds to Hint 2 links. Anything else is dropped (R7.11). */
export const parseHintSearch = (search: Record<string, unknown>): { hint?: 1 } => (search.hint === 1 || search.hint === '1' ? { hint: 1 } : {});
