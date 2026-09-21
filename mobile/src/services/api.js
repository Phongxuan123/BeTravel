const FALLBACK_API_URL = 'http://10.0.2.2:3000/api';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || FALLBACK_API_URL).replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      credentials: 'include'
    });
  } catch (error) {
    throw new Error(`Không kết nối được backend tại ${API_URL}. Hãy kiểm tra IP Mac, port 3000 và firewall.`);
  }

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const fieldErrors = data?.errors?.fieldErrors;
    const firstFieldMessage = fieldErrors
      ? Object.values(fieldErrors).flat().find(Boolean)
      : null;
    throw new Error(firstFieldMessage || data?.message || `HTTP ${response.status}`);
  }

  return data;
}

export function register(payload) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function login(payload) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function healthCheck() {
  return request('/health');
}
