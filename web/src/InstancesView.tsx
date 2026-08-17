import { useMemo, useState } from 'react'
import type {
  AchievementProgress,
  EncounterClear,
  InstancesSnapshot,
  RaidWingClear,
} from './lib/instanceTypes'

const STRIKE_GROUP_ORDER = [
  'Icebrood Saga',
  'End of Dragons',
  'Secrets of the Obscure',
  'Living World',
  'Other',
] as const

const STRIKE_GROUP_BY_ID: Record<string, string> = {
  shiverpeaks_pass: 'Icebrood Saga',
  voice_of_the_fallen_and_claw_of_the_fallen: 'Icebrood Saga',
  fraenir_of_jormag: 'Icebrood Saga',
  boneskinner: 'Icebrood Saga',
  whisper_of_jormag: 'Icebrood Saga',
  forging_steel: 'Icebrood Saga',
  cold_war: 'Icebrood Saga',
  aetherblade_hideout: 'End of Dragons',
  xunlai_jade_junkyard: 'End of Dragons',
  kaineng_overlook: 'End of Dragons',
  harvest_temple: 'End of Dragons',
  old_lions_court: 'Living World',
  cosmic_observatory: 'Secrets of the Obscure',
  temple_of_febe: 'Secrets of the Obscure',
}

interface Props {
  snapshot: InstancesSnapshot | null
  loading: boolean
  error: string | null
  connected: boolean
  onConnect: () => void
  onRefresh: () => void
}

type InstSection = 'fractals' | 'raids' | 'strikes' | 'dungeons'

function ProgressRow({ a }: { a: AchievementProgress }) {
  const pct = a.max > 0 ? Math.min(100, Math.round((a.current / a.max) * 100)) : 0
  return (
    <div className={`inst-ach${a.done ? ' done' : ''}`}>
      <div className="inst-ach-top">
        <strong>{a.name}</strong>
        <span>{a.done ? 'Done' : `${a.current}/${a.max}`}</span>
      </div>
      {a.detail && <p className="inst-ach-detail">{a.detail}</p>}
      <div className="inst-bar" aria-hidden>
        <i style={{ width: `${a.done ? 100 : pct}%` }} />
      </div>
    </div>
  )
}

function EncounterChip({ e }: { e: EncounterClear }) {
  return (
    <div
      className={`inst-chip${e.cleared ? ' cleared' : ''}${e.kind === 'checkpoint' ? ' checkpoint' : ''}`}
      title={e.cleared ? 'Cleared this week' : 'Not cleared this week'}
    >
      <span className="inst-chip-mark" aria-hidden>
        {e.cleared ? '✓' : '○'}
      </span>
      <span className="inst-chip-name">{e.name}</span>
    </div>
  )
}

function RaidWingCard({ wing }: { wing: RaidWingClear }) {
  return (
    <div className="inst-wing">
      <div className="inst-wing-head">
        <div>
          <strong>{wing.name}</strong>
          <div className="inst-wing-meta">{wing.raidName}</div>
        </div>
        <span className={wing.clearedBosses === wing.totalBosses ? 'inst-pill done' : 'inst-pill'}>
          {wing.clearedBosses}/{wing.totalBosses}
        </span>
      </div>
      <div className="inst-chip-grid">
        {wing.encounters.map((e) => (
          <EncounterChip key={e.id} e={e} />
        ))}
      </div>
    </div>
  )
}

