# Kiro Phase 0: setup

Two parts. Part A is what you do yourself before opening Kiro. Part B is the prompt you paste into Kiro chat. Phase 1 (the skeleton spec) is written only after Phase 0 is handed back and checked.

## Part A: before Kiro (you)

1. ~~Request Kiro credits~~ (done: credits received).
2. ~~Create an empty public GitHub repository~~ (done: `Hany-R-Mahmoud/kiroween-2026`).
3. ~~Clone it and open the folder in Kiro IDE~~ (done).
4. ~~Copy the pack folders into the repo~~ (done: all twelve legends, their verification reports, the planning docs and the asset folders are in the repo, not yet committed).
5. Create a Neon project (free tier is fine). Keep the connection string private; do not paste it into chat or commit it.
6. Do not create any code yourself. Everything else in Part B is done by Kiro.

## Part B: paste into Kiro chat

```text
We are building an entry for the Kiroween 2026 hackathon, Skeleton Crew category: one skeleton template and two distinct apps built from it. Everything in this repository is built in Kiro. This is Phase 0: setup only. Do not write application code yet.

Read these first, in this order:
1. docs/planning/01-decisions.md (every agreed decision)
2. docs/planning/02-work-plan.md (plan, Kiro feature use, rules checklist)
3. content/legend-format.md (content contract and art direction)
4. content/hub-and-tutorial.md
5. One legend file, content/legends/banshee.md, to see the content shape

Then do the following, and stop after step 7.

1. Repository layout. Create:
   - skeleton/      (the shared lore engine package)
   - apps/game/     (single-player investigation game)
   - apps/atlas/    (worldwide legends atlas)
   - content/ and assets/ already exist; do not move or edit the files inside them
   - docs/ already exists
   Set up a pnpm workspace that includes skeleton and both apps. Use current stable versions that work together, and note any pin you choose and why in docs/tech-decisions.md. Do not install app frameworks yet beyond what the workspace needs.

2. Root files:
   - LICENSE with the MIT license, copyright holder left as a placeholder I will fill in.
   - README.md stub: project one-liner, the three folders, a "Built with Kiro" section left as TODO, and this disclosure line: "Legend research drafts and visual assets were prepared with AI tools outside Kiro and imported and validated through Kiro hooks. All code, specs, steering and tests were built in Kiro IDE."
   - .gitignore for Node, env files and build output. It must NOT ignore .kiro or anything under it.
   - .env.example listing the variable names we will need (DATABASE_URL and the Neon Auth variables), with no values.
   - vercel.json containing exactly: {"git": {"deploymentEnabled": {"*": false, "main": true}}}

3. Steering docs in .kiro/steering/, written from the decisions file, short and specific:
   - product.md (always included): what the skeleton, game and atlas are; single-player only; game cannot be solved without the atlas; hints deep-link to chapter anchors; seeded randomness; guest limits; judge test account.
   - tech.md (always included): stack (TanStack Start, React, TypeScript strict, Tailwind, Neon Postgres, Neon Auth with Google and username/password, Vercel), workspace layout, testing rules (property-based tests for the generator), no secrets in code.
   - content.md (included for content/**): documentary voice, sourcing rules, [D] and [R] tags, excluded topics, ID rules, never edit story facts without updating the fact pool.
   - i18n-rtl.md (included for apps/** and skeleton/** source files): English first; Arabic built in behind a feature flag; logical CSS properties only (no left/right physical properties); every component direction-aware; no hardcoded UI strings.
   - design.md (included for UI source files): base design system plus one theme pack per legend; theme tokens come from each legend's "Theme pack" section; reduced-motion support for every fear event.

4. Content validation hook. Create a Kiro agent hook that runs when a file in content/legends/ is saved. It checks the file against content/legend-format.md: all required sections present, 5–7 chapters each with an anchor, chapter length 400–700 words, at least 24 facts, at least 3 lead chains, at least 12 hotspots with at least 5 decoys, every source tag used is defined in the Sources table, no [R] fact in a true-or-told slot. It reports problems; it does not rewrite story text.

5. Run the hook logic once on every file in content/legends/ (there are twelve) and write the results to docs/content-check.md. Do not fix the legend files; just report.

6. MCP: add the Neon MCP server to this workspace's Kiro MCP settings so later phases can manage the schema. Do not put any credentials in the repo; I will authenticate it myself.

7. Handover. Write docs/phase-0-handover.md with:
   - every file and folder you created
   - the steering files and when each one is included
   - the hook: trigger and what it checks
   - the content check results summary
   - versions chosen and why
   - anything you could not do or that needs my action
   Then stop and wait. Do not start Phase 1.
```

## Handover check (you, after Kiro finishes)

Phase 0 is done only when all of these are true:

- [ ] `skeleton/`, `apps/game/`, `apps/atlas/` exist and the pnpm workspace lists all three.
- [ ] `LICENSE` is MIT; GitHub shows the license in the About section after the first push.
- [ ] `.gitignore` does not mention `.kiro`.
- [ ] `vercel.json` matches the line in step 2 exactly.
- [ ] `.kiro/steering/` has the five files, each with an inclusion rule.
- [ ] The content hook exists and `docs/content-check.md` lists results for all twelve legends.
- [ ] Neon MCP shows as connected after you authenticate.
- [ ] No connection strings or secrets in any committed file.
- [ ] `docs/phase-0-handover.md` exists.

When the boxes are ticked, commit, push, and bring the handover file back here. The Phase 1 prompt (skeleton spec) is written from it.
