import api from './api';

export const rubricService = {
  // Get all rubrics for the lecturer
  getRubrics: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.moduleId) params.append('moduleId', filters.moduleId);
      if (filters.questionType) params.append('questionType', filters.questionType);
      if (filters.isTemplate !== undefined) params.append('isTemplate', filters.isTemplate);

      const response = await api.get(`/rubrics?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('Rubrics API error:', error);
      throw error;
    }
  },

  // Get a specific rubric by ID
  getRubricById: async (id) => {
    const response = await api.get(`/rubrics/${id}`);
    return response;
  },

  // Create a new rubric
  createRubric: async (rubricData) => {
    const response = await api.post('/rubrics', rubricData);
    return response;
  },

  // Update an existing rubric
  updateRubric: async (id, rubricData) => {
    const response = await api.put(`/rubrics/${id}`, rubricData);
    return response;
  },

  // Delete a rubric
  deleteRubric: async (id) => {
    const response = await api.delete(`/rubrics/${id}`);
    return response;
  },

  // Duplicate a rubric
  duplicateRubric: async (id, options = {}) => {
    const response = await api.post(`/rubrics/${id}/duplicate`, options);
    return response;
  },

  // Get rubrics suitable for a specific question type
  getRubricsForQuestionType: async (questionType, moduleId = null) => {
    const params = new URLSearchParams();
    if (moduleId) params.append('moduleId', moduleId);

    const response = await api.get(`/rubrics/question-type/${questionType}?${params.toString()}`);
    return response;
  },

  // Get rubric templates
  getRubricTemplates: async () => {
    const response = await api.get('/rubrics/templates');
    return response;
  },

  // Calculate rubric score
  calculateRubricScore: async (rubricId, selectedLevels) => {
    const response = await api.post('/rubrics/calculate-score', {
      rubricId,
      selectedLevels
    });
    return response;
  }
};