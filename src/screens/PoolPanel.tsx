import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Header, PaymentChip } from '../components/ui'
import { TeamPhoto } from '../components/TeamPhoto'
import { repository } from '../data'
import { computePool } from '../domain/pool'
import type { Championship, Team } from '../domain/types'
import { formatCents } from '../utils/money'

export function PoolPanel() {
  const { id = '' } = useParams()

  const [championship, setChampionship] = useState<
    Championship | null | undefined
  >(undefined)
  const [teams, setTeams] = useState<Team[]>([])

  useEffect(() => {
    let active = true
    const onError = (e: unknown) => {
      if (!active) return
      console.error('Falha ao carregar o bolão', e)
      setChampionship(null)
    }
    repository.getChampionship(id).then((c) => {
      if (active) setChampionship(c ?? null)
    }, onError)
    repository.listTeams(id).then((ts) => {
      if (active) setTeams(ts)
    }, onError)
    return () => {
      active = false
    }
  }, [id])

  async function markPaid(team: Team) {
    const updated: Team = { ...team, paymentStatus: 'paid' }
    setTeams((current) => current.map((t) => (t.id === team.id ? updated : t)))
    await repository.saveTeam(updated)
  }

  const backTo = `/championship/${id}/teams`

  if (championship === undefined) {
    return (
      <div className="flex min-h-svh flex-col">
        <Header title="Bolão" backTo={backTo} />
        <p className="mt-10 text-center text-slate-500">Carregando…</p>
      </div>
    )
  }

  if (championship === null || !championship.betEnabled) {
    return (
      <div className="flex min-h-svh flex-col">
        <Header title="Bolão" backTo={backTo} />
        <p className="mt-10 text-center text-slate-500">
          Este campeonato não tem aposta ativa.
        </p>
      </div>
    )
  }

  const pool = computePool(teams, championship.entryFeeCents)
  const unpaid = teams.filter((t) => t.paymentStatus === 'pending')

  return (
    <div className="flex min-h-svh flex-col">
      <Header title="Bolão" backTo={backTo} />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Entrada de {formatCents(championship.entryFeeCents)} por time
        </p>

        {/* Destaque: prêmio do campeão */}
        <div className="rounded-2xl bg-emerald-600 p-5 text-center text-white">
          <p className="text-sm font-medium opacity-90">Prêmio do campeão</p>
          <p className="mt-1 text-4xl font-bold">
            {formatCents(pool.prizeCents)}
          </p>
          <p className="mt-1 text-xs opacity-80">
            Sobre o pote previsto ({teams.length}{' '}
            {teams.length === 1 ? 'time' : 'times'})
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Arrecadado"
            value={formatCents(pool.collectedCents)}
            hint={`${pool.paidCount} pago${pool.paidCount === 1 ? '' : 's'}`}
            tone="emerald"
          />
          <SummaryCard
            label="Pendente"
            value={formatCents(pool.pendingCents)}
            hint={`${pool.pendingCount} a pagar`}
            tone="amber"
          />
        </div>

        {/* Quem ainda não pagou */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Ainda não pagaram
          </h2>
          {unpaid.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-slate-800">
              {teams.length === 0
                ? 'Nenhum time cadastrado ainda.'
                : 'Todos pagaram! 🎉'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {unpaid.map((team) => (
                <li
                  key={team.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <TeamPhoto photoId={team.photoId} name={team.name} />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {team.name}
                  </span>
                  <PaymentChip paid={false} onClick={() => markPaid(team)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {championship.pixKey && (
          <p className="text-center text-xs text-slate-400">
            Chave Pix: {championship.pixKey}
          </p>
        )}
      </main>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: 'emerald' | 'amber'
}) {
  const valueColor =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-amber-600 dark:text-amber-400'
  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  )
}
