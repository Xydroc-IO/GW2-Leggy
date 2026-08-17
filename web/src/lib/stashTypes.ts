export type ItemRarity =
  | 'Junk'
  | 'Basic'
  | 'Fine'
  | 'Masterwork'
  | 'Rare'
  | 'Exotic'
  | 'Ascended'
  | 'Legendary'

export interface Gw2ItemInfo {
  id: number
  name: string
  icon?: string
  rarity: ItemRarity | string
  level?: number
  type?: string
}

export interface StashSlot {
  id: number
  count: number
  /** bag/slot index for layout */
  index: number
}

export interface StashBag {
  id: number | null
  size: number
  slots: (StashSlot | null)[]
}

export interface CharacterStash {
  name: string
  bags: StashBag[]
}

export interface StashSnapshot {
  bank: (StashSlot | null)[]
  shared: (StashSlot | null)[]
  materials: StashSlot[]
  characters: CharacterStash[]
  fetchedAt: number
}

export type MainTab = 'legendaries' | 'stash' | 'vault'
