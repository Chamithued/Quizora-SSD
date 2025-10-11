import React, { useState, useEffect } from 'react';
import { marksheetService } from '../../services/marksheetService';

const Marksheet = () => {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('quiz');

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        setLoading(true);
        const res = await marksheetService.getStudentMarksheet();
        const results = res?.data?.results ?? [];
        console.log('Fetched marksheet results:', results);
        setMarks(results);
        setError('');
      } catch (err) {
        let message = 'Failed to fetch marksheet.';
        // Enhanced logging for debugging
        if (err.response) {
          console.error('Marksheet API error:', {
            status: err.response.status,
            data: err.response.data,
            headers: err.response.headers
          });
        } else if (err.request) {
          console.error('Marksheet API request error:', err.request);
        } else {
          console.error('Marksheet error:', err.message);
        }
        console.error('Full error object:', err);

        if (err.message?.includes('Unauthorized')) {
          message = 'You are not logged in. Please log in as a student.';
        } else if (err.message?.includes('Cannot connect to server')) {
          message = 'Cannot connect to server. Please check if the backend is running.';
        } else if (err.message) {
          message = err.message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchMarks();
  }, []);

  // Only show finalized marks (graded or reviewed)
  const filteredMarks = marks.filter(
    mark => mark.status === 'graded' || mark.status === 'reviewed'
  );

  return (
    <div className="p-6 bg-white rounded shadow-md">
      <h2 className="text-2xl font-bold mb-4">Student Marksheet</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {/* Filter/Sort Controls */}
      <div className="flex gap-4 mb-4">
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border p-2 rounded">
          <option value="all">All Modules</option>
          {/* TODO: Populate with module list */}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border p-2 rounded">
          <option value="quiz">Sort by Quiz</option>
          <option value="module">Sort by Module</option>
        </select>
      </div>
      {/* Marksheet Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Quiz</th>
            <th className="p-2 border">Module</th>
            <th className="p-2 border">Mark</th>
            <th className="p-2 border">Grade</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className="text-center p-4">Loading...</td></tr>
          ) : error ? (
            <tr><td colSpan={5} className="text-center p-4 text-gray-400">No marksheet data available.</td></tr>
          ) : filteredMarks.length === 0 ? (
            <tr><td colSpan={5} className="text-center p-4 text-gray-400">No finalized marks found. Your marksheet will appear here once your quizzes are graded.</td></tr>
          ) : (
            filteredMarks.map((mark, idx) => (
              <tr key={idx} className={mark.status === 'graded' || mark.status === 'reviewed' ? '' : 'bg-yellow-50'}>
                <td className="p-2 border">{mark.quizId?.title || '-'}</td>
                <td className="p-2 border">{mark.moduleId?.moduleName || '-'}</td>
                <td className="p-2 border">{mark.score} / {mark.totalMarks}</td>
                <td className="p-2 border">{mark.grade}</td>
                <td className="p-2 border">{mark.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {/* Export PDF Button (to be implemented) */}
      <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded" disabled>Export as PDF</button>
    </div>
  );
};

export default Marksheet;