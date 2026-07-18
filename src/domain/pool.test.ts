import { describe, it, expect } from 'vitest'
import { computePool } from './pool'
import type { Team } from './types'

function team(id: string, paid: boolean): Team {
  return {
    id,
    championshipId: 'c',
    name: id,
    paymentStatus: paid ? 'paid' : 'pending',
    createdAt: '',
  }
}

describe('computePool', () => {
  it('cenário da spec: entrada R$20, 6 times, 4 pagos', () => {
    const teams = [
      team('1', true),
      team('2', true),
      team('3', true),
      team('4', true),
      team('5', false),
      team('6', false),
    ]
    const pool = computePool(teams, 2000)
    expect(pool.collectedCents).toBe(8000) // R$ 80,00
    expect(pool.pendingCents).toBe(4000) // R$ 40,00
    expect(pool.projectedTotalCents).toBe(12000) // R$ 120,00
    expect(pool.prizeCents).toBe(12000) // prêmio = pote previsto
    expect(pool.paidCount).toBe(4)
    expect(pool.pendingCount).toBe(2)
  })

  it('sem times: tudo zero', () => {
    expect(computePool([], 2000)).toEqual({
      collectedCents: 0,
      pendingCents: 0,
      projectedTotalCents: 0,
      prizeCents: 0,
      paidCount: 0,
      pendingCount: 0,
    })
  })

  it('todos pagos: pendente zero', () => {
    const teams = [team('1', true), team('2', true)]
    const pool = computePool(teams, 1500)
    expect(pool.collectedCents).toBe(3000)
    expect(pool.pendingCents).toBe(0)
    expect(pool.pendingCount).toBe(0)
  })
})
