# Kiln Journal

A mobile-first PWA for tracking ceramic firings. Built for a single studio around one specific kiln — an L&L Plug-n-Fire PF8 with a Genesis Mini controller. Tracks firings, glazes, and clay; learns your kiln's behavior over time via a witness-cone → offset-suggestion feedback loop.

**Live app:** https://kiln-journal.web.app

---

## Stack

- Vanilla JS ES modules — no framework, no build step
- Firebase JS SDK v8 (compat mode, bundled locally in `public/`)
- Firestore for per-user data; Firebase Hosting for static assets
- Firebase Auth (Google sign-in)
- CSS custom properties; Fraunces serif + Inter Tight sans

---

## Project structure

```
public/
  index.html            app shell
  css/                  tokens, base reset, app styles (single file each)
  js/
    app.js              auth bootstrap, screen registration
    router.js           screen registry + flow stack
    state.js            tiny pub/sub store
    data.js             KILN catalog, ARMADILLO_CLAYS, formatters, suggestOffset()
    firebase.js         Firebase init
    screens/            today, log, library, settings
    flows/              new-firing (8-step wizard), live, witness, outcome
    detail/             glaze, firing, clay
  img/clays/            34 clay product images (~4MB)
  sw.js                 service worker
.claude/
  settings.json         pre-authorized tool permissions
  memory/               project context for Claude (see below)
```

---

## Local development

There is no build step. Open `public/index.html` via a local server — file:// won't work because ES modules require HTTP.

```bash
# Any static server works, e.g.:
npx serve public
# or
python3 -m http.server 8080 --directory public
```

The app connects to the live Firestore database on load. There is no local emulator setup — changes made during local dev write to production Firestore.

---

## Deploying

Requires Firebase CLI and an account with access to the `kiln-journal` Firebase project.

```bash
firebase login          # first time only
firebase deploy --only hosting
```

Deploys everything in `public/` to https://kiln-journal.web.app.

---

## Firebase project

- **Project ID:** `kiln-journal`
- **Auth:** Google sign-in only
- **Firestore:** per-user collections under `users/{uid}/`
  - `users/{uid}` — profile doc (offset, units, kiln settings, hidden clays)
  - `users/{uid}/firings` — firing records
  - `users/{uid}/glazes` — user's glaze library
- **Clay catalog:** baked into `data.js` as `ARMADILLO_CLAYS` — not in Firestore

---

## For Claude

Read `CLAUDE.md` first — it describes how to work in this project. Then read `.claude/memory/MEMORY.md`, which indexes four memory files covering the full app picture, all settled architectural decisions, collaboration preferences, and the clay supplier reference.

Key things to know before touching anything:
- `.claude/memory/project_decisions.md` — settled architecture; don't re-open without new constraints
- `firebase deploy --only hosting` is pre-authorized; run it after every meaningful change
- iOS Safari has two known quirks addressed in the code (WebChannel fix in `firebase.js`, double-tap debounce on all stepper buttons) — don't remove them
