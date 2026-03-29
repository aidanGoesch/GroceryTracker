import { useEffect, useMemo, useState } from 'react'
import ErrorBanner from '../components/ErrorBanner'
import ReceiptList from '../components/ReceiptList'
import SkeletonBlock from '../components/SkeletonBlock'
import { useReceipts } from '../hooks/useReceipts'

function Receipts() {
  const { receipts, loading, error, fetchReceipts } = useReceipts()
  const [search, setSearch] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  const filtered = useMemo(() => {
    const lowered = search.trim().toLowerCase()
    if (!lowered) return receipts
    return receipts.filter((receipt) => receipt.store_name.toLowerCase().includes(lowered))
  }, [receipts, search])

  return (
    <section className="page">
      <ErrorBanner message={dismissed ? '' : error} onDismiss={() => setDismissed(true)} />
      <header className="page-header">
        <h1 className="page-title">receipts</h1>
      </header>
      <input
        className="search-input"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by store name"
      />
      {loading ? <SkeletonBlock className="skeleton-list tall" /> : <ReceiptList receipts={filtered} />}
    </section>
  )
}

export default Receipts
