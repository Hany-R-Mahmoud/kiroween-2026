import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assetUrl, loadLegends, MEDIA_PREFIX, relicOf, type Legend } from '@kiroween/skeleton';
import { describe, expect, it } from 'vitest';
import { FEAR_FRAME_ASSET } from '../src/components/FearMeter.tsx';
import { SPIRIT_FRAME_ASSET, spiritAsset } from '../src/components/SpiritPanel.tsx';
import { KEY_ASSET } from '../src/lib/tutorial.ts';
import { FEAR_EVENTS, fearEventsOf } from '../src/layout/fearEvents.ts';
import { WORLD_LAYOUTS } from '../src/layout/index.ts';
import { regionBox, squareSpriteBox } from '../src/layout/boxes.ts';
import { MIN_BOX, SCENE_HEIGHT, SCENE_WIDTH, type HotspotBox, type WorldLayout } from '../src/layout/types.ts';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const { legends } = loadLegends(`${ROOT}content/legends/`);
const raw = (id: string): string => id.slice(id.indexOf(':') + 1);
const fileOf = (assetId: string): string => `${ROOT}assets/${assetUrl(assetId).slice(MEDIA_PREFIX.length)}`;
const naming = (text: string, id: string): boolean => new RegExp(`(?<![\\w-])${id}(?![\\w-])`).test(text);
const overlap = (a: HotspotBox, b: HotspotBox): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const escape = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * The scene file for scene `id` (index `i`): (1) usage text names the scene id, else (2) usage names the scene's
 * name (id without `sc-`/`scene-`, hyphens as spaces, case-insensitive), else (3) by order among assets whose
 * usage mentions "game scene". Tiers 1 and 2 need exactly one hit. Undefined means no match.
 */
function sceneAssetFor<A extends { id: string; usage: string }>(sceneAssets: A[], id: string, i: number): A | undefined {
  const byId = sceneAssets.filter((a) => naming(a.usage, id));
  if (byId.length > 0) return byId.length === 1 ? byId[0] : undefined;
  const name = id.replace(/^(sc|scene)-/, '').replace(/-/g, ' ');
  const re = new RegExp(`(?<![\\w-])${escape(name)}(?![\\w-])`, 'i');
  const byName = sceneAssets.filter((a) => re.test(a.usage));
  if (byName.length > 0) return byName.length === 1 ? byName[0] : undefined;
  return sceneAssets.filter((a) => /game scene/i.test(a.usage))[i];
}

/** Every problem found in one World layout against its content and the asset files. Empty means valid. */
function layoutProblems(layout: WorldLayout, legend: Legend): string[] {
  const out: string[] = [];
  const game = legend.assets.filter((a) => a.id.startsWith(`${legend.id}-game-`));
  const sceneAssets = game.filter((a) => a.id.includes('-game-scene-')).sort((a, b) => a.id.localeCompare(b.id));
  const sprites = game.filter((a) => a.id.includes('-game-hotspot-'));
  const assetIds: string[] = [];
  const claimed = new Set<string>();
  if (layout.scenes.length !== legend.world.scenes.length) out.push('scene count');
  legend.world.scenes.forEach((sc, i) => {
    const sl = layout.scenes[i];
    if (!sl) return;
    const id = raw(sc.id);
    if (sl.sceneId !== id) out.push(`scene order ${i}`);
    const match = sceneAssetFor(sceneAssets, id, i);
    if (!match) out.push(`scene ${id}: 0 asset matches`);
    else {
      if (claimed.has(match.id)) out.push(`scene ${id}: asset ${match.id} claimed by two scenes`);
      claimed.add(match.id);
      if (match.id !== sl.assetId) out.push(`scene ${id}: layout asset is not the matched file`);
    }
    assetIds.push(sl.assetId);
    const contentIds = legend.world.hotspots.filter((h) => h.sceneId === sc.id).map((h) => raw(h.id));
    const boxIds = sl.hotspots.map((h) => h.id);
    if ([...boxIds].sort().join() !== [...contentIds].sort().join()) out.push(`scene ${id}: hotspot ids differ`);
    sl.hotspots.forEach((h, j) => {
      const at = `${id}/${h.id}`;
      if (h.x < 0 || h.y < 0 || h.x + h.w > SCENE_WIDTH || h.y + h.h > SCENE_HEIGHT) out.push(`${at}: outside scene`);
      if (h.w < MIN_BOX || h.h < MIN_BOX) out.push(`${at}: under MIN_BOX`);
      if (j > 0 && h.x < sl.hotspots[j - 1]!.x) out.push(`${at}: x not ascending`);
      if (!h.sprite && !h.region) out.push(`${at}: no sprite or region`);
      for (const o of sl.hotspots.slice(j + 1)) if (overlap(h, o)) out.push(`${at}: overlaps ${o.id}`);
      if (h.sprite) {
        const s = h.sprite;
        if (s.w <= 0 || s.h <= 0 || s.x < h.x || s.y < h.y || s.x + s.w > h.x + h.w || s.y + s.h > h.y + h.h) out.push(`${at}: sprite outside its box`);
        assetIds.push(h.sprite.assetId);
        const hit = sprites.filter((a) => naming(a.usage, h.id));
        if (hit.length !== 1) out.push(`${at}: ${hit.length} sprite matches`);
        else if (hit[0]!.id !== h.sprite.assetId) out.push(`${at}: sprite differs from content`);
      }
    });
  });
  for (const a of assetIds) {
    try {
      if (!existsSync(fileOf(a))) out.push(`${a}: file missing`);
    } catch {
      out.push(`${a}: refused by assetUrl`);
    }
  }
  return out;
}

