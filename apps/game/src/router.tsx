import { createRouter, Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { ErrorView, PendingView } from '@kiroween/skeleton/shell';
import { translate } from './i18n/t';
import { routeTree } from './routeTree.gen';

/** Shown after the pending delay while a page loads. The shell may be what is loading, so it reads no loader data: text comes from `translate`, not `useT`. */
function DefaultPending() {
  return <PendingView label={translate('en', 'loading.page')} />;
}

/** Shown in place of a route whose loader or render failed. Same constraint: no `useT`. The error text is never shown. */
function DefaultError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <ErrorView
      title={translate('en', 'error.view.title')}
      body={translate('en', 'error.view.body')}
      retryLabel={translate('en', 'error.view.retry')}
      onRetry={() => {
        // `reset` is undefined when the error comes from a loader (router status 'error'), so guard it.
        (reset as (() => void) | undefined)?.();
        void router.invalidate();
      }}
      home={
        <Link to="/" className="link">
          {translate('en', 'notFound.hall')}
        </Link>
      }
    />
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultPendingComponent: DefaultPending,
    defaultErrorComponent: DefaultError,
  });
}
