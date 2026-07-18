import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Header } from '../components/ui'
import { OverflowMenu } from '../components/OverflowMenu'
import type { MenuItem } from '../components/OverflowMenu'
import { TeamPhoto } from '../components/TeamPhoto'
import { MatchResultSheet } from '../components/MatchResultSheet'
import { repository } from '../data'
import {
  decideBestOfOne,
  generateBracket,
  getChampionId,
  recordGameWin,
  resetMatchResult,
  roundLabel,
} from '../domain/bracket'
import { computePool } from '../domain/pool'
import type { Championship, Match, Team } from '../domain/types'
import { formatCents } from '../utils/money'

export function BracketScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [championship, setChampionship] = useState<
    Championship | null | undefined
  >(undefined)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const onError = (e: unknown) => {
      if (!active) return
      console.error('Falha ao carregar o chaveamento', e)
      setChampionship(null)
    }
    repository.getChampionship(id).then((c) => {
      if (active) setChampionship(c ?? null)
    }, onError)
    repository.listTeams(id).then((ts) => {
      if (active) setTeams(ts)
    }, onError)
    repository.listMatches(id).then((ms) => {
      if (active) setMatches(ms)
    }, onError)
    return () => {
      active = false
    }
  }, [id])

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>()
    for (const t of teams) map.set(t.id, t)
    return map
  }, [teams])
  const teamById = (teamId?: string) =>
    teamId ? teamsById.get(teamId) : undefined

  /** Persiste as partidas e sincroniza a finalização do campeonato. */
  async function applyMatches(next: Match[]) {
    setMatches(next)
    await repository.saveMatches(next)
    if (!championship) return

    const champion = getChampionId(next)
    if (champion && championship.status !== 'finished') {
      const updated: Championship = {
        ...championship,
        status: 'finished',
        championTeamId: champion,
        updatedAt: new Date().toISOString(),
      }
      setChampionship(updated)
      await repository.saveChampionship(updated)
    } else if (!champion && championship.status === 'finished') {
      const updated: Championship = {
        ...championship,
        status: 'in_progress',
        championTeamId: undefined,
        updatedAt: new Date().toISOString(),
      }
      setChampionship(updated)
      await repository.saveChampionship(updated)
    }
  }

  async function redraw() {
    if (!championship) return
    const hasResults = matches.some((m) => m.winnerTeamId && !m.bye)
    if (
      hasResults &&
      !confirm('A chave será refeita e os resultados serão perdidos. Continuar?')
    ) {
      return
    }
    const fresh = generateBracket(
      championship.id,
      teams.map((t) => t.id),
    )
    await repository.deleteMatchesOfChampionship(championship.id)
    await repository.saveMatches(fresh)
    const updated: Championship = {
      ...championship,
      status: 'in_progress',
      championTeamId: undefined,
      updatedAt: new Date().toISOString(),
    }
    setChampionship(updated)
    await repository.saveChampionship(updated)
    setMatches(fresh)
    setSelectedId(null)
  }

  async function deleteChampionship() {
    if (!championship) return
    if (
      !confirm(
        `Excluir o campeonato "${championship.name}"? Essa ação não pode ser desfeita.`,
      )
    ) {
      return
    }
    await repository.deleteChampionship(championship.id)
    navigate('/')
  }

  const rounds = useMemo(() => groupByRound(matches), [matches])
  const selected = selectedId
    ? matches.find((m) => m.id === selectedId) ?? null
    : null
  const champion = teamById(championship?.championTeamId)

  // Re-sorteio só faz sentido com o campeonato em andamento; um finalizado
  // fica bloqueado. Excluir está disponível em qualquer fase.
  const menuItems: MenuItem[] = [
    ...(championship?.status === 'in_progress'
      ? [{ label: '🎲 Sortear novamente', onClick: redraw }]
      : []),
    { label: 'Excluir campeonato', onClick: deleteChampionship, danger: true },
  ]

  if (championship === undefined) {
    return (
      <div className="flex min-h-svh flex-col">
        <Header title="Chaveamento" backTo="/" />
        <p className="mt-10 text-center text-slate-500">Carregando…</p>
      </div>
    )
  }

  if (championship === null) {
    return (
      <div className="flex min-h-svh flex-col">
        <Header title="Chaveamento" backTo="/" />
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p>Campeonato não encontrado.</p>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Header
        title={championship.name}
        backTo="/"
        action={<OverflowMenu items={menuItems} />}
      />

      <main className="flex flex-1 flex-col gap-6 px-4 py-5">
        {champion && (
          <div className="rounded-2xl bg-emerald-600 p-5 text-center text-white">
            <p className="text-sm font-medium opacity-90">🏆 Campeão</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <TeamPhoto
                photoId={champion.photoId}
                name={champion.name}
                className="size-12 ring-2 ring-white/70"
              />
              <p className="text-2xl font-bold">{champion.name}</p>
            </div>
          </div>
        )}

        {championship.betEnabled && (
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">💰 Bolão</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {formatCents(championship.entryFeeCents)} por time
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Prêmio do campeão
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCents(computePool(teams, championship.entryFeeCents).prizeCents)}
                </p>
              </div>
              <p className="text-xs text-slate-400">
                {teams.length} {teams.length === 1 ? 'time' : 'times'}
              </p>
            </div>
          </div>
        )}

        {rounds.map((round) => (
          <section key={round.round} className="flex flex-col gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {roundLabel(round.matches.length)}
            </h2>
            {round.matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                teamById={teamById}
                onOpen={() => setSelectedId(match.id)}
              />
            ))}
          </section>
        ))}
      </main>

      {selected && (
        <MatchResultSheet
          match={selected}
          teamById={teamById}
          onDecideBestOfOne={(mid, tid) =>
            applyMatches(decideBestOfOne(matches, mid, tid))
          }
          onRecordGame={(mid, tid) =>
            applyMatches(recordGameWin(matches, mid, tid))
          }
          onResetMatch={(mid) => applyMatches(resetMatchResult(matches, mid))}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

interface RoundGroup {
  round: number
  matches: Match[]
}

function groupByRound(matches: Match[]): RoundGroup[] {
  const byRound = new Map<number, Match[]>()
  for (const m of matches) {
    const list = byRound.get(m.round) ?? []
    list.push(m)
    byRound.set(m.round, list)
  }
  return [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, ms]) => ({
      round,
      matches: ms.sort((a, b) => a.order - b.order),
    }))
}

