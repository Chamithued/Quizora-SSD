import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { gradingService } from '../../services/gradingService';
import { 
  Clock, 
  Users, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  User,
  Search,
  Filter,
  Eye
} from 'lucide-react';

const GradingDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    pendingCount: 0,
    gradedCount: 0,
    submittedCount: 0,
    reviewedCount: 0,
    recentPending: []
  });
  const [submissions, setSubmissions] = useState({
    submissionsByQuiz: {},
    total: 0,
    page: 1,
    totalPages: 1
  });
  const [filters, setFilters] = useState({
    moduleCode: '',
    page: 1
  });

  useEffect(() => {
    loadGradingData();
  }, [filters]);

  const loadGradingData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load stats and pending submissions
      const [statsResponse, submissionsResponse] = await Promise.all([
        gradingService.getGradingStats(),
        gradingService.getPendingSubmissions(filters)
      ]);

      setStats(statsResponse || {
        pendingCount: 0,
        gradedCount: 0,
        submittedCount: 0,
        reviewedCount: 0,
        recentPending: []
      });
      setSubmissions(submissionsResponse || {
        submissionsByQuiz: {},
        total: 0,
        page: 1,
        totalPages: 1
      });
    } catch (err) {
      setError(err.message || 'Failed to load grading data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submissionId) => {
    navigate(`/lecturer/grading/${submissionId}`);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to page 1 when filters change
    }));
  };

  if (loading && Object.keys(submissions).length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manual Grading Dashboard</h1>
        <p className="text-gray-600">Review and grade structured and essay questions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Graded</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.gradedCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Auto-Graded</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.submittedCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Reviewed</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.reviewedCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="Filter by module code..."
              value={filters.moduleCode}
              onChange={(e) => handleFilterChange('moduleCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <button
            onClick={() => setFilters({ moduleCode: '', page: 1 })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Submissions by Quiz */}
      <div className="space-y-6">
        {Object.keys(submissions?.submissionsByQuiz || {}).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Reviews</h3>
            <p className="text-gray-600">
              All submissions have been graded or there are no submissions requiring manual review.
            </p>
          </div>
        ) : (
          Object.values(submissions?.submissionsByQuiz || {}).map((quizGroup) => (
            <div key={quizGroup.quiz._id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              {/* Quiz Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{quizGroup.quiz.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{quizGroup.quiz.description}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {quizGroup.module?.moduleCode}
                      </span>
                      <span className="text-xs text-gray-500">
                        {quizGroup.submissions.length} submission{quizGroup.submissions.length !== 1 ? 's' : ''} pending
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submissions List */}
              <div className="divide-y divide-gray-200">
                {quizGroup.submissions.map((submission) => (
                  <div key={submission._id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{submission.studentName}</h4>
                          <p className="text-xs text-gray-500">{submission.studentEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Questions Requiring Review</p>
                          <p className="text-sm font-medium text-orange-600">{submission.structuredEssayCount}</p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-500">Time Taken</p>
                          <p className="text-sm font-medium text-gray-900">{submission.timeTaken} min</p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-500">Submitted</p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(submission.submittedAt)}</p>
                        </div>

                        <button
                          onClick={() => handleViewSubmission(submission._id)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Grade
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Activity */}
      {stats?.recentPending && stats?.recentPending.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Pending Submissions</h3>
          <div className="space-y-3">
            {(stats?.recentPending || []).map((submission) => (
              <div key={submission._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{submission.studentName}</p>
                  <p className="text-xs text-gray-500">{submission.quizTitle} • {submission.moduleCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{formatDate(submission.submittedAt)}</p>
                  <button
                    onClick={() => handleViewSubmission(submission._id)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Review →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingDashboard;