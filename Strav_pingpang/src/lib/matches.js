// Store partage des matchs joues (persistant + synchronise entre vues)
import { useEffect, useState } from 'react';

// Pas de mock par defaut : nouveaux users = aucun match.
const DEFAULT_MATCHES = [];

const KEY = 'pp_matches';
let listeners = [];
function notify() { listeners.forEach(l => l()); }

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return DEFAULT_MATCHES;
    return JSON.parse(raw);
  } catch { return DEFAULT_MATCHES; }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  notify();
}

export function useMatches() {
  const [matches, setLocal] = useState(read);
  useEffect(() => {
    const onChange = () => setLocal(read());
    listeners.push(onChange);
    return () => { listeners = listeners.filter(l => l !== onChange); };
  }, []);

  const setMatches = (updater) => {
    const current = read();
    const next = typeof updater === 'function' ? updater(current) : updater;
    write(next);
  };
  // Helper : enregistre un nouveau match en tete de liste
  const addMatch = (m) => write([{ ...m, id: m.id || `m-${Date.now()}` }, ...read()]);

  return [matches, setMatches, addMatch];
}
