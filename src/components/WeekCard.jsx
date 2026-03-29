import { formatCurrency } from '../utils'

function WeekCard({ currentWeek, delta, last8Weeks }) {
  const absoluteDelta = Math.abs(delta)
  const deltaUp = delta > 0
  const deltaDown = delta < 0
  const maxValue = Math.max(...last8Weeks.map((week) => week.total), 1)

  return (
    <section className="week-card">
      <p className="week-label">this week</p>
      <h2 className="week-total">{formatCurrency(currentWeek.total)}</h2>
      <div className={`delta-badge ${deltaUp ? 'up' : 'down'}`}>
        {deltaDown ? '↓' : deltaUp ? '↑' : '→'} {formatCurrency(absoluteDelta)}
      </div>
      <p className="week-muted">vs last week</p>

      <div className="mini-chart" aria-label="Last eight weeks spending">
        {last8Weeks.map((week, idx) => (
          <div key={week.weekLabel} className="mini-bar-wrap">
            <div
              className={`mini-bar ${idx === last8Weeks.length - 1 ? 'current' : ''}`}
              style={{
                height: `${Math.max((week.total / maxValue) * 56, 6)}px`,
              }}
            />
            <span>{week.shortLabel}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default WeekCard
