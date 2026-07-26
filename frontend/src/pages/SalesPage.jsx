import { useState, useEffect } from 'react'
import { Plus, Search, Clock, X, Check, AlertCircle, Eye, Download } from 'lucide-react'
import jsPDF from 'jspdf'

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

export default function Sales({ sales, products, categories, currentUser, onAdd }) {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState(null)
  const [cart, setCart] = useState([])
  const [error, setError] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 10

  const filtered = sales.filter(s => {
    const matchesSearch =
      s.user_name.toLowerCase().includes(search.toLowerCase()) ||
      s.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()))
    const saleDate = new Date(s.date).setHours(0, 0, 0, 0)
    const matchesStartDate = !startDate || saleDate >= new Date(startDate).setHours(0, 0, 0, 0)
    const matchesEndDate = !endDate || saleDate <= new Date(endDate).setHours(23, 59, 59, 999)
    return matchesSearch && matchesStartDate && matchesEndDate
  })

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, startDate, endDate])

  async function handleAdd() {
    if (loading) return
    if (cart.length === 0) {
      setError('Please add at least one item to the sale.')
      return
    }

    for (const item of cart) {
      const product = products.find(p => p.id === item.productId)
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
      const product = products.find(p => p.id === item.productId)
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
        user_id: currentUser.id,
        user_name: currentUser.name,
        items,
        total
      })
      setCart([])
      setError('')
      setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete sale')
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

    // Filter data by date range
    const filteredData = sales.filter(s => {
      const saleDate = new Date(s.date).setHours(0, 0, 0, 0)
      const matchesStartDate = !startDate || saleDate >= new Date(startDate).setHours(0, 0, 0, 0)
      const matchesEndDate = !endDate || saleDate <= new Date(endDate).setHours(23, 59, 59, 999)
      return matchesStartDate && matchesEndDate
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const totalPages = Math.ceil(filteredData.length / itemsPerPage)

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage()

      const startIndex = page * itemsPerPage
      const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length)
      const pageData = filteredData.slice(startIndex, endIndex)

      // Title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Sales Report', margin, 15)

      // Date range info
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

      // Table header
      const headers = ['#', 'Date', 'Cashier', 'Items', 'Total']
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

      // Table rows
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')

      let currentY = yPos + headerHeight
      pageData.forEach((sale, i) => {
        xPos = margin

        // Calculate row height based on wrapped items text
        const itemsText = sale.items.map(item => `${item.productName} x${item.qty}`).join(', ')
        const splitItems = doc.splitTextToSize(itemsText, colWidths[3])
        const lines = splitItems.length
        const dynamicRowHeight = Math.max(rowHeight, lines * 4)

        // Row number
        doc.text(String(startIndex + i + 1), xPos, currentY)
        xPos += colWidths[0]

        // Date
        doc.text(formatDate(sale.date), xPos, currentY)
        xPos += colWidths[1]

        // Cashier
        doc.text(sale.user_name, xPos, currentY)
        xPos += colWidths[2]

        // Items (with wrapping)
        doc.text(itemsText, xPos, currentY, { maxWidth: colWidths[3] })
        xPos += colWidths[3]

        // Total (aligned to top of row)
        doc.setFont('helvetica', 'bold')
        doc.text('PHP ' + sale.total.toLocaleString('en-PH', { minimumFractionDigits: 2 }), xPos, currentY)
        doc.setFont('helvetica', 'normal')

        currentY += dynamicRowHeight
      })

      // Footer with total
      const totalRevenue = filteredData.reduce((sum, s) => sum + s.total, 0)
      const footerY = currentY + 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total Revenue: PHP ${totalRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, margin, footerY)
      doc.text(`Total Records: ${filteredData.length}`, pageWidth - margin, footerY, { align: 'right' })
    }

    const fileName = startDate && endDate
      ? `sales_${startDate}_to_${endDate}.pdf`
      : startDate
      ? `sales_from_${startDate}.pdf`
      : endDate
      ? `sales_to_${endDate}.pdf`
      : `sales_all_${new Date().toISOString().split('T')[0]}.pdf`

    doc.save(fileName)
  }

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId)
    return sum + (product ? product.price * item.qty : 0)
  }, 0)

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <p className="text-sm text-slate-500 mt-0.5">{sales.length} transactions total</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search sales…"
              className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-52"
            />
          </div>
          <div className="flex gap-3">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              className="flex-1 sm:flex-none group flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200"
            >
              <Download size={16} /> Export PDF
            </button>
            <button
              onClick={() => { setCart([]); setError(''); setAddOpen(true) }}
              className="flex-1 sm:flex-none group flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/25 text-black px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" /> New Sale
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-2.5">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
            {search ? 'No sales match your search.' : 'No sales yet.'}
          </div>
        )}
        {paginated.map((sale, i) => (
          <div key={sale.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{sale.user_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Clock size={11} className="text-slate-400 shrink-0" />
                  <p className="text-xs text-slate-400">{formatDate(sale.date)}</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-slate-900 font-mono shrink-0">{formatCurrency(sale.total)}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 truncate">
              {sale.items.length} item{sale.items.length !== 1 ? 's' : ''} — {sale.items.map(i => i.productName).join(', ')}
            </p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setViewTarget(sale)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-slate-200"
              >
                <Eye size={13} /> View
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tablet / desktop: table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Cashier</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                    {search ? 'No sales match your search.' : 'No sales yet.'}
                  </td>
                </tr>
              )}
              {paginated.map((sale, i) => (
                <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400" />
                      <span className="text-sm text-slate-600">{formatDate(sale.date)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-800 font-medium">{sale.user_name}</td>
                  <td className="px-5 py-3.5">
                    <div className="text-sm text-slate-600">
                      {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate max-w-32">
                      {sale.items.map(i => i.productName).join(', ')}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-sm font-semibold text-slate-900 font-mono">{formatCurrency(sale.total)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setViewTarget(sale)}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-transparent hover:border-sky-200 ml-auto"
                      title="View"
                    >
                      <Eye size={13} className="group-hover:scale-110 transition-transform" />
                      <span className="hidden lg:inline">View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
          <p className="text-sm text-slate-500 text-center sm:text-left">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} sales
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

      {/* New Sale Modal */}
      {addOpen && (
        <Modal title="New Sale" onClose={() => setAddOpen(false)}>
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
                    {products.filter(p => 
                      p.current_stock > 0 &&
                      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
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
                    {products.filter(p => 
                      p.current_stock > 0 &&
                      p.name.toLowerCase().includes(productSearch.toLowerCase()) &&
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
                <Check size={15} /> {loading ? 'Processing…' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </Modal>
      )}


      {/* View Sale */}
      {viewTarget && (
        <Modal title="Sale Details" onClose={() => setViewTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock size={14} className="text-slate-400 shrink-0" />
              <span>{formatDate(viewTarget.date)}</span>
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Processed by:</span> {viewTarget.user_name}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Items:</label>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {viewTarget.items.map((item, idx) => {
                  const product = products.find(p => p.name === item.productName)
                  const price = item.price || (product ? product.price : 0)
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="flex-1 min-w-0 truncate">
                        <span className="text-sm text-slate-800">{item.productName}</span>
                        <span className="text-xs text-slate-400 ml-2">x{item.qty}</span>
                        <span className="text-xs text-slate-400 ml-2">@ {formatCurrency(price)}</span>
                      </div>
                      <span className="text-sm font-mono text-slate-900 shrink-0">{formatCurrency(price * item.qty)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-700">Total</span>
              <span className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(viewTarget.total)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}