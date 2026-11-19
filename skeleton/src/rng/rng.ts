export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Fisher-Yates on a copy. */
  shuffle<T>(items: readonly T[]): T[];
  /** `n` distinct items. Throws RangeError if `n` is larger than the list. */
  sample<T>(items: readonly T[], n: number): T[];
  /** An independent stream named by `label`, so adding a decision never reshuffles another. */
  fork(label: string): Rng;
}

// xmur3 string hash, then sfc32 generator. Both are small public-domain algorithms.
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const h = xmur3(seed);
  const gen = sfc32(h(), h(), h(), h());
  for (let i = 0; i < 12; i++) gen(); // warm-up: the first outputs of sfc32 are weakly mixed
  const rng: Rng = {
    next: gen,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new RangeError(`bad int range ${min}..${max}`);
      return min + Math.floor(gen() * (max - min + 1));
    },
    pick(items) {
      if (!items.length) throw new RangeError('pick from an empty list');
      return items[rng.int(0, items.length - 1)]!;
    },
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    sample(items, n) {
      if (n < 0 || n > items.length) throw new RangeError(`cannot sample ${n} from ${items.length}`);
      return rng.shuffle(items).slice(0, n);
    },
    fork: (label) => createRng(`${seed}/${label}`),
  };
  return rng;
}
