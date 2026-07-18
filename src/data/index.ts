import type { Repositorio } from './repositorio'
import { RepositorioIndexedDB } from './indexeddb'

/**
 * Instância única do repositório usada pelas telas.
 * Trocar de backend no futuro = trocar só esta linha.
 */
export const repositorio: Repositorio = new RepositorioIndexedDB()

export type { Repositorio } from './repositorio'
