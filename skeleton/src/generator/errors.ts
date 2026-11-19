export type GeneratorErrorCode =
  | 'no-true-version'
  | 'lead-uncovered'
  | 'dead-end-anchor'
  | 'no-qualifying-fact'
  | 'no-distinct-facts'
  | 'too-few-wrong-answers'
  | 'slot-uncovered'
  | 'hotspot-invariant'
  | 'hint-anchor';

/** Thrown when a legend cannot give a valid run for a seed. Names legend and seed so the failure can be reproduced. */
export class GeneratorError extends Error {
  constructor(
    readonly code: GeneratorErrorCode,
    readonly legendId: string,
    readonly seed: string,
    detail: string,
  ) {
    super(`${code} in ${legendId} (seed "${seed}"): ${detail}`);
    this.name = 'GeneratorError';
  }
}
