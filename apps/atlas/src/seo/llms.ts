import { translate } from '../i18n/t';

export interface LlmsLegend {
  id: string;
  title: string;
  oneLineHook: string;
}

const escapeTitle = (s: string): string => s.replace(/[[\]]/g, '\\$&');
const oneLine = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Plain-text index for agents. `origin` is '' when PUBLIC_ORIGIN is unset: then every URL is a relative path.
 * Machine-facing prose is fixed here; the product name comes from the catalog so a rename stays catalog-only.
 */
export function buildLlmsTxt(origin: string, legends: readonly LlmsLegend[]): string {
  const url = (path: string): string => origin + path;
  const title = translate('en', 'app.title');
  const lines = [
    `# ${title}`,
    '',
    `${title} is an atlas of ${legends.length} scary legends from around the world, told in documentary style, paired with a single-player point-and-click investigation game. The game cannot be solved without the atlas: every puzzle answer exists only in the legend chapters.`,
    '',
    '## Legends',
    '',
    ...legends.map((l) => `- [${escapeTitle(l.title)}](${url(`/legends/${l.id}`)}): ${oneLine(l.oneLineHook)}`),
    '',
    '## Game',
    '',
    `- [Game](${url('/game/')})`,
    `- [Tutorial](${url('/game/tutorial')})`,
  ];
  return `${lines.join('\n')}\n`;
}
