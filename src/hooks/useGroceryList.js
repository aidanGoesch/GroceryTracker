import { useCallback, useState } from 'react'
import { supabase } from '../supabase'

let groceryItemsCache = []

function normalizeItemName(name) {
  return name.trim().replace(/\s+/g, ' ')
}

export function useGroceryList() {
  const [items, setItems] = useState(() => groceryItemsCache)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchItems = useCallback(async () => {
    const hasCachedData = groceryItemsCache.length > 0
    if (hasCachedData) {
      setItems(groceryItemsCache)
    }
    setLoading(!hasCachedData)
    setError('')

    const { data, error: queryError } = await supabase
      .from('grocery_list_items')
      .select('id, name, is_checked, created_at, updated_at')
      .order('is_checked', { ascending: true })
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    const next = data || []
    groceryItemsCache = next
    setItems(next)
    setLoading(false)
  }, [])

  const addItem = useCallback(async (name) => {
    const normalizedName = normalizeItemName(name)
    if (!normalizedName) return null

    const optimisticItem = {
      id: `temp-${crypto.randomUUID()}`,
      name: normalizedName,
      is_checked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setItems((current) => {
      const next = [...current, optimisticItem]
      groceryItemsCache = next
      return next
    })
    setSaving(true)
    setError('')

    const { data, error: insertError } = await supabase
      .from('grocery_list_items')
      .insert({ name: normalizedName })
      .select('id, name, is_checked, created_at, updated_at')
      .single()

    if (insertError) {
      setItems((current) => {
        const next = current.filter((item) => item.id !== optimisticItem.id)
        groceryItemsCache = next
        return next
      })
      setError(insertError.message)
      setSaving(false)
      throw insertError
    }

    setItems((current) => {
      const next = current.map((item) => (item.id === optimisticItem.id ? data : item))
      groceryItemsCache = next
      return next
    })
    setSaving(false)
    return data
  }, [])

  const updateItemName = useCallback(async (id, name) => {
    const normalizedName = normalizeItemName(name)
    if (!id || !normalizedName) return null

    setSaving(true)
    setError('')

    const { data, error: updateError } = await supabase
      .from('grocery_list_items')
      .update({ name: normalizedName })
      .eq('id', id)
      .select('id, name, is_checked, created_at, updated_at')
      .single()

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      throw updateError
    }

    setItems((current) => {
      const next = current.map((item) => (item.id === id ? data : item))
      groceryItemsCache = next
      return next
    })
    setSaving(false)
    return data
  }, [])

  const toggleItemChecked = useCallback(async (id, isChecked) => {
    setSaving(true)
    setError('')

    const { data, error: updateError } = await supabase
      .from('grocery_list_items')
      .update({ is_checked: isChecked })
      .eq('id', id)
      .select('id, name, is_checked, created_at, updated_at')
      .single()

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      throw updateError
    }

    setItems((current) => {
      const next = current.map((item) => (item.id === id ? data : item))
      const sorted = next.sort((a, b) => {
        if (a.is_checked !== b.is_checked) return Number(a.is_checked) - Number(b.is_checked)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
      groceryItemsCache = sorted
      return sorted
    })
    setSaving(false)
    return data
  }, [])

  const deleteItem = useCallback(async (id) => {
    setSaving(true)
    setError('')

    const { error: deleteError } = await supabase.from('grocery_list_items').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      setSaving(false)
      throw deleteError
    }

    setItems((current) => {
      const next = current.filter((item) => item.id !== id)
      groceryItemsCache = next
      return next
    })
    setSaving(false)
  }, [])

  const fetchSuggestions = useCallback(async (query = '', limit = 8) => {
    const cleaned = query.trim()
    const { data, error: queryError } = await supabase
      .from('line_items')
      .select('name, created_at')
      .order('created_at', { ascending: false })
      .limit(250)

    if (queryError) {
      setError(queryError.message)
      return []
    }

    const lowered = cleaned.toLowerCase()
    const byName = new Map()

    for (const row of data || []) {
      const normalizedName = normalizeItemName(row.name || '')
      if (!normalizedName) continue
      const key = normalizedName.toLowerCase()
      if (lowered && !key.includes(lowered)) continue

      const existing = byName.get(key)
      const createdAt = new Date(row.created_at || 0).getTime()
      if (!existing) {
        byName.set(key, {
          name: normalizedName,
          count: 1,
          latestTs: createdAt,
        })
      } else {
        existing.count += 1
        existing.latestTs = Math.max(existing.latestTs, createdAt)
      }
    }

    return [...byName.values()]
      .sort((a, b) => {
        if (a.count !== b.count) return b.count - a.count
        return b.latestTs - a.latestTs
      })
      .slice(0, limit)
      .map((entry) => entry.name)
  }, [])

  return {
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
  }
}
