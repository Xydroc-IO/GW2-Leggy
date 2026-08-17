import { useEffect, useMemo, useState } from 'react'
import catalog from './data/legendaries.json'
import recipesById from './data/recipes.json'
import CraftingBreakdown from './CraftingBreakdown'
import StashView from './StashView'
import VaultView from './VaultView'
import InstancesView from './InstancesView'
import type { Category, Legendary, RecipeComponent, SortMode } from './lib/types'
import type { Gw2ItemInfo, MainTab, StashSnapshot } from './lib/stashTypes'
import type { VaultSnapshot } from './lib/vaultTypes'
import type { InstancesSnapshot } from './lib/instanceTypes'
import {
  applyOwnership,
  cloneRecipe,
  collectItemIds,
  recipeProgress,
} from './lib/craft'
import {
  collectStashItemIds,
  fetchAccountInfo,
  fetchItemDetails,
  fetchItemPrices,
  fetchLegendaryArmory,
  fetchStashSnapshot,
  fetchVaultSnapshot,
  fetchInstancesSnapshot,
  fetchWalletQuantities,
  getCachedItemDetails,
  loadApiKey,
  loadChecklist,
  loadFavorites,
  removeApiKey,
  saveApiKey,
  saveChecklist,
  saveFavorites,
  validateApiKey,
} from './lib/gw2api'
import {
  categoryLabel,
  expansionOrder,
  isFullyUnlocked,
  progressPct,
  subCategoryLabel,
  unlockedCount,
} from './lib/progress'

const ALL = catalog as Legendary[]
const RECIPES = recipesById as Record<string, RecipeComponent[]>

function quantitiesFromStash(snap: StashSnapshot): Map<number, number> {
  const map = new Map<number, number>()
  const add = (id: number, count: number) => {
    if (!id || !count) return
    map.set(id, (map.get(id) ?? 0) + count)
  }
  for (const slot of snap.bank) if (slot) add(slot.id, slot.count)
  for (const slot of snap.shared) if (slot) add(slot.id, slot.count)
  for (const slot of snap.materials) add(slot.id, slot.count)
  for (const ch of snap.characters) {
    for (const bag of ch.bags) {
      for (const slot of bag.slots) if (slot) add(slot.id, slot.count)
    }
  }
  return map
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'back', label: 'Back' },
  { id: 'trinkets', label: 'Trinkets' },
  { id: 'runes_sigils_relics', label: 'Runes & Relics' },
]

const EXPANSIONS = ['Core', 'HoT', 'PoF', 'EoD', 'SOTO', 'JW', 'VoE'] as const
const WEAPON_GENS = [
  { id: 'gen1', label: 'Gen 1' },
  { id: 'gen2', label: 'Gen 2' },
  { id: 'gen3', label: 'Gen 3' },
  { id: 'underwater', label: 'Underwater' },
  { id: 'standalone', label: 'Standalone' },
] as const

