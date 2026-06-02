# StickerMate

StickerMate is a fast, mobile-first web app for tracking the 980 standard-album stickers in a FIFA World Cup 2026 collection. It is designed for quick collection entry, duplicate management, team-by-team browsing, and offline-first personal use.

© 2026 StickerMate. All rights reserved. Made and maintained by Strahinja Vujinovic.

## Overview

StickerMate keeps the experience closer to a polished consumer app than a spreadsheet. Users can paste large batches of sticker codes, mark quantities directly from the collection, browse visual sticker cards, and keep everything saved locally on the device.

## Disclaimer

StickerMate is an unofficial fan-made collection tracker. It is not affiliated with, endorsed by, or connected to Panini, FIFA, LastSticker or World Cup 2026.

Sticker images and checklist data are used only for personal tracking and reference inside the app.

## Features

- New Entry for pasted sticker codes with automatic separator detection
- Quick Album Fill for one-card-at-a-time setup with saved progress
- Fill screen with New Entry for multi-code paste and optional pack spending
- Quantity-based collection tracking: missing, owned, and duplicates
- Dedicated Collection screen with search, filters, list view, and grid view
- Teams/Reprezentacije page with progress and compact team icons
- Dashboard statistics with completion progress
- Instant search by code, player/name, or team
- All, owned, missing, and duplicate filters
- List View for fast management
- Grid View for visual album browsing
- Team pages with image card grids
- Sticker detail pages with larger image preview
- Duplicate page for trading preparation
- Privacy-scoped trade QR generation
- Friend QR import with immediate trade matching
- Manual spending tracking for album, packs, bundles, and individual sticker purchases
- Settings for theme, pack defaults, reset, and onboarding replay
- Dismissible in-app help cards and a dedicated Help page
- LocalStorage autosave for collection data, language, theme, view mode, and review progress
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
services/             Code validation and trade QR helpers
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

The source checklist lives in [data/stickers.json](./data/stickers.json). The full imported checklist contains 1,034 canonical codes. StickerMate filters the active album tracker to the 980 standard stickers and excludes the 54 collector variants whose codes end with lowercase `s`.

The app derives teams, lookup maps, search data, statistics, review order, and image metadata from the active album sticker set.

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

## New Entry System

New Entry accepts codes separated by spaces, commas, tabs, or new lines. It validates against the checklist, increments quantities, identifies duplicates, and reports invalid codes without crashing the flow.

Example:

```text
BRA1 BRA2 BRA2 ARG1 POR15
```

## Quick Album Fill

Quick Album Fill is the recommended first-run workflow. It presents one standard-album sticker at a time and lets the user mark it as missing, owned, or duplicate. Progress is persisted in LocalStorage, so the flow can be paused and resumed later from the dashboard, Fill, or Settings.

The review supports:

- Large tap targets for mobile use
- Keyboard shortcuts for fast desktop entry
- Swipe gestures on the sticker image
- Team/section jumping
- Completion summary with export backup

## Fill And New Entry

The Fill screen is the main place for updating the album. It offers:

- Quick Album Fill
- New Entry for codes from newly opened stickers
- Manual Edit through the Collection page

New Entry accepts multiple sticker codes separated by spaces, commas, tabs, or new lines. It validates against the active 980-sticker album dataset and can optionally create a linked spending entry for opened packs.

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

StickerMate ships with Serbian as the default language and English as an alternate language. The language switcher is available from the header on every page.

Translations live in:

```text
locales/sr.json
locales/en.json
```

The UI reads text through a small typed translation helper in `lib/i18n.ts` and the `useI18n()` hook. The selected language is stored in LocalStorage via the Zustand collection store, so the choice persists between sessions.

To add another language, create a new dictionary file with the same keys and register it in `lib/i18n.ts`. Components should not need to change.

## Help System

StickerMate includes lightweight, dismissible help cards on the main product screens plus a dedicated Help page available from More. Help-card dismissals are stored in LocalStorage as part of the collection store, and Settings includes a "Show help again" action that restores all guide cards without changing collection data.

