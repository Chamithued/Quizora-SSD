import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import api from '../services/api';

jest.mock('../services/api', () => ({ get: jest.fn(), googleAuth: jest.fn() }));
function Probe() {
  const { user, error, loading } = useAuth();
  return <p>{loading ? 'Loading' : error || user?.role || 'Logged out'}</p>;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.history.replaceState({}, '', '/login?google=complete');
});

test('redeems the cookie once under StrictMode and installs the Quizora session', async () => {
  api.googleAuth.mockResolvedValue({ token: 'app-token', user: { role: 'student' } });
  render(<StrictMode><AuthProvider><Probe /></AuthProvider></StrictMode>);
  expect(await screen.findByText('student')).toBeInTheDocument();
  expect(api.googleAuth).toHaveBeenCalledTimes(1);
  expect(api.googleAuth).toHaveBeenCalledWith('complete');
  expect(localStorage.getItem('token')).toBe('app-token');
  expect(window.location.search).toBe('');
});

test('expired completion shows a recoverable error and removes a stale session', async () => {
  localStorage.setItem('token', 'stale');
  api.googleAuth.mockRejectedValue(new Error('Google sign-in expired. Please try again.'));
  render(<AuthProvider><Probe /></AuthProvider>);
  expect(await screen.findByText(/Google sign-in expired/)).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});
