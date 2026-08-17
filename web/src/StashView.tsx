import { useEffect, useMemo, useState } from 'react'
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

function SlotCell({
  slot,
  info,
}: {
  slot: StashSlot | null
  info?: Gw2ItemInfo
}) {
  if (!slot) {
    return <div className="stash-slot empty" aria-hidden />
  }
  const rarity = info?.rarity ?? 'Basic'
  const color = RARITY_COLOR[rarity] ?? RARITY_COLOR.Basic
  return (
    <div
      className="stash-slot filled"
      style={{ borderColor: color }}
      title={info ? `${info.name} ×${slot.count}` : `Item ${slot.id} ×${slot.count}`}
    >
      {info?.icon ? (
        <img src={info.icon} alt="" width={40} height={40} loading="lazy" />
      ) : (
        <div className="stash-slot-ph" />
      )}
      {slot.count > 1 && <span className="stash-count">{slot.count}</span>}
    </div>
  )
}

function SlotGrid({
  slots,
  items,
  columns = 10,
}: {
  slots: (StashSlot | null)[]
  items: Map<number, Gw2ItemInfo>
  columns?: number
}) {
  return (
    <div
      className="stash-grid"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {slots.map((slot, i) => (
        <SlotCell
          key={slot ? `${slot.id}-${slot.index}-${i}` : `empty-${i}`}
          slot={slot}
          info={slot ? items.get(slot.id) : undefined}
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
      (info?.type ?? '').toLowerCase().includes(needle)
    )
  })
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
  const [hideEmpty, setHideEmpty] = useState(false)
  const [charOpen, setCharOpen] = useState<string | null>(null)

  useEffect(() => {
    if (snapshot?.characters.length && !charOpen) {
      setCharOpen(snapshot.characters[0]?.name ?? null)
    }
  }, [snapshot, charOpen])

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

  const bankSlots = filterSlots(
    bankTabs[bankTab] ?? [],
    query,
    items,
    hideEmpty,
  )
  const sharedSlots = filterSlots(snapshot?.shared ?? [], query, items, hideEmpty)
  const materialSlots = filterSlots(
    snapshot?.materials ?? [],
    query,
    items,
    false,
  ).filter(Boolean) as StashSlot[]

  const filledBank = (snapshot?.bank ?? []).filter(Boolean).length
  const filledShared = (snapshot?.shared ?? []).filter(Boolean).length
  const matCount = snapshot?.materials.length ?? 0
  const charCount = snapshot?.characters.length ?? 0

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
            placeholder="Search stash items…"
            aria-label="Search stash"
          />
        </div>
        <div className="stash-toolbar-row">
          <button
            type="button"
            className={`chip${hideEmpty ? ' filter-on' : ''}`}
            onClick={() => setHideEmpty((v) => !v)}
          >
            Hide empty
          </button>
          <button type="button" className="chip" onClick={onRefresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
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
                <span>{snapshot?.bank.length ?? 0} slots</span>
              </div>
              {bankTabs.length > 1 && (
                <div className="stash-bank-tabs">
                  {bankTabs.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`chip${bankTab === i ? ' active' : ''}`}
                      onClick={() => setBankTab(i)}
                    >
                      Tab {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <SlotGrid slots={bankSlots} items={items} columns={10} />
            </div>
          )}

          {section === 'shared' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Shared Inventory</h3>
                <span>{snapshot?.shared.length ?? 0} slots</span>
              </div>
              <SlotGrid slots={sharedSlots} items={items} columns={8} />
            </div>
          )}

          {section === 'materials' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Material Storage</h3>
                <span>{materialSlots.length} stacked</span>
              </div>
              {materialSlots.length === 0 ? (
                <p className="stash-muted">No materials found (or none match search).</p>
              ) : (
                <div className="stash-mat-list">
                  {materialSlots.map((slot) => {
                    const info = items.get(slot.id)
                    const color = RARITY_COLOR[info?.rarity ?? 'Basic'] ?? '#9d9d9d'
                    return (
                      <div key={`${slot.id}-${slot.index}`} className="stash-mat-row">
                        <div className="stash-mat-icon" style={{ borderColor: color }}>
                          {info?.icon ? (
                            <img src={info.icon} alt="" width={36} height={36} />
                          ) : (
                            <div className="stash-slot-ph" />
                          )}
                        </div>
                        <div className="stash-mat-info">
                          <div className="stash-mat-name">{info?.name ?? `Item ${slot.id}`}</div>
                          <div className="stash-mat-meta">
                            {info?.type ?? 'Material'}
                            {info?.rarity ? ` · ${info.rarity}` : ''}
                          </div>
                        </div>
                        <div className="stash-mat-count">{slot.count}</div>
                      </div>
                    )
                  })}
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
              {!snapshot?.characters.length ? (
                <p className="stash-muted">No characters returned for this API key.</p>
              ) : (
                <div className="stash-chars">
                  {snapshot.characters.map((ch) => {
                    const open = charOpen === ch.name
                    const filled = ch.bags.reduce(
                      (n, bag) => n + bag.slots.filter(Boolean).length,
                      0,
                    )
                    return (
                      <div key={ch.name} className="stash-char">
                        <button
                          type="button"
                          className="stash-char-toggle"
                          onClick={() => setCharOpen(open ? null : ch.name)}
                          aria-expanded={open}
                        >
                          <span>{open ? '▾' : '▸'}</span>
                          <strong>{ch.name}</strong>
                          <em>{filled} items</em>
                        </button>
                        {open && (
                          <div className="stash-char-bags">
                            {ch.bags.map((bag, bi) => {
                              if (!bag.size) return null
                              const slots = filterSlots(bag.slots, query, items, hideEmpty)
                              if (query && !slots.some(Boolean) && hideEmpty) return null
                              return (
                                <div key={`${ch.name}-bag-${bi}`} className="stash-bag">
                                  <div className="stash-bag-label">
                                    Bag {bi + 1}
                                    <span>
                                      {bag.slots.filter(Boolean).length}/{bag.size}
                                    </span>
                                  </div>
                                  <SlotGrid slots={slots} items={items} columns={5} />
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
    </div>
  )
}
