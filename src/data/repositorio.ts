import type {
  BackupCampeonato,
  Campeonato,
  Foto,
  Partida,
  Time,
} from '../domain/types'

/**
 * Camada de repositório trocável.
 *
 * As telas conversam com esta interface e nunca diretamente com o IndexedDB.
 * Quando existir uma API/backend, troca-se apenas a implementação por trás,
 * sem mexer nas telas.
 */
export interface Repositorio {
  // ---- Campeonatos ----
  listarCampeonatos(): Promise<Campeonato[]>
  obterCampeonato(id: string): Promise<Campeonato | undefined>
  salvarCampeonato(campeonato: Campeonato): Promise<void>
  /** Remove o campeonato e tudo que pertence a ele (times, partidas, fotos). */
  removerCampeonato(id: string): Promise<void>

  // ---- Times ----
  listarTimes(campeonatoId: string): Promise<Time[]>
  obterTime(id: string): Promise<Time | undefined>
  salvarTime(time: Time): Promise<void>
  removerTime(id: string): Promise<void>

  // ---- Partidas ----
  listarPartidas(campeonatoId: string): Promise<Partida[]>
  salvarPartida(partida: Partida): Promise<void>
  /** Persiste várias partidas de uma vez (usado ao gerar/atualizar a chave). */
  salvarPartidas(partidas: Partida[]): Promise<void>
  /** Apaga todas as partidas do campeonato (usado ao re-sortear a chave). */
  removerPartidasDoCampeonato(campeonatoId: string): Promise<void>

  // ---- Fotos (Blobs) ----
  obterFoto(id: string): Promise<Foto | undefined>
  salvarFoto(foto: Foto): Promise<void>
  removerFoto(id: string): Promise<void>

  // ---- Backup ----
  exportar(campeonatoId: string): Promise<BackupCampeonato>
  /** Importa um backup e retorna o id do campeonato restaurado. */
  importar(backup: BackupCampeonato): Promise<string>
}
