import type {
  CharacterStash,
  Gw2ItemInfo,
  StashBag,
  StashSlot,
  StashSnapshot,
} from './stashTypes'
import type { VaultBoard, VaultObjective, VaultSnapshot } from './vaultTypes'
import type {
  AchievementProgress,
  DungeonPathClear,
  EncounterClear,
  InstancesSnapshot,
  RaidWingClear,
} from './instanceTypes'

const API = 'https://api.guildwars2.com/v2'

/** Standalone GW2 Leggy keys (migrated from older gw2_legendaries_* names). */
export const API_KEY_STORAGE = 'gw2_leggy_api_key'
export const FAVORITES_STORAGE = 'gw2_leggy_favorites'
export const CHECKLIST_STORAGE = 'gw2_leggy_checklist'
const ITEM_CACHE_STORAGE = 'gw2_leggy_item_cache_v1'
const ITEM_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const LEGACY_KEYS: Record<string, string[]> = {
  [API_KEY_STORAGE]: ['gw2_legendaries_user_api_key'],
  [FAVORITES_STORAGE]: ['gw2_legendaries_favorites'],
  [CHECKLIST_STORAGE]: ['gw2_legendaries_manual_checklist'],
}

function migrateKey(current: string) {
  if (localStorage.getItem(current) != null) return
  for (const legacy of LEGACY_KEYS[current] ?? []) {
    const val = localStorage.getItem(legacy)
    if (val != null) {
      localStorage.setItem(current, val)
      return
    }
  }
}

migrateKey(API_KEY_STORAGE)
migrateKey(FAVORITES_STORAGE)
migrateKey(CHECKLIST_STORAGE)

/** Run async work over items with a concurrency limit. */
async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return []
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

type ItemCacheFile = { savedAt: number; items: Record<string, Gw2ItemInfo> }

function readItemCache(): Map<number, Gw2ItemInfo> {
  try {
    const raw = localStorage.getItem(ITEM_CACHE_STORAGE)
    if (!raw) return new Map()
    const parsed = JSON.parse(raw) as ItemCacheFile
    if (!parsed?.items || Date.now() - (parsed.savedAt ?? 0) > ITEM_CACHE_TTL_MS) {
      return new Map()
    }
    const map = new Map<number, Gw2ItemInfo>()
    for (const [k, v] of Object.entries(parsed.items)) {
      const id = Number(k)
      if (id && v?.name) map.set(id, v)
    }
    return map
  } catch {
    return new Map()
  }
}

function writeItemCache(map: Map<number, Gw2ItemInfo>) {
  try {
    const items: Record<string, Gw2ItemInfo> = {}
    for (const [id, info] of map) items[String(id)] = info
    const payload: ItemCacheFile = { savedAt: Date.now(), items }
    localStorage.setItem(ITEM_CACHE_STORAGE, JSON.stringify(payload))
  } catch {
    // Quota exceeded — ignore; sync still works without persistence.
  }
}

/** Instant cache hit for stash icons/names (no network). */
export function getCachedItemDetails(ids: number[]): Map<number, Gw2ItemInfo> {
  const cache = readItemCache()
  const out = new Map<number, Gw2ItemInfo>()
  for (const id of ids) {
    const hit = cache.get(id)
    if (hit) out.set(id, hit)
  }
  return out
}

async function authGet<T>(path: string, key: string): Promise<T | null> {
  const res = await fetch(
    `${API}${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(key)}`,
  )
  if (!res.ok) return null
  return res.json() as Promise<T>
}

function addQty(map: Map<number, number>, id: number, count: number) {
  if (!id || !count) return
  map.set(id, (map.get(id) ?? 0) + count)
}

type ApiSlot = { id: number; count: number } | null

function mapSlots(raw: ApiSlot[] | null | undefined): (StashSlot | null)[] {
  if (!raw) return []
  return raw.map((slot, index) =>
    slot ? { id: slot.id, count: slot.count, index } : null,
  )
}

