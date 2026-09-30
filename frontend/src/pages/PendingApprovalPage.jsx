import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PendingApprovalPage() {
  const { user, loading, refreshProfile, logout } = useAuth();
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!user || user.approvalStatus === 'approved') return;
    const timer = setInterval(() => refreshProfile().catch(() => {}), 30000);
    return () => clearInterval(timer);
  }, [user, refreshProfile]);

  if (loading) return <p className="p-10 text-center">Loading your account…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.approvalStatus || user.approvalStatus === 'approved') return <Navigate to="/login" replace />;
  const rejected = user.approvalStatus === 'rejected';
  const checkStatus = async () => {
    setChecking(true);
    setError('');
    try { await refreshProfile(); } catch (err) { setError(err.message); }
    finally { setChecking(false); }
  };
  const signOut = async () => {
    setError('');
    try { await logout(); } catch (err) { setError(err.message || 'Unable to sign out. Please try again.'); }
  };
  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 p-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg text-center">
        <p className="text-sm font-semibold text-blue-700 mb-3">Quizora registration</p>
        <h1 className="text-2xl font-bold text-gray-900">{rejected ? 'Registration not approved' : 'Waiting for administrator approval'}</h1>
        <p className="mt-4 text-gray-600">{user.firstName}, you signed in with Google as <strong>{user.email}</strong>.</p>
        <p className="mt-3 text-gray-600">{rejected
          ? 'Your registration was declined. Contact your Quizora administrator for help.'
          : `Your request to join as ${user.requestedRole || 'a user'} is pending. Your dashboard becomes available after an administrator approves your account.`}</p>
        {!rejected && <p className="mt-3 text-sm text-gray-500">This page checks for approval every 30 seconds.</p>}
        {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
        <div className="mt-6 flex justify-center gap-4">
          <button onClick={checkStatus} disabled={checking} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{checking ? 'Checking…' : 'Check approval status'}</button>
          <button onClick={signOut} className="rounded-lg border px-4 py-2">Sign out</button>
        </div>
      </section>
    </main>
  );
}
