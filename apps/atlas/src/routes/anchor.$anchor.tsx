import { createFileRoute } from '@tanstack/react-router';
import { resolveAnchorFn } from '../server/functions';

// `/anchor/<anchor>` (R5.3): the server function redirects to the legend page's anchor, or throws not found.
export const Route = createFileRoute('/anchor/$anchor')({
  loader: ({ params }) => resolveAnchorFn({ data: params.anchor }),
});
