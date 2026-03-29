import { useEffect, useMemo, useState } from 'react'
import ErrorBanner from '../components/ErrorBanner'
import SkeletonBlock from '../components/SkeletonBlock'
import { CATEGORIES } from '../constants'
import { useLineItems } from '../hooks/useLineItems'
import { formatDateLabel, formatCurrency } from '../utils'

function Items() {
  const { items, loading, error, fetchAllItems } = useLineItems()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchAllItems()
  }, [fetchAllItems])

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase()
    return items
      .filter((item) => (lowered ? item.name.toLowerCase().includes(lowered) : true))
      .filter((item) => (selectedCategory === 'All' ? true : item.category === selectedCategory))
      .sort((a, b) => {
        const aDate = new Date(a.receipts?.purchase_date || a.created_at).getTime()
        const bDate = new Date(b.receipts?.purchase_date || b.created_at).getTime()
        return bDate - aDate
      })
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
        <div className="panel item-list">
          {filtered.map((item) => (
            <div className="item-list-row" key={item.id}>
              <div>
                <p className="item-name">{item.name}</p>
                <p className="item-meta">
                  {item.receipts?.store_name || 'Unknown Store'} ·{' '}
                  {formatDateLabel(item.receipts?.purchase_date || item.created_at, 'MMM d')}
                </p>
              </div>
              <div className="item-actions">
                <span className="category-badge">{item.category}</span>
                <span className="item-price">{formatCurrency(item.price)}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="empty-note">No matching items.</p>}
        </div>
      )}
    </section>
  )
}

export default Items
