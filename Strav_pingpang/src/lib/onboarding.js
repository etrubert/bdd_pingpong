// Hook onboarding : pilote l'inscription multi-etapes
// Persiste dans localStorage. Si Supabase est configure, on tente d'inserer dans profiles.
import { useEffect, useState } from 'react';
import { isSupabaseConfigured, insertRow } from './supabaseClient';

const KEY = 'pp_onboarding';
let listeners = [];
function notify() { listeners.forEach(l => l()); }

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function write(val) {
  try {
    if (val === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(val));
  } catch {}
  notify();
}

export function useOnboarding() {
  const [profile, setProfileLocal] = useState(read);
  useEffect(() => {
    const onChange = () => setProfileLocal(read());
    listeners.push(onChange);
    return () => { listeners = listeners.filter(l => l !== onChange); };
  }, []);

  const save = async (data) => {
    write(data);
    // Tente la sauvegarde Supabase (echec silencieux si pas configure / RLS / colonnes manquantes)
    if (isSupabaseConfigured) {
      try {
        await insertRow('profiles', {
          full_name: data.fullName,
          email: data.email,
          region: data.region,
          handedness: data.handedness,
          player_type: data.playerType,
          // champs optionnels selon le parcours
          availability: Array.isArray(data.availability) ? data.availability.join(',') : null,
          looking_for: Array.isArray(data.lookingFor) ? data.lookingFor.join(',') : null,
          level: data.level,
          style: data.style,
          racket: data.racket,
          license_number: data.licenseNumber,
          club: data.club,
          team: data.team,
          wood: data.wood,
          forehand_rubber: data.forehandRubber,
          backhand_rubber: data.backhandRubber,
        });
      } catch {
        // ignore - on a deja le fallback localStorage
      }
    }
  };

  const reset = () => write(null);

  return { profile, save, reset, completed: !!profile?.completed };
}
