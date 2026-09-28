import { useState, useEffect, useCallback } from 'react';
import { ASSET_BASE_URL } from '../../services/apiConfig';
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle, AlertCircle } from 'lucide-react';

const QuizInterface = ({ quiz, questions, onSubmitQuiz }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(quiz.duration * 60); // Convert to seconds
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleMCQAnswer = (questionId, optionIndex) => {
    const question = questions[currentQuestionIndex];
    if (question.type === 'MCQ') {
      handleAnswerChange(questionId, optionIndex);
    }
  };

  const toggleFlag = (questionIndex) => {
    setFlaggedQuestions(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(questionIndex)) {
        newFlagged.delete(questionIndex);
      } else {
        newFlagged.add(questionIndex);
      }
      return newFlagged;
    });
  };

  const goToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleSubmitQuiz = useCallback(() => {
    const submissionData = {
      quizId: quiz._id,
      answers: answers,
      timeSpent: (quiz.duration * 60) - timeRemaining,
      submittedAt: new Date().toISOString()
    };
    onSubmitQuiz(submissionData);
  }, [quiz, answers, timeRemaining, onSubmitQuiz]);

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const isQuestionAnswered = (questionIndex) => {
    const question = questions[questionIndex];
    return answers.hasOwnProperty(question._id);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?._id] || '';

  if (!currentQuestion) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Question Navigation Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
          <p className="text-sm text-gray-600">{quiz.moduleCode}</p>
        </div>
        
        {/* Timer */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-center">
            <div className={`text-center p-3 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
              <Clock className="w-5 h-5 mx-auto mb-1" />
              <div className="text-lg font-mono font-bold">{formatTime(timeRemaining)}</div>
              <div className="text-xs">Time Remaining</div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="p-4 border-b border-gray-200">
          <div className="text-sm text-gray-600 mb-2">
            Progress: {getAnsweredCount()}/{questions.length}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(getAnsweredCount() / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Grid */}
        <div className="p-4">
          <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
            {questions.map((question, index) => (
              <button
                key={question._id}
                onClick={() => goToQuestion(index)}
                className={`
                  relative w-10 h-10 rounded text-xs font-medium transition-all duration-200
                  ${index === currentQuestionIndex
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                    : isQuestionAnswered(index)
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {index + 1}
                {flaggedQuestions.has(index) && (
                  <Flag className="absolute -top-1 -right-1 w-3 h-3 text-orange-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500"
          >
            Submit Quiz
          </button>
        </div>
      </div>

      {/* Main Question Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <p className="text-sm text-gray-600">
                {currentQuestion.type} - {currentQuestion.difficulty}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => toggleFlag(currentQuestionIndex)}
                className={`p-2 rounded-lg transition-colors ${
                  flaggedQuestions.has(currentQuestionIndex)
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title="Flag for review"
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Question Text */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
              <div className="prose max-w-none">
                <p className="text-gray-900 text-lg leading-relaxed mb-4">
                  {currentQuestion.questionText}
                </p>
                
                {/* Question Image */}
                {currentQuestion.image && (
                  <div className="my-4">
                    <img
                      src={`${ASSET_BASE_URL}/uploads/${currentQuestion.image}`}
                      alt="Question"
                      className="max-w-full h-auto rounded-lg border border-gray-200"
                    />
                  </div>
                )}

                {/* Equations */}
                {currentQuestion.equations && currentQuestion.equations.length > 0 && (
                  <div className="my-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Related equations:</p>
                    {currentQuestion.equations.map((equation, index) => (
                      <div key={index} className="font-mono text-sm bg-white p-2 rounded border mb-2">
                        {equation}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Answer Section */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              {currentQuestion.type === 'MCQ' ? (
                /* Multiple Choice Options */
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 mb-4">Choose the correct answer:</p>
                  {currentQuestion.options.map((option, index) => (
                    <label
                      key={index}
                      className={`
                        flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                        ${currentAnswer === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name={`question_${currentQuestion._id}`}
                        value={index}
                        checked={currentAnswer === index}
                        onChange={() => handleMCQAnswer(currentQuestion._id, index)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="ml-3 text-gray-900">
                        <span className="font-medium mr-2">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        {option.text}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                /* Text Answer for Structured/Essay */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Your Answer:
                  </label>
                  <textarea
                    value={currentAnswer}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={currentQuestion.type === 'Essay' ? 10 : 6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {currentAnswer.length} characters
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </button>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {isQuestionAnswered(currentQuestionIndex) ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Answered
                </div>
              ) : (
                <div className="flex items-center text-orange-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Not answered
                </div>
              )}
            </div>

            <button
              onClick={() => goToQuestion(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Quiz?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to submit your quiz? You have answered {getAnsweredCount()} out of {questions.length} questions.
            </p>
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Continue Quiz
              </button>
              <button
                onClick={handleSubmitQuiz}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizInterface;
