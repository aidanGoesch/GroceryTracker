import { formatCurrency, formatDateLabel } from '../utils'

function InsightCard({ title, value, detail }) {
  return (
    <article className="insight-card">
      <p className="insight-title">{title}</p>
      <p className="insight-value">{value}</p>
      {detail ? <p className="insight-detail">{detail}</p> : null}
    </article>
  )
}

function formatStoreRange(bestStore, expensiveStore) {
  if (!bestStore || !expensiveStore) {
    return {
      value: 'Need at least 2 stores',
      detail: 'Add more receipts to compare store averages.',
    }
  }

  return {
    value: `Best: ${bestStore.storeName} ${formatCurrency(bestStore.average)}`,
    detail: `Highest: ${expensiveStore.storeName} ${formatCurrency(expensiveStore.average)}`,
  }
}

function formatBiggestTrip(inWindow, allTime) {
  if (!inWindow && !allTime) {
    return {
      value: 'No trips yet',
      detail: '',
    }
  }

  if (!inWindow && allTime) {
    return {
      value: formatCurrency(allTime.total),
      detail: `All-time at ${allTime.storeName}`,
    }
  }

  const inWindowDate = inWindow?.purchaseDate ? formatDateLabel(inWindow.purchaseDate, 'MMM d') : ''
  const allTimeText = allTime ? `All-time: ${formatCurrency(allTime.total)}` : ''

  return {
    value: `${formatCurrency(inWindow.total)} at ${inWindow.storeName}`,
    detail: [inWindowDate, allTimeText].filter(Boolean).join(' • '),
  }
}

function formatTopItem(topItem) {
  if (!topItem) {
    return {
      value: 'No line items yet',
      detail: '',
    }
  }

  return {
    value: topItem.itemName,
    detail: `${topItem.count} purchase${topItem.count === 1 ? '' : 's'}`,
  }
}

function InsightsGrid({ insights }) {
  const storeRange = formatStoreRange(insights.bestValueStore, insights.mostExpensiveStore)
  const biggestTrip = formatBiggestTrip(insights.biggestTripInWindow, insights.biggestTripAllTime)
  const topItem = formatTopItem(insights.topItem)

  if (!insights.hasAnyData) {
    return <p className="empty-note">Add a few receipts and we will surface fun insights here.</p>
  }

  return (
    <div className="insights-grid">
      <InsightCard title="store value spread" value={storeRange.value} detail={storeRange.detail} />
      <InsightCard title="biggest trip" value={biggestTrip.value} detail={biggestTrip.detail} />
      <InsightCard title="top item" value={topItem.value} detail={topItem.detail} />
    </div>
  )
}

export default InsightsGrid
