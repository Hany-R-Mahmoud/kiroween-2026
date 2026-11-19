# Kiro Phase 4: game play

Written from `docs/phase-3-handover.md` (Phase 3 committed as `b7f6a8d`). Part A is what you do yourself. Part B is the prompt you paste into a new Kiro **Spec** chat. Phase 5 (deployment, judge account, polish) is written only after Phase 4 is handed back and checked.

## Part A: before the prompt (you)

1. In `.env`, add `ATLAS_ORIGIN=http://localhost:3001`. Locally the game runs on port 3000 and the atlas on 3001, so the game's atlas links need the atlas origin. On the shared domain in production it stays empty.
2. In Kiro, start a new chat and choose **Spec**.
3. Kiro may stop to ask you for a new secret in `.env` (for guest play tokens). Kiro gives you the variable name. You make the value in the terminal pane, never in the chat box: `openssl rand -base64 32 | pbcopy`, then paste it into `.env`.
4. Kiro stops once in the middle for you to try the hub, the tutorial and the Banshee world in the browser before it builds the other eleven worlds.

## Part B: paste into a new Kiro Spec chat

```text
This is Phase 4 of our Kiroween 2026 entry: game play. Read docs/phase-3-handover.md, docs/phase-2-handover.md, docs/tech-decisions.md, docs/planning/01-decisions.md (decisions 6 to 15, 24, 26 and 29), content/legend-format.md (sections 5 to 9 and the art direction), content/hub-and-tutorial.md, content/keepers-note.md, assets/README.md, and the steering files first.

Create a spec named "game-play". Go through requirements, then design, then tasks, and wait for my approval after each.

Boundaries:
- Do not edit, create or delete anything under content/ or assets/. Content work continues in parallel. If a mechanic needs data the content files do not hold in a structured form, do not invent it: list exactly what is missing and stop if it blocks you. I add content outside Kiro.
- Do not change the Phase 1 parser, generator or audit logic, the Phase 2 auth, access rule or score formula, or the Phase 3 atlas, except where listed below. You may add new modules anywhere.
- vercel.json stays untouched. Deployment is the next phase.
- Database work only on dev-skeleton-core. If the design needs a schema change or a new db:import, stop and ask first.
- Never read, print or write secret values. If you need a new secret, stop and tell me its name; I add the value to .env myself.

Scope:

1. The hall (hub). Replace the hall's door cards with the pannable hub scene (hub-game-scene-01) and its hotspots from content/hub-and-tutorial.md: the ledger (run summary), the clock, the relic cabinet, the twelve doors and the decoys. The hub and the tutorial have no hotspot sprites and the door-frame assets (hub-game-door-frame-01..12) do not exist, so hub and tutorial hotspots are tap regions over the painted scene. Door rules: every door shows a lock until the tutorial is done; then guests can open the guest world only and see a sign-in prompt on the others; signed-in players can open all twelve. Each door also keeps a "Read the legend" link to the atlas. The clock shows how many curses remain (one hour per unbroken world), with no real-time timer. When all twelve worlds are broken, the ending screen shows (shared-game-ui-dawn-01).

2. The tutorial room (tutorial-game-scene-01), exactly as content/hub-and-tutorial.md describes: pan, tap and decoys, Hint 1, Hint 2 (opens the atlas at keepers-note--ch-1 and raises the fear meter once), the drawer code, and the reward (the hall key and the first relic slot). The seed picks one of the three details in content/keepers-note.md section 2. The answer is typed as digits; also accept the forms in the "Also accept" column.

3. The Keeper's Note in the atlas. Import content/keepers-note.md into Neon with a small parser of its own (the legend parser, audit and check:content stay as they are; it is not a legend). The atlas shows it at /legends/keepers-note with its label "Fiction: the story of this archive", not on the map and not in the legend list, linked from the atlas footer. /anchor/keepers-note--ch-1 must resolve, and atlasUrl stays unchanged. Grant the atlas reader role SELECT on whatever new table or columns this needs, and nothing more.

4. Legend worlds. Every legend's world from its section 7: its 2 to 3 pannable scenes, hotspot sprites placed on the scenes (match each sprite to its hotspot through the asset table's usage column; if a match is unclear, list it and stop), the spirit (full and close figures), the puzzle slots, the leads and dead ends, the final puzzle, the relic, the fear events and the hints, in the legend's own theme pack. One run = one seed from generate(); the true version, hotspot roles and swaps come from it.
   - Hotspot positions on each scene are game layout data you write in the game code (not in content/), per scene, in panorama-relative coordinates, following the left-to-right order in each scene description. Hub and tutorial regions the same way.
   - Leads: the player collects lead steps from hotspots, follows a lead, and a dead end shows its contradiction with a link to the anchor that proves it. The true lead must always be deducible by comparing versions in the atlas (decision 13).
   - The final puzzle: use the world's final slot from generate() as the playable puzzle, framed by the "Breaking the curse" text and the spirit. Build a richer mechanic (for example laying objects in order) only if you can derive it from structured content; otherwise list it as a content gap.
   - Fear: Hint 2 and wrong answers raise the fear meter (shared-game-ui-fear-01). A full meter restarts the world with a new seed (the run ends as restarted). Propose the amounts in the design. Fear events never block progress, never flash more than three times a second, and follow each event's reduced-motion line.
   - Hint 1 is free and highlights hotspots in the scene. Hint 2 opens the atlas in a new tab at ATLAS_ORIGIN + atlasUrl(anchor), so game state is kept.
   - No sound in this phase: there are no audio assets.

5. Fair play on the server. The server runs generate() and keeps the answers. The browser never receives, before the player earns them: correct answers or option indexes, hotspot roles, which lead is true, swaps, or Hint 2 anchors before a Hint 2 is used. The server checks each answer and counts Hint 2 uses, wrong answers and fear itself, so the score is no longer built from client-reported counts (this closes the Phase 2 residual risk; the score formula stays the same). Signed-in play state lives in Neon. Guest play state must not be stored on the server and must be tamper-proof (for example a signed token); guest progress stays in the browser as today. Every server function validates its input and keeps the Phase 2 rules: requireUser where needed, ownership in the WHERE clause, CSRF, fixed error messages.

6. Panning and input. Drag with mouse or touch, and arrow keys plus visible pan buttons for keyboard users. Every hotspot is a focusable button with a name. The whole game, from the hall through the tutorial to breaking a curse, must be playable with the keyboard alone and with touch alone. Mobile-first; the panoramas are 4096 x 1536. No game engine or canvas library unless the design shows plain DOM and CSS cannot do it.

7. Arabic flag and direction (decision 26) as in the other apps: UI strings in the catalog, logical CSS only, story text stays English.

8. Two Phase 3 findings in the game, now in scope: the local serve-build.mjs crash on a malformed % in a request path, and the no-hardcoded-text test that misses a word alone on a JSX line.

9. Kiro features. Add a Kiro custom agent "game-balance-reviewer" (check the current Kiro docs for the format) that reviews puzzle difficulty, fear pacing and dead-end fairness per world, and run it over all twelve worlds. Add the RTL hook from the work plan (on component save: no physical left/right CSS) if it does not exist. Record both in docs/kiro-usage.md.

10. Tests.
   - Property tests: for every legend and many seeds, a scripted player that only reads the atlas text (the chapter at each answer's anchor) wins the run; a scripted player that guesses can hit a full fear meter, and the restart gives a new seed; every dead end's contradiction anchor exists in the atlas.
   - The browser payloads (server function responses) for a fresh run contain no answer, option index, role, true version or unused Hint 2 anchor. Prove it by inspecting real responses in the tests, not by reading the code.
   - The tutorial: each of the three details can be the code; digits and the "Also accept" forms pass; other values fail.
   - A tampered guest token is refused. Server-counted Hint 2 uses and wrong answers give the expected score.
   - Every hotspot in every world has a layout position inside its scene and a sprite or region. Every asset id the game uses maps through assetUrl to a file that exists.
   - The Keeper's Note: its anchor appears once on its atlas page, and the atlas reader role can read it.
   - These run in pnpm -r test with no database and no network. The Phase 1 to 3 tests stay green.
   - Separately, a smoke check against dev-skeleton-core: as a guest, finish the tutorial and win the Banshee world through the server functions; as a test user, win one other world and check the run row and score; trigger one full-fear restart. Delete the test users afterwards by exact id. Record the exact commands and results, never a cookie, password or token.
   - In headless Chrome: keyboard-only play from the hall to a broken curse, a touch-width (390 px) pass, and reduced motion.

11. Kiro usage log. Add a Phase 4 entry to docs/kiro-usage.md: Kiro features used, and the skills used with what each found.

Skills. Use these global skills from ~/.kiro/skills:
- read-the-damn-docs: before using TanStack Start server functions, pointer and touch events, Neon, Kiro custom agents or hooks, read the current official docs.
- ponytail: smallest code that meets each requirement, especially the panning and the server state.
- agent-security: the fair-play rules, the guest token, input validation and the new server functions.
- agent-impeccable: design and accessibility review of the hall, the tutorial and two worlds against the design steering and the theme packs. Its reviewer sub-agents stay off; run it in this thread.
- agent-tester: test quality; each test must fail when its rule is broken.
- agent-guard: a guard pass after each group of tasks.
- verify-and-stop: the final check before the handover.
Skills never override the spec, the steering files or this prompt; on conflict, follow the spec and tell me. Do not use agent-pilot, agent-superpowers, agent-gamestudio or any skill that starts sub-agents or its own workflow. If a skill is unavailable, say so and continue.

Stops: stop and wait for me at the requirements, design and tasks approvals; if a schema change, a new db:import or a new secret is needed; if content is missing for a mechanic; and if a checkpoint fails and you cannot fix it inside this spec. Also stop once in the middle, when the hall, the tutorial and the Banshee world are playable end to end: give me the commands to run both apps locally and a short list of what to try, and wait for my feedback before building the other eleven worlds. Otherwise keep going.

When all tasks are done, write docs/phase-4-handover.md with: files and folders created; versions pinned and why; the play state model (server, guest token, what the browser receives); the fear amounts and the balance reviewer's findings per world; the layout data and how to adjust a hotspot position; the Keeper's Note import and its atlas page; schema changes and grants; test results (counts, pass or fail); the smoke-check results; panorama file sizes and load behaviour on a phone-width throttled profile; skills used and findings; content gaps found; anything that needs my action. Do not commit or push. Stop and wait. Do not start Phase 5.
```

