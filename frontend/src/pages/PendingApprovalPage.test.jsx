import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PendingApprovalPage from './PendingApprovalPage';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { useAuth } from '../context/AuthContext';
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

test('pending users see status and can request an approval refresh', async () => {
  const refreshProfile = jest.fn().mockResolvedValue();
  useAuth.mockReturnValue({ user: { firstName: 'New', email: 'new@example.com', requestedRole: 'lecturer', approvalStatus: 'pending' }, loading: false, refreshProfile, logout: jest.fn() });
  render(<PendingApprovalPage />);
  expect(screen.getByRole('heading')).toHaveTextContent('Waiting for administrator approval');
  fireEvent.click(screen.getByRole('button', { name: 'Check approval status' }));
  await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
});

test('pending user cannot render a protected dashboard', () => {
  useAuth.mockReturnValue({ user: { role: 'admin', approvalStatus: 'pending' }, loading: false });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ProtectedRoute><p>Secret dashboard</p></ProtectedRoute></MemoryRouter>);
  expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument();
});

test('failed session revocation displays a retryable error on the pending page', async () => {
  useAuth.mockReturnValue({ user: { approvalStatus: 'pending', firstName: 'New' }, loading: false,
    refreshProfile: jest.fn(), logout: jest.fn().mockRejectedValue(new Error('Unable to log out. Please try again.')) });
  render(<PendingApprovalPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to log out. Please try again.');
});
