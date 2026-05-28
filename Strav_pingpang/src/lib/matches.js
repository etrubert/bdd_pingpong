// =====================================================================
// PING PANG PARIS — Logique de saisie + validation d'un match
// À placer dans : Strav_pingpang/src/lib/matches.js
// =====================================================================

import { supabase } from './supabase';

/**
 * Crée un match (en attente de validation par les 2 joueurs)
 *
 * @param {Object} params
 * @param {string} params.playerA - UUID joueur A (celui qui saisit)
 * @param {string} params.playerB - UUID joueur B
 * @param {number} params.setsA
 * @param {number} params.setsB
 * @param {string} params.format - 'BO3' | 'BO5' | 'BO7'
 * @param {string} params.context - 'ranked' | 'tournament' | 'championship' | 'friendly'
 * @param {string} [params.locationName]
 * @returns {Promise<{ match: object, error?: Error }>}
 */
export async function createMatch({
  playerA,
  playerB,
  setsA,
  setsB,
  format = 'BO5',
  context = 'ranked',
  locationName = null,
}) {
  // L'utilisateur qui crée le match valide automatiquement
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Pas connecté');

  const validatedByA = user.id === playerA;
  const validatedByB = user.id === playerB;

  const { data, error } = await supabase
    .from('matches')
    .insert({
      player_a: playerA,
      player_b: playerB,
      sets_a: setsA,
      sets_b: setsB,
      format,
      context,
      location_name: locationName,
      validated_by_a: validatedByA,
      validated_by_b: validatedByB,
      is_validated: false, // jamais validé à la création (sauf cas particulier)
    })
    .select()
    .single();

  return { match: data, error };
}


/**
 * Valide un match (étape côté autre joueur)
 * Quand les 2 ont validé, le trigger ELO se déclenche automatiquement
 */
export async function validateMatch(matchId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Pas connecté');

  // Récupérer le match
  const { data: match, error: fetchErr } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  if (fetchErr) throw fetchErr;

  // Déterminer quelle colonne valider
  const updates = {};
  if (user.id === match.player_a) updates.validated_by_a = true;
  else if (user.id === match.player_b) updates.validated_by_b = true;
  else throw new Error('Tu n\'es pas dans ce match');

  // Si après update les 2 sont validés → is_validated = true (déclenche le trigger ELO)
  const willBeFullyValidated =
    (user.id === match.player_a && match.validated_by_b) ||
    (user.id === match.player_b && match.validated_by_a);

  if (willBeFullyValidated) {
    updates.is_validated = true;
  }

  const { data, error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', matchId)
    .select()
    .single();

  return { match: data, error, eloUpdated: willBeFullyValidated };
}


/**
 * Conteste un match (le supprime ou le marque comme litigieux)
 */
export async function disputeMatch(matchId) {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId);
  return { error };
}


/**
 * S'abonne aux changements ELO en temps réel pour l'utilisateur courant
 * Utile pour afficher la mise à jour ELO dès que le trigger se déclenche
 */
export function subscribeToMyEloUpdates(userId, onUpdate) {
  const channel = supabase
    .channel(`profile-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}


// =====================================================================
// Compatibilité — Hook localStorage pour les écrans existants
// (MatchesScreen, HomeScreen) qui affichent les matchs de démo
// jusqu'à ce que l'intégration Supabase complète soit branchée.
// =====================================================================

import { useEffect, useMemo, useState } from 'react';

// Matchs de demo par defaut : la section "Last Match" est toujours remplie
// pour les nouveaux users tant qu'ils n'ont pas saisi leurs propres matchs.
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
let _listeners = [];
function _notify() { _listeners.forEach(l => l()); }

function _read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return DEFAULT_MATCHES;
    return JSON.parse(raw);
  } catch { return DEFAULT_MATCHES; }
}

function _write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  _notify();
}

export function useMatches() {
  const [matches, setLocal] = useState(_read);
  useEffect(() => {
    const onChange = () => setLocal(_read());
    _listeners.push(onChange);
    return () => { _listeners = _listeners.filter(l => l !== onChange); };
  }, []);

  const setMatches = (updater) => {
    const current = _read();
    const next = typeof updater === 'function' ? updater(current) : updater;
    _write(next);
  };
  const addMatch = (m) => _write([{ ...m, id: m.id || `m-${Date.now()}` }, ..._read()]);

  return [matches, setMatches, addMatch];
}


// =====================================================================
// Stats dérivées du store local de matchs.
// Source UNIQUE partagée par le profil, MatchesScreen et HomeScreen pour
// rester cohérents partout, et qui fonctionne hors-ligne (pas de Supabase).
// =====================================================================

// Les matchs sont stockés du plus récent au plus ancien (addMatch prepend).
export function computeMatchStats(matches) {
  const list = Array.isArray(matches) ? matches : [];
  const played = list.length;
  const won = list.filter(m => m.win).length;
  const lost = played - won;
  const winRate = played > 0 ? Math.round((won / played) * 100) : null;
  // Série de victoires EN COURS : on compte depuis le match le plus récent
  // jusqu'à la première défaite.
  let streak = 0;
  for (const m of list) { if (m.win) streak += 1; else break; }
  // Meilleure série de victoires consécutives de l'historique.
  let bestStreak = 0; let run = 0;
  for (const m of list) { if (m.win) { run += 1; bestStreak = Math.max(bestStreak, run); } else run = 0; }
  return { played, won, lost, winRate, streak, bestStreak };
}

// Hook réactif : se recalcule automatiquement à chaque changement du store.
export function useMatchStats() {
  const [matches] = useMatches();
  return useMemo(() => ({
    ...computeMatchStats(matches),
    recent: (matches || []).slice(0, 3),
    matches: matches || [],
  }), [matches]);
}


/**
 * Récupère les matchs en attente de validation pour l'utilisateur
 */
export async function getPendingValidations(userId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      player_a_profile:profiles!matches_player_a_fkey(display_name, current_elo),
      player_b_profile:profiles!matches_player_b_fkey(display_name, current_elo)
    `)
    .or(`player_a.eq.${userId},player_b.eq.${userId}`)
    .eq('is_validated', false)
    .order('created_at', { ascending: false });

  return { matches: data, error };
}