/** A valid layout built from the content: boxes in a row per scene, sprites matched by usage text. */
function synthetic(legend: Legend): WorldLayout {
  const sprites = legend.assets.filter((a) => a.id.includes('-game-hotspot-'));
  const scenes = [...legend.assets.filter((a) => a.id.includes('-game-scene-'))].sort((a, b) => a.id.localeCompare(b.id));
  return {
    legendId: legend.id,
    scenes: legend.world.scenes.map((sc, i) => ({
      sceneId: raw(sc.id),
      assetId: scenes[i]!.id,
      hotspots: legend.world.hotspots
        .filter((h) => h.sceneId === sc.id)
        .map((h, j) => {
          const hit = sprites.find((a) => naming(a.usage, raw(h.id)))!;
          return { id: raw(h.id), x: 100 + j * 300, y: 400, w: 200, h: 200, sprite: { assetId: hit.id, x: 100 + j * 300, y: 400, w: 200, h: 200 } };
        }),
    })),
  };
}

describe('layout rules (checked on content-derived layouts and any registered World)', () => {
  const banshee = legends.find((l) => l.id === 'banshee')!;
  it('accepts a valid layout', () => expect(layoutProblems(synthetic(banshee), banshee)).toEqual([]));
  const mutate = (edit: (l: WorldLayout) => void): string[] => {
    const l = synthetic(banshee);
    edit(l);
    return layoutProblems(l, banshee);
  };
  it('rejects a box outside the scene', () => expect(mutate((l) => (l.scenes[0]!.hotspots[0]!.x = 4000)).join()).toContain('outside scene'));
  it('rejects a box under MIN_BOX', () => expect(mutate((l) => (l.scenes[0]!.hotspots[0]!.w = 100)).join()).toContain('under MIN_BOX'));
  it('rejects overlapping boxes', () => expect(mutate((l) => (l.scenes[0]!.hotspots[1]!.x = l.scenes[0]!.hotspots[0]!.x + 50)).join()).toContain('overlaps'));
  it('rejects x out of order', () => expect(mutate((l) => l.scenes[0]!.hotspots.reverse()).join()).toContain('x not ascending'));
  it('rejects a sprite drawn outside its tap box', () => expect(mutate((l) => (l.scenes[0]!.hotspots[0]!.sprite!.x += 10)).join()).toContain('sprite outside its box'));
  it('rejects a box with no sprite or region', () => expect(mutate((l) => delete l.scenes[0]!.hotspots[0]!.sprite).join()).toContain('no sprite or region'));
  it('rejects a missing hotspot', () => expect(mutate((l) => l.scenes[0]!.hotspots.pop()).join()).toContain('hotspot ids differ'));
  it('rejects a wrong sprite id', () => expect(mutate((l) => (l.scenes[0]!.hotspots[0]!.sprite!.assetId = 'banshee-game-hotspot-02')).join()).toContain('sprite differs from content'));
  it('rejects scene files in the wrong order', () => expect(mutate((l) => l.scenes.reverse()).join()).toContain('scene order'));
  it('rejects an asset file that does not exist', () => expect(mutate((l) => (l.scenes[0]!.hotspots[0]!.sprite!.assetId = 'banshee-game-hotspot-99')).join()).toContain('file missing'));
  it('rejects an id assetUrl refuses', () => expect(mutate((l) => (l.scenes[0]!.assetId = '../x')).join()).toContain('refused by assetUrl'));
  it('fails when a sprite matches two assets or none', () => {
    const twin = { ...banshee, assets: [...banshee.assets, { ...banshee.assets.find((a) => a.id === 'banshee-game-hotspot-01')!, id: 'banshee-game-hotspot-16' }] };
    expect(layoutProblems(synthetic(banshee), twin).join()).toContain('2 sprite matches');
    const none = { ...banshee, assets: banshee.assets.filter((a) => a.id !== 'banshee-game-hotspot-01') };
    expect(layoutProblems(synthetic(banshee), none).join()).toContain('0 sprite matches');
  });

  it('matches scene files by id, then by name, then by order', () => {
    const sceneAs = banshee.assets.filter((a) => a.id.includes('-game-scene-'));
    const withUsage = (usage: string[]) => ({ ...banshee, assets: banshee.assets.map((a) => { const k = sceneAs.findIndex((s) => s.id === a.id); return k < 0 ? a : { ...a, usage: usage[k]! }; }) });
    expect(layoutProblems(synthetic(banshee), withUsage(['game scene kitchen', 'game scene ford', 'game scene loft']))).toEqual([]);
    expect(layoutProblems(synthetic(banshee), withUsage(['Game Scene KITCHEN', 'x ford', 'loft']))).toEqual([]);
    expect(layoutProblems(synthetic(banshee), withUsage(['game scene', 'game scene', 'game scene']))).toEqual([]);
  });
  it('fails when a scene has no match', () => {
    const none = { ...banshee, assets: banshee.assets.filter((a) => a.id !== 'banshee-game-scene-03') };
    expect(layoutProblems(synthetic(banshee), none).join()).toContain('asset matches');
  });
  it('fails when two scenes claim the same asset', () => {
    const sceneAs = banshee.assets.filter((a) => a.id.includes('-game-scene-'));
    const twin = { ...banshee, assets: banshee.assets.map((a) => a.id === sceneAs[0]!.id ? { ...a, usage: 'Game scene sc-kitchen sc-ford' } : a.id === sceneAs[1]!.id ? { ...a, usage: 'Game scene' } : a) };
    expect(layoutProblems(synthetic(banshee), twin).join()).toContain('claimed by two scenes');
  });
  it('fails when the layout asset is not the matched file', () => {
    expect(mutate((l) => (l.scenes[0]!.assetId = 'banshee-game-scene-02')).join()).toContain('not the matched file');
  });

  it('every registered World layout is valid', () => {
    expect(WORLD_LAYOUTS.size, 'no registered layouts, nothing to check').toBeGreaterThan(0);
    for (const [id, layout] of WORLD_LAYOUTS) {
      const legend = legends.find((l) => l.id === id);
      expect(legend, `content for ${id}`).toBeDefined();
      expect(layoutProblems(layout, legend!), id).toEqual([]);
    }
  });
});

