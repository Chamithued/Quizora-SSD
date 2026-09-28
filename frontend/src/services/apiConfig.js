// Accept either a backend origin or an API URL, including older .env settings.
export function resolveApiUrls(value = 'http://localhost:5001/api') {
  const base = value.trim().replace(/\/+$/, '');
  const apiBaseUrl = base.endsWith('/api') ? base : `${base}/api`;
  return { apiBaseUrl, assetBaseUrl: apiBaseUrl.slice(0, -4) };
}

const urls = resolveApiUrls(process.env.REACT_APP_API_URL || undefined);
export const API_BASE_URL = urls.apiBaseUrl;
export const ASSET_BASE_URL = urls.assetBaseUrl;
