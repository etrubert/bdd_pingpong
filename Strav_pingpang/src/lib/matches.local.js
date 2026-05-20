// Store partage des matchs joues (persistant + synchronise entre vues)
import { useEffect, useState } from 'react';

const DEFAULT_MATCHES = [
  {
    id: 'julien',  name: 'JULIEN B.',  initials: 'JB',
    when: '2h', where: 'Canal St-Martin', format: 'BO5',
    score: '3-0', setScore: '11:09',
    elo: 14, win: true,
    color: ['#bedba8', '#5a7a3b', '#1a2a0d'],
    h2h: { count: 5, record: '4-1', winRate: 80 },
  },
  {
    id: 'marie',   name: 'MARIE L.',   initials: 'ML',
    when: 'Hier', where: 'Parc de la Villette', format: 'BO5',
    score: '3-1', setScore: '11:05',
    elo: 12, win: true,
    color: ['#d6a8a8', '#7a3b3b', '#2a0d0d'],
    pattern: [true, false, true, true, true, true], record: '5-1',
  },
  {
    id: 'thomas',  name: 'THOMAS R.',  initials: 'TR',
    when: '3j', where: 'Place de la Bastille', format: 'BO5',
    score: '1-3', setScore: '08:11',
    elo: -8, win: false,
    color: ['#d6c0a8', '#7a5e3b', '#2a1f0d'],
    pattern: [false, false, true, false, false], record: '1-4',
    rematch: true,
  },
  {
    id: 'clara',   name: 'CLARA D.',   initials: 'CD',
    when: 'Sem. dernière', where: 'Luxembourg', format: 'BO3',
    score: '2-0', setScore: '11:02',
    elo: 18, win: true,
    color: ['#a8c2db', '#3b5a7a', '#0d1a2a'],
  },
];

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
