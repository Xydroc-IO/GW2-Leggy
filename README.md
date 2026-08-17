# GW2 Leggy

Unofficial Android app for tracking Guild Wars 2 legendary weapons, armor, backs, trinkets, runes, sigils, and relics — plus **Stash**, **Instances**, and **Wizard's Vault**, using only the official GW2 API.

**Package:** `com.gw2leggy.app` · **Version:** 1.0.0 (`versionCode` 1) · **Contact:** xydroc@yaplabs.us

## Disclaimer

**GW2 Leggy is an unofficial fan-made application and is not affiliated with, endorsed by, sponsored by, or associated with NCSoft Corporation or ArenaNet, LLC.** Guild Wars 2 and all related names, trademarks, logos, and other intellectual property belong to their respective owners.

## How it works

See **[docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md)** for a full walkthrough of the tabs, filters, crafting, and API sync.

Short version:

1. **Leggys** — browse ~99 catalog entries; search, pin, filter by expansion / gen; open full nested crafting trees with checklists + TP estimates.
2. **Connect API Key** (optional) — sync Legendary Armory, stash, instances, and Wizard’s Vault.
3. **Stash** — bank, shared inventory, materials, expandable character bags.
4. **Inst** — weekly raids/strikes, daily fractals, tap weekly fighters for remaining unique fractals, daily dungeon paths.
5. **Vault** — daily / weekly / special objectives + Astral Acclaim.

API key stays on-device (`gw2_leggy_api_key`) and is sent only to `https://api.guildwars2.com`.

### Recommended API permissions

`account`, `inventories`, `characters`, `wallet`, `unlocks`, `progression`  
Create keys at [account.arena.net/applications](https://account.arena.net/applications).

## Quick start

```bash
npm install
cd web && npm install && cd ..
cd web && npm run dev          # browser UI
npm run build:release          # signed release APK + AAB (needs keystore)
```

Requirements: Node 18+, JDK 17, Android SDK, and `keystore/keystore.properties` for release builds.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) | App tour — tabs, filters, sync |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Build, sync, release, GitHub Pages |
| [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md) | Privacy policy (markdown) |
| [docs/privacy-policy.html](docs/privacy-policy.html) | Hostable privacy page for Play |
| [play-store/STORE_LISTING.md](play-store/STORE_LISTING.md) | Google Play listing + Data safety |
| [play-store/README.md](play-store/README.md) | Store graphics + screenshots |
| [FIND-THE-APK.md](FIND-THE-APK.md) | Where build outputs land |

## Google Play

- Listing copy + Data safety: `play-store/STORE_LISTING.md`
- Release APK / AAB (gitignored): `play-store/GW2-Leggy-1.0.0.{apk,aab}` after `npm run build:release`
- Privacy contact: **xydroc@yaplabs.us**

## Project layout

```text
web/                 React + Vite source
dist/                Built web UI (Capacitor webDir; generated)
android/             Native Android / Gradle
play-store/          Play Console assets + listing copy
store-screenshots/   Phone / tablet Play screenshots
docs/                How-it-works, privacy, development
branding/            Source logo / icon art
keystore/            Local signing only (secrets gitignored)
```

## Privacy

No GW2 Leggy servers, ads, or analytics SDKs. Keys and checklists stay on device. Full policy: [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md).