Help text is fully localized through the same translation dictionaries as the rest of the UI. New pages can add their own guide card by using `components/GuideCard.tsx` with a stable guide key and translation keys.

## PWA Support

StickerMate includes a web app manifest and service worker registration. The current PWA layer is intentionally simple: it supports installability and lightweight app-shell caching while collection data remains stored locally in the browser through LocalStorage.

## Optional Supabase Cloud Sync

StickerMate is local-first. Login is optional, and the app continues to work fully without Supabase using LocalStorage on the current browser/device.

When Supabase is configured, Google login can be used for online backup and sync. Supabase stores only user-specific data:

- Sticker quantities
- App settings, onboarding state and dismissed help cards
- Trade history
- Spending entries
- Sync timestamps

The 980-sticker album checklist, sticker metadata and sticker images remain static/local in the app. They are not stored in Supabase.

Create a local environment file from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Do not commit `.env.local`. Google Client ID and Google Client Secret are configured in the Supabase Dashboard under Authentication -> Providers -> Google. Never put the Google Client Secret in source code or in `NEXT_PUBLIC_*` variables.

### Supabase Setup

1. Create a Supabase project.
2. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` locally and in Vercel.
3. Enable Google provider in Supabase Authentication.
4. Add the Google Client ID and Secret in the Supabase Dashboard.
5. Add the Supabase callback URL to Google OAuth Authorized redirect URIs.
6. Add local and production app URLs in Supabase Auth URL configuration.
7. Run `supabase/migrations/001_stickermate_cloud_sync.sql` in the Supabase SQL Editor.
8. Deploy to Vercel with the same public Supabase environment variables.
9. If Google OAuth consent is in testing mode, add every allowed Google account as a test user.

First login never deletes local data automatically. If cloud data and local data both exist, the Settings account card asks whether to save local data online, load cloud data, or merge both.

## Trade System

The Duplicates page lists all stickers with quantities above one and is the foundation for trading. StickerMate can generate a public trade QR profile containing only a display name, missing sticker codes, duplicate sticker codes, and a generated timestamp.

Friend QR import validates the payload, stores or updates a friend profile locally, and immediately calculates possible trades:

- I can give: my duplicate stickers that the friend is missing
- Friend can give me: friend duplicate stickers that I am missing

The QR payload intentionally excludes full collection data, settings, entry history, images, and other private data.

## Spending Tracking

StickerMate includes a local spending ledger for collectors who want to track how much money they personally spent on the album. Spending is deliberately manual: trades, QR imports, and friend comparisons never add money automatically.

Spending is stored internally in Serbian dinars. Serbian UI displays RSD, while English UI displays an EUR equivalent using the fixed app rate `1 EUR = 117 RSD`. There are no live exchange-rate calls.

Each spending entry stores:

```ts
type SpendingEntry = {
  id: string;
  date: string;
  amount: number;
  currency: "RSD";
  category: "packs" | "album" | "bundle" | "individual" | "other";
  packsCount?: number;
  stickersCount?: number;
  note?: string;
  linkedEntryId?: string;
  createdAt: string;
  updatedAt: string;
};
```

The Spending page shows total spent, packs bought, stickers from packs, average pack price, cost per owned sticker, and editable purchase history. New Entry also has an optional collapsed pack-spending section.

Default pack calculation:

```text
1 pack = 7 stickers = 150 RSD
```

Backups include `spendingEntries`, pack settings, and language/theme preferences. Old backups without spending data still import successfully.

## Roadmap

- Cloud sync with user accounts
- Friend list polish and richer collection comparison
- Shareable trade links
- Spending charts and budget summaries
- Multiple albums
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
- Help Page
- Settings

## Known Limitations

- Collection data is local to the current browser/device unless exported manually.
- Remote images depend on LastSticker availability.
- The app does not currently verify whether every remote image exists before display.
- QR trade matching is local-only and intentionally lightweight.

## License

No license has been selected yet. Add a license before publishing as an open-source project.
