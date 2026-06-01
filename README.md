# StickerMate

StickerMate is a fast, mobile-first web app for tracking a FIFA World Cup 2026 sticker collection. It is designed for quick collection entry, duplicate management, team-by-team browsing, and offline-first personal use.

## Overview

StickerMate keeps the experience closer to a polished consumer app than a spreadsheet. Users can paste large batches of sticker codes, mark quantities directly from the collection, browse visual sticker cards, and keep everything saved locally on the device.

## Features

- Quick Import for pasted sticker codes with automatic separator detection
- Quantity-based collection tracking: missing, owned, and duplicates
- Dashboard statistics with completion progress
- Instant search by code, player/name, or team
- All, owned, missing, and duplicate filters
- List View for fast management
- Grid View for visual album browsing
- Team pages with image card grids
- Sticker detail pages with larger image preview
- Duplicate page for trading preparation
- Settings for theme, export, import, reset, and onboarding replay
- LocalStorage autosave
- PWA-ready manifest and service worker
- Optional local sticker image downloader
- Serbian and English UI with persisted language switching

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- TanStack React Virtual
- Lucide React
- LocalStorage persistence

## Project Structure

```text
app/                  App Router pages and global layout
components/           Shared app shell and UI primitives
data/                 Sticker checklist JSON source of truth
features/stickers/    Sticker-specific UI and workflows
hooks/                Shared React hooks
lib/                  Data derivation and sticker utilities
public/               Icons, service worker, optional local sticker images
scripts/              Optional maintenance scripts
stores/               Zustand stores
types/                Shared TypeScript types
locales/              Translation dictionaries
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Build

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

StickerMate is a standard Next.js application and can be deployed to Vercel or any platform that supports Next.js. The app does not require a backend for its current local-only mode.

## Data Structure

The source checklist lives in [data/stickers.json](./data/stickers.json). The app derives teams, lookup maps, search data, statistics, and image metadata from this file.

Each sticker is normalized to:

```ts
type Sticker = {
  code: string;
  name: string;
  team: string;
  imageCode?: string;
  imageUrl?: string;
  imageSource?: string;
};
```

## Sticker Import System

Quick Import accepts codes separated by spaces, commas, tabs, or new lines. It validates against the checklist, increments quantities, identifies duplicates, and reports invalid codes without crashing the flow.

Example:

```text
BRA1 BRA2 BRA2 ARG1 POR15
```

## Image System

Sticker image metadata is generated automatically from each checklist code:

```text
https://www.laststicker.com/i/cards/12176/{codeLowercase}.jpg
```

The display priority is:

1. Local image: `/stickers/{codeLowercase}.jpg`
2. Remote LastSticker image URL
3. Placeholder card with code, name, and team

Images use native lazy loading and fallback cleanly if the source fails.

To optionally download local images:

```bash
npm run download:images
```

The script saves images to `public/stickers/`, skips existing files, waits between requests, handles failures, writes `public/stickers/manifest.json`, and produces `scripts/sticker-image-download-report.json`.

Sticker images are external assets from LastSticker/Panini-related sources. Use them only for personal collection tracking. StickerMate can work without images using placeholders.

## Multi-Language Support

StickerMate ships with Serbian as the default language and English as an alternate language. The language switcher is available from the header on every page and also appears in Settings.

Translations live in:

```text
locales/sr.json
locales/en.json
```

The UI reads text through a small typed translation helper in `lib/i18n.ts` and the `useI18n()` hook. The selected language is stored in LocalStorage via the Zustand collection store, so the choice persists between sessions.

To add another language, create a new dictionary file with the same keys and register it in `lib/i18n.ts`. Components should not need to change.

## Friend & Trade System

The current Trades page is intentionally lightweight and prepared for future expansion. Planned additions include shareable duplicate lists, wishlists, friend comparisons, and collection sync.

## Roadmap

- Cloud sync with user accounts
- Friend lists and collection comparison
- Shareable trade lists
- Multiple albums
- Camera scanning and OCR-assisted entry
- Statistics history
- Push notifications and reminders

## Future Improvements

- Replace local-only persistence with optional Supabase/Firebase/PostgreSQL sync
- Add automated browser-based regression tests
- Add import presets for common collection formats
- Add accessibility audit automation
- Add localized status labels

## Screenshots

Screenshots can be added here once the visual design is finalized:

- Dashboard
- Collection List View
- Collection Grid View
- Team Page
- Sticker Detail
- Settings

## Known Limitations

- Collection data is local to the current browser/device unless exported manually.
- Remote images depend on LastSticker availability.
- The app does not currently verify whether every remote image exists before display.
- Trade mode is a placeholder for future functionality.

## License

No license has been selected yet. Add a license before publishing as an open-source project.
