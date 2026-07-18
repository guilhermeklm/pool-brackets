import { describe, it, expect } from 'vitest'
import { formatCents, textToCents, maskCents } from './money'

// Usa   (espaço não separável) porque é assim que o Intl formata "R$".
const brl = (s: string) => s.replace(/ /g, ' ')

describe('formatCents', () => {
  it('formata centavos como moeda brasileira', () => {
    expect(formatCents(2000)).toBe(brl('R$ 20,00'))
    expect(formatCents(2050)).toBe(brl('R$ 20,50'))
    expect(formatCents(0)).toBe(brl('R$ 0,00'))
  })
})

describe('textToCents', () => {
  it('extrai apenas os dígitos', () => {
    expect(textToCents('R$ 20,00')).toBe(2000)
    expect(textToCents('1.234,56')).toBe(123456)
    expect(textToCents('20')).toBe(20)
  })
  it('retorna 0 sem dígitos', () => {
    expect(textToCents('')).toBe(0)
    expect(textToCents('abc')).toBe(0)
  })
})

describe('maskCents', () => {
  it('acumula os dígitos como centavos', () => {
    expect(maskCents('2')).toBe('0,02')
    expect(maskCents('200')).toBe('2,00')
    expect(maskCents('2000')).toBe('20,00')
  })
})
