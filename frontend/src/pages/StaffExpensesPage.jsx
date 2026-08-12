import { useState, useEffect } from 'react'
import { Plus, Search, Clock, X, Check, AlertCircle, Eye, Download, Calendar, User } from 'lucide-react'
import jsPDF from 'jspdf'

function formatCurrency(n) {
  return '₱' + parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}

function ConfirmationModal({ title, message, confirmText, cancelText, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          <p className="text-sm text-slate-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all duration-200"
            >
              {cancelText || 'Cancel'}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-lg text-sm font-medium transition-all duration-200"
            >
              {loading ? 'Processing…' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExpenseDetailsModal({ viewTarget, products, currentUser, onClose, onSave, onDelete }) {
  const initialItems = Array.isArray(viewTarget?.items) ? viewTarget.items : []
  const [items, setItems] = useState(initialItems.map(i => ({ ...i, originalQty: i.qty })))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const nextItems = Array.isArray(viewTarget?.items) ? viewTarget.items : []
    setItems(nextItems.map(i => ({ ...i, originalQty: i.qty })))
    setModalError('')
  }, [viewTarget])

  function getMaxStockForItem(item) {
    const productMeta = products.find(p => p.id === item.productId)
    if (!productMeta) return undefined
    const orig = typeof item.originalQty === 'number' ? item.originalQty : item.qty
    return productMeta.current_stock + orig
  }

  function updateQty(idx, qty, providedMax) {
    qty = parseInt(qty, 10)
    if (isNaN(qty) || qty < 1) qty = 1
    const it = items[idx]
    const maxStock = typeof providedMax === 'number' ? providedMax : (it ? getMaxStockForItem(it) : undefined)
    if (typeof maxStock === 'number' && qty > maxStock) {
      qty = maxStock
      setModalError(`Only ${maxStock} units available for ${it.productName}`)
    } else {
      setModalError('')
    }
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty } : it))
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const total = items.reduce((sum, it) => sum + ((it.unitPrice || 0) * it.qty), 0)

  const canEdit = currentUser?.role === 'admin'
  
  // Check if expense is older than 12 hours (real-time)
  const [canDelete, setCanDelete] = useState(true)
  
  useEffect(() => {
    const checkTime = () => {
      const expenseDate = new Date(viewTarget.date)
      const now = new Date()
      const diffHours = (now - expenseDate) / (1000 * 60 * 60)
      setCanDelete(diffHours <= 12)
    }
    
    checkTime()
    const interval = setInterval(checkTime, 1000)
    return () => clearInterval(interval)
  }, [viewTarget.date])
  
  const busy = saving || deleting

  const originalItems = Array.isArray(viewTarget?.items) ? viewTarget.items : []
  const hasChanges = items.some(item => {
    const originalItem = originalItems.find(orig => orig.productId === item.productId)
    if (!originalItem) return true
    return item.qty !== originalItem.qty || item.unitPrice !== originalItem.unitPrice
  }) || items.length !== originalItems.length

  async function handleSaveClick() {
    if (!hasChanges) {
      setModalError('No changes to save')
      return
    }

    if (items.length === 0) {
      setModalError('An expense needs at least one item.')
      return
    }

    for (const it of items) {
      const productMeta = products.find(p => p.id === it.productId)
      if (!productMeta) {
        setModalError(`Product ${it.productName} is no longer available.`)
        return
      }
      const maxStock = productMeta.current_stock + (typeof it.originalQty === 'number' ? it.originalQty : it.qty)
      if (it.qty > maxStock) {
        setModalError(`Not enough stock for ${it.productName}. Only ${maxStock} available.`)
        return
      }
    }

    setModalError('')
    setSaving(true)
    try {
      await onSave(items)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteClick() {
    if (!onDelete) return
    setShowDeleteConfirm(true)
  }
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <span>{formatDate(viewTarget.date)}</span>
        </div>
        <div className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">Processed by:</span> {viewTarget.user_name || 'Unknown staff'}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Items:</label>
          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
            {items.map((item, idx) => {
              const price = item.unitPrice || 0
              const productMeta = products.find(p => p.id === item.productId)
              const maxStock = productMeta ? (productMeta.current_stock + (typeof item.originalQty === 'number' ? item.originalQty : item.qty)) : undefined
              return (
                <div key={item.productId || idx} className="flex items:center justify-between gap-2 px-3 py-2">
                  <div className="flex-1 min-w-0 truncate">
                    <span className="text-sm text-slate-800">{item.productName}</span>
                    <span className="text-xs text-slate-400 ml-2">@ {formatCurrency(price)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(idx, item.qty - 1, maxStock)}
                          disabled={busy}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 text-sm font-medium transition-colors"
                        >-
                        </button>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateQty(idx, e.target.value, maxStock)}
                          min={1}
                          max={maxStock}
                          disabled={busy}
                          className="w-16 text-center border border-slate-200 rounded px-2 py-1 text-sm disabled:opacity-50"
                        />
                        <button
                          onClick={() => updateQty(idx, item.qty + 1, maxStock)}
                          disabled={busy || (typeof maxStock === 'number' && item.qty >= maxStock)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 text-sm font-medium transition-colors"
                        >+
                        </button>
                        <button
                          onClick={() => removeItem(idx)}
                          disabled={busy}
                          title="Remove item"
                          className="ml-2 text-slate-400 hover:text-rose-500 disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 ml-2">x{item.qty}</span>
                    )}
                  </div>

                  <span className="text-sm font-mono text-slate-900 shrink-0">{formatCurrency(price * item.qty)}</span>
                </div>
              )
            })}
            {items.length === 0 && (
              <div className="px-3 py-4 text-sm text-slate-400 text-center">No items in this expense.</div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
          <span className="text-sm font-medium text-slate-700">Total</span>
          <span className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(total)}</span>
        </div>

        {modalError && (
          <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{modalError}</p>
        )}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-3">
            <button onClick={onClose} disabled={busy} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all duration-200">Close</button>
            {canEdit && (
              <button
                onClick={handleSaveClick}
                disabled={busy || !hasChanges}
                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-black font-medium flex items-center justify-center gap-2 transition-all duration-200"
              >
                <Check size={15} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
          </div>
          {canEdit && onDelete && canDelete && (
            <button
              onClick={handleDeleteClick}
              disabled={busy}
              className="w-full py-2.5 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200"
            >
              <X size={15} /> {deleting ? 'Deleting…' : 'Delete Expense'}
            </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmationModal
          title="Confirm Delete"
          message="This will permanently delete the expense and cannot be undone."
          confirmText="Delete Expense"
          cancelText="Cancel"
          loading={deleting}
          onConfirm={async () => {
            setModalError('')
            setDeleting(true)
            try {
              await onDelete(viewTarget.id)
              setShowDeleteConfirm(false)
              onClose()
            } catch (err) {
              setModalError(err instanceof Error ? err.message : 'Failed to delete expense')
              setDeleting(false)
              setShowDeleteConfirm(false)
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}

export default function StaffExpensesPage({ expenses = [], products, categories, currentUser, onAdd, onEdit, onDelete }) {
  const safeExpenses = Array.isArray(expenses) ? expenses : []
  const safeProducts = Array.isArray(products) ? products : []
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState(null)
  const [cart, setCart] = useState([])
  const [error, setError] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 10

  const filtered = safeExpenses.filter(expense => {
    const expenseItems = Array.isArray(expense?.items) ? expense.items : []
    const matchesSearch =
      String(expense?.user_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      expenseItems.some(i => String(i?.productName ?? '').toLowerCase().includes(search.toLowerCase()))
    const expenseDate = new Date(expense.date).setHours(0, 0, 0, 0)
    const matchesStartDate = !startDate || expenseDate >= new Date(startDate).setHours(0, 0, 0, 0)
    const matchesEndDate = !endDate || expenseDate <= new Date(endDate).setHours(23, 59, 59, 999)
    return matchesSearch && matchesStartDate && matchesEndDate
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, startDate, endDate])

  async function handleAdd() {
    if (loading) return
    if (cart.length === 0) {
      setError('Please add at least one item to the expense.')
      return
    }

    for (const item of cart) {
      const product = safeProducts.find(p => p.id === item.productId)
      if (!product) {
        setError('One or more products are no longer available.')
        return
      }
      if (item.qty > product.current_stock) {
        setError(`Not enough stock for ${product.name}. Only ${product.current_stock} available.`)
        return
      }
    }

    const items = cart.map(item => {
      const product = safeProducts.find(p => p.id === item.productId)
      if (!product) throw new Error('Product not found')
      return {
        productId: product.id,
        productName: product.name,
        qty: item.qty,
        unitPrice: product.price,
        subtotal: product.price * item.qty
      }
    })

    const total = items.reduce((sum, item) => sum + item.subtotal, 0)

    setLoading(true)
    try {
      await onAdd({
        user_id: currentUser?.id ?? null,
        user_name: currentUser?.name ?? 'Staff',
        items,
        total
      })
      setCart([])
      setError('')
      setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete expense')
    } finally {
      setLoading(false)
    }
  }

  function addToCart(productId) {
    const existing = cart.find(c => c.productId === productId)
    if (existing) {
      setCart(cart.map(c => c.productId === productId ? { ...c, qty: c.qty + 1 } : c))
    } else {
      setCart([...cart, { productId, qty: 1 }])
    }
  }

  function updateCartQty(productId, qty) {
    if (qty <= 0) {
      setCart(cart.filter(c => c.productId !== productId))
    } else {
      setCart(cart.map(c => c.productId === productId ? { ...c, qty } : c))
    }
  }

  function removeFromCart(productId) {
    setCart(cart.filter(c => c.productId !== productId))
  }

  function handleExportPDF() {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const itemsPerPage = 20
    const margin = 10
    const tableWidth = pageWidth - (margin * 2)
    const rowHeight = 7
    const headerHeight = 10

    const filteredData = safeExpenses.filter(expense => {
      const expenseDate = new Date(expense.date).setHours(0, 0, 0, 0)
      const matchesStartDate = !startDate || expenseDate >= new Date(startDate).setHours(0, 0, 0, 0)
      const matchesEndDate = !endDate || expenseDate <= new Date(endDate).setHours(23, 59, 59, 999)
      return matchesStartDate && matchesEndDate
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const totalPages = Math.ceil(filteredData.length / itemsPerPage)

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage()

      const startIndex = page * itemsPerPage
      const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length)
      const pageData = filteredData.slice(startIndex, endIndex)

      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Staff Expenses Report', margin, 15)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const dateRangeText = startDate && endDate
        ? `Date Range: ${startDate} to ${endDate}`
        : startDate
        ? `From: ${startDate}`
        : endDate
        ? `To: ${endDate}`
        : 'All Dates'
      doc.text(dateRangeText, margin, 22)
      doc.text(`Page ${page + 1} of ${totalPages}`, pageWidth - margin, 22, { align: 'right' })

      const headers = ['#', 'Date', 'Staff', 'Items', 'Total']
      const colWidths = [12, 45, 35, 150, 35]
      let xPos = margin
      const yPos = 30

      doc.setFillColor(243, 244, 246)
      doc.rect(margin, yPos - 5, tableWidth, headerHeight, 'F')

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)

      headers.forEach((header, i) => {
        doc.text(header, xPos, yPos)
        xPos += colWidths[i]
      })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')

      let currentY = yPos + headerHeight
      pageData.forEach((expense, i) => {
        xPos = margin
        const expenseItems = Array.isArray(expense?.items) ? expense.items : []

        const itemsText = expenseItems.map(item => `${item.productName || 'Unknown item'} x${item.qty || 0}`).join(', ')
        const splitItems = doc.splitTextToSize(itemsText, colWidths[3])
        const lines = splitItems.length
        const dynamicRowHeight = Math.max(rowHeight, lines * 4)

        doc.text(String(startIndex + i + 1), xPos, currentY)
        xPos += colWidths[0]

        doc.text(formatDate(expense.date), xPos, currentY)
        xPos += colWidths[1]

        doc.text(expense.user_name || 'Unknown staff', xPos, currentY)
        xPos += colWidths[2]

        doc.text(itemsText, xPos, currentY, { maxWidth: colWidths[3] })
        xPos += colWidths[3]

        doc.setFont('helvetica', 'bold')
        doc.text('PHP ' + (Number(expense.total) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }), xPos, currentY)
        doc.setFont('helvetica', 'normal')

        currentY += dynamicRowHeight
      })

      const totalExpenses = filteredData.reduce((sum, exp) => sum + (parseFloat(exp.total) || 0), 0)
      const footerY = currentY + 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total Expenses: PHP ${totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, margin, footerY)
      doc.text(`Total Records: ${filteredData.length}`, pageWidth - margin, footerY, { align: 'right' })
    }

    const fileName = startDate && endDate
      ? `expenses_${startDate}_to_${endDate}.pdf`
      : startDate
      ? `expenses_from_${startDate}.pdf`
      : endDate
      ? `expenses_to_${endDate}.pdf`
      : `expenses_all_${(() => {
          const now = new Date()
          return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
        })()}.pdf`

    doc.save(fileName)
  }

  const totalAmount = filtered.reduce((sum, exp) => sum + (parseFloat(exp.total) || 0), 0)

  const cartTotal = cart.reduce((sum, item) => {
    const product = safeProducts.find(p => p.id === item.productId)
    return sum + (product ? product.price * item.qty : 0)
  }, 0)

  return (
    <div className="p-4 sm:p-6">
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-md mb-5 sm:mb-6 -mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-slate-500 mt-0.5">{safeExpenses.length} expenses total</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search expenses…"
                  className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                />
              </div>
              {(currentUser?.role === 'admin' || currentUser?.role === 'staff') && (
                <button
                  onClick={() => { setCart([]); setProductSearch(''); setCategoryFilter(''); setError(''); setAddOpen(true) }}
                  className="group flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/25 text-black px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" /> New Expense
                </button>
              )}
            </div>
            <div className="flex flex-row gap-1">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                max={(() => {
                  const now = new Date()
                  return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                })()}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                max={(() => {
                  const now = new Date()
                  return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0]
                })()}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                onClick={handleExportPDF}
                className="group flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0"
              >
                <Download size={16} /> <span className="hidden sm:inline">Export PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-2.5">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
            {search ? 'No expenses match your search.' : 'No expenses yet.'}
          </div>
        )}
        {paginated.map((expense, i) => {
          const expenseItems = Array.isArray(expense?.items) ? expense.items : []
          return (
            <div key={expense.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{expense.user_name || 'Unknown staff'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock size={11} className="text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-400">{formatDate(expense.date)}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-900 font-mono shrink-0">{formatCurrency(expense.total || 0)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 truncate">
                {expenseItems.length} item{expenseItems.length !== 1 ? 's' : ''} — {expenseItems.map(i => i.productName || 'Unknown item').join(', ')}
              </p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setViewTarget(expense)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-slate-200"
                >
                  <Eye size={13} /> View
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tablet / desktop: table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">
                    {search ? 'No expenses match your search.' : 'No expenses yet.'}
                  </td>
                </tr>
              )}
              {paginated.map((expense) => {
                const expenseItems = Array.isArray(expense?.items) ? expense.items : []
                return (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Clock size={13} className="text-slate-400" />
                        <span className="text-sm text-slate-600">{formatDate(expense.date)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-800 font-medium">{expense.user_name || 'Unknown staff'}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-slate-600">
                        {expenseItems.length} item{expenseItems.length !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-32">
                        {expenseItems.map(i => i.productName || 'Unknown item').join(', ')}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-semibold text-slate-900 font-mono">{formatCurrency(expense.total || 0)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setViewTarget(expense)}
                        className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-transparent hover:border-sky-200 ml-auto"
                        title="View"
                      >
                        <Eye size={13} className="group-hover:scale-110 transition-transform" />
                        <span className="hidden lg:inline">View</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
          <p className="text-sm text-slate-500 text-center sm:text-left">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} expenses
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-slate-600 whitespace-nowrap">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* New Expense Modal */}
      {addOpen && (
        <Modal title="New Expense" onClose={() => setAddOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Products</label>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={productSearch}
                    onChange={e => setProductSearch(e.target.value)}
                    placeholder="Search products…"
                    className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="" disabled hidden>Select Category</option>
                  <option value="all">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {categoryFilter === '' ? (
                  <p className="text-sm text-slate-400 col-span-1 sm:col-span-2 text-center py-4">Please select a category to view products</p>
                ) : (
                  <>
                    {safeProducts.filter(p => 
                      Number(p?.current_stock || 0) > 0 &&
                      String(p?.name ?? '').toLowerCase().includes(productSearch.toLowerCase()) &&
                      (categoryFilter === 'all' || p.category_id === categoryFilter)
                    ).map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product.id)}
                        className="group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:border-yellow-300 hover:bg-yellow-50 text-left transition-all duration-200"
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-800 truncate">{product.name}</span>
                          <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">({product.current_stock} in stock)</span>
                        </div>
                        <span className="text-sm font-mono text-slate-900 shrink-0">{formatCurrency(product.price)}</span>
                      </button>
                    ))}
                    {safeProducts.filter(p => 
                      Number(p?.current_stock || 0) > 0 &&
                      String(p?.name ?? '').toLowerCase().includes(productSearch.toLowerCase()) &&
                      (categoryFilter === 'all' || p.category_id === categoryFilter)
                    ).length === 0 && (
                      <p className="text-sm text-slate-400 col-span-1 sm:col-span-2 text-center py-4">No products match your filters</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cart</label>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {cart.map(item => {
                    const product = products.find(p => p.id === item.productId)
                    if (!product) return null
                    return (
                      <div key={item.productId} className="flex items-center gap-2 sm:gap-3 px-3 py-2">
                        <span className="text-sm text-slate-800 flex-1 min-w-0 truncate">{product.name}</span>
                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <button
                            onClick={() => updateCartQty(item.productId, item.qty - 1)}
                            className="group w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium transition-colors"
                          >
                            -
                          </button>
                          <span className="text-sm font-mono w-6 text-center">{item.qty}</span>
                          <button
                            onClick={() => updateCartQty(item.productId, item.qty + 1)}
                            disabled={item.qty >= product.current_stock}
                            className="group w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 text-sm font-medium transition-colors"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-mono text-slate-900 w-14 sm:w-16 text-right shrink-0">
                          {formatCurrency(product.price * item.qty)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="group text-slate-400 hover:text-rose-500 transition-colors shrink-0"
                        >
                          <X size={14} className="group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200">
                  <span className="text-sm font-medium text-slate-700">Total</span>
                  <span className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setAddOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
              <button onClick={handleAdd} disabled={loading} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-yellow-500/25 rounded-lg text-sm text-black font-medium flex items-center justify-center gap-2 transition-all duration-200">
                <Check size={15} /> {loading ? 'Processing…' : 'Complete Expense'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Expense */}
      {viewTarget && (
        <Modal title="Expense Details" onClose={() => setViewTarget(null)}>
          <ExpenseDetailsModal
            viewTarget={viewTarget}
            products={products}
            currentUser={currentUser}
            onClose={() => setViewTarget(null)}
            onSave={async (updatedItems) => {
              const newTotal = updatedItems.reduce((sum, it) => sum + ((it.unitPrice || 0) * it.qty), 0)
              if (onEdit) {
                await onEdit(viewTarget.id, { ...viewTarget, items: updatedItems, total: newTotal })
                setViewTarget(null)
              }
            }}
            onDelete={onDelete}
          />
        </Modal>
      )}
    </div>
  )
}
