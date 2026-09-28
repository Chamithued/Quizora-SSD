import { resolveApiUrls } from './apiConfig';

test.each(['http://localhost:5001', 'http://localhost:5001/', 'http://localhost:5001/api', 'http://localhost:5001/api/'])('normalizes %s without losing or duplicating /api', input => {
  const { apiBaseUrl, assetBaseUrl } = resolveApiUrls(input);
  expect(`${apiBaseUrl}/auth/login`).toBe('http://localhost:5001/api/auth/login');
  expect(`${apiBaseUrl}/questions`).toBe('http://localhost:5001/api/questions');
  expect(`${assetBaseUrl}/uploads/question.png`).toBe('http://localhost:5001/uploads/question.png');
});
