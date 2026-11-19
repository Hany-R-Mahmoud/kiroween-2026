# Kiro Phase 2: accounts and progress

Written from `docs/phase-1-handover.md` (2026-11-20). Part A is what you do yourself. Part B is the prompt you paste into a new Kiro **Spec** chat. Phase 3 (the atlas app) is written only after Phase 2 is handed back and checked.

Content fixes run at the same time, outside Kiro. Kiro does not touch `content/`, and I touch nothing else.

## Part A: before the prompt (you)

1. In Kiro, start a new chat and choose **Spec**. Use **Accept file changes** or **Supervised** mode, as you prefer.
2. Have a terminal ready for `openssl rand -base64 32`. Kiro will ask you for it when Neon Auth is set up.

## Part B: paste into a new Kiro Spec chat

```text
This is Phase 2 of our Kiroween 2026 entry: accounts and progress. Read docs/phase-1-handover.md, docs/tech-decisions.md, docs/planning/01-decisions.md (decisions 4, 6, 26 to 30) and the steering files first.

Create a spec named "auth-progress". Go through requirements, then design, then tasks, and wait for my approval after each.

Work in parallel with content fixes (important):
- The owner is fixing legend content at the same time. Do not edit, create or delete anything under content/ or assets/, and do not edit docs/content-gaps.md.
- Do not change the Phase 1 parser, generator, audit or their tests. You may add new modules to skeleton/.
- Do not run db:import or audit:content in this phase.
- The 24 content-feasibility tests in skeleton/test/feasibility.test.ts stay red until content is fixed. Ignore only those 24. Any other failing test is a real failure.

Scope:

1. Game app shell. Set up apps/game as a TanStack Start app (React, TypeScript strict, Tailwind) that imports @kiroween/skeleton. Serve it under the base path /game, because the atlas will own / on the same domain later. Only the screens this phase needs: sign in, sign up, sign out, a hall page that lists the twelve doors (open or locked for the current visitor), and an account page with the visitor's progress. Plain, accessible, mobile-first. No game play yet. Do not set up apps/atlas in this phase.

2. Neon Auth. Use Neon Auth (managed Better Auth) for sign-in with Google, and with username and password (decision 27).
   - Check the current Neon Auth docs first. If Neon Auth cannot sign in with a username, stop at the requirements step and tell me; do not add a second auth system.
   - Set up Neon Auth on the dev-skeleton-core branch through the Neon MCP server if it supports that; otherwise tell me the console steps.
   - Then STOP and ask me to put NEON_AUTH_BASE_URL and NEON_AUTH_JWKS_URL into .env myself, and to generate NEON_AUTH_COOKIE_SECRET with `openssl rand -base64 32`. Never read, print or write secret values.
   - If Google needs my own OAuth client for local development, say so in the handover. Do not create one.

3. Access rule (decision 29). Guests can play the tutorial and one legend world, set by a GUEST_WORLD variable (default banshee). Signed-in users can enter every world. Put the rule in the skeleton as one pure function, and enforce it on the server in the route loaders, not only in the UI. The atlas stays fully open; nothing in this phase gates it.

4. Progress (decision 28). Add a runs table to the Neon schema with a new Drizzle migration on dev-skeleton-core: run id, user id from the session, legend id, seed, true version id, status (in_progress, won, restarted, abandoned), slots solved, Hint 2 uses, wrong answers, highest fear, score, started and finished times. Completed worlds, best score and run history are queries over runs; no extra tables unless the design shows a real need.
   - Server functions: start a run, finish a run, list my runs, my completed worlds.
   - Always take the user id from the verified session, never from the client. A user can read and write only their own runs.
   - Validate every input at the server: legend id exists, counts within the legend's slot count, status is one of the four.
   - Guests: progress stays in the browser only and is not sent to the server.

5. Score. One pure function in the skeleton: 100 per solved slot, plus 50 for breaking the curse, minus 15 per Hint 2, minus 10 per wrong answer, never below 0. The server computes the score from the counts; it never accepts a score from the client. Record in docs/tech-decisions.md that the counts are reported by the client (a known limit for a single-player hackathon game).

6. Arabic flag (decision 26). A FEATURE_ARABIC variable, off by default. The root sets lang and dir from the locale, and the flag off means en and ltr. Use logical CSS properties (start/end) in every component, so right to left works when the flag is on. Add GUEST_WORLD and FEATURE_ARABIC to .env.example with no secrets.

7. Tests.
   - Property tests with fast-check for the access rule and the score function (score never negative; more Hint 2 uses never raise the score; the guest world and the tutorial are always open to guests; every world is open to signed-in users).
   - Unit tests for server-side input validation, and for the rule that one user cannot read or write another user's run.
   - These run in `pnpm -r test` with no database and no network.
   - Separately, a smoke check against dev-skeleton-core: sign up a test user, sign in, start and finish a run, list it, sign out, then delete the test user's data. Record the exact commands and results. Never print credentials.

8. Kiro usage log. Add a Phase 2 entry to docs/kiro-usage.md: Kiro features used, and the skills used with what each found.

Skills. Use these global skills from ~/.kiro/skills:
- read-the-damn-docs: before using TanStack Start, Neon Auth or Better Auth, Drizzle, Tailwind or Vitest APIs, read the current official docs.
- ponytail: smallest code that meets each requirement.
- agent-security: review auth setup, session checks, cookies, server functions, input validation and the run ownership rule. This is the most important review in this phase.
- agent-tester: test quality for the property and unit tests; each test must fail when its rule is broken.
- agent-guard: a guard pass after each group of tasks.
- verify-and-stop: the final check before the handover.
Skills never override the spec, the steering files or this prompt; on conflict, follow the spec and tell me. Do not use agent-pilot, agent-superpowers or any skill that starts sub-agents or its own workflow. If a skill is unavailable, say so and continue.

Stops: stop and wait for me at the requirements, design and tasks approvals, at the Neon Auth .env step, and if a checkpoint fails and you cannot fix it inside this spec. Otherwise keep going.

When all tasks are done, write docs/phase-2-handover.md with: files and folders created; versions pinned and why; how auth is set up (providers, where sessions are checked); the runs table and the migration name; the access rule; the score rule; test results (property tests, runs per property, unit tests, pass or fail), and say which failures are the known 24; the smoke-check results; skills used and findings; anything that needs my action. Do not commit or push. Stop and wait. Do not start Phase 3.
```

## Handover check (you, after Kiro finishes)

Phase 2 is done only when all of these are true:

- [ ] `.kiro/specs/auth-progress/` has requirements, design and tasks files.
- [ ] `git status` shows no changes under `content/` or `assets/` from Kiro.
- [ ] `pnpm -r test` fails only on the known content-feasibility tests (until content is fixed).
- [ ] You can run the game app locally and open `/game`: sign up, sign in, sign out, and see the hall with locked doors as a guest.
- [ ] As a guest, only the tutorial and the guest world are open. Signed in, all twelve are open.
- [ ] The Neon console shows the `runs` table on `dev-skeleton-core`.
- [ ] `.env.example` lists `GUEST_WORLD` and `FEATURE_ARABIC`, and `.env` is not in `git status`.
- [ ] `docs/phase-2-handover.md` and the Phase 2 entry in `docs/kiro-usage.md` exist.

When the boxes are ticked, commit Kiro's files and push, and bring the handover back here. Commit the content fixes separately.
