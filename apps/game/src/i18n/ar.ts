import type { MessageKey } from './en';

// Arabic is behind FEATURE_ARABIC (decision 26). No Arabic UI text is written yet: every missing key falls back to
// English, so the flag proves the right to left layout only. Translations are added here by key.
export const ar: Partial<Record<MessageKey, string>> = {};
