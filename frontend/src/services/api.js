const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://amitygardenis.onrender.com/api'

// Get stored token
const getToken = () => localStorage.getItem('token')

// Generic API call function with retry logic
async function apiCall(endpoint, options = {}, retryCount = 0) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Add timeout for mobile networks and slower render cold starts
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      let errorBody = null
      try {
        errorBody = await response.json()
      } catch (parseError) {
        console.warn('Failed to parse error response:', parseError)
      }

      const message = errorBody?.error || response.statusText || 'API request failed'
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Authentication error: ${message}`)
      }
      if (response.status >= 500) {
        throw new Error(`Server error: ${message}`)
      }
      throw new Error(message)
    }

    if (response.status === 204) {
      return null
    }

    return response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    const errorMessage = error?.message || String(error)
    const shouldRetry = retryCount < 3 && (
      error.name === 'AbortError' ||
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('NetworkError') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('Server error') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504')
    )

    if (shouldRetry) {
      console.warn(`Retrying API call (${retryCount + 1}/3):`, endpoint, errorMessage)
      await new Promise((resolve) => setTimeout(resolve, 1200))
      return apiCall(endpoint, options, retryCount + 1)
    }

    if (error.name === 'AbortError') {
      throw new Error('Connection timeout. Please check your internet and try again.')
    }
    throw error
  }
}

// Auth API
export const authAPI = {
  login: async (username, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    })
  },

  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  },

  verifyToken: async () => {
    return apiCall('/auth/verify')
  }
}

// Categories API
export const categoryAPI = {
  getAll: async () => {
    return apiCall('/categories')
  },

  create: async (name) => {
    return apiCall('/categories', {
      method: 'POST',
      body: JSON.stringify({ name })
    })
  },

  update: async (id, name) => {
    return apiCall(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    })
  },

  delete: async (id) => {
    return apiCall(`/categories/${id}`, {
      method: 'DELETE'
    })
  }
}

// Products API
export const productAPI = {
  getAll: async () => {
    return apiCall('/products')
  },

  create: async (productData) => {
    return apiCall('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    })
  },

  update: async (id, productData) => {
    return apiCall(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    })
  },

  delete: async (id) => {
    return apiCall(`/products/${id}`, {
      method: 'DELETE'
    })
  }
}

// Sales API
export const salesAPI = {
  getAll: async () => {
    return apiCall('/sales')
  },

  create: async (saleData) => {
    return apiCall('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData)
    })
  },

  update: async (id, saleData) => {
    return apiCall(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(saleData)
    })
  },

  delete: async (id) => {
    return apiCall(`/sales/${id}`, {
      method: 'DELETE'
    })
  }
}

// Stock Logs API
export const stockLogsAPI = {
  getAll: async () => {
    return apiCall('/stock-logs')
  },

  create: async (logData) => {
    return apiCall('/stock-logs', {
      method: 'POST',
      body: JSON.stringify(logData)
    })
  },

  delete: async (id) => {
    return apiCall(`/stock-logs/${id}`, {
      method: 'DELETE'
    })
  }
}

// Users API
export const usersAPI = {
  getAll: async () => {
    return apiCall('/users')
  },

  create: async (userData) => {
    return apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  },

  update: async (id, userData) => {
    return apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    })
  },

  delete: async (id) => {
    return apiCall(`/users/${id}`, {
      method: 'DELETE'
    })
  }
}

// Rooms API
export const roomsAPI = {
  getAll: async () => {
    return apiCall('/rooms')
  },

  create: async (roomData) => {
    return apiCall('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData)
    })
  },

  update: async (id, roomData) => {
    return apiCall(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roomData)
    })
  },

  delete: async (id) => {
    return apiCall(`/rooms/${id}`, {
      method: 'DELETE'
    })
  }
}

// Bookings API
export const bookingsAPI = {
  getAll: async () => {
    return apiCall('/bookings')
  },

  getActive: async () => {
    return apiCall('/bookings/active')
  },

  getById: async (id) => {
    return apiCall(`/bookings/${id}`)
  },

  create: async (bookingData) => {
    return apiCall('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    })
  },

  checkout: async (id) => {
    return apiCall(`/bookings/${id}/checkout`, {
      method: 'PUT'
    })
  },

  update: async (id, bookingData) => {
    return apiCall(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData)
    })
  },

  delete: async (id) => {
    return apiCall(`/bookings/${id}`, {
      method: 'DELETE'
    })
  },

  extend: async (id, extendHours, extraPrice) => {
    return apiCall(`/bookings/${id}/extend`, {
      method: 'PUT',
      body: JSON.stringify({ extend_hours: extendHours, extra_price: extraPrice })
    })
  }
}

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    return apiCall('/notifications')
  },

  create: async (notificationData) => {
    return apiCall('/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData)
    })
  },

  markAsRead: async (id) => {
    return apiCall(`/notifications/${id}/read`, {
      method: 'PATCH'
    })
  },

  delete: async (id) => {
    return apiCall(`/notifications/${id}`, {
      method: 'DELETE'
    })
  },

  deleteAll: async () => {
    return apiCall('/notifications', {
      method: 'DELETE'
    })
  },

  deleteByBooking: async (bookingId) => {
    return apiCall(`/notifications/booking/${bookingId}`, {
      method: 'DELETE'
    })
  }
}
