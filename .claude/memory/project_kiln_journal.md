---
name: Kiln Journal overview
description: Full picture of the kiln-journal app — screens, flows, stack, and intent — for a cold-start context
type: project
---

## What it is
Kiln Journal is a personal, mobile-first PWA (max-width 430px) for a single ceramic studio. It tracks firings, glazes, and clay. Built around one specific kiln — an L&L Plug-n-Fire PF8 with a Genesis Mini controller — so kiln programs, cones, and segments are hardcoded. The core value prop is a witness-cone-reading → offset-suggestion feedback loop that teaches the app how the kiln actually behaves over time.

Deployed at: **https://kiln-journal.web.app** (Firebase Hosting)  
Firebase project: `kiln-journal`  
Auth: Firebase Google sign-in  
Database: Firestore (per-user collections under `users/{uid}/`)

## Stack
- Vanilla JS ES modules (no framework, no build step)
- Firebase JS SDK v8 (compat mode, loaded via CDN in index.html)
- CSS custom properties, Fraunces serif display font + Inter Tight sans
- Cream/terracotta palette (`--bg`, `--terra`, `--raised`, `--rule`, `--soft`, `--mute`)

## File map
```
public/
  index.html          — app shell: boot screen, auth screen, 4-tab nav, FAB, flow root layer
  sw.js               — service worker (caching)
  css/app.css         — all styles (single file)
  js/
    app.js            — bootstraps auth, loads profile + active firing, registers screens
    router.js         — screen registry (goTo) + flow stack (pushFlow/replaceFlow/closeFlow)
    state.js          — tiny pub/sub store (getState/setState/subscribe)
    data.js           — KILN catalog, ARMADILLO_CLAYS, WITNESS_OPTIONS, DEFAULT_PREFLIGHT,
                        Firestore path helpers (userDoc/userCol), time/temp formatters,
                        suggestOffset()
    firebase.js       — Firebase init; experimentalAutoDetectLongPolling: true set here
    screens/
      today.js        — home tab: active firing card or empty state
      log.js          — log tab: list of past firings
      library.js      — library tab: Glazes + Clay tabs
      settings.js     — settings tab: profile, kiln info, offset sheet, temp/time toggles, pre-flight
    flows/
      new-firing.js   — 8-step new firing wizard
      live.js         — live firing view (ring progress, segment list, abort)
      witness.js      — witness cone reading screen (5 options with SVG icons)
      outcome.js      — post-firing outcome recording
    detail/
      glaze.js        — glaze detail / add-glaze sheet
      firing.js       — past firing detail view
      clay.js         — clay detail sheet (hero image, desc, stats grid)
  img/
    clays/            — 34 clay product images, ~4MB total, served from Firebase Hosting
```

## Screens
**Today** — Shows active firing card (tapping opens Live flow) or empty state with hint to start a firing.

**Log** — Scrollable list of completed firings. Tapping a row opens the firing detail sheet.

**Library** — Two tabs:
- *Glazes*: user's glazes from `users/{uid}/glazes`. + Add opens add-glaze sheet.
- *Clay*: Armadillo Clay catalog (34 clays, baked into `data.js` as `ARMADILLO_CLAYS`), grouped by firing range (Low / Mid / High). Tapping a clay row (non-manage mode) opens the clay detail sheet (`detail/clay.js`). Manage mode lets user hide clays; hidden IDs stored in `profile.hiddenClayIds`. Attribution link to armadilloclay.com appears above sections.

**Settings** — Sections:
- Profile card (name, email, sign out)
- Kiln (Model + Volume: static display only, no edit)
- Default Offset: pencil-icon row, opens a bottom sheet with ±1 fine steppers + relative-increment row (−10, −5, Reset, +5, +10). No cap. Saves to `profile.offsetF`.
- Units: Temperature (°F/°C segmented pill) and Time (12h/24h segmented pill). Each persists immediately to `profile.tempUnit` / `profile.timeFormat`.
- Pre-flight checklist: toggles for each default item, stored in `profile.preflightOn`.

