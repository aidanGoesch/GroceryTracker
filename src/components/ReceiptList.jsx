import { useNavigate } from 'react-router-dom'
import { formatDateLabel, formatCurrency } from '../utils'

function ReceiptList({ receipts }) {
  const navigate = useNavigate()

  if (!receipts.length) {
    return <p className="empty-note">No receipts yet.</p>
  }

  return (
    <div className="receipt-list">
      {receipts.map((receipt) => {
        const initial = (receipt.store_name || 'U').charAt(0).toUpperCase()
        return (
          <button
            type="button"
            key={receipt.id}
            className="receipt-row"
            onClick={() => navigate(`/receipts/${receipt.id}`)}
          >
            <div className="receipt-left">
              <div className="store-circle">{initial}</div>
              <div>
                <p className="store-name">{receipt.store_name}</p>
                <p className="receipt-meta">
                  {formatDateLabel(receipt.purchase_date, 'MMM d, yyyy')} · {receipt.item_count || 0} items
                </p>
              </div>
            </div>
            <p className="receipt-total">{formatCurrency(receipt.total)}</p>
          </button>
        )
      })}
    </div>
  )
}

export default ReceiptList
