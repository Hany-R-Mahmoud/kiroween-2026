export interface ScoreInput {
  slotsSolved: number;
  curseBroken: boolean;
  hint2Uses: number;
  wrongAnswers: number;
}

export const SCORE = { perSlot: 100, curse: 50, perHint2: 15, perWrongAnswer: 10 } as const;

/** 100 per solved slot, 50 for breaking the curse, minus 15 per Hint 2, minus 10 per wrong answer, never below 0. */
export function score({ slotsSolved, curseBroken, hint2Uses, wrongAnswers }: ScoreInput): number {
  const raw = SCORE.perSlot * slotsSolved + (curseBroken ? SCORE.curse : 0) - SCORE.perHint2 * hint2Uses - SCORE.perWrongAnswer * wrongAnswers;
  return Math.max(0, raw);
}
