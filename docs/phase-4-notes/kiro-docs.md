# Kiro docs for task 10.1 (custom agents and hooks)

Read on 2026-11-20. Network reachable. Full text fetched.

| Source | Status |
|---|---|
| https://kiro.dev/docs/custom-agents/configuration-reference/ (the CLI path redirects here) | READ in full |
| https://kiro.dev/docs/hooks/ (page updated 2026-11-12) | READ in full |
| https://kiro.dev/docs/hooks/types/ | READ in full |
| `.kiro/hooks/skeleton-tests.json`, `.kiro/hooks/content-validate.json` | LOCAL, READ |
| `.kiro/steering/i18n-rtl.md` | LOCAL, READ (the forbidden physical-property list) |
| `.kiro/agents/` | does not exist yet (no agent files in the repo) |

## Agent file format to use for `game-balance-reviewer`
- Path: `.kiro/agents/game-balance-reviewer.md`. Markdown with YAML front matter; the body is the system prompt.
- Front matter fields: `name`, `description`, `model` (omit, use default), `tools`, `excludedTools`, `resources`, `permissions`, `welcomeMessage`.
- `tools` takes selectors: `read`, `write`, `shell`, `web`, `@builtin`, `*`. Read-only agent: `tools: ["read", "write"]` with `write` limited to the findings file via `permissions.rules` (`capability: fs_write`, `match: ["docs/phase-4-notes/balance.md"]`, `effect: allow`). Other writes still prompt; add `capability: fs_write`, `match: ["**"]`, `exclude: ["docs/phase-4-notes/balance.md"]`, `effect: deny` to block them.
- `allowedTools`, `toolsSettings`, `toolAliases`, `keyboardShortcut` are CLI 2.x legacy. Do not use them. Use `permissions.rules` instead (capabilities `fs_read`, `fs_write`, `shell`, `web_fetch`, ...; effects `allow`, `ask`, `deny`; deny wins).
- `resources`: `file://` URIs relative to the agent file's directory is for `prompt: file://`; for `resources`, paths like `file://skeleton/src/...` are workspace paths. Limits: 32 files, 100,000 chars total, 50,000 per file.
- Plan: `tools: ["read", "write"]`, `resources` listing `file://apps/game/src/**/fear.ts` and the design doc, one `fs_write` allow rule for `docs/phase-4-notes/balance.md`, and `shell` deny (`match: ["*"]`). Nothing else writable, so it "writes findings only".

## Hook format to use for the RTL hook
- Path `.kiro/hooks/physical-css-check.json`: `{"version":"v1","hooks":[{name, description, trigger, matcher, timeout, action}]}`. Same shape as the two existing hooks.
- `trigger: "PostFileSave"` (PascalCase). `matcher` is a regex tested on the file path, e.g. `(^|/)(apps|skeleton)/.*\\.(tsx|css)$`.
- `action: {"type":"command","command":"..."}`: the command gets JSON on STDIN (saved path in it); exit 0 passes, other codes show STDERR. `timeout` is seconds, default 60. An `agent` action only injects a prompt.
- Command reports only (grep, no edits).

## Existing RTL / physical-CSS hook?
No. `.kiro/hooks/` has only `skeleton-tests.json` and `content-validate.json`. The rule lives only as steering text (`.kiro/steering/i18n-rtl.md`). Task 10.3 creates the hook.
