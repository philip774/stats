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
- Official total/home/away tables, an expandable full table with wins/losses and overtime/shootout records, team profiles, recent form, upcoming games and previous meetings. Completed games from today join team form as soon as the source confirms a final score.
- Player search and position/team/minimum-appearance filters, roster position tabs, additional leaderboards and a side-by-side comparison of two players from the same group. Goalkeeper lists show actual appearances and let users set their own minimum; they are not presented as an officially qualified goalie leaderboard.
- Player profiles with official portraits, age, position, handedness, height, weight, nationality and youth club where available. Season history and individual game logs include ice time and hits when the official league profile supplies them. Regular season and playoff history stay separate; goalkeeper appearances use GPI, not the team-game GP count.
- A dedicated career view includes international seasons supplied by the official profile, league/competition-stage filters, totals for the displayed records, separate league/stage summaries and a season-by-season club timeline. Missing figures are not treated as zeroes, duplicate/aggregate rows are not counted twice, and goalkeeper save percentages use total saves and goals against rather than averaging percentages.
- Season goals, assists, points, appearances, penalty minutes, game-winning/powerplay/shorthanded goals. Where published: plus/minus, shots, shooting percentage and faceoff statistics.
- Goalkeeper appearances, save percentage, GAA, saves, shots against, goals against, shutouts, wins/losses and ice time.
- The selected league, followed teams, saved games and favorite players are retained on the device. Same-named clubs in different competitions have separate favorites.
- Match shots, saves, penalty minutes, powerplay and attendance where reported, including deciding shootout goals in the event feed. Existing team and game favorites remain compatible.
- Team leaderboards and detailed team profiles: powerplay/penalty killing, shots, save/shooting percentage, goals per 60 minutes, penalties, faceoffs and attendance. Per-60-minute values are labeled explicitly and are not confused with per-game figures. Source timestamps and links are available.
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
- `/api/player?group=GROUP_ID&name=SOURCE_NAME&team=TEAM_NAME`
- `/api/team-stats?group=GROUP_ID`

League IDs: `shl`, `allsvenskan`, `hockeyettan`, `hockeytvaan`, `hockeytrean`, `hockeyfyran`, `sdhl`, `ndhl`, `damtvaan`. Omitting `league` preserves the original Hockeytvåan feed. Group IDs are whitelisted in `lib/hockey.mjs`.

The visible app refreshes scores/events every 30 seconds, standings/team profiles every minute and player statistics every two minutes. Server requests are cached briefly. Player statistics are specific to the selected group, not combined across transfers or competitions. Player favorites show freshly fetched statistics when opened; stored favorite rows omit old season figures.

Form and previous meetings use completed games in the available series schedule. Historical previews exclude games on or after the selected match date. Official rankings and points are read from the source. All match dates use Europe/Stockholm.

Saved games refresh across leagues and dates and remain saved when the upstream game ID changes as reporting starts. On iPhone, open in Safari and choose Share → Add to Home Screen. Push notifications are not included. Update the verified group IDs in `lib/hockey.mjs` for future seasons. Current coverage and expanded stats were verified on 22 October 2026. Tied ranking rows are retained even when Swehockey leaves the rank cell blank; column headings determine player-stat fields, and missing values never become zeroes.

### Portraits and profile history

Portraits and additional profile records come from public official league sites. SHL and SDHL provide squad/player JSON; players are matched by a unique name and club, with a birthdate check before adding career history. HockeyAllsvenskan currently exposes a partial roster in its public server-rendered page; available portraits can be used, but its unavailable pagination API is not bypassed. Regional competitions do not have a comprehensive public portrait feed. Image and historical coverage therefore varies by player. Missing or failed images show a jersey/avatar placeholder, never a fabricated photo. Portraits are loaded directly from allowlisted official CDNs and linked to their source.

The primary 2026/27 stats remain Swehockey's group-specific figures; a second provider's history never overwrites them. Club names are matched using published aliases and explicit club-name normalization. Stats, standings and biography can update at different times upstream; fetch time is labeled separately from source-update time. This app cannot promise zero reporting delay or data that its sources do not publish.

### Career coverage and transfers

The career tab currently uses the historical records returned by verified SHL/SDHL profiles. These can include earlier Swedish clubs and foreign leagues (for example AHL). This is not a worldwide lifetime database: the provider can omit years, leagues, junior seasons and national-team tournaments. Other players have an explicit unavailable-history state. A current-season group total is never silently relabeled as a lifetime total.

Career sums apply only to the displayed records. Regular season, playoffs and unspecified stages retain their own groups; a missing stage is never assumed to be the regular season. Conflicting duplicate records disable the affected summary. GAA is displayed per season and is not summed or averaged across seasons.

Club history lists clubs by season; it does not infer confirmed transfers, loans, dates or intra-season movement order. Broad worldwide careers and confirmed transfer records require an additional provider. The [Elite Prospects API](https://docs.api.eliteprospects.com/) documents career statistics and transfers; its [coverage/history options](https://developer.eliteprospects.com/pricing) require a suitable account, API access and licensed coverage. No Elite Prospects API integration or credentials are included in this repository. Even a wider provider cannot establish records that were never recorded.

The original Sites checkout and temporary research/build artifacts are retained locally but excluded from this GitHub repository. This version uses standard Next.js for Vercel and has no Sites/Cloudflare dependency.
