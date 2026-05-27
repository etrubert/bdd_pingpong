// =====================================================================
// PING PANG PARIS — Classement mondial unifié (changement 5)
//
// Charge les CSV de joueurs scrapés (6 fédérations), normalise leur niveau
// sur une échelle ELO mondiale commune via le RANG NATIONAL en percentile
// (équitable entre pays aux bases de licenciés très différentes), puis
// fusionne avec les joueurs Supabase de l'app pour produire un seul
// classement mondial.
//
// Les points_elo bruts ne sont PAS comparables entre fédérations
// (France max ~2023, USA jusqu'à 57757, Chine vide), d'où la normalisation.
// =====================================================================

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Code ISO pays + libellé + fichier CSV dans public/data/
const COUNTRY_FILES = [
  { country: 'CN', label: 'Chine',     file: 'players_chine.csv' },
  { country: 'DE', label: 'Allemagne', file: 'players_allemagne.csv' },
  { country: 'FR', label: 'France',    file: 'players_france.csv' },
  { country: 'PT', label: 'Portugal',  file: 'players_portugal.csv' },
  { country: 'ES', label: 'Espagne',   file: 'players_spain.csv' },
  { country: 'US', label: 'USA',       file: 'players_usa.csv' },
];

// Coefficient de force de la fédération sur l'échiquier mondial du TT.
// Module l'ELO max atteignable par le #1 de chaque pays. La Chine est la
// nation de référence (meilleure mondiale), les autres en dessous.
const FED_STRENGTH = {
  CN: 1.00, DE: 0.82, FR: 0.78, PT: 0.74, ES: 0.72, US: 0.68,
};

const ELO_BASE = 1400;     // plancher : dernier joueur d'une fédération
const ELO_SPREAD = 1000;   // amplitude max (au-dessus du plancher) pour le #1 chinois

// ---- Parser CSV minimal (gère les guillemets et virgules échappées) ----
function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quoted && next === '"') { cur += '"'; i += 1; }
    else if (ch === '"') { quoted = !quoted; }
    else if (ch === ',' && !quoted) { cells.push(cur); cur = ''; }
    else { cur += ch; }
  }
  cells.push(cur);
  return cells.map(c => c.trim());
}

function parsePlayersCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines.shift()).map(h => h.replace(/^\uFEFF/, ''));
  return lines.map(line => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
}

function toInt(v) {
  const n = parseInt(String(v).replace(/\s/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}
function toFloat(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Clé de tri intra-pays : on classe par rang_national croissant ; à défaut
// par points_elo décroissant ; à défaut au fond du classement.
function sortKey(row) {
  const rang = toInt(row.rang_national);
  if (rang && rang > 0) return [0, rang];
  const elo = toFloat(row.points_elo);
  if (elo != null) return [1, -elo];
  return [2, 0];
}

// Normalise une fédération : trie ses joueurs, calcule le percentile (1 = top)
// et en dérive un ELO mondial = BASE + strength*SPREAD*percentile.
function normalizeCountry({ country, label, rows }) {
  const sorted = [...rows].sort((a, b) => {
    const ka = sortKey(a); const kb = sortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  });
  const n = sorted.length;
  const strength = FED_STRENGTH[country] ?? 0.7;

  return sorted.map((row, i) => {
    const pct = n > 1 ? 1 - i / (n - 1) : 1; // 1.0 = meilleur du pays
    const worldElo = Math.round(ELO_BASE + strength * ELO_SPREAD * pct);
    const fullName = `${capitalize(row.prenom)} ${row.nom}`.trim() || row.nom || '—';
    const played = toInt(row.nombre_matchs);
    const won = toInt(row.victoires);
    return {
      id: `scraped:${country}:${row.licence || row.nom + i}`,
      display_name: fullName,
      country,
      country_label: label,
      club: row.club_nom || null,
      current_elo: worldElo,
      peak_elo: worldElo,
      fed_elo: toFloat(row.points_elo),          // ELO fédération brut (info)
      national_rank: toInt(row.rang_national),
      official_class: row.classement_officiel || null,
      matches_played: played ?? 0,
      matches_won: won ?? 0,
      current_streak: 0,
      sex: row.sexo || null,
      source: 'scraped',
    };
  });
}

function capitalize(s = '') {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}

// Charge + normalise les 6 CSV en parallèle.
export async function loadScrapedWorldPlayers() {
  const results = await Promise.all(
    COUNTRY_FILES.map(async ({ country, label, file }) => {
      try {
        const res = await fetch(`/data/${file}`);
        if (!res.ok) return [];
        const text = await res.text();
        const rows = parsePlayersCsv(text);
        return normalizeCountry({ country, label, rows });
      } catch {
        return [];
      }
    })
  );
  return results.flat();
}

// Récupère les joueurs Supabase de l'app (ceux qui ont joué au moins 1 match)
// et les met au même format que les joueurs scrapés.
export async function loadAppPlayers() {
  try {
    const { data, error } = await supabase
      .from('world_ranking')
      .select('id, display_name, country, current_elo, peak_elo, matches_played, matches_won, current_streak');
    if (error || !data) return [];
    return data.map(p => ({
      ...p,
      club: null,
      country: p.country || 'FR',
      current_streak: p.current_streak ?? 0,
      source: 'app',
    }));
  } catch {
    return [];
  }
}

// Fusionne scrapés + app, trie par ELO mondial décroissant, attribue le rang.
export function mergeAndRank(scraped, app) {
  const all = [...app, ...scraped];
  all.sort((a, b) => (b.current_elo ?? 0) - (a.current_elo ?? 0));
  return all.map((p, i) => ({ ...p, world_rank: i + 1 }));
}

// Hook principal : renvoie le classement mondial complet, déjà rangé.
export function useWorldRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [scraped, app] = await Promise.all([
          loadScrapedWorldPlayers(),
          loadAppPlayers(),
        ]);
        if (cancelled) return;
        setRanking(mergeAndRank(scraped, app));
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { ranking, loading, error };
}

// Liste des clubs présents dans le classement, triés par nb de joueurs.
// Sert au filtre "Par club" du Leaderboard (changement 6).
export function listClubs(ranking) {
  const map = new Map();
  for (const p of ranking) {
    if (!p.club) continue;
    const entry = map.get(p.club) || { name: p.club, country: p.country, count: 0, topElo: 0 };
    entry.count += 1;
    entry.topElo = Math.max(entry.topElo, p.current_elo ?? 0);
    map.set(p.club, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || b.topElo - a.topElo);
}

export { COUNTRY_FILES, FED_STRENGTH };
