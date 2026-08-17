export type Category =
  | 'all'
  | 'weapons'
  | 'armor'
  | 'back'
  | 'trinkets'
  | 'runes_sigils_relics'

export interface LegendaryPiece {
  id: number
  name: string
  icon: string
}

export type RecipeCategory =
  | 'precursor'
  | 'gifts'
  | 'currencies'
  | 't6_materials'
  | 'clovers_coins'
  | 'map_gamemodes'
  | 'other'

export interface RecipeComponent {
  id: string
  name: string
  countRequired: number
  category: RecipeCategory | string
  gw2ItemId?: number
  gw2CurrencyId?: number
  icon?: string
  description?: string
  subComponents?: RecipeComponent[]
  /** Filled at runtime from inventory / checklist */
  countOwned?: number
}

export interface Legendary {
  id: string
  gw2ItemId: number
  name: string
  category: Exclude<Category, 'all'>
  subCategory: string
  typeLabel: string
  expansion: string
  description: string
  defaultIcon: string
  wikiUrl: string
  pieceIds: number[]
  pieces: LegendaryPiece[]
  maxCount: number
}

export type SortMode = 'name' | 'expansion' | 'progress'
