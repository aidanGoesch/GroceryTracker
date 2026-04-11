import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReviewScreen from '../components/ReviewScreen'
import { isTokenLimitError, parseReceiptWithClaude } from '../claude'
import { useReceipts } from '../hooks/useReceipts'
import { supabase } from '../supabase'
import { centsToDollars, toCents } from '../utils'

const emptyReviewForm = () => ({
  store_name: '',
  purchase_date: '',
  subtotal: '0',
  items: [],
})

function Upload() {
  const libraryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const navigate = useNavigate()
  const { createReceipt } = useReceipts()

  const [selectedFile, setSelectedFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [reviewForm, setReviewForm] = useState(emptyReviewForm())
  const [parsedPreview, setParsedPreview] = useState('')

  const total = useMemo(
    () =>
      centsToDollars(
        reviewForm.items.reduce((sum, item) => sum + toCents(item.price), 0),
      ),
    [reviewForm.items],
  )
  const subtotal = centsToDollars(toCents(reviewForm.subtotal))
  const isBalanced = toCents(reviewForm.subtotal) > 0 && toCents(reviewForm.subtotal) === toCents(total)
  const hasPurchaseDate = Boolean(reviewForm.purchase_date)
  const canSaveReceipt = isBalanced && hasPurchaseDate

  async function processFile(file) {
    if (!file) return
    setSelectedFile(file)
    setParsedPreview(URL.createObjectURL(file))
    setError('')
    setStatus('processing')

    try {
      const parsed = await parseReceiptWithClaude(file)
      const mappedItems = parsed.items.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        name: item.name,
        category: item.category,
        price: String(item.price),
      }))
      setReviewForm({
        store_name: parsed.store_name,
        purchase_date: parsed.purchase_date || '',
        subtotal: String(parsed.subtotal ?? 0),
        items: mappedItems,
      })
      setError(parsed.validationError || '')
      setStatus('review')
    } catch (processingError) {
      const message = processingError.message || 'Failed to parse receipt.'
      setError(message)
      if (isTokenLimitError(message)) {
        window.alert(
          'We could not read this receipt because the AI token/credit limit has been reached. Please try again later after credits reset.',
        )
      }
      setStatus('error')
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    processFile(file)
  }

  function handleManualEntry() {
    setSelectedFile(null)
    setParsedPreview('')
    setReviewForm(emptyReviewForm())
    setStatus('review')
    setError('')
  }

  function updateField(key, value) {
    setReviewForm((current) => ({ ...current, [key]: value }))
  }

  function updateItem(index, key, value) {
    setReviewForm((current) => ({
      ...current,
      items: current.items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }))
  }

  function deleteItem(index) {
    setReviewForm((current) => ({
      ...current,
      items: current.items.filter((_, idx) => idx !== index),
    }))
  }

  function addItem() {
    setReviewForm((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id: `new-${crypto.randomUUID()}`,
          name: '',
          category: 'Other',
          price: '0',
        },
      ],
    }))
  }

  async function saveReceipt() {
    if (!hasPurchaseDate) {
      setError('Please choose the purchase date shown on your receipt before saving.')
      return
    }

    if (!isBalanced) {
      setError('Subtotal must match the sum of all item prices before saving.')
      return
    }

    setSaving(true)
    setError('')
    try {
      let imageUrl = ''
      if (selectedFile) {
        const fileName = `${Date.now()}-${selectedFile.name}`.replaceAll(' ', '-')
        const { data: uploaded, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, selectedFile, { upsert: false })
        if (uploadError) throw uploadError
        const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(uploaded.path)
        imageUrl = publicData.publicUrl
      }

      const receipt = await createReceipt(
        {
          store_name: reviewForm.store_name || 'Unknown Store',
          purchase_date: reviewForm.purchase_date,
          total: subtotal,
          image_url: imageUrl || null,
        },
        reviewForm.items.map((item) => ({
          name: item.name || 'Unnamed item',
          category: item.category || 'Other',
          price: centsToDollars(toCents(item.price)),
        })),
      )

      navigate(`/receipts/${receipt.id}`)
    } catch (saveError) {
      setError(saveError.message || 'Failed to save receipt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page upload-page">
      <header className="page-header">
        <h1 className="page-title">upload receipt</h1>
      </header>

      {status === 'idle' && (
        <>
          <button
            type="button"
            className="drop-zone"
            onClick={() => libraryInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <svg viewBox="0 0 24 24" className="upload-icon" aria-hidden="true">
              <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            <span>drop a receipt or choose from camera roll</span>
          </button>
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              processFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(event) => {
              processFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <button type="button" className="text-button" onClick={() => cameraInputRef.current?.click()}>
            take a photo
          </button>
          <button type="button" className="text-button" onClick={handleManualEntry}>
            enter manually
          </button>
        </>
      )}

      {status === 'processing' && (
        <div className="panel processing-panel">
          {parsedPreview && <img src={parsedPreview} alt="Receipt preview" className="preview-thumb" />}
          <div className="spinner" />
          <p>reading your receipt...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="panel processing-panel">
          <p className="inline-error">{error}</p>
          <button type="button" className="primary-button" onClick={() => selectedFile && processFile(selectedFile)}>
            retry
          </button>
          <button type="button" className="text-button" onClick={() => setStatus('idle')}>
            choose another receipt
          </button>
        </div>
      )}

      {status === 'review' && (
        <ReviewScreen
          form={reviewForm}
          onFieldChange={updateField}
          onItemChange={updateItem}
          onDeleteItem={deleteItem}
          onAddItem={addItem}
          onSave={saveReceipt}
          onCancel={() => navigate('/')}
          saving={saving}
          canSave={canSaveReceipt}
          subtotalBalanced={isBalanced}
          missingPurchaseDate={!hasPurchaseDate}
          computedTotal={total}
          computedSubtotal={subtotal}
          imagePreviewUrl={parsedPreview}
        />
      )}

      {status !== 'error' && error && <p className="inline-error">{error}</p>}
    </section>
  )
}

export default Upload
