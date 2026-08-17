export interface VaultObjective {
  id: number
  title: string
  track: string
  acclaim: number
  progressCurrent: number
  progressComplete: number
  claimed: boolean
}

export interface VaultBoard {
  metaProgressCurrent: number
  metaProgressComplete: number
  metaRewardAstral: number
  metaRewardClaimed: boolean
  metaRewardItemId?: number
  objectives: VaultObjective[]
}

export interface VaultSeason {
  title: string
  start: string
  end: string
}

export interface VaultSnapshot {
  season: VaultSeason | null
  daily: VaultBoard | null
  weekly: VaultBoard | null
  special: VaultBoard | null
  astralAcclaim: number
  scopeFail: boolean
  fetchedAt: number
}

export type VaultBoardFilter = 'all' | 'daily' | 'weekly' | 'special'
