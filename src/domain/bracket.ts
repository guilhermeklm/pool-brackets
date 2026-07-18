// Motor de chaveamento: eliminatória simples com sorteio aleatório.
// Funções puras (sem React/persistência) para gerar a chave, avançar o vencedor
// e corrigir resultados propagando a invalidação para as partidas seguintes.
//
// Convenções da árvore:
// - Rodada 1 é a primeira; a rodada final é `log2(bracketSize)`.
// - A partida (rodada r, ordem i) alimenta a (rodada r+1, ordem floor(i/2)),
//   no lado A quando i é par e no lado B quando i é ímpar.
// - Partidas comuns são melhor de 1; a final é melhor de 3.

import { newId } from '../data/uuid'
import type { Match, Side } from './types'

/** Embaralhamento Fisher–Yates. Não muta a entrada. */
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Menor potência de 2 maior ou igual a n (mínimo 1). */
export function nextPowerOfTwo(n: number): number {
  let size = 1
  while (size < n) size *= 2
  return size
}

/** Vitórias necessárias para vencer a partida (1 em bo1, 2 em bo3). */
export function winsNeeded(bestOf: 1 | 3): number {
  return Math.floor(bestOf / 2) + 1
}

/**
 * Gera a chave de eliminatória simples para os times informados.
 * Times que recebem BYE já avançam (vencedor definido) para a 2ª rodada.
 * Lança erro se houver menos de 2 times.
 */
export function generateBracket(
  championshipId: string,
  teamIds: readonly string[],
  rng: () => number = Math.random,
): Match[] {
  if (teamIds.length < 2) {
    throw new Error('São necessários ao menos 2 times para sortear a chave.')
  }

  const teams = shuffle(teamIds, rng)
  const n = teams.length
  const bracketSize = nextPowerOfTwo(n)
  const rounds = Math.log2(bracketSize)
  const byes = bracketSize - n

  // Cria as partidas vazias de todas as rodadas.
  const byRound: Match[][] = []
  for (let r = 1; r <= rounds; r++) {
    const count = bracketSize / 2 ** r
    const roundMatches: Match[] = []
    for (let order = 0; order < count; order++) {
      roundMatches.push({
        id: newId(),
        championshipId,
        round: r,
        order,
        bestOf: r === rounds ? 3 : 1,
        winsA: 0,
        winsB: 0,
        bye: false,
      })
    }
    byRound.push(roundMatches)
  }

  // Linka cada partida à próxima rodada.
  for (let r = 0; r < rounds - 1; r++) {
    for (const match of byRound[r]) {
      const next = byRound[r + 1][Math.floor(match.order / 2)]
      match.nextMatchId = next.id
      match.nextSide = match.order % 2 === 0 ? 'A' : 'B'
    }
  }

  // Distribui os BYEs uniformemente entre as partidas da 1ª rodada.
  const firstRound = byRound[0]
  const m1 = firstRound.length
  const byeMatches = new Set<number>()
  for (let k = 0; k < byes; k++) {
    byeMatches.add(Math.floor((k * m1) / byes))
  }

  // Preenche a 1ª rodada com os times embaralhados.
  let t = 0
  for (let i = 0; i < m1; i++) {
    const match = firstRound[i]
    if (byeMatches.has(i)) {
      match.sideATeamId = teams[t++]
      match.bye = true
    } else {
      match.sideATeamId = teams[t++]
      match.sideBTeamId = teams[t++]
    }
  }

  const map = toMap(byRound.flat())

  // Resolve os BYEs: o time avança sozinho para a próxima rodada.
  for (const match of firstRound) {
    if (match.bye && match.sideATeamId) {
      const m = map.get(match.id)!
      m.winnerTeamId = match.sideATeamId
      advanceWinner(map, m)
    }
  }

  return toArray(map)
}

/**
 * Registra a vitória de um jogo para `teamId` na partida.
 * Serve para melhor de 1 (decide na hora) e melhor de 3 (soma até 2 vitórias).
 * Ao decidir a partida, avança o vencedor para a próxima rodada.
 */
