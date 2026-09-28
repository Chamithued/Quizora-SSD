import api from './api';

export const userService = {
  getPendingUsers: () => api.get('/users/pending'),
  approveUser: (id, data) => api.post(`/users/${id}/approve`, data),
  rejectUser: id => api.post(`/users/${id}/reject`, {}),
  getUsers: async (params = {}) => {
    const response = await api.get('/users', params);
    return response;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response;
  },

  getUserStats: async () => {
    const response = await api.get('/users/stats');
    return response;
  },

  getDegreeOptions: async () => {
    const response = await api.get('/users/degrees');
    return response;
  }
};
