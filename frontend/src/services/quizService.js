// frontend/src/services/quizService.js

import api from './api';

export const quizService = {
  getQuizzes: async (params = {}) => {
    const response = await api.get('/quizzes', { params });
    return response;
  },

  createQuiz: async (quizData) => {
    const response = await api.post('/quizzes', quizData);
    return response;
  },

  updateQuiz: async (id, quizData) => {
    const response = await api.put(`/quizzes/${id}`, quizData);
    return response;
  },

  deleteQuiz: async (id) => {
    const response = await api.delete(`/quizzes/${id}`);
    return response;
  },

  getQuizById: async (id) => {
    const response = await api.get(`/quizzes/${id}`);
    return response;
  },

  getQuizEditability: async (id) => {
    const response = await api.get(`/quizzes/${id}/editability`);
    return response;
  },

  getQuizStats: async () => {
    const response = await api.get('/quizzes/stats');
    return response;
  },

  getAnalytics: async (params = {}) => {
    const response = await api.get('/quizzes/analytics', params);
    return response;
  },

  getQuizResults: async (id) => {
    const response = await api.get(`/quizzes/${id}/results`);
    return response;
  },

  // Student endpoints
  getStudentQuizzes: async () => {
    const response = await api.get('/quizzes/student/available');
    return response;
  },

  verifyQuizPasscode: async (quizId, passcode) => {
    const response = await api.post(`/quizzes/${quizId}/verify-passcode`, { passcode });
    return response;
  },

  getQuizQuestions: async (quizId) => {
    const response = await api.get(`/quizzes/${quizId}/questions`);
    return response;
  },

  submitQuiz: async (quizId, submissionData) => {
    const response = await api.post(`/quizzes/${quizId}/submit`, submissionData);
    return response;
  },

  // Manual status update endpoint (NEW)
  updateQuizStatuses: async () => {
    const response = await api.post('/quizzes/update-statuses');
    return response;
  },

  // Debug endpoints (temporary)
  debugQuizData: async (quizId) => {
    const response = await api.get(`/quizzes/${quizId}/debug-data`);
    return response;
  },

  testGradeCalculation: async () => {
    const response = await api.get('/quizzes/test-grade');
    return response;
  }
};