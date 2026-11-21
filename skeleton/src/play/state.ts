import { z } from 'zod';
import { FEAR } from './fear.ts';
import { ID_RE } from './validate.ts';

// The small Play state stored per Run (runs.play_state, or inside a guest token). Ids are raw content ids, no legend
// prefix. Strict: a state with an unknown key, a wrong type or an out-of-range number is unusable, never partly used.
const id = z.string().regex(ID_RE);
const count = z.number().int().min(0).max(1000);
const ids = z.array(id).max(200);

export const playStateSchema = z
  .object({
    v: z.literal(1),
    fear: z.number().int().min(0).max(FEAR.max),
    highestFear: z.number().int().min(0).max(FEAR.max),
    hint2Uses: count,
    wrongAnswers: count,
    opened: ids,
    solved: ids,
    tried: z.record(id, z.array(z.number().int().min(0).max(3)).max(4)),
    hint2Used: ids,
    tapped: ids,
    collected: z.record(id, z.array(z.number().int().min(1).max(100)).max(100)),
    followed: ids,
  })
  .strict();

export type PlayState = z.infer<typeof playStateSchema>;
