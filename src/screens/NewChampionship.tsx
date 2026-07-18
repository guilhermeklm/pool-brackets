import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Header, Field } from '../components/ui'
import { repository } from '../data'
import { createChampionship } from '../domain/factories'
import type { ChampionshipType } from '../domain/types'
import { maskCents, textToCents } from '../utils/money'

export function NewChampionship() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [type, setType] = useState<ChampionshipType>('individual')
  const [betEnabled, setBetEnabled] = useState(false)
  const [fee, setFee] = useState('') // texto mascarado (ex: "20,00")
  const [pixKey, setPixKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function confirm() {
    if (!name.trim()) {
      setError('Informe o nome do campeonato.')
      return
    }
    setSaving(true)
    const championship = createChampionship({
      name,
      type,
      betEnabled,
      entryFeeCents: textToCents(fee),
      pixKey: betEnabled ? pixKey : undefined,
    })
    await repository.saveChampionship(championship)
    navigate(`/championship/${championship.id}/teams`, { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col">
      <Header title="Novo campeonato" backTo="/" />

      <main className="flex flex-1 flex-col gap-6 px-4 py-5">
        <div className="flex flex-col gap-1.5">
          <Field
            label="Nome do campeonato"
            placeholder="Ex: Rachão da Sexta"
            value={name}
            autoFocus
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError(null)
            }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Tipo
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(['individual', 'doubles'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-xl border px-4 py-3 text-base font-semibold ${
                  type === t
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {t === 'individual' ? 'Individual' : 'Dupla'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <label className="flex items-center justify-between">
            <span className="font-medium">Aposta (bolão)</span>
            <input
              type="checkbox"
              className="size-6 accent-emerald-600"
              checked={betEnabled}
              onChange={(e) => setBetEnabled(e.target.checked)}
            />
          </label>

          {betEnabled && (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Valor da entrada
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900">
                  <span className="text-slate-500">R$</span>
                  <input
                    inputMode="numeric"
                    placeholder="0,00"
                    value={fee}
                    onChange={(e) => setFee(maskCents(e.target.value))}
                    className="w-full bg-transparent text-base outline-none"
                  />
                </div>
              </label>
              <Field
                label="Chave Pix (opcional)"
                placeholder="Para gerar o QR Code depois"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
              />
            </div>
          )}
        </div>
      </main>

      <div className="sticky bottom-0 border-t border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <Button className="w-full" onClick={confirm} disabled={saving}>
          {saving ? 'Criando…' : 'Criar campeonato'}
        </Button>
      </div>
    </div>
  )
}
