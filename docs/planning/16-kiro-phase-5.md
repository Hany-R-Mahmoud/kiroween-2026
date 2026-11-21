# Kiro Phase 5: launch, look and feel, polish

Written from `docs/phase-4-handover.md` (Phase 4 committed as `5146d15`, verified 2026-11-21). Part A is what you do yourself. Part B is the prompt you paste into a new Kiro **Spec** chat. Part C lists the stops where Kiro hands work back to you. After this phase come the submission materials (video, write-up, blog, social post, Devpost), which are made outside Kiro.

Target: Phase 5 handed back by 2026-11-28, which leaves 11-29 to 12-03 for names, the judge account check, the video and the submission.

## Part A: before the prompt (you)

1. Copy three planning files into the repo, so Kiro can read them, and commit them:
   - `16-kiro-phase-5.md` (this file) to `docs/planning/16-kiro-phase-5.md`
   - `15-look-and-feel-brief.md` to `docs/planning/15-look-and-feel-brief.md`
   - `14-content-fixes-phase-4.md` to `docs/planning/14-content-fixes-phase-4.md`
   (Claude prepares the copy commands.)
2. Make sure you can sign in to Vercel with the GitHub account that owns the repo. Do not create a project yet; Kiro tells you the exact settings first.
3. In Kiro, start a new chat and choose **Spec**.

## Part B: paste into a new Kiro Spec chat

