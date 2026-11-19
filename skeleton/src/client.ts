// Browser-safe entry: pure modules only. The main entry also exports database and parser code, which must never be
// pulled into the browser bundle. A test fails if anything imported here (directly or not) reaches db/, pg or node:.
export { canEnter, type Target, type Visitor } from './access/canEnter.ts';
export { cleanDisplayName, DISPLAY_NAME } from './account/displayName.ts';
export { addGuestRun, GUEST_MAX_RUNS, readGuestRuns, type GuestRun, type KeyValueStore } from './guest/progress.ts';
export { resolveLocale, type Direction, type Locale } from './locale/resolveLocale.ts';
export { score, SCORE, type ScoreInput } from './score/score.ts';
export { FINAL_STATUSES, LIMITS } from './runs/validate.ts';
export type { CompletedWorld, RunRow, RunStatus } from './runs/store.ts';
export { atlasUrl, AtlasLinkError, ANCHOR_RE, isAnchor, isLegendId, legendUrl } from './atlas/links.ts';
export { storyBlocks, type StoryBlock, type StoryToken } from './atlas/story.ts';
export { atlasLegendFromModel, atlasLegendFromRows, markerOf, SHARED_ATLAS_IMAGES, type AtlasSummary, type AtlasChapter, type AtlasImage, type AtlasLegend, type AtlasRows, type AtlasSource, type AtlasVersion } from './atlas/view.ts';
export { AssetIdError, assetUrl, MEDIA_PREFIX, parseAssetSize } from './assets/assetUrl.ts';
export { fontStack, KNOWN_FONTS, parsePalette, ThemeError, themeFonts, type FontFamily, type Palette } from './theme/palette.ts';
export { AA_LARGE, AA_TEXT, BASE_PALETTE, contrastRatio, resolveTheme, type ResolvedTheme } from './theme/contrast.ts';
