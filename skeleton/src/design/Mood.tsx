// The mood layer's DOM (launch-and-polish 6.1). Styles are in mood.css. Both parts are decorative: aria-hidden, no input.
/** Page layer behind the content: an edge vignette and the candle glow. Render once, first in the body. */
export function Mood() {
  return (
    <div className="mood-layer" aria-hidden="true">
      <span className="mood-vignette" />
      <span className="mood-candle" />
    </div>
  );
}
/** Fog along the bottom of a scene stage. Render after the scene image and before the hotspots, so hotspots paint over it. */
export function MoodFog() {
  return <span className="mood-fog" aria-hidden="true" />;
}
