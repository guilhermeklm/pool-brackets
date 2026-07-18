import type {
  Championship,
  ChampionshipBackup,
  Match,
  Photo,
  Team,
} from '../domain/types'

/**
 * Camada de repositório trocável.
 *
 * As telas conversam com esta interface e nunca diretamente com o IndexedDB.
 * Quando existir uma API/backend, troca-se apenas a implementação por trás,
 * sem mexer nas telas.
 */
export interface Repository {
  // ---- Campeonatos ----
  listChampionships(): Promise<Championship[]>
  getChampionship(id: string): Promise<Championship | undefined>
  saveChampionship(championship: Championship): Promise<void>
  /** Remove o campeonato e tudo que pertence a ele (times, partidas, fotos). */
  deleteChampionship(id: string): Promise<void>

  // ---- Times ----
  listTeams(championshipId: string): Promise<Team[]>
  getTeam(id: string): Promise<Team | undefined>
  saveTeam(team: Team): Promise<void>
  deleteTeam(id: string): Promise<void>

  // ---- Partidas ----
  listMatches(championshipId: string): Promise<Match[]>
  saveMatch(match: Match): Promise<void>
  /** Persiste várias partidas de uma vez (usado ao gerar/atualizar a chave). */
  saveMatches(matches: Match[]): Promise<void>
  /** Apaga todas as partidas do campeonato (usado ao re-sortear a chave). */
  deleteMatchesOfChampionship(championshipId: string): Promise<void>

  // ---- Fotos (Blobs) ----
  getPhoto(id: string): Promise<Photo | undefined>
  savePhoto(photo: Photo): Promise<void>
  deletePhoto(id: string): Promise<void>

  // ---- Backup ----
  exportChampionship(championshipId: string): Promise<ChampionshipBackup>
  /** Importa um backup e retorna o id do campeonato restaurado. */
  importChampionship(backup: ChampionshipBackup): Promise<string>
}
