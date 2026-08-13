import { useState } from 'react'
import {
  LayoutDashboard, Tag, Package, ShoppingBag,
  ClipboardList, BarChart3, LogOut, ChevronRight, Menu, X, Shield, User as UserIcon, Building, Bed, LogIn, DollarSign, Utensils
} from 'lucide-react'
import NotificationMenu from '../components/NotificationMenu'
import { safeFormatDate } from '../utils/formatUtils'

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { header: 'Inventory Management' },
  { page: 'categories', label: 'Categories', icon: <Tag size={18} /> },
  { page: 'products', label: 'Products', icon: <Package size={18} /> },
  { page: 'sales', label: 'Sales', icon: <ShoppingBag size={18} /> },
  { page: 'stock-logs', label: 'Stock Logs', icon: <ClipboardList size={18} /> },
  { header: 'Hotel Management' },
  { page: 'rooms', label: 'Rooms', icon: <Bed size={18} /> },
  { page: 'check-in-out', label: 'Check In/Out', icon: <LogIn size={18} /> },
  { page: 'hotel-menus', label: 'Hotel Menus', icon: <Utensils size={18} />, adminOnly: true },
  { header: 'Finance' },
  { page: 'staff-expenses', label: 'Staff Expenses', icon: <DollarSign size={18} /> },
  { header: ' ' },
  { page: 'reports', label: 'Reports', icon: <BarChart3 size={18} />, adminOnly: true },
  { page: 'users', label: 'User Management', icon: <UserIcon size={18} />, adminOnly: true },
]

export default function Layout({ currentUser, currentPage, onNavigate, onLogout, notifications, onDismissNotification, onDismissAllNotifications, onNotificationClick, onPageClick, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const safeCurrentUser = currentUser || {}
  const userRole = safeCurrentUser.role || 'staff'
  const userName = safeCurrentUser.name || 'User'

  const visibleNav = NAV_ITEMS.filter(item => !item.adminOnly || userRole === 'admin')

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
        <div className={`flex items-center gap-3 border-b border-gray-800 relative ${sidebarCollapsed && !mobile ? 'justify-center px-0 py-4' : 'px-6 py-5'}`}>
          <img src="/logo.png" alt="Logo" className={`rounded-lg object-cover shrink-0 ${sidebarCollapsed && !mobile ? 'w-8 h-8' : 'w-10 h-10'}`} />
          {showText && (
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Amity Garden Resort and Hotel</p>
              
            </div>
          )}
          {mobile && (
            <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          )}
          {!mobile && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`text-slate-400 hover:text-white transition-colors ${sidebarCollapsed ? 'absolute right-2' : 'ml-auto'}`}
            >
              <ChevronRight size={18} className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 space-y-0.5 overflow-y-auto ${sidebarCollapsed && !mobile ? 'px-2 py-4' : 'px-3 py-4'}`}>
          {visibleNav.map((item, index) => {
            if (item.header) {
              return (
                <div key={`header-${index}`} className={`${sidebarCollapsed && !mobile ? 'hidden' : 'px-3 py-2 mt-4'}`}>
                  {showText && (
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {item.header}
                    </p>
                  )}
                </div>
              )
            }
            const active = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => { onNavigate(item.page); setSidebarOpen(false) }}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all text-left group ${
                  sidebarCollapsed && !mobile ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5'
                } ${
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
        <div className={`border-t border-gray-800 ${sidebarCollapsed && !mobile ? 'px-2 py-4' : 'px-3 py-4'}`}>
          <div className={`flex items-center rounded-lg bg-gray-900 ${sidebarCollapsed && !mobile ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2'}`}>
            <div className={`rounded-full bg-gray-500 flex items-center justify-center shrink-0 ${sidebarCollapsed && !mobile ? 'w-8 h-8' : 'w-7 h-7'}`}>
              <UserIcon size={sidebarCollapsed && !mobile ? 14 : 13} className="text-white" />
            </div>
            {showText && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{userName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield size={10} className={userRole === 'admin' ? 'text-yellow-400' : 'text-gray-400'} />
                  <span className={`text-xs capitalize ${userRole === 'admin' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {userRole}
                  </span>
                </div>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-rose-400 transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
          {sidebarCollapsed && !mobile && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center mt-2 text-slate-500 hover:text-rose-400 transition-colors py-2"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          )}
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
              {currentPage === 'users' ? 'User Management' : currentPage === 'staff-expenses' ? 'Staff Expenses' : currentPage === 'hotel-menus' ? 'Hotel Menus' : currentPage.replace('-', ' ')}
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              {safeFormatDate(new Date(), { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <NotificationMenu 
              notifications={notifications} 
              onDismiss={onDismissNotification}
              onDismissAll={onDismissAllNotifications}
              onNotificationClick={onNotificationClick}
            />
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${userRole === 'admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
              {userRole === 'admin' ? 'Administrator' : 'Staff'}
            </span>
            <span className="text-sm text-slate-600 font-medium hidden sm:block">{userName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" onClick={onPageClick}>
          {children}
        </main>
      </div>
    </div>
  )
}