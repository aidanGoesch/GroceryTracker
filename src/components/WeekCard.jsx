import { useState } from 'react'
import { formatCurrency } from '../utils'

function WeekCard({ currentWeek, delta, last8Weeks }) {
  const absoluteDelta = Math.abs(delta)
  const deltaUp = delta > 0
  const deltaDown = delta < 0
  const maxValue = Math.max(...last8Weeks.map((week) => week.total), 1)
  const [pressedWeekLabel, setPressedWeekLabel] = useState('')

  function showWeekValue(weekLabel) {
    setPressedWeekLabel(weekLabel)
  }

  function hideWeekValue() {
    setPressedWeekLabel('')
  }

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
            {pressedWeekLabel === week.weekLabel && (
              <span className="mini-bar-value">{formatCurrency(week.total)}</span>
            )}
            <button
              type="button"
              className={pressedWeekLabel === week.weekLabel ? 'mini-bar-button is-selected' : 'mini-bar-button'}
              onPointerDown={() => showWeekValue(week.weekLabel)}
              onPointerUp={hideWeekValue}
              onPointerCancel={hideWeekValue}
              onPointerLeave={hideWeekValue}
              onBlur={hideWeekValue}
              onKeyDown={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  showWeekValue(week.weekLabel)
                }
              }}
              onKeyUp={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  hideWeekValue()
                }
              }}
              aria-label={`${week.weekLabel}: ${formatCurrency(week.total)}`}
            >
              <div
                className={`mini-bar ${idx === last8Weeks.length - 1 ? 'current' : ''}`}
                style={{
                  height: `${Math.max((week.total / maxValue) * 56, 6)}px`,
                }}
              />
            </button>
            <span>{week.shortLabel}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default WeekCard
