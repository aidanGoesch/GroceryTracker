import { useEffect, useMemo, useState } from 'react'
import ErrorBanner from '../components/ErrorBanner'
import SkeletonBlock from '../components/SkeletonBlock'
import { useGroceryList } from '../hooks/useGroceryList'

const SWIPE_TRIGGER_PX = 72
const MAX_SWIPE_PX = 110

function triggerHaptic(pattern = 12) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  navigator.vibrate(pattern)
}

function GroceryList() {
  const {
    items,
    loading,
    saving,
    error,
    fetchItems,
    addItem,
    updateItemName,
    toggleItemChecked,
    deleteItem,
    fetchSuggestions,
  } = useGroceryList()

  const [draftName, setDraftName] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [editingId, setEditingId] = useState('')
  const [editingValue, setEditingValue] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [swipeId, setSwipeId] = useState('')
  const [swipeX, setSwipeX] = useState(0)
  const [swipeStartX, setSwipeStartX] = useState(0)

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const itemNameSet = useMemo(
    () => new Set(items.map((item) => item.name.trim().toLowerCase())),
    [items],
  )

  useEffect(() => {
    let isCurrent = true
    const timer = setTimeout(async () => {
      const next = await fetchSuggestions(draftName)
      if (!isCurrent) return
      const filtered = next.filter((name) => !itemNameSet.has(name.toLowerCase()))
      setSuggestions(filtered)
    }, 180)

    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [draftName, fetchSuggestions, itemNameSet])

  const activeItems = useMemo(() => items.filter((item) => !item.is_checked), [items])
  const checkedItems = useMemo(() => items.filter((item) => item.is_checked), [items])

  async function handleAddItem(nameToAdd = draftName, options = {}) {
    const { fromSuggestion = false } = options
    const normalized = nameToAdd.trim()
    if (!normalized) return
    const previousDraft = draftName
    if (fromSuggestion) {
      setSuggestions((current) =>
        current.filter((name) => name.toLowerCase() !== normalized.toLowerCase()),
      )
    } else {
      setDraftName('')
    }
    try {
      await addItem(normalized)
    } catch {
      if (fromSuggestion) {
        setSuggestions((current) =>
          current.some((name) => name.toLowerCase() === normalized.toLowerCase())
            ? current
            : [normalized, ...current],
        )
      } else {
        setDraftName(previousDraft || normalized)
      }
      // Hook sets a user-visible error banner.
    }
  }

  async function handleToggle(item) {
    try {
      await toggleItemChecked(item.id, !item.is_checked)
      triggerHaptic(20)
    } catch {
      // Hook sets a user-visible error banner.
    }
  }

  async function handleDelete(id) {
    try {
      await deleteItem(id)
      triggerHaptic([14, 20, 14])
    } catch {
      // Hook sets a user-visible error banner.
    }
  }

  function startEditing(item) {
    setEditingId(item.id)
    setEditingValue(item.name)
  }

  function cancelEditing() {
    setEditingId('')
    setEditingValue('')
  }

  async function saveEdit() {
    const normalized = editingValue.trim()
    if (!editingId || !normalized) return
    try {
      await updateItemName(editingId, normalized)
      cancelEditing()
    } catch {
      // Hook sets a user-visible error banner.
    }
  }

  function renderRow(item) {
    const isEditing = editingId === item.id
    const activeSwipeX = swipeId === item.id ? swipeX : 0
    const swipeClass = activeSwipeX > 0 ? 'swipe-right' : activeSwipeX < 0 ? 'swipe-left' : ''

    function beginSwipe(event) {
      if (saving || isEditing) return
      if (event.target.closest('button, input, label')) return
      event.currentTarget.setPointerCapture(event.pointerId)
      setSwipeId(item.id)
      setSwipeStartX(event.clientX)
      setSwipeX(0)
    }

    function moveSwipe(event) {
      if (swipeId !== item.id || saving || isEditing) return
      const delta = event.clientX - swipeStartX
      const nextX = Math.max(-MAX_SWIPE_PX, Math.min(MAX_SWIPE_PX, delta))
      setSwipeX(nextX)
    }

    async function endSwipe(event) {
      if (swipeId !== item.id) return
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      const finalX = swipeX
      setSwipeId('')
      setSwipeX(0)

      if (finalX <= -SWIPE_TRIGGER_PX) {
        await handleDelete(item.id)
        return
      }

      if (finalX >= SWIPE_TRIGGER_PX && !item.is_checked) {
        await handleToggle(item)
      }
    }

    return (
      <div key={item.id} className="grocery-row-wrap">
        <div className="grocery-row-bg" aria-hidden="true">
          <span className="swipe-hint swipe-hint-right">{item.is_checked ? '' : 'check'}</span>
          <span className="swipe-hint swipe-hint-left">delete</span>
        </div>
        <div
          className={`grocery-row ${swipeClass}`}
          style={{ transform: `translateX(${activeSwipeX}px)` }}
          onPointerDown={beginSwipe}
          onPointerMove={moveSwipe}
          onPointerUp={endSwipe}
          onPointerCancel={endSwipe}
        >
          <label className="grocery-check-wrap">
            <input
              type="checkbox"
              checked={item.is_checked}
              onChange={() => handleToggle(item)}
              disabled={saving}
            />
          </label>

          {isEditing ? (
            <input
              type="text"
              className="grocery-edit-input"
              value={editingValue}
              onChange={(event) => setEditingValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveEdit()
                if (event.key === 'Escape') cancelEditing()
              }}
              disabled={saving}
            />
          ) : (
            <p className={item.is_checked ? 'grocery-name checked' : 'grocery-name'}>{item.name}</p>
          )}

          <div className="item-actions">
            {isEditing ? (
              <>
                <button type="button" className="text-button" onClick={saveEdit} disabled={saving}>
                  save
                </button>
                <button type="button" className="text-button" onClick={cancelEditing} disabled={saving}>
                  cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-button"
                onClick={() => startEditing(item)}
                disabled={saving}
              >
                edit
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="page">
      <ErrorBanner message={dismissed ? '' : error} onDismiss={() => setDismissed(true)} />
      <header className="page-header">
        <h1 className="page-title">grocery list</h1>
      </header>

      <form
        className="panel grocery-add-form"
        onSubmit={(event) => {
          event.preventDefault()
          handleAddItem(draftName)
        }}
      >
        <div className="grocery-add-row">
          <input
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="Add an item"
            aria-label="New grocery item"
            disabled={saving}
          />
          <button type="submit" className="primary-button" disabled={saving || !draftName.trim()}>
            add
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="grocery-suggestion-wrap">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                className="pill"
                onClick={() => handleAddItem(name, { fromSuggestion: true })}
                disabled={saving}
              >
                + {name}
              </button>
            ))}
          </div>
        )}
      </form>

      {loading ? (
        <SkeletonBlock className="skeleton-list tall" />
      ) : (
        <>
          <section className="panel">
            <h2 className="section-title">to buy</h2>
            {activeItems.length === 0 ? (
              <p className="empty-note">No active items. Add one above.</p>
            ) : (
              activeItems.map(renderRow)
            )}
          </section>

          <section className="panel">
            <h2 className="section-title">checked</h2>
            {checkedItems.length === 0 ? (
              <p className="empty-note">No checked items yet.</p>
            ) : (
              checkedItems.map(renderRow)
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default GroceryList
