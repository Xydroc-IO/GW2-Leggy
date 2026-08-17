# Google Play — store listing copy

Copy/paste these fields into [Google Play Console](https://play.google.com/console).

**Package name:** `com.gw2leggy.app`  
**Default language:** English (United States) — add locales later if needed

> Contact email: `xydroc@yaplabs.us`. Still set the public privacy policy URL before submitting.

---

## App name (≤ 30 characters)

```text
GW2 Leggy
```

## Short description (≤ 80 characters)

```text
Track GW2 legendaries, stash, instances, and Vault with the official API.
```

(73 characters)

## Full description (≤ 4000 characters)

```text
GW2 Leggy helps you track Guild Wars 2 legendary progress on Android — without a third-party website account.

Browse legendary weapons, armor, back items, trinkets, runes, sigils, and relics with official names and icons. Open a crafting breakdown with checklist progress and Trading Post price estimates. Optionally connect a Guild Wars 2 API key to sync Legendary Armory unlocks, browse your stash (bank, shared inventory, materials, expandable character bags), check instance clears (raids, strikes, fractals, dungeons), and track Wizard’s Vault daily, weekly, and special objectives plus Astral Acclaim.

FEATURES
• Legendary catalog with search, pins, expansion filters, and weapon generation filters
• Crafting trees with on-device checklist progress
• Stash browser for bank tabs, shared slots, materials, and expandable character bags
• Instances tracker for weekly raids/strikes, fractal weeklies, and daily dungeon paths
• Wizard’s Vault tracker
• Works offline for catalog browsing; sync uses ArenaNet’s official API only

API KEY (OPTIONAL)
Create a key at https://account.arena.net/applications
Recommended permissions: account, inventories, characters, wallet, unlocks, progression

Your API key stays on your device and is sent only to https://api.guildwars2.com. GW2 Leggy does not run its own account server and does not include ads or analytics SDKs.

DISCLAIMER
GW2 Leggy is an unofficial fan-made application and is not affiliated with, endorsed by, sponsored by, or associated with NCSoft Corporation or ArenaNet, LLC. Guild Wars 2 and all related trademarks belong to their respective owners.
```

---

## Graphics & screenshots

### In `play-store/`

| Asset | File | Spec |
|-------|------|------|
| High-res icon | `app-icon-512.png` (also `.jpg`) | 512 × 512 |
| Feature graphic | `feature-graphic-1024x500.png` (also `.jpg`, logo variant) | 1024 × 500 |

### In `store-screenshots/` (ready to upload)

| Set | Location | Notes |
|-----|----------|--------|
| Phone | `store-screenshots/01`–`08-*.png` | 1080×1920 — catalog, weapons, crafting, armor, API key, pinned, trinkets, search |
| 7″ tablet | `store-screenshots/tablet-7/` | Same 8 scenes |
| 10″ tablet | `store-screenshots/tablet-10/` | Same 8 scenes |

No extra screenshot capture step is required unless you want fresher UI shots.

---

## Categorization suggestions

| Field | Suggested value |
|-------|-----------------|
| App category | Tools (or Productivity) |
| Tags | tracking, games companion, inventory |
| Store listing contact email | `xydroc@yaplabs.us` |
| Privacy policy URL | `https://YOUR_USER.github.io/GW2-Leggy/privacy-policy.html` (after GitHub Pages) |

---

## Data safety form (Play Console)

Answer based on current app behavior (local key + official GW2 API only; no developer backend).

### Does your app collect or share any of the required user data types?

**Yes** — only in the sense that an optional API key and account-related data from ArenaNet are processed on-device / requested from ArenaNet. Configure carefully:

Recommended approach for this app:

1. **Data collection by developer:** Generally declare that you do **not** collect data on your own servers (there are none).
2. For **optional API key** / account-linked gameplay data:
   - If Play’s questionnaire treats “processed only on device, never leave the device except to ArenaNet which the user authorizes” as collection, declare **App functionality** as the purpose and mark **data is processed ephemerally** / **not shared with other third parties** where accurate.
   - **Encryption in transit:** Yes (HTTPS).
   - **Users can request deletion:** Yes — remove key in app, clear storage, uninstall; revoke at ArenaNet.

### Practical checklist

| Data type | Collected by you? | Shared? | Notes |
|-----------|-------------------|---------|-------|
| Personal info (name, email) | No | No | Account name may display from GW2 API on device only |
| User IDs | No developer ID | — | GW2 API key is a credential stored locally |
| Financial info | No | No | TP prices are public market data |
| Location | No | No | |
| Photos / files | No | No | |
| App activity / analytics | No | No | No analytics SDK |
| Device IDs / advertising ID | No | No | |
| Web browsing | No | No | |

**Third parties:** ArenaNet receives API requests when the user syncs with a key (user-initiated; covered by ArenaNet terms).

**Security practices:** Data encrypted in transit (HTTPS).

**Data deletion:** Provide privacy policy URL; instruct users to clear app data / revoke API keys.

Re-review this section if you later add Firebase, ads, crashlytics, or your own backend.

---

## Content rating

Complete the IARC questionnaire in Play Console. Suggested truthful answers for this app:

- No user-generated public content / chat
- No violence / sexual content created by the app (GW2 item art may depict fantasy weapons/armor)
- Not a gambling app
- Online interactions limited to fetching the user’s own GW2 account data via API

Expect a rating suitable for a game companion / tools app (often Everyone or Teen depending on questionnaire wording about fantasy violence in icons). Follow the questionnaire; do not guess past it.

---

## Target audience & news

- Not a news app
- Target age: 13+ (or as required by GW2 / your region)

---

## Ads

**Contains ads:** No

---

## App access / login

- App provides some features without login
- Optional API key is not a “GW2 Leggy account”; if asked for instructions, link to ArenaNet application keys page and in-app Connect API Key flow

---

## Countries / pricing

- Free
- Distribute wherever you are legally allowed; respect ArenaNet ToS and local law

---

## Pre-launch checklist

- [ ] Privacy policy live on HTTPS (GitHub Pages or other)
- [x] Contact email set (`xydroc@yaplabs.us`)
- [ ] High-res icon + feature graphic uploaded (`play-store/`)
- [ ] ≥2 phone screenshots uploaded (`store-screenshots/`)
- [ ] Short + full description pasted
- [ ] Data safety form completed
- [ ] Content rating questionnaire completed
- [ ] Signed release AAB uploaded (`versionName` 1.0.0 / `versionCode` 1)
- [ ] Unofficial fan-app disclaimer present in listing
- [ ] Package `com.gw2leggy.app` matches the AAB