```text
This is Phase 5 of our Kiroween 2026 entry: launch, look and feel, polish. Read docs/phase-4-handover.md, docs/phase-3-handover.md (sections "Needs your action" and "Residual risks"), docs/tech-decisions.md, docs/planning/01-decisions.md, docs/planning/02-work-plan.md (sections "Finish" and "Rules checklist"), docs/planning/15-look-and-feel-brief.md, docs/planning/14-content-fixes-phase-4.md, docs/phase-4-notes/browser.md, docs/phase-4-notes/impeccable-review.md, docs/phase-4-notes/layout-open-matches.md, and the steering files first.

Create a spec named "launch-and-polish". Go through requirements, then design, then tasks, and wait for my approval after each.

Working rule (same as Phase 4): run tasks one at a time, in order, in this thread. At most one sub-agent at a time, alone in the tree. Sub-agents never ask me questions: they follow the spec, choose the smallest option that fits, record the choice in docs/phase-5-notes/decisions.md and continue. Git: read-only commands only. Undo your own edits by hand. If the network or docs are unreachable, use installed types, record it, continue. A test that still fails after two real attempts: mark the task blocked, record why, move to the next task that does not depend on it.

Boundaries:
- Do not edit, create or delete anything under content/ or assets/. If something needs content or an asset, list exactly what and continue with the rest; I add it outside Kiro.
- Do not change the Phase 1 parser, generator or audit logic, the Phase 2 auth, access rule or score formula, or the Phase 4 play rules (fear amounts, token format, fair-play secrecy), except where listed below.
- vercel.json may change now. Every vercel.json you create or edit, in any folder Vercel uses as a project root, must keep exactly {"git": {"deploymentEnabled": {"*": false, "main": true}}} plus whatever else it needs.
- Never read, print or write secret values, and never read .env. If you need a secret, stop and tell me its name and where it goes (local .env or Vercel); I create the value myself. Before any command that prints environment or config, exclude secrets from its output.
- Debug screenshots go only to a git-ignored folder (add one to .gitignore if needed), never to docs/.
- Database: dev work only on dev-skeleton-core. Production work only as approved in the design (see item 1), using the Neon MCP where it can do the job, and recorded with the exact statements.

Scope, in this order:

1. Production on Vercel, early. Get both apps live on one domain before any visual work, so platform problems surface first.
   - Read the current docs for TanStack Start on Vercel, Vercel monorepos, and serving two apps under one domain (the atlas owns /, the game owns /game, decision 4). Propose the smallest setup in the design: number of Vercel projects, root directories, build commands, how /game reaches the game, and how /media is served. The game's auth cookie must stay first-party.
   - /media in production: long cache headers on the images, text assets compressed, same domain (HTTP/2). ATLAS_ORIGIN stays empty in production; PUBLIC_ORIGIN is the production https origin.
   - Production database: the Neon project's default branch is empty and becomes production. Propose in the design the exact steps: run migrations 0000 to 0003, db:import of the twelve legends, the Keeper's Note import, the atlas_reader and atlas_web roles from docs/tech-decisions.md, and Neon Auth for production (trusted domain for the production origin; Google sign-in: use Neon's shared credentials if the docs allow them on a production domain, otherwise give me exact steps to create a Google OAuth client). No dev users or runs are copied to production. Once I approve the design, these production steps are approved; anything beyond them is a stop.
   - The atlas_web production password: write a local script I run in my terminal that generates the password, sets it with ALTER ROLE over psql stdin (Neon refuses SCRAM hashes and the Console reset gives no password), and copies the full ATLAS_DATABASE_URL to my clipboard. It prints only yes/no results.
   - Give me the list of Vercel environment variables per project (names only), and which ones need new production values. Production gets its own GAME_TOKEN_KEY and NEON_AUTH_COOKIE_SECRET, never the dev ones.
   - Basic security headers on both apps (nosniff, referrer policy, frame-ancestors). Add a Content-Security-Policy only if it does not break fonts, images or auth; record the decision.
   - The atlas local serve-build.mjs crash ("Stream lifetime exceeded" about 120 s after an unfinished stream) and whether the Vercel runtime has the same problem.
   - Tutorial rate limit: the smallest working limit on the tutorial answer action (Vercel firewall rule or server-side), documented.

2. First-view speed. The Phase 4 budget is scene paint within 3.0 s on the Slow 4G profile at 390 px (docs/phase-4-notes/browser.md). Do both proposed fixes: start sprites, the spirit figure and the meter frame only after the scene image has loaded (update the viewer tests), and production compression and caching from item 1. Phones should not download the 2400 px atlas hero: propose the smallest way (for example smaller copies made at build time); a build-time dev dependency is allowed if justified. Re-measure on the production URL with the Phase 4 browser-check script and report the numbers per screen, pass or fail.

3. Old-book reading (docs/planning/15-look-and-feel-brief.md, Part 1). One shared component and shared tokens for the atlas legend pages, the Keeper's Note page and the game's reading panels where it fits. Aged paper from the existing shared-atlas-paper-01, warmed with CSS. Two-page spread on wide screens, one page on phones, text flowing into pages with plain DOM and CSS (no page-flip library). Previous and next buttons, arrow keys, swipe, a page indicator, each chapter on a new page. /anchor/<anchor> and every Hint 2 link open the page that holds that anchor, and the anchor stays in the DOM exactly once; atlasUrl stays unchanged. A remembered "Read as one page" toggle. Ink on paper passes AA in every theme. Reduced motion: no page animation.

4. Halloween mood around the assets (brief, Part 2). CSS and DOM only: edge vignette, slow candlelight glow (never more than 3 changes a second), a low fog layer that never covers hotspots or text, torn or burnt edges on frames and panels from existing parchment assets, faint hover and focus glow on hotspots, loading lines in the story's voice. All motion off under reduced motion. Content exclusions still apply: no gore, no occult or religious symbols, nothing imitating a film, game or brand.

5. Installable web app (tech steering: "installable web app"). A web manifest for the game (and the atlas if it is cheap), theme colours, and whatever the current install criteria need. App icons do not exist yet: list the icon asset ids, sizes and formats you need in docs/phase-5-notes/content-and-assets-needed.md, wire the manifest to those ids, and continue. I add the files outside Kiro.

6. Phase 4 leftovers.
   - Hotspot positions: for every scene of every World, the hall and the tutorial, save a screenshot with the ?layout=1 overlay to the git-ignored folder, and list the file paths at the mid-phase stop. I review them and send corrections; you apply them to the layout data.
   - Polish items from docs/phase-4-notes/impeccable-review.md not fixed yet, including the spring-heeled-jack heading contrast (glow on surface) and the odd "An empty slot." line in the tutorial reward.
   - Tutorial lock: enforce "tutorial done before entering a World" on the server for signed-in players (player_flags). For guests, record the decision.
   - The game serve-build.mjs listens on all interfaces: bind it to localhost if smoke.mjs still works.

7. README. Replace the TODO: what the project is, the two production URLs, how to run both apps locally, the test commands, how Kiro was used (short, linking docs/kiro-usage.md), the disclosure paragraph (keep it), third-party credits (fonts under OFL, Natural Earth public domain, any other licence the code ships), and MIT licence. Product names stay behind the existing catalog keys (app.title and the game title): I give the final names before 2026-12-01, and changing them must be a catalog-only change.

8. Kiro features and log. Use the Neon MCP for the production database work and record each call. Check the current Kiro docs for powers relevant to Vercel or Neon; use one if it fits and record it, or record that none fit. Add a Phase 5 entry to docs/kiro-usage.md: features used and skills used with what each found.

9. Tests and checks.
   - All Phase 1 to 4 tests stay green, run with pnpm -r test and no database or network.
   - New tests: every anchor lands on the right page in book view; the "one page" toggle shows the same text; a reduced-motion test for page turns, glow and fog; image deferral (non-scene images start only after the scene loads); the tutorial lock for signed-in players; the rate limit; headers present on built responses; manifest fields and icon ids.
   - Each test must fail when its rule is broken (mutation-check the important ones by hand, as in Phase 4).
   - Production smoke check (after I push and Vercel deploys): as a guest, the hall, the tutorial and one Banshee win; as a temporary test user you create on production, one other World won with the right score row; delete the test user and its rows by exact id afterwards. /anchor/keepers-note--ch-1 works. Network responses on production hold no answers before they are earned. Record commands and results, never a cookie, password or token.
   - Headless Chrome on production: keyboard-only from the hall to a broken curse, 390 px touch, reduced motion, book view on a phone and a desktop width, and the Slow 4G timings.

Skills. Use these global skills from ~/.kiro/skills:
- read-the-damn-docs: TanStack Start on Vercel, Vercel monorepo and routing, Vercel headers, caching and firewall, Neon Auth in production, Neon branches and roles, web app manifest and install criteria, CSS multi-column and scroll snapping, Kiro powers.
- ponytail: smallest setup that meets each item, especially deployment and the book view.
- agent-security: deployment config, secrets handling, headers, rate limit, the production database roles.
- impeccable (the catalog name; agent-impeccable is not installed): the book view and the Halloween mood against the design steering, the theme packs and the brief. Run it in this thread, no reviewer sub-agents.
- agent-tester: test quality; each test must fail when its rule is broken.
- agent-guard: a guard pass after each group of tasks.
- verify-and-stop: the final check before the handover.
Skills never override the spec, the steering files or this prompt; on conflict, follow the spec and tell me. Do not use agent-pilot, agent-superpowers, agent-gamestudio or any skill that starts sub-agents or its own workflow. If a skill is unavailable, say so and continue.

Stops: wait for me only at
- the requirements, design and tasks approvals;
- each step only I can do: creating the Vercel project(s) (give me every setting), adding a secret or environment variable (name and place only), running the atlas_web password script, and pushing to main so Vercel deploys (tell me when the tree is ready; I commit and push);
- a production database change not approved in the design;
- missing content or assets that block a whole item (otherwise list them and continue);
- the mid-phase stop: production is live with the current look and the speed fixes, and the hotspot overlay screenshots are ready. Give me both URLs, the measured timings and the screenshot paths, and wait for my feedback before the book view and the mood work;
- more than two tasks blocked;
- the final handover.
Otherwise keep going.

When all tasks are done, write docs/phase-5-handover.md with: the production URLs; the Vercel setup (projects, root directories, build settings, routing, headers, caching) and the vercel.json files; the production database steps with the exact statements and MCP calls; environment variable names per project; files and folders created; versions pinned and why; the book view (how pages are built, how anchors land, the toggle) and the mood layer (each effect and its reduced-motion behaviour); speed numbers before and after per screen; test results (counts, pass or fail); production smoke and browser results; security headers and the rate limit; skills used and findings; content and assets still needed; anything that needs my action before the submission. Do not commit or push. Stop and wait.
```

