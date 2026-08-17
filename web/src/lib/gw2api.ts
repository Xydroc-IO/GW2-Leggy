import type {
  CharacterStash,
  Gw2ItemInfo,
  StashBag,
  StashSlot,
  StashSnapshot,
} from './stashTypes'
import type { VaultBoard, VaultObjective, VaultSnapshot } from './vaultTypes'

const API = 'https://api.guildwars2.com/v2'

/** Standalone GW2 Leggy keys (migrated from older gw2_legendaries_* names). */
export const API_KEY_STORAGE = 'gw2_leggy_api_key'
export const FAVORITES_STORAGE = 'gw2_leggy_favorites'
export const CHECKLIST_STORAGE = 'gw2_leggy_checklist'

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
  const chunk = 200
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk)
    const res = await fetch(`${API}/commerce/prices?ids=${slice.join(',')}`)
    if (!res.ok) continue
    const data = (await res.json()) as {
      id: number
      sells?: { unit_price?: number }
    }[]
    for (const row of data) {
      const price = row.sells?.unit_price
      if (price) out[row.id] = price
    }
  }
  return out
}

/** Structured bank / shared / materials / character bags for the Stash tab */
export async function fetchStashSnapshot(key: string): Promise<StashSnapshot> {
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
    .map((m, index) => ({ id: m.id, count: m.count, index }))

  const characters: CharacterStash[] = []
  const names = charNames ?? []
  const batch = 6
  for (let i = 0; i < names.length; i += batch) {
    const slice = names.slice(i, i + batch)
    const details = await Promise.all(
      slice.map((name) =>
        authGet<{
          name: string
          bags: ({
            id: number
            size: number
            inventory: ApiSlot[]
          } | null)[]
        }>(`/characters/${encodeURIComponent(name)}`, key),
      ),
    )
    for (let j = 0; j < slice.length; j++) {
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
      characters.push({ name: ch?.name ?? slice[j], bags })
    }
  }

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
): Promise<Map<number, Gw2ItemInfo>> {
  const unique = [...new Set(ids.filter(Boolean))]
  const out = new Map<number, Gw2ItemInfo>()
  const chunk = 200
  for (let i = 0; i < unique.length; i += chunk) {
    const slice = unique.slice(i, i + chunk)
    const res = await fetch(`${API}/items?ids=${slice.join(',')}&lang=en`)
    if (!res.ok) continue
    const data = (await res.json()) as {
      id: number
      name: string
      icon?: string
      rarity?: string
      level?: number
      type?: string
    }[]
    for (const row of data) {
      out.set(row.id, {
        id: row.id,
        name: row.name,
        icon: row.icon,
        rarity: row.rarity ?? 'Basic',
        level: row.level,
        type: row.type,
      })
    }
  }
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
