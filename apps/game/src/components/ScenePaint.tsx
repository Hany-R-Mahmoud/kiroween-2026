import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Scene image first (Requirement 11, decision D6). Secondary images (sprites, spirit figures, meter frame) render no
 * `src` until the scene image has loaded or failed. `loadedSceneId` is the last scene that settled.
 */
export interface ScenePaint {
  firstSceneLoaded: boolean;
  loadedSceneId: string | null;
  onSceneSettled: (id: string) => void;
}

/** Outside a provider nothing has settled, so secondary images stay deferred. */
const ScenePaintContext = createContext<ScenePaint>({ firstSceneLoaded: false, loadedSceneId: null, onSceneSettled: () => {} });

export function ScenePaintProvider({ children }: { children: ReactNode }) {
  const [loadedSceneId, setLoadedSceneId] = useState<string | null>(null);
  const onSceneSettled = useCallback((id: string) => setLoadedSceneId(id), []);
  const value = useMemo<ScenePaint>(() => ({ firstSceneLoaded: loadedSceneId !== null, loadedSceneId, onSceneSettled }), [loadedSceneId, onSceneSettled]);
  return <ScenePaintContext.Provider value={value}>{children}</ScenePaintContext.Provider>;
}

export const useScenePaint = (): ScenePaint => useContext(ScenePaintContext);

export { ScenePaintContext };
