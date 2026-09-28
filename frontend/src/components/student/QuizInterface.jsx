// frontend/src/components/student/QuizInterface.jsx

import { useState, useEffect, useCallback } from 'react';
import { ASSET_BASE_URL } from '../../services/apiConfig';
import { Clock, BookOpen, ChevronLeft, ChevronRight, Flag, CheckCircle, AlertTriangle } from 'lucide-react';

const QuizInterface = ({ quiz, questions, onSubmitQuiz }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [startTime] = useState(Date.now());
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [quizEndTime, setQuizEndTime] = useState(null);

  // Calculate quiz end time based on duration and quiz end time
  useEffect(() => {
    const now = Date.now();
    const quizDurationMs = quiz.duration * 60 * 1000; // Convert minutes to milliseconds
    const quizActualEndTime = new Date(quiz.endDateTime).getTime();
    
    // Student gets full duration OR until quiz ends, whichever comes first
    const studentQuizEndTime = Math.min(now + quizDurationMs, quizActualEndTime);
    
    setQuizEndTime(studentQuizEndTime);
    
    // Set initial time remaining
    const remaining = Math.max(0, Math.floor((studentQuizEndTime - now) / 1000));
    setTimeRemaining(remaining);
    
    console.log('Quiz timing calculated:', {
      now: new Date(now).toISOString(),
      duration: quiz.duration + ' minutes',
      quizEndTime: new Date(quizActualEndTime).toISOString(),
      studentEndTime: new Date(studentQuizEndTime).toISOString(),
      timeRemaining: remaining + ' seconds'
    });
  }, [quiz.duration, quiz.endDateTime]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0 || !quizEndTime) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((quizEndTime - now) / 1000));
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        console.log('Time expired - auto-submitting quiz');
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [quizEndTime]);

  // Auto submit when time expires
  const handleAutoSubmit = useCallback(() => {
    console.log('Auto-submitting quiz due to time expiry');
    submitQuizData();
  }, [answers, startTime, onSubmitQuiz]);

  // Submit quiz data
  const submitQuizData = () => {
    console.log('=== FRONTEND QUIZ SUBMISSION ===');
    console.log('Current answers object:', answers);
    
    // Convert answers object to array format expected by backend
    const answersArray = Object.entries(answers).map(([questionId, answer]) => {
      console.log(`Converting: ${questionId} -> ${answer}`);
      return {
        questionId,
        answer
      };
    });

    console.log('Converted answers array:', answersArray);

    const submissionData = {
      answers: answersArray,
      timeTaken: Date.now() - startTime,
      startTime: new Date(startTime).toISOString()
    };

    console.log('Final submission data:', submissionData);
    onSubmitQuiz(submissionData);
  };

  // Format time display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get time color based on remaining time
  const getTimeColor = () => {
    const totalTime = quiz.duration * 60; // Total time in seconds
    const percentage = (timeRemaining / totalTime) * 100;
    
    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    if (percentage > 10) return 'text-orange-600';
    return 'text-red-600 animate-pulse';
  };

  // Handle answer change
  const handleAnswerChange = (questionId, answer) => {
    console.log(`Answer changed for question ${questionId}:`, answer);
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: answer
      };
      console.log('Updated answers object:', newAnswers);
      return newAnswers;
    });
  };

  // Toggle question flag
  const toggleFlag = (questionId) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Navigation
  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Handle quiz submission
  const handleSubmitQuiz = () => {
    setShowSubmitConfirm(false);
    submitQuizData();
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{quiz.title}</h1>
                <p className="text-sm text-gray-500">{quiz.moduleCode}</p>
              </div>
            </div>
            
            {/* Timer */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-sm text-gray-500">Questions</div>
                <div className="text-lg font-semibold text-gray-900">
                  {currentQuestionIndex + 1} / {questions.length}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-500">Answered</div>
                <div className="text-lg font-semibold text-gray-900">
                  {answeredCount} / {questions.length}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-500">Time Remaining</div>
                <div className={`text-xl font-bold ${getTimeColor()}`}>
                  <Clock className="w-5 h-5 inline mr-1" />
                  {formatTime(timeRemaining)}
                </div>
              </div>
              
              <button
                onClick={() => setShowSubmitConfirm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Submit Quiz
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="pb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-32">
              <h3 className="font-semibold text-gray-900 mb-4">Question Navigator</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, index) => {
                  const isAnswered = answers[questions[index]._id];
                  const isFlagged = flaggedQuestions.has(questions[index]._id);
                  const isCurrent = index === currentQuestionIndex;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      className={`
                        w-10 h-10 rounded-lg text-sm font-medium relative
                        ${isCurrent ? 'ring-2 ring-blue-500' : ''}
                        ${isAnswered ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
                        hover:bg-blue-50 transition-colors
                      `}
                    >
                      {index + 1}
                      {isFlagged && (
                        <Flag className="w-3 h-3 text-orange-500 absolute -top-1 -right-1" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-green-100 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-3 h-3 bg-gray-100 rounded"></div>
                  <span>Not answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Flag className="w-3 h-3 text-orange-500" />
                  <span>Flagged</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              {/* Question Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded">
                      Question {currentQuestionIndex + 1}
                    </span>
                    <span className={`text-sm font-medium px-2 py-1 rounded ${
                      currentQuestion.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                      currentQuestion.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {currentQuestion.difficulty}
                    </span>
                    <span className="bg-gray-100 text-gray-800 text-sm font-medium px-2 py-1 rounded">
                      {currentQuestion.type}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleFlag(currentQuestion._id)}
                  className={`p-2 rounded-lg transition-colors ${
                    flaggedQuestions.has(currentQuestion._id)
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500'
                  }`}
                  title="Flag for review"
                >
                  <Flag className="w-5 h-5" />
                </button>
              </div>

              {/* Question Content */}
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4 leading-relaxed">
                  {currentQuestion.questionText}
                </h2>
                
                {currentQuestion.image && (
                  <div className="mb-4">
                    <img 
                      src={`${ASSET_BASE_URL}/uploads/${currentQuestion.image}`}
                      alt="Question illustration"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Answer Options */}
              <div className="space-y-3 mb-8">
                {currentQuestion.type === 'MCQ' ? (
                  currentQuestion.options?.map((option, index) => (
                    <label
                      key={option._id}
                      className={`
                        block p-4 border rounded-lg cursor-pointer transition-colors
                        ${answers[currentQuestion._id] === option.text
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name={`question-${currentQuestion._id}`}
                          value={option.text}
                          checked={answers[currentQuestion._id] === option.text}
                          onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-900">{option.text}</span>
                      </div>
                    </label>
                  ))
                ) : (
                  <textarea
                    value={answers[currentQuestion._id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-32"
                  />
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                
                <div className="text-sm text-gray-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
                
                <button
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Submit Quiz
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to submit your quiz? You have answered {answeredCount} out of {questions.length} questions.
                  </p>
                  <p className="text-sm text-red-600 mt-2">
                    This action cannot be undone.
                  </p>
                </div>
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Continue Quiz
                  </button>
                  <button
                    onClick={handleSubmitQuiz}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Submit Quiz
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizInterface;
