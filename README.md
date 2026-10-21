# TVÅAN — Hockeytvåan matchcenter

An iPhone-style Swedish match app covering nine Hockeytvåan groups in 2026/27. Four focused tabs: Matcher, Live, Tabeller and Favoriter. Includes a persistent Light/Dark/System appearance setting, automatic refresh, date navigation, region filters, followed-team filtering, individual saved games, official total/home/away standings, team profiles with recent form and fixtures, and match events with shots, saves, penalty minutes and power-play percentages when reported. Match sheets also show pre-match form and previous meetings within the selected series.

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
- `/api/league?group=GROUP_ID` (official standings and the group schedule)

Standings and profiles refresh once a minute while visible; live scores and match events refresh every 30 seconds. Form and previous-meeting views are calculated from completed games in the available series schedule. For historical match previews, games on or after the selected match date are excluded. Official rank, goal difference and points are read from the source, not recalculated. Missing match metrics are omitted, and zero values are kept.

All match dates use Europe/Stockholm. Favorite teams and individual saved games are kept on the device. Saved games refresh across their match dates and remain saved when the upstream game ID changes as reporting starts. Existing team favorites are preserved. On iPhone, open in Safari and choose Share → Add to Home Screen for the standalone app layout and icon. Safe-area insets are supported. Push notifications are not included. Update the group IDs in `lib/hockey.mjs` for future seasons. Current IDs were verified on 19 October 2026.

The original Sites checkout and temporary research/build artifacts are retained locally but excluded from this GitHub repository. This version uses standard Next.js for Vercel and has no Sites/Cloudflare dependency.
