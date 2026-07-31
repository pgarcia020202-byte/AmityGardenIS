import { useState, useEffect } from 'react'
import { Search, Archive, Clock, Download, Trash2, AlertCircle } from 'lucide-react'
import jsPDF from 'jspdf'

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

export default function StockLogs({ stockLogs, currentUser, onDelete }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingLogId, setDeletingLogId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = stockLogs.filter(log => {
    const matchesSearch =
      log.product_name.toLowerCase().includes(search.toLowerCase()) ||
      log.user_name.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || log.type === typeFilter
    const logDate = new Date(log.date).setHours(0, 0, 0, 0)
    const matchesStartDate = !startDate || logDate >= new Date(startDate).setHours(0, 0, 0, 0)
    const matchesEndDate = !endDate || logDate <= new Date(endDate).setHours(23, 59, 59, 999)
    return matchesSearch && matchesType && matchesStartDate && matchesEndDate
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, startDate, endDate])

  function formatDate(iso) {
    const date = new Date(iso)
    // Convert to Asia/Manila timezone (UTC+8)
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila'
    }
    return date.toLocaleString('en-PH', options)
  }

  function relTime(iso) {
    const date = new Date(iso)
    // Convert to Asia/Manila timezone for accurate relative time
    const manilaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const now = new Date()
    const nowManila = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const diff = nowManila.getTime() - manilaDate.getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  function handleDeleteClick(logId) {
    setDeletingLogId(logId)
    setShowDeleteConfirm(true)
  }

  async function handleDeleteConfirm() {
    setDeleting(true)
    try {
      await onDelete(deletingLogId)
      setShowDeleteConfirm(false)
      setDeletingLogId(null)
    } catch (error) {
      console.error('Failed to delete stock log:', error)
    } finally {
      setDeleting(false)
    }
  }

  function handleDeleteCancel() {
    setShowDeleteConfirm(false)
    setDeletingLogId(null)
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

    // Filter data by date range and type
    const filteredData = stockLogs.filter(log => {
      const matchesSearch =
        log.product_name.toLowerCase().includes(search.toLowerCase()) ||
        log.user_name.toLowerCase().includes(search.toLowerCase())
      const matchesType = typeFilter === 'all' || log.type === typeFilter
      const logDate = new Date(log.date).setHours(0, 0, 0, 0)
      const matchesStartDate = !startDate || logDate >= new Date(startDate).setHours(0, 0, 0, 0)
      const matchesEndDate = !endDate || logDate <= new Date(endDate).setHours(23, 59, 59, 999)
      return matchesSearch && matchesType && matchesStartDate && matchesEndDate
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
      doc.text('Stock Logs Report', margin, 15)

      // Filter info
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const filterText = typeFilter === 'all' ? 'All Types' : `Type: ${typeFilter}`
      doc.text(filterText, margin, 22)

      const dateRangeText = startDate && endDate
        ? `Date Range: ${startDate} to ${endDate}`
        : startDate
        ? `From: ${startDate}`
        : endDate
        ? `To: ${endDate}`
        : 'All Dates'
      doc.text(dateRangeText, margin, 27)
      doc.text(`Page ${page + 1} of ${totalPages}`, pageWidth - margin, 22, { align: 'right' })

      // Table header
      const headers = ['#', 'Date', 'Product', 'Type', 'Change', 'Stock', 'User']
      const colWidths = [12, 45, 50, 30, 25, 35, 45]
      let xPos = margin
      const yPos = 35

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

      pageData.forEach((log, i) => {
        const y = yPos + headerHeight + (i * rowHeight)
        xPos = margin

        // Row number
        doc.text(String(startIndex + i + 1), xPos, y)
        xPos += colWidths[0]

        // Date
        doc.text(formatDate(log.date), xPos, y)
        xPos += colWidths[1]

        // Product
        const truncatedProduct = log.product_name.length > 20 ? log.product_name.substring(0, 20) + '...' : log.product_name
        doc.text(truncatedProduct, xPos, y)
        xPos += colWidths[2]

        // Type
        doc.text(log.type, xPos, y)
        xPos += colWidths[3]

        // Change
        const changeText = log.qty_changed > 0 ? `+${log.qty_changed}` : String(log.qty_changed)
        doc.setTextColor(log.qty_changed > 0 ? 34 : 220, log.qty_changed > 0 ? 197 : 38, log.qty_changed > 0 ? 94 : 38)
        doc.text(changeText, xPos, y)
        doc.setTextColor(0, 0, 0)
        xPos += colWidths[4]

        // Stock
        doc.text(`${log.prev_stock} -> ${log.new_stock}`, xPos, y)
        xPos += colWidths[5]

        // User
        const truncatedUser = log.user_name.length > 15 ? log.user_name.substring(0, 15) + '...' : log.user_name
        doc.text(truncatedUser, xPos, y)
      })

      // Footer with total
      const footerY = yPos + headerHeight + (pageData.length * rowHeight) + 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total Records: ${filteredData.length}`, margin, footerY)
      doc.text(`Page ${page + 1} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' })
    }

    const fileName = startDate && endDate
      ? `stock_logs_${startDate}_to_${endDate}.pdf`
      : startDate
      ? `stock_logs_from_${startDate}.pdf`
      : endDate
      ? `stock_logs_to_${endDate}.pdf`
      : `stock_logs_all_${new Date().toISOString().split('T')[0]}.pdf`

    doc.save(fileName)
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-md mb-5 sm:mb-6 -mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-slate-500 mt-0.5">{stockLogs.length} entries total</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search logs…"
                  className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-52"
                />
              </div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="all">All Types</option>
                <option value="Stock In">Stock In</option>
                <option value="Sale">Sale</option>
                <option value="Adjustment">Adjustment</option>
              </select>
            </div>
            <div className="flex flex-row gap-1">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
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
            {search || typeFilter !== 'all' ? 'No logs match your filters.' : 'No stock activity yet.'}
          </div>
        )}
        {paginated.map(log => (
          <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  log.type === 'Stock In' ? 'bg-green-50' :
                  log.type === 'Sale' ? 'bg-rose-50' : 'bg-amber-50'
                }`}>
                  <Archive size={14} className={
                    log.type === 'Stock In' ? 'text-green-500' :
                    log.type === 'Sale' ? 'text-rose-500' : 'text-amber-500'
                  } />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{log.product_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{log.user_name}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold font-mono shrink-0 ${
                log.qty_changed > 0 ? 'text-green-600' : 'text-rose-600'
              }`}>
                {log.qty_changed > 0 ? '+' : ''}{log.qty_changed}
              </span>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                log.type === 'Stock In' ? 'bg-green-100 text-green-700' :
                log.type === 'Sale' ? 'bg-rose-100 text-rose-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {log.type}
              </span>
              <div className="text-xs text-slate-400">
                <span className="line-through mr-1">{log.prev_stock}</span>
                →
                <span className="ml-1 font-medium text-slate-700">{log.new_stock}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Clock size={11} className="text-slate-400 shrink-0" />
              <p className="text-xs text-slate-400">{formatDate(log.date)} · {relTime(log.date)}</p>
            </div>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => handleDeleteClick(log.id)}
                className="mt-3 w-full flex items-center justify-center gap-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 size={14} />
                Delete Log
              </button>
            )}
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
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Change</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">User</th>
                {currentUser?.role === 'admin' && (
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={currentUser?.role === 'admin' ? 8 : 7} className="px-5 py-12 text-center text-sm text-slate-400">
                    {search || typeFilter !== 'all' ? 'No logs match your filters.' : 'No stock activity yet.'}
                  </td>
                </tr>
              )}
              {paginated.map((log, i) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-slate-400" />
                      <div>
                        <span className="text-sm text-slate-600">{formatDate(log.date)}</span>
                        <span className="text-xs text-slate-400 ml-2">({relTime(log.date)})</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        log.type === 'Stock In' ? 'bg-green-50' :
                        log.type === 'Sale' ? 'bg-rose-50' : 'bg-amber-50'
                      }`}>
                        <Archive size={13} className={
                          log.type === 'Stock In' ? 'text-green-500' :
                          log.type === 'Sale' ? 'text-rose-500' : 'text-amber-500'
                        } />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{log.product_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      log.type === 'Stock In' ? 'bg-green-100 text-green-700' :
                      log.type === 'Sale' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-sm font-semibold font-mono ${
                      log.qty_changed > 0 ? 'text-green-600' : 'text-rose-600'
                    }`}>
                      {log.qty_changed > 0 ? '+' : ''}{log.qty_changed}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs text-slate-400">
                      <span className="line-through mr-1">{log.prev_stock}</span>
                      →
                      <span className="ml-1 font-medium text-slate-700">{log.new_stock}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{log.user_name}</td>
                  {currentUser?.role === 'admin' && (
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleDeleteClick(log.id)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                        title="Delete log"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} logs
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmationModal
          title="Confirm Delete"
          message="This will permanently delete this stock log and cannot be undone."
          confirmText="Delete Log"
          cancelText="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          loading={deleting}
        />
      )}
    </div>
  )
}