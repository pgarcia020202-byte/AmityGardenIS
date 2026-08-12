import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Package, AlertCircle, X, Check } from 'lucide-react'

function getProductStatus(product) {
  if (product.current_stock === 0) return 'Out of Stock'
  if (product.current_stock <= product.min_stock) return 'Low Stock'
  return 'In Stock'
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}

export default function Products({ products, categories, currentUser, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('new-old')
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formMinStock, setFormMinStock] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const safeProducts = Array.isArray(products) ? products : []
  const safeCategories = Array.isArray(categories) ? categories : []

  const filtered = safeProducts.filter(p => {
    const matchesSearch = String(p?.name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category_id === categoryFilter
    const status = getProductStatus(p)
    const matchesStatus = statusFilter === 'all' || status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  }).sort((a, b) => {
    switch(sortBy) {
      case 'a-z':
        return a.name.localeCompare(b.name)
      case 'z-a':
        return b.name.localeCompare(a.name)
      case 'old-new':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'new-old':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  async function handleAdd(e) {
    e.preventDefault()
    if (loading) return
    const name = formName.trim()
    const price = parseFloat(formPrice)
    const currentStock = parseInt(formStock)
    const minStock = parseInt(formMinStock)

    if (!name) { setError('Product name is required.'); return }
    if (!formCategory) { setError('Category is required.'); return }
    if (isNaN(price) || price <= 0) { setError('Valid price is required.'); return }
    if (isNaN(currentStock) || currentStock < 0) { setError('Valid stock quantity is required.'); return }
    if (isNaN(minStock) || minStock < 0) { setError('Valid minimum stock is required.'); return }

    const existingProduct = safeProducts.find(p => String(p?.name ?? '').toLowerCase() === name.toLowerCase())
    if (existingProduct) {
      setError('A product with this name already exists.')
      return
    }

    setLoading(true)
    try {
      await onAdd({
        name,
        category_id: formCategory,
        price,
        current_stock: currentStock,
        min_stock: minStock,
        total_sold: 0
      })
      resetForm()
      setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (loading || !editTarget) return
    const name = formName.trim()
    const price = parseFloat(formPrice)
    const currentStock = parseInt(formStock)
    const minStock = parseInt(formMinStock)

    if (!name) { setError('Product name is required.'); return }
    if (!formCategory) { setError('Category is required.'); return }
    if (isNaN(price) || price <= 0) { setError('Valid price is required.'); return }
    if (isNaN(currentStock) || currentStock < 0) { setError('Valid stock quantity is required.'); return }
    if (isNaN(minStock) || minStock < 0) { setError('Valid minimum stock is required.'); return }

    setLoading(true)
    try {
      await onEdit(editTarget.id, {
        name,
        category_id: formCategory,
        price,
        current_stock: currentStock,
        min_stock: minStock,
        total_sold: editTarget.total_sold
      })
      setEditTarget(null)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product')
    } finally {
      setLoading(false)
    }
  }

  function handleDelete() {
    if (!deleteTarget) return
    onDelete(deleteTarget.id)
    setDeleteTarget(null)
  }

  function resetForm() {
    setFormName('')
    setFormCategory('')
    setFormPrice('')
    setFormStock('')
    setFormMinStock('')
    setError('')
  }

  function openEdit(p) {
    setEditTarget(p)
    setFormName(p.name)
    setFormCategory(p.category_id)
    setFormPrice(p.price.toString())
    setFormStock(p.current_stock.toString())
    setFormMinStock(p.min_stock.toString())
    setError('')
  }

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'staff'

  return (
    <div className="p-4 sm:p-6">
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-md mb-5 sm:mb-6 -mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-slate-500 mt-0.5">{products.length} products total</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                />
              </div>
              {canManage && (
                <button
                  onClick={() => { resetForm(); setAddOpen(true) }}
                  className="group flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/25 text-black px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" /> Add Product
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 sm:flex sm:flex-wrap">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="all">All Categories</option>
                {safeCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="all">All Status</option>
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 sm:flex-none"
              >
                <option value="new-old">Newest First</option>
                <option value="old-new">Oldest First</option>
                <option value="a-z">A - Z</option>
                <option value="z-a">Z - A</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-2.5">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
            {search || categoryFilter !== 'all' ? 'No products match your filters.' : 'No products yet.'}
          </div>
        )}
        {filtered.map(p => {
          const status = getProductStatus(p)
          const category = categories.find(c => c.id === p.category_id)
          return (
            <div key={String(p.id)} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <Package size={14} className="text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{category?.name || 'Uncategorized'}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                  status === 'In Stock' ? 'bg-green-100 text-green-700' :
                  status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Price</p>
                  <p className="text-sm font-mono text-slate-900 mt-0.5">₱{parseFloat(p.price).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Stock</p>
                  <p className="text-sm font-mono text-slate-600 mt-0.5">{p.current_stock}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Sold</p>
                  <p className="text-sm font-mono text-slate-600 mt-0.5">{p.total_sold}</p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-slate-200"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 border border-slate-200"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
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
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Sold</th>
                {canManage && <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                    {search || categoryFilter !== 'all' ? 'No products match your filters.' : 'No products yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const status = getProductStatus(p)
                const category = categories.find(c => c.id === p.category_id)
                return (
                  <tr key={String(p.id)} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                          <Package size={13} className="text-violet-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-800">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{category?.name || 'Uncategorized'}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-slate-900">₱{parseFloat(p.price).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-sm font-mono text-slate-600">{p.current_stock}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        status === 'In Stock' ? 'bg-green-100 text-green-700' :
                        status === 'Low Stock' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-slate-600">{p.total_sold}</td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-transparent hover:border-sky-200"
                            title="Edit"
                          >
                            <Pencil size={13} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden lg:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(p)}
                            className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 border border-transparent hover:border-rose-200"
                            title="Delete"
                          >
                            <Trash2 size={13} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden lg:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {addOpen && (
        <Modal title="Add Product" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
              <input
                value={formName}
                onChange={e => { setFormName(e.target.value); setError('') }}
                placeholder="e.g. Coca-Cola 350ml"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={formCategory}
                onChange={e => { setFormCategory(e.target.value); setError('') }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={e => { setFormPrice(e.target.value); setError('') }}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Stock</label>
                <input
                  type="number"
                  value={formStock}
                  onChange={e => { setFormStock(e.target.value); setError('') }}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Minimum Stock Alert</label>
              <input
                type="number"
                value={formMinStock}
                onChange={e => { setFormMinStock(e.target.value); setError('') }}
                placeholder="10"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-yellow-500/25 rounded-lg text-sm text-black font-medium flex items-center justify-center gap-2 transition-all duration-200">
                <Check size={15} /> {loading ? 'Adding…' : 'Add Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title="Edit Product" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Product Name</label>
              <input
                value={formName}
                onChange={e => { setFormName(e.target.value); setError('') }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={formCategory}
                onChange={e => { setFormCategory(e.target.value); setError('') }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={e => { setFormPrice(e.target.value); setError('') }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Stock</label>
                <input
                  type="number"
                  value={formStock}
                  onChange={e => { setFormStock(e.target.value); setError('') }}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Minimum Stock Alert</label>
              <input
                type="number"
                value={formMinStock}
                onChange={e => { setFormMinStock(e.target.value); setError('') }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-sky-500/25 rounded-lg text-sm text-white font-medium flex items-center justify-center gap-2 transition-all duration-200">
                <Check size={15} /> {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal title="Delete Product" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            {deleteTarget.current_stock > 0 ? (
              <>
                <p className="text-sm text-slate-600">
                  Cannot delete <span className="font-semibold text-slate-900">"{deleteTarget.name}"</span> because it has {deleteTarget.current_stock} remaining stock.
                </p>
                <p className="text-sm text-rose-600">
                  Please reduce the stock to 0 before deleting this product.
                </p>
                <button onClick={() => setDeleteTarget(null)} className="w-full py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Close</button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete <span className="font-semibold text-slate-900">"{deleteTarget.name}"</span>?
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
                  <button onClick={handleDelete} disabled={loading} className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-rose-500/25 rounded-lg text-sm text-white font-medium transition-all duration-200">Delete</button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}