export default function App() {
  const [mainTab, setMainTab] = useState<MainTab>('legendaries')
  const [category, setCategory] = useState<Category>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('name')
  const [pinnedOnly, setPinnedOnly] = useState(false)
  const [unlockedOnly, setUnlockedOnly] = useState(false)
  const [expansion, setExpansion] = useState<string | null>(null)
  const [weaponGen, setWeaponGen] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites())
  const [selected, setSelected] = useState<Legendary | null>(null)
  const [craftItem, setCraftItem] = useState<Legendary | null>(null)
  const [apiOpen, setApiOpen] = useState(false)
  const [apiKey, setApiKey] = useState(() => loadApiKey() ?? '')
  const [accountName, setAccountName] = useState<string | null>(null)
  const [armory, setArmory] = useState<Map<number, number> | null>(null)
  const [itemQty, setItemQty] = useState<Map<number, number>>(new Map())
  const [walletQty, setWalletQty] = useState<Map<number, number>>(new Map())
  const [tpPrices, setTpPrices] = useState<Record<number, number>>({})
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() =>
    loadChecklist(),
  )
  const [stash, setStash] = useState<StashSnapshot | null>(null)
  const [stashItems, setStashItems] = useState<Map<number, Gw2ItemInfo>>(new Map())
  const [stashLoading, setStashLoading] = useState(false)
  const [stashError, setStashError] = useState<string | null>(null)
  const [vault, setVault] = useState<VaultSnapshot | null>(null)
  const [vaultLoading, setVaultLoading] = useState(false)
  const [vaultError, setVaultError] = useState<string | null>(null)
  const [instances, setInstances] = useState<InstancesSnapshot | null>(null)
  const [instancesLoading, setInstancesLoading] = useState(false)
  const [instancesError, setInstancesError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  useEffect(() => {
    saveChecklist(checklist)
  }, [checklist])

  useEffect(() => {
    const key = loadApiKey()
    if (key) void syncAccount(key)
    const ids = new Set<number>()
    for (const recipe of Object.values(RECIPES)) collectItemIds(recipe, ids)
    void fetchItemPrices([...ids]).then(setTpPrices)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStash(key: string, opts?: { awaitDetails?: boolean }) {
    setStashLoading(true)
    setStashError(null)
    try {
      const snap = await fetchStashSnapshot(key, {
        onPartial: (partial) => {
          setStash(partial)
          setItemQty(quantitiesFromStash(partial))
          setStashLoading(false)
          const ids = collectStashItemIds(partial)
          const cached = getCachedItemDetails(ids)
          if (cached.size) setStashItems(cached)
        },
      })
      setStash(snap)
      setItemQty(quantitiesFromStash(snap))

      const ids = collectStashItemIds(snap)
      const cached = getCachedItemDetails(ids)
      if (cached.size) setStashItems((prev) => {
        const next = new Map(prev)
        for (const [id, info] of cached) next.set(id, info)
        return next
      })

      setStashLoading(false)

      const detailsPromise = fetchItemDetails(ids, (partial) => {
        setStashItems(new Map(partial))
      })
        .then((details) => {
          setStashItems(details)
          return details
        })
        .catch(() => {
          // Keep any cached icons/names; stash snapshot already loaded.
        })

      if (opts?.awaitDetails) await detailsPromise
      else void detailsPromise
    } catch (err) {
      setStashError(err instanceof Error ? err.message : 'Failed to load stash')
      setStashLoading(false)
    }
  }

  async function loadVault(key: string) {
    setVaultLoading(true)
    setVaultError(null)
    try {
      const snap = await fetchVaultSnapshot(key)
      setVault(snap)
      if (snap.astralAcclaim >= 0) {
        setWalletQty((prev) => {
          const next = new Map(prev)
          next.set(63, snap.astralAcclaim)
          return next
        })
      }
    } catch (err) {
      setVaultError(err instanceof Error ? err.message : 'Failed to load vault')
    } finally {
      setVaultLoading(false)
    }
  }

  async function loadInstances(key: string) {
    setInstancesLoading(true)
    setInstancesError(null)
    try {
      const snap = await fetchInstancesSnapshot(key, {
        onPartial: (partial) => {
          setInstances(partial)
          setInstancesLoading(false)
        },
      })
      setInstances(snap)
    } catch (err) {
      setInstancesError(err instanceof Error ? err.message : 'Failed to load instances')
    } finally {
      setInstancesLoading(false)
    }
  }

  async function syncAccount(key: string) {
    setSyncing(true)
    setApiError(null)
    try {
      await validateApiKey(key)
      // Kick off heavy tabs immediately; don't block the sync spinner on them.
      const stashPromise = loadStash(key)
      const vaultPromise = loadVault(key)
      const instancesPromise = loadInstances(key)
      const [account, map, wallet] = await Promise.all([
        fetchAccountInfo(key),
        fetchLegendaryArmory(key),
        fetchWalletQuantities(key),
      ])
      setAccountName(account.name)
      setArmory(map)
      setWalletQty(wallet)
      saveApiKey(key)
      setApiKey(key)
      // Account header is ready — stash/inst/vault keep their own loading flags.
      setSyncing(false)
      void Promise.all([stashPromise, vaultPromise, instancesPromise])
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to sync')
      setAccountName(null)
      setArmory(null)
      setItemQty(new Map())
      setWalletQty(new Map())
      setStash(null)
      setStashItems(new Map())
      setVault(null)
      setInstances(null)
      setSyncing(false)
    }
  }

  function toggleFavorite(id: string) {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function toggleChecklist(componentId: string) {
    setChecklist((prev) => ({ ...prev, [componentId]: !prev[componentId] }))
  }

  function getOwnedRecipe(item: Legendary): RecipeComponent[] | null {
    const base = RECIPES[item.id]
    if (!base?.length) return null
    return applyOwnership(cloneRecipe(base), itemQty, walletQty, checklist)
  }

  function itemProgress(item: Legendary): number {
    if (isFullyUnlocked(item, armory)) return 100
    const recipe = getOwnedRecipe(item)
    if (recipe) return recipeProgress(recipe, checklist)
    return progressPct(item, armory)
  }

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: ALL.length }
    for (const item of ALL) {
      map[item.category] = (map[item.category] ?? 0) + 1
    }
    return map
  }, [])

  const unlockedSets = useMemo(() => {
    if (!armory) return 0
    return ALL.filter((item) => isFullyUnlocked(item, armory)).length
  }, [armory])

  const craftForOpen = useMemo(() => {
    if (!craftItem) return null
    return getOwnedRecipe(craftItem)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [craftItem, itemQty, walletQty, checklist])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = ALL.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (expansion && item.expansion !== expansion) return false
      if (weaponGen && item.category === 'weapons' && item.subCategory !== weaponGen)
        return false
      if (weaponGen && item.category !== 'weapons' && category === 'all') return false
      if (pinnedOnly && !favorites.includes(item.id)) return false
      if (unlockedOnly && !isFullyUnlocked(item, armory)) return false
      if (!q) return true
      return (
        item.name.toLowerCase().includes(q) ||
        item.typeLabel.toLowerCase().includes(q) ||
        item.expansion.toLowerCase().includes(q) ||
        item.subCategory.toLowerCase().includes(q) ||
        categoryLabel(item.category).toLowerCase().includes(q)
      )
    })

    list = [...list].sort((a, b) => {
      if (!pinnedOnly) {
        const ap = favorites.includes(a.id) ? 0 : 1
        const bp = favorites.includes(b.id) ? 0 : 1
        if (ap !== bp) return ap - bp
      }
      if (sort === 'progress') {
        return itemProgress(b) - itemProgress(a) || a.name.localeCompare(b.name)
      }
      if (sort === 'expansion') {
        return (
          expansionOrder(a.expansion) - expansionOrder(b.expansion) ||
          a.name.localeCompare(b.name)
        )
      }
      return a.name.localeCompare(b.name)
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    category,
    query,
    sort,
    pinnedOnly,
    unlockedOnly,
    expansion,
    weaponGen,
    favorites,
    armory,
    itemQty,
    walletQty,
    checklist,
  ])

  const hasRecipe = (item: Legendary) => Boolean(RECIPES[item.id]?.length)

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-mark" aria-hidden>
            <img src="./icon-192.png" alt="" width={40} height={40} />
          </div>
          <div>
            <h1>GW2 LEGGY</h1>
            <span className="tag">Standalone</span>
          </div>
        </div>
        <button
          type="button"
          className={`api-btn${accountName ? ' connected' : ''}`}
          onClick={() => setApiOpen(true)}
        >
          {syncing ? 'Syncing…' : accountName ? accountName : 'Connect API Key'}
        </button>
      </header>

      {mainTab === 'legendaries' && (
        <>
      <section className="stats" aria-label="Summary">
        <div className="stat">
          <div className="label">Catalog</div>
          <div className="value">
            {ALL.length} <span>legendaries</span>
          </div>
        </div>
        <div className="stat">
          <div className="label">Armory</div>
          <div className="value">
            {armory ? unlockedSets : '—'} <span>/ {ALL.length}</span>
          </div>
        </div>
        <div className="stat">
          <div className="label">Pinned</div>
          <div className="value">{favorites.length}</div>
        </div>
      </section>

      <div className="controls">
        <div className="tabs" role="tablist" aria-label="Categories">
          {CATEGORIES.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              className={`tab${category === tab.id ? ' active' : ''}`}
              onClick={() => {
                setCategory(tab.id)
                if (tab.id !== 'weapons' && tab.id !== 'all') setWeaponGen(null)
              }}
            >
              {tab.label}
              <span className="count">{counts[tab.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="search-wrap">
          <span className="icon" aria-hidden>
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Bolt, Aurene, Obsidian, Conflux…"
            aria-label="Search legendaries"
          />
        </div>

        <div className="chip-row" aria-label="Expansion filters">
          {EXPANSIONS.map((exp) => (
            <button
              key={exp}
              type="button"
              className={`chip${expansion === exp ? ' active' : ''}`}
              onClick={() => setExpansion((cur) => (cur === exp ? null : exp))}
            >
              {exp}
            </button>
          ))}
        </div>

        {(category === 'weapons' || category === 'all') && (
          <div className="chip-row" aria-label="Weapon generation">
            {WEAPON_GENS.map((gen) => (
              <button
                key={gen.id}
                type="button"
                className={`chip${weaponGen === gen.id ? ' active' : ''}`}
                onClick={() => setWeaponGen((cur) => (cur === gen.id ? null : gen.id))}
              >
                {gen.label}
              </button>
            ))}
          </div>
        )}

        <div className="toolbar">
          <button
            type="button"
            className={`chip${pinnedOnly ? ' filter-on' : ''}`}
            onClick={() => setPinnedOnly((v) => !v)}
          >
            ★ Pinned
          </button>
          <button
            type="button"
            className={`chip${unlockedOnly ? ' filter-on' : ''}`}
            onClick={() => setUnlockedOnly((v) => !v)}
            disabled={!armory}
            title={armory ? undefined : 'Connect an API key to filter by unlocked'}
          >
            ✓ Unlocked
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Sort legendaries"
          >
            <option value="name">Sort A–Z</option>
            <option value="expansion">Sort by expansion</option>
            <option value="progress">Sort by progress</option>
          </select>
        </div>
      </div>

      <div className="results-meta">
        <span>
          Showing {filtered.length} of {ALL.length}
        </span>
        {!armory && <span>Browse freely — connect a key to track unlocks & mats</span>}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>No matches</h3>
          <p>Try clearing search or filters.</p>
        </div>
      ) : (
        <div className="list">
          {filtered.map((item) => {
            const pct = itemProgress(item)
            const done = isFullyUnlocked(item, armory)
            const pinned = favorites.includes(item.id)
            const recipe = RECIPES[item.id]
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`card${done ? ' unlocked' : ''}`}
                onClick={() => setSelected(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelected(item)
                  }
                }}
              >
                <img
                  className="card-icon"
                  src={item.defaultIcon}
                  alt=""
                  loading="lazy"
                  width={56}
                  height={56}
                />
                <div className="card-body">
                  <h3 className="card-title">{item.name}</h3>
                  <div className="card-meta">
                    {item.typeLabel} · {item.expansion}
                    {item.category === 'weapons'
                      ? ` · ${subCategoryLabel(item.subCategory)}`
                      : ''}
                  </div>
                  {(armory || recipe) && (
                    <div className="card-progress" aria-hidden>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {recipe && (
                    <div className="card-craft-hint">View Crafting Breakdown →</div>
                  )}
                </div>
                <div className="card-side">
                  <button
                    type="button"
                    className={`pin${pinned ? ' on' : ''}`}
                    aria-label={pinned ? 'Unpin' : 'Pin'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(item.id)
                    }}
                  >
                    {pinned ? '★' : '☆'}
                  </button>
                  <span className={`badge${done ? ' done' : ''}`}>
                    {armory
                      ? done
                        ? 'Unlocked'
                        : item.pieceIds.length > 1
                          ? `${item.pieceIds.filter((id) => (armory.get(id) ?? 0) > 0).length}/${item.pieceIds.length}`
                          : `${unlockedCount(item, armory)}/${item.maxCount}`
                      : item.expansion}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selected && (
        <div
          className="sheet-backdrop"
          onClick={() => setSelected(null)}
          role="presentation"
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="sheet-top">
              <img src={selected.defaultIcon} alt="" width={72} height={72} />
              <div>
                <h2>{selected.name}</h2>
                <div className="card-meta">
                  {categoryLabel(selected.category)} · {selected.typeLabel} ·{' '}
                  {selected.expansion}
                </div>
              </div>
            </div>
            <p className="desc">{selected.description}</p>
            <div className="sheet-actions">
              {hasRecipe(selected) && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setCraftItem(selected)
                    setSelected(null)
                  }}
                >
                  Crafting breakdown
                </button>
              )}
              <a
                className={hasRecipe(selected) ? '' : 'primary'}
                href={selected.wikiUrl}
                target="_blank"
                rel="noreferrer"
              >
                Wiki guide
              </a>
              <button type="button" onClick={() => toggleFavorite(selected.id)}>
                {favorites.includes(selected.id) ? '★ Unpin' : '☆ Pin'}
              </button>
              <button type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            {selected.pieces.length > 1 && (
              <>
                <div className="card-meta" style={{ marginBottom: 8 }}>
                  Set pieces{' '}
                  {armory
                    ? `(${selected.pieces.filter((p) => (armory.get(p.id) ?? 0) > 0).length}/${selected.pieces.length} unlocked)`
                    : ''}
                </div>
                <div className="pieces">
                  {selected.pieces.map((piece) => {
                    const have = (armory?.get(piece.id) ?? 0) > 0
                    return (
                      <div key={piece.id} className={`piece${have ? ' have' : ''}`}>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            minWidth: 0,
                          }}
                        >
                          <img
                            src={piece.icon}
                            alt=""
                            width={28}
                            height={28}
                            style={{ borderRadius: 6, flex: '0 0 auto' }}
                          />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {piece.name}
                          </span>
                        </span>
                        <span>{armory ? (have ? 'Unlocked' : 'Missing') : '—'}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {selected.pieceIds.length === 1 && armory && (
              <div
                className={`piece${isFullyUnlocked(selected, armory) ? ' have' : ''}`}
              >
                <span>Legendary Armory</span>
                <span>
                  {unlockedCount(selected, armory)} / {selected.maxCount}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
        </>
      )}

      {mainTab === 'stash' && (
        <StashView
          snapshot={stash}
          items={stashItems}
          loading={stashLoading}
          error={stashError}
          connected={Boolean(accountName)}
          onConnect={() => setApiOpen(true)}
          onRefresh={() => {
            const key = loadApiKey()
            if (key) void loadStash(key)
          }}
        />
      )}

      {mainTab === 'vault' && (
        <VaultView
          snapshot={vault}
          loading={vaultLoading}
          error={vaultError}
          connected={Boolean(accountName)}
          onConnect={() => setApiOpen(true)}
          onRefresh={() => {
            const key = loadApiKey()
            if (key) void loadVault(key)
          }}
        />
      )}

      {mainTab === 'instances' && (
        <InstancesView
          snapshot={instances}
          loading={instancesLoading}
          error={instancesError}
          connected={Boolean(accountName)}
          onConnect={() => setApiOpen(true)}
          onRefresh={() => {
            const key = loadApiKey()
            if (key) void loadInstances(key)
          }}
        />
      )}

      {craftItem && craftForOpen && (
        <CraftingBreakdown
          item={craftItem}
          recipe={craftForOpen}
          checklist={checklist}
          onToggleCheck={toggleChecklist}
          tpPrices={tpPrices}
          hasInventory={itemQty.size > 0 || walletQty.size > 0}
          onClose={() => setCraftItem(null)}
        />
      )}

      {apiOpen && (
        <div
          className="sheet-backdrop"
          onClick={() => setApiOpen(false)}
          role="presentation"
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>GW2 API Key</h3>
            <p>
              Paste a key from account.arena.net to sync Legendary Armory, Stash, Instances, and
              Wizard&apos;s Vault. Stored only on this device — GW2 Leggy talks only to the
              official Guild Wars 2 API.
            </p>
            {apiError && <div className="error">{apiError}</div>}
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="row">
              <button
                type="button"
                className="primary"
                disabled={syncing || apiKey.trim().length < 10}
                onClick={() => {
                  void (async () => {
                    await syncAccount(apiKey)
                    if (loadApiKey()) setApiOpen(false)
                  })()
                }}
              >
                {syncing ? 'Syncing…' : 'Save & Sync'}
              </button>
              {accountName && (
                <button
                  type="button"
                  onClick={() => {
                    removeApiKey()
                    setApiKey('')
                    setAccountName(null)
                    setArmory(null)
                    setItemQty(new Map())
                    setWalletQty(new Map())
                    setStash(null)
                    setStashItems(new Map())
                    setVault(null)
                    setInstances(null)
                  }}
                >
                  Disconnect
                </button>
              )}
              <button type="button" onClick={() => setApiOpen(false)}>
                Cancel
              </button>
            </div>
            <p className="hint">
              Recommended permissions: account, inventories, characters, unlocks, wallet,
              progression.
            </p>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>
          Disclaimer: GW2 Leggy is an unofficial standalone fan-made application and is not
          affiliated with, endorsed by, sponsored by, or associated with NCSoft Corporation or
          ArenaNet, LLC. Guild Wars 2 and all related names, trademarks, logos, and other
          intellectual property belong to their respective owners.
        </p>
      </footer>

      <nav className="bottom-nav" aria-label="Main">
        <button
          type="button"
          className={mainTab === 'legendaries' ? 'active' : ''}
          onClick={() => setMainTab('legendaries')}
        >
          <span aria-hidden>⚔</span>
          Leggys
        </button>
        <button
          type="button"
          className={mainTab === 'stash' ? 'active' : ''}
          onClick={() => setMainTab('stash')}
        >
          <span aria-hidden>▣</span>
          Stash
        </button>
        <button
          type="button"
          className={mainTab === 'instances' ? 'active' : ''}
          onClick={() => setMainTab('instances')}
        >
          <span aria-hidden>⬡</span>
          Inst
        </button>
        <button
          type="button"
          className={mainTab === 'vault' ? 'active' : ''}
          onClick={() => setMainTab('vault')}
        >
          <span aria-hidden>✦</span>
          Vault
        </button>
      </nav>
    </div>
  )
}
