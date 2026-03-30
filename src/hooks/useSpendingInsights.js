import { useCallback, useEffect, useState } from 'react'
import { format, subMonths } from 'date-fns'
import { supabase } from '../supabase'

const DEFAULT_WINDOW_MONTHS = 3

function normalizeStoreName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function normalizeItemName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function toDateString(value) {
  return format(value, 'yyyy-MM-dd')
}

function extractPurchaseDate(receiptsRelation) {
  if (!receiptsRelation) return ''
  if (Array.isArray(receiptsRelation)) {
    return receiptsRelation[0]?.purchase_date || ''
  }
  return receiptsRelation.purchase_date || ''
}

export function useSpendingInsights(windowMonths = DEFAULT_WINDOW_MONTHS) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [insights, setInsights] = useState({
    bestValueStore: null,
    mostExpensiveStore: null,
    biggestTripInWindow: null,
    biggestTripAllTime: null,
    topItem: null,
    windowLabel: `last ${windowMonths} months`,
    hasAnyData: false,
  })

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    setError('')

    const endDate = new Date()
    const startDate = subMonths(endDate, windowMonths)
    const start = toDateString(startDate)
    const end = toDateString(endDate)

    const [receiptsResult, lineItemsResult, allTimeResult] = await Promise.all([
      supabase
        .from('receipts')
        .select('store_name, purchase_date, total')
        .gte('purchase_date', start)
        .lte('purchase_date', end),
      supabase
        .from('line_items')
        .select('name, receipts!inner(purchase_date)')
        .gte('receipts.purchase_date', start)
        .lte('receipts.purchase_date', end),
      supabase
        .from('receipts')
        .select('store_name, purchase_date, total')
        .order('total', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (receiptsResult.error || lineItemsResult.error || allTimeResult.error) {
      const queryError = receiptsResult.error || lineItemsResult.error || allTimeResult.error
      setError(queryError?.message || 'Unable to load insights.')
      setLoading(false)
      return
    }

    const receiptRows = receiptsResult.data || []
    const lineItemRows = lineItemsResult.data || []
    const allTimeRow = allTimeResult.data || null

    const storeStats = {}
    let biggestTripInWindow = null

    for (const row of receiptRows) {
      const storeLabel = String(row.store_name || '').trim() || 'Unknown store'
      const storeKey = normalizeStoreName(storeLabel) || 'unknown-store'
      const total = Number(row.total || 0)
      const purchaseDate = row.purchase_date || ''

      if (!storeStats[storeKey]) {
        storeStats[storeKey] = {
          storeName: storeLabel,
          sum: 0,
          count: 0,
        }
      }

      storeStats[storeKey].sum += Number.isFinite(total) ? total : 0
      storeStats[storeKey].count += 1

      if (!biggestTripInWindow || total > biggestTripInWindow.total) {
        biggestTripInWindow = {
          total: Number.isFinite(total) ? total : 0,
          storeName: storeLabel,
          purchaseDate,
        }
      }
    }

    const stores = Object.values(storeStats)
      .map((store) => ({
        ...store,
        average: store.count > 0 ? store.sum / store.count : 0,
      }))
      .sort((a, b) => a.average - b.average)

    const bestValueStore = stores.length >= 2 ? stores[0] : null
    const mostExpensiveStore = stores.length >= 2 ? stores[stores.length - 1] : null

    const itemStats = {}
    for (const row of lineItemRows) {
      const itemLabel = normalizeItemName(row.name)
      if (!itemLabel) continue

      const key = itemLabel.toLowerCase()
      const purchaseDate = extractPurchaseDate(row.receipts)
      if (!itemStats[key]) {
        itemStats[key] = {
          itemName: itemLabel,
          count: 0,
          latestDate: '',
        }
      }

      itemStats[key].count += 1
      if (!itemStats[key].latestDate || purchaseDate > itemStats[key].latestDate) {
        itemStats[key].latestDate = purchaseDate
        itemStats[key].itemName = itemLabel
      }
    }

    const topItem =
      Object.values(itemStats).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count
        return String(b.latestDate || '').localeCompare(String(a.latestDate || ''))
      })[0] || null

    const biggestTripAllTime = allTimeRow
      ? {
          total: Number(allTimeRow.total || 0),
          storeName: String(allTimeRow.store_name || '').trim() || 'Unknown store',
          purchaseDate: allTimeRow.purchase_date || '',
        }
      : null

    const hasAnyData = Boolean(
      bestValueStore || mostExpensiveStore || biggestTripInWindow || biggestTripAllTime || topItem,
    )

    setInsights({
      bestValueStore,
      mostExpensiveStore,
      biggestTripInWindow,
      biggestTripAllTime,
      topItem,
      windowLabel: `last ${windowMonths} months`,
      hasAnyData,
    })
    setLoading(false)
  }, [windowMonths])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchInsights()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [fetchInsights])

  return {
    insights,
    loading,
    error,
    refetch: fetchInsights,
  }
}
