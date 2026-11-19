# Kiro Phase 3: the atlas

Written from `docs/phase-2-handover.md` (Phase 2 committed as `3fc81f2`). Part A is what you do yourself. Part B is the prompt you paste into a new Kiro **Spec** chat. Phase 4 (game play) is written only after Phase 3 is handed back and checked.

Content work runs at the same time, outside Kiro: the Keeper's Note (the tutorial's fiction entry) is written for Phase 4. Kiro does not touch `content/` or `assets/`.

## Part A: before the prompt (you)

1. Optional, recommended: in `.env`, change `sslmode=require` to `sslmode=verify-full` in both `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. It keeps today's safe behaviour and removes the `pg` warning.
2. In Kiro, start a new chat and choose **Spec**.
3. Kiro will stop once to ask you to add a read-only database URL to `.env`. Kiro gives you the line, but the password part comes from the Neon console, so you add it yourself.

## Part B: paste into a new Kiro Spec chat

```text
This is Phase 3 of our Kiroween 2026 entry: the atlas. Read docs/phase-2-handover.md, docs/tech-decisions.md, docs/planning/01-decisions.md (decisions 4, 7, 9, 18 to 26 and 29), content/legend-format.md (sections 0 to 4, 8, 9 and 10), the "Atlas shell" section of content/hub-and-tutorial.md, and the steering files first.

Create a spec named "atlas". Go through requirements, then design, then tasks, and wait for my approval after each.

Boundaries:
- Do not edit, create or delete anything under content/ or assets/. Content work continues in parallel.
- Do not change the Phase 1 parser, generator or audit, or the Phase 2 auth, access, runs and score code. You may add new modules to skeleton/.
- In apps/game, change only two things: add a not-found page (the dev log warns that the root route has no notFoundComponent), and link each hall door to that legend's atlas page.
- No new db:import is needed. Content is already on dev-skeleton-core. If the design needs a schema change, stop and ask first.
- vercel.json stays untouched. Deployment is a later phase.

Scope:

1. Atlas app. Set up apps/atlas as a TanStack Start app (React, TypeScript strict, Tailwind) that imports @kiroween/skeleton. It owns the root path / on the same domain as the game, so it must never serve anything under /game. Public: no sign-in, and no auth code in this app or its bundle (decision 7). Mobile-first, works well on desktop. Reuse the skeleton design tokens.

2. Content from Neon (decision 21). The atlas reads the legend tables imported in Phase 1 (legends, chapters, versions, documented_told, sources, assets, anchors). Read-only: use a Postgres role that can only SELECT. Create it on dev-skeleton-core through the Neon MCP if it can; otherwise give me the console steps. Then STOP and ask me to add its connection string to .env as ATLAS_DATABASE_URL. Never read, print or write secret values.

3. Screens.
   - Home: the atlas hero image, a world map with one marker per legend, and the same legends as a list grouped by region. The list is the accessible way in, and it works without the map.
   - The map must be geographically honest. The painted map asset (shared-atlas-map-01) is decorative and not accurate, so do not place markers on it by latitude and longitude. Draw markers from map_point on a real world outline in a simple projection, using public-domain data (for example Natural Earth). Check the licence in the current docs and record it for the README. The painted map may appear as decoration around it. Each marker opens a card with the title, region, era, scare level, reading time and one_line_hook, and a link to the legend page.
   - Legend page: hero image, cold open, chapters 1 to N with their chapter plates and hooks, the versions section, the "What is documented, and what is told" table and closing paragraph, and the sources list. Show "[Dramatization]" labels visibly where the text has them. Sources show title, author and year, and link out when a URL exists (rel="noopener noreferrer"). Use the alt text from each asset's usage column.
   - A not-found page.

4. Deep links (decision 9). The game will send players to exact anchors in Phase 4, so the scheme is fixed now:
   - Every chapter and version anchor is an element id on the legend page, exactly as stored (for example banshee--ch-3, flying-dutchman--versions--v-log). The bare versions anchor (<legend-id>--versions) is the versions section's id.
   - The URL is /legends/<legend-id>#<anchor>.
   - A resolver route /anchor/<anchor> redirects to that URL, and returns a 404 page for an unknown anchor. Validate the anchor format before any query.
   - Put one pure function in the skeleton, atlasUrl(anchor), that the game will call in Phase 4.
   - Landing on an anchor scrolls to it, moves keyboard focus to its heading, and briefly highlights it, with no motion when the visitor prefers reduced motion.

