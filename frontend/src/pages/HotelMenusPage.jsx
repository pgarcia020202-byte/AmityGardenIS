import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Utensils, AlertCircle, X, Check, Layers } from 'lucide-react'

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

export default function HotelMenus({ menuCategories, menuItems, currentUser, onAddCategory, onEditCategory, onDeleteCategory, onAddItem, onEditItem, onDeleteItem }) {
  const [activeTab, setActiveTab] = useState('items')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  
  // Category form state
  const [addCategoryOpen, setAddCategoryOpen] = useState(false)
  const [editCategoryTarget, setEditCategoryTarget] = useState(null)
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState(null)
  const [categoryFormName, setCategoryFormName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [categoryLoading, setCategoryLoading] = useState(false)
  
  // Item form state
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [editItemTarget, setEditItemTarget] = useState(null)
  const [deleteItemTarget, setDeleteItemTarget] = useState(null)
  const [itemFormName, setItemFormName] = useState('')
  const [itemFormCategory, setItemFormCategory] = useState('')
  const [itemFormPrice, setItemFormPrice] = useState('')
  const [itemError, setItemError] = useState('')
  const [itemLoading, setItemLoading] = useState(false)

  const filteredCategories = menuCategories.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  }).sort((a, b) => a.name.localeCompare(b.name))

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || String(item.category_id) === String(categoryFilter)
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    switch(sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'price-low':
        return parseFloat(a.price) - parseFloat(b.price)
      case 'price-high':
        return parseFloat(b.price) - parseFloat(a.price)
      default:
        return a.name.localeCompare(b.name)
    }
  })

  // Category handlers
  async function handleAddCategory(e) {
    e.preventDefault()
    if (categoryLoading) return
    const name = categoryFormName.trim()

    if (!name) { setCategoryError('Category name is required.'); return }

    const existingCategory = menuCategories.find(c => c.name.toLowerCase() === name.toLowerCase())
    if (existingCategory) {
      setCategoryError('A category with this name already exists.')
      return
    }

    setCategoryLoading(true)
    try {
      await onAddCategory({
        name
      })
      resetCategoryFormSimple()
      setAddCategoryOpen(false)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to add category')
    } finally {
      setCategoryLoading(false)
    }
  }

  async function handleEditCategory(e) {
    e.preventDefault()
    if (categoryLoading) return
    const name = categoryFormName.trim()

    if (!name) { setCategoryError('Category name is required.'); return }

    setCategoryLoading(true)
    try {
      await onEditCategory(editCategoryTarget.id, {
        name
      })
      resetCategoryFormSimple()
      setEditCategoryTarget(null)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to update category')
    } finally {
      setCategoryLoading(false)
    }
  }

  async function handleDeleteCategory() {
    if (categoryLoading) return
    setCategoryLoading(true)
    try {
      await onDeleteCategory(deleteCategoryTarget.id)
      setDeleteCategoryTarget(null)
      setCategoryError('')
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setCategoryLoading(false)
    }
  }

  function resetCategoryFormSimple() {
    setCategoryFormName('')
    setCategoryError('')
  }

  function openEditCategory(category) {
    setEditCategoryTarget(category)
    setCategoryFormName(category.name)
    setCategoryError('')
  }

  // Item handlers
  async function handleAddItem(e) {
    e.preventDefault()
    if (itemLoading) return
    const name = itemFormName.trim()
    const price = parseFloat(itemFormPrice)

    if (!name) { setItemError('Item name is required.'); return }
    if (!itemFormCategory) { setItemError('Category is required.'); return }
    if (isNaN(price) || price < 0) { setItemError('Valid price is required.'); return }

    setItemLoading(true)
    try {
      await onAddItem({
        category_id: parseInt(itemFormCategory),
        name,
        price
      })
      resetItemFormSimple()
      setAddItemOpen(false)
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to add menu item')
    } finally {
      setItemLoading(false)
    }
  }

  async function handleEditItem(e) {
    e.preventDefault()
    if (itemLoading) return
    const name = itemFormName.trim()
    const price = parseFloat(itemFormPrice)

    if (!name) { setItemError('Item name is required.'); return }
    if (!itemFormCategory) { setItemError('Category is required.'); return }
    if (isNaN(price) || price < 0) { setItemError('Valid price is required.'); return }

    setItemLoading(true)
    try {
      await onEditItem(editItemTarget.id, {
        category_id: parseInt(itemFormCategory),
        name,
        price
      })
      resetItemFormSimple()
      setEditItemTarget(null)
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to update menu item')
    } finally {
      setItemLoading(false)
    }
  }

  async function handleDeleteItem() {
    if (itemLoading) return
    setItemLoading(true)
    try {
      await onDeleteItem(deleteItemTarget.id)
      setDeleteItemTarget(null)
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Failed to delete menu item')
    } finally {
      setItemLoading(false)
    }
  }

  function resetItemFormSimple() {
    setItemFormName('')
    setItemFormCategory('')
    setItemFormPrice('')
    setItemError('')
  }

  function openEditItem(item) {
    setEditItemTarget(item)
    setItemFormName(item.name)
    setItemFormCategory(item.category_id?.toString() || '')
    setItemFormPrice(item.price?.toString() || '')
    setItemError('')
  }

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'staff'

  return (
    <div className="p-4 sm:p-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('items')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'items' 
              ? 'bg-yellow-500 text-black' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Menu Items
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'categories' 
              ? 'bg-yellow-500 text-black' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Categories
        </button>
      </div>

      {/* Menu Items Tab */}
      {activeTab === 'items' && (
        <>
          <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-md mb-5 sm:mb-6 -mx-4 sm:mx-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-slate-500 mt-0.5">{menuItems.length} items total</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-row gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search items…"
                      className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                    />
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => { resetItemFormSimple(); setAddItemOpen(true) }}
                      className="group flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/25 text-black px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0"
                    >
                      <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" /> Add Item
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="all">All Categories</option>
                    {menuCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="name">Name (A-Z)</option>
                    <option value="price-low">Price (Low to High)</option>
                    <option value="price-high">Price (High to Low)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile / small-tablet: card list */}
          <div className="sm:hidden space-y-2.5">
            {filteredItems.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
                {search ? 'No items match your search.' : 'No menu items yet.'}
              </div>
            )}
            {filteredItems.map(item => {
              const category = menuCategories.find(c => c.id === item.category_id)
              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Utensils size={14} className="text-amber-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                        {category && (
                          <p className="text-xs text-slate-400 mt-0.5">{category.name}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded shrink-0">
                      ₱{parseFloat(item.price).toFixed(2)}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => openEditItem(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 border border-slate-200"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteItemTarget(item)}
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
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Item Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                    {canEdit && <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
                        {search ? 'No items match your search.' : 'No menu items yet.'}
                      </td>
                    </tr>
                  )}
                  {filteredItems.map((item) => {
                    const category = menuCategories.find(c => c.id === item.category_id)
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                              <Utensils size={13} className="text-amber-500" />
                            </div>
                            <span className="text-sm font-medium text-slate-800">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-slate-600">{category?.name || 'N/A'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium text-slate-700">₱{parseFloat(item.price).toFixed(2)}</span>
                        </td>
                        {canEdit && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditItem(item)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="Edit item"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteItemTarget(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete item"
                              >
                                <Trash2 size={14} />
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
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <>
          <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-md mb-5 sm:mb-6 -mx-4 sm:mx-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-sm text-slate-500 mt-0.5">{menuCategories.length} categories total</p>
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
                {canEdit && (
                  <button
                    onClick={() => { resetCategoryFormSimple(); setAddCategoryOpen(true) }}
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
            {filteredCategories.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
                {search ? 'No categories match your search.' : 'No categories yet.'}
              </div>
            )}
            {filteredCategories.map(cat => (
              <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                      <Layers size={14} className="text-sky-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{cat.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {menuItems.filter(item => item.category_id === cat.id).length} item{menuItems.filter(item => item.category_id === cat.id).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openEditCategory(cat)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-slate-200"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteCategoryTarget(cat)}
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
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Items</th>
                    {canEdit && <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCategories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-12 text-center text-sm text-slate-400">
                        {search ? 'No categories match your search.' : 'No categories yet.'}
                      </td>
                    </tr>
                  )}
                  {filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                            <Layers size={13} className="text-sky-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-800">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-600">
                          {menuItems.filter(item => item.category_id === cat.id).length} item{menuItems.filter(item => item.category_id === cat.id).length !== 1 ? 's' : ''}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Edit category"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteCategoryTarget(cat)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete category"
                            >
                              <Trash2 size={14} />
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
        </>
      )}

      {/* Add Category Modal */}
      {addCategoryOpen && (
        <Modal title="Add Menu Category" onClose={() => setAddCategoryOpen(false)}>
          <form onSubmit={handleAddCategory} className="space-y-4">
            {categoryError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle size={16} />
                {categoryError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category Name *</label>
              <input
                type="text"
                value={categoryFormName}
                onChange={(e) => setCategoryFormName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Category name"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setAddCategoryOpen(false); resetCategoryFormSimple() }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={categoryLoading}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
              >
                {categoryLoading ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Category Modal */}
      {editCategoryTarget && (
        <Modal title="Edit Menu Category" onClose={() => setEditCategoryTarget(null)}>
          <form onSubmit={handleEditCategory} className="space-y-4">
            {categoryError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle size={16} />
                {categoryError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category Name *</label>
              <input
                type="text"
                value={categoryFormName}
                onChange={(e) => setCategoryFormName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditCategoryTarget(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={categoryLoading}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
              >
                {categoryLoading ? 'Updating...' : 'Update Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Category Confirmation */}
      {deleteCategoryTarget && (
        <Modal title="Delete Category" onClose={() => { setDeleteCategoryTarget(null); setCategoryError('') }}>
          <div className="space-y-4">
            {categoryError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle size={16} />
                {categoryError}
              </div>
            )}
            <div className="flex items-start gap-3 p-3 bg-amber-50 text-amber-800 rounded-lg">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Are you sure you want to delete "{deleteCategoryTarget.name}"?</p>
                <p className="mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setDeleteCategoryTarget(null); setCategoryError('') }}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={categoryLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {categoryLoading ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Item Modal */}
      {addItemOpen && (
        <Modal title="Add Menu Item" onClose={() => setAddItemOpen(false)}>
          <form onSubmit={handleAddItem} className="space-y-4">
            {itemError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle size={16} />
                {itemError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Item Name *</label>
              <input
                type="text"
                value={itemFormName}
                onChange={(e) => { setItemFormName(e.target.value); setItemError('') }}
                placeholder="Item name"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={itemFormCategory}
                onChange={(e) => { setItemFormCategory(e.target.value); setItemError('') }}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="">Select category</option>
                {menuCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (₱)</label>
              <input
                type="number"
                step="0.01"
                value={itemFormPrice}
                onChange={(e) => { setItemFormPrice(e.target.value); setItemError('') }}
                placeholder="0.00"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setAddItemOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={itemLoading}
                className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-yellow-500/25 rounded-lg text-sm text-black font-medium flex items-center justify-center gap-2 transition-all duration-200"
              >
                <Check size={15} /> {itemLoading ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Item Modal */}
      {editItemTarget && (
        <Modal title="Edit Menu Item" onClose={() => setEditItemTarget(null)}>
          <form onSubmit={handleEditItem} className="space-y-4">
            {itemError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle size={16} />
                {itemError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
              <input
                type="text"
                value={itemFormName}
                onChange={(e) => setItemFormName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={itemFormCategory}
                onChange={(e) => setItemFormCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                {menuCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (₱) *</label>
              <input
                type="number"
                value={itemFormPrice}
                onChange={(e) => setItemFormPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                step="0.01"
                min="0"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditItemTarget(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={itemLoading}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50"
              >
                {itemLoading ? 'Updating...' : 'Update Item'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Item Confirmation */}
      {deleteItemTarget && (
        <Modal title="Delete Menu Item" onClose={() => setDeleteItemTarget(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 text-amber-800 rounded-lg">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Are you sure you want to delete "{deleteItemTarget.name}"?</p>
                <p className="mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteItemTarget(null)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={itemLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {itemLoading ? 'Deleting...' : 'Delete Item'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}