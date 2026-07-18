// Tipos de domínio do PoolBrackets.
// Mantidos puros e serializáveis em JSON (fotos ficam à parte, como Blobs),
// para mapear diretamente para endpoints/tabelas no futuro.

export type ChampionshipType = 'individual' | 'doubles'

export type ChampionshipStatus = 'registration' | 'in_progress' | 'finished'

export type PaymentStatus = 'paid' | 'pending'

/** Em qual lado de uma partida um vencedor é encaixado. */
export type Side = 'A' | 'B'

export interface Championship {
  id: string
  name: string
  type: ChampionshipType
  /** Quando true, `entryFeeCents` e o bolão passam a valer. */
  betEnabled: boolean
  /** Valor da entrada em centavos (0 quando a aposta está desativada). */
  entryFeeCents: number
  /** Chave Pix do organizador (opcional, usada para gerar o QR Code). */
  pixKey?: string
  status: ChampionshipStatus
  /** Definido quando o campeonato é finalizado. */
  championTeamId?: string
  /** ISO 8601. */
  createdAt: string
  /** ISO 8601. */
  updatedAt: string
}

export interface Team {
  id: string
  championshipId: string
  /** No modo individual é o nome do jogador; no modo dupla, o nome do time. */
  name: string
  /** Preenchido no modo dupla. */
  player1?: string
  /** Preenchido no modo dupla. */
  player2?: string
  /** Referência para a foto (Blob) guardada à parte. */
  photoId?: string
  paymentStatus: PaymentStatus
  createdAt: string
}

export interface Photo {
  id: string
  championshipId: string
  blob: Blob
}

export interface Match {
  id: string
  championshipId: string
  /** 1 = primeira rodada; cresce até a final. */
  round: number
  /** Posição da partida dentro da rodada (0-based), de cima para baixo. */
  order: number
  /** Partidas comuns são melhor de 1; a final é melhor de 3. */
  bestOf: 1 | 3
  sideATeamId?: string
  sideBTeamId?: string
  winnerTeamId?: string
  /** Vitórias de cada lado (relevante na final, melhor de 3). */
  winsA: number
  winsB: number
  /** Partida de BYE: um dos lados avança sem jogar. */
  bye: boolean
  /** Para onde o vencedor avança (undefined = final). */
  nextMatchId?: string
  /** Em qual lado da próxima partida o vencedor entra. */
  nextSide?: Side
}

/**
 * Pacote de backup exportado/importado como JSON.
 * Fotos vão em base64 (data URL) para caber em um único arquivo.
 */
export interface ChampionshipBackup {
  version: number
  exportedAt: string
  championship: Championship
  teams: Team[]
  matches: Match[]
  photos: PhotoBackup[]
}

export interface PhotoBackup {
  id: string
  championshipId: string
  /** data URL (ex: "data:image/jpeg;base64,...."). */
  dataUrl: string
}
