# Kiroween 2026: work plan

Dates are 2026. Deadline: 2026-12-04 14:00 PT (about midnight Cairo time). Target submit: 2026-12-03.

## What is built where

All software is built in Kiro IDE. Work done outside Kiro is limited to content and media, and it is disclosed in the README and the Kiro write-up.

| Work | Where | Why it is allowed |
|---|---|---|
| Brainstorming, decisions, this plan | Outside Kiro (this planning folder) | Ideas and planning are not the software. Rules only require the app to be built with Kiro. |
| Legend research and first drafts (`legends/*.md`) | Outside Kiro, then imported into the repo through Kiro | Content, like images. Created after 2026-10-30, owned by the entrant. Validated in Kiro by hooks. |
| Visual assets | AI image tools | Rules allow third-party tools if their terms allow use. Ownership must be ours; no trademarks or copyrighted material. |
| Steering docs, specs, hooks, custom agents, MCP config | Kiro | This is the evidence judges look for in `/.kiro`. |
| Skeleton, atlas app, game app, database schema, content import, tests, deploy config, README | Kiro | The software itself. |
| Demo video, blog post, social post | Outside Kiro | Submission materials, not the software. |

Disclosure line for the README and write-up: "Legend research drafts and visual assets were prepared with AI tools outside Kiro and imported and validated through Kiro hooks. All code, specs, steering and tests were built in Kiro IDE."

## Phase 0: setup (2026-11-19)

1. Request Kiro credits through the form on the Resources tab (deadline 2026-12-01 12:00 PT, review takes about 48 business hours).
2. In Kiro: create the public GitHub repo with an MIT `LICENSE` and the folders `/skeleton`, `/apps/game`, `/apps/atlas`, `/content/legends`, `/.kiro`.
3. Add `vercel.json` with Git deployments limited to `main`: `{"git": {"deploymentEnabled": {"*": false, "main": true}}}`.
4. Create the Neon project. Add the Neon MCP server in Kiro.
5. Write steering docs in `/.kiro/steering/`:
   - `product.md`: the decisions in [01-decisions.md](01-decisions.md).
   - `content.md`: documentary style, sourcing, exclusions (from [legend-format.md](../../content/legend-format.md)).
   - `i18n-rtl.md`: English first, Arabic behind a flag, logical CSS properties only, direction-aware components.
   - `tech.md`: stack, folder rules, testing rules.
   - `design.md`: base design system and theme pack rules.
6. Bring the `content/` and `assets/` folders from this pack into the repo through Kiro. `content/legend-format.md` is the content contract.

## Tracks

| Track | Work | Dates |
|---|---|---|
| Content | Four legends complete and reviewed | 11-18 to 11-20 |
| Content | Import the four legends into `/content/legends` through Kiro; content hook passes | 11-21 |
| Content | Eight more legends, about one per day | 11-22 to 11-30 |
| Design | Base design system, direction-aware components, four theme packs | 11-20 to 11-23 |
| Design | Generate assets: hub, tutorial room, four worlds, atlas images | 11-21 to 11-25 |
| Skeleton | Content schema and import, seeded RNG, puzzle generator, lead chains, gated hints, chapter deep links, theme packs, scene explorer | 11-20 to 11-24 |
| Skeleton | Neon Auth (Google + username/password), guest mode, progress and score, Arabic flag | 11-22 to 11-25 |
| Atlas | World map, legend page with chapters and anchors, documented-vs-told section, per-legend theme | 11-24 to 11-27 |
| Game | Hub, tutorial room, four worlds, panning, hotspots, puzzles, dead ends, fear meter, hints, guest limit | 11-24 to 11-29 |

## Finish

| Date | Work |
|---|---|
| 11-30 to 12-01 | Wire remaining legends into the game, test, performance, accessibility, deploy, seed the judge test account, pick names |
| 12-02 | Demo video (under 3 minutes, public on YouTube), Kiro write-up, README |
| 12-03 | Blog post and social post (bonus prizes), fill the Devpost form, submit |
| 12-04 | Buffer day |

## Kiro features per track

| Kiro feature | Use |
|---|---|
| Specs | One spec for the skeleton core, one per app, one for auth and progress |
| Steering | Product, content, i18n/RTL, tech, design |
| Hooks | Content linter on save for `/content/legends/*.md` (required sections, sources, fact counts, anchors); RTL check on component save (no left/right physical CSS); run property tests on generator changes |
| Property-based testing | Seed always yields solvable puzzles; exactly one correct answer; answer exists in the linked chapter; true lead always deducible; hotspot roles never leave a world unsolvable |
| Custom agents | Lore researcher (drafts new legends in the contract format); game balance reviewer (checks puzzle difficulty and fear pacing) |
| MCP | Neon MCP for schema, migrations and content import |
| Kiro powers | Use any relevant powers for the stack and note them in the write-up |
| Skills | Every phase prompt names a small set of global skills (from `~/.kiro/skills`) for that phase: docs check, test quality, security, guard pass, final verification. Skills never override the spec, steering or the prompt. Note them in the write-up |

## Rules checklist

- [ ] Repo public on GitHub with an MIT license visible in the About section.
- [ ] `/.kiro` at the root and not in `.gitignore`.
- [ ] Two app folders: `/apps/game` and `/apps/atlas`.
- [ ] Working URLs for both apps.
- [ ] Judge test account credentials in the private submission field.
- [ ] Video under 3 minutes, public on YouTube, no copyrighted music or trademarks.
- [ ] Text description and Kiro write-up in English.
- [ ] Disclosure of outside tools and any pre-existing libraries or templates.
- [ ] Social post starts with `#KiroweenHackathon26`; blog post says it was written for Kiroween 2026.
