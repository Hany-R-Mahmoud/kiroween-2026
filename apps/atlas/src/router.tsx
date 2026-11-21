import { createRouter } from '@tanstack/react-router';
import { translate } from './i18n/t';
import { routeTree } from './routeTree.gen';

/** Shown by the router after its pending delay (1 s) while a page loads. The shell may be what is loading, so it reads no loader data. */
function Pending() {
  return (
    <p role="status" className="mx-auto max-w-6xl p-4">
      {translate('en', 'loading.page')}
    </p>
  );
}
// Start looks this function up by name.
export function getRouter() {
  // 'preserve': the default redirects `/game/` to `/game`, and the atlas must not answer anything under /game but 404.
  // defaultHashScrollIntoView off: the Book lands on the hash itself (it opens the right page, or scrolls in the one-page view).
  return createRouter({ routeTree, scrollRestoration: true, trailingSlash: 'preserve', defaultHashScrollIntoView: false, defaultPendingComponent: Pending });
}
