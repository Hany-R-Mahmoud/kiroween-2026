import { useId, type ReactNode } from 'react';

export interface ErrorViewProps {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
  /** The "back home" link, rendered by the app so it uses the app's own router Link. */
  home: ReactNode;
}

/** Route error state. All text is a prop. The raw error message is never shown, so it cannot leak. */
export function ErrorView({ title, body, retryLabel, onRetry, home }: ErrorViewProps) {
  const titleId = useId();
  return (
    <section className="state-view" role="alert" aria-labelledby={titleId}>
      <h1 id={titleId}>{title}</h1>
      <p>{body}</p>
      <div className="state-view-actions">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          {retryLabel}
        </button>
        {home}
      </div>
    </section>
  );
}
