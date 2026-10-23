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
- Match-list period/time indicators and a match clock card show reported total playing time, time within the period, three-period progress, intermissions, explicit stoppages, overtime and shootouts. The displayed clock is a source snapshot refreshed every 30 seconds, not a locally simulated running timer.
- Official total/home/away tables, an expandable full table with wins/losses and overtime/shootout records, team profiles, recent form, upcoming games and previous meetings. Completed games from today join team form as soon as the source confirms a final score.
- Player search and position/team/minimum-appearance filters, roster position tabs, additional leaderboards and a side-by-side comparison of two players from the same group. Goalkeeper lists show actual appearances and let users set their own minimum; they are not presented as an officially qualified goalie leaderboard.
- Player profiles with official portraits, age, position, handedness, height, weight, nationality and youth club where available. Season history and individual game logs include ice time and hits when the official league profile supplies them. Regular season and playoff history stay separate; goalkeeper appearances use GPI, not the team-game GP count.
- A dedicated career view includes international seasons supplied by the official profile, league/competition-stage filters, totals for the displayed records, separate league/stage summaries and a season-by-season club timeline. Missing figures are not treated as zeroes, duplicate/aggregate rows are not counted twice, and goalkeeper save percentages use total saves and goals against rather than averaging percentages.
- Verified NHL profiles add official NHL career totals, draft year/team/round/pick, trophies and published North-American seasons. Extra NHL statistics include shots, shooting percentage, special teams, ice time and goalie wins/losses/saves. NHL portraits are a fallback when no verified local portrait exists.
- Match Statistics has an expandable official lineup: both clubs' goalkeepers, line units, extra players, coaches, referees and linesmen. The away team's visually reversed units are sorted for reading; starting players/goalkeepers are not inferred from order or colour.
- Season goals, assists, points, appearances, penalty minutes, game-winning/powerplay/shorthanded goals. Where published: plus/minus, shots, shooting percentage and faceoff statistics.
- Goalkeeper appearances, save percentage, GAA, saves, shots against, goals against, shutouts, wins/losses and ice time.
- The selected league, followed teams, saved games and favorite players are retained on the device. Same-named clubs in different competitions have separate favorites.
- Match shots, saves, penalty minutes, powerplay and attendance where reported, including deciding shootout goals in the event feed. Existing team and game favorites remain compatible.
- Team leaderboards and detailed team profiles: powerplay/penalty killing, shots, save/shooting percentage, goals per 60 minutes, penalties, faceoffs and attendance. Per-60-minute values are labeled explicitly and are not confused with per-game figures. Source timestamps and links are available.
- iPhone home-screen installation, safe-area layout and app icons.
- A Prognos tab for games in every cataloged competition: estimated regulation win/draw/loss probabilities, next goal before 60:00 (including no further goal), expected remaining goals and a goal within the next five playing minutes. Live estimates follow confirmed score/clock updates every 30 seconds; missing, stale or unsupported clocks suppress live figures.

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
- `/api/prediction?group=GROUP_ID&date=YYYY-MM-DD&home=HOME_TEAM&away=AWAY_TEAM`
- `/api/lineup?id=GAME_ID`

League IDs: `shl`, `allsvenskan`, `hockeyettan`, `hockeytvaan`, `hockeytrean`, `hockeyfyran`, `sdhl`, `ndhl`, `damtvaan`. Omitting `league` preserves the original Hockeytvåan feed. Group IDs are whitelisted in `lib/hockey.mjs`.

The visible app refreshes scores/events every 30 seconds, standings/team profiles every minute and player statistics every two minutes. Server requests are cached briefly. Player statistics are specific to the selected group, not combined across transfers or competitions. Player favorites show freshly fetched statistics when opened; stored favorite rows omit old season figures.

