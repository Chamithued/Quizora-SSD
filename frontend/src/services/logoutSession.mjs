// Do not discard the credential until the server confirms revocation.
// Rejecting preserves the session so a failed logout can be retried.
export async function logoutSession(api, storage, onLoggedOut) {
  await api.post('/auth/logout', {});
  storage.removeItem('token');
  onLoggedOut();
}
