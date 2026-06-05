# StoreNext Mundial 2026 — Product Spec

A complete description of the app, so it can be rebuilt on any stack (and a paste-ready prompt for AI app builders like Lovable / Base44 at the end).

---

## 1. What it is
An **internal company PWA** for StoreNext employees to predict FIFA World Cup 2026 match results and compete — individually **and** between departments. Hebrew, **right-to-left**, mobile-first, installable.

## 2. Users & roles
- **Player** — signs up (company email or Google), picks a **department**, predicts scores, sees standings.
- **Admin** (`yakovs@`, `dors@storenext.co.il`) — manages matches/scores, departments, players, scoring, theme, polls, access.
- Access is gated to the company email domain (`storenext.co.il`).

## 3. Tech stack (current)
React 18 + TypeScript + Vite · Firebase (Auth, Firestore, Hosting) · PWA (service worker, installable). Live score sync via a scheduled job (GitHub Actions). No paid tier required.

## 4. Design system ("Glass & Depth")
- **Dark + light themes** with a ☀/☾ toggle (persists, follows OS).
- **Frosted-glass cards** floating over soft red/violet (dark) or amber/rose (light) ambient glows.
- **Brand**: primary red `#e11d48`, accent amber `#f59e0b`, deep-plum surfaces `#1a1320`. Logo = a 3D cube (red chevron + plum facets).
- Fonts: **Heebo** (body, Hebrew) + **Bebas Neue** (display numbers).
- **Fun layer**: confetti on a correct result; live "points-in-flight" badge; national-colour ring around your backed team; 🔥 streak + level badge.
- Everything RTL; flags are real images (flagcdn) with emoji fallback.

## 5. Data model (entities)
- **users**: uid, displayName, email, photoURL, **department**, totalPoints, predictionsCount, joinedAt.
- **matches**: id, homeTeam{name,code,flag}, awayTeam{…}, kickoff, stage (GROUP/R32/R16/QF/SF/TP/F), group (A–L), status (SCHEDULED/LIVE/FINISHED/POSTPONED), homeScore, awayScore, manualLock, scored, lastUpdated.
- **predictions**: id (`uid_matchId`), uid, matchId, homeScore, awayScore, points, **joker** (×2). Editable only before kickoff.
- **bonusPredictions**: uid, championTeamCode, topScorer (+ computed points).
- **appConfig/main**: scoring, bonus points, theme, navIcons, polls, playerPhotos, customPlayers, hiddenScorers, **departments[]**, adminEmails[], allowedEmailDomains[].
- **matches/{id}/chat**: live match-room messages/reactions.
- **stats/goldenBoot**, **stats/hallOfFame**: computed by the sync job.

## 6. Scoring
- Exact score = **5**, correct winner + goal difference = **3**, correct winner (incl. draw) = **1**, wrong = 0 (all admin-configurable).
- **Joker**: one prediction per matchday can be flagged ×2.
- **Bonus**: tournament champion = 20, top scorer = 15.
- Auto-computed when a match is set FINISHED; updates the user's total.

## 7. Screens
1. **Login / Register** — email+password & Google; register picks a department.
2. **Matches** (home) — live-connection status; "next match" countdown hero; matches grouped by date as glass cards with score inputs, save, Joker toggle, gradient ring, live points-in-flight, a 💬 link to the match room, confetti on finished wins. Active polls.
3. **Teams & Flags** — 48 nations in 12 groups with **live standings** (P/GD/Pts, top-2 highlighted); link to the bracket; read-only **Golden Boot race**.
4. **Bracket** ("Road to the Final") — knockout rounds, fills in green/red as results land.
5. **Bonus** — pick champion + top scorer (the latter via glass player cards with faces-in-cube).
6. **Leaderboard** — **Personal** (with 👑 crown on #1) and **Departments** (summed points per department) toggle + **Hall of Fame & Shame** (auto superlatives).
7. **My Predictions** — history + points chart.
8. **Profile** — avatar, department selector, streak/level, notifications toggle, rules, admin link.
9. **Match Room** (`/match/:id`) — emoji reactions + chat, predictions revealed at kickoff.
10. **Admin panel** — tabs: Matches (import official schedule, manual score/lock), Departments (list + assign users), Scoring, Theme (live colour edit), Polls, Nav icons, Players (photos, hide/restore), Access (admins + domains).

## 8. Live data
- Official 104-match WC 2026 schedule from **football-data.org**, imported once.
- A scheduled job polls every few minutes during matches → updates status/scores → auto-scores predictions → recomputes Golden Boot + Hall of Fame. Admins can manually override any score (which locks that match from auto-sync).

## 9. Notifications (planned)
Web push: kickoff reminders for un-predicted games, "you scored", and rank/crown changes.

---

## 10. Paste-ready prompt for Lovable / Base44

> Build an internal company **PWA** (mobile-first, installable, **Hebrew, right-to-left**) for employees to **predict FIFA World Cup 2026 results** and compete personally and between departments.
>
> **Auth**: email/password + Google sign-in, restricted to a company email domain. On signup the user picks their **department** from an admin-managed list.
>
> **Core loop**: show the 104-match WC2026 schedule grouped by date. Each match is a card where the user enters a predicted score before kickoff. Scoring: exact score = 5 pts, correct winner + goal-difference = 3, correct winner = 1, wrong = 0. Auto-score when results come in. Each matchday a user may flag ONE prediction as a "Joker" worth ×2. Bonus picks: tournament champion (20 pts) and top scorer (15 pts).
>
> **Screens**: Matches (home, with a live "next match" countdown and live score updates), Teams & Flags (48 teams in 12 groups with live group standings), a knockout Bracket that fills in as results land, a Leaderboard with two tabs — **Personal** (crown on #1) and **Departments** (total points per department) — plus a fun auto-awarded "Hall of Fame & Shame", a Bonus screen, a personal Profile (with streak + level), and a live **match chat room** per game (emoji reactions + messages, everyone's predictions revealed at kickoff).
>
> **Admin panel** for: entering/overriding match scores, managing the department list and assigning users, editing scoring values, theme colours, polls, and the top-scorer player list (with photos).
>
> **Design**: a premium "glass & depth" look — frosted translucent cards over soft coloured glows, **dark and light themes with a toggle**, brand colours red `#e11d48` + amber `#f59e0b` on deep plum `#1a1320`, fonts Heebo + Bebas Neue, real country flags, and playful touches (confetti on a correct result, a national-colour ring on your picked team, streak flames, a 👑 crown for the leader). Clean, professional, impressive — not generic.
>
> **Live data**: pull the official WC2026 fixtures + live scores from football-data.org (competition "WC") on a schedule, and recompute standings + a Golden Boot scorer race automatically.
>
> Everything in **Hebrew / RTL**.
