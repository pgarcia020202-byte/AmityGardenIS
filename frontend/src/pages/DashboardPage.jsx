import { Package, Tag, Archive, ShoppingBag, AlertTriangle, XCircle, TrendingUp, Clock } from 'lucide-react'

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
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function Dashboard({ categories, products, sales, stockLogs, onNavigate }) {
  const totalStock = products.reduce((s, p) => s + p.current_stock, 0)
  const totalSold = products.reduce((s, p) => s + p.total_sold, 0)
  const lowStock = products.filter(p => getProductStatus(p) === 'Low Stock').length
  const outOfStock = products.filter(p => getProductStatus(p) === 'Out of Stock').length

  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  const recentLogs = [...stockLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)

  const todaySales = sales.filter(s => {
    const d = new Date(s.date)
    const now = new Date()
    // Convert to Philippines timezone (Asia/Manila, UTC+8)
    const phOffset = 8 * 60 * 60 * 1000 // 8 hours in milliseconds
    const dPH = new Date(d.getTime() + phOffset)
    const nowPH = new Date(now.getTime() + phOffset)
    return dPH.toDateString() === nowPH.toDateString()
  })
  const todayRevenue = todaySales.reduce((s, sale) => s + parseFloat(sale.total || 0), 0)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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
  )
}