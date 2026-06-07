---
name: Architectural decisions log
description: Settled architectural choices for kiln-journal — read before proposing alternatives
type: project
---
Running list of architectural decisions. Add new entries as we settle questions.

- **Armadillo clay catalog is baked into `data.js` as the `ARMADILLO_CLAYS` constant** (not a Firestore `/clays` collection). Same intent as the original "global, canonical, shared" decision but no Firestore security rules or seed step needed. Per-user clay additions, if/when added, would still go to `users/{uid}/clays`. Decided 2026-05-07; revised same day after surfacing the rules/seed constraint.
- **Clay schema is minimal:** `id`, `name`, `maker`, `range` (`low`/`mid`/`high`), `cones[]`, `desc`, `shrinkage`, `absorption`, `coe`, `img`. No texture, color, grog, or notes fields yet. Decided 2026-05-07.
- **Library Clay tab renders the baked catalog grouped by firing range** (replaces "coming soon"), with a Manage mode that toggles per-clay visibility. Decided 2026-05-07.
- **Per-user clay visibility is `hiddenClayIds: []` on the user profile doc.** Tapping a clay in Manage mode toggles its presence in that array. Decided 2026-05-07.
- **Offset is always displayed in °F regardless of `tempUnit` preference.** Cone temps and segment temps respect `tempUnit` (F/C); offset stays in °F because it's a calibration value that mirrors what's read on/typed into the kiln controller. Decided 2026-05-07.
- **`tempUnit` and `timeFormat` are read at call time inside `data.js` formatters** (`fmtTemp`, `fmtTime`, `etaStr`, `openAtStr`) via `getState().profile`. No prop drilling; settings changes take effect on the next render of any screen. Decided 2026-05-07.
- **Settings rows for Model and Volume are static (no chevron, no handler).** The kiln catalog is hardcoded for the studio's PF8 — making them editable would mean designing multi-kiln support, which is out of scope. Decided 2026-05-07.
- **Settings affordances:** Offset row shows a pencil icon (opens a sheet). Temperature and Time rows use segmented pill controls (tap to toggle inline, no sheet). Decided 2026-05-07.
- **Offset description text is kiln-centric:** positive offset → "Kiln runs cool"; negative → "Kiln runs hot"; zero → "Kiln runs on target". This wording appears in `settings.js:descFor()` and two places in `flows/new-firing.js`. Decided 2026-05-07.
- **Offset controls UX:** ±1 fine-tune steppers flank the value display; a row of five relative-increment buttons (−10, −5, Reset, +5, +10) sits below. Buttons adjust by the labelled delta — they do NOT set a literal value. Reset sets offset to 0. No hard cap on offset value. Decided 2026-05-07.
- **iOS Safari double-tap prevention:** All small interactive buttons (esp. offset steppers and increments) get `touch-action: manipulation; user-select: none` in CSS, plus a 200 ms timestamp debounce guard (`_lastTap`) in the JS handler. Decided 2026-05-07.
- **Firestore WebChannel / iOS Safari fix:** `db.settings({ experimentalAutoDetectLongPolling: true })` is set in `public/js/firebase.js` before `enablePersistence()`. Decided 2026-05-07.
- **Witness cone labels are considered researched and final.** Labels: "Standing straight", "Starting to tip", "Halfway down", "Tip to pad", "Melted flat". Researched against Orton, Digitalfire, L&L, Skutt, Pottery Wheel. Do not re-open without new primary source evidence. Decided 2026-05-07.
- **Witness cone SVG icons: single rotated triangle.** `coneIcon()` in `flows/witness.js` draws one narrow triangle rotated around its base. Angles: soft=12°, tipped=32°, leaning=60°, touched=90°. Melted is a flat ellipse. ViewBox `0 0 44 56`, rendered `width="44" height="56"`. Uses `currentColor` for stroke/fill. Decided 2026-05-07.
- **No real-photo cone reference images exist for use.** Orton, Digitalfire, Skutt, L&L, and Armadillo Clay were all checked — none offer freely-licensed five-stage cone-bending photos. Drawn SVG illustrations are the permanent approach. Decided 2026-05-07.
- **Armadillo attribution:** A small italic link ("Clay catalog from armadilloclay.com →") appears inside `.material-list` in the Library Clay tab, above the clay sections. Decided 2026-05-07.
- **Clay detail data is baked into `data.js`, images served from Firebase Hosting.** `ARMADILLO_CLAYS` entries carry `desc`, `shrinkage`, `absorption`, `coe`, `img` fields. Images are in `public/img/clays/` (~4MB, 34 files). No Firebase Storage used. Data was harvested once via `scrape-clays.js`. Decided 2026-05-07.
- **Clay detail sheet is a `pushFlow` overlay** (`detail/clay.js`), consistent with glaze and firing detail patterns. Decided 2026-05-07.
- **Firing detail has a single "Edit outcome" button** (not Re-run + Edit notes). It opens `openOutcomeEdit()` — a full re-entrant wrap-up sheet covering witness cone, outcome, and notes. `editConeIcon()` is duplicated locally in `outcome.js` to avoid a circular import with `witness.js`. Decided 2026-05-07.
- **"Unrecorded" is a display-only state** (not a stored `outcome` value). A firing is unrecorded when `f.outcome` is null and status is not active/cooling/aborted. Badge: `.badge-unrecorded` (dashed border, muted text). The Issues filter in the log includes unrecorded firings. Decided 2026-05-07.
- **Re-run button removed from firing detail.** No use case justifies keeping it. Decided 2026-05-07.
- **Firing # is user-editable in Settings.** A "Firing #" row in the Kiln section (pencil icon) opens a sheet to set `firingCount` directly. Handles season resets and counter mismatches. Decided 2026-05-07.
- **Genesis Mini controller has 4 speeds, not 6 programs.** Fast / Medium / MedSlo / Slow — no Bisque vs Glaze program split. `KILN.programs` has 4 speed entries. Old 6-program IDs still resolve in `getProgramName()` for backward compat. Decided 2026-05-07.
- **Speed descriptions are from the Genesis manual verbatim.** Use these as UI copy source of truth. Decided 2026-05-07.
- **Preheat and Hold at Peak are free hh:mm entries** (0:00–24:00). Stored as `preheatMins` / `holdMins` (integer minutes, default 0) on firing documents. Decided 2026-05-07.
- **Developermode warp is the testing mechanism; test-quick is gone.** Add any piece group with description "developermode" in the new firing flow to expose a `⚡ warp` button on the live screen. Decided 2026-05-08.
- **Glaze list uses `onSnapshot`, not `.get()`**, in `library.js`. Decided 2026-05-08.
- **Today screen uses `kilnFiringUpdated` custom event to re-render after outcome save.** Any flow that writes to a firing document and then `closeFlow()`s back to Today must dispatch this event. Decided 2026-05-08.
- **Glaze delete lives in the detail sheet**, guarded by `confirm()`. Decided 2026-05-08.
- **`firingType` is an explicit field on firing documents** (`'bisque'` or `'glaze'`). Log filter checks `f.firingType` first, falls back to cone inference for historical records. Decided 2026-05-08.
- **New-firing flow is 8 steps:** 1=Firing type, 2=Load, 3=Cone, 4=Speed, 5=Kiln timers, 6=Calibration, 7=Pre-flight, 8=Confirm. Load before Cone so library selections drive cone suggestion. Decided 2026-05-08.
- **Cone step shows KILN's 4 standard cones always; extra cones expand on demand.** KILN.cones = {06, 04, 6, 10}. Extra cones (Δ5, Δ9, Δ11, Δ12) defined in `EXTRA_CONES` in new-firing.js, hidden under an expand link. Decided 2026-05-08.
- **`suggestOffset()` formula: `weighted_avg(offsetF_i + witnessRead.deltaF_i)`, most-recent-first (weight = 0.7^i).** Uses stored `witnessRead.deltaF` directly. Decided 2026-05-08.

**Why:** User asked for architectural choices to be recorded so they aren't re-litigated across context clears.

**How to apply:** Read this before proposing changes that touch architecture or data shape. Only re-open a listed decision if a new constraint surfaces that wasn't considered when it was made — and surface that constraint to the user explicitly.