Clock data is read only from the selected game's scoreboard, never calculated from scheduled faceoff or the latest event. Both club names are verified before merging a match report into the schedule or detail view. Periods without a supported time remain visible with an unavailable-time message. Ambiguous clocks and explicit countdown formats do not produce elapsed time. An explicitly ended regulation period establishes its 20-minute boundary; a generic intermission does not establish which period ended. Overtime length and intermission restart times are not guessed. Shootouts have no running game time. Finished matches clear the live clock. Source timestamps older than five minutes, missing timestamps and failed refreshes show a last-reported state, without a current-play indicator. The interface rechecks freshness every 15 seconds and after visibility changes, while source polling stays at 30 seconds.

Form and previous meetings use completed games in the available series schedule. Historical previews exclude games on or after the selected match date. Official rankings and points are read from the source. All match dates use Europe/Stockholm.

Saved games refresh across leagues and dates and remain saved when the upstream game ID changes as reporting starts. On iPhone, open in Safari and choose Share → Add to Home Screen. Push notifications are not included. Update the verified group IDs in `lib/hockey.mjs` for future seasons. Current coverage and expanded stats were verified on 22 October 2026. Tied ranking rows are retained even when Swehockey leaves the rank cell blank; column headings determine player-stat fields, and missing values never become zeroes.

### Portraits and profile history

Portraits and additional profile records come from public official league sites. SHL and SDHL provide squad/player JSON; players are matched by a unique name and club, with a birthdate check before adding career history. HockeyAllsvenskan currently exposes a partial roster in its public server-rendered page; available portraits can be used, but its unavailable pagination API is not bypassed. Regional competitions do not have a comprehensive public portrait feed. Image and historical coverage therefore varies by player. Missing or failed images show a jersey/avatar placeholder, never a fabricated photo. Portraits are loaded directly from allowlisted official CDNs and linked to their source.

The primary 2026/27 stats remain Swehockey's group-specific figures; a second provider's history never overwrites them. Club names are matched using published aliases and explicit club-name normalization. Stats, standings and biography can update at different times upstream; fetch time is labeled separately from source-update time. This app cannot promise zero reporting delay or data that its sources do not publish.

### Career coverage and transfers

The career tab combines historical records returned by verified SHL/SDHL profiles with verified NHL public player profiles. Local profiles can include earlier Swedish clubs and foreign leagues. NHL adds published NHL/AHL/ECHL/OHL/WHL/QMJHL/NCAA/USHL seasons. Other NHL feed league aliases and unknown competition stages are excluded from this import to avoid uncertain joins. This is not a worldwide lifetime database: providers can omit years, leagues, junior seasons and national-team tournaments. Other players have an explicit unavailable-history state. A current-season group total is never silently relabeled as a lifetime total.

Career sums apply only to the displayed records. Regular season, playoffs and unspecified stages retain their own groups; a missing stage is never assumed to be the regular season. Conflicting duplicate records disable the affected summary. GAA is displayed per season and is not summed or averaged across seasons.

