import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import CategoryGrid from '../components/CategoryGrid'
import ErrorBanner from '../components/ErrorBanner'
import ReceiptList from '../components/ReceiptList'
import SkeletonBlock from '../components/SkeletonBlock'
import WeekCard from '../components/WeekCard'
import { CATEGORIES } from '../constants'
import { useReceipts } from '../hooks/useReceipts'
import { useWeeklySpend } from '../hooks/useWeeklySpend'
import { supabase } from '../supabase'

function Home() {
  const { receipts, fetchReceipts, loading: receiptsLoading, error: receiptsError } = useReceipts()
  const { currentWeek, delta, last8Weeks, loading: weekLoading, error: weekError } = useWeeklySpend()
  const [categoryTotals, setCategoryTotals] = useState([])
  const [categoryError, setCategoryError] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  useEffect(() => {
    async function fetchCategoryTotals() {
      if (!currentWeek?.start || !currentWeek?.end) return
      const start = format(currentWeek.start, 'yyyy-MM-dd')
      const end = format(currentWeek.end, 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('line_items')
        .select('category, price, receipts!inner(purchase_date)')
        .gte('receipts.purchase_date', start)
        .lte('receipts.purchase_date', end)

      if (error) {
        setCategoryError(error.message)
        return
      }

      const seeded = CATEGORIES.reduce((acc, category) => ({ ...acc, [category]: 0 }), {})
      for (const row of data || []) {
        seeded[row.category] = (seeded[row.category] || 0) + Number(row.price || 0)
      }
      setCategoryTotals(
        Object.entries(seeded).map(([category, total]) => ({
          category,
          total,
        })),
      )
    }

    fetchCategoryTotals()
  }, [currentWeek])

  const screenError = receiptsError || weekError || categoryError
  const recentReceipts = useMemo(() => receipts.slice(0, 3), [receipts])

  return (
    <section className="page">
      <ErrorBanner message={dismissed ? '' : screenError} onDismiss={() => setDismissed(true)} />
      <header className="home-header">
        <p className="mono-label">{currentWeek.weekLabel || 'week of --'}</p>
        <h1 className="hero-title">
          your <span>grocery</span> spend
        </h1>
      </header>

      {weekLoading ? (
        <SkeletonBlock className="skeleton-week" />
      ) : (
        <WeekCard currentWeek={currentWeek} delta={delta} last8Weeks={last8Weeks} />
      )}

      <section className="section-head">
        <h2>by category</h2>
      </section>
      {weekLoading ? <SkeletonBlock className="skeleton-grid" /> : <CategoryGrid categories={categoryTotals} limit={4} />}

      <section className="section-head">
        <h2>recent receipts</h2>
      </section>
      {receiptsLoading ? <SkeletonBlock className="skeleton-list" /> : <ReceiptList receipts={recentReceipts} />}
    </section>
  )
}

export default Home
