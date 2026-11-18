---
inclusion: fileMatch
fileMatchPattern: "{apps,skeleton}/**/*.{ts,tsx,css,json}"
---
# i18n and RTL

- English is the primary language. Arabic is built in behind a feature flag and hidden by default. Arabic story content is out of scope for v1.
- No hardcoded UI strings. Every label, message and aria-label comes from the translation catalog by key. Story text comes from the content store, not the catalog.
- Puzzle answers must not rely on English-only wordplay.
- Components are direction-aware from day one: set `dir` on the root, test every component in LTR and RTL.
- CSS uses logical properties only: `margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `border-inline-*`, `text-align: start`. In Tailwind use `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`.
- Forbidden: `left`, `right`, `margin-left/right`, `padding-left/right`, `border-left/right`, `text-left/right`, `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `float: left/right`. Exception: the pannable scene is a fixed painted image; pan math may use physical x, with a comment saying why.
- Mirror directional icons (arrows, chevrons) in RTL. Do not mirror painted scenes, numbers or images.
- Format dates and numbers with `Intl` using the active locale.
