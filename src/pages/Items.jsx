import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, startOfWeek } from 'date-fns'
import ErrorBanner from '../components/ErrorBanner'
import SkeletonBlock from '../components/SkeletonBlock'
import { CATEGORIES } from '../constants'
import { useLineItems } from '../hooks/useLineItems'
import { formatCurrency } from '../utils'

function getItemDate(item) {
  const source = item.receipts?.purchase_date || item.created_at
  if (!source) return new Date(0)
  try {
    return parseISO(source)
  } catch {
    return new Date(source)
  }
}

function Items() {
  const { items, loading, error, fetchAllItems } = useLineItems()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchAllItems()
  }, [fetchAllItems])

  const groupedByWeek = useMemo(() => {
    const lowered = search.trim().toLowerCase()
    const filtered = items
      .filter((item) => (lowered ? item.name.toLowerCase().includes(lowered) : true))
      .filter((item) => (selectedCategory === 'All' ? true : item.category === selectedCategory))
      .sort((a, b) => {
        const aDate = getItemDate(a).getTime()
        const bDate = getItemDate(b).getTime()
        return bDate - aDate
      })

    const byWeek = new Map()
    for (const item of filtered) {
      const itemDate = getItemDate(item)
      const weekStart = startOfWeek(itemDate, { weekStartsOn: 1 })
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      if (!byWeek.has(weekKey)) {
        byWeek.set(weekKey, {
          key: weekKey,
          label: `week of ${format(weekStart, 'MMM d').toLowerCase()}`,
          items: [],
        })
      }
      byWeek.get(weekKey).items.push(item)
    }

    return [...byWeek.values()].sort((a, b) => (a.key < b.key ? 1 : -1))
  }, [items, search, selectedCategory])

  return (
    <section className="page">
      <ErrorBanner message={dismissed ? '' : error} onDismiss={() => setDismissed(true)} />
      <header className="page-header">
        <h1 className="page-title">items</h1>
      </header>

      <input
        className="search-input"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search item name"
      />

      <div className="filter-pills">
        {['All', ...CATEGORIES].map((category) => (
          <button
            key={category}
            type="button"
            className={selectedCategory === category ? 'pill active' : 'pill'}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonBlock className="skeleton-list tall" />
      ) : (
        <>
          {groupedByWeek.map((week) => (
            <div className="panel item-list" key={week.key}>
              <h2 className="section-title">{week.label}</h2>
              {week.items.map((item) => (
                <div className="item-list-row" key={item.id}>
                  <div>
                    <p className="item-name">{item.name}</p>
                    <p className="item-meta">
                      {item.receipts?.store_name || 'Unknown Store'} · {format(getItemDate(item), 'MMM d')}
                    </p>
                  </div>
                  <div className="item-actions">
                    <span className="category-badge">{item.category}</span>
                    <span className="item-price">{formatCurrency(item.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
          {groupedByWeek.length === 0 && <p className="empty-note">No matching items.</p>}
        </>
      )}
    </section>
  )
}

export default Items
