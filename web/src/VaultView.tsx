import { useMemo, useState } from 'react'
import type {
  VaultBoard,
  VaultBoardFilter,
  VaultObjective,
  VaultSnapshot,
} from './lib/vaultTypes'

interface Props {
  snapshot: VaultSnapshot | null
  loading: boolean
  error: string | null
  connected: boolean
  onConnect: () => void
  onRefresh: () => void
}

function isDone(o: VaultObjective) {
  return o.claimed || (o.progressComplete > 0 && o.progressCurrent >= o.progressComplete)
}

function countLeft(list: VaultObjective[]) {
  return list.filter((o) => !isDone(o)).length
}

function formatResetCountdown(kind: 'daily' | 'weekly'): string {
  const now = new Date()
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0,
  ))
  if (kind === 'daily') {
    next.setUTCDate(next.getUTCDate() + 1)
  } else {
    // Weekly reset Monday 07:30 UTC historically; use next Monday 00:00 UTC as approx
    const day = next.getUTCDay() // 0 Sun
    const add = ((8 - day) % 7) || 7
    next.setUTCDate(next.getUTCDate() + add)
  }
  let sec = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
  const h = Math.floor(sec / 3600)
  sec %= 3600
  const m = Math.floor(sec / 60)
  if (h >= 24) {
    const d = Math.floor(h / 24)
    return `${d}d ${h % 24}h`
  }
  return `${h}h ${m}m`
}

function MetaBar({ board, label }: { board: VaultBoard; label: string }) {
  if (board.metaProgressComplete <= 0) return null
  const pct = Math.min(
    100,
    Math.round((board.metaProgressCurrent / board.metaProgressComplete) * 100),
  )
  return (
    <div className="vault-meta">
      <div className="vault-meta-head">
        <span>{label} meta</span>
        <span>
          {board.metaProgressCurrent}/{board.metaProgressComplete}
          {board.metaRewardAstral > 0 ? ` · +${board.metaRewardAstral} AA` : ''}
          {board.metaRewardClaimed ? ' · claimed' : ''}
        </span>
      </div>
      <div className="craft-meter tall" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ObjectiveRow({ o }: { o: VaultObjective }) {
  const done = isDone(o)
  const need = o.progressComplete
  const cur = Math.min(o.progressCurrent, need || o.progressCurrent)
  const pct = need > 0 ? Math.min(100, Math.round((cur / need) * 100)) : done ? 100 : 0
  return (
    <div className={`vault-obj${done ? ' done' : ''}`}>
      <div className="vault-obj-top">
        {o.track && <span className={`vault-track ${o.track.toLowerCase()}`}>{o.track}</span>}
        <strong className="vault-obj-title">{o.title}</strong>
        <span className="vault-obj-reward">
          {done ? 'Done' : o.acclaim > 0 ? `${o.acclaim} AA` : ''}
        </span>
      </div>
      {need > 0 && (
        <div className="vault-obj-prog">
          <div className="craft-meter" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
          <em>
            {cur} / {need}
          </em>
        </div>
      )}
    </div>
  )
}

function BoardList({
  title,
  board,
  hideDone,
}: {
  title: string
  board: VaultBoard | null
  hideDone: boolean
}) {
  if (!board) {
    return (
      <div className="vault-board">
        <h3>{title}</h3>
        <p className="stash-muted">No data yet — log into GW2 once this season, then refresh.</p>
      </div>
    )
  }
  const list = hideDone ? board.objectives.filter((o) => !isDone(o)) : board.objectives
  const left = countLeft(board.objectives)
  return (
    <div className="vault-board">
      <div className="stash-panel-head">
        <h3>{title}</h3>
        <span>
          {left} left · {board.objectives.length} total
        </span>
      </div>
      <MetaBar board={board} label={title} />
      {list.length === 0 ? (
        <p className="stash-muted">{hideDone ? 'All objectives done.' : 'No objectives.'}</p>
      ) : (
        <div className="vault-list">
          {list.map((o) => (
            <ObjectiveRow key={o.id} o={o} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function VaultView({
  snapshot,
  loading,
  error,
  connected,
  onConnect,
  onRefresh,
}: Props) {
  const [board, setBoard] = useState<VaultBoardFilter>('all')
  const [hideDone, setHideDone] = useState(false)

  const totals = useMemo(() => {
    const daily = snapshot?.daily?.objectives ?? []
    const weekly = snapshot?.weekly?.objectives ?? []
    const special = snapshot?.special?.objectives ?? []
    return {
      dailyLeft: countLeft(daily),
      weeklyLeft: countLeft(weekly),
      specialLeft: countLeft(special),
      allDone:
        daily.length + weekly.length + special.length > 0 &&
        countLeft(daily) + countLeft(weekly) + countLeft(special) === 0,
    }
  }, [snapshot])

  if (!connected) {
    return (
      <div className="stash-empty">
        <h2>Wizard&apos;s Vault</h2>
        <p>
          Connect your GW2 API key (with progression + wallet) to track daily, weekly, and special
          vault objectives — same boards as the in-game helper.
        </p>
        <button type="button" className="primary" onClick={onConnect}>
          Connect API Key
        </button>
      </div>
    )
  }

  return (
    <div className="vault">
      <div className="vault-hero">
        <div>
          <h2>{snapshot?.season?.title ?? "Wizard's Vault"}</h2>
          <p className="vault-blurb">
            {snapshot?.season?.end
              ? `Season ends ${new Date(snapshot.season.end).toLocaleDateString()}`
              : 'Track Astral Acclaim objectives'}
            {' · '}
            Daily {formatResetCountdown('daily')} · Weekly {formatResetCountdown('weekly')}
          </p>
        </div>
        <div className="vault-aa">
          <div className="label">Astral Acclaim</div>
          <div className="value">{snapshot?.astralAcclaim ?? '—'}</div>
        </div>
      </div>

      <div className="stash-toolbar-row" style={{ marginBottom: 12 }}>
        {(
          [
            ['all', 'All'],
            ['daily', `Daily (${totals.dailyLeft})`],
            ['weekly', `Weekly (${totals.weeklyLeft})`],
            ['special', `Special (${totals.specialLeft})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`chip${board === id ? ' active' : ''}`}
            onClick={() => setBoard(id)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={`chip${hideDone ? ' filter-on' : ''}`}
          onClick={() => setHideDone((v) => !v)}
        >
          Hide done
        </button>
        <button type="button" className="chip" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="stash-error">{error}</div>}
      {snapshot?.scopeFail && (
        <div className="stash-error">
          Need account + progression permissions on your API key for vault objectives.
        </div>
      )}
      {totals.allDone && (
        <div className="vault-status-ok">All vault objectives done</div>
      )}

      {loading && !snapshot ? (
        <div className="stash-empty">
          <p>Loading Wizard&apos;s Vault…</p>
        </div>
      ) : (
        <div className="vault-boards">
          {(board === 'all' || board === 'daily') && (
            <BoardList title="Daily" board={snapshot?.daily ?? null} hideDone={hideDone} />
          )}
          {(board === 'all' || board === 'weekly') && (
            <BoardList title="Weekly" board={snapshot?.weekly ?? null} hideDone={hideDone} />
          )}
          {(board === 'all' || board === 'special') && (
            <BoardList title="Special" board={snapshot?.special ?? null} hideDone={hideDone} />
          )}
        </div>
      )}

      <p className="vault-footnote">
        Tip: ArenaNet only refreshes vault API data after you log into the game during the current
        season.
      </p>
    </div>
  )
}
