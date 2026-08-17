export type EncounterClear = {
  id: string
  name: string
  kind: 'boss' | 'checkpoint' | 'strike'
  cleared: boolean
}

export type RaidWingClear = {
  id: string
  name: string
  raidId: string
  raidName: string
  encounters: EncounterClear[]
  clearedBosses: number
  totalBosses: number
}

export type AchievementBit = {
  index: number
  label: string
  done: boolean
}

export type AchievementProgress = {
  id: number
  name: string
  current: number
  max: number
  done: boolean
  detail?: string
  /** Per-fractal bits when the achievement exposes them (weekly fighters). */
  bits?: AchievementBit[]
}

export type DungeonPathClear = {
  dungeonId: string
  dungeonName: string
  pathId: string
  pathName: string
  cleared: boolean
}

export type InstancesSnapshot = {
  raids: RaidWingClear[]
  strikes: EncounterClear[]
  fractalDaily: AchievementProgress[]
  fractalWeekly: AchievementProgress[]
  dungeons: DungeonPathClear[]
  clearedEncounterIds: string[]
  /** True when account/raids (and related) failed — usually missing progression scope */
  scopeFail: boolean
  fetchedAt: number
}
