# How to find the output APK / AAB

## Debug (sideload testing)

```bash
npm run build:debug
```

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Release (Play Store)

```bash
npm run build:release
```

```text
android/app/build/outputs/apk/release/app-release.apk
android/app/build/outputs/bundle/release/app-release.aab
```

Convenience copies (gitignored) may also appear at the repo root or under `play-store/` as `GW2-Leggy-1.0.0.*`.

Upload the **`.aab`** in Play Console. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