export async function validateApiKey(key: string) {
  const res = await fetch(`${API}/tokeninfo?access_token=${encodeURIComponent(key)}`)
  if (!res.ok) throw new Error('Invalid GW2 API key or key expired')
  return res.json() as Promise<{ name?: string; permissions?: string[] }>
}

export async function fetchAccountInfo(key: string) {
  const res = await fetch(`${API}/account?access_token=${encodeURIComponent(key)}`)
  if (!res.ok) throw new Error('Failed to fetch account info')
  return res.json() as Promise<{ name: string; world: number }>
}

/** Map of item id → count unlocked in the Legendary Armory */
export async function fetchLegendaryArmory(key: string): Promise<Map<number, number>> {
  const res = await fetch(
    `${API}/account/legendaryarmory?access_token=${encodeURIComponent(key)}`,
  )
  if (!res.ok) return new Map()
  const data = (await res.json()) as { id: number; count: number }[]
  return new Map(data.map((d) => [d.id, d.count]))
}

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function saveFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_STORAGE, JSON.stringify(ids))
}

export function loadApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE)
}

export function saveApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key.trim())
}

export function removeApiKey() {
  localStorage.removeItem(API_KEY_STORAGE)
}

export function loadChecklist(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveChecklist(map: Record<string, boolean>) {
  localStorage.setItem(CHECKLIST_STORAGE, JSON.stringify(map))
}

/** Materials storage + bank + character inventories → item id counts */
export async function fetchAccountItemQuantities(
  key: string,
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  const snap = await fetchStashSnapshot(key)

  for (const slot of snap.bank) if (slot) addQty(map, slot.id, slot.count)
  for (const slot of snap.shared) if (slot) addQty(map, slot.id, slot.count)
  for (const slot of snap.materials) addQty(map, slot.id, slot.count)
  for (const ch of snap.characters) {
    for (const bag of ch.bags) {
      for (const slot of bag.slots) if (slot) addQty(map, slot.id, slot.count)
    }
  }
  return map
}

export async function fetchWalletQuantities(
  key: string,
): Promise<Map<number, number>> {
  const map = new Map<number, number>()
  const wallet = await authGet<{ id: number; value: number }[]>(
    '/account/wallet',
    key,
  )
  if (wallet) {
    for (const row of wallet) map.set(row.id, row.value)
  }
  return map
}

/** Trading Post sell unit prices in copper, keyed by item id */
export async function fetchItemPrices(
  ids: number[],
): Promise<Record<number, number>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const out: Record<number, number> = {}
  const chunks = chunkArray(unique, 200)
  await Promise.all(
    chunks.map(async (slice) => {
      const res = await fetch(`${API}/commerce/prices?ids=${slice.join(',')}`)
      if (!res.ok) return
      const data = (await res.json()) as {
        id: number
        sells?: { unit_price?: number }
      }[]
      for (const row of data) {
        const price = row.sells?.unit_price
        if (price) out[row.id] = price
      }
    }),
  )
  return out
}

/** Structured bank / shared / materials / character bags for the Stash tab */
export async function fetchStashSnapshot(
  key: string,
  opts?: {
    /** Called after bank/shared/materials land, before character bags finish. */
    onPartial?: (snap: StashSnapshot) => void
  },
): Promise<StashSnapshot> {
  const [bankRaw, sharedRaw, matsRaw, charNames] = await Promise.all([
    authGet<ApiSlot[]>('/account/bank', key),
    authGet<ApiSlot[]>('/account/inventory', key),
    authGet<{ id: number; count: number; category?: number }[]>(
      '/account/materials',
      key,
    ),
    authGet<string[]>('/characters', key),
  ])

  const materials: StashSlot[] = (matsRaw ?? [])
    .filter((m) => m.count > 0)
    .map((m, index) => ({
      id: m.id,
      count: m.count,
      index,
      category: m.category,
    }))

  const names = charNames ?? []
  const partial: StashSnapshot = {
    bank: mapSlots(bankRaw),
    shared: mapSlots(sharedRaw),
    materials,
    characters: names.map((name) => ({ name, bags: [] })),
    fetchedAt: Date.now(),
  }
  opts?.onPartial?.(partial)

  const details = await fetchCharacterInventories(key, names)

  const characters: CharacterStash[] = names.map((name, j) => {
    const ch = details[j]
    const bags: StashBag[] = []
    if (ch?.bags) {
      for (const bag of ch.bags) {
        if (!bag) {
          bags.push({ id: null, size: 0, slots: [] })
          continue
        }
        const slots = mapSlots(bag.inventory)
        while (slots.length < bag.size) slots.push(null)
        bags.push({ id: bag.id, size: bag.size, slots })
      }
    }
    return { name: ch?.name ?? name, bags }
  })

  return {
    bank: mapSlots(bankRaw),
    shared: mapSlots(sharedRaw),
    materials,
    characters,
    fetchedAt: Date.now(),
  }
}

