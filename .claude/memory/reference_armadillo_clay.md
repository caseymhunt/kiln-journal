---
name: Armadillo Clay supplier
description: The studio's clay supplier — source of the clay catalog baked into data.js
type: reference
---
Armadillo Clay (https://www.armadilloclay.com) is the studio's local clay supplier in Austin, TX.

The clay catalog is **baked into `data.js` as `ARMADILLO_CLAYS`** — it is NOT in Firestore. This was an explicit architectural decision: a global Firestore `/clays` collection was considered and rejected because it requires security rules and a seed step. The constant in `data.js` is simpler and sufficient for a single-studio app.

Source pages used to build the catalog:
- Low-fire (cone 04–06): https://www.armadilloclay.com/low-fire-04-06.html
- Mid-fire (cone 5–6): https://www.armadilloclay.com/mid-fire-5-6.html
- High-fire (cone 9–12): https://www.armadilloclay.com/high-fire-9-12.html

**How to apply:** If the catalog needs refreshing (new products, discontinued lines), re-fetch those three pages and update `ARMADILLO_CLAYS` in `data.js`. Do NOT create a Firestore `/clays` collection — that decision is closed. Per-user clay additions (if ever added) would go to `users/{uid}/clays`.
