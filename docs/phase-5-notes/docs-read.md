# Docs read in Phase 5

Pages read with `read-the-damn-docs`, with the date read and the facts taken from each. Dates are the read date; "last updated" is the date the page itself shows.

## 2026-11-21 (task 1.1)

| Page | Last updated | Facts used |
|---|---|---|
| [TanStack Start on Vercel](https://vercel.com/docs/frameworks/full-stack/tanstack-start) | 2026-11-14 | Start deploys to Vercel through the Nitro Vite plugin (`pnpm i nitro`, add `nitro()` to `vite.config`). Runs on Vercel Functions with Fluid compute. |
| [How can I serve multiple projects under a single domain?](https://vercel.com/kb/guide/how-can-i-serve-multiple-projects-under-a-single-domain) | 2026-10-02 | A production domain belongs to one project. Other projects can be reached under a path with `vercel.json` rewrites to their `*.vercel.app` URL. Rewrites run first to last, first match wins, so `/game` and `/game/:path*` go before any catch-all. The sub-app must serve its own assets under its base path. Microfrontends (`microfrontends.json`) are the recommended option for teams; not needed here. |
| [Rewrites on Vercel](https://vercel.com/docs/routing/rewrites) | 2026-08-11 | Rewrites live in `vercel.json` in the project root. Two kinds: same-application and external origin. The browser URL does not change. `/.well-known/acme-challenge` cannot be rewritten. Related: the CDN respects `Cache-Control` from external origins by default. |
| [Deployment Protection](https://vercel.com/docs/security/deployment-protection) | not shown | Standard Protection (available on all plans, recommended) protects all domains except production domains. With it on, the production generated deployment URL is restricted. The open question for the rewrite target (the game project's production alias) stays as design fact U-list item; settle it with a curl after task 1.12. |
| [System Headers](https://vercel.com/docs/headers) | 2026-08-11 | Custom response headers are set in `vercel.json` `headers`. Compression is negotiated by `Accept-Encoding` at the CDN. |
| [Multi-Project Platforms Quickstart](https://vercel.com/docs/platforms/multi-project-platforms/quickstart) | 2026-09-03 | A project's production URL is a stable `<project>.vercel.app` (or `<project>-<team>.vercel.app`) alias that points at the latest production deployment. A team's default protection can show a Vercel login on `*.vercel.app` URLs. |

Not reachable: none. All pages above loaded on 2026-11-21.

## 2026-11-21 (task 7.1)

| Page | Facts used |
|---|---|
| [web.dev: What does it take to be installable?](https://web.dev/articles/install-criteria) | Chrome install criteria: not already installed; engagement (one click or tap, 30 s on the page); HTTPS; a manifest with `short_name` or `name`, `icons` with a 192 px and a 512 px icon, `start_url`, `display` one of `fullscreen`, `standalone`, `minimal-ui` or `window-controls-overlay`; `prefer_related_applications` absent or false. No service worker is listed. Users can install manually even when the criteria are not met. Screenshots and a description are recommended for a richer install UI (not required). |

## 2026-11-21 (task 2.1)

| Page | Last updated | Facts used |
|---|---|---|
| [Neon Auth production checklist](https://neon.com/docs/auth/production-checklist) | 2026-11-09 | Before launch: trusted domains; custom SMTP (shared `auth@mail.myneon.app` is rate-limited and cannot send verification links); application name (defaults to the project name, set per branch); own OAuth credentials; email verification (off by default, recommended); disable "Allow Localhost". |
| [Neon Auth: Set up OAuth](https://neon.com/docs/auth/guides/setup-oauth) | 2026-11-13 | Google works out of the box with Neon's shared credentials; the consent screen then shows Neon's name and logo. Safe (Google only redirects to Neon, sign-ins stay per project), but Neon recommends own credentials for production for trust and control. Own client: redirect URI `{NEON_AUTH_BASE_URL}/callback/google`, per branch; every `callbackURL` origin must be a trusted domain. |
