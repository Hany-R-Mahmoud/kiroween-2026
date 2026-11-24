export interface PendingViewProps {
  /** Visible and announced text. Comes from the app's translation catalog. */
  label: string;
}

/** Route pending state: a pulsing candle dot and one line of text. */
export function PendingView({ label }: PendingViewProps) {
  return (
    <section className="state-view" role="status" aria-live="polite">
      <span className="state-view-mark" aria-hidden="true" />
      <p>{label}</p>
    </section>
  );
}
