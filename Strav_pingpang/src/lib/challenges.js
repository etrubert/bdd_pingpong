// Store partage des defis (acceptes + en attente), persistant et synchronise entre vues
import { useEffect, useState } from 'react';

// Pas de mock par defaut : nouveaux users = inbox vide.
const DEFAULT_INCOMING = [];

function makeStore(key, defaultValue) {
  let listeners = [];
  const notify = () => listeners.forEach(l => l());
  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch { return defaultValue; }
  };
  const write = (val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    notify();
  };
  const subscribe = (fn) => {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  };
  return { read, write, subscribe };
}

function useStore(store) {
  const [val, setLocal] = useState(store.read);
  useEffect(() => store.subscribe(() => setLocal(store.read())), [store]);
  const setVal = (updater) => {
    const current = store.read();
    const next = typeof updater === 'function' ? updater(current) : updater;
    store.write(next);
  };
  return [val, setVal];
}

const acceptedStore = makeStore('pp_accepted_challenges', []);
const incomingStore = makeStore('pp_incoming_challenges', DEFAULT_INCOMING);

export function useAcceptedChallenges() { return useStore(acceptedStore); }
export function useIncomingChallenges() { return useStore(incomingStore); }
