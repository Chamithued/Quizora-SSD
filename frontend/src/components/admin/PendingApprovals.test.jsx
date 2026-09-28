import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PendingApprovals from './PendingApprovals';
import { userService } from '../../services/userService';

jest.mock('../../services/userService', () => ({ userService: {
  getPendingUsers: jest.fn(), getDegreeOptions: jest.fn(), approveUser: jest.fn(), rejectUser: jest.fn()
} }));
const student = { _id: 'new-user', firstName: 'New', lastName: 'Student', email: 'student@example.com', requestedRole: 'student', role: 'student', isActive: true };
beforeEach(() => {
  jest.clearAllMocks();
  userService.getPendingUsers.mockResolvedValue({ users: [student] });
  userService.getDegreeOptions.mockResolvedValue({ degrees: [{ code: 'COM-102', title: 'Software Engineering', faculty: 'Computing' }] });
  userService.approveUser.mockResolvedValue({ success: true });
  userService.rejectUser.mockResolvedValue({ success: true });
});

test('administrator reviews and approves a student with required academic details', async () => {
  const onApproved = jest.fn();
  render(<PendingApprovals onApproved={onApproved} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Review & approve' }));
  await screen.findByRole('option', { name: /Software Engineering/ });
  fireEvent.change(screen.getByLabelText(/Degree Program/), { target: { value: 'COM-102' } });
  fireEvent.click(screen.getByRole('button', { name: 'Approve registration' }));
  await waitFor(() => expect(userService.approveUser).toHaveBeenCalledWith('new-user', expect.objectContaining({ role: 'student', degreeTitle: 'COM-102', currentYear: 1, currentSemester: 1 })));
  expect(onApproved).toHaveBeenCalledTimes(1);
});

test('administrator can reject a pending registration', async () => {
  render(<PendingApprovals onApproved={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Reject' }));
  await waitFor(() => expect(userService.rejectUser).toHaveBeenCalledWith('new-user'));
});
