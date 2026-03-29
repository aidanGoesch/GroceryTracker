import { useCallback, useState } from 'react'
import { supabase } from '../supabase'

export function useLineItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchItemsForReceipt = useCallback(async (receiptId) => {
    if (!receiptId) return
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('line_items')
      .select('id, receipt_id, name, price, category, created_at')
      .eq('receipt_id', receiptId)
      .order('created_at', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    setItems(data || [])
    setLoading(false)
  }, [])

  const fetchAllItems = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('line_items')
      .select('id, receipt_id, name, price, category, created_at, receipts(store_name, purchase_date)')
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    setItems(data || [])
    setLoading(false)
  }, [])

  const updateItemCategory = useCallback(async (id, category) => {
    setError('')
    const { error: updateError } = await supabase
      .from('line_items')
      .update({ category })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      throw updateError
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, category } : item)),
    )
  }, [])

  const deleteItem = useCallback(async (id) => {
    setError('')
    const { error: deleteError } = await supabase.from('line_items').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      throw deleteError
    }
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  return {
    items,
    loading,
    error,
    fetchItemsForReceipt,
    fetchAllItems,
    updateItemCategory,
    deleteItem,
  }
}
