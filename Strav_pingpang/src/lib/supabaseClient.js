const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
}

function restUrl(table, params = {}) {
  const url = new URL(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url;
}

async function request(table, { method = 'GET', params, body, prefer } = {}) {
  assertConfigured();
  const response = await fetch(restUrl(table, params), {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${method} ${table} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function selectRows(table, params) {
  return request(table, { params });
}

export function insertRow(table, row) {
  return request(table, {
    method: 'POST',
    body: row,
    prefer: 'return=representation',
  });
}

export function updateRows(table, filterParams, patch) {
  return request(table, {
    method: 'PATCH',
    params: filterParams,
    body: patch,
    prefer: 'return=representation',
  });
}
