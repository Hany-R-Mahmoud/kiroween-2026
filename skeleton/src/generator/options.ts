import type { Fact, Slot } from '../model/schema.ts';
import type { Rng } from '../rng/rng.ts';
import { GeneratorError } from './errors.ts';
import { normalise } from './normalise.ts';

export interface Choice {
  options: [string, string, string, string];
  correctIndex: number;
}

/** The correct answer plus exactly three seed-picked wrong ones, shuffled; all four distinct after normalising. */
export function makeOptions(f: Fact, rng: Rng, legendId: string, seed: string): Choice {
  const seen = new Set([normalise(f.answer)]);
  const pool = f.wrongAnswers.filter((w) => {
    const key = normalise(w);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (pool.length < 3) throw new GeneratorError('too-few-wrong-answers', legendId, seed, `${f.id} has ${pool.length} usable wrong answers`);
  const options = rng.shuffle([f.answer, ...rng.sample(pool, 3)]) as Choice['options'];
  return { options, correctIndex: options.indexOf(f.answer) };
}

/** The statement with the answer blanked, or the slot label when the answer is not spelled out in it. */
export function makeQuestion(f: Fact, slot: Slot): string {
  const at = f.statement.toLowerCase().indexOf(f.answer.toLowerCase());
  return at < 0 ? slot.label || f.statement : `${f.statement.slice(0, at)}____${f.statement.slice(at + f.answer.length)}`;
}
