import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { translate, type Translate } from '../src/i18n/t';
import { Privacy } from '../src/routes/privacy';
import { sitemapPaths } from '../src/seo/sitemap';

const t: Translate = (key, vars) => translate('en', key, vars);

describe('/privacy', () => {
  it('renders the heading and the Last updated line', () => {
    const html = renderToStaticMarkup(<Privacy t={t} />);
    expect(html).toMatch(/<h1[^>]*>Privacy policy<\/h1>/);
    expect(html).toContain('Last updated: 27 November 2026');
  });
  it('is listed in the sitemap', () => {
    expect(sitemapPaths([])).toContain('/privacy');
  });
});
