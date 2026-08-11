import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Search, Plus, Pencil, Trash2, LogIn, LogOut, X, AlertCircle, Check, Bed, User, Phone, Mail, Users, Calendar, Eye, Clock, Timer, ClockPlus, Info, Package } from 'lucide-react'

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

function CountdownTimer({ checkInDate, durationMinutes = 30, onTimerEnd }) {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!checkInDate) return

    // Parse the check-in date (database already handles Asia/Manila timezone)
    const checkInTime = new Date(checkInDate).getTime()
    const endTime = checkInTime + (durationMinutes * 60 * 1000)

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const remaining = endTime - now

      if (remaining <= 0) {
        setTimeLeft(0)
        if (onTimerEnd) onTimerEnd()
        return
      }

      setTimeLeft(remaining)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [checkInDate, durationMinutes, onTimerEnd])

  if (timeLeft === null) return null

  const hours = Math.floor(timeLeft / (60 * 60 * 1000))
  const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000)

  const isExpired = timeLeft <= 0
  const isLow = timeLeft > 0 && timeLeft < (15 * 60 * 1000) // Less than 15 minutes

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${
      isExpired ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
    }`}>
      <Timer size={12} className={isExpired ? 'animate-pulse' : ''} />
      <span>
        {isExpired ? 'Expired' : `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
      </span>
    </div>
  )
}

