import type { WorldLayout } from './types.ts';

export * from './types.ts';
export * from './fearEvents.ts';

// One file per World under ./worlds/<legend-id>.ts, each with a default export (12 Worlds).
const modules = import.meta.glob<{ default: WorldLayout }>('./worlds/*.ts', { eager: true });

function buildRegistry(): ReadonlyMap<string, WorldLayout> {
  const map = new Map<string, WorldLayout>();
  for (const [path, mod] of Object.entries(modules)) {
    const file = /\/([^/]+)\.ts$/.exec(path)?.[1];
    const layout = mod.default;
    if (!file || layout.legendId !== file) throw new Error(`Layout file ${path} must hold the layout for "${file}".`);
    if (map.has(layout.legendId)) throw new Error(`Two layouts for "${layout.legendId}".`);
    map.set(layout.legendId, layout);
  }
  return map;
}

export const WORLD_LAYOUTS: ReadonlyMap<string, WorldLayout> = buildRegistry();

export function worldLayout(legendId: string): WorldLayout | null {
  return WORLD_LAYOUTS.get(legendId) ?? null;
}
