# Development

## Prerequisites

- Node.js **18+** and npm
- JDK **17** (`JAVA_HOME`)
- Android SDK (`ANDROID_HOME` / `ANDROID_SDK_ROOT`)
- Optional: Android Studio for emulator / Play App Signing

## Install

```bash
# From repository root
npm install
cd web && npm install && cd ..
```

## Web UI (browser)

```bash
cd web
npm run dev
```

Vite serves the React app. Hard-refresh if you still see an old “0 / 78” style UI (stale cache).

## Build for Android

```bash
# From repository root — builds web → ../dist, then Capacitor sync
npm run sync

# Debug APK (sideload / testing only)
cd android && ./gradlew assembleDebug
```

Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

See also [FIND-THE-APK.md](../FIND-THE-APK.md).

## Release APK / AAB (Play Store)

Signing uses `keystore/keystore.properties` (gitignored) pointing at `keystore/gw2-leggy-release.keystore`.  
Copy `keystore/keystore.properties.example` if you need to recreate local config. **Back up the keystore and passwords** — losing them blocks Play updates signed with this upload key.

```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export ANDROID_HOME=/home/xydroc/Android/Sdk

# Web + sync + assembleRelease + bundleRelease
npm run build:release

# Optional convenience copies (gitignored)
cp -f android/app/build/outputs/apk/release/app-release.apk GW2-Leggy.apk
cp -f android/app/build/outputs/bundle/release/app-release.aab GW2-Leggy.aab
```

Outputs:

```text
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
```

Convenience copies may also live at the repo root and under `play-store/`.

Upload the `.aab` in Play Console.

**Application ID:** `com.gw2leggy.app`  
**App name:** GW2 Leggy

Keep `versionCode` / `versionName` in `android/app/build.gradle` in sync with releases (and `package.json` version when bumping).

## UI rebuild reminder

After changing anything under `web/`:

```bash
cd web && npm run build   # writes to ../dist
cd .. && npx cap sync android
```

## Catalog notes

- Legendaries: `web/src/data/legendaries.json` (~99 trackable entries).
- Prefer official GW2 API names / render icons; do not reintroduce the old mismatched 78-item catalog.

## GitHub

This repo is meant to live on GitHub. If git is not initialized yet:

```bash
git init
git add .
git status   # confirm no secrets / APKs / node_modules
git commit -m "Initial commit: GW2 Leggy Android app"
```

Create an empty GitHub repository, then:

```bash
gh auth login
gh repo create GW2-Leggy --private --source=. --remote=origin --push
# or --public if you prefer
```

Without `gh`:

```bash
git remote add origin https://github.com/YOUR_USER/GW2-Leggy.git
git branch -M main
git push -u origin main
```

### Host privacy policy (required by Play)

Enable **GitHub Pages** from the `main` branch `/docs` folder, or copy `docs/privacy-policy.html` to any HTTPS host.

Example URL shape after Pages is on:

```text
https://YOUR_USER.github.io/GW2-Leggy/privacy-policy.html
```

Paste that URL into Play Console → App content → Privacy policy.

## Useful scripts (root `package.json`)

| Script | What it does |
|--------|----------------|
| `npm run build:web` | Build Vite app into `dist/` |
| `npm run sync` | Build web + `cap sync android` |
| `npm run build:apk` | Sync + `assembleRelease` |
| `npm run build:aab` | Sync + `bundleRelease` (Play upload) |
| `npm run build:release` | Sync + release APK + AAB |
| `npm run build:debug` | Sync + `assembleDebug` (sideload testing) |
| `npm run open:android` | Open project in Android Studio |
