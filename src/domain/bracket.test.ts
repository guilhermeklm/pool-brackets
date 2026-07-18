import { describe, it, expect } from 'vitest'
import {
  generateBracket,
  nextPowerOfTwo,
  winsNeeded,
  recordGameWin,
  decideBestOfOne,
  resetMatchResult,
  getChampionId,
  getFinalMatch,
  roundLabel,
} from './bracket'
import type { Match, Side } from './types'

/** RNG determinístico (LCG) para tornar os sorteios reprodutíveis. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (1664525 * s + 1013904223) >>> 0
    return s / 0x100000000
  }
}

const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`)
const firstRound = (ms: Match[]) => ms.filter((m) => m.round === 1)
const teamsInRound1 = (ms: Match[]) =>
  firstRound(ms).flatMap((m) => [m.sideATeamId, m.sideBTeamId].filter(Boolean))
const sideSlot = (side: Side) => (side === 'A' ? 'sideATeamId' : 'sideBTeamId')

describe('nextPowerOfTwo', () => {
  it.each([
    [1, 1],
    [2, 2],
    [5, 8],
    [8, 8],
    [9, 16],
    [32, 32],
  ])('nextPowerOfTwo(%i) = %i', (n, expected) => {
    expect(nextPowerOfTwo(n)).toBe(expected)
  })
})

describe('roundLabel', () => {
  it.each([
    [1, 'Final'],
    [2, 'Semifinais'],
    [4, 'Quartas de final'],
    [8, 'Oitavas de final'],
    [16, '16 partidas'],
  ])('%i partidas -> %s', (count, label) => {
    expect(roundLabel(count)).toBe(label)
  })
})

describe('winsNeeded', () => {
  it('melhor de 1 precisa de 1 vitória', () => {
    expect(winsNeeded(1)).toBe(1)
  })
  it('melhor de 3 precisa de 2 vitórias', () => {
    expect(winsNeeded(3)).toBe(2)
  })
})

describe('generateBracket', () => {
  it('bloqueia com menos de 2 times', () => {
    expect(() => generateBracket('c', ['x'])).toThrow()
  })

  it('8 times: chave cheia, sem bye, final melhor de 3', () => {
    const ms = generateBracket('c', ids(8), makeRng(42))
    expect(ms).toHaveLength(7)
    expect(firstRound(ms)).toHaveLength(4)
    expect(ms.every((m) => !m.bye)).toBe(true)

    const t1 = teamsInRound1(ms)
    expect(new Set(t1).size).toBe(8)
    expect(t1).toHaveLength(8)

    const final = getFinalMatch(ms)!
    expect(final.bestOf).toBe(3)
    expect(final.nextMatchId).toBeUndefined()
    expect(ms.filter((m) => m.round < 3).every((m) => m.bestOf === 1)).toBe(true)
    expect(firstRound(ms).every((m) => m.nextMatchId)).toBe(true)
  })

  it('6 times: 2 byes que já avançam para a 2ª rodada', () => {
    const ms = generateBracket('c', ids(6), makeRng(7))
    const byeMatches = firstRound(ms).filter((m) => m.bye)
    expect(byeMatches).toHaveLength(2)
    expect(byeMatches.every((m) => m.sideATeamId && !m.sideBTeamId)).toBe(true)
    expect(byeMatches.every((m) => m.winnerTeamId === m.sideATeamId)).toBe(true)

    const t1 = teamsInRound1(ms)
    expect(new Set(t1).size).toBe(6)

    const round2 = ms.filter((m) => m.round === 2)
    const advanced = round2.flatMap((m) =>
      [m.sideATeamId, m.sideBTeamId].filter(Boolean),
    )
    expect(advanced).toHaveLength(2)
  })

  it('2 times: apenas a final (melhor de 3)', () => {
    const ms = generateBracket('c', ids(2), makeRng(1))
    expect(ms).toHaveLength(1)
    expect(ms[0].bestOf).toBe(3)
    expect(ms[0].bye).toBe(false)
  })

  it.each([3, 5, 7, 9, 15, 16, 31, 32])(
    'n=%i: todos os times entram 1x, byes e nº de partidas corretos',
    (n) => {
      const ms = generateBracket('c', ids(n), makeRng(n * 13 + 1))
      const size = nextPowerOfTwo(n)
      const t1 = teamsInRound1(ms)
      expect(new Set(t1).size).toBe(n)
      expect(t1).toHaveLength(n)
      expect(firstRound(ms).filter((m) => m.bye)).toHaveLength(size - n)
      expect(ms).toHaveLength(size - 1)
    },
  )
})

describe('avanço do vencedor', () => {
  it('4 times: avança até o campeão (final exige 2 vitórias)', () => {
    let ms = generateBracket('c', ids(4), makeRng(99))
    const semis = ms.filter((m) => m.round === 1)
    ms = decideBestOfOne(ms, semis[0].id, semis[0].sideATeamId!)
    ms = decideBestOfOne(ms, semis[1].id, semis[1].sideBTeamId!)

    let final = getFinalMatch(ms)!
    expect(final.sideATeamId).toBeTruthy()
    expect(final.sideBTeamId).toBeTruthy()
    expect(getChampionId(ms)).toBeUndefined()

    ms = recordGameWin(ms, final.id, final.sideATeamId!)
    expect(getChampionId(ms)).toBeUndefined() // 1x0 não decide

    ms = recordGameWin(ms, final.id, final.sideATeamId!)
    final = getFinalMatch(ms)!
    expect(getChampionId(ms)).toBe(final.sideATeamId) // 2x0 decide
  })

  it('não deixa registrar em partida já decidida', () => {
    let ms = generateBracket('c', ids(4), makeRng(3))
    const semi = ms.filter((m) => m.round === 1)[0]
    ms = decideBestOfOne(ms, semi.id, semi.sideATeamId!)
    expect(() => recordGameWin(ms, semi.id, semi.sideBTeamId!)).toThrow()
  })
})

describe('correção de resultado', () => {
  it('trocar o vencedor invalida em cascata as partidas seguintes', () => {
    let ms = generateBracket('c', ids(4), makeRng(5))
    const semis = ms.filter((m) => m.round === 1)
    const semi = semis[0]
    const teamA = semi.sideATeamId!
    const teamB = semi.sideBTeamId!
    const slot = sideSlot(semi.nextSide!)

    ms = decideBestOfOne(ms, semi.id, teamA)
    ms = decideBestOfOne(ms, semis[1].id, semis[1].sideATeamId!)
    let final = getFinalMatch(ms)!
    expect(final[slot]).toBe(teamA)

    // Um jogo da final registrado cria a dependência a ser invalidada.
    ms = recordGameWin(ms, final.id, teamA)
    expect(getFinalMatch(ms)!.winsA + getFinalMatch(ms)!.winsB).toBe(1)

    // Corrige a semi: agora B vence.
    ms = decideBestOfOne(ms, semi.id, teamB)
    final = getFinalMatch(ms)!
    expect(final[slot]).toBe(teamB)
    expect(final.winsA).toBe(0)
    expect(final.winsB).toBe(0)
    expect(final.winnerTeamId).toBeUndefined()
  })

  it('resetMatchResult limpa o vencedor e o placar', () => {
    let ms = generateBracket('c', ids(4), makeRng(11))
    const semi = ms.filter((m) => m.round === 1)[0]
    ms = decideBestOfOne(ms, semi.id, semi.sideATeamId!)
    ms = resetMatchResult(ms, semi.id)
    const cleared = ms.find((m) => m.id === semi.id)!
    expect(cleared.winnerTeamId).toBeUndefined()
    expect(cleared.winsA).toBe(0)
    expect(cleared.winsB).toBe(0)
  })
})
