//frontend\src\pages\lecturer\GradingDashboard.jsx


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
  Eye,
  Lock
} from 'lucide-react';

const GradingDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'graded' | 'finalized'
  const [stats, setStats] = useState({
    pendingCount: 0,
    gradedCount: 0,
    gradedManualCount: 0,
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
  const [gradedSubmissions, setGradedSubmissions] = useState({
    submissionsByQuiz: {},
    total: 0,
    page: 1,
    totalPages: 1
  });
  const [filters, setFilters] = useState({
    moduleCode: '',
    page: 1
  });
  const [actionLoadingId, setActionLoadingId] = useState('');

  useEffect(() => {
    loadGradingData();
  }, [filters, activeTab]);

  const loadGradingData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load stats and submissions based on active tab
      const [statsResponse, submissionsResponse] = await Promise.all([
        gradingService.getGradingStats(),
        activeTab === 'pending' 
          ? gradingService.getPendingSubmissions(filters)
          : activeTab === 'graded'
            ? gradingService.getGradedSubmissions(filters)
            : gradingService.getFinalizedSubmissions(filters)
      ]);

      setStats(statsResponse?.data || {
        pendingCount: 0,
        gradedCount: 0,
        gradedManualCount: 0,
        submittedCount: 0,
        reviewedCount: 0,
        recentPending: []
      });

      if (activeTab === 'pending') {
        setSubmissions(submissionsResponse?.data || {
          submissionsByQuiz: {},
          total: 0,
          page: 1,
          totalPages: 1
        });
      } else if (activeTab === 'graded') {
        setGradedSubmissions(submissionsResponse?.data || {
          submissionsByQuiz: {},
          total: 0,
          page: 1,
          totalPages: 1
        });
      } else {
        // reuse gradedSubmissions state shape for finalized view as well
        setGradedSubmissions(submissionsResponse?.data || {
          submissionsByQuiz: {},
          total: 0,
          page: 1,
          totalPages: 1
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load grading data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewSubmission = (submissionId) => {
    navigate(`/lecturer/grading/${submissionId}`);
  };

  const handleFinalize = async (submissionId) => {
    try {
      setActionLoadingId(submissionId);
      setError('');
      await gradingService.finalizeSubmission(submissionId);
      await loadGradingData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to finalize submission');
    } finally {
      setActionLoadingId('');
    }
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
              <p className="text-sm font-medium text-gray-600">Graded (Manual)</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.gradedManualCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Graded</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.gradedCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Auto-Graded</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.submittedCount || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Pending Review ({stats?.pendingCount || 0})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('graded')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'graded'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Needs Finalization ({stats?.gradedManualCount || 0})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('finalized')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'finalized'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4" />
                <span>Finalized ({stats?.reviewedCount || 0})</span>
              </div>
            </button>
          </nav>
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
        {(() => {
          const currentSubmissions = activeTab === 'pending' ? submissions : gradedSubmissions;
          const isEmpty = Object.keys(currentSubmissions?.submissionsByQuiz || {}).length === 0;

          if (isEmpty) {
            return (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                {activeTab === 'pending' ? (
                  <>
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Reviews</h3>
                    <p className="text-gray-600">
                      All submissions have been graded or there are no submissions requiring manual review.
                    </p>
                  </>
                ) : activeTab === 'graded' ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions need finalization</h3>
                    <p className="text-gray-600">Graded submissions that include Structured/Essay will appear here until you finalize them.</p>
                    <div className="mt-4 flex items-center justify-center space-x-3">
                      <button onClick={() => setActiveTab('pending')} className="text-sm text-blue-600 hover:text-blue-700">Go to Pending Review</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => setActiveTab('finalized')} className="text-sm text-blue-600 hover:text-blue-700">View Finalized</button>
                      <span className="text-gray-300">|</span>
                      <button onClick={() => loadGradingData()} className="text-sm text-blue-600 hover:text-blue-700">Refresh</button>
                    </div>
                  </>
                ) : (
                  <>
                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Finalized (Published) Submissions</h3>
                    <p className="text-gray-600">Finalize graded submissions to publish results here.</p>
                  </>
                )}
              </div>
            );
          }

          return Object.values(currentSubmissions?.submissionsByQuiz || {}).map((quizGroup) => (
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
                        {quizGroup.submissions.length} submission{quizGroup.submissions.length !== 1 ? 's' : ''} {activeTab === 'pending' ? 'pending' : 'graded'}
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
                        {activeTab === 'pending' ? (
                          <>
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
                          </>
                        ) : (
                          <>
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Manual Questions</p>
                              <p className="text-sm font-medium text-green-600">{submission.manualQuestions}</p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-gray-500">Current Score</p>
                              <p className="text-sm font-medium text-gray-900">{submission.score}/{submission.totalMarks}</p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-gray-500">Grade</p>
                              <p className="text-sm font-medium text-gray-900">{submission.grade} ({submission.percentage}%)</p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-gray-500">Last Graded</p>
                              <p className="text-sm font-medium text-gray-900">{formatDate(submission.gradedAt)}</p>
                            </div>
                          </>
                        )}

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewSubmission(submission._id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            {activeTab === 'pending' ? 'Grade' : activeTab === 'graded' ? 'Review' : 'View'}
                          </button>

                          {activeTab === 'graded' && (
                            <button
                              onClick={() => handleFinalize(submission._id)}
                              disabled={actionLoadingId === submission._id}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              {actionLoadingId === submission._id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                  Finalizing...
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 mr-1" />
                                  Finalize
                                </>
                              )}
                            </button>
                          )}

                          {activeTab === 'finalized' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                              <Lock className="w-3 h-3 mr-1" /> Locked • Published
                            </span>
                          )}

                          {activeTab === 'graded' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800">
                              Editable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}
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