export default function InstancesView({
  snapshot,
  loading,
  error,
  connected,
  onConnect,
  onRefresh,
}: Props) {
  const [section, setSection] = useState<InstSection>('fractals')
  const [hideCleared, setHideCleared] = useState(false)

  const raidSummary = useMemo(() => {
    if (!snapshot) return { cleared: 0, total: 0 }
    let cleared = 0
    let total = 0
    for (const w of snapshot.raids) {
      cleared += w.clearedBosses
      total += w.totalBosses
    }
    return { cleared, total }
  }, [snapshot])

  const strikeSummary = useMemo(() => {
    if (!snapshot) return { cleared: 0, total: 0 }
    const list = snapshot.strikes
    return {
      cleared: list.filter((s) => s.cleared).length,
      total: list.length,
    }
  }, [snapshot])

  const strikeGroups = useMemo(() => {
    if (!snapshot) return []
    const map = new Map<string, EncounterClear[]>()
    for (const s of snapshot.strikes) {
      if (hideCleared && s.cleared) continue
      const g = STRIKE_GROUP_BY_ID[s.id] ?? 'Other'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(s)
    }
    return STRIKE_GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      title: g,
      items: map.get(g)!,
    }))
  }, [snapshot, hideCleared])

  const dungeonGroups = useMemo(() => {
    if (!snapshot) return []
    const map = new Map<string, typeof snapshot.dungeons>()
    for (const d of snapshot.dungeons) {
      if (hideCleared && d.cleared) continue
      if (!map.has(d.dungeonName)) map.set(d.dungeonName, [])
      map.get(d.dungeonName)!.push(d)
    }
    return [...map.entries()].map(([title, items]) => ({ title, items }))
  }, [snapshot, hideCleared])

  const visibleRaids = useMemo(() => {
    if (!snapshot) return []
    if (!hideCleared) return snapshot.raids
    return snapshot.raids
      .map((w) => ({
        ...w,
        encounters: w.encounters.filter((e) => !e.cleared),
      }))
      .filter((w) => w.encounters.length > 0)
  }, [snapshot, hideCleared])

  if (!connected) {
    return (
      <div className="stash-empty">
        <h2>Instances</h2>
        <p>
          Connect your GW2 API key (account + progression) to track weekly raid and strike clears,
          fractal weeklies/dailies, and daily dungeon paths.
        </p>
        <button type="button" className="primary" onClick={onConnect}>
          Connect API Key
        </button>
      </div>
    )
  }

  return (
    <div className="inst">
      <div className="inst-hero">
        <div>
          <h2>Instances</h2>
          <p className="inst-blurb">
            Weekly raid & strike clears, fractal progress, and daily dungeon paths — from the
            official API.
          </p>
        </div>
        <div className="inst-summary">
          <div>
            <span className="label">Raids</span>
            <strong>
              {raidSummary.cleared}/{raidSummary.total}
            </strong>
          </div>
          <div>
            <span className="label">Strikes</span>
            <strong>
              {strikeSummary.cleared}/{strikeSummary.total}
            </strong>
          </div>
        </div>
      </div>

      <div className="stash-toolbar-row" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`chip${hideCleared ? ' filter-on' : ''}`}
          onClick={() => setHideCleared((v) => !v)}
        >
          {hideCleared ? 'Cleared hidden' : 'Hide cleared'}
        </button>
        <button type="button" className="chip" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="stash-error">{error}</div>}
      {snapshot?.scopeFail && (
        <div className="stash-error">
          Need account + progression permissions on your API key for raid/strike clears.
        </div>
      )}

      <div className="stash-sections" role="tablist" aria-label="Instance types">
        {(
          [
            ['fractals', 'Fractals'],
            ['raids', 'Raids'],
            ['strikes', 'Strikes'],
            ['dungeons', 'Dungeons'],
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
          <p>Loading instance clears…</p>
        </div>
      ) : !snapshot ? (
        <div className="stash-empty">
          <p>No instance data yet. Tap Refresh after connecting.</p>
        </div>
      ) : (
        <>
          {section === 'fractals' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Weekly Fractals</h3>
                <span>
                  {snapshot.fractalWeekly.filter((a) => a.done).length}/
                  {snapshot.fractalWeekly.length} done
                </span>
              </div>
              <div className="inst-ach-list">
                {snapshot.fractalWeekly.map((a) => (
                  <ProgressRow key={a.id} a={a} />
                ))}
              </div>

              <div className="stash-panel-head" style={{ marginTop: 16 }}>
                <h3>Daily Fractals</h3>
                <span>
                  {snapshot.dailyApiActive
                    ? `${snapshot.fractalDaily.filter((a) => a.done).length}/${snapshot.fractalDaily.length}`
                    : '—'}
                </span>
              </div>
              {!snapshot.dailyApiActive ? (
                <p className="stash-muted">
                  ArenaNet&apos;s daily achievements API is inactive right now, so today&apos;s
                  specific fractal scales can&apos;t be listed. Weekly fractal fighters above still
                  update normally.
                </p>
              ) : snapshot.fractalDaily.length === 0 ? (
                <p className="stash-muted">No daily fractal achievements returned for today.</p>
              ) : (
                <div className="inst-ach-list">
                  {snapshot.fractalDaily.map((a) => (
                    <ProgressRow key={a.id} a={a} />
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'raids' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Weekly Raid Clears</h3>
                <span>
                  {raidSummary.cleared}/{raidSummary.total} bosses
                </span>
              </div>
              {visibleRaids.length === 0 ? (
                <p className="stash-muted">
                  {hideCleared ? 'All listed bosses cleared this week.' : 'No raid data.'}
                </p>
              ) : (
                <div className="inst-wing-list">
                  {visibleRaids.map((w) => (
                    <RaidWingCard key={w.id} wing={w} />
                  ))}
                </div>
              )}
              <p className="inst-footnote">Resets with the weekly raid reset (Monday 07:30 UTC).</p>
            </div>
          )}

          {section === 'strikes' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Strike / Raid Encounters</h3>
                <span>
                  {strikeSummary.cleared}/{strikeSummary.total}
                </span>
              </div>
              <p className="stash-muted" style={{ marginBottom: 10 }}>
                Former strike missions now share the weekly raid-encounter clear list. If ArenaNet
                exposes a clear, it lights up here after you kill the boss.
              </p>
              {strikeGroups.length === 0 ? (
                <p className="stash-muted">
                  {hideCleared ? 'All tracked strikes cleared this week.' : 'No strike rows.'}
                </p>
              ) : (
                <div className="inst-wing-list">
                  {strikeGroups.map((g) => (
                    <div key={g.title} className="inst-wing">
                      <div className="inst-wing-head">
                        <strong>{g.title}</strong>
                        <span className="inst-pill">
                          {g.items.filter((i) => i.cleared).length}/{g.items.length}
                        </span>
                      </div>
                      <div className="inst-chip-grid">
                        {g.items.map((e) => (
                          <EncounterChip key={e.id} e={e} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'dungeons' && (
            <div className="stash-panel">
              <div className="stash-panel-head">
                <h3>Daily Dungeon Paths</h3>
                <span>
                  {snapshot.dungeons.filter((d) => d.cleared).length}/
                  {snapshot.dungeons.length} paths
                </span>
              </div>
              {dungeonGroups.length === 0 ? (
                <p className="stash-muted">
                  {hideCleared ? 'All explorable paths cleared today.' : 'No dungeon data.'}
                </p>
              ) : (
                <div className="inst-wing-list">
                  {dungeonGroups.map((g) => (
                    <div key={g.title} className="inst-wing">
                      <div className="inst-wing-head">
                        <strong>{g.title}</strong>
                        <span className="inst-pill">
                          {g.items.filter((i) => i.cleared).length}/{g.items.length}
                        </span>
                      </div>
                      <div className="inst-chip-grid">
                        {g.items.map((p) => (
                          <EncounterChip
                            key={p.pathId}
                            e={{
                              id: p.pathId,
                              name: p.pathName,
                              kind: 'boss',
                              cleared: p.cleared,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="inst-footnote">Dungeon path clears reset daily (00:00 UTC).</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
