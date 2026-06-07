---
name: GitHub repo and Firebase security
description: GitHub repo location, API key restriction status, and security notes
type: reference
---

## GitHub repo
https://github.com/caseymhunt/kiln-journal — public repo, `main` branch

Excluded from repo: `.agents/` (restored via `skills-lock.json`), `.claude/settings.local.json`

## Firebase API key
The web API key in `public/js/firebase.js` is intentionally public (by Firebase design). It has been restricted in Google Cloud Console (2026-06-07) to:
- `https://kiln-journal.web.app/*`
- `http://localhost/*`

API restrictions are also set to only allow: Identity Toolkit API, Cloud Firestore API, Firebase Installations API, Token Service API.

**How to apply:** If the app is ever served from a new domain, add it to the key's allowed websites in https://console.cloud.google.com/apis/credentials?project=kiln-journal