5. Theme packs (decision 24). Each legend page uses its own theme from legends.theme: palette as CSS variables scoped to that page, and its display and body fonts. Load only the fonts of the page being viewed, prefer self-hosted files over a third-party font CDN, and use font-display: swap. Check every theme's body text and link colours for WCAG AA contrast against its background. Where a theme fails, use the base design token for that role and record it. Never ship unreadable text.

6. Images. Serve the WebP files from assets/ for both apps from one place, without copying or changing them in the repo. Put one pure function in the skeleton, assetUrl(assetId), that maps an asset id to its path using the folder rule in assets/README.md. Set width and height on every image so pages don't jump. The hero loads first; everything below it loads lazily.

7. Arabic flag (decision 26). Same FEATURE_ARABIC behaviour as the game: the root sets lang and dir. Use logical CSS properties everywhere. Story text stays English.

8. Page basics. A title and a meta description per page (the legend's one_line_hook), an Open Graph image (the legend's hero), one h1 per page, landmarks, a skip link, and a visible focus style.

9. Tests.
   - With no database: render each of the 12 legend pages from the parsed content files with react-dom/server, and prove that every anchor in the content appears exactly once as an element id, and that every Hint 2 anchor in every legend's puzzle slots resolves to one.
   - Every asset id in the content maps through assetUrl to a file that exists under assets/.
   - The anchor resolver: valid, unknown and malformed anchors.
   - The contrast check: every theme passes, or its fallback is used.
   - The atlas bundle contains no auth code and no secret variable names.
   - These run in `pnpm -r test` with no database and no network. The Phase 1 and Phase 2 tests must stay green.
   - Separately, a smoke check against dev-skeleton-core with the read-only role: home, two legend pages, one /anchor redirect, one unknown anchor (404). Record the exact commands and results.

10. Kiro usage log. Add a Phase 3 entry to docs/kiro-usage.md: Kiro features used, and the skills used with what each found.

Skills. Use these global skills from ~/.kiro/skills:
- read-the-damn-docs: before using TanStack Start, Tailwind, Drizzle, Neon roles, map data or font loading, read the current official docs.
- ponytail: smallest code that meets each requirement. No map library unless the design shows a simple SVG cannot do it.
- agent-impeccable: design and accessibility review of the home and legend pages against the design steering and the theme packs. This is the most important review in this phase.
- agent-tester: test quality; each test must fail when its rule is broken.
- agent-guard: a guard pass after each group of tasks.
- verify-and-stop: the final check before the handover.
Skills never override the spec, the steering files or this prompt; on conflict, follow the spec and tell me. Do not use agent-pilot, agent-superpowers or any skill that starts sub-agents or its own workflow. If a skill is unavailable, say so and continue.

Stops: stop and wait for me at the requirements, design and tasks approvals, at the read-only database URL step, if a schema change is needed, and if a checkpoint fails and you cannot fix it inside this spec. Otherwise keep going.

When all tasks are done, write docs/phase-3-handover.md with: files and folders created; versions pinned and why; how the atlas reads content (role, queries); the deep-link scheme and atlasUrl; how images and fonts are served; the theme contrast results and any fallbacks; map data and its licence; test results (counts, pass or fail); the smoke-check results; skills used and findings; anything that needs my action. Do not commit or push. Stop and wait. Do not start Phase 4.
```

## Handover check (you, after Kiro finishes)

Phase 3 is done only when all of these are true:

- [ ] `.kiro/specs/atlas/` has requirements, design and tasks files.
- [ ] `git status` shows no changes under `content/`, `assets/` or `vercel.json`.
- [ ] `pnpm -r test` passes fully.
- [ ] You can run the atlas locally: the home page shows the map and the list, a legend page shows every section, and `/anchor/banshee--ch-3` lands on that chapter.
- [ ] Each legend page looks like its own world (colours and fonts) and stays readable.
- [ ] Hall doors in the game link to the atlas.
- [ ] `docs/phase-3-handover.md` and the Phase 3 entry in `docs/kiro-usage.md` exist.

Bring the handover back here before committing.
