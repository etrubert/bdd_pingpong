// =====================================================================
// PING PANG PARIS — Streak de connexion (changement 2)
//
// Enregistre chaque jour où l'utilisateur ouvre l'app et calcule sa série
// de jours consécutifs (login streak), pour l'inciter à revenir chaque jour.
//
// Les 3 premiers du classement de streak gagnent un code promo boutique
// à chaque fin de SAISON TRIMESTRIELLE (tous les 3 mois).
//
// Stockage local (localStorage). En prod : à synchroniser sur Supabase
// (table login_streaks) pour un classement réel multi-utilisateurs.
// =====================================================================

import { useEffect, useState, useCallback } from 'react';

const KEY_DAYS = 'pp_login_days';      // liste des jours visités (YYYY-MM-DD)
const KEY_LAST = 'pp_login_last';      // dernier jour enregistré

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function readDays() {
  try {
    const raw = localStorage.getItem(KEY_DAYS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeDays(days) {
  try { localStorage.setItem(KEY_DAYS, JSON.stringify(days)); } catch { /* ignore */ }
}

// Calcule la série de jours consécutifs se terminant aujourd'hui (ou hier).
export function computeStreak(days, ref = todayStr()) {
  if (!days || days.length === 0) return 0;
  const set = new Set(days);
  // La série est valide si le dernier jour est aujourd'hui ou hier.
  let cursor = ref;
  if (!set.has(cursor)) {
    const y = todayStr(new Date(Date.now() - 86400000));
    if (set.has(y)) cursor = y; else return 0;
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = todayStr(new Date(new Date(cursor + 'T00:00:00').getTime() - 86400000));
  }
  return streak;
}

// Enregistre la visite du jour (idempotent) et renvoie l'état du streak.
export function recordVisit() {
  const today = todayStr();
  const days = readDays();
  if (!days.includes(today)) {
    days.push(today);
    days.sort();
    writeDays(days);
    try { localStorage.setItem(KEY_LAST, today); } catch { /* ignore */ }
  }
  const current = computeStreak(days);
  const best = days.reduce((max, d) => Math.max(max, computeStreak(days, d)), 0);
  return { current, best, days };
}

// ---- Saison trimestrielle (Q1 jan-mar, Q2 avr-juin, etc.) ----
export function currentSeason(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return { label: `Q${q} ${d.getFullYear()}`, quarter: q, year: d.getFullYear() };
}

// Jours restants avant la fin de la saison (= prochaine distribution de codes).
export function daysUntilSeasonEnd(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3);
  const endMonth = q * 3 + 3; // premier mois du trimestre suivant
  const end = new Date(d.getFullYear(), endMonth, 1);
  return Math.max(0, Math.ceil((end - d) / 86400000));
}

// Hook : enregistre la visite au montage, expose current/best streak.
export function useLoginStreak() {
  const [state, setState] = useState({ current: 0, best: 0, days: [] });

  useEffect(() => {
    setState(recordVisit());
  }, []);

  const refresh = useCallback(() => setState(recordVisit()), []);

  return { ...state, refresh };
}