function MatchCard({
  match,
  teamById,
  onOpen,
}: {
  match: Match
  teamById: (id?: string) => Team | undefined
  onOpen: () => void
}) {
  const teamA = teamById(match.sideATeamId)
  const teamB = teamById(match.sideBTeamId)
  const bothPresent = !!teamA && !!teamB
  const decided = !!match.winnerTeamId
  const clickable = bothPresent && !match.bye
  const isFinal = match.bestOf === 3

  let meta: { text: string; className: string }
  if (match.bye) {
    meta = { text: 'BYE — avançou', className: 'text-slate-400' }
  } else if (decided) {
    meta = { text: 'Encerrada', className: 'text-slate-400' }
  } else if (bothPresent) {
    meta = {
      text: '● Disponível — tocar para registrar',
      className: 'text-emerald-600 dark:text-emerald-400',
    }
  } else {
    meta = { text: 'Aguardando', className: 'text-amber-600 dark:text-amber-400' }
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        bothPresent && !decided && !match.bye
          ? 'border-emerald-500 ring-2 ring-emerald-500/20'
          : 'border-slate-200 dark:border-slate-800'
      } ${clickable ? 'cursor-pointer' : ''} bg-white dark:bg-slate-900`}
      onClick={clickable ? onOpen : undefined}
      role={clickable ? 'button' : undefined}
    >
      <SideRow
        team={teamA}
        wins={match.winsA}
        isWinner={decided && match.winnerTeamId === match.sideATeamId}
        showScore={isFinal && bothPresent}
      />
      <div className="border-t border-slate-100 dark:border-slate-800" />
      <SideRow
        team={teamB}
        wins={match.winsB}
        isWinner={decided && match.winnerTeamId === match.sideBTeamId}
        showScore={isFinal && bothPresent}
        bye={match.bye}
      />
      <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 dark:bg-slate-800/50">
        <span className={`text-[11px] font-semibold ${meta.className}`}>
          {meta.text}
        </span>
        {isFinal && (
          <span className="text-[11px] font-semibold text-slate-400">
            Melhor de 3
          </span>
        )}
      </div>
    </div>
  )
}

function SideRow({
  team,
  wins,
  isWinner,
  showScore,
  bye,
}: {
  team: Team | undefined
  wins: number
  isWinner: boolean
  showScore: boolean
  bye?: boolean
}) {
  if (!team) {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="size-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
        <span className="text-sm italic text-slate-400">
          {bye ? '(bye)' : 'A definir'}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <TeamPhoto photoId={team.photoId} name={team.name} className="size-9" />
      <span
        className={`min-w-0 flex-1 truncate font-semibold ${
          isWinner ? 'text-emerald-600 dark:text-emerald-400' : ''
        }`}
      >
        {team.name}
      </span>
      {isWinner && <span>👑</span>}
      {showScore && (
        <span className="w-5 text-center font-bold tabular-nums text-slate-500">
          {wins}
        </span>
      )}
    </div>
  )
}
