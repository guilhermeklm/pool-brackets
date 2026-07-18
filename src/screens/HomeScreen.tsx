import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { repository } from '../data'
import type { Championship } from '../domain/types'

const statusLabel: Record<Championship['status'], string> = {
  registration: 'Inscrições',
  in_progress: 'Em andamento',
  finished: 'Finalizado',
}

const statusColor: Record<Championship['status'], string> = {
  registration:
    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  in_progress:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  finished: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export function HomeScreen() {
  const [championships, setChampionships] = useState<Championship[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    repository.listChampionships().then(setChampionships, (e) => {
      console.error('Falha ao listar campeonatos', e)
      setError('Não foi possível carregar os campeonatos.')
    })
  }, [])

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center gap-2 px-4 py-5">
        <span className="text-2xl">🎱</span>
        <h1 className="text-xl font-bold">PoolBrackets</h1>
      </header>

      <main className="flex-1 px-4 pb-28">
        {error ? (
          <p className="mt-10 text-center text-red-600">{error}</p>
        ) : championships === null ? (
          <p className="mt-10 text-center text-slate-500">Carregando…</p>
        ) : championships.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🏆</span>
            <p className="text-lg font-medium">Nenhum campeonato ainda</p>
            <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Crie seu primeiro campeonato de sinuca e comece a cadastrar os
              times.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {championships.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/championship/${c.id}/teams`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{c.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {c.type === 'doubles' ? 'Duplas' : 'Individual'}
                      {c.betEnabled ? ' · com aposta' : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusColor[c.status]}`}
                  >
                    {statusLabel[c.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md border-t border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <Link
          to="/new"
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white hover:bg-emerald-700"
        >
          <span className="text-xl leading-none">+</span> Novo campeonato
        </Link>
      </div>
    </div>
  )
}
