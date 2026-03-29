import { useCallback, useEffect, useState } from 'react'
import { endOfWeek, format, parseISO, startOfWeek, subWeeks } from 'date-fns'
import { supabase } from '../supabase'

function weekKey(date) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function useWeeklySpend() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentWeek, setCurrentWeek] = useState({ total: 0, weekLabel: '' })
  const [lastWeek, setLastWeek] = useState({ total: 0, weekLabel: '' })
  const [delta, setDelta] = useState(0)
  const [last8Weeks, setLast8Weeks] = useState([])

  const fetchWeeklySpend = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('receipts')
      .select('purchase_date, total')
      .order('purchase_date', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    const now = new Date()
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 })
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const weekStarts = Array.from({ length: 8 }, (_, idx) =>
      startOfWeek(subWeeks(currentWeekStart, 7 - idx), { weekStartsOn: 1 }),
    )

    const totalsByWeek = weekStarts.reduce((acc, weekStartDate) => {
      acc[weekKey(weekStartDate)] = 0
      return acc
    }, {})

    ;(data || []).forEach((row) => {
      const parsedDate = parseISO(row.purchase_date)
      const key = weekKey(parsedDate)
      if (totalsByWeek[key] !== undefined) {
        totalsByWeek[key] += Number(row.total || 0)
      }
    })

    const series = weekStarts.map((weekStartDate) => {
      const key = weekKey(weekStartDate)
      return {
        weekLabel: format(weekStartDate, 'MMM d'),
        shortLabel: `M${format(weekStartDate, 'd')}`,
        total: totalsByWeek[key] || 0,
      }
    })

    const currentKey = weekKey(currentWeekStart)
    const previousKey = weekKey(subWeeks(currentWeekStart, 1))
    const currentTotal = totalsByWeek[currentKey] || 0
    const previousTotal = totalsByWeek[previousKey] || 0

    setCurrentWeek({
      total: currentTotal,
      weekLabel: `week of ${format(currentWeekStart, 'MMM d').toLowerCase()}`,
      start: currentWeekStart,
      end: currentWeekEnd,
    })
    setLastWeek({
      total: previousTotal,
      weekLabel: `week of ${format(subWeeks(currentWeekStart, 1), 'MMM d').toLowerCase()}`,
    })
    setDelta(currentTotal - previousTotal)
    setLast8Weeks(series)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchWeeklySpend()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [fetchWeeklySpend])

  return {
    currentWeek,
    lastWeek,
    delta,
    last8Weeks,
    loading,
    error,
    refetch: fetchWeeklySpend,
  }
}