Club history lists clubs by season; it does not infer confirmed transfers, loans, dates or intra-season movement order. Broad worldwide careers and confirmed transfer records require an additional provider. The [Elite Prospects API](https://docs.api.eliteprospects.com/) documents career statistics and transfers; its [coverage/history options](https://developer.eliteprospects.com/pricing) require a suitable account, API access and licensed coverage. No Elite Prospects API integration or credentials are included in this repository. Even a wider provider cannot establish records that were never recorded.

The original Sites checkout and temporary research/build artifacts are retained locally but excluded from this GitHub repository. This version uses standard Next.js for Vercel and has no Sites/Cloudflare dependency.

### Additional keyless sources — checked 23 October 2026

NHL player lookup uses the public JSON services `search.d3.nhle.com/api/v1/search/player` and `api-web.nhle.com/v1/player/{id}/landing`. These responded without an API key. They are not a documented, supported developer contract and may change. The app does not add NHL game coverage to the Swedish competition selector; this source supplements player careers only.

Name lookup alone never attaches a career. A fresh Swehockey roster identity must have a birthdate, the landing profile's name and birthdate must both match, and exactly one verified candidate must remain. Missing or ambiguous identities are skipped. Lookup/profile responses are cached for six hours in a bounded in-memory cache; only an opened player is looked up, not every roster. An unavailable secondary provider does not remove the other provider's available data.

For overlapping North-American season/league/stage groups, NHL rows replace the corresponding local-profile rows. Older rows whose phase is unspecified are removed when NHL supplies known phases for that season/league. Published official NHL career totals are labeled specifically as NHL, kept separate for regular season/playoffs, and are not presented as worldwide totals. Fractions are converted to percentages, and goalie saves are derived only when both shots against and goals against are available. The original current Swedish season statistics are never overwritten. For example, Oskar Lindblom's verified NHL profile returned 337 regular-season games and 112 points, draft pick 138 in 2014, and the 2020/21 Bill Masterton Memorial Trophy.

Lineups use Swehockey's public `/Game/LineUps/{id}` page and are fetched only when the panel is opened, then refreshed every minute while visible. Match club names are checked against the selected fixture before rendering. A missing match ID or unpublished lineup is explained. The API route returns source timestamps and a source link.

Other sources researched but not connected: [API-Sports Hockey](https://api-sports.io/sports/hockey) advertises a 100-request/day free plan, which is insufficient for continuous 30-second polling without a different update strategy. Its published Swedish coverage does not list Hockeytvåan/Hockeytrean/Hockeyfyran. [Elite Prospects' Explorer licence](https://developer.eliteprospects.com/legal/terms) limits the free tier to evaluation/internal testing rather than a public production app. No account, key, paid subscription or new environment variable was added.

### Match predictions

`poisson-v1` is the app's own simple statistical model, not an official probability feed. It estimates home/away scoring rates from earlier completed games in the same group, blending team attack/defence with the group mean using eight pseudo-games. Home advantage is estimated from group results and shrunk toward a neutral split. Rates are bounded to 0.05–12 goals per 60-minute game. At least four previous group games and one for each club are required; small team samples are flagged in the interface.

Only dates before the target matchday are used, so current results and future games cannot leak into the pregame estimate. The first three reported period scores exclude extra-time and shootout goals. When complete period splits are absent, unmarked final scores are an approximate fallback; explicitly marked OT/shootout results without splits are excluded. The fallback count is disclosed. A current source schedule is checked to establish the requested match identity.

Independent Poisson distributions over the remaining playing time give regulation home/draw/away probabilities. The finite-horizon next-goal calculation includes no further goal, rather than making the two teams' next-goal chances misleadingly sum to 100%. No synthetic running clock is used: the match scoreboard must publish a supported period/time and a source timestamp no older than five minutes. Timezones use Europe/Stockholm, including DST. Failed detail fetches and mismatched identities also suppress live numbers. The UI checks freshness every 15 seconds and uses the existing 30-second match feed; a five-minute freshness gate is not a claim of instant reporting.

All probabilities apply to **regulation**, not the eventual winner after OT/shootouts. The model has no manpower, empty-net, shot-location, injury or lineup inputs, and expected goal totals are not shot-based xG. Overtime/shootouts are explicitly unsupported. Completed games stop producing live estimates. This model has not been calibrated across the different leagues, so the app does not advertise an accuracy rate.

Run `node scripts/evaluate-predictions.mjs` for a retrospective walk-forward check with currently published schedules. On 22 October 2026, all 36 groups were fetched successfully; 33 had sufficient history for their next game. Hockeytrean Norr C/D/F (21666/21672/21674) did not. Across 672 earlier games with exact regulation outcomes, multiclass Brier score was 0.5847 versus 0.6250 for a symmetric model with the same goal tempo (lower is better). This small early-season retrospective comparison is not live validation or evidence of accuracy in every league. Results can change with source corrections.

The Poisson approach follows standard hockey scoring models; background: [Alan Ryder, Win Probabilities](https://hockeyanalytics.com/Research_files/Win_Probabilities.pdf). Implementation assumptions, shrinkage and exclusions above are this app's choices, not claims made by that paper.
