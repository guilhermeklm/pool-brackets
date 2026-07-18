// Fábricas de entidades de domínio: centralizam os valores iniciais e mantêm
// as telas livres de detalhes como geração de id e timestamps.

import { newId } from '../data/uuid'
import type { Championship, ChampionshipType, Team } from './types'

export interface NewChampionshipData {
  name: string
  type: ChampionshipType
  betEnabled: boolean
  entryFeeCents: number
  pixKey?: string
}

export function createChampionship(data: NewChampionshipData): Championship {
  const now = new Date().toISOString()
  return {
    id: newId(),
    name: data.name.trim(),
    type: data.type,
    betEnabled: data.betEnabled,
    entryFeeCents: data.betEnabled ? data.entryFeeCents : 0,
    pixKey: data.pixKey?.trim() || undefined,
    status: 'registration',
    createdAt: now,
    updatedAt: now,
  }
}

export interface NewTeamData {
  championshipId: string
  name: string
  player1?: string
  player2?: string
  photoId?: string
}

export function createTeam(data: NewTeamData): Team {
  return {
    id: newId(),
    championshipId: data.championshipId,
    name: data.name.trim(),
    player1: data.player1?.trim() || undefined,
    player2: data.player2?.trim() || undefined,
    photoId: data.photoId,
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
  }
}
