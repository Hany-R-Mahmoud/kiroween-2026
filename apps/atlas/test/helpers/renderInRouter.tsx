import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/** Renders `ui` under a real router (memory history, the routes the header and home link to), so `Link` builds real hrefs. */
export async function renderInRouter(ui: ReactElement, url = '/'): Promise<string> {
  const root = createRootRoute({ component: () => ui });
  const index = createRoute({ getParentRoute: () => root, path: '/' });
  const legends = createRoute({ getParentRoute: () => root, path: '/legends' });
  const legend = createRoute({ getParentRoute: () => root, path: '/legends/$legendId' });
  const router = createRouter({ routeTree: root.addChildren([index, legends, legend]), history: createMemoryHistory({ initialEntries: [url] }) });
  await router.load();
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

/** Every opening tag named `name` in the markup. */
export const tags = (html: string, name: string): string[] => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0]);
export const attr = (tag: string, name: string): string | undefined => new RegExp(`\\s${name}="([^"]*)"`, "i").exec(tag)?.[1];
export const classes = (tag: string): string[] => (attr(tag, 'class') ?? '').split(/\s+/).filter(Boolean);
