import { useState, useEffect, memo } from 'react'
import { Bell, X, Clock, Bed } from 'lucide-react'

export default memo(function NotificationMenu({ notifications, onDismiss, onDismissAll, onNotificationClick }) {
  const [isOpen, setIsOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        title="Notifications"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed left-1/2 -translate-x-1/2 top-4 w-[calc(100vw-2rem)] max-w-md bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-[80vh] overflow-hidden flex flex-col sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:translate-x-0 sm:translate-y-0 sm:w-80 sm:left-auto sm:mx-0">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    onDismissAll()
                    setIsOpen(false)
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Bell size={32} className="mb-2" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.read ? 'bg-amber-50' : ''}`}
                      onClick={() => {
                        onNotificationClick(notification.bookingId)
                        setIsOpen(false)
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                          <Clock size={14} className="text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-800 font-medium">{notification.message}</p>
                          <p className="text-xs text-slate-500 mt-1">{notification.roomNumber}</p>
                          <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDismiss(notification.id)
                          }}
                          className="text-slate-400 hover:text-slate-600"
                          title="Dismiss"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
})
