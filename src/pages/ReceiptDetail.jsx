import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES } from '../constants'
import { useLineItems } from '../hooks/useLineItems'
import { useReceipts } from '../hooks/useReceipts'
import { supabase } from '../supabase'
import { formatDateLabel, formatCurrency } from '../utils'
import ErrorBanner from '../components/ErrorBanner'
import SkeletonBlock from '../components/SkeletonBlock'

function ReceiptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { deleteReceipt } = useReceipts()
  const { items, loading, error, fetchItemsForReceipt, updateItemCategory, deleteItem } = useLineItems()

  const [receipt, setReceipt] = useState(null)
  const [receiptError, setReceiptError] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function fetchReceipt() {
      const { data, error: queryError } = await supabase
        .from('receipts')
        .select('id, store_name, purchase_date, total, image_url')
        .eq('id', id)
        .single()

      if (queryError) {
        setReceiptError(queryError.message)
        return
      }
      setReceipt(data)
    }

    fetchReceipt()
    fetchItemsForReceipt(id)
  }, [id, fetchItemsForReceipt])

  const grouped = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = []
      acc[item.category].push(item)
      return acc
    }, {})
  }, [items])

  async function handleDeleteReceipt() {
    const confirmed = window.confirm('Delete this receipt and all line items?')
    if (!confirmed) return
    try {
      await deleteReceipt(id)
      navigate('/receipts')
    } catch {
      setReceiptError('Failed to delete receipt.')
    }
  }

  async function handleDeleteItem(itemId) {
    try {
      await deleteItem(itemId)
    } catch {
      setReceiptError('Failed to delete item.')
    }
  }

  async function handleCategoryChange(itemId, category) {
    try {
      await updateItemCategory(itemId, category)
      setEditingCategoryId('')
    } catch {
      setReceiptError('Failed to update category.')
    }
  }

  if (!receipt && !receiptError) {
    return (
      <section className="page">
        <SkeletonBlock className="skeleton-detail" />
      </section>
    )
  }

  return (
    <section className="page">
      <ErrorBanner
        message={dismissed ? '' : receiptError || error}
        onDismiss={() => setDismissed(true)}
      />
      <header className="detail-header">
        <button type="button" className="icon-button" onClick={() => navigate(-1)}>
          ←
        </button>
        <div>
          <h1 className="page-title">{receipt?.store_name || 'Receipt'}</h1>
          <p className="mono-label">{formatDateLabel(receipt?.purchase_date)}</p>
        </div>
        <button type="button" className="icon-button danger" onClick={handleDeleteReceipt}>
          🗑
        </button>
      </header>

      <p className="detail-total">{formatCurrency(receipt?.total || 0)}</p>

      {loading ? (
        <SkeletonBlock className="skeleton-list tall" />
      ) : (
        Object.entries(grouped).map(([category, categoryItems]) => (
          <section key={category} className="panel">
            <h2 className="section-title">{category}</h2>
            {categoryItems.map((item) => (
              <div className="item-row" key={item.id}>
                <p>{item.name}</p>
                <div className="item-actions">
                  <span className="item-price">{formatCurrency(item.price)}</span>
                  {editingCategoryId === item.id ? (
                    <select
                      value={item.category}
                      onChange={(event) => handleCategoryChange(item.id, event.target.value)}
                      onBlur={() => setEditingCategoryId('')}
                    >
                      {CATEGORIES.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      type="button"
                      className="category-badge"
                      onClick={() => setEditingCategoryId(item.id)}
                    >
                      {item.category}
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => handleDeleteItem(item.id)}
                    aria-label="Delete item"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </section>
  )
}

export default ReceiptDetail