export function recordGameWin(
  matches: Match[],
  matchId: string,
  teamId: string,
): Match[] {
  const map = toMap(matches)
  const match = requireMatch(map, matchId)

  if (!match.sideATeamId || !match.sideBTeamId) {
    throw new Error('A partida ainda não tem os dois lados definidos.')
  }
  if (match.winnerTeamId) {
    throw new Error('A partida já foi decidida. Corrija o resultado antes.')
  }

  const side = teamSide(match, teamId)
  if (side === 'A') match.winsA += 1
  else match.winsB += 1

  const need = winsNeeded(match.bestOf)
  if (match.winsA >= need || match.winsB >= need) {
    match.winnerTeamId = teamId
    advanceWinner(map, match)
  }

  return toArray(map)
}

/**
 * Define/troca diretamente o vencedor de uma partida melhor de 1.
 * Usado para corrigir um resultado: se já havia vencedor diferente, invalida as
 * partidas seguintes que dependiam dele antes de aplicar o novo.
 */
export function decideBestOfOne(
  matches: Match[],
  matchId: string,
  teamId: string,
): Match[] {
  const map = toMap(matches)
  const match = requireMatch(map, matchId)

  if (match.bestOf !== 1) {
    throw new Error('Esta partida não é melhor de 1.')
  }
  if (!match.sideATeamId || !match.sideBTeamId) {
    throw new Error('A partida ainda não tem os dois lados definidos.')
  }
  if (match.winnerTeamId === teamId) return toArray(map)

  if (match.winnerTeamId) clearResult(map, match)

  const side = teamSide(match, teamId)
  match.winnerTeamId = teamId
  match.winsA = side === 'A' ? 1 : 0
  match.winsB = side === 'B' ? 1 : 0
  advanceWinner(map, match)

  return toArray(map)
}

/**
 * Limpa o resultado de uma partida (vencedor e placar) e invalida em cascata as
 * partidas seguintes que dependiam do vencedor anterior.
 */
export function resetMatchResult(matches: Match[], matchId: string): Match[] {
  const map = toMap(matches)
  const match = requireMatch(map, matchId)
  clearResult(map, match)
  return toArray(map)
}

/** Campeão do chaveamento: vencedor da partida final, se houver. */
export function getChampionId(matches: Match[]): string | undefined {
  return getFinalMatch(matches)?.winnerTeamId
}

/** A partida final (maior rodada). */
export function getFinalMatch(matches: Match[]): Match | undefined {
  if (matches.length === 0) return undefined
  return matches.reduce((a, b) => (b.round > a.round ? b : a))
}

// ---- Internos ----

function advanceWinner(map: Map<string, Match>, match: Match): void {
  if (!match.winnerTeamId || !match.nextMatchId) return
  const next = map.get(match.nextMatchId)
  if (!next) return
  if (match.nextSide === 'A') next.sideATeamId = match.winnerTeamId
  else next.sideBTeamId = match.winnerTeamId
}

function clearResult(map: Map<string, Match>, match: Match): void {
  const previousWinner = match.winnerTeamId
  match.winnerTeamId = undefined
  match.winsA = 0
  match.winsB = 0

  if (!previousWinner || !match.nextMatchId) return
  const next = map.get(match.nextMatchId)
  if (!next) return

  const slot: 'sideATeamId' | 'sideBTeamId' =
    match.nextSide === 'A' ? 'sideATeamId' : 'sideBTeamId'
  if (next[slot] === previousWinner) {
    next[slot] = undefined
    // A próxima partida dependia deste participante: invalida em cascata.
    clearResult(map, next)
  }
}

function teamSide(match: Match, teamId: string): Side {
  if (match.sideATeamId === teamId) return 'A'
  if (match.sideBTeamId === teamId) return 'B'
  throw new Error('O time informado não pertence a esta partida.')
}

function requireMatch(map: Map<string, Match>, matchId: string): Match {
  const match = map.get(matchId)
  if (!match) throw new Error('Partida não encontrada.')
  return match
}

function toMap(matches: Match[]): Map<string, Match> {
  const map = new Map<string, Match>()
  for (const match of matches) map.set(match.id, { ...match })
  return map
}

function toArray(map: Map<string, Match>): Match[] {
  return [...map.values()].sort((a, b) => a.round - b.round || a.order - b.order)
}
