import { useCallback, useState } from 'react'
import { supabase } from '../supabase'

export function useReceipts() {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchReceipts = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: queryError } = await supabase
      .from('receipts')
      .select('id, store_name, purchase_date, total, image_url, created_at, line_items(count)')
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (queryError) {
      setLoading(false)
      setError(queryError.message)
      return
    }

    const normalized = (data || []).map((receipt) => ({
      ...receipt,
      item_count: receipt.line_items?.[0]?.count || 0,
    }))

    setReceipts(normalized)
    setLoading(false)
  }, [])

  const createReceipt = useCallback(async (receiptPayload, lineItemPayload) => {
    setError('')
    const { data: createdReceipt, error: receiptError } = await supabase
      .from('receipts')
      .insert(receiptPayload)
      .select()
      .single()

    if (receiptError) {
      setError(receiptError.message)
      throw receiptError
    }

    const payload = lineItemPayload.map((item) => ({
      receipt_id: createdReceipt.id,
      name: item.name,
      category: item.category,
      price: Number(item.price),
    }))

    if (payload.length > 0) {
      const { error: lineError } = await supabase.from('line_items').insert(payload)
      if (lineError) {
        setError(lineError.message)
        throw lineError
      }
    }

    return createdReceipt
  }, [])

  const deleteReceipt = useCallback(async (id) => {
    setError('')
    const { error: deleteError } = await supabase.from('receipts').delete().eq('id', id)
    if (deleteError) {
      setError(deleteError.message)
      throw deleteError
    }
    setReceipts((current) => current.filter((receipt) => receipt.id !== id))
  }, [])

  return {
    receipts,
    loading,
    error,
    fetchReceipts,
    createReceipt,
    deleteReceipt,
  }
}
