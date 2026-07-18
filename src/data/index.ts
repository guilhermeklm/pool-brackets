import type { Repository } from './repository'
import { IndexedDBRepository } from './indexeddb'

/**
 * Instância única do repositório usada pelas telas.
 * Trocar de backend no futuro = trocar só esta linha.
 */
export const repository: Repository = new IndexedDBRepository()

export type { Repository } from './repository'
