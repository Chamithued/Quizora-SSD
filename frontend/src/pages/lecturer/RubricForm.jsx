import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rubricService } from '../../services/rubricService';
import { moduleService } from '../../services/moduleService';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save,
  AlertCircle,
  CheckCircle,
  Target,
  Star
} from 'lucide-react';

const RubricForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modules, setModules] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    moduleId: '',
    questionTypes: [],
    isTemplate: false,
    tags: [],
    criteria: [
      {
        name: '',
        description: '',
        weight: 100,
        performanceLevels: [
          { level: 'Excellent', points: 4, description: '' },
          { level: 'Good', points: 3, description: '' },
          { level: 'Fair', points: 2, description: '' },
          { level: 'Poor', points: 1, description: '' }
        ]
      }
    ]
  });

  useEffect(() => {
    loadModules();
    if (isEditing) {
      loadRubric();
    }
  }, [id]);

  const loadModules = async () => {
    try {
      const response = await moduleService.getModules();
      setModules(response.modules || []);
    } catch (err) {
      console.error('Failed to load modules:', err);
    }
  };

  const loadRubric = async () => {
    try {
      setLoading(true);
      const response = await rubricService.getRubricById(id);
      const rubric = response.rubric;
      
      setFormData({
        title: rubric.title,
        description: rubric.description || '',
        moduleId: rubric.moduleId?._id || '',
        questionTypes: rubric.questionTypes,
        isTemplate: rubric.isTemplate,
        tags: rubric.tags || [],
        criteria: rubric.criteria.map(criterion => ({
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
          performanceLevels: criterion.performanceLevels.map(level => ({
            level: level.level,
            points: level.points,
            description: level.description
          }))
        }))
      });
    } catch (err) {
      setError(err.message || 'Failed to load rubric');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionTypeChange = (questionType, checked) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: checked 
        ? [...prev.questionTypes, questionType]
        : prev.questionTypes.filter(type => type !== questionType)
    }));
  };

  const handleCriterionChange = (criterionIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, index) => 
        index === criterionIndex 
          ? { ...criterion, [field]: value }
          : criterion
      )
    }));
  };

  const handlePerformanceLevelChange = (criterionIndex, levelIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, cIndex) => 
        cIndex === criterionIndex 
          ? {
              ...criterion,
              performanceLevels: criterion.performanceLevels.map((level, lIndex) =>
                lIndex === levelIndex
                  ? { ...level, [field]: value }
                  : level
              )
            }
          : criterion
      )
    }));
  };

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      criteria: [
        ...prev.criteria,
        {
          name: '',
          description: '',
          weight: 100,
          performanceLevels: [
            { level: 'Excellent', points: 4, description: '' },
            { level: 'Good', points: 3, description: '' },
            { level: 'Fair', points: 2, description: '' },
            { level: 'Poor', points: 1, description: '' }
          ]
        }
      ]
    }));
  };

  const removeCriterion = (criterionIndex) => {
    if (formData.criteria.length <= 1) {
      setError('At least one criterion is required');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, index) => index !== criterionIndex)
    }));
  };

  const addPerformanceLevel = (criterionIndex) => {
    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, index) => 
        index === criterionIndex 
          ? {
              ...criterion,
              performanceLevels: [
                ...criterion.performanceLevels,
                { level: '', points: 0, description: '' }
              ]
            }
          : criterion
      )
    }));
  };

  const removePerformanceLevel = (criterionIndex, levelIndex) => {
    const criterion = formData.criteria[criterionIndex];
    if (criterion.performanceLevels.length <= 1) {
      setError('At least one performance level is required per criterion');
      return;
    }

    setFormData(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, cIndex) => 
        cIndex === criterionIndex 
          ? {
              ...criterion,
              performanceLevels: criterion.performanceLevels.filter((_, lIndex) => lIndex !== levelIndex)
            }
          : criterion
      )
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }

    if (formData.questionTypes.length === 0) {
      setError('At least one question type must be selected');
      return false;
    }

    if (formData.criteria.length === 0) {
      setError('At least one criterion is required');
      return false;
    }

    for (let i = 0; i < formData.criteria.length; i++) {
      const criterion = formData.criteria[i];
      
      if (!criterion.name.trim()) {
        setError(`Criterion ${i + 1} name is required`);
        return false;
      }

      // Criterion description is optional - removed validation

      if (criterion.performanceLevels.length === 0) {
        setError(`Criterion ${i + 1} must have at least one performance level`);
        return false;
      }

      for (let j = 0; j < criterion.performanceLevels.length; j++) {
        const level = criterion.performanceLevels[j];
        
        if (!level.level.trim()) {
          setError(`Criterion ${i + 1}, Performance Level ${j + 1} name is required`);
          return false;
        }

        if (level.points === undefined || level.points === null || level.points < 0) {
          setError(`Criterion ${i + 1}, Performance Level ${j + 1} must have valid points (0 or greater)`);
          return false;
        }

        // Performance level description is optional - removed validation
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (isEditing) {
        await rubricService.updateRubric(id, formData);
        setSuccessMessage('Rubric updated successfully!');
      } else {
        await rubricService.createRubric(formData);
        setSuccessMessage('Rubric created successfully!');
      }

      setTimeout(() => {
        navigate('/lecturer/rubrics');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to save rubric');
    } finally {
      setSaving(false);
    }
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
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/lecturer/rubrics')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rubrics
          </button>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Rubric' : 'Create New Rubric'}
        </h1>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rubric Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter rubric title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Module (Optional)
              </label>
              <select
                value={formData.moduleId}
                onChange={(e) => handleInputChange('moduleId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Module (Optional)</option>
                {modules.map(module => (
                  <option key={module._id} value={module._id}>
                    {module.moduleCode} - {module.moduleName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the purpose and usage of this rubric (optional)"
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Question Types *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.questionTypes.includes('Essay')}
                  onChange={(e) => handleQuestionTypeChange('Essay', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Essay Questions</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.questionTypes.includes('Structured')}
                  onChange={(e) => handleQuestionTypeChange('Structured', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Structured Questions</span>
              </label>
            </div>
          </div>

          <div className="mt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isTemplate}
                onChange={(e) => handleInputChange('isTemplate', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Save as Template</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">Templates can be reused to create new rubrics quickly</p>
          </div>
        </div>

        {/* Criteria */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Grading Criteria</h2>
            <button
              type="button"
              onClick={addCriterion}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Criterion
            </button>
          </div>

          <div className="space-y-6">
            {formData.criteria.map((criterion, criterionIndex) => (
              <div key={criterionIndex} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium text-gray-900">
                    Criterion {criterionIndex + 1}
                  </h3>
                  {formData.criteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCriterion(criterionIndex)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Criterion Name *
                    </label>
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(e) => handleCriterionChange(criterionIndex, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="e.g., Content Quality, Organization, Grammar"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={criterion.weight}
                      onChange={(e) => handleCriterionChange(criterionIndex, 'weight', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={criterion.description}
                    onChange={(e) => handleCriterionChange(criterionIndex, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Describe what this criterion evaluates (optional)"
                  />
                </div>

                {/* Performance Levels */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Performance Levels</h4>
                    <button
                      type="button"
                      onClick={() => addPerformanceLevel(criterionIndex)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Add Level
                    </button>
                  </div>

                  <div className="space-y-3">
                    {criterion.performanceLevels.map((level, levelIndex) => (
                      <div key={levelIndex} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={level.level}
                            onChange={(e) => handlePerformanceLevelChange(criterionIndex, levelIndex, 'level', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Level name"
                            required
                          />
                        </div>
                        
                        <div className="w-20">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={level.points}
                            onChange={(e) => handlePerformanceLevelChange(criterionIndex, levelIndex, 'points', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Points"
                            required
                          />
                        </div>
                        
                        <div className="flex-2">
                          <input
                            type="text"
                            value={level.description}
                            onChange={(e) => handlePerformanceLevelChange(criterionIndex, levelIndex, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Description (optional)"
                          />
                        </div>
                        
                        {criterion.performanceLevels.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePerformanceLevel(criterionIndex, levelIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/lecturer/rubrics')}
            className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? 'Update Rubric' : 'Create Rubric'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RubricForm;