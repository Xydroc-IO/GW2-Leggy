import { useEffect, useMemo, useState } from 'react'
import {
  fetchMaterialCategories,
  type MaterialCategory,
} from './lib/gw2api'
import type { Gw2ItemInfo, StashSlot, StashSnapshot } from './lib/stashTypes'

const RARITY_COLOR: Record<string, string> = {
  Junk: '#aaa',
  Basic: '#9d9d9d',
  Fine: '#62a4da',
  Masterwork: '#1a9306',
  Rare: '#fcd00b',
  Exotic: '#ffa405',
  Ascended: '#fb3e8d',
  Legendary: '#4c139d',
}

const RARITY_RANK: Record<string, number> = {
  Junk: 0,
  Basic: 1,
  Fine: 2,
  Masterwork: 3,
  Rare: 4,
  Exotic: 5,
  Ascended: 6,
  Legendary: 7,
}

type MatSort = 'category' | 'name' | 'qty-desc' | 'qty-asc' | 'rarity'

const MAT_SORT_STORAGE = 'gw2_leggy_mat_sort'

interface Props {
  snapshot: StashSnapshot | null
  items: Map<number, Gw2ItemInfo>
  loading: boolean
  error: string | null
  connected: boolean
  onConnect: () => void
  onRefresh: () => void
}

type StashSection = 'bank' | 'shared' | 'materials' | 'characters'

type SelectedItem = {
  slot: StashSlot
  info?: Gw2ItemInfo
  location: string
}

function SlotCell({
  slot,
  info,
  onSelect,
}: {
  slot: StashSlot | null
  info?: Gw2ItemInfo
  onSelect?: (slot: StashSlot, info?: Gw2ItemInfo) => void
}) {
  if (!slot) {
    return <div className="stash-slot empty" aria-hidden />
  }
  const rarity = info?.rarity ?? 'Basic'
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.Basic
  const label = info ? `${info.name}, quantity ${slot.count}` : `Item ${slot.id}, quantity ${slot.count}`
  return (
    <button
      type="button"
      className="stash-slot filled"
      style={{ borderColor: color }}
      aria-label={label}
      onClick={() => onSelect?.(slot, info)}
    >
      {info?.icon ? (
        <img src={info.icon} alt="" loading="lazy" decoding="async" />
      ) : (
        <div className="stash-slot-ph" />
      )}
      {slot.count > 1 && <span className="stash-count">{slot.count}</span>}
    </button>
  )
}

