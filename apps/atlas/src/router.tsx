import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
// Start looks this function up by name.
export function getRouter() {
  // 'preserve': the default redirects `/game/` to `/game`, and the atlas must not answer anything under /game but 404.
  return createRouter({ routeTree, scrollRestoration: true, trailingSlash: 'preserve' });
}
