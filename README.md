# TVÅAN — Hockeytvåan matchcenter

A mobile-friendly Swedish scoreboard covering nine Hockeytvåan groups in 2026/27. Includes automatic refresh, fixtures/results, regional filters, favorite teams, and match events with shots, goals and penalties when reported.

## Deploy to Vercel

1. Import `philip774/stats` in Vercel.
2. Use **Next.js** as the framework and leave **Root Directory** as `./`.
3. Leave the build command and output directory on their defaults. Select **Deploy**.

No environment variables, API key, database, or ChatGPT login are required. The repository contains the complete app at its root. API routes require server hosting; do not use a static export or GitHub Pages.

## Run locally

Use Node.js 22, then:

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm test
npm run typecheck
npm run build
npm start
```

## Data

The app's server feed reads official pages at https://stats.swehockey.se, including schedules, current live match fragments and game events. This is an independent HTML adapter, not a documented official API. Requests are cached briefly and the visible app refreshes every 30 seconds. Reporting delays, source outages and changes to the upstream page format can affect coverage. Failed groups and data errors are shown; no mock scores are substituted.

API endpoints:

- `/api/games?date=YYYY-MM-DD`
- `/api/game?id=GAME_ID`

All match dates use Europe/Stockholm. Favorites are saved on the device. Add to Home Screen is supported; push notifications are not included. Update the group IDs in `lib/hockey.mjs` for future seasons. Current IDs were verified on 19 October 2026.

The original Sites checkout and temporary research/build artifacts are retained locally but excluded from this GitHub repository. This version uses standard Next.js for Vercel and has no Sites/Cloudflare dependency.
