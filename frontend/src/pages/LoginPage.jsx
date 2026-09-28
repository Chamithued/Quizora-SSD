import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const googleErrors = {
  unavailable: 'Google sign-in is not configured yet.',
  invalid_state: 'Google sign-in expired or was opened in another browser. Please try again.',
  cancelled: 'Google sign-in was cancelled. You can try again.',
  not_linked: 'This Google account is not connected. Use “Connect Google to my account” below first.',
  link_failed: 'Unable to connect this Google account. It may already be connected to a Quizora account.',
  failed: 'Google sign-in could not be verified. Please try again.',
  existing_account: 'A Quizora account already uses this email. Connect Google using your existing Quizora password.'
};

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const { login, loading, error, user } = useAuth();
  const navigate = useNavigate();
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [linkGoogle, setLinkGoogle] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signup, setSignup] = useState({ firstName: '', lastName: '', requestedRole: 'student' });
  const [googleError, setGoogleError] = useState(() => {
    const reason = new URLSearchParams(window.location.search).get('google_error');
    return reason ? googleErrors[reason] || googleErrors.failed : '';
  });

  useEffect(() => {
    api.get('/auth/google/status').then(result => setGoogleEnabled(result.enabled)).catch(() => {});
    if (new URLSearchParams(window.location.search).has('google_error')) {
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const startGoogle = async (linking = false) => {
    setGoogleBusy(true);
    setGoogleError('');
    try {
      const { url } = await api.googleAuth(linking ? 'link' : 'start', linking ? formData : {});
      window.location.assign(url);
    } catch (error) {
      setGoogleError(error.message);
      setGoogleBusy(false);
    }
  };

  const signupGoogle = async event => {
    event.preventDefault();
    setGoogleBusy(true);
    setGoogleError('');
    try {
      const { url } = await api.googleAuth('signup', signup);
      window.location.assign(url);
    } catch (error) {
      setGoogleError(error.message);
      setGoogleBusy(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (user.approvalStatus && user.approvalStatus !== 'approved') {
        navigate('/pending-approval', { replace: true });
        return;
      }
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'lecturer':
          navigate('/lecturer/dashboard', { replace: true });
          break;
        case 'student':
          navigate('/student/dashboard', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (linkGoogle) {
      await startGoogle(true);
      return;
    }
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      console.log('Login successful');
    }
  };

  const handleDemoLogin = (email, password) => {
    setFormData({ email, password });
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo Section */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-6">
            <span className="text-white text-2xl font-bold">Q</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome to Quizora
          </h2>
          <p className="mt-3 text-gray-600">
            Sign in to access your learning dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <button
            type="button"
            disabled={!googleEnabled || googleBusy || loading}
            onClick={() => startGoogle()}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleBusy ? 'Opening Google…' : 'Continue with Google'}
          </button>
          {!googleEnabled && <p className="mt-2 text-xs text-gray-500 text-center">Google sign-in needs administrator configuration.</p>}
          {googleError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{googleError}</p>}
          {googleEnabled && (
            <button type="button" disabled={googleBusy} onClick={() => setSignupOpen(!signupOpen)}
              className="mt-3 w-full text-sm font-semibold text-blue-700 hover:underline">
              {signupOpen ? 'Close registration' : 'New to Quizora? Sign up with Google'}
            </button>
          )}
          {signupOpen && (
            <form onSubmit={signupGoogle} className="mt-4 space-y-3 rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-gray-700">All new accounts need administrator approval before accessing Quizora.</p>
              <label className="block text-sm">First name
                <input required maxLength={100} value={signup.firstName} onChange={e => setSignup({ ...signup, firstName: e.target.value })} className="mt-1 w-full rounded border p-2" />
              </label>
              <label className="block text-sm">Last name
                <input required maxLength={100} value={signup.lastName} onChange={e => setSignup({ ...signup, lastName: e.target.value })} className="mt-1 w-full rounded border p-2" />
              </label>
              <label className="block text-sm">Requested role
                <select value={signup.requestedRole} onChange={e => setSignup({ ...signup, requestedRole: e.target.value })} className="mt-1 w-full rounded border p-2">
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                  <option value="admin">Administrator (requires existing admin approval)</option>
                </select>
              </label>
              <button disabled={googleBusy} className="w-full rounded-lg bg-blue-600 p-2 text-white disabled:opacity-50">Sign up with Google</button>
            </form>
          )}
          {googleEnabled && (
            <button type="button" disabled={googleBusy} onClick={() => setLinkGoogle(!linkGoogle)}
              className="mt-3 w-full text-sm text-blue-700 hover:underline">
              {linkGoogle ? 'Back to password sign-in' : 'Connect Google to my account (first time)'}
            </button>
          )}
          <p className="my-5 text-center text-sm text-gray-500">
            {linkGoogle ? 'Enter your existing Quizora credentials, then choose the Google account to connect.' : 'or sign in with your password'}
          </p>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pl-12"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pl-12"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Login Failed</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || googleBusy}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {linkGoogle ? 'Verify password and connect Google' : 'Sign In'}
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Demo Credentials */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
          <div className="text-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Demo Access</h4>
            <p className="text-xs text-blue-600 mb-4">Click on any credential below to auto-fill the form</p>
          </div>
          
          <div className="space-y-3">
            {/* Admin Demo */}
            <div 
              className="bg-white border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => handleDemoLogin('admin@quizora.com', 'Admin123!')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-gray-900">Admin</p>
                    <p className="text-xs text-gray-600">admin@quizora.com</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Lecturer Demo */}
            <div 
              className="bg-white border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => handleDemoLogin('prasannashaddela@sliit.lk', 'Lbdg@3G###')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-gray-900">Lecturer</p>
                    <p className="text-xs text-gray-600">prasannashaddela@sliit.lk</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Student Demo */}
            <div 
              className="bg-white border border-blue-200 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors"
              onClick={() => handleDemoLogin('jayasanka@gmail.com', 'hHe444rT@Tm')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium text-gray-900">Student</p>
                    <p className="text-xs text-gray-600">jayasanka@gmail.com</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>© 2024 Quizora. Empowering education through technology.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
