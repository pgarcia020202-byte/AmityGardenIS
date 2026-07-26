const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://amitygardenis.onrender.com'

// Get stored token
const getToken = () => localStorage.getItem('token')

// Generic API call function
async function apiCall(endpoint, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'API request failed')
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
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
