import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import CategoryGrid from '../components/CategoryGrid'
import ErrorBanner from '../components/ErrorBanner'
import ReceiptList from '../components/ReceiptList'
import SkeletonBlock from '../components/SkeletonBlock'
import WeekCard from '../components/WeekCard'
import { CATEGORIES } from '../constants'
import { useGroceryList } from '../hooks/useGroceryList'
import { useReceipts } from '../hooks/useReceipts'
import { useWeeklySpend } from '../hooks/useWeeklySpend'
import { supabase } from '../supabase'

function Home() {
  const { receipts, fetchReceipts, loading: receiptsLoading, error: receiptsError } = useReceipts()
  const { currentWeek, delta, last8Weeks, loading: weekLoading, error: weekError } = useWeeklySpend()
  const {
    items: groceryItems,
    loading: groceryLoading,
    error: groceryError,
    fetchItems: fetchGroceryItems,
    deleteItem,
  } = useGroceryList()
  const [categoryTotals, setCategoryTotals] = useState([])
  const [categoryError, setCategoryError] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState([])
  const [optimisticallyRemovedIds, setOptimisticallyRemovedIds] = useState([])
  const [motionEnabled, setMotionEnabled] = useState(false)
  const deleteTimersRef = useRef(new Map())
  const lastShakeTsRef = useRef(0)
  const hasRequestedMotionRef = useRef(false)
  const UNDO_WINDOW_MS = 1200

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  useEffect(() => {
    fetchGroceryItems()
  }, [fetchGroceryItems])

  useEffect(() => {
    const remainingIds = new Set(groceryItems.map((item) => item.id))
    setOptimisticallyRemovedIds((current) => current.filter((id) => remainingIds.has(id)))
  }, [groceryItems])

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

  const screenError = receiptsError || weekError || categoryError || groceryError
  const recentReceipts = useMemo(() => receipts.slice(0, 3), [receipts])
  const homeGroceryItems = useMemo(() => {
    const byCreatedAt = groceryItems
      .filter((item) => !optimisticallyRemovedIds.includes(item.id))
      .filter((item) => !item.is_checked)
      .sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
    return byCreatedAt.slice(0, 5)
  }, [groceryItems, optimisticallyRemovedIds])
  const hasPendingDeletes = pendingDeleteIds.length > 0

  useEffect(() => {
    const timerMap = deleteTimersRef.current
    return () => {
      timerMap.forEach((timer) => window.clearTimeout(timer))
      timerMap.clear()
    }
  }, [])

  useEffect(() => {
    if (!motionEnabled || !hasPendingDeletes || typeof window === 'undefined') return

    function undoLatestPendingDelete() {
      setPendingDeleteIds((current) => {
        if (current.length === 0) return current
        const latestId = current[current.length - 1]
        const timeoutId = deleteTimersRef.current.get(latestId)
        if (timeoutId) {
          window.clearTimeout(timeoutId)
          deleteTimersRef.current.delete(latestId)
        }
        return current.filter((id) => id !== latestId)
      })
    }

    function handleDeviceMotion(event) {
      const accel = event.accelerationIncludingGravity
      if (!accel) return
      const magnitude = Math.sqrt(
        (accel.x || 0) * (accel.x || 0) +
          (accel.y || 0) * (accel.y || 0) +
          (accel.z || 0) * (accel.z || 0),
      )
      const now = Date.now()
      if (magnitude < 24 || now - lastShakeTsRef.current < 1100) return
      lastShakeTsRef.current = now
      undoLatestPendingDelete()
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([18, 12, 18])
      }
    }

    window.addEventListener('devicemotion', handleDeviceMotion)
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion)
    }
  }, [motionEnabled, hasPendingDeletes])

  async function ensureMotionPermission() {
    if (hasRequestedMotionRef.current || motionEnabled || typeof window === 'undefined') return
    hasRequestedMotionRef.current = true
    if (!window.DeviceMotionEvent) return
    if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await window.DeviceMotionEvent.requestPermission()
        if (permission === 'granted') setMotionEnabled(true)
      } catch {
        // Permission prompt can be dismissed.
      }
      return
    }
    setMotionEnabled(true)
  }

  async function handleToggleGroceryItem(item) {
    if (pendingDeleteIds.includes(item.id)) return
    await ensureMotionPermission()
    setPendingDeleteIds((current) => [...current, item.id])
    const deleteTimer = window.setTimeout(async () => {
      setOptimisticallyRemovedIds((current) =>
        current.includes(item.id) ? current : [...current, item.id],
      )
      try {
        await deleteItem(item.id)
      } catch {
        setOptimisticallyRemovedIds((current) => current.filter((id) => id !== item.id))
        // Hook sets a user-visible error banner.
      } finally {
        deleteTimersRef.current.delete(item.id)
        setPendingDeleteIds((current) => current.filter((id) => id !== item.id))
      }
    }, UNDO_WINDOW_MS)
    deleteTimersRef.current.set(item.id, deleteTimer)
  }

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
        <h2>grocery list</h2>
        <Link className="section-link" to="/grocery-list">
          see all
        </Link>
      </section>
      <section className="panel home-grocery-widget">
        {groceryLoading ? (
          <SkeletonBlock className="skeleton-list" />
        ) : homeGroceryItems.length === 0 ? (
          <p className="empty-note">No grocery items yet. Add one from the list tab.</p>
        ) : (
          homeGroceryItems.map((item) => {
            const isTogglePending = pendingDeleteIds.includes(item.id)
            const isVisuallyChecked = isTogglePending || item.is_checked
            const rowClass = isTogglePending
              ? 'home-grocery-row checked is-deleting'
              : isVisuallyChecked
                ? 'home-grocery-row checked'
                : 'home-grocery-row'

            return (
              <label key={item.id} className={rowClass} style={{ '--home-delete-ms': `${UNDO_WINDOW_MS}ms` }}>
                <input
                  type="checkbox"
                  className="home-grocery-checkbox"
                  checked={isVisuallyChecked}
                  onChange={() => handleToggleGroceryItem(item)}
                  disabled={isTogglePending}
                />
                <span className={isVisuallyChecked ? 'home-grocery-name checked' : 'home-grocery-name'}>
                  {item.name}
                </span>
              </label>
            )
          })
        )}
      </section>

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
