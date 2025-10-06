import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gradingService } from '../../services/gradingService';
import { 
  ArrowLeft,
  User,
  Clock,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Save,
  Eye
} from 'lucide-react';

const GradingInterface = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [grades, setGrades] = useState({});

  useEffect(() => {
    loadSubmissionData();
  }, [submissionId]);

  const loadSubmissionData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await gradingService.getSubmissionForGrading(submissionId);
      setSubmission(response.data.submission);
      setAnswers(response.data.answers);

      // Initialize grades with current values
      const initialGrades = {};
      [...response.data.answers.structured, ...response.data.answers.essay].forEach(answer => {
        initialGrades[answer.questionId] = {
          marks: answer.marks || 0,
          maxMarks: answer.maxMarks || 1
        };
      });
      setGrades(initialGrades);

    } catch (err) {
      setError(err.message || 'Failed to load submission data');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (questionId, field, value) => {
    setGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: Math.max(0, parseFloat(value) || 0)
      }
    }));
  };

  const handleSaveGrades = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      // Prepare graded answers
      const gradedAnswers = Object.entries(grades).map(([questionId, grade]) => ({
        questionId,
        marks: grade.marks,
        maxMarks: grade.maxMarks
      }));

      const response = await gradingService.updateManualGrades(submissionId, gradedAnswers);
      
      setSuccessMessage('Grades saved successfully!');
      setTimeout(() => {
        navigate('/lecturer/grading');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotalGrades = () => {
    let totalMarks = 0;
    let totalMaxMarks = 0;

    // Add MCQ scores
    answers.mcq?.forEach(answer => {
      totalMarks += answer.marks || 0;
      totalMaxMarks += answer.maxMarks || 1;
    });

    // Add manual grades
    Object.values(grades).forEach(grade => {
      totalMarks += grade.marks || 0;
      totalMaxMarks += grade.maxMarks || 1;
    });

    const percentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 100) : 0;

    return { totalMarks, totalMaxMarks, percentage };
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

  const renderAnswerCard = (answer, isGradable = false) => {
    const question = answer.questionDetails;
    const currentGrade = grades[answer.questionId] || { marks: 0, maxMarks: 1 };

    return (
      <div key={answer.questionId} className="bg-white border border-gray-200 rounded-lg p-6">
        {/* Question */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              answer.questionType === 'MCQ' ? 'bg-blue-100 text-blue-800' :
              answer.questionType === 'Structured' ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {answer.questionType}
            </span>
            {answer.questionType === 'MCQ' && (
              <span className={`text-sm font-medium ${
                answer.isCorrect ? 'text-green-600' : 'text-red-600'
              }`}>
                {answer.isCorrect ? 'Correct' : 'Incorrect'} ({answer.marks}/{answer.maxMarks})
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">Question:</h3>
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-gray-800">{question?.questionText}</p>
            
            {/* Show equation if available */}
            {question?.equations && question.equations.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Related equations:</p>
                {question.equations.map((equation, index) => (
                  <div key={index} className="font-mono text-sm bg-white p-2 rounded border">
                    {equation}
                  </div>
                ))}
              </div>
            )}

            {/* Show image if available */}
            {question?.image && (
              <div className="mt-3">
                <img
                  src={`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/uploads/${question.image}`}
                  alt="Question"
                  className="max-w-md h-auto border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Student Answer */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Student's Answer:</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {answer.questionType === 'MCQ' ? (
              <div>
                <p className="text-gray-800">Selected: <strong>{answer.studentAnswer}</strong></p>
                <p className="text-sm text-gray-600 mt-1">
                  Correct Answer: <strong>{answer.correctAnswer}</strong>
                </p>
              </div>
            ) : (
              <p className="text-gray-800 whitespace-pre-wrap">{answer.studentAnswer || 'No answer provided'}</p>
            )}
          </div>
        </div>

        {/* Model Answer (for non-MCQ) */}
        {answer.questionType !== 'MCQ' && question?.correctAnswer && (
          <div className="mb-4">
            <h4 className="text-md font-medium text-gray-900 mb-2">Model Answer:</h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">{question.correctAnswer}</p>
            </div>
          </div>
        )}

        {/* Grading Section */}
        {isGradable && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Grade this Answer:</h4>
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marks Awarded
                </label>
                <input
                  type="number"
                  min="0"
                  max={currentGrade.maxMarks}
                  step="0.5"
                  value={currentGrade.marks}
                  onChange={(e) => handleGradeChange(answer.questionId, 'marks', e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="text-lg font-medium text-gray-900">/</div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Marks
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={currentGrade.maxMarks}
                  onChange={(e) => handleGradeChange(answer.questionId, 'maxMarks', e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="ml-4">
                <span className="text-sm text-gray-600">
                  Percentage: {currentGrade.maxMarks > 0 ? Math.round((currentGrade.marks / currentGrade.maxMarks) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const totalGrades = calculateTotalGrades();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/lecturer/grading')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Grading Dashboard
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Total</p>
            <p className="text-lg font-semibold text-gray-900">
              {totalGrades.totalMarks}/{totalGrades.totalMaxMarks} ({totalGrades.percentage}%)
            </p>
          </div>
          
          <button
            onClick={handleSaveGrades}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Grades
              </>
            )}
          </button>
        </div>
      </div>

      {/* Student Information */}
      {submission && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{submission.student.firstName} {submission.student.lastName}</h2>
                <p className="text-gray-600">{submission.student.email}</p>
              </div>
            </div>
            
            <div className="text-right">
              <h3 className="text-lg font-medium text-gray-900">{submission.quiz.title}</h3>
              <p className="text-gray-600">{submission.module.moduleCode}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="inline-flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {submission.timeTaken} minutes
                </span>
                <span className="text-sm text-gray-500">
                  Submitted: {formatDate(submission.submittedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Grading Sections */}
      <div className="grid grid-cols-1 gap-6">
        {/* MCQ Questions (Read-only) */}
        {answers.mcq && answers.mcq.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Multiple Choice Questions (Auto-graded)
            </h2>
            <div className="space-y-4">
              {answers.mcq.map(answer => renderAnswerCard(answer, false))}
            </div>
          </div>
        )}

        {/* Structured Questions */}
        {answers.structured && answers.structured.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Structured Questions (Requires Manual Grading)
            </h2>
            <div className="space-y-4">
              {answers.structured.map(answer => renderAnswerCard(answer, true))}
            </div>
          </div>
        )}

        {/* Essay Questions */}
        {answers.essay && answers.essay.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Essay Questions (Requires Manual Grading)
            </h2>
            <div className="space-y-4">
              {answers.essay.map(answer => renderAnswerCard(answer, true))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">MCQ Questions</p>
            <p className="text-lg font-semibold text-blue-600">{answers.mcq?.length || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Manual Grading Required</p>
            <p className="text-lg font-semibold text-orange-600">
              {(answers.structured?.length || 0) + (answers.essay?.length || 0)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Final Score</p>
            <p className="text-lg font-semibold text-green-600">
              {totalGrades.totalMarks}/{totalGrades.totalMaxMarks} ({totalGrades.percentage}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradingInterface;