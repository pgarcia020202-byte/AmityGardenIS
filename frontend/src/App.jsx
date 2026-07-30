import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import LoginPage from './pages/LoginPage'
import Layout from './layout/Layout'
import DashboardPage from './pages/DashboardPage'
import CategoriesPage from './pages/CategoriesPage'
import ProductsPage from './pages/ProductsPage'
import SalesPage from './pages/SalesPage'
import StockLogsPage from './pages/StockLogsPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import RoomsPage from './pages/RoomsPage'
import CheckInOutPage from './pages/CheckInOutPage'
import {
  authAPI,
  categoryAPI,
  productAPI,
  salesAPI,
  stockLogsAPI,
  usersAPI,
  roomsAPI,
  bookingsAPI,
  notificationsAPI
} from './services/api'

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('currentUser')
      const savedToken = localStorage.getItem('token')
      // Only restore user if both user and token exist
      if (savedUser && savedToken) {
        return JSON.parse(savedUser)
      }
      return null
    } catch (error) {
      console.error('Error reading localStorage on init:', error)
      return null
    }
  })
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const savedPage = localStorage.getItem('currentPage')
      return savedPage || 'dashboard'
    } catch (error) {
      console.error('Error reading currentPage from localStorage:', error)
      return 'dashboard'
    }
  })
  const currentPageRef = useRef('dashboard')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [stockLogs, setStockLogs] = useState([])
  const [users, setUsers] = useState([])
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [notifications, setNotifications] = useState([])
  const [highlightedBookingId, setHighlightedBookingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const socketRef = useRef(null)
  const bookingsRef = useRef(bookings)
  const notifiedBookingIdsRef = useRef(new Set())
  const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'https://amitygardenis.onrender.com'

  const normalizeId = (value) => (value === undefined || value === null ? '' : String(value))

  useEffect(() => {
    async function loadData() {
      if (!currentUser) {
        setLoading(false)
        return
      }

      setLoading(true)

      // Verify token before loading any data
      try {
        await authAPI.verifyToken()
      } catch (error) {
        console.error('Token verification failed:', error)
        handleLogout()
        setLoading(false)
        return
      }

      const results = await Promise.allSettled([
        categoryAPI.getAll(),
        productAPI.getAll(),
        salesAPI.getAll(),
        stockLogsAPI.getAll(),
        roomsAPI.getAll(),
        bookingsAPI.getAll()
      ])

      const [categoriesResult, productsResult, salesResult, logsResult, roomsResult, bookingsResult] = results

      const handleRejected = (result, name) => {
        if (!result || result.status !== 'rejected') return
        const error = result.reason
        console.error(`Error loading ${name}:`, error)
        if (error?.message?.includes('Unauthorized') || error?.message?.includes('Invalid token') || error?.message?.includes('Authentication error') || error?.message?.includes('401') || error?.message?.includes('403')) {
          console.warn('Auth error detected while loading data, clearing session')
          handleLogout()
          return true
        }
        return false
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value)
      } else if (handleRejected(categoriesResult, 'categories')) {
        setLoading(false)
        return
      }

      if (productsResult.status === 'fulfilled') {
        setProducts(productsResult.value)
      } else if (handleRejected(productsResult, 'products')) {
        setLoading(false)
        return
      }

      if (salesResult.status === 'fulfilled') {
        setSales(salesResult.value)
      } else if (handleRejected(salesResult, 'sales')) {
        setLoading(false)
        return
      }

      if (logsResult.status === 'fulfilled') {
        setStockLogs(logsResult.value)
      } else if (handleRejected(logsResult, 'stock logs')) {
        setLoading(false)
        return
      }

      if (roomsResult.status === 'fulfilled') {
        setRooms(roomsResult.value)
      } else if (handleRejected(roomsResult, 'rooms')) {
        setLoading(false)
        return
      }

      if (bookingsResult.status === 'fulfilled') {
        setBookings(bookingsResult.value)
      } else if (handleRejected(bookingsResult, 'bookings')) {
        setLoading(false)
        return
      }

      if (currentUser.role === 'admin') {
        try {
          const usersData = await usersAPI.getAll()
          setUsers(usersData)
        } catch (error) {
          console.error('Error loading users:', error)
          if (error?.message?.includes('Unauthorized') || error?.message?.includes('Invalid token') || error?.message?.includes('Authentication error') || error?.message?.includes('401') || error?.message?.includes('403')) {
            console.warn('Auth error detected while loading users, clearing session')
            handleLogout()
            setLoading(false)
            return
          }
        }
      } else {
        setUsers([])
      }

      setLoading(false)
    }

    loadData()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token: localStorage.getItem('token')
      }
    })

    socketRef.current = socket

    socket.on('connect', () => console.log('Socket connected:', socket.id))
    socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason))

    const refreshProductsAndStockLogs = async () => {
      try {
        const [productsData, stockLogsData] = await Promise.all([
          productAPI.getAll(),
          stockLogsAPI.getAll()
        ])
        setProducts(productsData)
        setStockLogs(stockLogsData)
      } catch (error) {
        console.error('Unable to refresh products or stock logs via realtime event:', error)
      }
    }

    const refreshStockLogs = async () => {
      try {
        const stockLogsData = await stockLogsAPI.getAll()
        setStockLogs(stockLogsData)
      } catch (error) {
        console.error('Unable to refresh stock logs via realtime event:', error)
      }
    }

    socket.on('category:updated', (category) => {
      const id = normalizeId(category.id)
      setCategories((prev) => prev.map((item) => (normalizeId(item.id) === id ? category : item)))
    })
    socket.on('category:deleted', (id) => {
      const normalizedId = normalizeId(id)
      setCategories((prev) => prev.filter((item) => normalizeId(item.id) !== normalizedId))
    })

    socket.on('product:created', (product) => {
      setProducts((prev) => {
        const id = normalizeId(product.id)
        if (prev.some((item) => normalizeId(item.id) === id)) return prev
        return [...prev, product]
      })
      if (currentPageRef.current === 'stock-logs') {
        refreshStockLogs()
      }
    })
    socket.on('product:updated', (product) => {
      const id = normalizeId(product.id)
      setProducts((prev) => {
        const exists = prev.some((item) => normalizeId(item.id) === id)
        const updated = prev.map((item) => (normalizeId(item.id) === id ? product : item))
        return exists ? updated : [...updated, product]
      })
      if (currentPageRef.current === 'stock-logs') {
        refreshStockLogs()
      }
    })
    socket.on('product:deleted', (id) => {
      const normalizedId = normalizeId(id)
      setProducts((prev) => prev.filter((item) => normalizeId(item.id) !== normalizedId))
      if (currentPageRef.current === 'stock-logs') {
        refreshStockLogs()
      }
    })

    socket.on('sale:created', (sale) => {
      const id = normalizeId(sale.id)
      setSales((prev) => (prev.some((item) => normalizeId(item.id) === id) ? prev : [sale, ...prev]))
      refreshProductsAndStockLogs()
      if (currentPageRef.current === 'stock-logs') {
        refreshStockLogs()
      }
    })
    socket.on('sale:updated', (sale) => {
      const id = normalizeId(sale.id)
      setSales((prev) => prev.map((item) => (normalizeId(item.id) === id ? sale : item)))
      refreshProductsAndStockLogs()
      if (currentPageRef.current === 'stock-logs') {
        refreshStockLogs()
      }
    })
    socket.on('sale:deleted', (saleId) => {
      const normalizedId = normalizeId(saleId)
      setSales((prev) => prev.filter((item) => normalizeId(item.id) !== normalizedId))
      refreshProductsAndStockLogs()
      if (currentPageRef.current === 'stock-logs') {
        refreshStockLogs()
      }
    })

    socket.on('stockLog:created', (log) => {
      const id = normalizeId(log.id)
      setStockLogs((prev) => {
        const exists = prev.some((item) => normalizeId(item.id) === id)
        if (exists) {
          return prev.map((item) => (normalizeId(item.id) === id ? log : item))
        }
        return [log, ...prev]
      })
      if (currentPageRef.current === 'stock-logs') {
        refreshStockLogs()
      }
    })
    socket.on('stockLog:deleted', (id) => {
      const normalizedId = normalizeId(id)
      setStockLogs((prev) => prev.filter((item) => normalizeId(item.id) !== normalizedId))
    })

    socket.on('user:updated', (user) => {
      const id = normalizeId(user.id)
      setUsers((prev) => prev.map((item) => (normalizeId(item.id) === id ? user : item)))
    })
    socket.on('user:deleted', (id) => {
      const normalizedId = normalizeId(id)
      setUsers((prev) => prev.filter((item) => normalizeId(item.id) !== normalizedId))
    })

    socket.on('room:created', (room) => {
      const id = normalizeId(room.id)
      setRooms((prev) => {
        if (prev.some((item) => normalizeId(item.id) === id)) return prev
        return [...prev, room]
      })
    })
    socket.on('room:updated', (room) => {
      const id = normalizeId(room.id)
      setRooms((prev) => {
        const exists = prev.some((item) => normalizeId(item.id) === id)
        const updated = prev.map((item) => (normalizeId(item.id) === id ? room : item))
        return exists ? updated : [...updated, room]
      })
    })
    socket.on('room:deleted', (id) => {
      const normalizedId = normalizeId(id)
      setRooms((prev) => prev.filter((item) => normalizeId(item.id) !== normalizedId))
    })

    socket.on('booking:created', (booking) => {
      const id = normalizeId(booking.id)
      setBookings((prev) => {
        if (prev.some((item) => normalizeId(item.id) === id)) return prev
        return [...prev, booking]
      })
      // Check for 15-minute warnings after new booking
      setTimeout(() => checkFifteenMinuteWarnings(), 100)
    })
    socket.on('booking:updated', async (booking) => {
      const id = normalizeId(booking.id)
      setBookings((prev) => {
        const exists = prev.some((item) => normalizeId(item.id) === id)
        const updated = prev.map((item) => (normalizeId(item.id) === id ? booking : item))
        return exists ? updated : [...updated, booking]
      })
      // Clear notifications for this booking
      try {
        await notificationsAPI.deleteByBooking(id)
      } catch (error) {
        console.error('Error deleting booking notifications:', error)
      }
      setNotifications(prev => prev.filter(n => n.bookingId !== id))
      // Check for 15-minute warnings after booking update
      setTimeout(() => checkFifteenMinuteWarnings(), 100)
    })
    socket.on('booking:deleted', async (id) => {
      const normalizedId = normalizeId(id)
      setBookings((prev) => prev.filter((item) => normalizeId(item.id) !== normalizedId))
      // Clear notifications for this booking
      try {
        await notificationsAPI.deleteByBooking(normalizedId)
      } catch (error) {
        console.error('Error deleting booking notifications:', error)
      }
      setNotifications(prev => prev.filter(n => n.bookingId !== normalizedId))
      // Check for 15-minute warnings after booking deletion
      setTimeout(() => checkFifteenMinuteWarnings(), 100)
    })

    // Notification realtime events
    socket.on('notification:created', (notification) => {
      const formatted = {
        id: notification.id,
        bookingId: notification.booking_id,
        message: notification.message,
        roomNumber: notification.room_number,
        time: new Date(notification.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
        read: notification.read
      }
      setNotifications(prev => {
        // Check if notification already exists to prevent duplicates
        if (prev.some(n => n.id === notification.id)) {
          return prev
        }
        return [formatted, ...prev]
      })
      notifiedBookingIdsRef.current.add(notification.booking_id)
    })

    socket.on('notification:updated', (notification) => {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id 
          ? { 
              ...n, 
              message: notification.message,
              read: notification.read
            }
          : n
      ))
    })

    socket.on('notification:deleted', ({ id }) => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    })

    socket.on('notification:deletedAll', () => {
      setNotifications([])
      notifiedBookingIdsRef.current.clear()
    })

    socket.on('notification:deletedByBooking', ({ bookingId }) => {
      setNotifications(prev => prev.filter(n => n.bookingId !== bookingId))
      notifiedBookingIdsRef.current.delete(bookingId)
    })

    return () => {
      socket.off()
      socket.disconnect()
      socketRef.current = null
    }
  }, [currentUser, SOCKET_URL])

  // Check for bookings with 15 minutes remaining
  const checkFifteenMinuteWarnings = async () => {
    if (!currentUser || bookingsRef.current.length === 0) return

    const now = new Date().getTime()
    const fifteenMinutes = 15 * 60 * 1000

    // Check for expired bookings and update their notifications
    const expiredBookings = bookingsRef.current
      .filter(b => b.status === 'Checked In' && b.check_in_date && b.timer_duration)
      .filter(b => {
        const checkInTime = new Date(b.check_in_date).getTime()
        const endTime = checkInTime + (b.timer_duration * 60 * 1000)
        const remaining = endTime - now
        return remaining <= 0
      })

    for (const booking of expiredBookings) {
      if (notifiedBookingIdsRef.current.has(booking.id)) {
        try {
          // Update the notification message to "Remaining Time is up" - socket event will handle local state update
          await notificationsAPI.updateByBooking(booking.id, 'Remaining Time is up')
        } catch (error) {
          console.error('Error updating expired notification:', error)
        }
      }
    }

    const newWarnings = bookingsRef.current
      .filter(b => b.status === 'Checked In' && b.check_in_date && b.timer_duration)
      .filter(b => {
        const checkInTime = new Date(b.check_in_date).getTime()
        const endTime = checkInTime + (b.timer_duration * 60 * 1000)
        const remaining = endTime - now
        const isFifteenMinuteWarning = remaining > 0 && remaining <= fifteenMinutes
        return isFifteenMinuteWarning && !notifiedBookingIdsRef.current.has(b.id)
      })
      .map(booking => ({
        id: Date.now() + Math.random(),
        bookingId: booking.id,
        message: '15 minutes remaining',
        roomNumber: `Room ${booking.room_number}`,
        time: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
        read: false
      }))

    if (newWarnings.length > 0) {
      // Add new booking IDs to the notified set BEFORE API call to prevent duplicates
      newWarnings.forEach(warning => {
        notifiedBookingIdsRef.current.add(warning.bookingId)
      })
      
      // Save notifications to database - socket event will handle local state update
      for (const warning of newWarnings) {
        try {
          await notificationsAPI.create({
            booking_id: warning.bookingId,
            message: warning.message,
            room_number: warning.roomNumber
          })
        } catch (error) {
          console.error('Error saving notification to database:', error)
          // If API fails, remove from notified set so it can be retried
          notifiedBookingIdsRef.current.delete(warning.bookingId)
        }
      }

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        newWarnings.forEach(warning => {
          new Notification('Time Warning', {
            body: `${warning.roomNumber} - ${warning.message}`,
            icon: '/favicon.ico'
          })
        })
      }
    }
  }

  // Update bookings ref whenever bookings state changes
  useEffect(() => {
    bookingsRef.current = bookings
  }, [bookings])

  // Load notifications from API on mount
  useEffect(() => {
    if (!currentUser) return
    
    const loadNotifications = async () => {
      try {
        const data = await notificationsAPI.getAll()
        const formatted = data.map(n => ({
          id: n.id,
          bookingId: n.booking_id,
          message: n.message,
          roomNumber: n.room_number,
          time: new Date(n.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
          read: n.read
        }))
        setNotifications(formatted)
        // Initialize notifiedBookingIdsRef from loaded notifications
        notifiedBookingIdsRef.current = new Set(formatted.map(n => n.bookingId))
      } catch (error) {
        console.error('Error loading notifications:', error)
      }
    }
    
    loadNotifications()
  }, [currentUser])


  useEffect(() => {
    if (!currentUser || bookingsRef.current.length === 0) return

    checkFifteenMinuteWarnings()
    const interval = setInterval(checkFifteenMinuteWarnings, 30000) // Check every 30 seconds as fallback

    return () => clearInterval(interval)
  }, [currentUser, notifications])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  function handleLogin(user) {
    setCurrentUser(user)
    try {
      localStorage.setItem('currentUser', JSON.stringify(user))
    } catch (error) {
      console.error('localStorage error:', error)
    }
  }

  function handleLogout() {
    try {
      localStorage.removeItem('currentUser')
      localStorage.removeItem('currentPage')
      localStorage.removeItem('token')
    } catch (error) {
      console.error('localStorage error during logout:', error)
    }
    setCurrentUser(null)
    setCurrentPage('dashboard')
  }

  function handleNavigate(page) {
    setCurrentPage(page)
    localStorage.setItem('currentPage', page)
  }

  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  if (currentUser && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
          <div>
            <p className="text-lg font-semibold">Restoring session…</p>
            <p className="text-sm text-slate-300">Verifying your account and loading data.</p>
          </div>
        </div>
      </div>
    )
  }

  async function handleAddCategory(name) {
    const newCategory = await categoryAPI.create(name)
    setCategories((prev) => [...prev, newCategory])
  }

  async function handleEditCategory(id, name) {
    await categoryAPI.update(id, name)
    setCategories((prev) => prev.map((entry) => (entry.id === id ? { ...entry, name } : entry)))
  }

  async function handleDeleteCategory(id) {
    await categoryAPI.delete(id)
    setCategories((prev) => prev.filter((entry) => entry.id !== id))
  }

  async function handleAddProduct(product) {
    const newProduct = await productAPI.create(product)
    const newProductId = normalizeId(newProduct.id)
    setProducts((prev) => {
      if (prev.some((entry) => normalizeId(entry.id) === newProductId)) {
        return prev
      }
      return [...prev, newProduct]
    })
    
    // Reload stock logs to get the automatically created log
    const logs = await stockLogsAPI.getAll()
    setStockLogs(logs)
  }

  async function handleEditProduct(id, product) {
    await productAPI.update(id, product)
    const normalizedId = normalizeId(id)
    setProducts((prev) => prev.map((entry) => (normalizeId(entry.id) === normalizedId ? { ...entry, ...product } : entry)))
    
    // Reload stock logs to get any automatically created logs
    const logs = await stockLogsAPI.getAll()
    setStockLogs(logs)
  }

  async function handleDeleteProduct(id) {
    await productAPI.delete(id)
    const normalizedId = normalizeId(id)
    setProducts((prev) => prev.filter((entry) => normalizeId(entry.id) !== normalizedId))
  }

  async function handleAddSale(sale) {
    const newSale = await salesAPI.create(sale)
    const id = normalizeId(newSale.id)
    setSales((prev) => (prev.some((item) => normalizeId(item.id) === id) ? prev : [newSale, ...prev]))
    
    // Reload products and stock logs as they are updated automatically
    const [productsData, logsData] = await Promise.all([
      productAPI.getAll(),
      stockLogsAPI.getAll()
    ])
    setProducts(productsData)
    setStockLogs(logsData)
  }

  async function handleDeleteSale(id) {
    await salesAPI.delete(id)
    setSales((prev) => prev.filter((entry) => entry.id !== id))
    
    // Reload products and stock logs as they are updated automatically
    const [productsData, logsData] = await Promise.all([
      productAPI.getAll(),
      stockLogsAPI.getAll()
    ])
    setProducts(productsData)
    setStockLogs(logsData)
  }

  async function handleDeleteStockLog(id) {
    try {
      await stockLogsAPI.delete(id)
      setStockLogs((prev) => prev.filter((log) => normalizeId(log.id) !== normalizeId(id)))
    } catch (err) {
      throw err
    }
  }

  // Edit/update an existing sale (admin only)
  async function handleEditSale(id, updatedSale) {
    try {
      const updated = await salesAPI.update(id, updatedSale)
      // Update local state with returned sale if available, otherwise optimistically apply changes
      if (updated && updated.id) {
        setSales((prev) => prev.map((s) => (normalizeId(s.id) === normalizeId(updated.id) ? updated : s)))
      } else {
        setSales((prev) => prev.map((s) => (normalizeId(s.id) === normalizeId(id) ? { ...s, ...updatedSale } : s)))
      }

      // refresh full sales list to avoid race conditions with realtime events
      try {
        const allSales = await salesAPI.getAll()
        setSales(allSales)
      } catch (e) {
        // If fetching all sales fails, continue — we already updated optimistically above
        console.warn('Failed to refresh full sales list after update:', e)
      }

    } catch (err) {
      throw err
    }

    // Reload products and stock logs as they may have been adjusted by the backend
    const [productsData, logsData] = await Promise.all([
      productAPI.getAll(),
      stockLogsAPI.getAll()
    ])
    setProducts(productsData)
    setStockLogs(logsData)
  }

  async function handleAddUser(user) {
    const newUser = await usersAPI.create(user)
    setUsers((prev) => [...prev, newUser])
  }

  async function handleEditUser(id, userData) {
    const updatedUser = await usersAPI.update(id, userData)
    setUsers((prev) => prev.map((user) => (user.id === id ? updatedUser : user)))
  }

  async function handleDeleteUser(id) {
    await usersAPI.delete(id)
    setUsers((prev) => prev.filter((user) => user.id !== id))
  }

  async function handleAddRoom(room) {
    const newRoom = await roomsAPI.create(room)
    const newRoomId = normalizeId(newRoom.id)
    setRooms((prev) => {
      if (prev.some((entry) => normalizeId(entry.id) === newRoomId)) {
        return prev
      }
      return [...prev, newRoom]
    })
  }

  async function handleEditRoom(id, room) {
    await roomsAPI.update(id, room)
    const normalizedId = normalizeId(id)
    setRooms((prev) => prev.map((entry) => (normalizeId(entry.id) === normalizedId ? { ...entry, ...room } : entry)))
  }

  async function handleDeleteRoom(id) {
    await roomsAPI.delete(id)
    const normalizedId = normalizeId(id)
    setRooms((prev) => prev.filter((entry) => normalizeId(entry.id) !== normalizedId))
  }

  async function handleCheckIn(bookingData) {
    const newBooking = await bookingsAPI.create(bookingData)
    const newBookingId = normalizeId(newBooking.id)
    setBookings((prev) => {
      if (prev.some((entry) => normalizeId(entry.id) === newBookingId)) {
        return prev
      }
      return [...prev, newBooking]
    })
    // Reload rooms as room status is updated automatically
    const roomsData = await roomsAPI.getAll()
    setRooms(roomsData)
  }

  async function handleCheckOut(id) {
    await bookingsAPI.checkout(id)
    const normalizedId = normalizeId(id)
    setBookings((prev) => prev.map((entry) => (normalizeId(entry.id) === normalizedId ? { ...entry, status: 'Checked Out', check_out_date: new Date().toISOString() } : entry)))
    // Reload rooms as room status is updated automatically
    const roomsData = await roomsAPI.getAll()
    setRooms(roomsData)
  }

  async function handleUpdateBooking(id, bookingData) {
    await bookingsAPI.update(id, bookingData)
    const normalizedId = normalizeId(id)
    setBookings((prev) => prev.map((entry) => (normalizeId(entry.id) === normalizedId ? { ...entry, ...bookingData } : entry)))
  }

  async function handleDeleteBooking(id) {
    await bookingsAPI.delete(id)
    const normalizedId = normalizeId(id)
    setBookings((prev) => prev.filter((entry) => normalizeId(entry.id) !== normalizedId))
    // Reload rooms as room status may be updated automatically
    const roomsData = await roomsAPI.getAll()
    setRooms(roomsData)
  }

  async function handleExtendBooking(bookingId, extendHours, extraPrice) {
    await bookingsAPI.extend(bookingId, extendHours, extraPrice)
    // Reload bookings to get updated values from backend
    const bookingsData = await bookingsAPI.getAll()
    setBookings(bookingsData)
  }

  async function handleDismissNotification(id) {
    const notification = notifications.find(n => n.id === id)
    if (notification) {
      notifiedBookingIdsRef.current.delete(notification.bookingId)
    }
    try {
      await notificationsAPI.delete(id)
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function handleDismissAllNotifications() {
    notifiedBookingIdsRef.current.clear()
    try {
      await notificationsAPI.deleteAll()
    } catch (error) {
      console.error('Error deleting all notifications:', error)
    }
    setNotifications([])
  }

  function handleNotificationClick(bookingId) {
    setHighlightedBookingId(bookingId)
    handleNavigate('check-in-out')
  }

  function handlePageClick() {
    setHighlightedBookingId(null)
  }

  async function handleTimerEnd(bookingId) {
    try {
      // Check if notification exists for this booking in current state
      const existingNotification = notifications.find(n => n.bookingId === bookingId)
      
      if (existingNotification) {
        // Update existing notification - socket event will handle local state update
        await notificationsAPI.updateByBooking(bookingId, 'Remaining Time is up')
      }
      // If notification doesn't exist (user may have dismissed it), don't recreate it
    } catch (error) {
      // If update fails (e.g., notification was deleted), don't update local state
      if (!error.message?.includes('Notification not found')) {
        console.error('Error handling timer end notification:', error)
      }
    }
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage categories={categories} products={products} sales={sales} stockLogs={stockLogs} rooms={rooms} bookings={bookings} onNavigate={handleNavigate} />
      case 'categories':
        return <CategoriesPage categories={categories} products={products} currentUser={currentUser} onAdd={handleAddCategory} onEdit={handleEditCategory} onDelete={handleDeleteCategory} />
      case 'products':
        return <ProductsPage products={products} categories={categories} currentUser={currentUser} onAdd={handleAddProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
      case 'sales':
        return <SalesPage sales={sales} products={products} categories={categories} currentUser={currentUser} onAdd={handleAddSale} onEdit={handleEditSale} onDelete={handleDeleteSale} />
      case 'stock-logs':
        return <StockLogsPage stockLogs={stockLogs} currentUser={currentUser} onDelete={handleDeleteStockLog} />
      case 'reports':
        return <ReportsPage products={products} sales={sales} categories={categories} rooms={rooms} bookings={bookings} />
      case 'users':
        return <UsersPage users={users} onAdd={handleAddUser} onUpdate={handleEditUser} onDelete={handleDeleteUser} />
      case 'rooms':
        return <RoomsPage rooms={rooms} currentUser={currentUser} onAdd={handleAddRoom} onEdit={handleEditRoom} onDelete={handleDeleteRoom} />
      case 'check-in-out':
        return <CheckInOutPage bookings={bookings} rooms={rooms} currentUser={currentUser} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} onUpdate={handleUpdateBooking} onDelete={handleDeleteBooking} onExtend={handleExtendBooking} highlightedBookingId={highlightedBookingId} onTimerEnd={handleTimerEnd} />
      default:
        return null
    }
  }

  return (
    <Layout
      currentUser={currentUser}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      notifications={notifications}
      onDismissNotification={handleDismissNotification}
      onDismissAllNotifications={handleDismissAllNotifications}
      onNotificationClick={handleNotificationClick}
      onPageClick={handlePageClick}
    >
      {renderPage()}
    </Layout>
  )
}
