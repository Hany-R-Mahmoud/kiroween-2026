import { createRouter, Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { ErrorView, PendingView } from '@kiroween/skeleton/shell';
import { translate } from './i18n/t';
import { routeTree } from './routeTree.gen';

/** Shown by the router after its pending delay (200 ms) while a page loads. The shell may be what is loading, so it reads no loader data: text comes from `translate`, not `useT`. */
function DefaultPending() {
  return <PendingView label={translate('en', 'loading.page')} />;
}

/** Shown in place of a route whose loader or render failed. Same constraint as above: no `useT`. The error text is never shown. */
function DefaultError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <ErrorView
      title={translate('en', 'error.title')}
      body={translate('en', 'error.body')}
      retryLabel={translate('en', 'error.retry')}
      onRetry={() => {
        // `reset` is undefined when the error comes from a loader (router status 'error'), so guard it.
        (reset as (() => void) | undefined)?.();
        void router.invalidate();
      }}
      home={
        <Link to="/" className="link">
          {translate('en', 'error.home')}
        </Link>
      }
    />
  );
}

// Start looks this function up by name.
export function getRouter() {
  // 'preserve': the default redirects `/game/` to `/game`, and the atlas must not answer anything under /game but 404.
  // defaultHashScrollIntoView off: the Book lands on the hash itself (it opens the right page, or scrolls in the one-page view).
  return createRouter({
    routeTree,
    scrollRestoration: true,
    trailingSlash: 'preserve',
    defaultHashScrollIntoView: false,
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultPendingComponent: DefaultPending,
    defaultErrorComponent: DefaultError,
  });
}
