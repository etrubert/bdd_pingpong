// =====================================================================
// PING PANG PARIS — Géolocalisation en direct (changement 3)
//
// Suivi continu de la position style Strava : une fois le consentement
// donné, navigator.geolocation.watchPosition() met à jour la position en
// temps réel tant que l'app est ouverte. La position est partagée via un
// store global (comme useSharing) pour que TOUTES les vues de l'app
// (Finder, futur "live map") suivent l'utilisateur, pas seulement Finder.
//
// Consentement : l'utilisateur accepte ou refuse via le popup (LocationConsent).
// L'état est persisté dans localStorage (pp_geo_consent).
// =====================================================================

import { useEffect, useState } from 'react';

const KEY_CONSENT = 'pp_geo_consent';   // 'granted' | 'denied' | absent
const KEY_POS = 'pp_user_pos';          // [lat, lon] dernière position connue

// --- Store global (singleton) pour partager position + statut entre vues ---
let _watchId = null;
let _state = {
  consent: readConsent(),
  status: readConsent() === 'granted' ? 'granted' : 'idle', // idle|asking|granted|denied|unsupported
  pos: readPos(),
  error: '',
};
let _listeners = [];

function readConsent() {
  try { return localStorage.getItem(KEY_CONSENT) || null; } catch { return null; }
}
function readPos() {
  try { const r = localStorage.getItem(KEY_POS); return r ? JSON.parse(r) : null; } catch { return null; }
}
function notify() { _listeners.forEach(l => l(_state)); }
function setState(patch) { _state = { ..._state, ...patch }; notify(); }

// Démarre le suivi continu (watchPosition). Idempotent.
function startWatching() {
  if (_watchId != null) return;
  if (!('geolocation' in navigator)) {
    setState({ status: 'unsupported', error: "Géolocalisation non supportée par ce navigateur" });
    return;
  }
  setState({ status: 'asking', error: '' });
  _watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const p = [pos.coords.latitude, pos.coords.longitude];
      try { localStorage.setItem(KEY_POS, JSON.stringify(p)); } catch { /* ignore */ }
      setState({ pos: p, status: 'granted', error: '' });
    },
    (err) => {
      if (err.code === 1) {
        // Permission refusée → on coupe le suivi et on mémorise le refus
        stopWatching();
        try { localStorage.setItem(KEY_CONSENT, 'denied'); } catch { /* ignore */ }
        setState({ status: 'denied', consent: 'denied', error: 'Permission refusée' });
      } else {
        setState({ status: 'granted', error: 'Position momentanément indisponible' });
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
  );
}

function stopWatching() {
  if (_watchId != null) {
    try { navigator.geolocation.clearWatch(_watchId); } catch { /* ignore */ }
    _watchId = null;
  }
}

// Appelé quand l'utilisateur ACCEPTE dans le popup.
export function grantLocation() {
  try { localStorage.setItem(KEY_CONSENT, 'granted'); } catch { /* ignore */ }
  setState({ consent: 'granted' });
  startWatching();
}

// Appelé quand l'utilisateur REFUSE dans le popup.
export function denyLocation() {
  try { localStorage.setItem(KEY_CONSENT, 'denied'); } catch { /* ignore */ }
  stopWatching();
  setState({ consent: 'denied', status: 'denied' });
}

// Coupe le partage (depuis un toggle), sans marquer un refus définitif.
export function pauseLocation() {
  stopWatching();
  try { localStorage.removeItem(KEY_CONSENT); } catch { /* ignore */ }
  setState({ consent: null, status: 'idle' });
}

// Hook : expose l'état live + les actions. Relance le suivi au montage si
// le consentement a déjà été donné précédemment (suivi persistant).
export function useLiveLocation() {
  const [state, setLocalState] = useState(_state);

  useEffect(() => {
    const onChange = (s) => setLocalState(s);
    _listeners.push(onChange);
    // Reprise auto du suivi si déjà consenti et pas encore actif
    if (_state.consent === 'granted' && _watchId == null) startWatching();
    return () => { _listeners = _listeners.filter(l => l !== onChange); };
  }, []);

  return {
    pos: state.pos,
    status: state.status,
    consent: state.consent,
    error: state.error,
    grant: grantLocation,
    deny: denyLocation,
    pause: pauseLocation,
  };
}