## Flows (full-screen overlays, managed by router flowStack)
**New Firing (8 steps):**
1. Firing type — Bisque or Glaze two-card picker
2. Load — library-connected piece picker (clay for bisque, glazes for glaze)
3. Cone — library-suggested; pre-selects highest-frequency cone from load
4. Speed — Fast / Medium / MedSlo / Slow (Genesis Mini controller labels)
5. Kiln timers — Preheat + Hold at Peak (free hh:mm entries with quick-pick chips)
6. Calibration — offset ±1 steppers + relative increments; suggests offset from last 5 firings
7. Pre-flight — checklist confirmation
8. Confirm — summary, then starts firing (writes to `users/{uid}/firings`)

**Live** — Real-time view of active firing. Reads from Firestore `onSnapshot`. Shows ring progress, time remaining, ETA, segment list. Abort and "Wrap up" buttons. When status → "done" or "cooling", auto-transitions to Witness flow.

**Witness** — 5 cone state options with SVG illustrations. User selects which describes their witness cone. Options: soft, tipped, leaning, touched, melted. Each maps to a `deltaF` adjustment to the offset. Confirmed → Outcome flow.

**Outcome** — Records the final firing outcome (notes, glaze results, etc.).

## Data model highlights
- `users/{uid}` (profile doc): `displayName`, `email`, `kilnId`, `firingCount`, `offsetF`, `tempUnit`, `timeFormat`, `preflightOn`, `hiddenClayIds`
- `users/{uid}/firings/{id}`: firing records with `firingType` ('bisque'|'glaze'), `programId`, `cone`, `offsetF`, `preheatMins`, `holdMins`, `pieces`, `witnessRead`, `outcome`, `notes`, `status`
- `users/{uid}/glazes/{id}`: user's glazes
- Clays: NOT in Firestore — baked into `data.js`

## Offset logic
Positive offsetF = kiln runs cool (we add heat to compensate).  
Negative offsetF = kiln runs hot (we pull heat back).  
`suggestOffset()` in `data.js` reads the last 5 firings with witness reads and computes a weighted average of `offsetF + deltaF` from each (weight = 0.7^i, most-recent = i=0).

## Temp/time formatting
`fmtTemp()`, `fmtTime()`, `etaStr()`, `openAtStr()` in `data.js` all read `getState().profile` at call time — no prop drilling. Settings changes take effect on next render.

## Known patterns / gotchas
- Flow root (`#flow-root`) is managed by `router.js` — `pushFlow/replaceFlow/closeFlow` wipe `innerHTML` and re-render. Async step functions should be treated carefully since the element may be wiped between await and render.
- iOS Safari: `db.settings({ experimentalAutoDetectLongPolling: true })` is set before `enablePersistence()` to prevent WebChannel stalls. All small interactive buttons also get `touch-action: manipulation` CSS + 200 ms debounce to prevent double-tap double-fire.
- Developermode warp: on the live firing screen, if any piece group description contains "developermode" (case-insensitive), a `⚡ warp` button appears that calls `completeFiring()` directly — for end-to-end testing without waiting for real timers.
- Any flow that writes to a firing document after `closeFlow()` returns user to Today must dispatch `window.dispatchEvent(new CustomEvent('kilnFiringUpdated'))` so Today re-fetches.

## Pending / in-flight (as of 2026-05-08)
- **Consider removing pre-flight step** from new-firing flow (currently step 7 of 8). User flagged as candidate for removal.
- **Custom glaze firing schedules** (up-down / specialty). Some glazes (e.g. Amaco Cosmos) require multi-segment schedules with deliberate temperature drops. Needs: optional `schedule` field on glaze records, branch in new-firing flow, live view + ETA math for arbitrary segments. Non-trivial scope, deferred.