## Part C: your stops during the phase

1. **Approvals:** bring requirements, design and tasks here before approving. Check the design's Vercel layout and production database steps closely.
2. **Vercel project(s):** create them exactly as Kiro lists. Before the first deploy, check every project root has the `git.deploymentEnabled` rule (`{"*": false, "main": true}`).
3. **Secrets:** make each value in the terminal pane, never the chat box, and paste it straight into Vercel or `.env`:
   - random keys: `openssl rand -base64 32 | pbcopy`
   - the atlas_web password: run Kiro's script; it copies the connection string to the clipboard.
4. **Push:** when Kiro says the tree is ready, bring its message here first; Claude checks the diff and gives the commit and push commands.
5. **Mid-phase stop:** open both production URLs on your phone and on a laptop. Bring Kiro's message and the screenshot paths here; Claude reviews the hotspot overlays and writes the corrections.
6. **Icons:** Claude makes the app icons Kiro lists, outside Kiro.

## Handover check (you, after Kiro finishes)

Phase 5 is done only when all of these are true:

- [ ] `.kiro/specs/launch-and-polish/` has requirements, design and tasks files.
- [ ] `git status` shows no changes under `content/` or `assets/`, and every Vercel project root keeps the `git.deploymentEnabled` rule.
- [ ] `pnpm -r test` passes fully.
- [ ] Both production URLs work: the atlas at `/`, the game at `/game`, images load, sign-in works.
- [ ] A Hint 2 link and `/anchor/keepers-note--ch-1` open the right page in book view.
- [ ] Production network responses show no answers before they are earned.
- [ ] The Slow 4G numbers are recorded, with each screen marked pass or fail.
- [ ] The README has no TODO and has the disclosure paragraph.
- [ ] `docs/phase-5-handover.md` and the Phase 5 entry in `docs/kiro-usage.md` exist.

Then the judge account is created on production (by you, with a password from your password manager), and the submission work starts.
