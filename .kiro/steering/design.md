---
inclusion: fileMatch
fileMatchPattern: "{apps,skeleton}/**/*.{tsx,css}"
---
# Design

## System
- One base design system shared by both apps (tokens, type scale, spacing, components) lives in the skeleton. Apps do not redefine base tokens.
- Hub palette: background `#0E0B10`, surface `#1C1620`, ink `#E9E1D3`, muted ink `#9C9285`, accent `#E0A84B`, glow `#F4D58D`, danger `#B23A3A`, cold `#7FA7B5`. Fonts: `IM Fell English SC` display, `Source Serif 4` body, `Inter` UI labels. Source: `content/hub-and-tutorial.md`.
- Look: painterly, archival, dark, atmospheric, never gory. One strong light source per image. High contrast so hotspots read on a phone.

## Theme packs
- One theme pack per legend. Tokens (palette with roles, display font, body font, textures, motifs, ambient sound, UI accents) come from the "8. Theme pack" section of `content/legends/<id>.md`. Do not invent theme values; read them from the pack.
- Components consume theme tokens through CSS variables, never hardcoded colors.
- Brush style and grain stay constant across worlds so the game feels like one game.

## Accessibility and motion
- Every fear event (flicker, shake, figure in the corner, sound) respects `prefers-reduced-motion` and an in-app setting. Reduced mode swaps motion for a static or fade equivalent. Fear events never block progress.
- Text contrast meets WCAG AA. Hotspots are keyboard reachable and have accessible names. No text baked into images.
- Mobile first: touch targets at least 44px, pan by drag and by keyboard.
