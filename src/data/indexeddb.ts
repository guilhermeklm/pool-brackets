import type {
  Championship,
  ChampionshipBackup,
  Match,
  Photo,
  Team,
} from '../domain/types'
import type { Repository } from './repository'
import { blobToDataUrl, dataUrlToBlob } from './base64'
import { newId } from './uuid'

const DB_NAME = 'pool-brackets'
// v2: object stores renomeados para inglês (championships/teams/matches/photos).
const DB_VERSION = 2

const STORE_CHAMPIONSHIPS = 'championships'
const STORE_TEAMS = 'teams'
const STORE_MATCHES = 'matches'
const STORE_PHOTOS = 'photos'

const INDEX_CHAMPIONSHIP = 'championshipId'

const BACKUP_VERSION = 1

/** Envolve um IDBRequest numa Promise. */
function toPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Espera uma transação terminar (garante que os writes foram efetivados). */
function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

let dbPromise: Promise<IDBDatabase> | undefined

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result

      if (!db.objectStoreNames.contains(STORE_CHAMPIONSHIPS)) {
        db.createObjectStore(STORE_CHAMPIONSHIPS, { keyPath: 'id' })
      }
      for (const name of [STORE_TEAMS, STORE_MATCHES, STORE_PHOTOS]) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' })
          store.createIndex(INDEX_CHAMPIONSHIP, 'championshipId', {
            unique: false,
          })
        }
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  return dbPromise
}

/** Busca todos os registros de um store filtrando por um índice. */
async function byIndex<T>(
  store: string,
  index: string,
  value: IDBValidKey,
): Promise<T[]> {
  const db = await openDb()
  const tx = db.transaction(store, 'readonly')
  const idx = tx.objectStore(store).index(index)
  return toPromise(idx.getAll(value) as IDBRequest<T[]>)
}

/**
 * Implementação de `Repository` sobre IndexedDB.
 * Persistência local para o modo offline da v1.
 */
export class IndexedDBRepository implements Repository {
  // ---- Campeonatos ----

