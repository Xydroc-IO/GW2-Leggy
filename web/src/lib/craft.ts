import type { RecipeComponent } from './types'

const WEIGHTS: Record<string, number> = {
  precursor: 30,
  gifts: 25,
  currencies: 15,
  t6_materials: 15,
  clovers_coins: 15,
  map_gamemodes: 15,
  other: 15,
}

export function cloneRecipe(recipe: RecipeComponent[]): RecipeComponent[] {
  return recipe.map((comp) => ({
    ...comp,
    subComponents: comp.subComponents
      ? cloneRecipe(comp.subComponents)
      : undefined,
  }))
}

export function collectItemIds(recipe: RecipeComponent[], out = new Set<number>()) {
  for (const comp of recipe) {
    if (comp.gw2ItemId) out.add(comp.gw2ItemId)
    if (comp.subComponents) collectItemIds(comp.subComponents, out)
  }
  return out
}

function leafDone(comp: RecipeComponent, checklist: Record<string, boolean>) {
  const owned = comp.countOwned ?? 0
  return checklist[comp.id] === true || owned >= comp.countRequired
}

/** Apply inventory / wallet / checklist counts onto a recipe tree. */
export function applyOwnership(
  recipe: RecipeComponent[],
  itemQty: Map<number, number>,
  walletQty: Map<number, number>,
  checklist: Record<string, boolean>,
): RecipeComponent[] {
  return recipe.map((comp) => {
    const kids = comp.subComponents
      ? applyOwnership(comp.subComponents, itemQty, walletQty, checklist)
      : undefined

    let owned = 0
    if (comp.gw2CurrencyId != null) {
      owned = walletQty.get(comp.gw2CurrencyId) ?? 0
    } else if (comp.gw2ItemId != null) {
      owned = itemQty.get(comp.gw2ItemId) ?? 0
    }

    if (kids && kids.length > 0) {
      const doneKids = kids.filter((k) => leafDone(k, checklist)).length
      // Parent gift often needs 1 — treat as complete when all children done
      if (doneKids === kids.length) owned = Math.max(owned, comp.countRequired)
      else if (comp.countRequired === 1) {
        owned = Math.max(owned, doneKids / kids.length)
      }
    }

    if (checklist[comp.id]) owned = Math.max(owned, comp.countRequired)

    return {
      ...comp,
      countOwned: owned,
      subComponents: kids,
    }
  })
}

export function recipeProgress(
  recipe: RecipeComponent[],
  checklist: Record<string, boolean>,
): number {
  if (!recipe.length) return 0
  let weightSum = 0
  let earned = 0

  const visit = (nodes: RecipeComponent[]) => {
    for (const node of nodes) {
      const w = WEIGHTS[node.category] ?? 15
      weightSum += w
      const owned = node.countOwned ?? 0
      const pct = checklist[node.id]
        ? 1
        : Math.min(1, owned / Math.max(1, node.countRequired))
      earned += w * pct
      if (node.subComponents?.length) visit(node.subComponents)
    }
  }
  visit(recipe)
  if (weightSum === 0) return 0
  return Math.round((earned / weightSum) * 100)
}

/** Estimate gold needed for remaining leaf materials (TP sell price unit = copper). */
export function estimateGoldRemaining(
  recipe: RecipeComponent[],
  tpPricesCopper: Record<number, number>,
  checklist: Record<string, boolean>,
): number {
  let copper = 0
  const visit = (nodes: RecipeComponent[]) => {
    for (const node of nodes) {
      if (node.subComponents?.length) {
        visit(node.subComponents)
        continue
      }
      if (checklist[node.id]) continue
      if (!node.gw2ItemId) continue
      const price = tpPricesCopper[node.gw2ItemId]
      if (!price) continue
      const need = Math.max(0, node.countRequired - (node.countOwned ?? 0))
      copper += price * need
    }
  }
  visit(recipe)
  return copper / 10000
}

export function formatGold(gold: number): string {
  if (gold <= 0) return '0g'
  if (gold < 1) return `${Math.round(gold * 100)}s`
  return `${gold.toFixed(gold >= 100 ? 0 : 1)}g`
}

export const RECIPE_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  precursor: { label: 'Precursor', color: '#c084fc' },
  gifts: { label: 'Gift', color: '#f5ba4a' },
  currencies: { label: 'Currency', color: '#60a5fa' },
  t6_materials: { label: 'T6', color: '#4ade80' },
  clovers_coins: { label: 'Clovers', color: '#fbbf24' },
  map_gamemodes: { label: 'Map / WvW', color: '#2dd4bf' },
  other: { label: 'Other', color: '#94a3b8' },
}
