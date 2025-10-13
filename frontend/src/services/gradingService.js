import api from './api';

export const gradingService = {
  // Get grading statistics
  getGradingStats: async () => {
    const response = await api.get('/grading/stats');
    return response;
  },

  // Get all submissions requiring manual grading
  getPendingSubmissions: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.moduleCode) params.append('moduleCode', filters.moduleCode);
    if (filters.quizId) params.append('quizId', filters.quizId);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.page) params.append('page', filters.page);

    const response = await api.get(`/grading/pending?${params.toString()}`);
    return response;
  },

  // Get all already graded submissions for review/re-grading
  getGradedSubmissions: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.moduleCode) params.append('moduleCode', filters.moduleCode);
    if (filters.quizId) params.append('quizId', filters.quizId);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.page) params.append('page', filters.page);

    const response = await api.get(`/grading/graded?${params.toString()}`);
    return response;
  },

  // Get finalized submissions
  getFinalizedSubmissions: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.moduleCode) params.append('moduleCode', filters.moduleCode);
    if (filters.quizId) params.append('quizId', filters.quizId);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.page) params.append('page', filters.page);

    const response = await api.get(`/grading/finalized?${params.toString()}`);
    return response;
  },

  // Get detailed submission for grading
  getSubmissionForGrading: async (submissionId) => {
    const response = await api.get(`/grading/submission/${submissionId}`);
    return response;
  },

  // Update manual grades for a submission
  updateManualGrades: async (submissionId, gradedAnswers) => {
    const response = await api.put(`/grading/submission/${submissionId}/grades`, {
      gradedAnswers
    });
    return response;
  },

  // Finalize a graded submission (lock)
  finalizeSubmission: async (submissionId) => {
    const response = await api.post(`/grading/submission/${submissionId}/finalize`);
    return response;
  },

  // Unfinalize a reviewed submission (unlock)
  unfinalizeSubmission: async (submissionId) => {
    const response = await api.post(`/grading/submission/${submissionId}/unfinalize`);
    return response;
  }
};