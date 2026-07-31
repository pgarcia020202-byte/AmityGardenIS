import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Bed, X, AlertCircle, Check } from 'lucide-react'

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

export default function RoomsPage({ rooms, currentUser, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [formData, setFormData] = useState({
    room_number: '',
    room_type: 'Standard',
    capacity: '',
    status: 'Available',
    floor_number: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = rooms
    .filter(r => {
      const matchesSearch = (r.room_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
                           (r.room_type?.toLowerCase() || '').includes(search.toLowerCase())
      const matchesType = typeFilter === 'All' || r.room_type === typeFilter
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => (a.room_number || '').localeCompare(b.room_number || '', undefined, { numeric: true }))

  function getStatusColor(status) {
    switch (status) {
      case 'Available': return 'bg-emerald-50 text-emerald-600 border-emerald-200'
      case 'Occupied': return 'bg-rose-50 text-rose-600 border-rose-200'
      case 'Reserved': return 'bg-purple-50 text-purple-600 border-purple-200'
      case 'Maintenance': return 'bg-amber-50 text-amber-600 border-amber-200'
      case 'Cleaning': return 'bg-sky-50 text-sky-600 border-sky-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  function openAdd() {
    setFormData({
      room_number: '',
      room_type: 'Standard',
      capacity: '',
      status: 'Available',
      floor_number: ''
    })
    setError('')
    setAddOpen(true)
  }

  function openEdit(room) {
    setEditTarget(room)
    setFormData({
      room_number: room.room_number,
      room_type: room.room_type,
      capacity: room.capacity,
      status: room.status,
      floor_number: room.floor_number || 1
    })
    setError('')
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (loading) return
    const roomNumber = formData.room_number.trim()
    if (!roomNumber) { setError('Room number is required.'); return }
    if (!formData.room_type.trim()) { setError('Room type is required.'); return }
    if (!['Standard', 'Family', 'Barkada'].includes(formData.room_type)) {
      setError('Room type must be Standard, Family, or Barkada.'); return
    }
    if (!formData.capacity || formData.capacity <= 0) { setError('Capacity must be greater than 0.'); return }
    if (rooms.some(r => r.room_number.toLowerCase() === roomNumber.toLowerCase())) {
      setError('A room with this number already exists.'); return
    }
    setLoading(true)
    try {
      await onAdd(formData)
      setFormData({
        room_number: '',
        room_type: 'Standard',
        capacity: '',
        status: 'Available',
        floor_number: ''
      })
      setError('')
      setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add room')
    } finally {
      setLoading(false)
    }
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (loading || !editTarget) return
    const roomNumber = formData.room_number.trim()
    if (!roomNumber) { setError('Room number is required.'); return }
    if (!formData.room_type.trim()) { setError('Room type is required.'); return }
    if (!['Standard', 'Family', 'Barkada'].includes(formData.room_type)) {
      setError('Room type must be Standard, Family, or Barkada.'); return
    }
    if (!formData.capacity || formData.capacity <= 0) { setError('Capacity must be greater than 0.'); return }
    if (rooms.some(r => r.room_number.toLowerCase() === roomNumber.toLowerCase() && r.id !== editTarget.id)) {
      setError('A room with this number already exists.'); return
    }
    setLoading(true)
    try {
      await onEdit(editTarget.id, formData)
      setEditTarget(null)
      setFormData({
        room_number: '',
        room_type: 'Standard',
        capacity: 2,
        status: 'Available',
        floor_number: 1
      })
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room')
    } finally {
      setLoading(false)
    }
  }

  async  function handleDelete() {
    if (!deleteTarget) return
    onDelete(deleteTarget.id)
    setDeleteTarget(null)
  }

  const canManage = currentUser.role === 'admin' || currentUser.role === 'staff'

  return (
    <div className="p-4 sm:p-6">
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-md mb-5 sm:mb-6 -mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-slate-500 mt-0.5">{rooms.length} rooms total</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search rooms…"
                  className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-52"
                />
              </div>
              {canManage && (
                <button
                  onClick={() => { setFormData({ room_number: '', room_type: 'Standard', capacity: 2, status: 'Available', floor_number: 1 }); setError(''); setAddOpen(true) }}
                  className="group flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/25 text-black px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" /> Add Room
                </button>
              )}
            </div>
            <div className="flex flex-row gap-3">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="flex-1 px-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="All">All Types</option>
                <option value="Standard">Standard</option>
                <option value="Family">Family</option>
                <option value="Barkada">Barkada</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="flex-1 px-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="All">All Status</option>
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Cleaning">Cleaning</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / small-tablet: card list */}
      <div className="sm:hidden space-y-2.5">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-12 text-center text-sm text-slate-400">
            {search ? 'No rooms match your search.' : 'No rooms yet.'}
          </div>
        )}
        {filtered.map(room => (
          <div key={room.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Bed size={14} className="text-sky-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">Room {room.room_number}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{room.room_type} • {room.capacity} guests</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(room.status)}`}>
                {room.status}
              </span>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEdit(room)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-slate-200"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(room)}
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
                <th className="w-16 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Room</th>
                <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacity</th>
                <th className="w-20 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Floor</th>
                <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                {canManage && <th className="w-28 px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    {search ? 'No rooms match your search.' : 'No rooms yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((room, i) => (
                <tr key={room.id} className="hover:bg-slate-50 transition-colors">
                  <td className="w-16 px-4 py-3.5 text-xs text-slate-400 font-mono">{i + 1}</td>
                  <td className="w-32 px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                        <Bed size={13} className="text-sky-500" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{room.room_number}</span>
                    </div>
                  </td>
                  <td className="w-28 px-4 py-3.5 text-sm text-slate-600">{room.room_type}</td>
                  <td className="w-28 px-4 py-3.5 text-sm text-slate-600">{room.capacity} guests</td>
                  <td className="w-20 px-4 py-3.5 text-sm text-slate-600">{room.floor_number}</td>
                  <td className="w-28 px-4 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded border ${getStatusColor(room.status)}`}>
                      {room.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="w-28 px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(room)}
                          className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-transparent hover:border-sky-200"
                          title="Edit"
                        >
                          <Pencil size={13} className="group-hover:scale-110 transition-transform" />
                          <span className="hidden lg:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(room)}
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
        <Modal title="Add Room" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Number</label>
              <input
                value={formData.room_number}
                onChange={e => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g. 101"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Type</label>
              <select
                value={formData.room_type}
                onChange={e => setFormData({ ...formData, room_type: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="Standard">Standard</option>
                <option value="Family">Family</option>
                <option value="Barkada">Barkada</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: e.target.value === '' ? '' : parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Floor</label>
                <input
                  type="number"
                  min="1"
                  value={formData.floor_number}
                  onChange={e => setFormData({ ...formData, floor_number: e.target.value === '' ? '' : parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Cleaning">Cleaning</option>
              </select>
            </div>
            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-yellow-500/25 rounded-lg text-sm text-black font-medium flex items-center justify-center gap-2 transition-all duration-200">
                <Check size={15} /> {loading ? 'Adding…' : 'Add Room'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <Modal title="Edit Room" onClose={() => setEditTarget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Number</label>
              <input
                value={formData.room_number}
                onChange={e => setFormData({ ...formData, room_number: e.target.value })}
                placeholder="e.g. 101"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Room Type</label>
              <select
                value={formData.room_type}
                onChange={e => setFormData({ ...formData, room_type: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="Standard">Standard</option>
                <option value="Family">Family</option>
                <option value="Barkada">Barkada</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: e.target.value === '' ? '' : parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Floor</label>
                <input
                  type="number"
                  min="1"
                  value={formData.floor_number}
                  onChange={e => setFormData({ ...formData, floor_number: e.target.value === '' ? '' : parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Cleaning">Cleaning</option>
              </select>
            </div>
            {error && (
              <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-yellow-500/25 rounded-lg text-sm text-black font-medium flex items-center justify-center gap-2 transition-all duration-200">
                <Check size={15} /> {loading ? 'Updating…' : 'Update Room'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal title="Delete Room" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to delete <strong>Room {deleteTarget.room_number}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-sm text-white font-medium transition-all duration-200">Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
