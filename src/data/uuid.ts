/**
 * Gera um UUID v4 no cliente.
 *
 * IDs gerados no cliente evitam conflito de identificadores quando houver
 * sincronização com backend no futuro. Usa `crypto.randomUUID` quando
 * disponível, com um fallback baseado em `crypto.getRandomValues`.
 */
export function newId(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') {
    return c.randomUUID()
  }

  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  // Versão 4 e variante conforme a RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex: string[] = []
  for (let i = 0; i < 256; i++) {
    hex.push((i + 0x100).toString(16).slice(1))
  }

  const b = bytes
  return (
    hex[b[0]] + hex[b[1]] + hex[b[2]] + hex[b[3]] + '-' +
    hex[b[4]] + hex[b[5]] + '-' +
    hex[b[6]] + hex[b[7]] + '-' +
    hex[b[8]] + hex[b[9]] + '-' +
    hex[b[10]] + hex[b[11]] + hex[b[12]] + hex[b[13]] + hex[b[14]] + hex[b[15]]
  )
}
