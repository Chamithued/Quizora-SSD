// frontend\src\pages\student\StudentDashboard.jsx

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { userService } from "../../services/userService";
import { quizService } from "../../services/quizService";
import { useNavigate, useLocation } from "react-router-dom";
import QuizCard from "../../components/student/QuizCard";
import Marksheet from "../../components/student/Marksheet";

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [availableQuizzes, setAvailableQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    fetchDegreeOptions();
    fetchAvailableQuizzes();

    // Refresh quizzes every 30 seconds to check for new ones or status changes
    const quizRefreshInterval = setInterval(fetchAvailableQuizzes, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(quizRefreshInterval);
    };
  }, []);

  // Show message if redirected from quiz page
  useEffect(() => {
    if (location.state?.message) {
      alert(location.state.message);
      // Clear the message from state
      navigate("/student/dashboard", { replace: true });
    }
  }, [location.state, navigate]);

  const fetchDegreeOptions = async () => {
    try {
      const response = await userService.getDegreeOptions();
      setDegreeOptions(response.degrees);
    } catch (err) {
      console.error("Error fetching degrees:", err);
    }
  };

  const fetchAvailableQuizzes = async () => {
    try {
      setLoading(true);
      const response = await quizService.getStudentQuizzes();
      setAvailableQuizzes(response.quizzes || []);
      setError("");
    } catch (err) {
      console.error("Error fetching quizzes:", err);
      setError(err.message || "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  const getDegreeTitle = (code) => {
    if (!code) return "Not specified";
    const degree = degreeOptions.find((d) => d.code === code);
    return degree ? degree.title : code;
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleStartQuiz = async (quizId, passcode) => {
    try {
      console.log("Verifying passcode for quiz:", quizId);
      const response = await quizService.verifyQuizPasscode(quizId, passcode);

      console.log("Passcode verified, quiz data:", response.quiz);

      // Navigate with quiz data in state
      navigate(`/student/quiz/${quizId}`, {
        state: {
          quizData: response.quiz,
        },
      });
    } catch (error) {
      console.error("Passcode verification failed:", error);
      throw error; // Re-throw to be handled by QuizCard
    }
  };

  // Categorize quizzes by status
  const activeQuizzes = availableQuizzes.filter((quiz) => {
    const now = new Date();
    const start = new Date(quiz.startDateTime);
    const end = new Date(quiz.endDateTime);
    return now >= start && now <= end;
  });

  const upcomingQuizzes = availableQuizzes.filter((quiz) => {
    const now = new Date();
    const start = new Date(quiz.startDateTime);
    return now < start;
  });

  const todayQuizzes = availableQuizzes.filter((quiz) => {
    const today = new Date();
    const quizDate = new Date(quiz.startDateTime);
    return today.toDateString() === quizDate.toDateString();
  });

  const thisWeekQuizzes = availableQuizzes.filter((quiz) => {
    const now = new Date();
    const quizDate = new Date(quiz.startDateTime);
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return quizDate >= now && quizDate <= oneWeekFromNow;
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-teal-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 py-6 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {getGreeting()}, {user?.firstName}!
              </h1>
              <p className="text-green-100 text-lg">
                Keep learning and growing every day
              </p>
              {user?.degreeTitle && (
                <div className="mt-3 inline-block bg-green-500 bg-opacity-30 rounded-lg px-4 py-2">
                  <p className="text-green-100 text-sm font-medium">
                    {getDegreeTitle(user.degreeTitle)}
                  </p>
                  <p className="text-green-200 text-xs">
                    Year {user?.currentYear} • Semester {user?.currentSemester}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 md:mt-0 text-right">
              <div className="text-2xl font-mono font-bold">
                {formatTime(currentTime)}
              </div>
              <div className="text-green-200 text-sm">
                {formatDate(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Unable to load quizzes
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchAvailableQuizzes}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Quizzes Section */}
      {activeQuizzes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Active Quizzes
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {activeQuizzes.length} available now
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeQuizzes.map((quiz) => (
              <QuizCard
                key={quiz._id}
                quiz={quiz}
                onStartQuiz={handleStartQuiz}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Quizzes Section */}
      {upcomingQuizzes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <svg
                className="w-5 h-5 text-yellow-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Upcoming Quizzes
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              {upcomingQuizzes.length} scheduled
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {upcomingQuizzes.map((quiz) => (
              <QuizCard
                key={quiz._id}
                quiz={quiz}
                onStartQuiz={handleStartQuiz}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Quizzes State */}
      {!loading && availableQuizzes.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No quizzes available
          </h3>
          <p className="text-gray-500 mb-4">
            Check back later for new quizzes from your lecturers.
          </p>
          <button
            onClick={fetchAvailableQuizzes}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading available quizzes...</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Available Now
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {activeQuizzes.length}
                </p>
                <p className="text-xs text-gray-400">Active quizzes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">
                  {upcomingQuizzes.length}
                </p>
                <p className="text-xs text-gray-400">Scheduled</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {todayQuizzes.length}
                </p>
                <p className="text-xs text-gray-400">Scheduled today</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {thisWeekQuizzes.length}
                </p>
                <p className="text-xs text-gray-400">In next 7 days</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Progress & Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Academic Progress
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Year</span>
                <span className="text-sm font-semibold text-gray-900">
                  Year {user?.currentYear || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Semester</span>
                <span className="text-sm font-semibold text-gray-900">
                  Semester {user?.currentSemester || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Degree Program</span>
                <span className="text-sm font-semibold text-gray-900 text-right">
                  {user?.degreeTitle || "Not specified"}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Quiz Availability
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {availableQuizzes.length > 0
                      ? "Quizzes Available"
                      : "No Quizzes"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quiz Tips</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Read all instructions carefully before starting</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Manage your time wisely during the quiz</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Use the flag feature to mark questions for review</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Double-check your answers before submitting</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Ensure stable internet connection throughout</span>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                <span>Don't refresh or close browser during quiz</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marksheet Section */}
      <div className="mt-8">
        <Marksheet marks={[]} loading={false} />
        {/* TODO: Pass actual marks data and loading state */}
      </div>

      {/* Quick Actions */}
      {availableQuizzes.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Take a Quiz?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  You have {activeQuizzes.length} quiz
                  {activeQuizzes.length !== 1 ? "es" : ""} available to take
                  right now.
                  {upcomingQuizzes.length > 0 &&
                    ` Plus ${upcomingQuizzes.length} more scheduled for later.`}
                </p>
                <div className="flex items-center space-x-4">
                  {activeQuizzes.length > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                      {activeQuizzes.length} Active Now
                    </span>
                  )}
                  {upcomingQuizzes.length > 0 && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {upcomingQuizzes.length} Upcoming
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
