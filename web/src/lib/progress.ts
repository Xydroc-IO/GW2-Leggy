import type { Legendary } from './types'

export function unlockedCount(
  item: Legendary,
  armory: Map<number, number> | null,
): number {
  if (!armory) return 0
  return item.pieceIds.reduce((sum, id) => sum + (armory.get(id) ?? 0), 0)
}

export function isFullyUnlocked(
  item: Legendary,
  armory: Map<number, number> | null,
): boolean {
  if (!armory) return false
  const needed = item.pieceIds.length
  const have = item.pieceIds.filter((id) => (armory.get(id) ?? 0) > 0).length
  return have >= needed
}

export function progressPct(
  item: Legendary,
  armory: Map<number, number> | null,
): number {
  if (!armory || item.pieceIds.length === 0) return 0
  const have = item.pieceIds.filter((id) => (armory.get(id) ?? 0) > 0).length
  return Math.round((have / item.pieceIds.length) * 100)
}

export function expansionOrder(exp: string): number {
  const order = ['Core', 'HoT', 'PoF', 'EoD', 'SOTO', 'JW', 'VoE']
  const i = order.indexOf(exp)
  return i === -1 ? 99 : i
}

export function categoryLabel(cat: string): string {
  switch (cat) {
    case 'weapons':
      return 'Weapons'
    case 'armor':
      return 'Armor'
    case 'back':
      return 'Back Items'
    case 'trinkets':
      return 'Trinkets'
    case 'runes_sigils_relics':
      return 'Runes & Relics'
    default:
      return cat
  }
}

export function subCategoryLabel(sub: string): string {
  const map: Record<string, string> = {
    gen1: 'Gen 1',
    gen2: 'Gen 2',
    gen3: 'Gen 3',
    underwater: 'Underwater',
    standalone: 'Standalone',
    obsidian: 'Obsidian',
    raid: 'Raids',
    wvw: 'WvW',
    pvp: 'PvP',
    aquatic: 'Aquatic',
    backpack: 'Back',
    accessory: 'Accessory',
    ring: 'Ring',
    amulet: 'Amulet',
    rune: 'Rune',
    sigil: 'Sigil',
    relic: 'Relic',
  }
  return map[sub] ?? sub
}
