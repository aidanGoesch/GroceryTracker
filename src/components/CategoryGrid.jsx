import { CATEGORY_ICONS, RANK_COLORS } from '../constants'
import { formatCurrency } from '../utils'

function CategoryGrid({ categories, limit = null }) {
  const sorted = [...categories]
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
  const selected = limit ? sorted.slice(0, limit) : sorted
  const totalSpend = selected.reduce((sum, item) => sum + item.total, 0)

  if (selected.length === 0) {
    return <p className="empty-note">No category data yet.</p>
  }

  return (
    <div className="category-grid">
      {selected.map((item, index) => (
        <article key={item.category} className="category-card">
          <div className="category-row">
            <span className="category-emoji">{CATEGORY_ICONS[item.category] || '📦'}</span>
            <span className="category-name">{item.category}</span>
          </div>
          <p className="category-total">{formatCurrency(item.total)}</p>
          <div className="category-progress">
            <span
              style={{
                width: `${Math.max((item.total / Math.max(totalSpend, 1)) * 100, 4)}%`,
                background: RANK_COLORS[index] || RANK_COLORS[RANK_COLORS.length - 1],
              }}
            />
          </div>
        </article>
      ))}
    </div>
  )
}

export default CategoryGrid
