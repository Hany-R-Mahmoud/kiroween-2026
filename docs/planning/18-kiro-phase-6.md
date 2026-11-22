# Kiro Phase 6: UI rework

Written from `docs/phase-5-handover.md` (Phase 5 pushed as `ff91f7f`, icons as `1b16022`, verified 2026-11-22) and the Phase 6 review (`phase-6-review/`: merged fix list plus four reports from impeccable, agent-design, agent-tester and agent-reviewer). Part A is what you do yourself. Part B is the prompt you paste into a new Kiro **Spec** chat. Part C lists the stops.

Target: Phase 6 handed back by 2026-11-28. The video is recorded after this phase, then 11-29 to 12-03 for the write-up, blog, social post and Devpost.

## Part A: before the prompt (you)

1. Copy the review files into the repo so Kiro can read them, then commit and push (Claude gives the commands):
   - `18-kiro-phase-6.md` (this file) to `docs/planning/18-kiro-phase-6.md`
   - the folder `phase-6-review/` to `docs/planning/phase-6-review/`
2. In Kiro, start a new chat and choose **Spec**.

## Part B: paste into a new Kiro Spec chat

```text
This is Phase 6 of our Kiroween 2026 entry: UI rework. Production is live and works, but the interface looks generic (like a search results page), the landing pages are weak, buttons and layout are poor, the atlas shows two maps, and colours on the paper break (references, version cards, game answer buttons). Read docs/planning/phase-6-review/00-fix-list.md first, then design-direction.md, code-review.md, impeccable.md and tester.md in the same folder, then docs/phase-5-handover.md, docs/planning/15-look-and-feel-brief.md and the steering files.

Create a spec named "ui-rework". Go through requirements, then design, then tasks, and wait for my approval after each. The requirements must cover every P1 item (1 to 10) and every P2 item (11 to 22) in 00-fix-list.md, each with a testable acceptance criterion. P3 items are optional tasks at the end.

Working rule (same as Phase 5): run tasks one at a time, in order, in this thread. At most one sub-agent at a time, alone in the tree. Sub-agents never ask me questions: they follow the spec, choose the smallest option that fits, record the choice in docs/phase-6-notes/decisions.md and continue. Git: read-only commands only. Undo your own edits by hand. If the network or docs are unreachable, use installed types, record it, continue. A test that still fails after two real attempts: mark the task blocked, record why, move to the next task that does not depend on it.

Boundaries:
- Do not edit, create or delete anything under content/ or assets/. If a fix needs an asset (for example a seam-free Banshee panorama), list it in docs/phase-6-notes/content-and-assets-needed.md and continue.
- Do not change the parser, generator, audit, auth, access rule, score formula, play rules, token format, fair-play secrecy, rate limit, routing rules in skeleton/src/deploy/vercelRules.ts, or the database. This phase is UI only.
- No new runtime libraries and no new images. Fonts only from the existing KNOWN_FONTS set.
- Follow design-direction.md (one building, two rooms; links navigate, buttons act; brass-plate buttons; paper pair and ember colour; candle-only motion). Where it conflicts with the steering files, follow the steering and tell me.
- Root causes first: the shared UI layer (skeleton/src/design/ui.css with .btn, .link, .panel, focus ring, spacing and type scale), then the paper context (every colour re-pointed, not only four), then the screens.
- Add new classes beside the old ones. Do not rename or remove classes or markup that existing tests pin (listed under "Rules for Kiro" in 00-fix-list.md); if a pinned class must change, change the test in the same task and say why.
- Logical CSS only (RTL-safe). WCAG AA for every text, link, button and focus pair, measured. Reduced motion (OS and in-app) turns off all motion.
- Every vercel.json keeps exactly {"git": {"deploymentEnabled": {"*": false, "main": true}}} plus what it already has.
- Never read, print or write secret values; never read .env. Never sign up or sign in on production; use the local servers for signed-in checks.
- Screenshots go only to .debug/ (git-ignored), never to docs/.

Scope, in this order:
1. Shared UI layer and tokens (fix list 1, 2).
2. Paper context and contrast (3, 4, 5): extend the contrast test to every colour pair used on paper and on dark, including surface, border, link, button and focus.
3. Atlas landing and map (6, 7): one map, hero with a main action, link to the game, legend cards with the existing painted art, no black first paint, map usable at 390 px.
4. Game Hall and scenes (8, 9, 10): visible title, a clear start action, doors that say why they are locked, scene on the first screen with a compact top bar, controls visible at 1280x800 and 390 px, visible hotspot glint and a reply on every click.
5. Mid-phase stop (see Stops).
6. P2 items 11 to 22.
7. P3 items if time allows.
8. Tests and checks:
   - All existing tests stay green with pnpm -r test, no database or network.
   - New tests for each P1 and P2 acceptance criterion where a test can hold it (contrast pairs, toggle label and aria-pressed, one map on the home page, cross links, scroll margin on anchors, tap target sizes, no repeated hint buttons). Each must fail when its rule is broken; mutation-check the important ones by hand and record them in docs/phase-6-notes/mutations.md.
   - Browser checks against the local built servers (atlas on 3001, game on 3000), at 390 and 1280 px: atlas home, map, one legend page in book and one-page view including references, an anchor link; game Hall, tutorial, Banshee world, hint 1 and hint 2, fear meter, a dead end, high fear, the win screen. Signed-in screens on the local dev database only. Keyboard-only and reduced-motion passes. Before and after screenshots for every P1 item in .debug/phase-6/.
   - After I push and Vercel deploys: the same browser checks as a guest on production, plus the Slow 4G timings (they must not get worse than Phase 5).
9. Kiro log: a Phase 6 entry in docs/kiro-usage.md with features and skills used and what each found.

Skills. Use these global skills from ~/.kiro/skills:
- impeccable: run it on every screen before and after the fixes, against design-direction.md and the steering. Run it in this thread, no reviewer sub-agents.
- read-the-damn-docs: Tailwind 4 theme and layers, CSS cascade layers, WCAG contrast and target size, prefers-reduced-motion.
- ponytail: smallest change that meets each criterion; no speculative components.
- agent-tester: test quality; each test must fail when its rule is broken.
- agent-guard: a guard pass after each group of tasks.
- verify-and-stop: the final check before the handover.
Skills never override the spec, the steering files or this prompt; on conflict, follow the spec and tell me. Do not use agent-pilot, agent-superpowers, agent-gamestudio or any skill that starts sub-agents or its own workflow. If a skill is unavailable, say so and continue.

Stops: wait for me only at
- the requirements, design and tasks approvals;
- the mid-phase stop: after scope items 1 to 4, give me the before and after screenshot paths at 390 and 1280 px for the atlas home, one legend page with its references, the game Hall and the Banshee scene, plus the local URLs, and wait for my feedback before the P2 items;
- pushing to main so Vercel deploys (tell me when the tree is ready; I commit and push);
- more than two tasks blocked;
- the final handover.
Otherwise keep going.

When all tasks are done, write docs/phase-6-handover.md with: what changed per screen; the UI layer (classes, tokens, scale) and how to use it; every contrast pair with its measured ratio; each P1 and P2 item with its status and evidence; P3 items done or left; tests (counts, new tests, mutations); browser results local and production; Slow 4G timings before and after; assets still needed; skills used and findings; anything that needs my action. Do not commit or push. Stop and wait.
```

## Part C: your stops during the phase

1. **Approvals:** bring requirements, design and tasks here before approving. Check that every P1 and P2 item has its own acceptance criterion.
2. **Mid-phase stop:** bring Kiro's message and the screenshot paths here. Claude reviews the screenshots against the design direction and writes the corrections before the P2 work.
3. **Push:** when Kiro says the tree is ready, bring its message here first; Claude checks the diff, runs the tests and gives the commit and push commands.

## Handover check (Claude, after Kiro finishes)

1. Every P1 and P2 item checked on production at 390 and 1280 px.
2. Contrast pairs re-measured in the browser, not only in tests.
3. Tests, typecheck and secret scan.
4. Slow 4G timings not worse than Phase 5.