describe('fear events', () => {
  it('has exactly one entry per content event for every legend', () => {
    expect(legends).toHaveLength(12);
    expect(Object.keys(FEAR_EVENTS).sort()).toEqual(legends.map((l) => l.id).sort());
    for (const l of legends) {
      const entries = fearEventsOf(l.id)!;
      const ids = l.world.fearEvents.map((e) => raw(e.id));
      expect(ids, l.id).toHaveLength(5);
      expect(entries.map((e) => e.id), l.id).toEqual(ids);
      expect(new Set(entries.map((e) => e.id)).size).toBe(5);
    }
  });
  it('gives scene-enter events a scene and no other event one', () => {
    for (const entries of Object.values(FEAR_EVENTS)) {
      for (const e of entries) expect(e.scene !== undefined, e.id).toBe(e.trigger === 'scene-enter');
    }
  });
  it('keeps per-event reduced-motion lines to flying-dutchman only (G4)', () => {
    for (const l of legends) {
      const own = l.world.fearEvents.every((e) => e.reducedMotion !== null);
      expect(own, l.id).toBe(l.id === 'flying-dutchman');
      if (l.id !== 'flying-dutchman') expect(l.world.fearEvents.some((e) => e.reducedMotion !== null), l.id).toBe(false);
    }
  });
  it('returns null for an unknown legend', () => expect(fearEventsOf('nope')).toBeNull());
  it('lists the asset directory it reads', () => expect(readdirSync(`${ROOT}assets`).length).toBeGreaterThan(0));
});

