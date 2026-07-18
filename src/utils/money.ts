// Helpers de dinheiro. Valores são guardados em centavos (inteiros) para evitar
// erros de ponto flutuante.

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/** Formata centavos como moeda brasileira (ex: 2000 -> "R$ 20,00"). */
export function formatCents(cents: number): string {
  return brlFormatter.format(cents / 100)
}

/**
 * Converte o texto digitado pelo usuário em centavos.
 * Aceita "20", "20,00", "R$ 20,50", "1.234,56". Retorna 0 se não houver dígitos.
 */
export function textToCents(text: string): number {
  const digitsOnly = text.replace(/\D/g, '')
  if (!digitsOnly) return 0
  return parseInt(digitsOnly, 10)
}

/**
 * Máscara para input de moeda: mostra o valor sempre com 2 casas.
 * Ex: enquanto digita "2" -> "0,02", "200" -> "2,00".
 */
export function maskCents(text: string): string {
  const cents = textToCents(text)
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
