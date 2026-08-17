import { useEffect, useMemo, useState } from 'react'
import type { Legendary, RecipeComponent } from './lib/types'
import {
  RECIPE_CATEGORY_LABELS,
  estimateGoldRemaining,
  formatGold,
  recipeProgress,
} from './lib/craft'

interface Props {
  item: Legendary
  recipe: RecipeComponent[]
  checklist: Record<string, boolean>
  onToggleCheck: (componentId: string) => void
  tpPrices: Record<number, number>
  hasInventory: boolean
  onClose: () => void
}

function CraftIcon({ icon, itemId, name }: { icon?: string; itemId?: number; name: string }) {
  const [src, setSrc] = useState(icon ?? '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(icon ?? '')
    setFailed(false)
  }, [icon, itemId])

  if (!src || failed) {
    return <div className="craft-icon placeholder" aria-hidden />
  }

  return (
    <img
      src={src}
      alt=""
      width={32}
      height={32}
      className="craft-icon"
      loading="lazy"
      decoding="async"
      onError={() => {
        if (!itemId) {
          setFailed(true)
          return
        }
        void fetch(`https://api.guildwars2.com/v2/items/${itemId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { icon?: string } | null) => {
            if (d?.icon && d.icon !== src) setSrc(d.icon)
            else setFailed(true)
          })
          .catch(() => setFailed(true))
      }}
      title={name}
    />
  )
}

function ComponentRow({
  comp,
  depth,
  checklist,
  onToggleCheck,
  expandAll,
}: {
  comp: RecipeComponent
  depth: number
  checklist: Record<string, boolean>
  onToggleCheck: (id: string) => void
  expandAll: boolean | null
}) {
  const hasKids = Boolean(comp.subComponents?.length)
  const [open, setOpen] = useState(true)
  const owned = comp.countOwned ?? 0
  const required = comp.countRequired
  const done = checklist[comp.id] === true || owned >= required
  const pct = Math.min(100, Math.round((owned / Math.max(1, required)) * 100))
  const cat = RECIPE_CATEGORY_LABELS[comp.category] ?? RECIPE_CATEGORY_LABELS.other

  useEffect(() => {
    if (expandAll === null || !hasKids) return
    setOpen(expandAll)
  }, [expandAll, hasKids])

  return (
    <div className={`craft-row${done ? ' done' : ''}`} style={{ marginLeft: depth * 12 }}>
      <div className="craft-row-main">
        {hasKids ? (
          <button
            type="button"
            className="craft-chevron"
            aria-label={open ? 'Collapse' : 'Expand'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="craft-chevron spacer" />
        )}

        <button
          type="button"
          className={`craft-check${done ? ' on' : ''}`}
          title={done ? 'Mark as incomplete' : 'Mark as completed'}
          aria-pressed={done}
          onClick={() => onToggleCheck(comp.id)}
        >
          {done ? '✓' : ''}
        </button>

        <CraftIcon icon={comp.icon} itemId={comp.gw2ItemId} name={comp.name} />

        <div className="craft-info">
          <div className="craft-name">
            <span>{comp.name}</span>
            <span className="craft-cat" style={{ color: cat.color }}>
              {cat.label}
            </span>
          </div>
          {comp.description && <div className="craft-desc">{comp.description}</div>}
          <div className="craft-meter" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="craft-counts">
          <strong>
            {Math.min(owned, required) % 1 === 0
              ? Math.floor(Math.min(owned, required))
              : Math.min(owned, required).toFixed(1)}
          </strong>
          <span>/ {required}</span>
        </div>
      </div>

      {hasKids && open && (
        <div className="craft-kids">
          {comp.subComponents!.map((kid) => (
            <ComponentRow
              key={kid.id}
              comp={kid}
              depth={depth + 1}
              checklist={checklist}
              onToggleCheck={onToggleCheck}
              expandAll={expandAll}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CraftingBreakdown({
  item,
  recipe,
  checklist,
  onToggleCheck,
  tpPrices,
  hasInventory,
  onClose,
}: Props) {
  const [expandAll, setExpandAll] = useState<boolean | null>(null)
  const progress = useMemo(
    () => recipeProgress(recipe, checklist),
    [recipe, checklist],
  )
  const gold = useMemo(
    () => estimateGoldRemaining(recipe, tpPrices, checklist),
    [recipe, tpPrices, checklist],
  )

  const legend = useMemo(() => {
    const seen = new Set<string>()
    const walk = (nodes: RecipeComponent[]) => {
      for (const n of nodes) {
        seen.add(n.category)
        if (n.subComponents) walk(n.subComponents)
      }
    }
    walk(recipe)
    return [...seen]
      .map((k) => RECIPE_CATEGORY_LABELS[k] ?? RECIPE_CATEGORY_LABELS.other)
      .filter((v, i, arr) => arr.findIndex((x) => x.label === v.label) === i)
  }, [recipe])

  return (
    <div className="sheet-backdrop" onClick={onClose} role="presentation">
      <div
        className="sheet craft-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Crafting breakdown for ${item.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="sheet-top">
          <img src={item.defaultIcon} alt="" width={72} height={72} />
          <div>
            <h2>{item.name}</h2>
            <div className="card-meta">
              {item.typeLabel} · {item.expansion}
            </div>
          </div>
        </div>

        <div className="craft-summary">
          <div>
            <div className="label">Overall Crafting Progress</div>
            <div className="value">{progress}%</div>
            <div className="craft-meter tall" aria-hidden>
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          {hasInventory && gold > 0 && (
            <div>
              <div className="label">Est. TP remaining</div>
              <div className="value gold">{formatGold(gold)}</div>
            </div>
          )}
        </div>

        <div className="craft-legend">
          {legend.map((entry) => (
            <span key={entry.label} style={{ color: entry.color }}>
              {entry.label}
            </span>
          ))}
        </div>

        <div className="craft-head">
          <div>
            <h3>Recipe Component Breakdown</h3>
            <span>Tap ▸ to expand gifts · checkboxes mark ingredients done</span>
          </div>
          <div className="craft-expand-btns">
            <button type="button" className="chip" onClick={() => setExpandAll(true)}>
              Expand all
            </button>
            <button type="button" className="chip" onClick={() => setExpandAll(false)}>
              Collapse all
            </button>
          </div>
        </div>

        <div className="craft-list">
          {recipe.map((comp) => (
            <ComponentRow
              key={comp.id}
              comp={comp}
              depth={0}
              checklist={checklist}
              onToggleCheck={onToggleCheck}
              expandAll={expandAll}
            />
          ))}
        </div>

        <div className="craft-foot">
          <span>Official GW2 API powered</span>
          <button type="button" className="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
