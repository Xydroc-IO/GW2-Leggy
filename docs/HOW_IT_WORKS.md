# How GW2 Leggy works

GW2 Leggy is a **standalone** companion: the UI runs in an Android WebView (Capacitor) and talks only to ArenaNet’s official API when you choose to sync.

## Main tabs

| Tab | Without API key | With API key |
|-----|-----------------|--------------|
| **Legendaries** | Full catalog (~99), search, filters, pins, crafting trees + TP prices | Armory unlock counts, “Unlocked” filter, stash-aware mat quantities in craft trees |
| **Stash** | Prompt to connect | Bank tabs, shared inventory, material storage, character bags |
| **Inst** | Prompt to connect | Weekly raid/strike clears, fractal weeklies (dailies when ArenaNet allows), daily dungeon paths |
| **Vault** | Prompt to connect | Wizard’s Vault daily / weekly / special + Astral Acclaim |

Bottom nav switches tabs. Header **Connect API Key** opens the key sheet from anywhere.

## Legendaries tab

1. **Stats row** — Catalog size, Armory unlocked / total (after sync), pinned count.
2. **Category tabs** — All · Weapons · Armor · Back · Trinkets · Runes & Relics (counts on each tab).
3. **Search** — Name / type match (e.g. Bolt, Aurene, Obsidian).
4. **Expansion chips** — Core → HoT → PoF → EoD → SOTO → JW → VoE (toggle on/off).
5. **Weapon gen chips** — Gen 1 / 2 / 3, Underwater, Standalone (when viewing All or Weapons).
6. **Pinned / Unlocked** — Pinned uses local favorites; Unlocked needs Armory data from a key.
7. **Sort** — A–Z and other sort modes in the toolbar.
8. **List rows** — Icon, name, type · expansion · gen, pin star, expansion badge, **View Crafting Breakdown**.

Tap a row for a detail sheet (pieces / unlock status when synced). Use **View Crafting Breakdown** for the recipe tree.

### Crafting breakdown

- Nested recipe components with checkboxes (saved on device).
- Progress bar from checked items + inventory quantities when stash is synced.
- Filter chips inside the sheet (Precursor, Gift, Clovers, T6, Currency, Map / WvW, etc.).
- Trading Post unit estimates where prices are available from the public commerce API.
- No key required to browse trees; key improves quantity / unlock context.

## API key sync

1. Tap **Connect API Key**.
2. Paste a key from [account.arena.net/applications](https://account.arena.net/applications).
3. Recommended permissions: `account`, `inventories`, `characters`, `wallet`, `unlocks`, `progression`.
4. On save, the app validates the key, loads account name, Legendary Armory, stash, instances, and vault.

**Storage:** `localStorage` key `gw2_leggy_api_key` (plus favorites / checklist keys).  
**Network:** HTTPS to `https://api.guildwars2.com` only. Remove the key in-app or clear app data anytime; revoke keys on ArenaNet’s site.

## Stash tab

After sync: browse bank, shared slots, materials, and each character’s bags with official item icons/names. **Tap any item** for a detail sheet (name, rarity, type, quantity, wiki). Empty bank slots are hidden by default for a cleaner grid — toggle **Empty hidden / Showing empty** to see slot positions. Bank tabs scroll horizontally. Materials support category chips and sort (category / name / qty / rarity). Refresh reloads from the API; stash quantities also feed crafting counts.

### Character inventories

- Characters start collapsed; tap a row to **Expand** / **Minimize**.
- Inside an open character, tap each **bag** to show or hide its slots.
- **Expand all** / **Collapse all** for every character at once.
- Jump chips scroll to a character and open it if needed.

## Instances tab

After sync (needs `progression`):

- **Fractals** — weekly Initiate/Adept/Expert/Master fighters; daily scales when `/achievements/daily` is active
- **Raids** — each wing/encounter cleared this week (`/account/raids`)
- **Strikes** — former strike missions checked against the same weekly clear list
- **Dungeons** — explorable path clears since daily reset

## Vault tab

After sync: Wizard’s Vault boards (daily / weekly / special) and Astral Acclaim from wallet. Refresh reloads objectives.

## What stays local vs remote

| Data | Where |
|------|--------|
| API key, pins, craft checkboxes | On device only |
| Catalog / recipes JSON | Shipped in the app |
| Armory, stash, instances, vault, TP prices, item icons | Fetched from ArenaNet when online |

There is **no GW2 Leggy backend**.

## Catalog snapshot (current)

- **99** trackable legendaries in `web/src/data/legendaries.json`
- Weapons 56 · Armor 27 · Back 4 · Trinkets 9 · Runes & Relics 3

## Visual tour (store screenshots)

Phone captures live under `store-screenshots/`:

| File | Screen |
|------|--------|
| `01-legendaries-catalog.png` | Main catalog |
| `02-weapons-gen1.png` | Weapons + Gen 1 filter |
| `03-crafting-breakdown.png` | Bolt crafting tree |
| `04-armor-catalog.png` | Armor category |
| `05-api-key-connect.png` | API key sheet |
| `06-pinned.png` | Pinned filter |
| `07-trinkets.png` | Trinkets |
| `08-search-aurene.png` | Search |

Tablet variants: `store-screenshots/tablet-7/`, `store-screenshots/tablet-10/`.
