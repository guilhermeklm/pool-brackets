import { useState } from 'react'
import { Button } from './ui'
import { TeamPhoto } from './TeamPhoto'
import type { Match, Team } from '../domain/types'

/**
 * Bottom sheet para registrar/corrigir o resultado de uma partida.
 * - Melhor de 1: escolhe o vencedor direto (e permite corrigir).
 * - Melhor de 3 (final): registra jogo a jogo com placar parcial até 2 vitórias.
 * As ações não fecham o painel — o organizador fecha ao terminar.
 */
export function MatchResultSheet({
  match,
  teamById,
  onDecideBestOfOne,
  onRecordGame,
  onResetMatch,
  onClose,
}: {
  match: Match
  teamById: (id?: string) => Team | undefined
  onDecideBestOfOne: (matchId: string, teamId: string) => void
  onRecordGame: (matchId: string, teamId: string) => void
  onResetMatch: (matchId: string) => void
  onClose: () => void
}) {
  const [correcting, setCorrecting] = useState(false)

  const teamA = teamById(match.sideATeamId)
  const teamB = teamById(match.sideBTeamId)
  const isFinal = match.bestOf === 3
  const decided = !!match.winnerTeamId
  const winner = teamById(match.winnerTeamId)

  function sideButton(team: Team) {
    const label = isFinal ? 'venceu o jogo' : 'venceu'
    return (
      <button
        type="button"
        onClick={() => {
          if (isFinal) onRecordGame(match.id, team.id)
          else onDecideBestOfOne(match.id, team.id)
          setCorrecting(false)
        }}
        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-left transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-emerald-950"
      >
        <TeamPhoto photoId={team.photoId} name={team.name} className="size-10" />
        <span className="min-w-0 flex-1 truncate font-semibold">{team.name}</span>
        <span className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {label} ›
        </span>
      </button>
    )
  }

  const showChoices = !decided || correcting

  return (
    <>
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-3xl border-t border-slate-200 bg-white p-5 pb-8 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />

        <h2 className="text-center text-lg font-semibold">
          {isFinal ? 'Final · melhor de 3' : 'Registrar resultado'}
        </h2>

        {isFinal && teamA && teamB && (
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Placar parcial
          </p>
        )}
        {isFinal && teamA && teamB && (
          <p className="mt-1 text-center text-3xl font-bold tabular-nums">
            {match.winsA} <span className="text-slate-300">–</span> {match.winsB}
          </p>
        )}

        {decided && !correcting && winner && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-950">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {isFinal ? '🏆 Campeão' : 'Vencedor'}
            </p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {winner.name}
            </p>
          </div>
        )}

        {showChoices && teamA && teamB && (
          <div className="mt-4 flex flex-col gap-2.5">
            {isFinal && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Quem venceu este jogo?
              </p>
            )}
            {sideButton(teamA)}
            {sideButton(teamB)}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {decided && !correcting && (
            <Button
              variant="secondary"
              onClick={() => {
                if (isFinal) {
                  if (confirm('Zerar o placar da final para corrigir?')) {
                    onResetMatch(match.id)
                  }
                } else {
                  setCorrecting(true)
                }
              }}
            >
              Corrigir resultado
            </Button>
          )}
          {correcting && (
            <Button variant="secondary" onClick={() => setCorrecting(false)}>
              Cancelar correção
            </Button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="py-2 text-center font-semibold text-slate-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  )
}
