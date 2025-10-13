import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { rubricService } from '../../services/rubricService';
import { moduleService } from '../../services/moduleService';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Filter,
  BookOpen,
  Target,
  Award,
  Eye,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const RubricManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rubrics, setRubrics] = useState([]);
  const [modules, setModules] = useState([]);
  const [filters, setFilters] = useState({
    moduleId: '',
    questionType: '',
    isTemplate: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [rubricsResponse, modulesResponse] = await Promise.all([
        rubricService.getRubrics(filters),
        moduleService.getModules()
      ]);

      // Handle the response safely
      if (rubricsResponse && typeof rubricsResponse === 'object' && rubricsResponse.success) {
        setRubrics(Array.isArray(rubricsResponse.rubrics) ? rubricsResponse.rubrics : []);
      } else if (rubricsResponse && Array.isArray(rubricsResponse)) {
        // In case the response is directly an array
        setRubrics(rubricsResponse);
      } else {
        console.warn('Unexpected rubrics response format:', rubricsResponse);
        setRubrics([]);
      }

      if (modulesResponse && typeof modulesResponse === 'object' && modulesResponse.success) {
        setModules(Array.isArray(modulesResponse.modules) ? modulesResponse.modules : []);
      } else if (modulesResponse && Array.isArray(modulesResponse)) {
        // In case the response is directly an array
        setModules(modulesResponse);
      } else {
        console.warn('Unexpected modules response format:', modulesResponse);
        setModules([]);
      }
    } catch (err) {
      console.error('Load data error:', err);
      let errorMessage = 'Failed to load data';
      
      if (err.message.includes('401')) {
        errorMessage = 'Please log in to access rubrics';
      } else if (err.message.includes('403')) {
        errorMessage = 'Access denied. Lecturer privileges required.';
      } else if (err.message.includes('Cannot read properties of undefined')) {
        errorMessage = 'Server response format error. Please try refreshing the page.';
      } else {
        errorMessage = err.message || 'Failed to load data';
      }
      
      setError(errorMessage);
      setRubrics([]);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDeleteRubric = async (rubricId, rubricTitle) => {
    if (!window.confirm(`Are you sure you want to delete the rubric "${rubricTitle}"?`)) {
      return;
    }

    try {
      await rubricService.deleteRubric(rubricId);
      setSuccessMessage('Rubric deleted successfully');
      loadData(); // Reload data
    } catch (err) {
      setError(err.message || 'Failed to delete rubric');
    }
  };

  // Duplicate functionality removed as per requirements

  const getRubricTypeIcon = (questionTypes) => {
    if (questionTypes.includes('Essay') && questionTypes.includes('Structured')) {
      return <Award className="w-5 h-5 text-purple-600" />;
    } else if (questionTypes.includes('Essay')) {
      return <BookOpen className="w-5 h-5 text-blue-600" />;
    } else {
      return <Target className="w-5 h-5 text-green-600" />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rubric Management</h1>
          <p className="text-gray-600">Create and manage grading rubrics for structured and essay questions</p>
        </div>
        <button
          onClick={() => navigate('/lecturer/rubrics/create')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rubric
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Rubrics</p>
              <p className="text-2xl font-bold text-gray-900">{rubrics.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Templates</p>
              <p className="text-2xl font-bold text-gray-900">
                {rubrics.filter(r => r.isTemplate).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Award className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Essay Rubrics</p>
              <p className="text-2xl font-bold text-gray-900">
                {rubrics.filter(r => r.questionTypes.includes('Essay')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <Target className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Structured Rubrics</p>
              <p className="text-2xl font-bold text-gray-900">
                {rubrics.filter(r => r.questionTypes.includes('Structured')).length}
              </p>
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
            <select
              value={filters.moduleId}
              onChange={(e) => handleFilterChange('moduleId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">All Modules</option>
              {modules.map(module => (
                <option key={module._id} value={module._id}>
                  {module.moduleCode} - {module.moduleName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 max-w-xs">
            <select
              value={filters.questionType}
              onChange={(e) => handleFilterChange('questionType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">All Question Types</option>
              <option value="Essay">Essay Questions</option>
              <option value="Structured">Structured Questions</option>
            </select>
          </div>

          <div className="flex-1 max-w-xs">
            <select
              value={filters.isTemplate}
              onChange={(e) => handleFilterChange('isTemplate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">All Rubrics</option>
              <option value="true">Templates Only</option>
              <option value="false">Regular Rubrics</option>
            </select>
          </div>

          <button
            onClick={() => setFilters({ moduleId: '', questionType: '', isTemplate: '' })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Rubrics List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {rubrics.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Rubrics Found</h3>
            <p className="text-gray-600 mb-6">
              Create your first rubric to start using structured grading for essay and structured questions.
            </p>
            <button
              onClick={() => navigate('/lecturer/rubrics/create')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Rubric
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rubrics.map((rubric) => (
              <div key={rubric._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getRubricTypeIcon(rubric.questionTypes)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">{rubric.title}</h3>
                        {rubric.isTemplate && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Template
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{rubric.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-gray-500">
                          {rubric.moduleId ? `${rubric.moduleId.moduleCode}` : 'General'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {rubric.questionTypes.join(', ')} Questions
                        </span>
                        <span className="text-xs text-gray-500">
                          {rubric.criteria.length} Criteria
                        </span>
                        <span className="text-xs text-gray-500">
                          Max: {rubric.totalPoints} points
                        </span>
                        <span className="text-xs text-gray-500">
                          Created: {formatDate(rubric.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => navigate(`/lecturer/rubrics/${rubric._id}`)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    
                    <button
                      onClick={() => navigate(`/lecturer/rubrics/edit/${rubric._id}`)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </button>
                    
                    
                    <button
                      onClick={() => handleDeleteRubric(rubric._id, rubric.title)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RubricManagement;