export async function fetchItemDetails(
  ids: number[],
  onProgress?: (partial: Map<number, Gw2ItemInfo>) => void,
): Promise<Map<number, Gw2ItemInfo>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const out = new Map<number, Gw2ItemInfo>()
  const cache = readItemCache()
  const missing: number[] = []

  for (const id of unique) {
    const hit = cache.get(id)
    if (hit) out.set(id, hit)
    else missing.push(id)
  }

  if (out.size && onProgress) onProgress(new Map(out))

  if (!missing.length) return out

  const chunks = chunkArray(missing, 200)
  await Promise.all(
    chunks.map(async (slice) => {
      const res = await fetch(`${API}/items?ids=${slice.join(',')}&lang=en`)
      if (!res.ok) return
      const data = (await res.json()) as {
        id: number
        name: string
        icon?: string
        rarity?: string
        level?: number
        type?: string
        description?: string
      }[]
      for (const row of data) {
        const info: Gw2ItemInfo = {
          id: row.id,
          name: row.name,
          icon: row.icon,
          rarity: row.rarity ?? 'Basic',
          level: row.level,
          type: row.type,
          description: row.description,
        }
        out.set(row.id, info)
        cache.set(row.id, info)
      }
      if (onProgress) onProgress(new Map(out))
    }),
  )

  writeItemCache(cache)
  return out
}

export function collectStashItemIds(snap: StashSnapshot): number[] {
  const ids = new Set<number>()
  for (const slot of snap.bank) if (slot) ids.add(slot.id)
  for (const slot of snap.shared) if (slot) ids.add(slot.id)
  for (const slot of snap.materials) ids.add(slot.id)
  for (const ch of snap.characters) {
    for (const bag of ch.bags) {
      for (const slot of bag.slots) if (slot) ids.add(slot.id)
    }
  }
  return [...ids]
}

export type MaterialCategory = {
  id: number
  name: string
  order: number
}

