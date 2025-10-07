// frontend/src/App.js

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import QuestionManagement from './pages/lecturer/QuestionManagement';
import QuizManagement from './pages/lecturer/QuizManagement';
import AnalyticsPage from './pages/lecturer/AnalyticsPage';
import GradingDashboard from './pages/lecturer/GradingDashboard';
import GradingInterface from './pages/lecturer/GradingInterface';
import RubricManagement from './pages/lecturer/RubricManagement';
import RubricForm from './pages/lecturer/RubricForm';
import RubricDetail from './pages/lecturer/RubricDetail';
import StudentDashboard from './pages/student/StudentDashboard';
import QuizPage from './pages/student/QuizPage';

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Admin Routes */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <Layout>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="users" element={<UsersPage />} />
                      <Route path="" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Lecturer Routes */}
            <Route 
              path="/lecturer/*" 
              element={
                <ProtectedRoute requiredRoles={['lecturer']}>
                  <Layout>
                    <Routes>
                      <Route path="dashboard" element={<LecturerDashboard />} />
                      <Route path="questions" element={<QuestionManagement />} />
                      <Route path="quizzes" element={<QuizManagement />} />
                      <Route path="analytics" element={<AnalyticsPage />} />
                      <Route path="grading" element={<GradingDashboard />} />
                      <Route path="grading/:submissionId" element={<GradingInterface />} />
                      <Route path="rubrics" element={<RubricManagement />} />
                      <Route path="rubrics/create" element={<RubricForm />} />
                      <Route path="rubrics/new" element={<RubricForm />} />
                      <Route path="rubrics/edit/:id" element={<RubricForm />} />
                      <Route path="rubrics/:id" element={<RubricDetail />} />
                      <Route path="" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Student Routes */}
            <Route 
              path="/student/*" 
              element={
                <ProtectedRoute requiredRoles={['student']}>
                  <Routes>
                    {/* Quiz page without layout for full-screen experience */}
                    <Route path="quiz/:id" element={<QuizPage />} />
                    
                    {/* Other student routes with layout */}
                    <Route path="*" element={
                      <Layout>
                        <Routes>
                          <Route path="dashboard" element={<StudentDashboard />} />
                          <Route path="" element={<Navigate to="dashboard" replace />} />
                        </Routes>
                      </Layout>
                    } />
                  </Routes>
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;