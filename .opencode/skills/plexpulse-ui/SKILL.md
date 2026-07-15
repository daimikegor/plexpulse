---
name: plexpulse-ui
description: Component patterns, styling tokens, and responsive layout for PlexPulse's dark theme
---

# PlexPulse UI

## Design Tokens

- `--bg: #0E1015`, `--surface: #171A21`, `--surface-2: #1D212A`, `--border: #2A2E38`
- `--text: #F3F1EA`, `--text-muted: #8D919B`
- `--gold: #E8A33D`, `--gold-dim: #B87F2C`
- `--teal: #4FB6A0` (available), `--pending: #6E9BC9` (requested)
- Error: `#C2554B`, available button: `#22C55E`
- Fraunces / Inter / IBM Plex Mono

## Components

### InfiniteMediaGrid
Props: `{ apiEndpoint, initialResults, initialPage, initialTotalPages, showFilter? }`
IntersectionObserver infinite scroll, dedup by `item.id`, opens DetailModal.
Filter: 3-button toggle (all/movie/tv) via `.filter-toggle`.

### DetailModal
Props: `{ item, isOpen, onClose }`
createPortal, isClient SSR guard, fetches `/api/tmdb/details` + `/api/media-status`.
State machine: idle → loading → success/error. youtube trailer iframe.

### PosterImage
Props: `{ src, alt, mediaType, title, year, overview, tmdbId, onRequestClick? }`
IntersectionObserver lazy status (rootMargin: 200px). Module-level fetch dedup.
Post-success: poll every 15s x8 with `force=1`.
Fallback: `poster-fallback` + Film icon.

## CSS Classes

- `.results-grid`: `auto-fill, minmax(155px, 1fr)`
- `.shelf__row`: horizontal scroll
- `.ticket` / `.ticket-wrap`: card with perforation
- `.btn.btn--gold`, `.is-available`, `.is-requested`, `.is-error`
- `.filter-toggle`: pill buttons
- `.poster-status-badge--available` (teal), `.poster-status-badge--requested` (pending)
- Media badges: `#1f4fbc` (movie), `#a329bb` (series)
- `.modal-overlay` + `.modal-card`

## Responsive

860px: sidebar collapses. 700px: reel edges hide. 560px: mobile card size.
MobileBottomNav with `activeTab` prop.
