// Cálculo do bolão (pote de apostas). Função pura, testável e independente de
// React/persistência. O prêmio do campeão é calculado sobre o pote previsto
// (todos os inscritos), enquanto o arrecadado reflete apenas quem já pagou.

import type { Team } from './types'

export interface PoolSummary {
  /** Total já pago (times "paid" × entrada). */
  collectedCents: number
  /** Total ainda a receber (times "pending" × entrada). */
  pendingCents: number
  /** Pote total previsto (todos os inscritos × entrada). */
  projectedTotalCents: number
  /** Prêmio do campeão = pote total previsto. */
  prizeCents: number
  paidCount: number
  pendingCount: number
}

export function computePool(teams: Team[], entryFeeCents: number): PoolSummary {
  const total = teams.length
  const paidCount = teams.filter((t) => t.paymentStatus === 'paid').length
  const pendingCount = total - paidCount

  const projectedTotalCents = total * entryFeeCents
  return {
    collectedCents: paidCount * entryFeeCents,
    pendingCents: pendingCount * entryFeeCents,
    projectedTotalCents,
    prizeCents: projectedTotalCents,
    paidCount,
    pendingCount,
  }
}
