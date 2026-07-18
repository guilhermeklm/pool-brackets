# PoolBrackets 🎱

PWA para organizar campeonatos de sinuca **individuais** ou de **duplas**,
controlada por um único celular e funcionando **offline**. O organizador cadastra
os times (com foto), o app sorteia o chaveamento, registra os resultados e cuida
do bolão de forma transparente.

Especificação completa: [`docs/especificacao.md`](docs/especificacao.md).

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **PWA** instalável e offline (`vite-plugin-pwa`)
- **IndexedDB** para persistência local (dados + fotos como Blobs)

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (HMR) |
| `npm run build` | Type-check (`tsc -b`) + build de produção |
| `npm run typecheck` | Só a checagem de tipos |
| `npm run lint` | Lint com oxlint |
| `npm run preview` | Serve o build de produção localmente |

## Arquitetura

Separação **domínio × persistência × UI**, pensada para evoluir para multi-dispositivo:

```
src/
  domain/        Tipos e regras puras (testáveis, sem React/DB)
    types.ts
  data/          Camada de persistência trocável
    repositorio.ts   Interface Repositorio (as telas falam só com ela)
    indexeddb.ts     Implementação sobre IndexedDB
    uuid.ts          IDs UUID gerados no cliente
    base64.ts        Blob <-> data URL (para o backup)
    index.ts         Instância única do repositório
```

- **Camada de repositório trocável:** as telas conversam com a interface
  `Repositorio`, não com o IndexedDB. Trocar por uma API futura = trocar só a
  implementação em `data/index.ts`.
- **IDs UUID no cliente:** evitam conflito quando houver sincronização.
- **Dados serializáveis em JSON limpo:** mapeiam direto para endpoints/tabelas.

## Status

Milestone 1 concluído: setup do projeto + camada de dados.

### Pendências conhecidas
- Ícones da PWA (`public/pwa-192.png`, `public/pwa-512.png`) ainda não gerados —
  referenciados no manifest; a instalar no polimento do PWA (Milestone 8).
