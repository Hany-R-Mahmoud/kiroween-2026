// Fear amounts, in one place. The values are owner-approved (design: "Fear amounts"). A test derives the budget rule
// from these constants, so never loosen one to make a Run or a test pass.
export const FEAR = {
  /** A wrong puzzle answer (a new wrong option). */
  wrongAnswer: 15,
  /** The first Hint 2 on a slot. */
  hint2: 6,
  /** Following a wrong lead (once per lead). */
  deadEnd: 6,
  /** The tutorial's single Hint 2. */
  tutorialHint2: 10,
  /** The meter at or above this restarts the Run. */
  max: 100,
} as const;
