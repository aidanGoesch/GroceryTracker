import { CATEGORIES } from '../constants'
import { formatCurrency, sumPrices, toCents } from '../utils'

function ReviewScreen({
  form,
  onFieldChange,
  onItemChange,
  onDeleteItem,
  onAddItem,
  onSave,
  onCancel,
  saving,
  canSave,
  computedTotal,
  computedSubtotal,
  imagePreviewUrl,
}) {
  const total = computedTotal ?? sumPrices(form.items.map((item) => item.price))
  const subtotal = computedSubtotal ?? sumPrices([form.subtotal])
  const deltaCents = toCents(total) - toCents(subtotal)

  return (
    <section className="panel review-panel">
      <h1 className="page-title">review receipt</h1>
      {imagePreviewUrl && (
        <div className="review-image-wrap">
          <img src={imagePreviewUrl} alt="Uploaded receipt" className="review-image" />
        </div>
      )}

      <label className="field">
        <span>Store name</span>
        <input
          type="text"
          value={form.store_name}
          onChange={(event) => onFieldChange('store_name', event.target.value)}
        />
      </label>

      <label className="field">
        <span>Date</span>
        <input
          type="date"
          value={form.purchase_date}
          onChange={(event) => onFieldChange('purchase_date', event.target.value)}
        />
      </label>

      <label className="field">
        <span>Subtotal</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.subtotal}
          onChange={(event) => onFieldChange('subtotal', event.target.value)}
        />
      </label>

      <div className="review-table">
        {form.items.map((item, index) => (
          <div key={item.id} className="review-row">
            <input
              type="text"
              value={item.name}
              onChange={(event) => onItemChange(index, 'name', event.target.value)}
              placeholder="Item name"
            />
            <select
              value={item.category}
              onChange={(event) => onItemChange(index, 'category', event.target.value)}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.price}
              onChange={(event) => onItemChange(index, 'price', event.target.value)}
              placeholder="0.00"
            />
            <button
              type="button"
              className="delete-line-item"
              onClick={() => onDeleteItem(index)}
              aria-label="Delete item"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="text-button" onClick={onAddItem}>
        + add item
      </button>

      <div className="review-total-wrap">
        <p>Total</p>
        <strong className="review-total">{formatCurrency(total)}</strong>
      </div>
      <div className="review-total-wrap">
        <p>Subtotal target</p>
        <strong className="review-total">{formatCurrency(subtotal)}</strong>
      </div>
      {!canSave && (
        <p className="inline-error">
          Subtotal and line item sum must match before saving (
          {deltaCents > 0 ? '+' : deltaCents < 0 ? '-' : ''}
          {formatCurrency(Math.abs(deltaCents) / 100)} difference).
        </p>
      )}

      <button type="button" className="primary-button" disabled={saving || !canSave} onClick={onSave}>
        {saving ? 'saving...' : 'save receipt'}
      </button>
      <button type="button" className="text-button" onClick={onCancel}>
        cancel
      </button>
    </section>
  )
}

export default ReviewScreen
