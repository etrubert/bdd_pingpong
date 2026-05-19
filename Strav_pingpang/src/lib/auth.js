// Authentification Supabase (REST direct, sans SDK)
import { useEffect, useState } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const KEY_SESSION = 'pp_session';
const KEY_PROFILE = 'pp_profile_cache';

let listeners = [];
function notify() { listeners.forEach(l => l()); }

function readSession() {
  try {
    const raw = localStorage.getItem(KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeSession(s) {
  try {
    if (s) localStorage.setItem(KEY_SESSION, JSON.stringify(s));
    else localStorage.removeItem(KEY_SESSION);
  } catch {}
  notify();
}
function readProfile() {
  try {
    const raw = localStorage.getItem(KEY_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeProfile(p) {
  try {
    if (p) localStorage.setItem(KEY_PROFILE, JSON.stringify(p));
    else localStorage.removeItem(KEY_PROFILE);
  } catch {}
  notify();
}

export function getAccessToken() {
  const s = readSession();
  return s?.access_token || null;
}

async function authFetch(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const session = readSession();
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(url, { ...options, headers });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const msg = body?.error_description || body?.msg || body?.message || `HTTP ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function signUp({ email, password, displayName }) {
  const data = await authFetch('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      data: { display_name: displayName || email.split('@')[0] },
    }),
  });
  if (data.session) writeSession(data.session);
  // Le trigger handle_new_user a auto-cree le profil
  await refreshProfile();
  return data;
}

export async function signIn({ email, password }) {
  const data = await authFetch('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.access_token) {
    writeSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user: data.user,
    });
  }
  await refreshProfile();
  return data;
}

export async function signOut() {
  const session = readSession();
  if (session?.access_token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch {}
  }
  writeSession(null);
  writeProfile(null);
}

export async function refreshProfile() {
  const session = readSession();
  if (!session?.user?.id) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!response.ok) return null;
    const rows = await response.json();
    const profile = rows[0] || null;
    writeProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

export async function updateProfile(patch) {
  const session = readSession();
  if (!session?.user?.id) throw new Error('Pas connecté');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(patch),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Update profile failed: ${text}`);
  }
  const rows = await response.json();
  const profile = rows[0] || null;
  writeProfile(profile);
  return profile;
}

export function useAuth() {
  const [session, setSession] = useState(readSession);
  const [profile, setProfile] = useState(readProfile);

  useEffect(() => {
    const onChange = () => {
      setSession(readSession());
      setProfile(readProfile());
    };
    listeners.push(onChange);
    // Au mount, on rafraichit le profil depuis Supabase (au cas ou il a change)
    refreshProfile().then(p => { if (p) setProfile(p); });
    return () => { listeners = listeners.filter(l => l !== onChange); };
  }, []);

  return {
    session,
    profile,
    userId: session?.user?.id || null,
    isAuthed: !!session?.access_token,
  };
}
