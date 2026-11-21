// Self-hosted Google Fonts (Fontsource, OFL-1.1). Copied from apps/atlas/src/fonts.ts (the duplication is recorded in
// docs/phase-4-notes/decisions.md, 6.5; test/fonts.test.ts checks the map against the installed packages).
// Weight 400, plus 400 italic where the family has one. Each stylesheet holds every subset as a unicode-range face with
// font-display: swap, so a page downloads only the chunks its text uses. A World links only its own families.
import type { FontFamily } from '@kiroween/skeleton/client';
import abrilFatface from '@fontsource/abril-fatface/400.css?url';
import amiri from '@fontsource/amiri/400.css?url';
import amiriItalic from '@fontsource/amiri/400-italic.css?url';
import badScript from '@fontsource/bad-script/400.css?url';
import cormorantGaramond from '@fontsource/cormorant-garamond/400.css?url';
import cormorantGaramondItalic from '@fontsource/cormorant-garamond/400-italic.css?url';
import crimsonPro from '@fontsource/crimson-pro/400.css?url';
import crimsonProItalic from '@fontsource/crimson-pro/400-italic.css?url';
import gowunBatang from '@fontsource/gowun-batang/400.css?url';
import imFellEnglish from '@fontsource/im-fell-english/400.css?url';
import imFellEnglishItalic from '@fontsource/im-fell-english/400-italic.css?url';
import imFellEnglishSc from '@fontsource/im-fell-english-sc/400.css?url';
import inter from '@fontsource/inter/400.css?url';
import libreBaskerville from '@fontsource/libre-baskerville/400.css?url';
import libreBaskervilleItalic from '@fontsource/libre-baskerville/400-italic.css?url';
import marckScript from '@fontsource/marck-script/400.css?url';
import nanumMyeongjo from '@fontsource/nanum-myeongjo/400.css?url';
import notoNaskhArabic from '@fontsource/noto-naskh-arabic/400.css?url';
import notoSerif from '@fontsource/noto-serif/400.css?url';
import notoSerifItalic from '@fontsource/noto-serif/400-italic.css?url';
import notoSerifDevanagari from '@fontsource/noto-serif-devanagari/400.css?url';
import notoSerifJp from '@fontsource/noto-serif-jp/400.css?url';
import oldStandardTt from '@fontsource/old-standard-tt/400.css?url';
import oldStandardTtItalic from '@fontsource/old-standard-tt/400-italic.css?url';
import playfairDisplaySc from '@fontsource/playfair-display-sc/400.css?url';
import playfairDisplayScItalic from '@fontsource/playfair-display-sc/400-italic.css?url';
import ptSerif from '@fontsource/pt-serif/400.css?url';
import ptSerifItalic from '@fontsource/pt-serif/400-italic.css?url';
import shipporiMincho from '@fontsource/shippori-mincho/400.css?url';
import sourceSerif4 from '@fontsource/source-serif-4/400.css?url';
import sourceSerif4Italic from '@fontsource/source-serif-4/400-italic.css?url';
import yatraOne from '@fontsource/yatra-one/400.css?url';

const FONT_STYLESHEETS: Record<FontFamily, readonly string[]> = {
  'Abril Fatface': [abrilFatface],
  Amiri: [amiri, amiriItalic],
  'Bad Script': [badScript],
  'Cormorant Garamond': [cormorantGaramond, cormorantGaramondItalic],
  'Crimson Pro': [crimsonPro, crimsonProItalic],
  'Gowun Batang': [gowunBatang],
  'IM Fell English': [imFellEnglish, imFellEnglishItalic],
  'IM Fell English SC': [imFellEnglishSc],
  Inter: [inter],
  'Libre Baskerville': [libreBaskerville, libreBaskervilleItalic],
  'Marck Script': [marckScript],
  'Nanum Myeongjo': [nanumMyeongjo],
  'Noto Naskh Arabic': [notoNaskhArabic],
  'Noto Serif': [notoSerif, notoSerifItalic],
  'Noto Serif Devanagari': [notoSerifDevanagari],
  'Noto Serif JP': [notoSerifJp],
  'Old Standard TT': [oldStandardTt, oldStandardTtItalic],
  'PT Serif': [ptSerif, ptSerifItalic],
  'Playfair Display SC': [playfairDisplaySc, playfairDisplayScItalic],
  'Shippori Mincho': [shipporiMincho],
  'Source Serif 4': [sourceSerif4, sourceSerif4Italic],
  'Yatra One': [yatraOne],
};
/** The base design system's families (design steering): display, body and UI labels. Linked on every page (the Hall and Tutorial_Room use only these). */
export const BASE_FONTS: readonly FontFamily[] = ['IM Fell English SC', 'Source Serif 4', 'Inter'];
/** Stylesheet links for these families, each family once. */
export const fontLinks = (families: readonly FontFamily[]) => [...new Set(families)].flatMap((f) => FONT_STYLESHEETS[f]).map((href) => ({ rel: 'stylesheet', href }));
