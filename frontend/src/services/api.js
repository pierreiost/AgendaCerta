import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const dashboardService = {
  getOverview: () => api.get('/dashboard/overview'),
  getUpcoming: () => api.get('/dashboard/upcoming'),
  getRevenue: (params) => api.get('/dashboard/revenue', { params }),
  getOccupancy: (params) => api.get('/dashboard/occupancy', { params }),
};

export const resourceService = {
  getAll: () => api.get('/resources'),
  getById: (id) => api.get(`/resources/${id}`),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  delete: (id) => api.delete(`/resources/${id}`),
};

export const resourceTypeService = {
  getAll: () => api.get('/resource-types'),
  getById: (id) => api.get(`/resource-types/${id}`),
  create: (data) => api.post('/resource-types', data),
  update: (id, data) => api.put(`/resource-types/${id}`, data),
  delete: (id) => api.delete(`/resource-types/${id}`),
};

export const clientService = {
  getAll: () => api.get('/clients'),
  getById: (id) => api.get(`/clients/${id}`),
  getHistory: (id, params) => api.get(`/clients/${id}/history`, { params }),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
};

export const reservationService = {
  getAll: (params) => api.get('/reservations', { params }),
  getById: (id) => api.get(`/reservations/${id}`),
  create: (data) => api.post('/reservations', data),
  update: (id, data) => api.put(`/reservations/${id}`, data),
  cancel: (id) => api.delete(`/reservations/${id}`),
  cancelMultiple: (reservationIds) => api.post('/reservations/cancel-multiple', { reservationIds }),
  cancelRecurringGroup: (groupId) => api.delete(`/reservations/recurring-group/${groupId}`),
};

export const productService = {
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  addStock: (id, quantity, reason) =>
    api.post(`/products/${id}/stock/add`, { quantity, reason }),
  removeStock: (id, quantity, reason) =>
    api.post(`/products/${id}/stock/remove`, { quantity, reason }),
};

export const tabService = {
  getAll: (params) => api.get('/tabs', { params }),
  getById: (id) => api.get(`/tabs/${id}`),
  create: (data) => api.post('/tabs', data),
  addItem: (id, item) => api.post(`/tabs/${id}/items`, item),
  removeItem: (tabId, itemId) => api.delete(`/tabs/${tabId}/items/${itemId}`),
  close: (id, paymentMethod) => api.post(`/tabs/${id}/close`, { paymentMethod }),
  cancel: (id) => api.delete(`/tabs/${id}`),
};

export const userService = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updatePermissions: (userId, permissionIds) =>
    api.put(`/permissions/user/${userId}`, { permissionIds }),
};

export const permissionService = {
  getAll: () => api.get('/permissions'),
  getUserPermissions: (userId) => api.get(`/permissions/user/${userId}`),
  updateUserPermissions: (userId, permissionIds) =>
    api.put(`/permissions/user/${userId}`, { permissionIds }),
  initializePermissions: () => api.post('/permissions/initialize'),
};

export const adminService = {
  getPendingApprovals: () => api.get('/admin/pending'),
  getActiveComplexes: () => api.get('/admin/active'),
  getRejectedComplexes: () => api.get('/admin/rejected'),
  getSuspendedComplexes: () => api.get('/admin/suspended'),
  getStats: () => api.get('/admin/stats'),
  approveComplex: (userId) => api.post(`/admin/approve/${userId}`),
  rejectComplex: (userId, reason) =>
    api.post(`/admin/reject/${userId}`, { reason }),
  suspendComplex: (userId, reason) =>
    api.post(`/admin/suspend/${userId}`, { reason }),
  reactivateComplex: (userId) => api.post(`/admin/reactivate/${userId}`),
};

export const notificationService = {
  getAll: () => api.get('/notifications'),
  getSummary: () => api.get('/notifications/summary'),
};

export const googleCalendarService = {
  getStatus: () => api.get('/google-calendar/status'),
  getAuthUrl: () => api.get('/google-calendar/auth'),
  startWatch: () => api.post('/google-calendar/watch', {}),
};

export default api;