  async listChampionships(): Promise<Championship[]> {
    const db = await openDb()
    const tx = db.transaction(STORE_CHAMPIONSHIPS, 'readonly')
    const all = await toPromise(
      tx.objectStore(STORE_CHAMPIONSHIPS).getAll() as IDBRequest<Championship[]>,
    )
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async getChampionship(id: string): Promise<Championship | undefined> {
    const db = await openDb()
    const tx = db.transaction(STORE_CHAMPIONSHIPS, 'readonly')
    return toPromise(
      tx.objectStore(STORE_CHAMPIONSHIPS).get(id) as IDBRequest<
        Championship | undefined
      >,
    )
  }

  async saveChampionship(championship: Championship): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_CHAMPIONSHIPS, 'readwrite')
    tx.objectStore(STORE_CHAMPIONSHIPS).put(championship)
    await transactionDone(tx)
  }

  async deleteChampionship(id: string): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(
      [STORE_CHAMPIONSHIPS, STORE_TEAMS, STORE_MATCHES, STORE_PHOTOS],
      'readwrite',
    )
    tx.objectStore(STORE_CHAMPIONSHIPS).delete(id)
    await Promise.all([
      deleteByIndex(tx, STORE_TEAMS, id),
      deleteByIndex(tx, STORE_MATCHES, id),
      deleteByIndex(tx, STORE_PHOTOS, id),
    ])
    await transactionDone(tx)
  }

  // ---- Times ----

  async listTeams(championshipId: string): Promise<Team[]> {
    const teams = await byIndex<Team>(
      STORE_TEAMS,
      INDEX_CHAMPIONSHIP,
      championshipId,
    )
    return teams.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const db = await openDb()
    const tx = db.transaction(STORE_TEAMS, 'readonly')
    return toPromise(
      tx.objectStore(STORE_TEAMS).get(id) as IDBRequest<Team | undefined>,
    )
  }

  async saveTeam(team: Team): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_TEAMS, 'readwrite')
    tx.objectStore(STORE_TEAMS).put(team)
    await transactionDone(tx)
  }

  async deleteTeam(id: string): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_TEAMS, 'readwrite')
    tx.objectStore(STORE_TEAMS).delete(id)
    await transactionDone(tx)
  }

  // ---- Partidas ----

  async listMatches(championshipId: string): Promise<Match[]> {
    const matches = await byIndex<Match>(
      STORE_MATCHES,
      INDEX_CHAMPIONSHIP,
      championshipId,
    )
    return matches.sort((a, b) => a.round - b.round || a.order - b.order)
  }

  async saveMatch(match: Match): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_MATCHES, 'readwrite')
    tx.objectStore(STORE_MATCHES).put(match)
    await transactionDone(tx)
  }

  async saveMatches(matches: Match[]): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_MATCHES, 'readwrite')
    const store = tx.objectStore(STORE_MATCHES)
    for (const match of matches) store.put(match)
    await transactionDone(tx)
  }

  async deleteMatchesOfChampionship(championshipId: string): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_MATCHES, 'readwrite')
    await deleteByIndex(tx, STORE_MATCHES, championshipId)
    await transactionDone(tx)
  }

  // ---- Fotos ----

  async getPhoto(id: string): Promise<Photo | undefined> {
    const db = await openDb()
    const tx = db.transaction(STORE_PHOTOS, 'readonly')
    return toPromise(
      tx.objectStore(STORE_PHOTOS).get(id) as IDBRequest<Photo | undefined>,
    )
  }

  async savePhoto(photo: Photo): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_PHOTOS, 'readwrite')
    tx.objectStore(STORE_PHOTOS).put(photo)
    await transactionDone(tx)
  }

  async deletePhoto(id: string): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_PHOTOS, 'readwrite')
    tx.objectStore(STORE_PHOTOS).delete(id)
    await transactionDone(tx)
  }

  // ---- Backup ----

  async exportChampionship(championshipId: string): Promise<ChampionshipBackup> {
    const championship = await this.getChampionship(championshipId)
    if (!championship) {
      throw new Error(`Championship ${championshipId} not found.`)
    }

    const [teams, matches, photos] = await Promise.all([
      this.listTeams(championshipId),
      this.listMatches(championshipId),
      byIndex<Photo>(STORE_PHOTOS, INDEX_CHAMPIONSHIP, championshipId),
    ])

    const photosBackup = await Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        championshipId: photo.championshipId,
        dataUrl: await blobToDataUrl(photo.blob),
      })),
    )

    return {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      championship,
      teams,
      matches,
      photos: photosBackup,
    }
  }

  async importChampionship(backup: ChampionshipBackup): Promise<string> {
    // Gera novos IDs para não colidir com dados existentes, mantendo as
    // referências internas (times, fotos, próximas partidas) consistentes.
    const idMap = new Map<string, string>()
    const remap = (id: string): string => {
      let mapped = idMap.get(id)
      if (!mapped) {
        mapped = newId()
        idMap.set(id, mapped)
      }
      return mapped
    }

    const championship: Championship = {
      ...backup.championship,
      id: remap(backup.championship.id),
      championTeamId: backup.championship.championTeamId
        ? remap(backup.championship.championTeamId)
        : undefined,
    }

    const teams: Team[] = backup.teams.map((team) => ({
      ...team,
      id: remap(team.id),
      championshipId: championship.id,
      photoId: team.photoId ? remap(team.photoId) : undefined,
    }))

    const matches: Match[] = backup.matches.map((match) => ({
      ...match,
      id: remap(match.id),
      championshipId: championship.id,
      sideATeamId: match.sideATeamId ? remap(match.sideATeamId) : undefined,
      sideBTeamId: match.sideBTeamId ? remap(match.sideBTeamId) : undefined,
      winnerTeamId: match.winnerTeamId ? remap(match.winnerTeamId) : undefined,
      nextMatchId: match.nextMatchId ? remap(match.nextMatchId) : undefined,
    }))

    const photos: Photo[] = await Promise.all(
      backup.photos.map(async (photo) => ({
        id: remap(photo.id),
        championshipId: championship.id,
        blob: await dataUrlToBlob(photo.dataUrl),
      })),
    )

    const db = await openDb()
    const tx = db.transaction(
      [STORE_CHAMPIONSHIPS, STORE_TEAMS, STORE_MATCHES, STORE_PHOTOS],
      'readwrite',
    )
    tx.objectStore(STORE_CHAMPIONSHIPS).put(championship)
    const teamsStore = tx.objectStore(STORE_TEAMS)
    for (const team of teams) teamsStore.put(team)
    const matchesStore = tx.objectStore(STORE_MATCHES)
    for (const match of matches) matchesStore.put(match)
    const photosStore = tx.objectStore(STORE_PHOTOS)
    for (const photo of photos) photosStore.put(photo)
    await transactionDone(tx)

    return championship.id
  }
}

/** Apaga todos os registros de um store cujo índice `championshipId` bate. */
function deleteByIndex(
  tx: IDBTransaction,
  store: string,
  championshipId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const idx = tx.objectStore(store).index(INDEX_CHAMPIONSHIP)
    const req = idx.openKeyCursor(IDBKeyRange.only(championshipId))
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        resolve()
        return
      }
      tx.objectStore(store).delete(cursor.primaryKey)
      cursor.continue()
    }
    req.onerror = () => reject(req.error)
  })
}
