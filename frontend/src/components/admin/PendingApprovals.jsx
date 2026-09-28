import { useCallback, useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import UserModal from './UserModal';

export default function PendingApprovals({ onApproved }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const result = await userService.getPendingUsers();
      setUsers(result.users);
      setError('');
    } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const reject = async user => {
    setBusy(true);
    try { await userService.rejectUser(user._id); await load(); onApproved(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 mb-6">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Pending Google registrations ({users.length})</h2>
        <button onClick={load} className="text-sm text-blue-700 underline">Refresh requests</button>
      </div>
      <p className="mt-2 text-sm text-gray-700">Review each request and confirm the role before granting access.</p>
      {error && <p role="alert" className="mt-3 text-red-700">{error}</p>}
      {!users.length && <p className="mt-4 text-gray-600">No registrations awaiting approval.</p>}
      <ul className="mt-4 space-y-3">
        {users.map(user => (
          <li key={user._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-4">
            <div><p className="font-semibold">{user.firstName} {user.lastName}</p><p className="text-sm text-gray-600">{user.email} · Requested role: {user.requestedRole}</p></div>
            <div className="flex gap-3">
              <button disabled={busy} onClick={() => setSelected(user)} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Review & approve</button>
              <button disabled={busy} onClick={() => reject(user)} className="rounded-lg border border-red-300 px-4 py-2 text-red-700">Reject</button>
            </div>
          </li>
        ))}
      </ul>
      {selected && <UserModal user={selected} approvalMode onClose={changed => {
        setSelected(null);
        if (changed) { load(); onApproved(); }
      }} />}
    </section>
  );
}
