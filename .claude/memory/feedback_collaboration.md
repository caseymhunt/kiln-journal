---
name: Collaboration preferences
description: Standing deployment authorization, decision durability, and UI/UX patterns confirmed by the user
type: feedback
---

**Firebase deploys are pre-authorized.** Run `firebase deploy --only hosting` freely after any code change — no need to ask. For publishing anywhere else (npm, GitHub Pages, third-party services, app stores), ask first.

**Why:** User explicitly granted standing deploy authorization on 2026-05-07 after a context clear cost the prior session's momentum.

**How to apply:** After every meaningful change, just deploy. Don't ask.

---

**Don't re-litigate settled decisions.** Read `project_decisions.md` before proposing alternatives to anything already decided. Only revisit a listed decision if a new constraint surfaces that wasn't considered when the decision was made — and surface that constraint explicitly before proceeding.

**Why:** User asked for decision durability on 2026-05-07 so sessions don't restart the same conversations.

**How to apply:** Check `project_decisions.md` first. If it's listed, it's closed.

---

**Witness cone labels are final.** The five cone-state labels ("Standing straight", "Starting to tip", "Halfway down", "Tip to pad", "Melted flat") have been researched against Orton, Digitalfire, L&L, Skutt, and Pottery Wheel sources. Do not suggest alternatives unless presenting new primary source evidence.

**Why:** User confirmed on 2026-05-07 that labels were previously web-researched and are considered settled.

**How to apply:** Never suggest renaming these in passing. If you have a specific new citation, surface it explicitly and let the user decide.

---

**Larger witness cone illustrations are preferred.** The user prefers bigger SVG icons for the witness cone selection cards because — without photographic reference images — the drawn illustrations need to be large enough to clearly distinguish the five states.

**Why:** User stated this preference on 2026-05-07 when asked about icon size.

**How to apply:** Current implementation is `width="44" height="56"` SVG in a 48px wide container. Don't shrink these. If icons are ever revisited, default toward larger not smaller.

---

**Witness cone SVG icons must use `currentColor`.** The SVG `stroke` and `fill` attributes use `currentColor` so they respect the card's text color. CSS: `.witness-card .witness-icon { color: var(--terra) }` (unselected) and `.witness-card.selected .witness-icon { color: #fff }` (selected). Do not hardcode hex colors.

**Why:** Hardcoded color made the triangle disappear when the card was selected. Fixed 2026-05-07.

**How to apply:** Any SVG placed inside `.witness-icon` (or similar colored-background cards) should use `currentColor`, not hardcoded hex.

---

**Mobile button double-tap fix: always apply both layers.** Any small interactive button (especially ±stepper and increment buttons) needs:
1. CSS: `touch-action: manipulation; user-select: none`
2. JS: a `_lastTap` timestamp guard (`if (Date.now() - _lastTap < 200) return; _lastTap = Date.now();`) wrapping the mutation

**Why:** iOS Safari synthesizes two click events from a fast tap when `touch-action` is not set to `manipulation`. Confirmed reproducible on offset controls in 2026-05-07 session.

**How to apply:** Whenever adding a new button that mutates state in response to rapid taps (steppers, toggles, quantity controls), apply both layers.

---

**Relative increment buttons over literal presets.** For controls where the user makes incremental adjustments (like the firing offset), use relative-delta buttons (−10, −5, Reset, +5, +10) that add/subtract from the current value, not buttons that snap to fixed literal values.

**Why:** User confirmed on 2026-05-07 that the typical use case is fine-tuning between firings — jumping to a prescribed value is rarely needed.

**How to apply:** If a similar incremental-adjustment control is needed elsewhere, default to relative deltas.
