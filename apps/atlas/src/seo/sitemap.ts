/** Paths listed in the sitemap: entry page, legends index, each legend page and the game hall. */
export function sitemapPaths(ids: readonly string[]): string[] {
  return ['/', '/legends', ...ids.map((id) => `/legends/${id}`), '/game/'];
}

const escapeXml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function buildSitemap(origin: string, paths: readonly string[]): string {
  const urls = paths.map((p) => `  <url><loc>${escapeXml(origin + p)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * `origin` is '' when PUBLIC_ORIGIN is unset: then no Sitemap line.
 * No Disallow lines: the private game pages carry a noindex meta tag, which a crawler can only read if it may fetch them.
 */
export function buildRobots(origin: string): string {
  const lines = ['User-agent: *', 'Allow: /'];
  if (origin) lines.push('', `Sitemap: ${origin}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}