function SlotGrid({
  slots,
  items,
  columns = 10,
  onSelect,
  location,
}: {
  slots: (StashSlot | null)[]
  items: Map<number, Gw2ItemInfo>
  columns?: number
  onSelect: (slot: StashSlot, info: Gw2ItemInfo | undefined, location: string) => void
  location: string
}) {
  return (
    <div
      className={`stash-grid stash-grid-${columns}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {slots.map((slot, i) => (
        <SlotCell
          key={slot ? `${slot.id}-${slot.index}-${i}` : `empty-${i}`}
          slot={slot}
          info={slot ? items.get(slot.id) : undefined}
          onSelect={(s, info) => onSelect(s, info, location)}
        />
      ))}
    </div>
  )
}

function filterSlots(
  slots: (StashSlot | null)[],
  q: string,
  items: Map<number, Gw2ItemInfo>,
  hideEmpty: boolean,
): (StashSlot | null)[] {
  if (!q && !hideEmpty) return slots
  const needle = q.trim().toLowerCase()
  return slots.filter((slot) => {
    if (!slot) return !hideEmpty && !needle
    if (!needle) return true
    const info = items.get(slot.id)
    return (
      info?.name.toLowerCase().includes(needle) ||
      String(slot.id).includes(needle) ||
      (info?.type ?? '').toLowerCase().includes(needle) ||
      (info?.rarity ?? '').toLowerCase().includes(needle)
    )
  })
}

function ItemDetailSheet({
  selected,
  onClose,
}: {
  selected: SelectedItem
  onClose: () => void
}) {
  const { slot, info, location } = selected
  const rarity = info?.rarity ?? 'Basic'
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.Basic
  const name = info?.name ?? `Unknown item #${slot.id}`
  const wiki = `https://wiki.guildwars2.com/index.php?search=${encodeURIComponent(name)}`

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <div
        className="sheet stash-item-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={name}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-top">
          <div className="stash-item-sheet-icon" style={{ borderColor: color }}>
            {info?.icon ? (
              <img src={info.icon} alt="" width={72} height={72} />
            ) : (
              <div className="stash-slot-ph" />
            )}
          </div>
          <div>
            <h2 style={{ color }}>{name}</h2>
            <div className="card-meta">
              {info?.type ?? 'Item'}
              {info?.rarity ? ` · ${info.rarity}` : ''}
              {info?.level != null && info.level > 0 ? ` · Level ${info.level}` : ''}
            </div>
            <div className="stash-item-qty">
              Quantity <strong>{slot.count}</strong>
            </div>
          </div>
        </div>
        <p className="stash-item-loc">In {location}</p>
        {info?.description ? (
          <p className="desc">{info.description.replace(/<[^>]+>/g, '')}</p>
        ) : !info ? (
          <p className="desc">Item details are still loading from the GW2 API.</p>
        ) : null}
        <div className="sheet-actions">
          <a className="primary" href={wiki} target="_blank" rel="noreferrer">
            Open wiki
          </a>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="stash-item-id">API id {slot.id}</p>
      </div>
    </div>
  )
}

export default function StashView({
  snapshot,
  items,
  loading,
  error,
  connected,
  onConnect,
  onRefresh,
}: Props) {
  const [section, setSection] = useState<StashSection>('bank')
  const [query, setQuery] = useState('')
  const [hideEmpty, setHideEmpty] = useState(true)
  /** Character names currently expanded (multiple allowed). */
  const [openChars, setOpenChars] = useState<Set<string>>(() => new Set())
  /** `${charName}::${bagIndex}` keys that are collapsed (bags default open). */
  const [collapsedBags, setCollapsedBags] = useState<Set<string>>(() => new Set())
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [matCats, setMatCats] = useState<MaterialCategory[]>([])
  const [matCategoryFilter, setMatCategoryFilter] = useState<number | 'all'>('all')
  const [matSort, setMatSort] = useState<MatSort>(() => {
    try {
      const v = localStorage.getItem(MAT_SORT_STORAGE)
      if (
        v === 'category' ||
        v === 'name' ||
        v === 'qty-desc' ||
        v === 'qty-asc' ||
        v === 'rarity'
      ) {
        return v
      }
    } catch {
      /* ignore */
    }
    return 'category'
  })

  useEffect(() => {
    void fetchMaterialCategories().then(setMatCats)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(MAT_SORT_STORAGE, matSort)
    } catch {
      /* ignore */
    }
  }, [matSort])

  function charDomId(name: string) {
    return `stash-char-${name.replace(/[^a-zA-Z0-9_-]+/g, '_')}`
  }

  function toggleChar(name: string) {
    setOpenChars((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function bagKey(charName: string, bagIndex: number) {
    return `${charName}::${bagIndex}`
  }

  function toggleBag(charName: string, bagIndex: number) {
    const key = bagKey(charName, bagIndex)
    setCollapsedBags((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function expandAllChars() {
    if (!snapshot?.characters.length) return
    setOpenChars(new Set(snapshot.characters.map((c) => c.name)))
    setCollapsedBags(new Set())
  }

  function collapseAllChars() {
    setOpenChars(new Set())
  }

  const catById = useMemo(() => {
    const map = new Map<number, MaterialCategory>()
    for (const c of matCats) map.set(c.id, c)
    return map
  }, [matCats])

  const bankTabs = useMemo(() => {
    if (!snapshot) return []
    const slots = snapshot.bank
    const tabs: (StashSlot | null)[][] = []
    for (let i = 0; i < slots.length; i += 30) {
      tabs.push(slots.slice(i, i + 30))
    }
    return tabs.length ? tabs : [[]]
  }, [snapshot])

  const [bankTab, setBankTab] = useState(0)

  useEffect(() => {
    if (bankTab >= bankTabs.length) setBankTab(0)
  }, [bankTab, bankTabs.length])

  const bankSlots = filterSlots(bankTabs[bankTab] ?? [], query, items, hideEmpty)
  const sharedSlots = filterSlots(snapshot?.shared ?? [], query, items, hideEmpty)

  const materialSlots = useMemo(() => {
    const base = filterSlots(snapshot?.materials ?? [], query, items, false).filter(
      Boolean,
    ) as StashSlot[]
    const filtered =
      matCategoryFilter === 'all'
        ? base
        : base.filter((s) => s.category === matCategoryFilter)

    const rank = (s: StashSlot) => RARITY_RANK[items.get(s.id)?.rarity ?? 'Basic'] ?? 1
    const nameOf = (s: StashSlot) =>
      (items.get(s.id)?.name ?? `Item ${s.id}`).toLowerCase()
    const catOrder = (s: StashSlot) =>
      catById.get(s.category ?? -1)?.order ?? 999

    const sorted = [...filtered]
    sorted.sort((a, b) => {
      switch (matSort) {
        case 'name':
          return nameOf(a).localeCompare(nameOf(b))
        case 'qty-desc':
          return b.count - a.count || nameOf(a).localeCompare(nameOf(b))
        case 'qty-asc':
          return a.count - b.count || nameOf(a).localeCompare(nameOf(b))
        case 'rarity':
          return rank(b) - rank(a) || nameOf(a).localeCompare(nameOf(b))
        case 'category':
        default: {
          const co = catOrder(a) - catOrder(b)
          if (co) return co
          return nameOf(a).localeCompare(nameOf(b))
        }
      }
    })
    return sorted
  }, [snapshot?.materials, query, items, matCategoryFilter, matSort, catById])

  const materialGroups = useMemo(() => {
    if (matSort !== 'category' || matCategoryFilter !== 'all') {
      return [{ key: 'flat', title: null as string | null, slots: materialSlots }]
    }
    const groups: { key: string; title: string | null; slots: StashSlot[] }[] = []
    let currentKey = ''
    for (const slot of materialSlots) {
      const catId = slot.category ?? -1
      const key = String(catId)
      if (key !== currentKey) {
        currentKey = key
        groups.push({
          key,
          title: catById.get(catId)?.name ?? (catId > 0 ? `Category ${catId}` : 'Other'),
          slots: [],
        })
      }
      groups[groups.length - 1].slots.push(slot)
    }
    return groups
  }, [materialSlots, matSort, matCategoryFilter, catById])

  const matCategoryCounts = useMemo(() => {
    const base = filterSlots(snapshot?.materials ?? [], query, items, false).filter(
      Boolean,
    ) as StashSlot[]
    const counts = new Map<number, number>()
    for (const s of base) {
      if (s.category == null) continue
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1)
    }
    return counts
  }, [snapshot?.materials, query, items])

  const filledBank = (snapshot?.bank ?? []).filter(Boolean).length
  const filledShared = (snapshot?.shared ?? []).filter(Boolean).length
  const matCount = snapshot?.materials.length ?? 0
  const charCount = snapshot?.characters.length ?? 0

  const selectItem = (slot: StashSlot, info: Gw2ItemInfo | undefined, location: string) => {
    setSelected({ slot, info, location })
  }

  if (!connected) {
    return (
      <div className="stash-empty">
        <h2>Stash</h2>
        <p>
          Connect your GW2 API key to browse bank tabs, shared inventory, material storage, and
          each character&apos;s bags — the same stash view you use as an inventory helper.
        </p>
        <button type="button" className="primary" onClick={onConnect}>
          Connect API Key
        </button>
      </div>
    )
  }

  return (
    <div className="stash">
      <div className="stash-toolbar">
        <div className="search-wrap">
          <span className="icon" aria-hidden>
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, type, rarity…"
            aria-label="Search stash"
          />
        </div>
        <div className="stash-toolbar-row">
          <button
            type="button"
            className={`chip${hideEmpty ? ' filter-on' : ''}`}
            onClick={() => setHideEmpty((v) => !v)}
            title="Empty bank slots make the grid look sparse — hide them for a compact view"
          >
            {hideEmpty ? 'Empty hidden' : 'Showing empty'}
          </button>
          <button type="button" className="chip" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <p className="stash-hint">Tap any item icon to see its name and details.</p>
      </div>

      {error && <div className="stash-error">{error}</div>}

      <div className="stash-sections" role="tablist" aria-label="Stash sections">
        {(
          [
            ['bank', `Bank (${filledBank})`],
            ['shared', `Shared (${filledShared})`],
            ['materials', `Materials (${matCount})`],
            ['characters', `Characters (${charCount})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={`chip${section === id ? ' active' : ''}`}
            aria-selected={section === id}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && !snapshot ? (
        <div className="stash-empty">
          <p>Loading stash from the official GW2 API…</p>
        </div>
      ) : (
        <>
          {section === 'bank' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Account Bank</h3>
                <span>
                  Tab {bankTab + 1}/{Math.max(bankTabs.length, 1)} · {snapshot?.bank.length ?? 0}{' '}
                  slots
                </span>
              </div>
              {bankTabs.length > 1 && (
                <div className="stash-bank-tabs" role="tablist" aria-label="Bank tabs">
                  {bankTabs.map((tab, i) => {
                    const filled = tab.filter(Boolean).length
                    return (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        className={`chip${bankTab === i ? ' active' : ''}`}
                        aria-selected={bankTab === i}
                        onClick={() => setBankTab(i)}
                      >
                        {i + 1}
                        <span className="stash-tab-count">{filled}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              {bankSlots.every((s) => !s) ? (
                <p className="stash-muted">
                  {query
                    ? 'No items on this tab match your search.'
                    : 'This bank tab is empty.'}
                </p>
              ) : (
                <SlotGrid
                  slots={bankSlots}
                  items={items}
                  columns={10}
                  location={`Bank tab ${bankTab + 1}`}
                  onSelect={selectItem}
                />
              )}
            </div>
          )}

          {section === 'shared' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Shared Inventory</h3>
                <span>{snapshot?.shared.length ?? 0} slots</span>
              </div>
              {sharedSlots.every((s) => !s) ? (
                <p className="stash-muted">
                  {query ? 'No shared items match your search.' : 'Shared inventory is empty.'}
                </p>
              ) : (
                <SlotGrid
                  slots={sharedSlots}
                  items={items}
                  columns={5}
                  location="Shared inventory"
                  onSelect={selectItem}
                />
              )}
            </div>
          )}

          {section === 'materials' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Material Storage</h3>
                <span>{materialSlots.length} shown</span>
              </div>

              <div className="stash-mat-controls">
                <label className="stash-mat-sort">
                  <span className="stash-mat-sort-label">Sort</span>
                  <select
                    value={matSort}
                    onChange={(e) => setMatSort(e.target.value as MatSort)}
                    aria-label="Sort materials"
                  >
                    <option value="category">By category</option>
                    <option value="name">Name A–Z</option>
                    <option value="qty-desc">Quantity high → low</option>
                    <option value="qty-asc">Quantity low → high</option>
                    <option value="rarity">Rarity</option>
                  </select>
                </label>
              </div>

              {matCats.length > 0 && (
                <div className="stash-mat-cats" role="tablist" aria-label="Material categories">
                  <button
                    type="button"
                    role="tab"
                    className={`chip${matCategoryFilter === 'all' ? ' active' : ''}`}
                    aria-selected={matCategoryFilter === 'all'}
                    onClick={() => setMatCategoryFilter('all')}
                  >
                    All
                    <span className="stash-tab-count">{matCount}</span>
                  </button>
                  {matCats.map((cat) => {
                    const n = matCategoryCounts.get(cat.id) ?? 0
                    if (n === 0 && query) return null
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        className={`chip${matCategoryFilter === cat.id ? ' active' : ''}`}
                        aria-selected={matCategoryFilter === cat.id}
                        onClick={() => setMatCategoryFilter(cat.id)}
                        title={cat.name}
                      >
                        {cat.name.replace(/ Materials$/, '').replace(/ Ingredients$/, '')}
                        <span className="stash-tab-count">{n}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {materialSlots.length === 0 ? (
                <p className="stash-muted">No materials found (or none match search/filter).</p>
              ) : (
                <div className="stash-mat-list">
                  {materialGroups.map((group) => (
                    <div key={group.key} className="stash-mat-group">
                      {group.title && (
                        <div className="stash-mat-group-title">
                          <span>{group.title}</span>
                          <em>{group.slots.length}</em>
                        </div>
                      )}
                      {group.slots.map((slot) => {
                        const info = items.get(slot.id)
                        const color = RARITY_COLOR[info?.rarity ?? 'Basic'] ?? '#9d9d9d'
                        const catName = catById.get(slot.category ?? -1)?.name
                        return (
                          <button
                            key={`${slot.id}-${slot.index}`}
                            type="button"
                            className="stash-mat-row"
                            onClick={() =>
                              selectItem(
                                slot,
                                info,
                                catName
                                  ? `Material storage · ${catName}`
                                  : 'Material storage',
                              )
                            }
                          >
                            <div className="stash-mat-icon" style={{ borderColor: color }}>
                              {info?.icon ? (
                                <img src={info.icon} alt="" width={36} height={36} />
                              ) : (
                                <div className="stash-slot-ph" />
                              )}
                            </div>
                            <div className="stash-mat-info">
                              <div className="stash-mat-name">
                                {info?.name ?? `Item ${slot.id}`}
                              </div>
                              <div className="stash-mat-meta">
                                {info?.rarity ?? 'Basic'}
                                {catName && matCategoryFilter === 'all' && matSort !== 'category'
                                  ? ` · ${catName}`
                                  : ''}
                              </div>
                            </div>
                            <div className="stash-mat-count">{slot.count.toLocaleString()}</div>
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'characters' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Character Inventories</h3>
                <span>{charCount} characters</span>
              </div>

              {snapshot?.characters.length ? (
                <div className="stash-char-toolbar">
                  <button type="button" className="chip" onClick={expandAllChars}>
                    Expand all
                  </button>
                  <button type="button" className="chip" onClick={collapseAllChars}>
                    Collapse all
                  </button>
                  <span className="stash-muted">
                    {openChars.size} open
                  </span>
                </div>
              ) : null}

              {snapshot?.characters.length ? (
                <div className="stash-char-jump" aria-label="Jump to character">
                  {snapshot.characters.map((ch) => {
                    const filled = ch.bags.reduce(
                      (n, bag) => n + bag.slots.filter(Boolean).length,
                      0,
                    )
                    const open = openChars.has(ch.name)
                    return (
                      <button
                        key={`jump-${ch.name}`}
                        type="button"
                        className={`chip${open ? ' active' : ''}`}
                        onClick={() => {
                          setOpenChars((prev) => {
                            if (prev.has(ch.name)) return prev
                            return new Set(prev).add(ch.name)
                          })
                          requestAnimationFrame(() => {
                            document
                              .getElementById(charDomId(ch.name))
                              ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                          })
                        }}
                        title={`${ch.name} · ${filled} items`}
                      >
                        {ch.name.split(' ')[0]}
                        <span className="stash-tab-count">{filled}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}

              {!snapshot?.characters.length ? (
                <p className="stash-muted">No characters returned for this API key.</p>
              ) : (
                <div className="stash-chars">
                  {snapshot.characters.map((ch) => {
                    const open = openChars.has(ch.name)
                    const filled = ch.bags.reduce(
                      (n, bag) => n + bag.slots.filter(Boolean).length,
                      0,
                    )
                    const bagCount = ch.bags.filter((b) => b.size > 0).length
                    return (
                      <div
                        key={ch.name}
                        id={charDomId(ch.name)}
                        className={`stash-char${open ? ' open' : ''}`}
                      >
                        <button
                          type="button"
                          className="stash-char-toggle"
                          onClick={() => toggleChar(ch.name)}
                          aria-expanded={open}
                        >
                          <span className="stash-char-caret" aria-hidden>
                            {open ? '▾' : '▸'}
                          </span>
                          <span className="stash-char-title">
                            <strong>{ch.name}</strong>
                            <em>
                              {filled} items · {bagCount} bags
                            </em>
                          </span>
                          <span className="stash-char-action">{open ? 'Minimize' : 'Expand'}</span>
                        </button>
                        {open && (
                          <div className="stash-char-bags">
                            {ch.bags.map((bag, bi) => {
                              if (!bag.size) return null
                              const slots = filterSlots(bag.slots, query, items, hideEmpty)
                              if (query && !slots.some(Boolean)) return null
                              const bagOpen = !collapsedBags.has(bagKey(ch.name, bi))
                              const bagFilled = bag.slots.filter(Boolean).length
                              return (
                                <div
                                  key={`${ch.name}-bag-${bi}`}
                                  className={`stash-bag${bagOpen ? ' open' : ''}`}
                                >
                                  <button
                                    type="button"
                                    className="stash-bag-toggle"
                                    onClick={() => toggleBag(ch.name, bi)}
                                    aria-expanded={bagOpen}
                                  >
                                    <span aria-hidden>{bagOpen ? '▾' : '▸'}</span>
                                    <strong>Bag {bi + 1}</strong>
                                    <em>
                                      {bagFilled}/{bag.size}
                                    </em>
                                    <span className="stash-bag-action">
                                      {bagOpen ? 'Hide' : 'Show'}
                                    </span>
                                  </button>
                                  {bagOpen && (
                                    <SlotGrid
                                      slots={slots}
                                      items={items}
                                      columns={5}
                                      location={`${ch.name} · bag ${bi + 1}`}
                                      onSelect={selectItem}
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selected && (
        <ItemDetailSheet selected={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
