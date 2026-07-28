import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, LogIn, LogOut, X, AlertCircle, Check, Bed, User, Phone, Mail, Users, Calendar, Eye, Clock } from 'lucide-react'

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

function BookingDetailsModal({ viewTarget, rooms, currentUser, onCheckOut, onUpdate, onDelete, onClose }) {
  const [isEditing, setIsEditing] = useState(false)
  const [roomSearch, setRoomSearch] = useState('')
  const [roomTypeFilter, setRoomTypeFilter] = useState('All')
  const [formData, setFormData] = useState({
    room_id: viewTarget.room_id,
    guest_name: viewTarget.guest_name || '',
    guest_contact: viewTarget.guest_contact || '',
    number_of_guests: viewTarget.number_of_guests,
    price: viewTarget.price || 0
  })
  const [saving, setSaving] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [modalError, setModalError] = useState('')

  const availableRooms = rooms.filter(r => r.status === 'Available')

  const filteredAvailableRooms = availableRooms.filter(r => {
    const matchesSearch = r.room_number.toLowerCase().includes(roomSearch.toLowerCase())
    const matchesType = roomTypeFilter === 'All' || r.room_type === roomTypeFilter
    return matchesSearch && matchesType
  })

  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'staff'
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'staff'
  const canDelete = currentUser?.role === 'admin'

  const hasChanges = formData.room_id !== viewTarget.room_id ||
                     formData.guest_name !== (viewTarget.guest_name || '') ||
                     formData.guest_contact !== (viewTarget.guest_contact || '') ||
                     formData.number_of_guests !== viewTarget.number_of_guests ||
                     formData.price !== (viewTarget.price || 0)

  function handleSaveClick() {
    if (saving) return
    if (!formData.number_of_guests || formData.number_of_guests <= 0) {
      setModalError('Number of guests must be greater than 0.')
      return
    }
    setModalError('')
    setSaving(true)
    onUpdate(viewTarget.id, formData)
      .then(() => {
        setIsEditing(false)
        setSaving(false)
        onClose()
      })
      .catch(err => {
        setModalError(err instanceof Error ? err.message : 'Failed to save changes')
        setSaving(false)
      })
  }

  function handleCheckOutClick() {
    if (checkingOut) return
    setModalError('')
    setCheckingOut(true)
    onCheckOut(viewTarget.id)
      .then(() => {
        setCheckingOut(false)
        onClose()
      })
      .catch(err => {
        setModalError(err instanceof Error ? err.message : 'Failed to check out')
        setCheckingOut(false)
      })
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Clock size={14} className="text-slate-400 shrink-0" />
          <span>Checked In: {formatDate(viewTarget.check_in_date)}</span>
        </div>
        {viewTarget.check_out_date && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span>Checked Out: {formatDate(viewTarget.check_out_date)}</span>
          </div>
        )}
        <div className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">Room:</span> {viewTarget.room_number} ({viewTarget.room_type})
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Room</label>
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={roomSearch}
                    onChange={e => setRoomSearch(e.target.value)}
                    placeholder="Search rooms…"
                    className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                  />
                </div>
                <select
                  value={roomTypeFilter}
                  onChange={e => setRoomTypeFilter(e.target.value)}
                  className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="All">All Types</option>
                  <option value="Standard">Standard</option>
                  <option value="Family">Family</option>
                  <option value="Barkada">Barkada</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {filteredAvailableRooms.length === 0 ? (
                  <p className="text-sm text-slate-400 col-span-1 sm:col-span-2 text-center py-4">No available rooms match your search</p>
                ) : (
                  filteredAvailableRooms.map(room => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, room_id: room.id })}
                      className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-200 ${
                        formData.room_id === room.id
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-slate-200 hover:border-yellow-300 hover:bg-yellow-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-800 truncate">{room.room_number}</span>
                        <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">{room.room_type}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">Floor {room.floor_number}</span>
                    </button>
                  ))
                )}
              </div>
              {formData.room_id && (
                <p className="text-xs text-slate-600 mt-2">
                  Selected: {rooms.find(r => r.id === formData.room_id)?.room_number}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Guest Name</label>
                <input
                  type="text"
                  value={formData.guest_name}
                  onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
                  placeholder="Enter guest name"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Number</label>
                <input
                  type="text"
                  value={formData.guest_contact}
                  onChange={e => setFormData({ ...formData, guest_contact: e.target.value })}
                  placeholder="e.g. 09123456789"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Guests</label>
                <input
                  type="number"
                  min="1"
                  value={formData.number_of_guests}
                  onChange={e => setFormData({ ...formData, number_of_guests: e.target.value === '' ? '' : parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Guest Name:</span> {viewTarget.guest_name || 'NA'}
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Contact Number:</span> {viewTarget.guest_contact || 'NA'}
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Price:</span> ₱{Number(viewTarget.price).toFixed(2) || '0.00'}
            </div>
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">Notes:</span> {viewTarget.notes || 'NA'}
            </div>
          </div>
        )}

        {modalError && (
          <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{modalError}</p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          {isEditing ? (
            <button onClick={handleSaveClick} disabled={!hasChanges || saving} className="py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-black font-medium transition-all duration-200">
              {saving ? 'Saving…' : 'Save'}
            </button>
          ) : (
            canEdit && viewTarget.status !== 'Checked Out' && (
              <button onClick={() => setIsEditing(true)} className="py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition-all duration-200">
                Edit
              </button>
            )
          )}
          {isEditing ? (
            <button onClick={() => setIsEditing(false)} disabled={saving} className="py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all duration-200">Cancel</button>
          ) : null}
          {viewTarget.status === 'Checked In' && canManage && (
            <button
              onClick={handleCheckOutClick}
              disabled={checkingOut}
              className="py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200"
            >
              {checkingOut ? 'Checking out…' : 'Check Out'}
            </button>
          )}
        </div>
      </div>

    </>
  )
}

export default function CheckInOutPage({ bookings, rooms, currentUser, onCheckIn, onCheckOut, onUpdate, onDelete }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [addOpen, setAddOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [roomSearch, setRoomSearch] = useState('')
  const [roomTypeFilter, setRoomTypeFilter] = useState('All')
  const [formData, setFormData] = useState({
    room_id: '',
    guest_name: '',
    guest_contact: '',
    number_of_guests: '',
    price: '',
    notes: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const availableRooms = rooms.filter(r => r.status === 'Available')

  const filteredAvailableRooms = availableRooms.filter(r => {
    const matchesSearch = r.room_number.toLowerCase().includes(roomSearch.toLowerCase())
    const matchesType = roomTypeFilter === 'All' || r.room_type === roomTypeFilter
    return matchesSearch && matchesType
  })

  const filtered = bookings
    .filter(b => {
      const matchesSearch = (b.guest_name || '').toLowerCase().includes(search.toLowerCase()) ||
                           (b.room_number || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date))

  function getStatusColor(status) {
    switch (status) {
      case 'Checked In': return 'bg-emerald-50 text-emerald-600 border-emerald-200'
      case 'Checked Out': return 'bg-rose-50 text-rose-600 border-rose-200'
      case 'Reserved': return 'bg-purple-50 text-purple-600 border-purple-200'
      default: return 'bg-slate-50 text-slate-600 border-slate-200'
    }
  }

  function openAdd() {
    setFormData({
      room_id: '',
      guest_name: '',
      guest_contact: '',
      number_of_guests: '',
      price: '',
      notes: ''
    })
    setError('')
    setAddOpen(true)
  }

  async function handleCheckIn(e) {
    e.preventDefault()
    if (loading) return
    if (!formData.room_id) { setError('Room is required.'); return }
    if (!formData.number_of_guests || formData.number_of_guests <= 0) { setError('Number of guests must be greater than 0.'); return }
    if (formData.price < 0) { setError('Price cannot be negative.'); return }
    setLoading(true)
    try {
      await onCheckIn(formData)
      setFormData({
        room_id: '',
        guest_name: '',
        guest_contact: '',
        number_of_guests: '',
        price: '',
        notes: ''
      })
      setError('')
      setAddOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(id, bookingData) {
    try {
      await onUpdate(id, bookingData)
    } catch (err) {
      throw err
    }
  }

  async function handleDelete(id) {
    try {
      setDeleting(true)
      await onDelete(id)
      setDeleteTarget(null)
    } catch (err) {
      throw err
    } finally {
      setDeleting(false)
    }
  }

  const canManage = currentUser.role === 'admin' || currentUser.role === 'staff'

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <p className="text-sm text-slate-500 mt-0.5">{bookings.length} bookings total</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bookings…"
              className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full sm:w-52"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="All">All Status</option>
            <option value="Checked In">Checked In</option>
            <option value="Checked Out">Checked Out</option>
            <option value="Reserved">Reserved</option>
          </select>
          {canManage && (
            <button
              onClick={openAdd}
              className="group flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/25 text-black px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0"
            >
              <LogIn size={16} className="group-hover:scale-110 transition-transform" /> Check In
            </button>
          )}
        </div>
      </div>

      {/* Tablet / desktop: table */}
      <div className="hidden sm:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="w-24 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Room</th>
                <th className="w-20 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Guests</th>
                <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="w-36 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Check In</th>
                <th className="w-36 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Check Out</th>
                <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                {canManage && <th className="w-32 px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    {search ? 'No bookings match your search.' : 'No bookings yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50 transition-colors">
                  <td className="w-24 px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                        <Bed size={13} className="text-sky-500" />
                      </div>
                      <span className="text-sm font-medium text-slate-800">{booking.room_number}</span>
                    </div>
                  </td>
                  <td className="w-20 px-4 py-3.5 text-sm text-slate-600">{booking.number_of_guests}</td>
                  <td className="w-28 px-4 py-3.5 text-sm text-slate-600">₱{Number(booking.price).toFixed(2)}</td>
                  <td className="w-36 px-4 py-3.5 text-sm text-slate-600">{formatDate(booking.check_in_date)}</td>
                  <td className="w-36 px-4 py-3.5 text-sm text-slate-600">{formatDate(booking.check_out_date)}</td>
                  <td className="w-28 px-4 py-3.5">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded border ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="w-32 px-4 py-3.5 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => setViewTarget(booking)}
                          className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-transparent hover:border-sky-200"
                          title="View"
                        >
                          <Eye size={13} className="group-hover:scale-110 transition-transform" />
                          <span className="hidden lg:inline">View</span>
                        </button>
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => setDeleteTarget(booking)}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 border border-transparent hover:border-rose-200"
                            title="Delete"
                          >
                            <Trash2 size={13} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden lg:inline">Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="sm:hidden space-y-2.5">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-400">
              {search ? 'No bookings match your search.' : 'No bookings yet.'}
            </p>
          </div>
        )}
        {filtered.map((booking) => (
          <div key={booking.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Bed size={15} className="text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{booking.room_number}</p>
                  <p className="text-xs text-slate-500">{booking.room_type}</p>
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded border ${getStatusColor(booking.status)}`}>
                {booking.status}
              </span>
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Users size={14} className="text-slate-400" />
                <span className="text-slate-600">{booking.number_of_guests} guests</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">₱</span>
                <span className="text-slate-600">{Number(booking.price).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-600">{formatDate(booking.check_in_date)}</span>
              </div>
            </div>
            {canManage && (
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setViewTarget(booking)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all duration-200 border border-slate-200"
                >
                  <Eye size={13} /> View
                </button>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => setDeleteTarget(booking)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 border border-slate-200"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Check In Modal */}
      {addOpen && (
        <Modal title="Check In Guest" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleCheckIn}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Room</label>
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={roomSearch}
                      onChange={e => setRoomSearch(e.target.value)}
                      placeholder="Search rooms…"
                      className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                    />
                  </div>
                  <select
                    value={roomTypeFilter}
                    onChange={e => setRoomTypeFilter(e.target.value)}
                    className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="All">All Types</option>
                    <option value="Standard">Standard</option>
                    <option value="Family">Family</option>
                    <option value="Barkada">Barkada</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {filteredAvailableRooms.length === 0 ? (
                    <p className="text-sm text-slate-400 col-span-1 sm:col-span-2 text-center py-4">No available rooms match your search</p>
                  ) : (
                    filteredAvailableRooms.map(room => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, room_id: room.id })}
                        className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-200 ${
                          formData.room_id === room.id
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-slate-200 hover:border-yellow-300 hover:bg-yellow-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-slate-800 truncate">{room.room_number}</span>
                          <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">{room.room_type}</span>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">Floor {room.floor_number}</span>
                      </button>
                    ))
                  )}
                </div>
                {formData.room_id && (
                  <p className="text-xs text-slate-600 mt-2">
                    Selected: {availableRooms.find(r => r.id === formData.room_id)?.room_number}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Guest Name</label>
                  <input
                    type="text"
                    value={formData.guest_name}
                    onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
                    placeholder="Enter guest name"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Number</label>
                  <input
                    type="text"
                    value={formData.guest_contact}
                    onChange={e => setFormData({ ...formData, guest_contact: e.target.value })}
                    placeholder="e.g. 09123456789"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Number of Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.number_of_guests}
                    onChange={e => setFormData({ ...formData, number_of_guests: e.target.value === '' ? '' : parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                  placeholder="Additional notes..."
                />
              </div>
              {error && (
                <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setAddOpen(false)} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-yellow-500/25 rounded-lg text-sm text-black font-medium flex items-center justify-center gap-2 transition-all duration-200">
                  <Check size={15} /> {loading ? 'Checking in…' : 'Check In'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {viewTarget && (
        <Modal title="Booking Details" onClose={() => setViewTarget(null)}>
          <BookingDetailsModal
            viewTarget={viewTarget}
            rooms={rooms}
            currentUser={currentUser}
            onCheckOut={onCheckOut}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClose={() => setViewTarget(null)}
          />
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal title="Delete Booking" onClose={() => setDeleteTarget(null)}>
          <div className="space-y-4">
            <p className="text-slate-600">
              Are you sure you want to delete the booking for <strong>{deleteTarget.guest_name}</strong> in room <strong>{deleteTarget.room_number}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50">Cancel</button>
              <button onClick={() => handleDelete(deleteTarget.id)} disabled={deleting} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-sm text-white font-medium transition-all duration-200 disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
