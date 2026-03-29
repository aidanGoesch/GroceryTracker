import { format } from 'date-fns'

export function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

export function parsePrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const cleaned = String(value ?? '')
    .trim()
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/[^\d.-]/g, '')

  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toCents(value) {
  return Math.round(parsePrice(value) * 100)
}

export function centsToDollars(cents) {
  return Number((cents / 100).toFixed(2))
}

export function sumPrices(values) {
  const totalCents = values.reduce((sum, value) => sum + toCents(value), 0)
  return centsToDollars(totalCents)
}

export function formatDateLabel(dateValue, pattern = 'MMM d, yyyy') {
  if (!dateValue) return ''
  return format(new Date(`${dateValue}T00:00:00`), pattern)
}
