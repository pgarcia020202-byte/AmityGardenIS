import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Package, ShoppingBag, Calendar, Bed, Users, DoorOpen, Clock } from 'lucide-react'
import { safeFormatCurrency, safeFormatDate } from '../utils/formatUtils'

const COLORS = ['#eab308', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4']

function getRangeDays(range) {
  if (range === 'today') return 1
  if (range === 'yesterday') return 1
  if (range === '7d') return 7
  if (range === '30d') return 30
  return 7
}

function toPhilippinesTime(date) {
  // Create a new date in Philippines timezone (UTC+8)
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
}

function getRangeStart(range) {
  const now = toPhilippinesTime(new Date())
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
  const now = toPhilippinesTime(new Date())
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
  return safeFormatCurrency(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

export default function Reports({ products, sales, categories, rooms, bookings }) {
  const [timeRange, setTimeRange] = useState('today')
  const [activeTab, setActiveTab] = useState('inventory')
  const isMobile = useIsMobile()

  const safeProducts = Array.isArray(products) ? products : []
  const safeSales = Array.isArray(sales) ? sales : []
  const safeCategories = Array.isArray(categories) ? categories : []

  const rangeDays = getRangeDays(timeRange)

  const filteredSales = useMemo(() => {
    const start = getRangeStart(timeRange)
    const end = getRangeEnd(timeRange)
    return safeSales.filter(s => {
      const saleDate = toPhilippinesTime(new Date(s.date))
      return saleDate >= start && saleDate <= end
    })
  }, [safeSales, timeRange])

  const salesByCategory = useMemo(() => {
    return safeCategories
      .map(cat => {
        const categorySales = filteredSales.reduce((total, sale) => {
          const saleItems = Array.isArray(sale?.items) ? sale.items : []
          const categoryItems = saleItems.filter(item => {
            const product = safeProducts.find(p => p.id === item.productId)
            return product?.category_id === cat.id
          })
          return total + categoryItems.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0)
        }, 0)
        return { name: cat.name, value: categorySales }
      })
      .filter(item => item.value > 0)
  }, [safeCategories, filteredSales, safeProducts])

  const topProducts = useMemo(() => {
    const soldByProduct = new Map()
    for (const sale of filteredSales) {
      const saleItems = Array.isArray(sale?.items) ? sale.items : []
      for (const item of saleItems) {
        soldByProduct.set(item.productId, (soldByProduct.get(item.productId) ?? 0) + (Number(item.qty) || 0))
      }
    }

    return [...safeProducts]
      .map(p => ({
        name: p.name,
        sold: soldByProduct.get(p.id) ?? 0,
        revenue: (soldByProduct.get(p.id) ?? 0) * (Number(p.price) || 0),
      }))
      .filter(p => p.sold > 0)
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10)
  }, [safeProducts, filteredSales])

  const salesOverTime = useMemo(() => {
    // Hourly data for today and yesterday
    if (timeRange === 'today' || timeRange === 'yesterday') {
      const baseDate = timeRange === 'today' ? toPhilippinesTime(new Date()) : toPhilippinesTime(new Date(new Date().setDate(new Date().getDate() - 1)))
      baseDate.setHours(0, 0, 0, 0)
      
      return Array.from({ length: 24 }, (_, i) => {
        const hourStart = new Date(baseDate)
        hourStart.setHours(i, 0, 0, 0)
        const hourEnd = new Date(hourStart)
        hourEnd.setHours(i + 1, 0, 0, 0)

        const hourSales = filteredSales.filter(s => {
          const saleDate = toPhilippinesTime(new Date(s.date))
          return saleDate >= hourStart && saleDate < hourEnd
        })

        const hourLabel = i === 0 ? '12AM' : i < 12 ? `${i}AM` : i === 12 ? '12PM' : `${i - 12}PM`

        return {
          date: hourLabel,
          sales: hourSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
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
          const saleDate = toPhilippinesTime(new Date(s.date))
          return saleDate >= currentWeekStart && saleDate < currentWeekEnd
        })
        
        weeks.push({
          date: `Week ${weekNum}`,
          sales: weekSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
        })
        
        currentWeekStart = new Date(currentWeekEnd)
        weekNum++
      }
      
      return weeks
    }

    // Monthly data for this year
    if (timeRange === 'thisYear') {
      const months = []
      const currentYear = toPhilippinesTime(new Date()).getFullYear()
      
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1)
        const monthEnd = new Date(currentYear, month + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        
        const monthSales = filteredSales.filter(s => {
          const saleDate = toPhilippinesTime(new Date(s.date))
          return saleDate >= monthStart && saleDate <= monthEnd
        })
        
        const monthName = safeFormatDate(monthStart, { month: 'short' })
        
        months.push({
          date: monthName,
          sales: monthSales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
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
        const saleDate = toPhilippinesTime(new Date(s.date))
        return saleDate >= date && saleDate < nextDay
      })

      return {
        date: safeFormatDate(date, { month: 'short', day: 'numeric' }),
        sales: daySales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
      }
    })
  }, [filteredSales, timeRange])

  const stockStatus = [
    { name: 'In Stock', value: products.filter(p => p.current_stock > p.min_stock).length },
    { name: 'Low Stock', value: products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock).length },
    { name: 'Out of Stock', value: products.filter(p => p.current_stock === 0).length },
  ].filter(item => item.value > 0)

  // Hotel stats
  const filteredBookings = useMemo(() => {
    const start = getRangeStart(timeRange)
    const end = getRangeEnd(timeRange)
    return bookings.filter(b => {
      const bookingDate = toPhilippinesTime(new Date(b.check_in_date))
      return bookingDate >= start && bookingDate <= end
    })
  }, [bookings, timeRange])

  const bookingsByRoomType = useMemo(() => {
    const roomTypeCounts = new Map()
    for (const booking of bookings) {
      const room = rooms.find(r => r.id === booking.room_id)
      if (room && room.room_type) {
        roomTypeCounts.set(room.room_type, (roomTypeCounts.get(room.room_type) || 0) + 1)
      }
    }
    return Array.from(roomTypeCounts.entries()).map(([name, value]) => ({ name, value }))
  }, [bookings, rooms])

  const roomStatus = [
    { name: 'Available', value: rooms.filter(r => r.status === 'Available').length },
    { name: 'Occupied', value: rooms.filter(r => r.status === 'Occupied').length },
    { name: 'Cleaning', value: rooms.filter(r => r.status === 'Cleaning').length },
    { name: 'Maintenance', value: rooms.filter(r => r.status === 'Maintenance').length },
  ].filter(item => item.value > 0)

  const bookingsOverTime = useMemo(() => {
    if (timeRange === 'today' || timeRange === 'yesterday') {
      const baseDate = timeRange === 'today' ? toPhilippinesTime(new Date()) : toPhilippinesTime(new Date(new Date().setDate(new Date().getDate() - 1)))
      baseDate.setHours(0, 0, 0, 0)
      
      return Array.from({ length: 24 }, (_, i) => {
        const hourStart = new Date(baseDate)
        hourStart.setHours(i, 0, 0, 0)
        const hourEnd = new Date(hourStart)
        hourEnd.setHours(i + 1, 0, 0, 0)

        const hourBookings = filteredBookings.filter(b => {
          const bookingDate = toPhilippinesTime(new Date(b.check_in_date))
          return bookingDate >= hourStart && bookingDate < hourEnd
        })

        const hourLabel = i === 0 ? '12AM' : i < 12 ? `${i}AM` : i === 12 ? '12PM' : `${i - 12}PM`

        return {
          date: hourLabel,
          bookings: hourBookings.length,
          revenue: hourBookings.reduce((sum, b) => sum + parseFloat(b.price || 0), 0),
        }
      })
    }

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

      const dayBookings = filteredBookings.filter(b => {
        const bookingDate = toPhilippinesTime(new Date(b.check_in_date))
        return bookingDate >= date && bookingDate < nextDay
      })

      return {
        date: safeFormatDate(date, { month: 'short', day: 'numeric' }),
        bookings: dayBookings.length,
        revenue: dayBookings.reduce((sum, b) => sum + parseFloat(b.price || 0), 0),
      }
    })
  }, [filteredBookings, timeRange])

  const hotelTotalRevenue = filteredBookings.reduce((sum, b) => sum + parseFloat(b.price || 0), 0)
  const hotelTotalBookings = filteredBookings.length
  const hotelAvgRevenue = hotelTotalBookings > 0 ? hotelTotalRevenue / hotelTotalBookings : 0

  const totalRevenue = filteredSales.reduce((sum, s) => sum + parseFloat(s.total), 0)
  const totalUnitsSold = filteredSales.reduce(
    (sum, s) => sum + s.items.reduce((itemSum, item) => itemSum + item.qty, 0),
    0,
  )
  const totalStockValue = products.reduce((sum, p) => sum + p.current_stock * parseFloat(p.price), 0)

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <style>{`
      .recharts-wrapper:focus,
      .recharts-wrapper *:focus,
      .recharts-surface:focus,
      .recharts-surface *:focus {
        outline: none !important;
      }
    `}</style>
      {/* Tab Switcher and Filter - Sticky */}
      <div className="sticky top-0 z-10 bg-white px-4 pb-4 space-y-4 shadow-md -mx-4 sm:mx-0">
        {/* Tab Switcher */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'inventory'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('hotel')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === 'hotel'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hotel
          </button>
        </div>

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
          </div>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} className="text-yellow-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</span>
              </div>
              <p className="text-base sm:text-2xl font-bold text-slate-900 font-mono truncate">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <ShoppingBag size={16} className="text-violet-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Products Sold</span>
              </div>
              <p className="text-base sm:text-2xl font-bold text-slate-900 font-mono truncate">{totalUnitsSold.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <Package size={16} className="text-sky-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Stock Value</span>
              </div>
              <p className="text-base sm:text-2xl font-bold text-slate-900 font-mono truncate">{formatCurrency(totalStockValue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Calendar size={16} className="text-amber-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Transactions</span>
              </div>
              <p className="text-base sm:text-2xl font-bold text-slate-900 font-mono truncate">{filteredSales.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4">
                {timeRange === 'today' && 'Sales Trend (Today)'}
                {timeRange === 'yesterday' && 'Sales Trend (Yesterday)'}
                {timeRange === '7d' && 'Sales Trend (Last 7 Days)'}
                {timeRange === '30d' && 'Sales Trend (Last 30 Days)'}
                {timeRange === 'thisMonth' && 'Sales Trend (This Month)'}
                {timeRange === 'lastMonth' && 'Sales Trend (Last Month)'}
                {timeRange === 'thisYear' && 'Sales Trend (This Year)'}
              </h3>
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 250}>
                <LineChart data={salesOverTime} margin={isMobile ? { left: -10, right: 5, top: 5, bottom: 5 } : undefined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={isMobile ? 10 : 11}
                    tickLine={false}
                    axisLine={false}
                    interval={
                      timeRange === 'today' || timeRange === 'yesterday' ? (isMobile ? 4 : 3) :
                      timeRange === '30d' ? 4 :
                      timeRange === 'thisMonth' || timeRange === 'lastMonth' ? 0 :
                      timeRange === 'thisYear' ? 0 :
                      isMobile ? Math.ceil(salesOverTime.length / 3) - 1 : 0
                    }
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={isMobile ? 10 : 11}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 45 : 60}
                    tickFormatter={value => isMobile ? (value >= 1000 ? (value / 1000).toFixed(1) + 'k' : '₱' + value) : '₱' + value}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [formatCurrency(Number(value) || 0), 'Revenue']}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#eab308" strokeWidth={isMobile ? 2 : 2} dot={{ fill: '#eab308', strokeWidth: 2, r: isMobile ? 3 : 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4">Sales by Category</h3>
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

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4">Top Selling Products</h3>
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-16">No product sales in this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 170}>
                <BarChart data={topProducts} layout="vertical" margin={isMobile ? { left: 1 } : undefined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#64748b"
                    fontSize={isMobile ? 10 : 11}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 90 : 120}
                    tickFormatter={value => truncateLabel(value, isMobile ? 12 : 18)}
                    interval={0}
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

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4">Stock Status Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              {stockStatus.map(status => (
                <div key={status.name} className="border border-slate-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-slate-700">{status.name}</span>
                    <div
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${
                        status.name === 'In Stock'
                          ? 'bg-yellow-500'
                          : status.name === 'Low Stock'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                    />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">{status.value}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
                    {products.length > 0 ? ((status.value / products.length) * 100).toFixed(1) : '0.0'}% of total
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Hotel Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
                  <TrendingUp size={16} className="text-sky-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</span>
              </div>
              <p className="text-base sm:text-2xl font-bold text-slate-900 font-mono truncate">{formatCurrency(hotelTotalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                  <Calendar size={16} className="text-violet-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Total Bookings</span>
              </div>
              <p className="text-base sm:text-2xl font-bold text-slate-900 font-mono truncate">{hotelTotalBookings}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-emerald-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Avg Revenue</span>
              </div>
              <p className="text-base sm:text-2xl font-bold text-slate-900 font-mono truncate">{formatCurrency(hotelAvgRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <Bed size={16} className="text-amber-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">Total Rooms</span>
              </div>
              <p className="text-base sm:text-2xl font-bold text-slate-900 font-mono truncate">{rooms.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4">
                {timeRange === 'today' && 'Bookings Trend (Today)'}
                {timeRange === 'yesterday' && 'Bookings Trend (Yesterday)'}
                {timeRange === '7d' && 'Bookings Trend (Last 7 Days)'}
                {timeRange === '30d' && 'Bookings Trend (Last 30 Days)'}
                {timeRange === 'thisMonth' && 'Bookings Trend (This Month)'}
                {timeRange === 'lastMonth' && 'Bookings Trend (Last Month)'}
                {timeRange === 'thisYear' && 'Bookings Trend (This Year)'}
              </h3>
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 250}>
                <LineChart data={bookingsOverTime} margin={isMobile ? { left: -10, right: 5, top: 5, bottom: 5 } : undefined}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={isMobile ? 10 : 11}
                    tickLine={false}
                    axisLine={false}
                    interval={
                      timeRange === 'today' || timeRange === 'yesterday' ? (isMobile ? 4 : 3) :
                      timeRange === '30d' ? 4 :
                      timeRange === 'thisMonth' || timeRange === 'lastMonth' ? 0 :
                      timeRange === 'thisYear' ? 0 :
                      isMobile ? Math.ceil(bookingsOverTime.length / 3) - 1 : 0
                    }
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={isMobile ? 10 : 11}
                    tickLine={false}
                    axisLine={false}
                    width={isMobile ? 45 : 60}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value, name) => [name === 'bookings' ? value : formatCurrency(Number(value) || 0), name === 'bookings' ? 'Bookings' : 'Revenue']}
                  />
                  <Line type="monotone" dataKey="bookings" stroke="#0ea5e9" strokeWidth={isMobile ? 2 : 2} dot={{ fill: '#0ea5e9', strokeWidth: 2, r: isMobile ? 3 : 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4">Bookings by Room Type</h3>
              {bookingsByRoomType.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-16">No bookings</p>
              ) : (
                <ResponsiveContainer width="100%" height={isMobile ? 260 : 250}>
                  <PieChart>
                    <Pie
                      data={bookingsByRoomType}
                      cx="50%"
                      cy={isMobile ? '40%' : '50%'}
                      innerRadius={isMobile ? 45 : 60}
                      outerRadius={isMobile ? 70 : 90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {bookingsByRoomType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [value, 'Bookings']}
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

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-3 sm:mb-4">Room Status Distribution</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {roomStatus.map(status => (
                <div key={status.name} className="border border-slate-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-slate-700">{status.name}</span>
                    <div
                      className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 ${
                        status.name === 'Available'
                          ? 'bg-emerald-500'
                          : status.name === 'Occupied'
                            ? 'bg-sky-500'
                            : status.name === 'Cleaning'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                      }`}
                    />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono">{status.value}</p>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
                    {rooms.length > 0 ? ((status.value / rooms.length) * 100).toFixed(1) : '0.0'}% of total
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}