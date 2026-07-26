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
  categoryAPI,
  productAPI,
  salesAPI,
  stockLogsAPI,
  usersAPI
} from './services/api'

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('currentUser')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('currentPage')
    return savedPage || 'dashboard'
  })
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [stockLogs, setStockLogs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return
      
      try {
        const [categoriesData, productsData, salesData, stockLogsData] = await Promise.all([
          categoryAPI.getAll(),
          productAPI.getAll(),
          salesAPI.getAll(),
          stockLogsAPI.getAll(),
        ])
        setCategories(categoriesData)
        setProducts(productsData)
        setSales(salesData)
        setStockLogs(stockLogsData)
        
        // Only fetch users if admin
        if (currentUser.role === 'admin') {
          const usersData = await usersAPI.getAll()
          setUsers(usersData)
        } else {
          setUsers([])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      }

      setLoading(false)
    }

    loadData()
  }, [currentUser])

  function handleLogin(user) {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  function handleLogout() {
    localStorage.removeItem('currentUser')
    localStorage.removeItem('currentPage')
    localStorage.removeItem('token')
    setCurrentUser(null)
    setCurrentPage('dashboard')
  }

  function handleNavigate(page) {
    setCurrentPage(page)
    localStorage.setItem('currentPage', page)
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
        return <SalesPage sales={sales} products={products} categories={categories} currentUser={currentUser} onAdd={handleAddSale} onDelete={handleDeleteSale} />
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
