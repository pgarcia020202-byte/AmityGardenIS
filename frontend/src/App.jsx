import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import Layout from './layout/Layout'
import DashboardPage from './pages/DashboardPage'
import CategoriesPage from './pages/CategoriesPage'
import ProductsPage from './pages/ProductsPage'
import SalesPage from './pages/SalesPage'
import StockLogsPage from './pages/StockLogsPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import {
  authAPI,
  categoryAPI,
  productAPI,
  salesAPI,
  stockLogsAPI,
  usersAPI
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
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [stockLogs, setStockLogs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

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
        stockLogsAPI.getAll()
      ])

      const [categoriesResult, productsResult, salesResult, logsResult] = results

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
    setProducts((prev) => [...prev, newProduct])
    
    // Reload stock logs to get the automatically created log
    const logs = await stockLogsAPI.getAll()
    setStockLogs(logs)
  }

  async function handleEditProduct(id, product) {
    await productAPI.update(id, product)
    setProducts((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...product } : entry)))
    
    // Reload stock logs to get any automatically created logs
    const logs = await stockLogsAPI.getAll()
    setStockLogs(logs)
  }

  async function handleDeleteProduct(id) {
    await productAPI.delete(id)
    setProducts((prev) => prev.filter((entry) => entry.id !== id))
  }

  async function handleAddSale(sale) {
    const newSale = await salesAPI.create(sale)
    setSales((prev) => [newSale, ...prev])
    
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

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage categories={categories} products={products} sales={sales} stockLogs={stockLogs} onNavigate={handleNavigate} />
      case 'categories':
        return <CategoriesPage categories={categories} products={products} currentUser={currentUser} onAdd={handleAddCategory} onEdit={handleEditCategory} onDelete={handleDeleteCategory} />
      case 'products':
        return <ProductsPage products={products} categories={categories} currentUser={currentUser} onAdd={handleAddProduct} onEdit={handleEditProduct} onDelete={handleDeleteProduct} />
      case 'sales':
        return <SalesPage sales={sales} products={products} categories={categories} currentUser={currentUser} onAdd={handleAddSale} />
      case 'stock-logs':
        return <StockLogsPage stockLogs={stockLogs} />
      case 'reports':
        return <ReportsPage products={products} sales={sales} categories={categories} />
      case 'users':
        return <UsersPage users={users} onAdd={handleAddUser} onUpdate={handleEditUser} onDelete={handleDeleteUser} />
      default:
        return null
    }
  }

  return (
    <Layout currentUser={currentUser} currentPage={currentPage} onNavigate={handleNavigate} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  )
}
