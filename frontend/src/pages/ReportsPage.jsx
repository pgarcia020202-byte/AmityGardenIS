import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Package, ShoppingBag, Calendar, Download } from 'lucide-react'

const COLORS = ['#eab308', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

function getRangeDays(range) {
  if (range === 'today') return 1
  if (range === 'yesterday') return 1
  if (range === '7d') return 7
  if (range === '30d') return 30
  return 7
}

function getRangeStart(range) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  if (range === 'today') {
    return now
  }
  if (range === 'yesterday') {
    const date = new Date(now)
    date.setDate(date.getDate() - 1)
    return date
  }
  if (range === '7d') {
    const date = new Date(now)
    date.setDate(date.getDate() - 7)
    return date
  }
  if (range === '30d') {
    const date = new Date(now)
    date.setDate(date.getDate() - 30)
    return date
  }
  if (range === 'thisMonth') {
    const date = new Date(now.getFullYear(), now.getMonth(), 1)
    return date
  }
  if (range === 'lastMonth') {
    const date = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return date
  }
  if (range === 'thisYear') {
    const date = new Date(now.getFullYear(), 0, 1)
    return date
  }
  
  // Default to 7 days
  const date = new Date(now)
  date.setDate(date.getDate() - 7)
  return date
}

function getRangeEnd(range) {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  
  if (range === 'yesterday') {
    const date = new Date(now)
    date.setDate(date.getDate() - 1)
    return date
  }
  if (range === 'lastMonth') {
    const date = new Date(now.getFullYear(), now.getMonth(), 0)
    return date
  }
  
  return now
}

