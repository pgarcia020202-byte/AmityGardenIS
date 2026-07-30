import { useState } from 'react'
import { Package, Tag, Archive, ShoppingBag, AlertTriangle, XCircle, TrendingUp, Clock, Bed, Users, Calendar, DoorOpen } from 'lucide-react'

function getProductStatus(product) {
  if (product.current_stock === 0) return 'Out of Stock'
  if (product.current_stock <= product.min_stock) return 'Low Stock'
  return 'In Stock'
}

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function formatCurrency(n) {
  return '₱' + parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })
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

export default function Dashboard({ categories, products, sales, stockLogs, rooms, bookings, onNavigate }) {
  const [activeTab, setActiveTab] = useState('store')

  const totalStock = products.reduce((s, p) => s + p.current_stock, 0)
  const totalSold = products.reduce((s, p) => s + p.total_sold, 0)
  const lowStock = products.filter(p => getProductStatus(p) === 'Low Stock').length
  const outOfStock = products.filter(p => getProductStatus(p) === 'Out of Stock').length

  // Hotel stats
  const totalRooms = rooms.length
  const availableRooms = rooms.filter(r => r.status === 'Available').length
  const occupiedRooms = rooms.filter(r => r.status === 'Occupied').length
  const cleaningRooms = rooms.filter(r => r.status === 'Cleaning').length
  const checkedInBookings = bookings.filter(b => b.status === 'Checked In').length
  const checkedOutBookings = bookings.filter(b => b.status === 'Checked Out').length
  const todayHotelRevenue = bookings
    .filter(b => {
      const d = new Date(b.check_in_date)
      const now = new Date()
      // Convert to Philippines timezone using proper timezone conversion
      const dPH = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      const nowPH = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      return dPH.toDateString() === nowPH.toDateString()
    })
    .reduce((s, b) => s + parseFloat(b.price || 0), 0)

  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  const recentLogs = [...stockLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

  const todaySales = sales.filter(s => {
    const d = new Date(s.date)
    const now = new Date()
    // Convert to Philippines timezone using proper timezone conversion
    const dPH = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const nowPH = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    return dPH.toDateString() === nowPH.toDateString()
  })
  const todayRevenue = todaySales.reduce((s, sale) => s + parseFloat(sale.total || 0), 0)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('store')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'store'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Store Management
        </button>
        <button
          onClick={() => setActiveTab('hotel')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === 'hotel'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hotel Management
        </button>
      </div>

      {activeTab === 'store' ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <StatCard
            icon={<Package size={18} className="text-violet-600" />}
            label="Total Products"
            value={products.length}
            color="bg-violet-50"
          />
          <StatCard
            icon={<Tag size={18} className="text-sky-600" />}
            label="Categories"
            value={categories.length}
            color="bg-sky-50"
          />
          <StatCard
            icon={<Archive size={18} className="text-yellow-600" />}
            label="Total Stock"
            value={totalStock.toLocaleString()}
            color="bg-yellow-50"
            sub="products on hand"
          />
          <StatCard
            icon={<ShoppingBag size={18} className="text-indigo-600" />}
            label="Total Sold"
            value={totalSold.toLocaleString()}
            color="bg-indigo-50"
            sub="products all-time"
          />
          <StatCard
            icon={<AlertTriangle size={18} className="text-amber-600" />}
            label="Low Stock"
            value={lowStock}
            color="bg-amber-50"
            sub="products"
          />
          <StatCard
            icon={<XCircle size={18} className="text-rose-600" />}
            label="Out of Stock"
            value={outOfStock}
            color="bg-rose-50"
            sub="products"
          />
        </div>

        {/* Today's summary */}
        <div className="bg-gradient-to-r from-black to-yellow-600 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-yellow-100 text-xs sm:text-sm font-medium">Today's Revenue</p>
            <p className="text-white text-2xl sm:text-3xl font-bold font-mono mt-1 truncate">{formatCurrency(todayRevenue)}</p>
            <p className="text-yellow-200 text-xs sm:text-sm mt-1">{todaySales.length} transaction{todaySales.length !== 1 ? 's' : ''} today</p>
          </div>
          <TrendingUp size={36} className="text-yellow-300 opacity-60 shrink-0 sm:w-12 sm:h-12" />
        </div>

        {/* Recent activity */}
        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Sales */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-indigo-500" />
                <h2 className="text-sm font-semibold text-slate-900">Recent Sales</h2>
              </div>
              <button
                onClick={() => onNavigate('sales')}
                className="text-xs text-yellow-600 hover:text-yellow-700 font-medium shrink-0"
              >
                View all →
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {recentSales.length === 0 && (
                <p className="px-5 py-8 text-sm text-slate-400 text-center">No sales yet</p>
              )}
              {recentSales.map(sale => (
                <div key={sale.id} className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag size={13} className="text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{sale.user_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {sale.items.length} item{sale.items.length !== 1 ? 's' : ''} — {sale.items.map(i => i.productName).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900 font-mono">{formatCurrency(sale.total)}</p>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <Clock size={10} className="text-slate-400" />
                      <p className="text-xs text-slate-400">{relTime(sale.date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Stock Logs */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Archive size={16} className="text-yellow-500" />
                <h2 className="text-sm font-semibold text-slate-900">Recent Stock Activity</h2>
              </div>
              <button
                onClick={() => onNavigate('stock-logs')}
                className="text-xs text-yellow-600 hover:text-yellow-700 font-medium shrink-0"
              >
                View all →
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {recentLogs.length === 0 && (
                <p className="px-5 py-8 text-sm text-slate-400 text-center">No activity yet</p>
              )}
              {recentLogs.map(log => (
                <div key={log.id} className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      log.type === 'Stock In' ? 'bg-green-50' :
                      log.type === 'Sale' ? 'bg-rose-50' : 'bg-amber-50'
                    }`}>
                      <Archive size={13} className={
                        log.type === 'Stock In' ? 'text-green-500' :
                        log.type === 'Sale' ? 'text-rose-500' : 'text-amber-500'
                      } />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{log.product_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{log.type}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-semibold font-mono ${
                      log.qty_changed > 0 ? 'text-green-600' : 'text-rose-600'
                    }`}>
                      {log.qty_changed > 0 ? '+' : ''}{log.qty_changed}
                    </span>
                    <div className="flex items-center gap-1 justify-end mt-0.5">
                      <Clock size={10} className="text-slate-400" />
                      <p className="text-xs text-slate-400">{relTime(log.date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Low/out of stock quick view */}
        {(lowStock > 0 || outOfStock > 0) && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-900">Attention Required</h2>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs text-yellow-600 hover:text-yellow-700 font-medium shrink-0"
              >
                Manage products →
              </button>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products
                .filter(p => getProductStatus(p) !== 'In Stock')
                .sort((a, b) => a.current_stock - b.current_stock)
                .slice(0, 6)
                .map(p => {
                  const status = getProductStatus(p)
                  return (
                    <div key={p.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border ${
                      status === 'Out of Stock' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'
                    }`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                        <p className={`text-xs font-medium mt-0.5 ${
                          status === 'Out of Stock' ? 'text-rose-600' : 'text-amber-600'
                        }`}>{status}</p>
                      </div>
                      <span className={`text-sm font-bold font-mono shrink-0 ${
                        status === 'Out of Stock' ? 'text-rose-600' : 'text-amber-600'
                      }`}>{p.current_stock}</span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Hotel Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <StatCard
              icon={<Bed size={18} className="text-sky-600" />}
              label="Total Rooms"
              value={totalRooms}
              color="bg-sky-50"
            />
            <StatCard
              icon={<DoorOpen size={18} className="text-emerald-600" />}
              label="Available"
              value={availableRooms}
              color="bg-emerald-50"
              sub="rooms ready"
            />
            <StatCard
              icon={<Users size={18} className="text-indigo-600" />}
              label="Occupied"
              value={occupiedRooms}
              color="bg-indigo-50"
              sub="rooms in use"
            />
            <StatCard
              icon={<Archive size={18} className="text-amber-600" />}
              label="Cleaning"
              value={cleaningRooms}
              color="bg-amber-50"
              sub="rooms"
            />
            <StatCard
              icon={<Calendar size={18} className="text-violet-600" />}
              label="Checked In"
              value={checkedInBookings}
              color="bg-violet-50"
              sub="active guests"
            />
            <StatCard
              icon={<Clock size={18} className="text-rose-600" />}
              label="Checked Out"
              value={checkedOutBookings}
              color="bg-rose-50"
              sub="completed"
            />
          </div>

          {/* Today's Hotel Revenue */}
          <div className="bg-gradient-to-r from-black to-sky-600 rounded-xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sky-100 text-xs sm:text-sm font-medium">Today's Hotel Revenue</p>
              <p className="text-white text-2xl sm:text-3xl font-bold font-mono mt-1 truncate">{formatCurrency(todayHotelRevenue)}</p>
              <p className="text-sky-200 text-xs sm:text-sm mt-1">From check-ins today</p>
            </div>
            <TrendingUp size={36} className="text-sky-300 opacity-60 shrink-0 sm:w-12 sm:h-12" />
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-violet-500" />
                <h2 className="text-sm font-semibold text-slate-900">Recent Bookings</h2>
              </div>
              <button
                onClick={() => onNavigate('check-in-out')}
                className="text-xs text-yellow-600 hover:text-yellow-700 font-medium shrink-0"
              >
                View all →
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {bookings.length === 0 && (
                <p className="px-5 py-8 text-sm text-slate-400 text-center">No bookings yet</p>
              )}
              {[...bookings]
                .sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date))
                .slice(0, 5)
                .map(booking => (
                  <div key={booking.id} className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-sky-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Bed size={13} className="text-sky-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{booking.guest_name || 'Guest'}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          Room {booking.room_number} — {booking.number_of_guests} guest{booking.number_of_guests !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded border ${
                        booking.status === 'Checked In' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        booking.status === 'Checked Out' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {booking.status}
                      </span>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <Clock size={10} className="text-slate-400" />
                        <p className="text-xs text-slate-400">{relTime(booking.check_in_date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}