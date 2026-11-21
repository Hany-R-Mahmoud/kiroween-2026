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
export { storyBlocks, inlineMarks, stripMarks, type StoryBlock, type StoryToken } from './atlas/story.ts';
export { atlasLegendFromModel, atlasLegendFromRows, markerOf, SHARED_ATLAS_IMAGES, type AtlasSummary, type AtlasChapter, type AtlasImage, type AtlasLegend, type AtlasRows, type AtlasSource, type AtlasVersion } from './atlas/view.ts';
export { AssetIdError, assetUrl, MEDIA_PREFIX, parseAssetSize } from './assets/assetUrl.ts';
export { HERO_SMALL_MEDIA, HERO_SMALL_WIDTH, hasHeroCopy, heroSmall, heroSmallId, heroSmallSize, heroSource } from './assets/heroCopy.ts';
export { fontStack, KNOWN_FONTS, parsePalette, ThemeError, themeFonts, type FontFamily, type Palette } from './theme/palette.ts';
export { FEAR } from './play/fear.ts';
export { WORLD_COUNT } from './play/hall.ts';
export { HOTSPOT_FEAR, HOTSPOT_FEAR_NONE, HOTSPOT_FEAR_STEP } from './play/fearTable.ts';
export { PLAY_ERROR_MESSAGES } from './play/errors.ts';
export { TOO_MANY_TRIES_MESSAGE } from './play/rateLimit.ts';
export type { Action, EndInfo, LeadView, PlayView, Reply, RunEndStatus, SlotView } from './play/types.ts';
export { hubContrastReport, type HubPairing } from './theme/hub.ts';
export { AA_LARGE, AA_TEXT, BASE_PALETTE, contrastRatio, resolveTheme, type ResolvedTheme } from './theme/contrast.ts';
export { isKeepersNoteId, type KeepersNoteView } from './keepers/read.ts';
