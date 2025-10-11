import api from './api';

export const marksheetService = {
  async getStudentMarksheet() {
    // Fetch all finalized (graded/reviewed) results for the logged-in student
    return api.get('/results/student');
  }
};
