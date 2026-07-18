import type {
  BackupCampeonato,
  Campeonato,
  Foto,
  Partida,
  Time,
} from '../domain/types'
import type { Repositorio } from './repositorio'
import { blobParaDataUrl, dataUrlParaBlob } from './base64'
import { novoId } from './uuid'

const NOME_DB = 'pool-brackets'
const VERSAO_DB = 1

const STORE_CAMPEONATOS = 'campeonatos'
const STORE_TIMES = 'times'
const STORE_PARTIDAS = 'partidas'
const STORE_FOTOS = 'fotos'

const VERSAO_BACKUP = 1

/** Envolve um IDBRequest numa Promise. */
function promessa<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Espera uma transação terminar (garante que os writes foram efetivados). */
function fimDaTransacao(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

let dbPromise: Promise<IDBDatabase> | undefined

function abrirDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(NOME_DB, VERSAO_DB)

    req.onupgradeneeded = () => {
      const db = req.result

      if (!db.objectStoreNames.contains(STORE_CAMPEONATOS)) {
        db.createObjectStore(STORE_CAMPEONATOS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_TIMES)) {
        const store = db.createObjectStore(STORE_TIMES, { keyPath: 'id' })
        store.createIndex('campeonatoId', 'campeonatoId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_PARTIDAS)) {
        const store = db.createObjectStore(STORE_PARTIDAS, { keyPath: 'id' })
        store.createIndex('campeonatoId', 'campeonatoId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_FOTOS)) {
        const store = db.createObjectStore(STORE_FOTOS, { keyPath: 'id' })
        store.createIndex('campeonatoId', 'campeonatoId', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  return dbPromise
}

/** Busca todos os registros de um store filtrando por um índice. */
async function porIndice<T>(
  store: string,
  indice: string,
  valor: IDBValidKey,
): Promise<T[]> {
  const db = await abrirDb()
  const tx = db.transaction(store, 'readonly')
  const idx = tx.objectStore(store).index(indice)
  return promessa(idx.getAll(valor) as IDBRequest<T[]>)
}

/**
 * Implementação de `Repositorio` sobre IndexedDB.
 * Persistência local para o modo offline da v1.
 */
export class RepositorioIndexedDB implements Repositorio {
  // ---- Campeonatos ----

  async listarCampeonatos(): Promise<Campeonato[]> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_CAMPEONATOS, 'readonly')
    const todos = await promessa(
      tx.objectStore(STORE_CAMPEONATOS).getAll() as IDBRequest<Campeonato[]>,
    )
    return todos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  }

  async obterCampeonato(id: string): Promise<Campeonato | undefined> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_CAMPEONATOS, 'readonly')
    return promessa(
      tx.objectStore(STORE_CAMPEONATOS).get(id) as IDBRequest<
        Campeonato | undefined
      >,
    )
  }

  async salvarCampeonato(campeonato: Campeonato): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_CAMPEONATOS, 'readwrite')
    tx.objectStore(STORE_CAMPEONATOS).put(campeonato)
    await fimDaTransacao(tx)
  }

  async removerCampeonato(id: string): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(
      [STORE_CAMPEONATOS, STORE_TIMES, STORE_PARTIDAS, STORE_FOTOS],
      'readwrite',
    )
    tx.objectStore(STORE_CAMPEONATOS).delete(id)
    await Promise.all([
      apagarPorIndice(tx, STORE_TIMES, id),
      apagarPorIndice(tx, STORE_PARTIDAS, id),
      apagarPorIndice(tx, STORE_FOTOS, id),
    ])
    await fimDaTransacao(tx)
  }

  // ---- Times ----

  async listarTimes(campeonatoId: string): Promise<Time[]> {
    const times = await porIndice<Time>(STORE_TIMES, 'campeonatoId', campeonatoId)
    return times.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
  }

  async obterTime(id: string): Promise<Time | undefined> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_TIMES, 'readonly')
    return promessa(
      tx.objectStore(STORE_TIMES).get(id) as IDBRequest<Time | undefined>,
    )
  }

  async salvarTime(time: Time): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_TIMES, 'readwrite')
    tx.objectStore(STORE_TIMES).put(time)
    await fimDaTransacao(tx)
  }

  async removerTime(id: string): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_TIMES, 'readwrite')
    tx.objectStore(STORE_TIMES).delete(id)
    await fimDaTransacao(tx)
  }

  // ---- Partidas ----

  async listarPartidas(campeonatoId: string): Promise<Partida[]> {
    const partidas = await porIndice<Partida>(
      STORE_PARTIDAS,
      'campeonatoId',
      campeonatoId,
    )
    return partidas.sort((a, b) =>
      a.rodada - b.rodada || a.ordem - b.ordem,
    )
  }

  async salvarPartida(partida: Partida): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_PARTIDAS, 'readwrite')
    tx.objectStore(STORE_PARTIDAS).put(partida)
    await fimDaTransacao(tx)
  }

  async salvarPartidas(partidas: Partida[]): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_PARTIDAS, 'readwrite')
    const store = tx.objectStore(STORE_PARTIDAS)
    for (const partida of partidas) store.put(partida)
    await fimDaTransacao(tx)
  }

  async removerPartidasDoCampeonato(campeonatoId: string): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_PARTIDAS, 'readwrite')
    await apagarPorIndice(tx, STORE_PARTIDAS, campeonatoId)
    await fimDaTransacao(tx)
  }

  // ---- Fotos ----

  async obterFoto(id: string): Promise<Foto | undefined> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_FOTOS, 'readonly')
    return promessa(
      tx.objectStore(STORE_FOTOS).get(id) as IDBRequest<Foto | undefined>,
    )
  }

  async salvarFoto(foto: Foto): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_FOTOS, 'readwrite')
    tx.objectStore(STORE_FOTOS).put(foto)
    await fimDaTransacao(tx)
  }

  async removerFoto(id: string): Promise<void> {
    const db = await abrirDb()
    const tx = db.transaction(STORE_FOTOS, 'readwrite')
    tx.objectStore(STORE_FOTOS).delete(id)
    await fimDaTransacao(tx)
  }

  // ---- Backup ----

  async exportar(campeonatoId: string): Promise<BackupCampeonato> {
    const campeonato = await this.obterCampeonato(campeonatoId)
    if (!campeonato) {
      throw new Error(`Campeonato ${campeonatoId} não encontrado.`)
    }

    const [times, partidas, fotos] = await Promise.all([
      this.listarTimes(campeonatoId),
      this.listarPartidas(campeonatoId),
      porIndice<Foto>(STORE_FOTOS, 'campeonatoId', campeonatoId),
    ])

    const fotosBackup = await Promise.all(
      fotos.map(async (foto) => ({
        id: foto.id,
        campeonatoId: foto.campeonatoId,
        dataUrl: await blobParaDataUrl(foto.blob),
      })),
    )

    return {
      versao: VERSAO_BACKUP,
      exportadoEm: new Date().toISOString(),
      campeonato,
      times,
      partidas,
      fotos: fotosBackup,
    }
  }

  async importar(backup: BackupCampeonato): Promise<string> {
    // Gera novos IDs para não colidir com dados existentes, mantendo as
    // referências internas (times, fotos, próximas partidas) consistentes.
    const mapa = new Map<string, string>()
    const remapear = (id: string): string => {
      let novo = mapa.get(id)
      if (!novo) {
        novo = novoId()
        mapa.set(id, novo)
      }
      return novo
    }

    const campeonato: Campeonato = {
      ...backup.campeonato,
      id: remapear(backup.campeonato.id),
      campeaoTimeId: backup.campeonato.campeaoTimeId
        ? remapear(backup.campeonato.campeaoTimeId)
        : undefined,
    }

    const times: Time[] = backup.times.map((time) => ({
      ...time,
      id: remapear(time.id),
      campeonatoId: campeonato.id,
      fotoId: time.fotoId ? remapear(time.fotoId) : undefined,
    }))

    const partidas: Partida[] = backup.partidas.map((partida) => ({
      ...partida,
      id: remapear(partida.id),
      campeonatoId: campeonato.id,
      ladoATimeId: partida.ladoATimeId ? remapear(partida.ladoATimeId) : undefined,
      ladoBTimeId: partida.ladoBTimeId ? remapear(partida.ladoBTimeId) : undefined,
      vencedorTimeId: partida.vencedorTimeId
        ? remapear(partida.vencedorTimeId)
        : undefined,
      proximaPartidaId: partida.proximaPartidaId
        ? remapear(partida.proximaPartidaId)
        : undefined,
    }))

    const fotos: Foto[] = await Promise.all(
      backup.fotos.map(async (foto) => ({
        id: remapear(foto.id),
        campeonatoId: campeonato.id,
        blob: await dataUrlParaBlob(foto.dataUrl),
      })),
    )

    const db = await abrirDb()
    const tx = db.transaction(
      [STORE_CAMPEONATOS, STORE_TIMES, STORE_PARTIDAS, STORE_FOTOS],
      'readwrite',
    )
    tx.objectStore(STORE_CAMPEONATOS).put(campeonato)
    const storeTimes = tx.objectStore(STORE_TIMES)
    for (const time of times) storeTimes.put(time)
    const storePartidas = tx.objectStore(STORE_PARTIDAS)
    for (const partida of partidas) storePartidas.put(partida)
    const storeFotos = tx.objectStore(STORE_FOTOS)
    for (const foto of fotos) storeFotos.put(foto)
    await fimDaTransacao(tx)

    return campeonato.id
  }
}

/** Apaga todos os registros de um store cujo índice `campeonatoId` bate. */
function apagarPorIndice(
  tx: IDBTransaction,
  store: string,
  campeonatoId: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const idx = tx.objectStore(store).index('campeonatoId')
    const req = idx.openKeyCursor(IDBKeyRange.only(campeonatoId))
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