function ExtendTimeModal({ bookings, rooms, onClose, onExtend }) {
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [extendHours, setExtendHours] = useState('')
  const [extraPrice, setExtraPrice] = useState('')
  const [extending, setExtending] = useState(false)
  const [error, setError] = useState('')
  const [roomSearch, setRoomSearch] = useState('')
  const [roomTypeFilter, setRoomTypeFilter] = useState('All')

  const checkedInBookings = bookings.filter(b => b.status === 'Checked In')

  const filteredBookings = checkedInBookings.filter(b => {
    const matchesSearch = (b.room_number || '').toLowerCase().includes(roomSearch.toLowerCase())
    const matchesType = roomTypeFilter === 'All' || b.room_type === roomTypeFilter
    return matchesSearch && matchesType
  })
  const selectedBooking = checkedInBookings.find(b => b.id === selectedBookingId)
  const currentPrice = selectedBooking ? Number(selectedBooking.price) : 0
  const newTotalPrice = currentPrice + Number(extraPrice || 0)

  // Helper function to get timer color for a booking
  const getTimerColor = (booking) => {
    if (!booking.check_in_date || !booking.timer_duration) return 'green'
    const checkInTime = new Date(booking.check_in_date).getTime()
    const endTime = checkInTime + (booking.timer_duration * 60 * 1000)
    const remaining = endTime - new Date().getTime()
    const fifteenMinutes = 15 * 60 * 1000

    if (remaining <= 0) return 'red'
    if (remaining < fifteenMinutes) return 'yellow'
    return 'green'
  }

  const getTimerBorderClasses = (booking, isSelected) => {
    const timerColor = getTimerColor(booking)
    const baseClasses = isSelected ? 'ring-2 ring-offset-1 ' : ''
    switch (timerColor) {
      case 'red': return `${baseClasses}border-rose-400 bg-rose-50 hover:border-rose-500 hover:bg-rose-100`
      case 'yellow': return `${baseClasses}border-yellow-400 bg-yellow-50 hover:border-yellow-500 hover:bg-yellow-100`
      case 'green': return `${baseClasses}border-emerald-400 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100`
      default: return `${baseClasses}border-slate-200 hover:border-blue-300 hover:bg-blue-50`
    }
  }

  function handleExtend() {
    if (extending) return
    if (!selectedBookingId) {
      setError('Please select Room.')
      return
    }
    if (extendHours <= 0) {
      setError('Extension hours must be greater than 0.')
      return
    }
    if (extraPrice < 0) {
      setError('Extra price cannot be negative.')
      return
    }
    setError('')
    setExtending(true)
    onExtend(selectedBookingId, extendHours, extraPrice)
      .then(() => {
        setExtending(false)
        onClose()
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to extend booking')
        setExtending(false)
      })
  }

  return (
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
              className="pl-9 pr-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <select
            value={roomTypeFilter}
            onChange={e => setRoomTypeFilter(e.target.value)}
            className="px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Types</option>
            <option value="Standard">Standard</option>
            <option value="Family">Family</option>
            <option value="Barkada">Barkada</option>
          </select>
        </div>
        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
          {filteredBookings.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No checked-in rooms match your search</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredBookings.map(booking => (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedBookingId(booking.id)}
                  className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-200 ${getTimerBorderClasses(booking, selectedBookingId === booking.id)}`}
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-800 truncate">{booking.room_number}</span>
                    <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">{booking.room_type}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedBookingId && (
          <p className="text-xs text-slate-600 mt-2">
            Selected: {checkedInBookings.find(b => b.id === selectedBookingId)?.room_number} ({checkedInBookings.find(b => b.id === selectedBookingId)?.room_type})
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Extend Hours</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={extendHours}
            onChange={e => setExtendHours(e.target.value)}
            placeholder="1"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Extra Price (₱)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={extraPrice}
            onChange={e => setExtraPrice(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      {selectedBooking && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Current Price:</span>
            <span className="font-medium text-slate-900">₱{currentPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Extra Price:</span>
            <span className="font-medium text-slate-900">₱{Number(extraPrice).toFixed(2)}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">New Total:</span>
            <span className="font-bold text-blue-600">₱{newTotalPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Time Extension:</span>
            <span className="font-medium">+{extendHours} hour(s)</span>
          </div>
        </div>
      )}
      {error && (
        <p className="text-xs text-rose-600 flex items-center gap-1"><AlertCircle size={12} />{error}</p>
      )}
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} disabled={extending} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50">Cancel</button>
        <button onClick={handleExtend} disabled={extending} className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200">
          {extending ? 'Extending…' : 'Extend Time'}
        </button>
      </div>
    </div>
  )
}

function BookingDetailsModal({
  viewTarget,
  rooms,
  currentUser,
  onCheckOut,
  onUpdate,
  onDelete,
  onClose,
  menuItems = [],
  menuCategories = []
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [roomSearch, setRoomSearch] = useState('')
  const [roomTypeFilter, setRoomTypeFilter] = useState('All')

  const [formData, setFormData] = useState({
    room_id: '',
    guest_name: '',
    guest_contact: '',
    number_of_guests: '',
    base_price: '',
    price: '',
    notes: '',
    is_complimentary: false,
    complimentary_item_1: '',
    complimentary_item_2: '',
    is_order: false,
    order_items: [],
    is_addons: false,
    addons_items: []
  })
  const prevBookingIdRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [modalError, setModalError] = useState('')

  /*
   * MENU CATEGORIES
   */
  const addonsCategory = menuCategories.find(
    c => c.name?.toLowerCase() === 'add-ons'
  )

  const addonsItems = addonsCategory
    ? menuItems.filter(item => item.category_id === addonsCategory.id)
    : []

  const orderItems = menuItems.filter(
    item => item.category_id !== addonsCategory?.id
  )

  const complimentaryItems = menuItems.filter(
    item => item.category_id !== addonsCategory?.id
  )

  /*
   * RESET FORM WHEN BOOKING CHANGES
   */
  useEffect(() => {
    // Only reset when booking ID changes, not when other properties change
    if (prevBookingIdRef.current === viewTarget.id) {
      return
    }
    prevBookingIdRef.current = viewTarget.id

    const currentAddonsTotal = (viewTarget.addons_items || []).reduce(
      (total, addon) => {
        const item = addonsItems.find(i => i.id === addon.id)

        return (
          total +
          (item ? parseFloat(item.price) * Number(addon.quantity || 0) : 0)
        )
      },
      0
    )

    const currentOrderTotal = (viewTarget.order_items || []).reduce(
      (total, order) => {
        const item = orderItems.find(i => i.id === order.id)

        return (
          total +
          (item ? parseFloat(item.price) * Number(order.quantity || 0) : 0)
        )
      },
      0
    )

    const complimentarySurcharge = viewTarget.is_complimentary ? 200 : 0

    const calculatedBasePrice =
      Number(viewTarget.price || 0) -
      complimentarySurcharge -
      currentAddonsTotal -
      currentOrderTotal

    const newFormData = {
      room_id: viewTarget.room_id,
      guest_name: viewTarget.guest_name || '',
      guest_contact: viewTarget.guest_contact || '',
      number_of_guests: viewTarget.number_of_guests,
      base_price:
        calculatedBasePrice >= 0
          ? calculatedBasePrice
          : Number(viewTarget.price || 0),
      price: viewTarget.price || 0,
      notes: viewTarget.notes || '',
      is_complimentary: viewTarget.is_complimentary || false,
      complimentary_item_1: viewTarget.complimentary_item_1 || '',
      complimentary_item_2: viewTarget.complimentary_item_2 || '',
      is_order: viewTarget.is_order || false,
      order_items: viewTarget.order_items || [],
      is_addons: viewTarget.is_addons || false,
      addons_items: viewTarget.addons_items || []
    }

    setFormData(newFormData)
    setIsEditing(false)
    setModalError('')
  }, [viewTarget.id])

  /*
   * RESET FORM DATA
   */
  const resetFormData = () => {
    const currentAddonsTotal = (viewTarget.addons_items || []).reduce(
      (total, addon) => {
        const item = addonsItems.find(i => i.id === addon.id)

        return (
          total +
          (item ? parseFloat(item.price) * Number(addon.quantity || 0) : 0)
        )
      },
      0
    )

    const currentOrderTotal = (viewTarget.order_items || []).reduce(
      (total, order) => {
        const item = orderItems.find(i => i.id === order.id)

        return (
          total +
          (item ? parseFloat(item.price) * Number(order.quantity || 0) : 0)
        )
      },
      0
    )

    const complimentarySurcharge = viewTarget.is_complimentary ? 200 : 0

    const calculatedBasePrice =
      Number(viewTarget.price || 0) -
      complimentarySurcharge -
      currentAddonsTotal -
      currentOrderTotal

    const newFormData = {
      room_id: viewTarget.room_id,
      guest_name: viewTarget.guest_name || '',
      guest_contact: viewTarget.guest_contact || '',
      number_of_guests: viewTarget.number_of_guests,
      base_price:
        calculatedBasePrice >= 0
          ? calculatedBasePrice
          : Number(viewTarget.price || 0),
      price: viewTarget.price || 0,
      notes: viewTarget.notes || '',
      is_complimentary: viewTarget.is_complimentary || false,
      complimentary_item_1: viewTarget.complimentary_item_1 || '',
      complimentary_item_2: viewTarget.complimentary_item_2 || '',
      is_order: viewTarget.is_order || false,
      order_items: viewTarget.order_items || [],
      is_addons: viewTarget.is_addons || false,
      addons_items: viewTarget.addons_items || []
    }

    setFormData(newFormData)
    setModalError('')
  }

  /*
   * AVAILABLE ROOMS
   */
  const availableRooms = rooms.filter(
    r => r.status === 'Available' || r.id === viewTarget.room_id
  )

  const filteredAvailableRooms = availableRooms.filter(room => {
    const matchesSearch = (room.room_number || '')
      .toLowerCase()
      .includes(roomSearch.toLowerCase())

    const matchesType =
      roomTypeFilter === 'All' || room.room_type === roomTypeFilter

    return matchesSearch && matchesType
  })

  /*
   * COMPLIMENTARY ITEM NAME
   */
  const getComplimentaryItemName = itemId => {
    if (!itemId) return null

    const item = menuItems.find(m => m.id === itemId)

    return item ? item.name : null
  }

  /*
   * ORDER TOTAL
   */
  const orderTotal = useMemo(() => {
    return formData.order_items.reduce((total, order) => {
      const item = orderItems.find(i => i.id === order.id)

      return (
        total +
        (item
          ? parseFloat(item.price) * Number(order.quantity || 0)
          : 0)
      )
    }, 0)
  }, [formData.order_items, orderItems])

  /*
   * ADD-ONS TOTAL
   */
  const addonsTotal = useMemo(() => {
    return formData.addons_items.reduce((total, addon) => {
      const item = addonsItems.find(i => i.id === addon.id)

      return (
        total +
        (item
          ? parseFloat(item.price) * Number(addon.quantity || 0)
          : 0)
      )
    }, 0)
  }, [formData.addons_items, addonsItems])

  /*
   * TOTAL PRICE
   *
   * THIS WAS MISSING IN YOUR ORIGINAL CODE.
   */
  const totalPrice = useMemo(() => {
    const basePrice = parseFloat(formData.base_price) || 0

    const complimentarySurcharge = formData.is_complimentary
      ? 200
      : 0

    return (
      basePrice +
      complimentarySurcharge +
      orderTotal +
      addonsTotal
    )
  }, [
    formData.base_price,
    formData.is_complimentary,
    orderTotal,
    addonsTotal
  ])

  /*
   * PERMISSIONS
   */
  const canManage =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'staff'

  const canEdit =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'staff'

  const canDelete =
    currentUser?.role === 'admin'

  /*
   * CHECK WHETHER FORM HAS CHANGES
   */
  const hasChanges =
    formData.room_id !== viewTarget.room_id ||
    formData.guest_name !== (viewTarget.guest_name || '') ||
    formData.guest_contact !== (viewTarget.guest_contact || '') ||
    Number(formData.number_of_guests) !==
      Number(viewTarget.number_of_guests) ||
    Math.abs(totalPrice - Number(viewTarget.price || 0)) > 0.01 ||
    formData.notes !== (viewTarget.notes || '') ||
    formData.is_complimentary !==
      (viewTarget.is_complimentary || false) ||
    formData.complimentary_item_1 !==
      (viewTarget.complimentary_item_1 || '') ||
    formData.complimentary_item_2 !==
      (viewTarget.complimentary_item_2 || '') ||
    formData.is_order !==
      (viewTarget.is_order || false) ||
    JSON.stringify(formData.order_items) !==
      JSON.stringify(viewTarget.order_items || []) ||
    formData.is_addons !==
      (viewTarget.is_addons || false) ||
    JSON.stringify(formData.addons_items) !==
      JSON.stringify(viewTarget.addons_items || [])

  /*
   * SAVE
   */
  async function handleSaveClick() {
    if (saving) return

    if (
      !formData.number_of_guests ||
      Number(formData.number_of_guests) <= 0
    ) {
      setModalError(
        'Number of guests must be greater than 0.'
      )
      return
    }

    if (
      formData.is_complimentary &&
      !formData.complimentary_item_1 &&
      !formData.complimentary_item_2
    ) {
      setModalError(
        'Please select at least one complimentary item.'
      )
      return
    }

    if (
      formData.is_order &&
      formData.order_items.filter(
        item => Number(item.quantity) > 0
      ).length === 0
    ) {
      setModalError(
        'Please select at least one ordered item with quantity.'
      )
      return
    }

    if (
      formData.is_addons &&
      formData.addons_items.filter(
        item => Number(item.quantity) > 0
      ).length === 0
    ) {
      setModalError(
        'Please select at least one add-on item with quantity.'
      )
      return
    }

    setModalError('')
    setSaving(true)

    try {
      const cleanOrderItems = formData.order_items.filter(
        item => Number(item.quantity) > 0
      )

      const cleanAddonsItems = formData.addons_items.filter(
        item => Number(item.quantity) > 0
      )

      const finalTotalPrice =
        (parseFloat(formData.base_price) || 0) +
        (formData.is_complimentary ? 200 : 0) +
        orderTotal +
        addonsTotal

      await onUpdate(viewTarget.id, {
        ...formData,

        number_of_guests: Number(
          formData.number_of_guests
        ),

        base_price: (
          parseFloat(formData.base_price) || 0
        ).toString(),

        price: finalTotalPrice.toString(),

        order_items: cleanOrderItems,

        addons_items: cleanAddonsItems
      })

      setIsEditing(false)
      setSaving(false)
      onClose()
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : 'Failed to save changes'
      )

      setSaving(false)
    }
  }

  /*
   * CHECK OUT
   */
  async function handleCheckOutClick() {
    if (checkingOut) return

    setModalError('')
    setCheckingOut(true)

    try {
      await onCheckOut(viewTarget.id)

      setCheckingOut(false)
      onClose()
    } catch (err) {
      setModalError(
        err instanceof Error
          ? err.message
          : 'Failed to check out'
      )

      setCheckingOut(false)
    }
  }

  /*
   * FORMAT DATE
   */
  const formatDate = dateString => {
    if (!dateString) return '-'

    const date = new Date(dateString)

    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <>
      <div className="space-y-4">

        {/* BOOKING INFORMATION */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">
              Room:
            </span>{' '}
            {viewTarget.room_number} (
            {viewTarget.room_type})
          </div>

          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">
              Price:
            </span>{' '}
            ₱{Number(viewTarget.price || 0).toFixed(2)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">
              Guest Name:
            </span>{' '}
            {viewTarget.guest_name || 'NA'}
          </div>

          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-900">
              Contact Number:
            </span>{' '}
            {viewTarget.guest_contact || 'NA'}
          </div>
        </div>

        {/* COMPLIMENTARY ITEMS */}
        {viewTarget.is_complimentary && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
              <Info size={14} />
              <span>Complimentary Items</span>
            </div>

            <div className="space-y-1">
              {getComplimentaryItemName(
                viewTarget.complimentary_item_1
              ) && (
                <div className="text-sm text-slate-700">
                  •{' '}
                  {getComplimentaryItemName(
                    viewTarget.complimentary_item_1
                  )}
                </div>
              )}

              {getComplimentaryItemName(
                viewTarget.complimentary_item_2
              ) && (
                <div className="text-sm text-slate-700">
                  •{' '}
                  {getComplimentaryItemName(
                    viewTarget.complimentary_item_2
                  )}
                </div>
              )}

              {!getComplimentaryItemName(
                viewTarget.complimentary_item_1
              ) &&
                !getComplimentaryItemName(
                  viewTarget.complimentary_item_2
                ) && (
                  <div className="text-sm text-slate-500 italic">
                    No items selected
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ORDER ITEMS */}
        {viewTarget.is_order &&
          viewTarget.order_items &&
          viewTarget.order_items.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <Package size={14} />
                <span>Order Items</span>
              </div>

              <div className="space-y-1">
                {viewTarget.order_items.map(
                  (orderItem, index) => {
                    const itemName = menuItems.find(
                      m => m.id === orderItem.id
                    )?.name

                    return itemName ? (
                      <div
                        key={index}
                        className="text-sm text-slate-700"
                      >
                        • {itemName} (Qty:{' '}
                        {orderItem.quantity})
                      </div>
                    ) : null
                  }
                )}
              </div>
            </div>
          )}

        {viewTarget.is_order &&
          (!viewTarget.order_items ||
            viewTarget.order_items.length === 0) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <Package size={14} />
                <span>Order Items</span>
              </div>

              <div className="text-sm text-slate-500 italic mt-1">
                No ordered items selected
              </div>
            </div>
          )}

        {/* ADD-ONS */}
        {viewTarget.is_addons &&
          viewTarget.addons_items &&
          viewTarget.addons_items.length > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                <Package size={14} />
                <span>Add-ons Items</span>
              </div>

              <div className="space-y-1">
                {viewTarget.addons_items.map(
                  (addonItem, index) => {
                    const itemName = menuItems.find(
                      m => m.id === addonItem.id
                    )?.name

                    return itemName ? (
                      <div
                        key={index}
                        className="text-sm text-slate-700"
                      >
                        • {itemName} (Qty:{' '}
                        {addonItem.quantity})
                      </div>
                    ) : null
                  }
                )}
              </div>
            </div>
          )}

        {viewTarget.is_addons &&
          (!viewTarget.addons_items ||
            viewTarget.addons_items.length === 0) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                <Package size={14} />
                <span>Add-ons Items</span>
              </div>

              <div className="text-sm text-slate-500 italic mt-1">
                No add-ons selected
              </div>
            </div>
          )}

        {/* DATES */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Clock
              size={14}
              className="text-slate-400 shrink-0"
            />

            <span>
              Checked In:{' '}
              {formatDate(viewTarget.check_in_date)}
            </span>
          </div>

          {viewTarget.check_out_date && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Clock
                size={14}
                className="text-slate-400 shrink-0"
              />

              <span>
                Checked Out:{' '}
                {formatDate(viewTarget.check_out_date)}
              </span>
            </div>
          )}
        </div>

        {/* EDIT FORM */}
        {isEditing && (
          <div className="space-y-4">

            {/* ROOM */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Room
              </label>

              <div className="flex flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={roomSearch}
                    onChange={e =>
                      setRoomSearch(e.target.value)
                    }
                    placeholder="Search rooms…"
                    className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                  />
                </div>

                <select
                  value={roomTypeFilter}
                  onChange={e =>
                    setRoomTypeFilter(e.target.value)
                  }
                  className="px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 min-w-[120px]"
                >
                  <option value="All">
                    All Types
                  </option>
                  <option value="Standard">
                    Standard
                  </option>
                  <option value="Family">
                    Family
                  </option>
                  <option value="Barkada">
                    Barkada
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {filteredAvailableRooms.length === 0 ? (
                  <p className="text-sm text-slate-400 col-span-2 text-center py-4">
                    No available rooms match your search
                  </p>
                ) : (
                  filteredAvailableRooms.map(room => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          room_id: room.id
                        })
                      }
                      className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left transition-all duration-200 ${
                        formData.room_id === room.id
                          ? 'border-yellow-300 bg-yellow-50'
                          : 'border-slate-200 hover:border-yellow-300 hover:bg-yellow-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {room.room_number}
                        </span>

                        <span className="text-xs text-slate-400 ml-2 whitespace-nowrap">
                          {room.room_type}
                        </span>
                      </div>

                      <span className="text-xs text-slate-400 shrink-0">
                        Floor {room.floor_number}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {formData.room_id && (
                <p className="text-xs text-slate-600 mt-2">
                  Selected:{' '}
                  {
                    rooms.find(
                      r => r.id === formData.room_id
                    )?.room_number
                  }
                </p>
              )}
            </div>

            {/* GUEST DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Guest Name
                </label>

                <input
                  type="text"
                  value={formData.guest_name || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      guest_name: e.target.value
                    })
                  }
                  placeholder="Enter guest name"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Contact Number
                </label>

                <input
                  type="text"
                  value={formData.guest_contact || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      guest_contact: e.target.value
                    })
                  }
                  placeholder="e.g. 09123456789"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            {/* GUESTS + BASE PRICE */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Number of Guests
                </label>

                <input
                  type="number"
                  min="1"
                  value={formData.number_of_guests || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      number_of_guests: e.target.value
                    })
                  }
                  placeholder="1"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Base Price
                </label>

                {/* FIXED:
                    This must use base_price, NOT price.
                */}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.base_price || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      base_price: e.target.value
                    })
                  }
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            {/* COMPLIMENTARY AND ORDER */}
            <div className="flex gap-4">
              {!(
                viewTarget.status === 'Checked In' &&
                !viewTarget.is_complimentary
              ) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_complimentary}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        is_complimentary:
                          e.target.checked
                      })
                    }
                    disabled={
                      viewTarget.status === 'Checked In' &&
                      viewTarget.is_complimentary
                    }
                    className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />

                  <span className="text-sm text-slate-700">
                    Complimentary
                  </span>
                </label>
              )}

              {/* ORDER TOGGLE */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_order}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      is_order: e.target.checked,
                      order_items: e.target.checked
                        ? formData.order_items
                        : []
                    })
                  }
                  className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500"
                />

                <span className="text-sm text-slate-700">
                  Order
                </span>
              </label>
            </div>

            {viewTarget.status === 'Checked In' &&
              viewTarget.is_complimentary && (
                <p className="text-xs text-slate-400 mt-1">
                  Cannot change complimentary once checked in
                </p>
              )}

            {/* COMPLIMENTARY ITEMS */}
            {formData.is_complimentary && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Complimentary Item 1
                  </label>

                  <select
                    value={formData.complimentary_item_1 || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        complimentary_item_1:
                          e.target.value
                      })
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    {!formData.complimentary_item_1 && (
                      <option value="">
                        Select item
                      </option>
                    )}

                    {complimentaryItems.map(item => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Complimentary Item 2
                  </label>

                  <select
                    value={formData.complimentary_item_2 || ''}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        complimentary_item_2:
                          e.target.value
                      })
                    }
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    {!formData.complimentary_item_2 && (
                      <option value="">
                        Select item
                      </option>
                    )}

                    {complimentaryItems.map(item => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            )}

            {/* ORDER ITEMS */}
            {formData.is_order && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Order Items
                </label>

                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">

                  {orderItems.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">
                      No menu items available for order
                    </p>
                  ) : (
                    orderItems.map(item => {
                      const currentQty =
                        formData.order_items.find(
                          o => o.id === item.id
                        )?.quantity || 0

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-700">
                              {item.name}
                            </span>

                            <span className="text-xs text-slate-400 ml-2">
                              ₱
                              {parseFloat(
                                item.price
                              ).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">

                            <button
                              type="button"
                              onClick={() => {
                                if (currentQty <= 0) return

                                const updatedOrder =
                                  formData.order_items
                                    .filter(
                                      o =>
                                        o.id !== item.id
                                    )
                                    .concat({
                                      id: item.id,
                                      quantity:
                                        currentQty - 1
                                    })
                                    .filter(
                                      o =>
                                        o.quantity > 0
                                    )

                                setFormData({
                                  ...formData,
                                  order_items:
                                    updatedOrder
                                })
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-sm"
                            >
                              -
                            </button>

                            <span className="w-8 text-center text-sm text-slate-700">
                              {currentQty}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const updatedOrder =
                                  formData.order_items
                                    .filter(
                                      o =>
                                        o.id !== item.id
                                    )
                                    .concat({
                                      id: item.id,
                                      quantity:
                                        currentQty + 1
                                    })

                                setFormData({
                                  ...formData,
                                  order_items:
                                    updatedOrder
                                })
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-sm"
                            >
                              +
                            </button>

                          </div>
                        </div>
                      )
                    })
                  )}

                </div>

                {formData.order_items.length > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Order Total:
                    </span>

                    <span className="font-medium text-slate-900">
                      ₱{orderTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ADD-ONS TOGGLE */}
            {(formData.is_complimentary || formData.is_order) && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_addons}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        is_addons: e.target.checked,
                        addons_items: e.target.checked
                          ? formData.addons_items
                          : []
                      })
                    }
                    className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500"
                  />

                  <span className="text-sm text-slate-700">
                    Add-ons
                  </span>
                </label>
              </div>
            )}

            {/* ADD-ONS ITEMS */}
            {formData.is_addons && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Add-ons Items
                </label>

                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">

                  {addonsItems.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-2">
                      No add-ons available
                    </p>
                  ) : (
                    addonsItems.map(item => {
                      const currentQty =
                        formData.addons_items.find(
                          a => a.id === item.id
                        )?.quantity || 0

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-700">
                              {item.name}
                            </span>

                            <span className="text-xs text-slate-400 ml-2">
                              ₱
                              {parseFloat(
                                item.price
                              ).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">

                            <button
                              type="button"
                              onClick={() => {
                                if (currentQty <= 0) return

                                const updatedAddons =
                                  formData.addons_items
                                    .filter(
                                      a =>
                                        a.id !== item.id
                                    )
                                    .concat({
                                      id: item.id,
                                      quantity:
                                        currentQty - 1
                                    })
                                    .filter(
                                      a =>
                                        a.quantity > 0
                                    )

                                setFormData({
                                  ...formData,
                                  addons_items:
                                    updatedAddons
                                })
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-sm"
                            >
                              -
                            </button>

                            <span className="w-8 text-center text-sm text-slate-700">
                              {currentQty}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                const updatedAddons =
                                  formData.addons_items
                                    .filter(
                                      a =>
                                        a.id !== item.id
                                    )
                                    .concat({
                                      id: item.id,
                                      quantity:
                                        currentQty + 1
                                    })

                                setFormData({
                                  ...formData,
                                  addons_items:
                                    updatedAddons
                                })
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-sm"
                            >
                              +
                            </button>

                          </div>
                        </div>
                      )
                    })
                  )}

                </div>

                {formData.addons_items.length > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      Add-ons Total:
                    </span>

                    <span className="font-medium text-slate-900">
                      ₱{addonsTotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PRICE SUMMARY */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  Base Price:
                </span>

                <span className="text-slate-900">
                  ₱
                  {(
                    parseFloat(
                      formData.base_price
                    ) || 0
                  ).toFixed(2)}
                </span>
              </div>

              {formData.is_complimentary && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    Complimentary Surcharge:
                  </span>

                  <span className="text-slate-900">
                    ₱200.00
                  </span>
                </div>
              )}

              {orderTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    Order Total:
                  </span>

                  <span className="text-slate-900">
                    ₱{orderTotal.toFixed(2)}
                  </span>
                </div>
              )}

              {formData.is_addons &&
                addonsTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      Add-ons Total:
                    </span>

                    <span className="text-slate-900">
                      ₱{addonsTotal.toFixed(2)}
                    </span>
                  </div>
                )}

              <div className="flex justify-between text-sm font-medium border-t border-slate-200 pt-2">
                <span className="text-slate-900">
                  Total Price:
                </span>

                <span className="text-yellow-600">
                  ₱{totalPrice.toFixed(2)}
                </span>
              </div>

            </div>
          </div>
        )}

        {/* ERROR */}
        {modalError && (
          <p className="text-xs text-rose-600 flex items-center gap-1">
            <AlertCircle size={12} />
            {modalError}
          </p>
        )}

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-2 pt-1">

          {isEditing ? (
            <button
              onClick={handleSaveClick}
              disabled={!hasChanges || saving}
              className="py-2.5 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-black font-medium transition-all duration-200"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          ) : (
            canEdit &&
            viewTarget.status !== 'Checked Out' && (
              <button
                onClick={() => {
                  setModalError('')
                  setRoomSearch('')
                  setRoomTypeFilter('All')
                  setIsEditing(true)
                }}
                className="py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-medium transition-all duration-200"
              >
                Edit
              </button>
            )
          )}

          {isEditing && (
            <button
              onClick={() => {
                resetFormData()
                setIsEditing(false)
              }}
              disabled={saving}
              className="py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all duration-200"
            >
              Cancel
            </button>
          )}

          {!isEditing &&
            viewTarget.status === 'Checked In' &&
            canManage && (
              <button
                onClick={handleCheckOutClick}
                disabled={checkingOut}
                className="py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200"
              >
                {checkingOut
                  ? 'Checking out…'
                  : 'Check Out'}
              </button>
            )}

        </div>
      </div>
    </>
  )
}


export default function CheckInOutPage({ bookings, rooms, currentUser, onCheckIn, onCheckOut, onUpdate, onDelete, onExtend, highlightedBookingId, onTimerEnd, menuItems, menuCategories }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [addOpen, setAddOpen] = useState(false)
  const [extendOpen, setExtendOpen] = useState(false)
  const [viewTarget, setViewTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [roomSearch, setRoomSearch] = useState('')
  const [roomTypeFilter, setRoomTypeFilter] = useState('All')
  const [formData, setFormData] = useState({
    room_id: '',
    guest_name: '',
    guest_contact: '',
    number_of_guests: '',
    base_price: '',
    notes: '',
    timer_duration: '',
    is_complimentary: false,
    complimentary_item_1: '',
    complimentary_item_2: '',
    is_order: false,
    is_addons: false,
    order_items: [],
    addons_items: []
  })
  const [extendFormData, setExtendFormData] = useState({
    booking_id: '',
    extend_hours: '',
    extra_price: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expiredTimers, setExpiredTimers] = useState(new Set())
  const highlightedRowRef = useRef(null)

  // Scroll to highlighted booking when highlightedBookingId changes
  useEffect(() => {
    if (highlightedBookingId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedBookingId])

  const handleTimerEnd = (bookingId) => {
    if (!expiredTimers.has(bookingId)) {
      setExpiredTimers(prev => new Set([...prev, bookingId]))
      
      // Call parent callback to update notification
      if (onTimerEnd) onTimerEnd(bookingId)
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Check-in Timer Expired', {
          body: 'The check-in timer has expired. Please follow up with the guest.',
          icon: '/favicon.ico'
        })
      }
    }
  }

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const availableRooms = rooms.filter(r => r.status === 'Available')

  const filteredAvailableRooms = availableRooms.filter(r => {
    const matchesSearch = r.room_number.toLowerCase().includes(roomSearch.toLowerCase())
    const matchesType = roomTypeFilter === 'All' || r.room_type === roomTypeFilter
    return matchesSearch && matchesType
  })

  const addonsCategory = menuCategories.find(c => c.name.toLowerCase() === 'add-ons')
  const addonsItems = addonsCategory 
    ? menuItems.filter(item => item.category_id === addonsCategory.id)
    : []
  const orderItems = menuItems.filter(item => item.category_id !== addonsCategory?.id)
  const complimentaryItems = menuItems.filter(item => item.category_id !== addonsCategory?.id)

  // Calculate order total price
  const orderTotal = useMemo(() => {
    return formData.order_items.reduce((total, order) => {
      const item = orderItems.find(i => i.id === order.id)
      return total + (item ? parseFloat(item.price) * order.quantity : 0)
    }, 0)
  }, [formData.order_items, orderItems])

  // Calculate addons total price
  const addonsTotal = useMemo(() => {
    return formData.addons_items.reduce((total, addon) => {
      const item = addonsItems.find(i => i.id === addon.id)
      return total + (item ? parseFloat(item.price) * addon.quantity : 0)
    }, 0)
  }, [formData.addons_items, addonsItems])

  // Calculate total price from base price + addons + complimentary surcharge + orders
  const totalPrice = useMemo(() => {
    const basePrice = parseFloat(formData.base_price) || 0
    const complimentarySurcharge = formData.is_complimentary ? 200 : 0
    return basePrice + addonsTotal + orderTotal + complimentarySurcharge
  }, [formData.base_price, formData.is_complimentary, addonsTotal, orderTotal])

  // Update price when calculation changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, price: totalPrice.toString() }))
  }, [totalPrice])

  const filtered = bookings
    .filter(b => {
      const matchesSearch = (b.guest_name || '').toLowerCase().includes(search.toLowerCase()) ||
                           (b.room_number || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date))

  function updateAddOnVisibility(updates) {
    setFormData(prev => {
      const next = { ...prev, ...updates }
      const hasParentSelection = Boolean(next.is_complimentary || next.is_order)

      if (!hasParentSelection) {
        return {
          ...next,
          is_addons: false,
          addons_items: []
        }
      }

      return next
    })
  }

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
      base_price: '',
      notes: '', // Notes field hidden for now but kept in state for compatibility
      timer_duration: '',
      is_complimentary: false,
      complimentary_item_1: '',
      complimentary_item_2: '',
      is_order: false,
      is_addons: false,
      order_items: [],
      addons_items: []
    })
    setError('')
    setAddOpen(true)
  }

  async function handleCheckIn(e) {
    e.preventDefault()
    if (loading) return
    if (!formData.room_id) { setError('Room is required.'); return }
    if (!formData.number_of_guests || formData.number_of_guests <= 0) { setError('Number of guests must be greater than 0.'); return }
    if (!formData.base_price || parseFloat(formData.base_price) < 0) { setError('Base price is required and cannot be negative.'); return }
    if (!formData.timer_duration || formData.timer_duration <= 0) { setError('Timer duration must be greater than 0.'); return }
    if (formData.is_complimentary && !formData.complimentary_item_1 && !formData.complimentary_item_2) { 
      setError('Please select at least one complimentary item.'); return 
    }
    if (formData.is_addons && formData.addons_items.filter(item => item.quantity > 0).length === 0) {
      setError('Please select at least one add-on item with quantity.'); return
    }
    if (formData.is_order && formData.order_items.filter(item => item.quantity > 0).length === 0) {
      setError('Please select at least one ordered item with quantity.'); return
    }
    setLoading(true)
    try {
      // Convert hours to minutes for the backend
      const formDataInMinutes = {
        room_id: formData.room_id,
        guest_name: formData.guest_name,
        guest_contact: formData.guest_contact,
        number_of_guests: formData.number_of_guests,
        price: totalPrice.toString(), // Use the calculated total price
        notes: '', // Notes field hidden for now, sending empty string
        timer_duration: Math.round(parseFloat(formData.timer_duration) * 60),
        is_complimentary: Boolean(formData.is_complimentary),
        complimentary_item_1: formData.complimentary_item_1 ? parseInt(formData.complimentary_item_1) : null,
        complimentary_item_2: formData.complimentary_item_2 ? parseInt(formData.complimentary_item_2) : null,
        is_order: Boolean(formData.is_order),
        order_items: formData.order_items.filter(item => item.quantity > 0),
        is_addons: Boolean(formData.is_addons),
        addons_items: formData.addons_items.filter(item => item.quantity > 0)
      }
      await onCheckIn(formDataInMinutes)
      setFormData({
        room_id: '',
        guest_name: '',
        guest_contact: '',
        number_of_guests: '',
        base_price: '',
        notes: '',
        timer_duration: '',
        is_complimentary: false,
        complimentary_item_1: '',
        complimentary_item_2: '',
        is_order: false,
        is_addons: false,
        order_items: [],
        addons_items: []
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
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 shadow-md mb-5 sm:mb-6 -mx-4 sm:mx-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-sm text-slate-500 mt-0.5">{bookings.length} bookings total</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-row gap-3">
              <div className="relative flex-[2]">
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
                className="flex-1 max-w-32 px-4 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="All">All Status</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
              </select>
            </div>
            {canManage && (
              <div className="flex flex-row gap-3">
                <button
                  onClick={() => setExtendOpen(true)}
                  className="flex-1 group flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/25 text-white px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200"
                >
                  <ClockPlus size={16} className="group-hover:scale-110 transition-transform" /> Extend
                </button>
                <button
                  onClick={openAdd}
                  className="flex-1 group flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 hover:shadow-lg hover:shadow-yellow-500/25 text-black px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-all duration-200"
                >
                  <LogIn size={16} className="group-hover:scale-110 transition-transform" /> Check In
                </button>
              </div>
            )}
          </div>
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
                <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Timer</th>
                {canManage && <th className="w-32 px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    {search ? 'No bookings match your search.' : 'No bookings yet.'}
                  </td>
                </tr>
              )}
              {filtered.map((booking) => (
                <tr
                  key={booking.id}
                  ref={booking.id === highlightedBookingId ? highlightedRowRef : null}
                  className={`hover:bg-slate-50 transition-all ${booking.id === highlightedBookingId ? 'ring-2 ring-yellow-400 ring-inset shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''}`}
                >
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
                  <td className="w-28 px-4 py-3.5">
                    {booking.status === 'Checked In' && booking.check_in_date ? (
                      <CountdownTimer checkInDate={booking.check_in_date} durationMinutes={booking.timer_duration || 30} onTimerEnd={() => handleTimerEnd(booking.id)} />
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
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
          <div
            key={booking.id}
            ref={booking.id === highlightedBookingId ? highlightedRowRef : null}
            className={`bg-white rounded-xl border border-slate-200 p-4 transition-all ${booking.id === highlightedBookingId ? 'ring-2 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : ''}`}
          >
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
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Users size={14} className="text-slate-400" />
                <span className="text-slate-600">{booking.number_of_guests} guests</span>
              </div>
              <div className="flex items-center gap-2 text-sm justify-end">
                <span className="text-slate-400">₱</span>
                <span className="text-slate-600">{Number(booking.price).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-600">{formatDate(booking.check_in_date)}</span>
              </div>
              {booking.status === 'Checked In' && booking.check_in_date && (
                <div className="flex items-center gap-2 text-sm justify-end">
                  <CountdownTimer checkInDate={booking.check_in_date} durationMinutes={booking.timer_duration || 30} onTimerEnd={() => handleTimerEnd(booking.id)} />
                </div>
              )}
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
                <div className="flex flex-row gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={roomSearch}
                      onChange={e => setRoomSearch(e.target.value)}
                      placeholder="Search rooms…"
                      className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 w-full"
                    />
                  </div>
                  <select
                    value={roomTypeFilter}
                    onChange={e => setRoomTypeFilter(e.target.value)}
                    className="px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="All">All Types</option>
                    <option value="Standard">Standard</option>
                    <option value="Family">Family</option>
                    <option value="Barkada">Barkada</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {filteredAvailableRooms.length === 0 ? (
                    <p className="text-sm text-slate-400 col-span-2 text-center py-4">No available rooms match your search</p>
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
              <div className="grid grid-cols-[auto_1fr_1fr] gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Guests</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.number_of_guests}
                    onChange={e => setFormData({ ...formData, number_of_guests: e.target.value })}
                    placeholder="1"
                    className="w-20 px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Timer (hours)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.timer_duration}
                    onChange={e => setFormData({ ...formData, timer_duration: e.target.value })}
                    placeholder="0.5"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Base Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
              </div>
              {/* Notes field hidden for now
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
              */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_complimentary}
                    onChange={e => updateAddOnVisibility({ is_complimentary: e.target.checked })}
                    className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-slate-700">Complimentary</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_order}
                    onChange={e => updateAddOnVisibility({ is_order: e.target.checked, order_items: e.target.checked ? formData.order_items : [] })}
                    className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm text-slate-700">Order</span>
                </label>
              </div>
              {formData.is_complimentary && (
                <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  <Info size={12} />
                  <span>Additional ₱200 charge added</span>
                </div>
              )}
              {formData.is_complimentary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Complimentary Item 1</label>
                    <select
                      value={formData.complimentary_item_1}
                      onChange={e => setFormData({ ...formData, complimentary_item_1: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      {!formData.complimentary_item_1 && <option value="">Select item</option>}
                      {complimentaryItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Complimentary Item 2</label>
                    <select
                      value={formData.complimentary_item_2}
                      onChange={e => setFormData({ ...formData, complimentary_item_2: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    >
                      {!formData.complimentary_item_2 && <option value="">Select item</option>}
                      {complimentaryItems.map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              {formData.is_order && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Order Items</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {orderItems.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-2">No menu items available for order</p>
                    ) : (
                      orderItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-700">{item.name}</span>
                            <span className="text-xs text-slate-400 ml-2">₱{parseFloat(item.price).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = formData.order_items.find(a => a.id === item.id)?.quantity || 0
                                if (currentQty > 0) {
                                  const updatedOrder = formData.order_items
                                    .filter(a => a.id !== item.id)
                                    .concat({ id: item.id, quantity: currentQty - 1 })
                                    .filter(a => a.quantity > 0)
                                  setFormData({ ...formData, order_items: updatedOrder })
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-sm"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm text-slate-700">
                              {formData.order_items.find(a => a.id === item.id)?.quantity || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = formData.order_items.find(a => a.id === item.id)?.quantity || 0
                                const updatedOrder = formData.order_items
                                  .filter(a => a.id !== item.id)
                                  .concat({ id: item.id, quantity: currentQty + 1 })
                                setFormData({ ...formData, order_items: updatedOrder })
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {formData.order_items.length > 0 && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Order Total:</span>
                      <span className="font-medium text-slate-900">₱{orderTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              {(formData.is_complimentary || formData.is_order) && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_addons}
                      onChange={e => setFormData(prev => ({ ...prev, is_addons: e.target.checked, addons_items: e.target.checked ? prev.addons_items : [] }))}
                      className="w-4 h-4 text-yellow-500 border-slate-300 rounded focus:ring-yellow-500"
                    />
                    <span className="text-sm text-slate-700">Add-ons</span>
                  </label>
                </div>
              )}
              {formData.is_addons && (formData.is_complimentary || formData.is_order) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Add-ons Items</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {addonsItems.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-2">No add-ons available</p>
                    ) : (
                      addonsItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-700">{item.name}</span>
                            <span className="text-xs text-slate-400 ml-2">₱{parseFloat(item.price).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = formData.addons_items.find(a => a.id === item.id)?.quantity || 0
                                if (currentQty > 0) {
                                  const updatedAddons = formData.addons_items
                                    .filter(a => a.id !== item.id)
                                    .concat({ id: item.id, quantity: currentQty - 1 })
                                    .filter(a => a.quantity > 0)
                                  setFormData({ ...formData, addons_items: updatedAddons })
                                }
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-sm"
                            >
                              -
                            </button>
                            <span className="w-8 text-center text-sm text-slate-700">
                              {formData.addons_items.find(a => a.id === item.id)?.quantity || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = formData.addons_items.find(a => a.id === item.id)?.quantity || 0
                                const updatedAddons = formData.addons_items
                                  .filter(a => a.id !== item.id)
                                  .concat({ id: item.id, quantity: currentQty + 1 })
                                setFormData({ ...formData, addons_items: updatedAddons })
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-600 text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {formData.addons_items.length > 0 && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600">Add-ons Total:</span>
                      <span className="font-medium text-slate-900">
                        ₱{addonsTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Base Price:</span>
                  <span className="text-slate-900">₱{(parseFloat(formData.base_price) || 0).toFixed(2)}</span>
                </div>
                {formData.is_complimentary && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Complimentary Surcharge:</span>
                    <span className="text-slate-900">₱200.00</span>
                  </div>
                )}
                {formData.is_order && orderTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Order Total:</span>
                    <span className="text-slate-900">₱{orderTotal.toFixed(2)}</span>
                  </div>
                )}
                {formData.is_addons && addonsTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Add-ons Total:</span>
                    <span className="text-slate-900">₱{addonsTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-medium border-t border-slate-200 pt-2">
                  <span className="text-slate-900">Total Price:</span>
                  <span className="text-yellow-600">₱{totalPrice.toFixed(2)}</span>
                </div>
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
            menuItems={menuItems}
            menuCategories={menuCategories}
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

      {/* Extend Time Modal */}
      {extendOpen && (
        <Modal title="Extend Booking Time" onClose={() => setExtendOpen(false)}>
          <ExtendTimeModal
            bookings={bookings}
            rooms={rooms}
            onClose={() => setExtendOpen(false)}
            onExtend={onExtend}
          />
        </Modal>
      )}
    </div>
  )
}