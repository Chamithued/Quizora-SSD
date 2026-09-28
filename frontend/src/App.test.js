import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext';
import api from './services/api';

jest.mock('./context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('./services/api', () => ({ get: jest.fn(), googleAuth: jest.fn() }));

const login = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState({}, '', '/login');
  useAuth.mockReturnValue({ login, loading: false, user: null, error: null });
  api.get.mockResolvedValue({ enabled: true });
});
const renderLogin = () => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><LoginPage /></MemoryRouter>
);

test('Google login is unavailable until configured', async () => {
  api.get.mockResolvedValue({ enabled: false });
  renderLogin();
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/auth/google/status'));
  expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
});

test('first connection submits Quizora credentials and displays failure without navigation', async () => {
  api.googleAuth.mockRejectedValue(new Error('Invalid credentials'));
  renderLogin();
  fireEvent.click(await screen.findByRole('button', { name: /Connect Google to my account/ }));
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify password and connect Google' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  expect(api.googleAuth).toHaveBeenCalledWith('link', { email: 'person@example.com', password: 'password' });
  expect(login).not.toHaveBeenCalled();
});

test('existing password sign-in remains available', async () => {
  login.mockResolvedValue({ success: true });
  renderLogin();
  await screen.findByRole('button', { name: /Connect Google to my account/ });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'person@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  await waitFor(() => expect(login).toHaveBeenCalledWith('person@example.com', 'password'));
});

test('callback errors display predefined text and clear the URL', async () => {
  window.history.replaceState({}, '', '/login?google_error=cancelled');
  renderLogin();
  await screen.findByRole('button', { name: /Connect Google to my account/ });
  expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in was cancelled');
  expect(window.location.search).toBe('');
});

test('Google signup requests a role without granting approval', async () => {
  api.googleAuth.mockRejectedValue(new Error('Google unavailable'));
  renderLogin();
  fireEvent.click(await screen.findByRole('button', { name: 'New to Quizora? Sign up with Google' }));
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'New' } });
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: 'User' } });
  fireEvent.change(screen.getByLabelText('Requested role'), { target: { value: 'lecturer' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign up with Google' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Google unavailable');
  expect(api.googleAuth).toHaveBeenCalledWith('signup', { firstName: 'New', lastName: 'User', requestedRole: 'lecturer' });
});
