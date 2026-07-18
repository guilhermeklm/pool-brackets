import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Header, Field, PaymentChip } from '../components/ui'
import { PhotoCapture } from '../components/PhotoCapture'
import { TeamPhoto } from '../components/TeamPhoto'
import { repository } from '../data'
import { createTeam } from '../domain/factories'
import { computePool } from '../domain/pool'
import type { Championship, Photo, Team } from '../domain/types'
import { newId } from '../data/uuid'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { formatCents } from '../utils/money'

export function TeamRegistration() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const [championship, setChampionship] = useState<
    Championship | null | undefined
  >(undefined)
  const [teams, setTeams] = useState<Team[]>([])

  // Formulário do novo time.
  const [name, setName] = useState('')
  const [player1, setPlayer1] = useState('')
  const [player2, setPlayer2] = useState('')
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const previewUrl = useObjectUrl(photoBlob)

  useEffect(() => {
    let active = true
    const aoFalhar = (e: unknown) => {
      if (!active) return
      console.error('Falha ao carregar o campeonato', e)
      setChampionship(null)
    }
    repository.getChampionship(id).then((c) => {
      if (active) setChampionship(c ?? null)
    }, aoFalhar)
    repository.listTeams(id).then((ts) => {
      if (active) setTeams(ts)
    }, aoFalhar)
    return () => {
      active = false
    }
  }, [id])

  const isDoubles = championship?.type === 'doubles'
  const nameLabel = isDoubles ? 'Nome do time' : 'Nome do jogador'

  function resetForm() {
    setName('')
    setPlayer1('')
    setPlayer2('')
    setPhotoBlob(null)
    setError(null)
  }

  async function addTeam() {
    if (!championship) return
    if (!name.trim()) {
      setError(isDoubles ? 'Informe o nome do time.' : 'Informe o nome do jogador.')
      return
    }
    if (isDoubles && (!player1.trim() || !player2.trim())) {
      setError('Informe os dois jogadores da dupla.')
      return
    }

    setSaving(true)

    let photoId: string | undefined
    if (photoBlob) {
      const photo: Photo = { id: newId(), championshipId: id, blob: photoBlob }
      await repository.savePhoto(photo)
      photoId = photo.id
    }

    const team = createTeam({
      championshipId: id,
      name,
      player1: isDoubles ? player1 : undefined,
      player2: isDoubles ? player2 : undefined,
      photoId,
    })
    await repository.saveTeam(team)

    setTeams((current) => [...current, team])
    resetForm()
    setSaving(false)
  }

  async function removeTeam(team: Team) {
    if (!confirm(`Remover "${team.name}"?`)) return
    await repository.deleteTeam(team.id)
    if (team.photoId) await repository.deletePhoto(team.photoId)
    setTeams((current) => current.filter((t) => t.id !== team.id))
  }

  async function togglePayment(team: Team) {
    const updated: Team = {
      ...team,
      paymentStatus: team.paymentStatus === 'paid' ? 'pending' : 'paid',
    }
    setTeams((current) => current.map((t) => (t.id === team.id ? updated : t)))
    await repository.saveTeam(updated)
  }

  const total = teams.length
  const countLabel = useMemo(
    () => `${total} ${total === 1 ? 'inscrito' : 'inscritos'}`,
    [total],
  )

  if (championship === undefined) {
    return (
      <div className="flex min-h-svh flex-col">
        <Header title="Times" backTo="/" />
        <p className="mt-10 text-center text-slate-500">Carregando…</p>
      </div>
    )
  }

  if (championship === null) {
    return (
      <div className="flex min-h-svh flex-col">
        <Header title="Times" backTo="/" />
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
        action={
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {countLabel}
          </span>
        }
      />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 pb-6">
        {/* Formulário */}
        <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCapturing(true)}
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-600"
              aria-label="Tirar foto"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Foto do time"
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-2xl">📷</span>
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium">
                Foto {isDoubles ? 'do time' : ''}
              </p>
              <button
                type="button"
                onClick={() => setCapturing(true)}
                className="text-sm font-semibold text-emerald-600"
              >
                {photoBlob ? 'Refazer foto' : 'Tirar foto'}
              </button>
              {photoBlob && (
                <button
                  type="button"
                  onClick={() => setPhotoBlob(null)}
                  className="ml-3 text-sm text-slate-400"
                >
                  Remover
                </button>
              )}
            </div>
          </div>

          <Field
            label={nameLabel}
            placeholder={isDoubles ? 'Ex: Trio do Taco' : 'Ex: João'}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError(null)
            }}
          />

          {isDoubles && (
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Jogador 1"
                placeholder="Ex: Ana"
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
              />
              <Field
                label="Jogador 2"
                placeholder="Ex: Beto"
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={addTeam} disabled={saving}>
            {saving ? 'Salvando…' : 'Adicionar time'}
          </Button>
        </section>

        {/* Lista de times */}
        {teams.length === 0 ? (
          <p className="mt-4 text-center text-sm text-slate-500">
            Nenhum time cadastrado ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <TeamPhoto photoId={team.photoId} name={team.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{team.name}</p>
                  {(team.player1 || team.player2) && (
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {[team.player1, team.player2].filter(Boolean).join(' & ')}
                    </p>
                  )}
                </div>
                {championship.betEnabled && (
                  <PaymentChip
                    paid={team.paymentStatus === 'paid'}
                    onClick={() => togglePayment(team)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeTeam(team)}
                  aria-label={`Remover ${team.name}`}
                  className="shrink-0 rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>

      {championship.betEnabled && (
        <div className="sticky bottom-0 border-t border-slate-200 bg-white/90 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <Link
            to={`/championship/${id}/pool`}
            className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3.5 font-semibold dark:bg-slate-800"
          >
            <span>💰 Bolão</span>
            <span className="text-emerald-600 dark:text-emerald-400">
              {formatCents(computePool(teams, championship.entryFeeCents).collectedCents)}{' '}
              arrecadado ›
            </span>
          </Link>
        </div>
      )}

      {capturing && (
        <PhotoCapture
          onConfirm={(photo) => {
            setPhotoBlob(photo)
            setCapturing(false)
          }}
          onCancel={() => setCapturing(false)}
        />
      )}
    </div>
  )
}
