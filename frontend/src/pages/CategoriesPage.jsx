import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Tag, X, Check, AlertCircle } from 'lucide-react'
import { safeFormatDate } from '../utils/formatUtils'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100">
          <h1 className="font-semibold text-slate-900 text-sm">{title}</h1>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  )
}

export default function Categories({ categories, products, currentUser, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formName, setFormName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const safeCategories = Array.isArray(categories) ? categories : []
  const safeProducts = Array.isArray(products) ? products : []

  const filtered = safeCategories.filter(c =>
    String(c?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function productCount(catId) {
    return safeProducts.filter(p => p.category_id === catId).length
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (loading) return
    const name = formName.trim()
    if (!name) { setError('Category name is required.'); return }
    if (safeCategories.some(c => String(c?.name ?? '').toLowerCase() === name.toLowerCase())) {
      setError('A category with this name already exists.'); return
    }
    setLoading(true)
    try {
      await onAdd(name)
      setFormName(''); setError(''); setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category')
    } finally {
      setLoading(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (loading || !editTarget) return
    const name = formName.trim()
    if (!name) { setError('Category name is required.'); return }
    if (safeCategories.some(c => String(c?.name ?? '').toLowerCase() === name.toLowerCase() && c.id !== editTarget.id)) {
      setError('A category with this name already exists.'); return
    }
    setLoading(true)
    try {
      await onEdit(editTarget.id, name)
      setEditTarget(null); setFormName(''); setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category')
    } finally {
      setLoading(false)
    }
  }

  function handleDelete() {
    if (!deleteTarget) return
    onDelete(deleteTarget.id)
    setDeleteTarget(null)
  }

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'staff'

  return (
    <div className="p-4 sm:p-6">
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-md mb-5 sm:mb-6 -mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-slate-500 mt-0.5">{categories.length} categories total</p>
          </div>
          <div className="flex flex-row gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search categories…"
                className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-52"
              />
            </div>
            {canManage && (
              <button
                onClick={() => { setFormName(''); setError(''); setAddOpen(true) }}
                className="group flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/25 text-black px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" /> Add Category
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile / small-tablet: card list */}
      <div className="sm:hidden space-y-2.5">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
            {search ? 'No categories match your search.' : 'No categories yet.'}
          </div>
        )}
        {filtered.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Tag size={14} className="text-sky-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{cat.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {safeFormatDate(cat.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded shrink-0">
                {productCount(cat.id)} product{productCount(cat.id) !== 1 ? 's' : ''}
              </span>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => { setEditTarget(cat); setFormName(cat.name); setError('') }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-slate-200"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 border border-slate-200"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
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
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Products</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                {canManage && <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
                    {search ? 'No categories match your search.' : 'No categories yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                        <Tag size={13} className="text-sky-500" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-mono text-slate-600">{productCount(cat.id)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">
                    {safeFormatDate(cat.created_at, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  {canManage && (
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditTarget(cat); setFormName(cat.name); setError('') }}
                          className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-transparent hover:border-sky-200"
                          title="Edit"
                        >
                          <Pencil size={13} className="group-hover:scale-110 transition-transform" />
                          <span className="hidden lg:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(cat)}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {addOpen && (
        <Modal title="Add Category" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category Name</label>
              <input
                value={formName}
                onChange={e => { setFormName(e.target.value); setError('') }}
                placeholder="e.g. Fresh Produce"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
              />
              {error && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-yellow-500/25 rounded-lg text-sm text-black font-medium flex items-center justify-center gap-2 transition-all duration-200">
                <Check size={15} /> {loading ? 'Adding…' : 'Add Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title="Edit Category" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category Name</label>
              <input
                value={formName}
                onChange={e => { setFormName(e.target.value); setError('') }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
              />
              {error && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
              )}
            </div>
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
        <Modal title="Delete Category" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            {productCount(deleteTarget.id) > 0 ? (
              <>
                <p className="text-sm text-slate-600">
                  Cannot delete <span className="font-semibold text-slate-900">"{deleteTarget.name}"</span> because it has products assigned to it.
                </p>
                <p className="text-sm text-rose-600">
                  Please reassign or delete the {productCount(deleteTarget.id)} product{productCount(deleteTarget.id) !== 1 ? 's' : ''} in this category first.
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