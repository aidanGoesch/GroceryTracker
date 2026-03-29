import { format } from 'date-fns'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { CATEGORIES } from './constants'
import { supabase } from './supabase'
import { centsToDollars, toCents } from './utils'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.split(',')[1] || '')
    }
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

function extractJson(text) {
  const cleaned = text.trim().replace(/^```json/i, '').replace(/```$/i, '').trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('Claude did not return JSON.')
  }
  return cleaned.slice(firstBrace, lastBrace + 1)
}

function normalizeResponse(parsed) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const safeItems = Array.isArray(parsed.items) ? parsed.items : []
  const subtotalCents = toCents(parsed.subtotal)

  const normalizedItems = safeItems
    .map((item) => {
      const rawPriceCents = toCents(item?.price)
      if (rawPriceCents <= 0) return null
      // Bound each extracted estimate against the receipt subtotal when available.
      if (subtotalCents > 0 && rawPriceCents > subtotalCents) return null
      const category = CATEGORIES.includes(item?.category) ? item.category : 'Other'
      return {
        name: String(item?.name || 'Unnamed item').trim() || 'Unnamed item',
        price: centsToDollars(rawPriceCents),
        category,
      }
    })
    .filter(Boolean)

  const totalCents = normalizedItems.reduce((sum, item) => sum + toCents(item.price), 0)
  const hasValidSubtotal = subtotalCents > 0
  const isBalanced = hasValidSubtotal && totalCents === subtotalCents

  let validationError = ''
  if (!hasValidSubtotal) {
    validationError =
      'Could not read a valid subtotal from the receipt. Please set subtotal and adjust line items before saving.'
  } else if (!isBalanced) {
    validationError = `Parsed items (${centsToDollars(totalCents).toFixed(2)}) do not match subtotal (${centsToDollars(subtotalCents).toFixed(2)}). Please adjust line items before saving.`
  }

  return {
    store_name: String(parsed.store_name || 'Unknown Store').trim() || 'Unknown Store',
    purchase_date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.purchase_date || '')
      ? parsed.purchase_date
      : today,
    items: normalizedItems,
    subtotal: centsToDollars(subtotalCents),
    total: centsToDollars(totalCents),
    canSave: isBalanced,
    validationError,
  }
}

export async function parseReceiptWithClaude(file) {
  const base64 = await fileToBase64(file)
  const { data, error } = await supabase.functions.invoke('parse-receipt', {
    body: {
      base64,
      mediaType: file.type || 'image/jpeg',
    },
  })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const details = await error.context.json()
        throw new Error(details?.error || `Edge Function HTTP ${error.context.status}`)
      } catch {
        throw new Error(`Edge Function HTTP ${error.context.status}`)
      }
    }
    throw new Error(error.message || 'Failed to parse receipt.')
  }

  const contentText = data?.text
  if (!contentText) {
    throw new Error(data?.error || 'Claude response missing text output.')
  }

  const parsed = JSON.parse(extractJson(contentText))
  return normalizeResponse(parsed)
}
