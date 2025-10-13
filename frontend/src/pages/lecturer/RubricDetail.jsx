import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rubricService } from '../../services/rubricService';
import { 
  ArrowLeft, 
  Edit3, 
  Trash2,
  Target,
  BookOpen,
  Award,
  Star,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const RubricDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rubric, setRubric] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadRubric();
  }, [id]);

  const loadRubric = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await rubricService.getRubricById(id);
      
      if (response && response.success) {
        setRubric(response.rubric);
      } else {
        setError('Failed to load rubric');
      }
    } catch (err) {
      console.error('Load rubric error:', err);
      if (err.message.includes('404')) {
        setError('Rubric not found');
      } else if (err.message.includes('403')) {
        setError('Access denied. You can only view your own rubrics.');
      } else {
        setError(err.message || 'Failed to load rubric');
      }
    } finally {
      setLoading(false);
    }
  };

  // Duplicate functionality removed as per requirements

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this rubric? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      await rubricService.deleteRubric(id);
      setSuccessMessage('Rubric deleted successfully!');
      setTimeout(() => {
        navigate('/lecturer/rubrics');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to delete rubric');
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

  const calculateMaxPoints = (criterion) => {
    if (!criterion.performanceLevels || criterion.performanceLevels.length === 0) {
      return 0;
    }
    return Math.max(...criterion.performanceLevels.map(level => level.points || 0));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !rubric) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/lecturer/rubrics')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rubrics
          </button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!rubric) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Rubric Not Found</h3>
        <p className="text-gray-600 mb-4">The rubric you're looking for could not be loaded.</p>
        <button
          onClick={() => navigate('/lecturer/rubrics')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rubrics
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/lecturer/rubrics')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rubrics
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/lecturer/rubrics/edit/${id}`)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </button>
          
          
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
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

      {/* Rubric Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{rubric.title}</h1>
                {rubric.description && (
                  <p className="text-gray-600 mt-1">{rubric.description}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Module</p>
                <p className="font-medium text-gray-900">
                  {rubric.moduleId ? `${rubric.moduleId.moduleCode} - ${rubric.moduleId.moduleName}` : 'All Modules'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Question Types</p>
                <p className="font-medium text-gray-900">
                  {rubric.questionTypes?.join(', ') || 'Not specified'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Total Points</p>
                <p className="font-medium text-gray-900">{rubric.totalPoints || 0}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Criteria</p>
                <p className="font-medium text-gray-900">{rubric.criteria?.length || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            {rubric.isTemplate && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Award className="w-3 h-3 mr-1" />
                Template
              </span>
            )}
            
            <p className="text-xs text-gray-500">
              Created: {formatDate(rubric.createdAt)}
            </p>
            
            {rubric.updatedAt && rubric.updatedAt !== rubric.createdAt && (
              <p className="text-xs text-gray-500">
                Updated: {formatDate(rubric.updatedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Criteria */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Grading Criteria</h2>
        
        {rubric.criteria && rubric.criteria.length > 0 ? (
          <div className="space-y-6">
            {rubric.criteria.map((criterion, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{criterion.name}</h3>
                    {criterion.description && (
                      <p className="text-gray-600 mt-1">{criterion.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Weight: {criterion.weight || 100}%</span>
                    <span>Max Points: {calculateMaxPoints(criterion)}</span>
                  </div>
                </div>
                
                {/* Performance Levels */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Performance Levels</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Level
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Points
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {criterion.performanceLevels && criterion.performanceLevels
                          .sort((a, b) => (b.points || 0) - (a.points || 0))
                          .map((level, levelIndex) => (
                          <tr key={levelIndex} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900">
                                  {level.level}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-900 font-semibold">
                                {level.points || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600">
                                {level.description || 'No description provided'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No criteria defined for this rubric</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RubricDetail;