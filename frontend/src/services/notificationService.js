import api from './api';

export const notificationService = {
  getAll: () => api.get('/notifications'),
  getSummary: () => api.get('/notifications/summary'),
};

export default notificationService;
