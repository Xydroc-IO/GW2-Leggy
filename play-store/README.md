# Play Store assets

Graphics and screenshots for Google Play Console.

## Graphics (this folder)

| File | Use |
|------|-----|
| `app-icon-512.png` | High-res icon (preferred) |
| `app-icon-512.jpg` | JPEG fallback |
| `feature-graphic-1024x500.png` | Feature graphic |
| `feature-graphic-1024x500.jpg` | JPEG fallback |
| `feature-graphic-1024x500-logo.png` | Alternate feature graphic |

## Screenshots (ready)

Phone (1080×1920) and tablets live in **`../store-screenshots/`**:

| Path | Use |
|------|-----|
| `store-screenshots/*.png` | Phone — 8 shots (catalog, craft, API, filters, search, …) |
| `store-screenshots/tablet-7/` | 7″ tablet |
| `store-screenshots/tablet-10/` | 10″ tablet |

Upload at least 2 phone screenshots; tablets optional but prepared.

## Listing text

See [STORE_LISTING.md](STORE_LISTING.md). Contact: **xydroc@yaplabs.us**.

## Still needed for submission

1. **Public privacy policy URL** — host `../docs/privacy-policy.html` (e.g. GitHub Pages).
2. Upload icon, feature graphic, screenshots, and signed **AAB** in Play Console.

Release builds (gitignored): `GW2-Leggy-1.0.0.aab` / `.apk` may exist here locally after `npm run build:release`.

Source art: `../branding/`.