describe('all twelve Worlds are complete (9.12)', () => {
  const ids = legends.map((l) => l.id).sort();

  it('registers exactly 12 layouts, one per legend', () => {
    expect(legends).toHaveLength(12);
    expect(WORLD_LAYOUTS.size).toBe(12);
    expect([...WORLD_LAYOUTS.keys()].sort()).toEqual(ids);
  });

  it.each(legends.map((l) => [l.id, l] as const))('%s: layout hotspot ids equal the legend hotspot ids exactly', (id, legend) => {
    const layout = WORLD_LAYOUTS.get(id)!;
    const boxes = layout.scenes.flatMap((s) => s.hotspots.map((h) => h.id));
    const content = legend.world.hotspots.map((h) => raw(h.id));
    expect(new Set(boxes).size).toBe(boxes.length);
    expect([...boxes].sort()).toEqual([...content].sort());
  });

  it('maps every asset id the game uses to an existing file through assetUrl', () => {
    const used: string[] = [FEAR_FRAME_ASSET, SPIRIT_FRAME_ASSET, 'shared-game-ui-dawn-01', KEY_ASSET];
    for (const l of legends) {
      used.push(spiritAsset(l.id, 'full'), spiritAsset(l.id, 'close'));
      const relic = relicOf(l);
      expect(relic, `${l.id} relic`).not.toBeNull();
      used.push(relic!.assetId);
      for (const s of WORLD_LAYOUTS.get(l.id)!.scenes) {
        used.push(s.assetId);
        for (const h of s.hotspots) if (h.sprite) used.push(h.sprite.assetId);
      }
    }
    const missing = used.filter((a) => {
      try {
        return !existsSync(fileOf(a));
      } catch {
        return true;
      }
    });
    expect(missing).toEqual([]);
    expect(used.length).toBeGreaterThan(12 * 5);
  });

  it('lists the relic display names of all 12 legends for owner review', () => {
    const rows = legends.map((l) => `${l.id}: ${relicOf(l)?.name ?? '(none, catalog fallback)'}`);
    console.log(`Relic display names:\n${rows.join('\n')}`);
    expect(rows).toHaveLength(12);
  });
});

describe('box builders', () => {
  it('centres the largest square sprite in a wide or tall tap box and names the sprite by hotspot number', () => {
    const h = squareSpriteBox('gumiho');
    expect(h('h-07', 100, 200, 600, 200)).toEqual({ id: 'h-07', x: 100, y: 200, w: 600, h: 200, sprite: { assetId: 'gumiho-game-hotspot-07', x: 300, y: 200, w: 200, h: 200 } });
    expect(h('h-12', 0, 0, 177, 400).sprite).toEqual({ assetId: 'gumiho-game-hotspot-12', x: 0, y: 112, w: 177, h: 177 });
  });
  it('builds a region box with no sprite', () => {
    expect(regionBox('hub-lamp', 1, 2, 300, 400)).toEqual({ id: 'hub-lamp', x: 1, y: 2, w: 300, h: 400, region: true });
  });
});
