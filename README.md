# TVÅAN — Svensk hockey live

A clean, iPhone-style hockey app for Sweden, built with Next.js and ready for Vercel. Four tabs: Matcher, Live, Statistik and Favoriter. Light, Dark and System appearance are saved on the device.

## Coverage — 2026/27

All six men's senior tiers from SHL through Hockeyfyran, with the current regional groups published by Swehockey. Also includes the current women's SDHL, NDHL and Damtvåan competitions. The 36 verified groups are:

| Competition | Groups |
| --- | --- |
| SHL | National |
| HockeyAllsvenskan | National |
| Hockeyettan | Norra, Södra |
| Hockeytvåan | Syd A/B, Väst A/B/C, Östra, Norr A/B/C |
| Hockeytrean | Syd A/B/C/D, Dalarna, Gävleborg, Värmland, Västmanland/Örebro, Östra A/B, Norr A/B/C/D/E/F |
| Hockeyfyran | Stockholm A/B, Uppland |
| SDHL | National |
| NDHL | Norra, Södra |
| Damtvåan | Östra |

Old-season women's regional competitions are intentionally excluded. This is senior coverage; junior, youth, veteran and recreational competitions are outside the catalog. Playoff/qualification groups can be added when published; the app does not claim to know groups that have not yet been scheduled.

## Features

- Fixtures, results, date navigation, regional and followed-team filters, and live match events.
- Official total/home/away tables, team profiles, recent form, upcoming games and previous meetings.
- Player search, team rosters, sortable points/goals/assists lists and goalkeeper rankings. Shots and plus/minus sorting appear where published.
- Player profiles with age, position, handedness, height, weight, nationality and youth club where available.
- Season goals, assists, points, appearances, penalty minutes, game-winning/powerplay/shorthanded goals. Where published: plus/minus, shots, shooting percentage and faceoff statistics.
- Goalkeeper appearances, save percentage, GAA, saves, shots against, goals against, shutouts, wins/losses and ice time.
- The selected league, followed teams, saved games and favorite players are retained on the device. Same-named clubs in different competitions have separate favorites.
- Match shots, saves, penalty minutes, powerplay and attendance where reported. Existing team and game favorites remain compatible.
- iPhone home-screen installation, safe-area layout and app icons.

## Deploy to Vercel

1. Import `philip774/stats` in Vercel.
2. Use **Next.js** as the framework and leave **Root Directory** as `./`.
3. Leave the build command and output directory on their defaults. Select **Deploy**.

No environment variables, API key, database or ChatGPT login are required. The repository contains the complete app at its root. API routes require server hosting; do not use a static export or GitHub Pages. When Vercel is connected to this repository's `main` branch, pushed updates can deploy automatically.

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

The server feed reads official pages at https://stats.swehockey.se: schedules, live fragments, match events, standings, rosters and full per-team player statistics. This is an independent HTML adapter, not a documented official API. Reporting delays, source outages and changes to upstream HTML can affect coverage. Failed groups and data errors are shown; mock scores and invented player stats are never substituted. Missing figures stay absent or display a dash; published zeroes are retained.

API endpoints:

- `/api/games?date=YYYY-MM-DD&league=hockeytvaan`
- `/api/game?id=GAME_ID`
- `/api/league?group=GROUP_ID`
- `/api/players?group=GROUP_ID`

League IDs: `shl`, `allsvenskan`, `hockeyettan`, `hockeytvaan`, `hockeytrean`, `hockeyfyran`, `sdhl`, `ndhl`, `damtvaan`. Omitting `league` preserves the original Hockeytvåan feed. Group IDs are whitelisted in `lib/hockey.mjs`.

The visible app refreshes scores/events every 30 seconds, standings/team profiles every minute and player statistics every two minutes. Server requests are cached briefly. Player statistics are specific to the selected group, not combined across transfers or competitions. Player favorites show freshly fetched statistics when opened; stored favorite rows omit old season figures.

Form and previous meetings use completed games in the available series schedule. Historical previews exclude games on or after the selected match date. Official rankings and points are read from the source. All match dates use Europe/Stockholm.

Saved games refresh across leagues and dates and remain saved when the upstream game ID changes as reporting starts. On iPhone, open in Safari and choose Share → Add to Home Screen. Push notifications are not included. Update the verified group IDs in `lib/hockey.mjs` for future seasons. Current coverage was verified on 21 October 2026.

The original Sites checkout and temporary research/build artifacts are retained locally but excluded from this GitHub repository. This version uses standard Next.js for Vercel and has no Sites/Cloudflare dependency.
