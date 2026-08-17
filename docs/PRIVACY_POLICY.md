# Privacy Policy — GW2 Leggy

**Last updated:** August 16, 2026  
**Application:** GW2 Leggy (`com.gw2leggy.app`)

This Privacy Policy describes how the GW2 Leggy mobile application (“the App”) handles information.

GW2 Leggy is an **unofficial fan-made** application and is **not** affiliated with, endorsed by, or sponsored by NCSoft Corporation or ArenaNet, LLC.

## Summary

- We do **not** operate user accounts for GW2 Leggy.
- We do **not** collect analytics, advertising IDs, or crash reports through third-party SDKs in the App.
- Your Guild Wars 2 API key (if you choose to enter one) is stored **on your device** and is sent **only** to ArenaNet’s official API at `https://api.guildwars2.com`.
- Favorites and crafting checklist progress are stored **on your device**.

## Information the App uses

### Information you provide

- **Guild Wars 2 API key (optional).** If you paste an API key, it is saved in the app’s local storage on your device. The key is used only to request your account-related data from the official Guild Wars 2 API (for example Legendary Armory unlocks, bank/stash, characters, wallet, Wizard’s Vault progress).

### Information stored on device

- API key (if saved)
- Favorite / pinned legendary IDs
- Manual crafting checklist state
- Cached UI state as needed for normal operation

This data remains on your device unless you clear the app’s storage or uninstall the App.

### Information obtained from ArenaNet

When you use an API key, the App requests data from `https://api.guildwars2.com` using your key. That response data (account display name, inventories, unlocks, vault objectives, item metadata, Trading Post prices, etc.) is processed on your device to power the App’s features. The App does not upload that data to GW2 Leggy servers — **there are no GW2 Leggy backend servers**.

### Automatically collected technical data

The App requires network access (`INTERNET`) to call the Guild Wars 2 API and load item icons. Your device and network provider may process standard connection metadata (IP address, TLS handshake, etc.) as part of normal HTTPS traffic to ArenaNet and content delivery for icons. The App developer does not receive that traffic.

## How information is used

- To display legendary progress, stash, vault, and related features you request
- To validate your API key against the official API
- To remember your preferences on the device

## Sharing of information

- **ArenaNet / Guild Wars 2 API:** Your API key and API requests are sent to ArenaNet’s services when you sync or load authenticated features. Their handling of API usage is governed by ArenaNet’s own terms and policies.
- **No sale of personal data.** We do not sell your information.
- **No advertising partners.** The App does not include ad networks.
- **No analytics vendors.** The App does not include third-party analytics SDKs.

## Data retention

Data stored by the App remains on your device until you remove it (disconnect/clear the API key in-app, clear app storage, or uninstall). The App developer does not retain your API key or account data on remote servers.

## Children’s privacy

The App is not directed at children under 13 (or the minimum age required in your country). Do not provide an API key if you are not permitted to use Guild Wars 2 / ArenaNet services under applicable terms.

## Security

API keys are stored in the WebView’s local storage on your device. Protect your device with a lock screen and treat your ArenaNet API key like a password. You can revoke keys at any time at [account.arena.net/applications](https://account.arena.net/applications).

## Your choices

- Use the App without an API key (browse catalog / crafting trees only)
- Remove the saved API key from the App’s API key screen
- Clear app storage or uninstall to remove local data
- Revoke the key on ArenaNet’s site

## Third-party services

The App interacts with:

- **Guild Wars 2 API** — `https://api.guildwars2.com`
- **ArenaNet / Guild Wars 2** item icon / render URLs as returned by the API

Those services are operated by ArenaNet / NCSoft, not by GW2 Leggy.

## Changes to this policy

We may update this Privacy Policy when the App’s data practices change. The “Last updated” date at the top will be revised. Continued use of the App after changes constitutes acceptance of the updated policy where permitted by law.

## Contact

Questions about this Privacy Policy or the App:

- **Email:** [xydroc@yaplabs.us](mailto:xydroc@yaplabs.us)
- **GitHub Issues:** Use the project repository’s Issues tab once published

## Google Play Data safety (short)

| Topic | Answer |
|-------|--------|
| Collects personal info? | No collection by the developer; optional API key stays on device |
| Shares data with third parties? | API requests go to ArenaNet only when you use a key |
| Encrypted in transit? | Yes (HTTPS to the GW2 API) |
| Users can request deletion? | Delete key / clear app data / uninstall; revoke key at ArenaNet |

See [play-store/STORE_LISTING.md](../play-store/STORE_LISTING.md) for the full Data safety form answers.
