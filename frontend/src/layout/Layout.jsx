import { useState } from 'react'
import {
  LayoutDashboard, Tag, Package, ShoppingBag,
  ClipboardList, BarChart3, LogOut, ChevronRight, Menu, X, Shield, User as UserIcon
} from 'lucide-react'

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { page: 'categories', label: 'Categories', icon: <Tag size={18} />, adminOnly: true },
  { page: 'products', label: 'Products', icon: <Package size={18} /> },
  { page: 'sales', label: 'Sales', icon: <ShoppingBag size={18} /> },
  { page: 'stock-logs', label: 'Stock Logs', icon: <ClipboardList size={18} /> },
  { page: 'reports', label: 'Reports', icon: <BarChart3 size={18} />, adminOnly: true },
  { page: 'users', label: 'User Management', icon: <UserIcon size={18} />, adminOnly: true },
]

export default function Layout({ currentUser, currentPage, onNavigate, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const visibleNav = NAV_ITEMS.filter(item => !item.adminOnly || currentUser.role === 'admin')

  const Sidebar = ({ mobile = false }) => {
    // Labels/text only collapse on the desktop rail — the mobile drawer always
    // shows full text regardless of the desktop-only collapsed state.
    const showText = mobile || !sidebarCollapsed

    return (
      <aside
        className={
          mobile
            ? 'fixed inset-y-0 left-0 z-50 w-64 flex flex-col'
            : `hidden lg:flex flex-col shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`
        }
        style={{ background: '#000000' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          {showText && (
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Amity Garden Resort and Hotel</p>
              <p className="text-slate-500 text-xs">Inventory System</p>
            </div>
          )}
          {mobile && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          )}
          {!mobile && (
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="ml-auto text-slate-400 hover:text-white">
              <ChevronRight size={18} className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map(item => {
            const active = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => { onNavigate(item.page); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title={!showText ? item.label : ''}
              >
                <span className={active ? 'text-yellow-400' : 'text-slate-500 group-hover:text-slate-400'}>
                  {item.icon}
                </span>
                {showText && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight size={14} className="text-yellow-400" />}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-900">
            <div className="w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center shrink-0">
              <UserIcon size={13} className="text-white" />
            </div>
            {showText && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{currentUser.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={10} className={currentUser.role === 'admin' ? 'text-yellow-400' : 'text-gray-400'} />
                  <span className={`text-xs capitalize ${currentUser.role === 'admin' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-rose-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar mobile />
        </>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4 shrink-0">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-800"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-slate-900 capitalize">
              {currentPage === 'users' ? 'User Management' : currentPage.replace('-', ' ')}
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${currentUser.role === 'admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
              {currentUser.role === 'admin' ? 'Administrator' : 'Staff'}
            </span>
            <span className="text-sm text-slate-600 font-medium hidden sm:block">{currentUser.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}