// Hook partage : un seul opt-in qui couvre position + statut en ligne
// Persiste dans localStorage et synchronise toutes les vues qui l'utilisent.
import { useEffect, useState } from 'react';

const KEY = 'pp_share_friends';

let listeners = [];

function notify() {
  listeners.forEach(l => l());
}

function read() {
  try { return localStorage.getItem(KEY) === '1'; }
  catch { return false; }
}

function write(val) {
  try { localStorage.setItem(KEY, val ? '1' : '0'); } catch {}
  notify();
}

export function useSharing() {
  const [sharing, setSharingState] = useState(read);

  useEffect(() => {
    const onChange = () => setSharingState(read());
    listeners.push(onChange);
    return () => { listeners = listeners.filter(l => l !== onChange); };
  }, []);

  const setSharing = (val) => {
    write(val);
    setSharingState(val);
  };
  const toggleSharing = () => setSharing(!read());

  return { sharing, setSharing, toggleSharing };
}