const MAT_CAT_CACHE = 'gw2_leggy_mat_categories_v1'
const MAT_CAT_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Official material-storage tab names (/v2/materials). Cached locally. */
export async function fetchMaterialCategories(): Promise<MaterialCategory[]> {
  try {
    const raw = localStorage.getItem(MAT_CAT_CACHE)
    if (raw) {
      const parsed = JSON.parse(raw) as { savedAt: number; cats: MaterialCategory[] }
      if (
        parsed?.cats?.length &&
        Date.now() - (parsed.savedAt ?? 0) < MAT_CAT_TTL_MS
      ) {
        return parsed.cats
      }
    }
  } catch {
    /* continue */
  }

  const res = await fetch(`${API}/materials?ids=all&lang=en`)
  if (!res.ok) return []
  const data = (await res.json()) as { id: number; name: string; order?: number }[]
  const cats = data
    .map((c) => ({ id: c.id, name: c.name, order: c.order ?? 999 }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  try {
    localStorage.setItem(
      MAT_CAT_CACHE,
      JSON.stringify({ savedAt: Date.now(), cats }),
    )
  } catch {
    /* ignore */
  }
  return cats
}

/** Astral Acclaim wallet currency */
export const ASTRAL_ACCLAIM_ID = 63

type ApiVaultObj = {
  id: number
  title?: string
  track?: string
  acclaim?: number
  progress_current?: number
  progress_complete?: number
  claimed?: boolean
}

type ApiVaultBoard = {
  meta_progress_current?: number
  meta_progress_complete?: number
  meta_reward_astral?: number
  meta_reward_claimed?: boolean
  meta_reward_item_id?: number
  objectives?: ApiVaultObj[]
}

function parseVaultBoard(raw: ApiVaultBoard | null): VaultBoard | null {
  if (!raw) return null
  const objectives: VaultObjective[] = (raw.objectives ?? []).map((o) => ({
    id: o.id,
    title: o.title ?? `Objective ${o.id}`,
    track: o.track ?? '',
    acclaim: o.acclaim ?? 0,
    progressCurrent: o.progress_current ?? 0,
    progressComplete: o.progress_complete ?? 0,
    claimed: Boolean(o.claimed),
  }))
  return {
    metaProgressCurrent: raw.meta_progress_current ?? 0,
    metaProgressComplete: raw.meta_progress_complete ?? 0,
    metaRewardAstral: raw.meta_reward_astral ?? 0,
    metaRewardClaimed: Boolean(raw.meta_reward_claimed),
    metaRewardItemId: raw.meta_reward_item_id,
    objectives,
  }
}

export async function fetchVaultSnapshot(key: string): Promise<VaultSnapshot> {
  const [seasonRes, daily, weekly, special, wallet] = await Promise.all([
    fetch(`${API}/wizardsvault`).then(async (r) =>
      r.ok ? ((await r.json()) as { title?: string; start?: string; end?: string }) : null,
    ),
    authGet<ApiVaultBoard>('/account/wizardsvault/daily', key),
    authGet<ApiVaultBoard>('/account/wizardsvault/weekly', key),
    authGet<ApiVaultBoard>('/account/wizardsvault/special', key),
    authGet<{ id: number; value: number }[]>('/account/wallet', key),
  ])

  // Detect missing progression scope: all account vault calls null while key works for other endpoints
  const scopeFail = daily == null && weekly == null && special == null

  let astral = 0
  if (wallet) {
    astral = wallet.find((c) => c.id === ASTRAL_ACCLAIM_ID)?.value ?? 0
  }

  return {
    season: seasonRes
      ? {
          title: seasonRes.title ?? "Wizard's Vault",
          start: seasonRes.start ?? '',
          end: seasonRes.end ?? '',
        }
      : null,
    daily: parseVaultBoard(daily),
    weekly: parseVaultBoard(weekly),
    special: parseVaultBoard(special),
    astralAcclaim: astral,
    scopeFail,
    fetchedAt: Date.now(),
  }
}

const WEEKLY_FRACTAL_ACHIEVEMENTS = [5453, 5441, 5448, 5452] as const // Initiate → Master
const DAILY_FRACTAL_CATEGORY = 88

/** Shared bit labels for weekly fractal fighters (API bit indices). */
const WEEKLY_FRACTAL_BIT_LABELS = [
  'Aetherblade Fractal',
  'Aquatic Ruins Fractal',
  'Captain Mai Trin Boss Fractal',
  'Chaos Fractal',
  'Cliffside Fractal',
  'Deepstone Fractal',
  'Molten Boss Fractal',
  'Molten Furnace',
  'Nightmare Fractal',
  'Shattered Observatory Fractal',
  "Siren's Reef Fractal",
  'Snowblind Fractal',
  'Solid Ocean Fractal',
  'Sunqua Peak Fractal',
  'Swampland Fractal',
  'Thaumanova Reactor Fractal',
  'Twilight Oasis Fractal',
  'Uncategorized Fractal',
  'Underground Facility Fractal',
  'Urban Battleground Fractal',
  'Volcanic Fractal',
  'Silent Surf Fractal',
] as const

const WEEKLY_FRACTAL_META: Record<
  number,
  { name: string; requirement: string; tiersMax: number }
> = {
  5453: {
    name: 'Initiate Fractal Fighter',
    requirement: 'Complete unique fractals at scales 1–25.',
    tiersMax: 15,
  },
  5441: {
    name: 'Adept Fractal Fighter',
    requirement: 'Complete unique fractals at scales 26–50.',
    tiersMax: 12,
  },
  5448: {
    name: 'Expert Fractal Fighter',
    requirement: 'Complete unique fractals at scales 51–75.',
    tiersMax: 9,
  },
  5452: {
    name: 'Master Fractal Fighter',
    requirement: 'Complete unique fractals at scales 76–100.',
    tiersMax: 6,
  },
}

const SCHEMA_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const RAID_SCHEMA_CACHE = 'gw2_leggy_raid_schema_v1'
const DUNGEON_SCHEMA_CACHE = 'gw2_leggy_dungeon_schema_v1'
const ACCT_ACH_CACHE = 'gw2_leggy_acct_ach_v1'
const ACCT_ACH_TTL_MS = 2 * 60 * 1000

type CharInventory = {
  name: string
  bags: ({
    id: number
    size: number
    inventory: ApiSlot[]
  } | null)[]
}

async function fetchCharacterInventories(
  key: string,
  names: string[],
): Promise<(CharInventory | null)[]> {
  if (!names.length) return []
  // Bulk expand characters (far fewer round-trips than one request per name).
  const chunks = chunkArray(names, 8)
  const byName = new Map<string, CharInventory>()
  await Promise.all(
    chunks.map(async (slice) => {
      const ids = slice.map(encodeURIComponent).join(',')
      const batch = await authGet<CharInventory[]>(`/characters?ids=${ids}`, key)
      if (Array.isArray(batch)) {
        for (const ch of batch) {
          if (ch?.name) byName.set(ch.name, ch)
        }
        return
      }
      // Fallback: parallel singles if bulk fails for this chunk
      await mapPool(slice, 8, async (name) => {
        const ch = await authGet<CharInventory>(
          `/characters/${encodeURIComponent(name)}`,
          key,
        )
        if (ch?.name) byName.set(ch.name, ch)
        else if (ch) byName.set(name, { ...ch, name })
        return null
      })
    }),
  )
  return names.map((n) => byName.get(n) ?? null)
}

const RAID_TITLES: Record<string, string> = {
  forsaken_thicket: 'Forsaken Thicket',
  bastion_of_the_penitent: 'Bastion of the Penitent',
  hall_of_chains: 'Hall of Chains',
  mythwright_gambit: 'Mythwright Gambit',
  the_key_of_ahdashim: 'The Key of Ahdashim',
  mount_balrior: 'Mount Balrior',
  spirit_vale: 'Spirit Vale',
  salvation_pass: 'Salvation Pass',
  stronghold_of_the_faithful: 'Stronghold of the Faithful',
}

/** Former strike missions — now raid encounters. Checked against /account/raids. */
const STRIKE_ENCOUNTERS: { id: string; name: string; group: string }[] = [
  { id: 'shiverpeaks_pass', name: 'Shiverpeaks Pass', group: 'Icebrood Saga' },
  {
    id: 'voice_of_the_fallen_and_claw_of_the_fallen',
    name: 'Voice & Claw of the Fallen',
    group: 'Icebrood Saga',
  },
  { id: 'fraenir_of_jormag', name: 'Fraenir of Jormag', group: 'Icebrood Saga' },
  { id: 'boneskinner', name: 'Boneskinner', group: 'Icebrood Saga' },
  { id: 'whisper_of_jormag', name: 'Whisper of Jormag', group: 'Icebrood Saga' },
  { id: 'forging_steel', name: 'Forging Steel', group: 'Icebrood Saga' },
  { id: 'cold_war', name: 'Cold War', group: 'Icebrood Saga' },
  { id: 'aetherblade_hideout', name: 'Aetherblade Hideout', group: 'End of Dragons' },
  { id: 'xunlai_jade_junkyard', name: 'Xunlai Jade Junkyard', group: 'End of Dragons' },
  { id: 'kaineng_overlook', name: 'Kaineng Overlook', group: 'End of Dragons' },
  { id: 'harvest_temple', name: 'Harvest Temple', group: 'End of Dragons' },
  { id: 'old_lions_court', name: "Old Lion's Court", group: 'Living World' },
  { id: 'cosmic_observatory', name: 'Cosmic Observatory', group: 'Secrets of the Obscure' },
  { id: 'temple_of_febe', name: 'Temple of Febe', group: 'Secrets of the Obscure' },
]

const DUNGEON_TITLES: Record<string, string> = {
  ascalonian_catacombs: "Ascalonian Catacombs",
  caudecus_manor: "Caudecus's Manor",
  twilight_arbor: 'Twilight Arbor',
  sorrows_embrace: "Sorrow's Embrace",
  citadel_of_flame: 'Citadel of Flame',
  honor_of_the_waves: 'Honor of the Waves',
  crucible_of_eternity: 'Crucible of Eternity',
  ruined_city_of_arah: 'The Ruined City of Arah',
}

function titleCaseId(id: string): string {
  return id
    .split('_')
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

function prettyName(id: string, map?: Record<string, string>): string {
  return map?.[id] ?? titleCaseId(id)
}

async function fetchAccountAchievements(
  key: string,
  ids: number[],
): Promise<
  Map<number, { current: number; max: number; done: boolean; bits: number[] }>
> {
  const out = new Map<
    number,
    { current: number; max: number; done: boolean; bits: number[] }
  >()
  if (!ids.length) return out
  const want = new Set(ids)
  const applyRows = (
    rows: {
      id: number
      current?: number
      max?: number
      done?: boolean
      bits?: number[]
    }[],
  ) => {
    for (const row of rows) {
      if (!want.has(row.id)) continue
      out.set(row.id, {
        current: row.current ?? 0,
        max: row.max ?? 0,
        done: Boolean(row.done),
        bits: row.bits ?? [],
      })
    }
  }

  // Prefer short TTL cache (full dump is huge).
  try {
    const raw = localStorage.getItem(ACCT_ACH_CACHE)
    if (raw) {
      const parsed = JSON.parse(raw) as {
        savedAt: number
        rows: {
          id: number
          current?: number
          max?: number
          done?: boolean
          bits?: number[]
        }[]
      }
      if (
        parsed?.rows?.length &&
        Date.now() - (parsed.savedAt ?? 0) < ACCT_ACH_TTL_MS
      ) {
        applyRows(parsed.rows)
        return out
      }
    }
  } catch {
    /* fetch fresh */
  }

  // Try bulk ids first (supported on some GW2 API builds); fall back to full list.
  const idQuery = ids.join(',')
  let rows = await authGet<
    {
      id: number
      current?: number
      max?: number
      done?: boolean
      bits?: number[]
    }[]
  >(`/account/achievements?ids=${idQuery}`, key)

  if (!Array.isArray(rows)) {
    rows = await authGet<
      {
        id: number
        current?: number
        max?: number
        done?: boolean
        bits?: number[]
      }[]
    >('/account/achievements', key)
  }

  // Full dumps are huge — cache for a couple minutes.
  if (rows && rows.length > ids.length + 20) {
    try {
      localStorage.setItem(
        ACCT_ACH_CACHE,
        JSON.stringify({ savedAt: Date.now(), rows }),
      )
    } catch {
      /* ignore quota */
    }
  }

  if (rows) applyRows(rows)
  return out
}

async function fetchCachedJson<T>(
  cacheKey: string,
  url: string,
): Promise<T | null> {
  try {
    const raw = localStorage.getItem(cacheKey)
    if (raw) {
      const parsed = JSON.parse(raw) as { savedAt: number; data: T }
      if (parsed?.data && Date.now() - (parsed.savedAt ?? 0) < SCHEMA_CACHE_TTL_MS) {
        return parsed.data
      }
    }
  } catch {
    /* fetch */
  }
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as T
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    /* ignore */
  }
  return data
}

async function fetchAchievementMeta(
  ids: number[],
): Promise<
  Map<
    number,
    { name: string; requirement?: string; tiersMax?: number; bitLabels: string[] }
  >
> {
  const out = new Map<
    number,
    { name: string; requirement?: string; tiersMax?: number; bitLabels: string[] }
  >()
  // Seed weekly fighters so UI stays clickable even if meta fetch fails.
  for (const id of WEEKLY_FRACTAL_ACHIEVEMENTS) {
    const seed = WEEKLY_FRACTAL_META[id]
    if (seed) {
      out.set(id, {
        name: seed.name,
        requirement: seed.requirement,
        tiersMax: seed.tiersMax,
        bitLabels: [...WEEKLY_FRACTAL_BIT_LABELS],
      })
    }
  }

  const chunks = chunkArray([...new Set(ids)], 50)
  await Promise.all(
    chunks.map(async (slice) => {
      const res = await fetch(`${API}/achievements?ids=${slice.join(',')}&lang=en`)
      if (!res.ok) return
      const data = (await res.json()) as {
        id: number
        name: string
        requirement?: string
        tiers?: { count: number }[]
        bits?: { type?: string; text?: string }[]
      }[]
      for (const a of data) {
        const tiersMax = a.tiers?.length
          ? Math.max(...a.tiers.map((t) => t.count))
          : undefined
        const fromApi = (a.bits ?? [])
          .map((b) => (b.text ?? '').trim())
          .filter(Boolean)
        const seeded = WEEKLY_FRACTAL_META[a.id]
        const bitLabels =
          fromApi.length > 0
            ? fromApi
            : seeded
              ? [...WEEKLY_FRACTAL_BIT_LABELS]
              : []
        out.set(a.id, {
          name: a.name,
          requirement: a.requirement ?? seeded?.requirement,
          tiersMax: tiersMax ?? seeded?.tiersMax,
          bitLabels,
        })
      }
    }),
  )
  return out
}

export async function fetchInstancesSnapshot(
  key: string,
  opts?: { onPartial?: (snap: InstancesSnapshot) => void },
): Promise<InstancesSnapshot> {
  type RaidSchema = {
    id: string
    wings: {
      id: string
      events: { id: string; type: string }[]
    }[]
  }[]
  type DungeonSchema = {
    id: string
    paths: { id: string; type: string }[]
  }[]

  const [clearedRaw, raidsRaw, dungeonsSchema, clearedDungeons, fractalCat] =
    await Promise.all([
      authGet<string[]>('/account/raids', key),
      fetchCachedJson<RaidSchema>(RAID_SCHEMA_CACHE, `${API}/raids?ids=all`).then(
        (d) => d ?? [],
      ),
      fetchCachedJson<DungeonSchema>(
        DUNGEON_SCHEMA_CACHE,
        `${API}/dungeons?ids=all`,
      ).then((d) => d ?? []),
      authGet<string[]>('/account/dungeons', key),
      // Today's daily fractals live here — ArenaNet rotates the ID list daily.
      // /achievements/daily is permanently inactive (Wizard's Vault era).
      fetch(`${API}/achievements/categories/${DAILY_FRACTAL_CATEGORY}`).then(async (r) =>
        r.ok ? ((await r.json()) as { achievements?: number[] }) : null,
      ),
    ])

  const scopeFail = clearedRaw == null
  const clearedSet = new Set(clearedRaw ?? [])
  const clearedDungeonSet = new Set(clearedDungeons ?? [])

  const raidEncounterIds = new Set<string>()
  const raids: RaidWingClear[] = []
  for (const raid of raidsRaw) {
    for (const wing of raid.wings ?? []) {
      const encounters: EncounterClear[] = (wing.events ?? []).map((e) => {
        raidEncounterIds.add(e.id)
        return {
          id: e.id,
          name: prettyName(e.id),
          kind: e.type === 'Checkpoint' ? 'checkpoint' : 'boss',
          cleared: clearedSet.has(e.id),
        }
      })
      const bosses = encounters.filter((e) => e.kind === 'boss')
      raids.push({
        id: wing.id,
        name: prettyName(wing.id, RAID_TITLES),
        raidId: raid.id,
        raidName: prettyName(raid.id, RAID_TITLES),
        encounters,
        clearedBosses: bosses.filter((b) => b.cleared).length,
        totalBosses: bosses.length,
      })
    }
  }

  const strikes: EncounterClear[] = STRIKE_ENCOUNTERS.map((s) => ({
    id: s.id,
    name: s.name,
    kind: 'strike' as const,
    cleared: clearedSet.has(s.id),
  }))

  for (const id of clearedSet) {
    if (raidEncounterIds.has(id)) continue
    if (STRIKE_ENCOUNTERS.some((s) => s.id === id)) continue
    strikes.push({
      id,
      name: prettyName(id),
      kind: 'strike',
      cleared: true,
    })
  }

  const dungeons: DungeonPathClear[] = []
  for (const dg of dungeonsSchema) {
    for (const path of dg.paths ?? []) {
      if (path.type === 'Story') continue
      dungeons.push({
        dungeonId: dg.id,
        dungeonName: prettyName(dg.id, DUNGEON_TITLES),
        pathId: path.id,
        pathName: prettyName(path.id),
        cleared: clearedDungeonSet.has(path.id),
      })
    }
  }

  const fractalDailyIds = [...(fractalCat?.achievements ?? [])]
  const fractalWeeklyIds = [...WEEKLY_FRACTAL_ACHIEVEMENTS]

  // Instant weekly shells (clickable) while account achievement progress loads.
  const weeklyShells: AchievementProgress[] = fractalWeeklyIds.map((id) => {
    const seed = WEEKLY_FRACTAL_META[id]
    return {
      id,
      name: seed?.name ?? `Achievement ${id}`,
      current: 0,
      max: seed?.tiersMax ?? 1,
      done: false,
      detail: seed?.requirement,
      bits: WEEKLY_FRACTAL_BIT_LABELS.map((label, index) => ({
        index,
        label,
        done: false,
      })),
    }
  })

  opts?.onPartial?.({
    raids,
    strikes,
    fractalDaily: fractalDailyIds.map((id) => ({
      id,
      name: `Daily fractal ${id}`,
      current: 0,
      max: 1,
      done: false,
    })),
    fractalWeekly: weeklyShells,
    dungeons,
    clearedEncounterIds: [...clearedSet],
    scopeFail,
    fetchedAt: Date.now(),
  })

  const progressIds = [...fractalWeeklyIds, ...fractalDailyIds]
  const [acctProg, meta] = await Promise.all([
    fetchAccountAchievements(key, progressIds),
    fetchAchievementMeta(progressIds),
  ])

  const toProgress = (id: number): AchievementProgress => {
    const m = meta.get(id)
    const p = acctProg.get(id)
    const seed = WEEKLY_FRACTAL_META[id]
    const max = p?.max || m?.tiersMax || seed?.tiersMax || 1
    const current = p?.done ? max : p?.current ?? 0
    const done = Boolean(p?.done) || current >= max
    const labels =
      (m?.bitLabels?.length ? m.bitLabels : null) ??
      (seed ? [...WEEKLY_FRACTAL_BIT_LABELS] : [])
    const doneBits = done ? new Set(labels.map((_, i) => i)) : new Set(p?.bits ?? [])
    const bits =
      labels.length > 0
        ? labels.map((label, index) => ({
            index,
            label,
            done: doneBits.has(index),
          }))
        : undefined
    return {
      id,
      name: m?.name ?? seed?.name ?? `Achievement ${id}`,
      current,
      max,
      done,
      detail: m?.requirement ?? seed?.requirement,
      bits,
    }
  }

  return {
    raids,
    strikes,
    fractalDaily: fractalDailyIds.map(toProgress).sort((a, b) => a.name.localeCompare(b.name)),
    fractalWeekly: fractalWeeklyIds.map(toProgress),
    dungeons,
    clearedEncounterIds: [...clearedSet],
    scopeFail,
    fetchedAt: Date.now(),
  }
}