function formatCurrency(n) {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function truncateLabel(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

// Tracks whether we're below the sm breakpoint so charts can drop label
// width, tick counts, and legend layout instead of squeezing everything in.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

export default function Reports({ products, sales, categories }) {
  const [timeRange, setTimeRange] = useState('7d')
  const isMobile = useIsMobile()

  const rangeDays = getRangeDays(timeRange)

  const filteredSales = useMemo(() => {
    const start = getRangeStart(timeRange)
    const end = getRangeEnd(timeRange)
    return sales.filter(s => {
      const saleDate = new Date(s.date)
      return saleDate >= start && saleDate <= end
    })
  }, [sales, timeRange])

  const salesByCategory = useMemo(() => {
    return categories
      .map(cat => {
        const categorySales = filteredSales.reduce((total, sale) => {
          const categoryItems = sale.items.filter(item => {
            const product = products.find(p => p.id === item.productId)
            return product?.category_id === cat.id
          })
          return total + categoryItems.reduce((sum, item) => sum + item.subtotal, 0)
        }, 0)
        return { name: cat.name, value: categorySales }
      })
      .filter(item => item.value > 0)
  }, [categories, filteredSales, products])

  const topProducts = useMemo(() => {
    const soldByProduct = new Map()
    for (const sale of filteredSales) {
      for (const item of sale.items) {
        soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + item.qty)
      }
    }

    return [...products]
      .map(p => ({
        name: p.name,
        sold: soldByProduct.get(p.id) ?? 0,
        revenue: (soldByProduct.get(p.id) ?? 0) * p.price,
      }))
      .filter(p => p.sold > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10)
  }, [products, filteredSales])

  const salesOverTime = useMemo(() => {
    // Hourly data for today and yesterday
    if (timeRange === 'today' || timeRange === 'yesterday') {
      const baseDate = timeRange === 'today' ? new Date() : new Date(new Date().setDate(new Date().getDate() - 1))
      baseDate.setHours(0, 0, 0, 0)
      
      return Array.from({ length: 24 }, (_, i) => {
        const hourStart = new Date(baseDate)
        hourStart.setHours(i, 0, 0, 0)
        const hourEnd = new Date(hourStart)
        hourEnd.setHours(i + 1, 0, 0, 0)

        const hourSales = filteredSales.filter(s => {
          const saleDate = new Date(s.date)
          return saleDate >= hourStart && saleDate < hourEnd
        })

        const hourLabel = i === 0 ? '12AM' : i < 12 ? `${i}AM` : i === 12 ? '12PM' : `${i - 12}PM`

        return {
          date: hourLabel,
          sales: hourSales.reduce((sum, s) => sum + s.total, 0),
        }
      })
    }

    // Weekly data for this month and last month
    if (timeRange === 'thisMonth' || timeRange === 'lastMonth') {
      const start = getRangeStart(timeRange)
      const end = getRangeEnd(timeRange)
      const weeks = []
      
      let currentWeekStart = new Date(start)
      let weekNum = 1
      
      while (currentWeekStart < end) {
        const currentWeekEnd = new Date(currentWeekStart)
        currentWeekEnd.setDate(currentWeekEnd.getDate() + 7)
        if (currentWeekEnd > end) currentWeekEnd.setTime(end.getTime())
        
        const weekSales = filteredSales.filter(s => {
          const saleDate = new Date(s.date)
          return saleDate >= currentWeekStart && saleDate < currentWeekEnd
        })
        
        weeks.push({
          date: `Week ${weekNum}`,
          sales: weekSales.reduce((sum, s) => sum + s.total, 0),
        })
        
        currentWeekStart = new Date(currentWeekEnd)
        weekNum++
      }
      
      return weeks
    }

    // Monthly data for this year
    if (timeRange === 'thisYear') {
      const months = []
      const currentYear = new Date().getFullYear()
      
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1)
        const monthEnd = new Date(currentYear, month + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        
        const monthSales = filteredSales.filter(s => {
          const saleDate = new Date(s.date)
          return saleDate >= monthStart && saleDate <= monthEnd
        })
        
        const monthName = monthStart.toLocaleDateString('en-PH', { month: 'short' })
        
        months.push({
          date: monthName,
          sales: monthSales.reduce((sum, s) => sum + s.total, 0),
        })
      }
      
      return months
    }

    // Daily data for 7d, 30d
    const start = getRangeStart(timeRange)
    const end = getRangeEnd(timeRange)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    
    return Array.from({ length: daysDiff }, (_, i) => {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      date.setHours(0, 0, 0, 0)
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)

      const daySales = filteredSales.filter(s => {
        const saleDate = new Date(s.date)
        return saleDate >= date && saleDate < nextDay
      })

      return {
        date: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        sales: daySales.reduce((sum, s) => sum + s.total, 0),
      }
    })
  }, [filteredSales, timeRange])

  const stockStatus = [
    { name: 'In Stock', value: products.filter(p => p.current_stock > p.min_stock).length },
    { name: 'Low Stock', value: products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock).length },
    { name: 'Out of Stock', value: products.filter(p => p.current_stock === 0).length },
  ].filter(item => item.value > 0)

  const totalRevenue = filteredSales.reduce((sum, s) => sum + parseFloat(s.total), 0)
  const totalUnitsSold = filteredSales.reduce(
    (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.qty, 0),
    0,
  )
  const totalStockValue = products.reduce((sum, p) => sum + p.current_stock * parseFloat(p.price), 0)

  function handleExport() {
    const rows = [
      ['Date', 'Cashier', 'Items', 'Total (PHP)'],
      ...filteredSales.map(s => [
        new Date(s.date).toLocaleString('en-PH'),
        s.user_name,
        s.items.map(i => `${i.productName} x${i.qty}`).join('; '),
        parseFloat(s.total).toFixed(2),
      ]),
    ]

    const csv = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `storetrack-sales-${timeRange}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-sm text-slate-500 mt-0.5">Analytics and insights</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 sm:py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
          </select>
          <button
            onClick={handleExport}
            disabled={filteredSales.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 sm:py-2 rounded-lg text-sm text-slate-600"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-slate-900 font-mono truncate">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <ShoppingBag size={18} className="text-violet-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Products Sold</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-slate-900 font-mono truncate">{totalUnitsSold.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
              <Package size={18} className="text-sky-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Stock Value</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-slate-900 font-mono truncate">{formatCurrency(totalStockValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Transactions</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-slate-900 font-mono truncate">{filteredSales.length}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            {timeRange === 'today' && 'Sales Trend (Today)'}
            {timeRange === 'yesterday' && 'Sales Trend (Yesterday)'}
            {timeRange === '7d' && 'Sales Trend (Last 7 Days)'}
            {timeRange === '30d' && 'Sales Trend (Last 30 Days)'}
            {timeRange === 'thisMonth' && 'Sales Trend (This Month)'}
            {timeRange === 'lastMonth' && 'Sales Trend (Last Month)'}
            {timeRange === 'thisYear' && 'Sales Trend (This Year)'}
          </h3>
          <ResponsiveContainer width="100%" height={isMobile ? 220 : 250}>
            <LineChart data={salesOverTime} margin={isMobile ? { left: -20, right: 5 } : undefined}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                interval={
                  timeRange === 'today' || timeRange === 'yesterday' ? (isMobile ? 5 : 3) :
                  timeRange === '30d' ? 4 :
                  timeRange === 'thisMonth' || timeRange === 'lastMonth' ? 0 :
                  timeRange === 'thisYear' ? 0 :
                  isMobile ? Math.ceil(salesOverTime.length / 4) - 1 : 0
                }
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 40 : 60}
                tickFormatter={value => isMobile ? Math.round(value / 1000) + 'k' : '₱' + value}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
              />
              <Line type="monotone" dataKey="sales" stroke="#eab308" strokeWidth={2} dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Sales by Category</h3>
          {salesByCategory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">No sales in this period</p>
          ) : (
            <ResponsiveContainer width="100%" height={isMobile ? 260 : 250}>
              <PieChart>
                <Pie
                  data={salesByCategory}
                  cx="50%"
                  cy={isMobile ? '40%' : '50%'}
                  innerRadius={isMobile ? 45 : 60}
                  outerRadius={isMobile ? 70 : 90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {salesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  layout={isMobile ? 'horizontal' : 'horizontal'}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Selling Products</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">No product sales in this period</p>
        ) : (
          <ResponsiveContainer width="100%" height={isMobile ? 280 : 300}>
            <BarChart data={topProducts} layout="vertical" margin={isMobile ? { left: -10 } : undefined}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 76 : 120}
                tickFormatter={value => truncateLabel(value, isMobile ? 10 : 18)}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value, name) => [
                  name === 'sold' ? (Number(value) || 0) : formatCurrency(Number(value) || 0),
                  name === 'sold' ? 'Products Sold' : 'Revenue',
                ]}
                labelFormatter={label => label}
              />
              <Bar dataKey="sold" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Stock Status Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {stockStatus.map(status => (
            <div key={status.name} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">{status.name}</span>
                <div
                  className={`w-3 h-3 rounded-full shrink-0 ${
                    status.name === 'In Stock'
                      ? 'bg-yellow-500'
                      : status.name === 'Low Stock'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                />
              </div>
              <p className="text-2xl font-bold text-slate-900 font-mono">{status.value}</p>
              <p className="text-xs text-slate-400 mt-1">
                {products.length > 0 ? ((status.value / products.length) * 100).toFixed(1) : '0.0'}% of total
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}