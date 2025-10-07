import { useState, useEffect } from 'react';
import { quizService } from '../../services/quizService';
import { moduleService } from '../../services/moduleService';
import { questionService } from '../../services/questionService';
import { BarChart3, Users, TrendingUp, Award, CheckCircle, XCircle, Target, Filter, Eye, Trash2 } from 'lucide-react';

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    moduleCode: 'all',
    timeRange: '30d'
  });
  const [modules, setModules] = useState([]);

  // Smart display function for correct answers column
  const getSmartAnswerDisplay = (submission) => {
    const { mcqCount = 0, structuredCount = 0, essayCount = 0, mcqCorrect = 0, mcqRate = 0 } = submission;
    const totalManualQuestions = structuredCount + essayCount;
    
    if (mcqCount > 0 && totalManualQuestions === 0) {
      // MCQ only
      return {
        primary: `${mcqCorrect}/${mcqCount}`,
        secondary: `${mcqRate}%`,
        color: mcqRate >= 80 ? 'bg-green-100 text-green-800' :
               mcqRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
               'bg-red-100 text-red-800'
      };
    } else if (mcqCount === 0 && totalManualQuestions > 0) {
      // Manual questions only (Structured/Essay)
      const questionTypes = [];
      if (structuredCount > 0) questionTypes.push(`${structuredCount} Structured`);
      if (essayCount > 0) questionTypes.push(`${essayCount} Essay${essayCount > 1 ? 's' : ''}`);
      
      return {
        primary: questionTypes.join(', '),
        secondary: 'Manual Review',
        color: 'bg-blue-100 text-blue-800'
      };
    } else if (mcqCount > 0 && totalManualQuestions > 0) {
      // Mixed questions
      const manualParts = [];
      if (structuredCount > 0) manualParts.push(`${structuredCount} Structured`);
      if (essayCount > 0) manualParts.push(`${essayCount} Essay${essayCount > 1 ? 's' : ''}`);
      
      return {
        primary: `${mcqCorrect}/${mcqCount} MCQ`,
        secondary: manualParts.join(', '),
        color: 'bg-purple-100 text-purple-800'
      };
    } else {
      // Fallback for edge cases
      return {
        primary: '0 Questions',
        secondary: '',
        color: 'bg-gray-100 text-gray-800'
      };
    }
  };

  useEffect(() => {
    fetchModules();
    fetchAnalytics();
  }, [filters]);

  const fetchModules = async () => {
    try {
      const response = await moduleService.getModules();
      setModules(response.modules || []);
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await quizService.getAnalytics(filters);
      console.log('Analytics response:', response.analytics);
      console.log('Question analytics:', response.analytics?.questionAnalytics);
      setAnalytics(response.analytics);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade) => {
    const colors = {
      'A+': 'bg-green-100 text-green-800',
      'A': 'bg-green-100 text-green-700',
      'A-': 'bg-green-100 text-green-600',
      'B+': 'bg-blue-100 text-blue-800',
      'B': 'bg-blue-100 text-blue-700',
      'B-': 'bg-blue-100 text-blue-600',
      'C+': 'bg-yellow-100 text-yellow-800',
      'C': 'bg-yellow-100 text-yellow-700',
      'C-': 'bg-yellow-100 text-yellow-600',
      'D+': 'bg-orange-100 text-orange-800',
      'D': 'bg-orange-100 text-orange-700',
      'F': 'bg-red-100 text-red-800'
    };
    return colors[grade] || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Easy': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Hard': 'bg-red-100 text-red-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteQuestion = async (questionId, questionText) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this question?\n\n"${questionText.substring(0, 100)}${questionText.length > 100 ? '...' : ''}"\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      console.log('Deleting question with ID:', questionId);
      
      await questionService.deleteQuestion(questionId);
      
      // Show success message
      alert('Question deleted successfully');
      
      // Refresh analytics data to update the challenging questions list
      await fetchAnalytics();
    } catch (error) {
      console.error('Error deleting question:', error);
      alert(`Failed to delete question: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
          Analytics Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Monitor student performance and quiz analytics with detailed insights</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex space-x-4">
            <select
              value={filters.moduleCode}
              onChange={(e) => setFilters(prev => ({ ...prev, moduleCode: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Modules</option>
              {modules.map(module => (
                <option key={module._id} value={module.moduleCode}>
                  {module.moduleCode} - {module.moduleName}
                </option>
              ))}
            </select>
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Submissions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.overallStats?.totalSubmissions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Auto-Graded Answers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.overallStats?.correctAnswers || 0}</p>
              <p className="text-xs text-gray-500">
                {analytics?.overallStats?.correctAnswerRate || 0}% success rate
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.overallStats?.averageScore || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">{analytics?.overall?.totalQuestions || 0}</p>
              <p className="text-xs text-gray-500">
                {analytics?.overall?.uniqueStudents || 0} students
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Grade Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
          <div className="space-y-3">
            {analytics?.gradeDistribution?.map(item => (
              <div key={item._id} className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(item._id)}`}>
                  Grade {item._id}
                </span>
                <span className="text-gray-600">{item.count} students</span>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">No grade data available</p>
            )}
          </div>
        </div>

        {/* Module Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Performance</h3>
          <div className="space-y-4">
            {analytics?.modulePerformance?.map(module => (
              <div key={module.moduleCode} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{module.moduleCode}</p>
                    <p className="text-sm text-gray-600">
                      {module.uniqueStudents} students • {module.correctAnswers}/{module.totalQuestions} correct
                    </p>
                    <p className="text-xs text-green-600">
                      {module.correctAnswerRate}% correct rate
                    </p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{module.averageScore}%</span>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">No module data available</p>
            )}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-3">
            {analytics?.topPerformers?.slice(0, 5).map((performer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{performer.studentName}</p>
                    <p className="text-sm text-gray-600">
                      {performer.totalQuizzes} quizzes • {performer.correctAnswers}/{performer.totalQuestions} correct
                    </p>
                    <p className="text-xs text-green-600">
                      {performer.correctAnswerRate}% correct rate
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">{performer.averageScore}%</span>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">No performance data available</p>
            )}
          </div>
        </div>

        {/* Performance Trends */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Performance Trends</h3>
          <div className="space-y-3">
            {analytics?.performanceTrends?.map(trend => (
              <div key={trend.date} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{trend.date}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{trend.averageScore}%</span>
                  <span className="text-xs text-green-600">
                    {trend.correctAnswerRate}% correct
                  </span>
                  <span className="text-xs text-gray-500">({trend.submissions} submissions)</span>
                </div>
              </div>
            )) || (
              <p className="text-gray-500 text-center py-4">No trend data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Question Analytics */}
      {analytics?.questionAnalytics?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Challenging Questions</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correct
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Success Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.questionAnalytics.map((question, index) => {
                  // Handle both possible field names for question ID
                  const questionId = question.questionId || question._id;
                  
                  console.log('Question data:', {
                    index,
                    questionId,
                    questionText: question.questionText?.substring(0, 50),
                    questionType: question.questionType,
                    attempts: question.attempts,
                    successRate: question.successRate
                  });
                  
                  return (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {question.questionText}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {question.questionType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.attempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.correctCount}/{question.attempts}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        question.successRate >= 80 ? 'bg-green-100 text-green-800' :
                        question.successRate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.successRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {questionId && question.canDelete ? (
                        <button
                          onClick={() => handleDeleteQuestion(questionId, question.questionText)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1 rounded-full transition-colors duration-200"
                          title={`Delete Question (ID: ${questionId})`}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : questionId ? (
                        <span className="text-gray-400" title="Question cannot be deleted (not owned by you or already deleted)">
                          <Trash2 size={16} />
                        </span>
                      ) : (
                        <span className="text-gray-400" title="Question ID not available">
                          <Trash2 size={16} />
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Submissions</h3>
        {analytics?.recentSubmissions?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quiz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Module
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correct Answers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.recentSubmissions.map((submission, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {submission.studentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {submission.quizTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {submission.moduleCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        {(() => {
                          const displayData = getSmartAnswerDisplay(submission);
                          return (
                            <>
                              <span className="font-medium">{displayData.primary}</span>
                              {displayData.secondary && (
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${displayData.color}`}>
                                  {displayData.secondary}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {submission.percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(submission.grade)}`}>
                        {submission.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {submission.timeTaken} min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(submission.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No submissions available yet</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;