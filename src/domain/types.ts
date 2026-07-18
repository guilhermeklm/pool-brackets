// Tipos de domínio do PoolBrackets.
// Mantidos puros e serializáveis em JSON (fotos ficam à parte, como Blob),
// para mapear diretamente para endpoints/tabelas no futuro.

export type TipoCampeonato = 'individual' | 'dupla'

export type StatusCampeonato = 'inscricoes' | 'em_andamento' | 'finalizado'

export type StatusPagamento = 'pago' | 'pendente'

/** Em qual lado de uma partida um vencedor será encaixado. */
export type Lado = 'A' | 'B'

export interface Campeonato {
  id: string
  nome: string
  tipo: TipoCampeonato
  /** Quando true, `valorEntradaCentavos` e o bolão passam a valer. */
  apostaAtiva: boolean
  /** Valor da entrada em centavos (0 quando a aposta está desativada). */
  valorEntradaCentavos: number
  /** Chave Pix do organizador (opcional, para gerar o QR Code). */
  chavePix?: string
  status: StatusCampeonato
  /** Definido quando o campeonato é finalizado. */
  campeaoTimeId?: string
  /** ISO 8601. */
  criadoEm: string
  /** ISO 8601. */
  atualizadoEm: string
}

export interface Time {
  id: string
  campeonatoId: string
  /** No modo individual, é o nome do jogador; no modo dupla, o nome do time. */
  nome: string
  /** Preenchido no modo dupla. */
  jogador1?: string
  /** Preenchido no modo dupla. */
  jogador2?: string
  /** Referência para a foto (Blob) guardada à parte. */
  fotoId?: string
  statusPagamento: StatusPagamento
  criadoEm: string
}

export interface Foto {
  id: string
  campeonatoId: string
  blob: Blob
}

export interface Partida {
  id: string
  campeonatoId: string
  /** 1 = primeira rodada; cresce até a final. */
  rodada: number
  /** Posição da partida dentro da rodada (0-based), de cima para baixo. */
  ordem: number
  /** Partidas comuns são melhor de 1; a final é melhor de 3. */
  melhorDe: 1 | 3
  ladoATimeId?: string
  ladoBTimeId?: string
  vencedorTimeId?: string
  /** Vitórias de cada lado (relevante na final, melhor de 3). */
  vitoriasA: number
  vitoriasB: number
  /** Partida de BYE: um dos lados avança sem jogar. */
  bye: boolean
  /** Para onde o vencedor avança (undefined = final). */
  proximaPartidaId?: string
  /** Em qual lado da próxima partida o vencedor entra. */
  proximoLado?: Lado
}

/**
 * Pacote de backup exportado/importado como JSON.
 * Fotos vão em base64 (dataUrl) para caber em um único arquivo.
 */
export interface BackupCampeonato {
  versao: number
  exportadoEm: string
  campeonato: Campeonato
  times: Time[]
  partidas: Partida[]
  fotos: FotoBackup[]
}

export interface FotoBackup {
  id: string
  campeonatoId: string
  /** data URL (ex: "data:image/jpeg;base64,...."). */
  dataUrl: string
}