## Mid-phase check (you, at the Banshee stop)

1. Run both apps with the commands Kiro gives you. Sign out first, so you play as a guest.
2. In the hall: pan, tap the decoys, check that every door shows a lock.
3. Play the tutorial: use Hint 1, then Hint 2 (the atlas opens in a new tab at the Keeper's Note), type the drawer code.
4. Back in the hall: only the Banshee door opens; the others ask you to sign in.
5. Play the Banshee world to the end. Note anything that feels unfair, confusing, too easy, or hard to see on a phone width.
6. Bring your notes here before you answer Kiro.

## Handover check (you, after Kiro finishes)

Phase 4 is done only when all of these are true:

- [ ] `.kiro/specs/game-play/` has requirements, design and tasks files.
- [ ] `git status` shows no changes under `content/`, `assets/` or `vercel.json`.
- [ ] `pnpm -r test` passes fully.
- [ ] You can play the tutorial and the Banshee world as a guest, and another world signed in.
- [ ] Hint 2 opens the right atlas chapter; `/anchor/keepers-note--ch-1` works in the atlas.
- [ ] The browser's network responses show no answers before you solve a puzzle.
- [ ] `.kiro/` has the game-balance-reviewer agent and the RTL hook.
- [ ] `docs/phase-4-handover.md` and the Phase 4 entry in `docs/kiro-usage.md` exist.

Bring the handover back here before committing.
