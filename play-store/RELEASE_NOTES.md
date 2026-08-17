# GW2 Leggy — Release notes

**Version:** 1.0.0 (`versionCode` 1) · **Package:** `com.gw2leggy.app`

---

## Google Play — “What’s new” (≤ 500 characters)

Copy into Play Console → Production (or testing track) → Release notes:

```text
• New Inst tab: weekly raids/strikes, daily + weekly fractals, dungeon paths
• Tap weekly fractal fighters to see remaining unique fractals
• Faster API sync — UI updates while stash/instances finish loading
• Stash: expandable characters & bags, item details, materials sort
• Crafting: fixed gift icons, full nested T6 materials, Expand/Collapse all
• Bottom nav: Leggys · Stash · Inst · Vault
```

(Character count: check in Play Console; trim the last bullet if over limit.)

---

## Full release notes (1.0.0)

### Instances (Inst)
- Track weekly raid and strike clears, daily dungeon paths, and fractals
- Daily fractals from ArenaNet category 88 (updates with the daily rotation)
- Tap Initiate / Adept / Expert / Master fighters to see which unique fractals you still need

### Sync & Stash
- Sync completes the account/armory header quickly; stash, instances, and vault load in the background
- Bank and materials appear before character bags finish
- Expand/collapse characters and individual bags; jump chips to open a character
- Tap items for name, rarity, quantity, and wiki; materials sorting and category chips

### Crafting (Leggys)
- Correct item IDs and icons for T6 gifts (Blood, Claws, etc.)
- Nested trees show materials under gifts (vials, claws, dust, …)
- Trees expand by default; Expand all / Collapse all
- Icon fallback via the official items API if a CDN URL fails

### Navigation
- Bottom tab renamed **Legs** → **Leggys**

### Privacy
- Still no ads or analytics SDKs; API key stays on-device and is sent only to `api.guildwars2.com`
