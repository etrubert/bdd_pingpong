// =====================================================================
// PING PANG PARIS — Classement mondial unifié
//
// Trois sources fusionnées :
//  1) classement_ITTF.csv — rang mondial officiel ITTF (catégories MS/WS),
//     source de vérité pour le TOP mondial (Lebrun, Wang Chuqin, etc.)
//  2) 6 CSV de joueurs scrapés des fédérations FR/DE/ES/PT/CN/US —
//     normalisés par percentile national pour les joueurs hors top ITTF
//  3) Joueurs Supabase de l'app (ceux qui ont joué au moins 1 match)
//
// Logique de fusion :
//  - Si un joueur scrapé matche un joueur ITTF (par nom normalisé) →
//    on utilise l'ELO dérivé de son rang ITTF mondial (3000 au #1)
//  - Les joueurs ITTF non matchés (ex: Wang Chuqin pas dans nos CSV CN)
//    sont ajoutés comme entrées indépendantes
//  - Le reste : ELO via normalisation par percentile fédération
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
// Sert SEULEMENT aux joueurs hors top ITTF (le top vient du rang ITTF officiel).
const FED_STRENGTH = {
  CN: 1.00, DE: 0.82, FR: 0.78, PT: 0.74, ES: 0.72, US: 0.68,
};

const ELO_BASE = 1400;     // plancher : dernier joueur d'une fédération
const ELO_SPREAD = 1000;   // amplitude au-dessus du plancher pour le #1 national

// ITTF a DEUX classements indépendants : Men's Singles (MS) et Women's
// Singles (WS). On les sépare en deux strates ELO pour que le ranking
// mondial corresponde au classement officiel ITTF (MS au top, WS ensuite,
// scraped non-ITTF en bas).
const ITTF_MS_TOP = 3000;     // ELO du #1 MS (WANG Chuqin) — top mondial
const ITTF_MS_BOTTOM = 2500;  // ELO du #1000 MS
const ITTF_WS_TOP = 2499;     // ELO du #1 WS (SUN Yingsha) — juste sous MS
const ITTF_WS_BOTTOM = 2000;  // ELO du #1000 WS

// ITTF utilise des codes pays 3-lettres ; on les convertit en 2-lettres
// pour les drapeaux et les filtres existants.
const ITTF_TO_ISO = {
  FRA: 'FR', GER: 'DE', CHN: 'CN', JPN: 'JP', KOR: 'KR', SWE: 'SE',
  TPE: 'TW', BRA: 'BR', USA: 'US', POR: 'PT', ESP: 'ES', ROU: 'RO',
  HUN: 'HU', DEN: 'DK', AUT: 'AT', SVK: 'SK', CZE: 'CZ', POL: 'PL',
  BEL: 'BE', NED: 'NL', ENG: 'GB', CRO: 'HR', SLO: 'SI', SUI: 'CH',
  EGY: 'EG', NGR: 'NG', IND: 'IN', SGP: 'SG', HKG: 'HK', AUS: 'AU',
  CAN: 'CA', ARG: 'AR', PUR: 'PR', LUX: 'LU', GRE: 'GR', UKR: 'UA',
};
function ittfCountryToIso(code3) {
  return ITTF_TO_ISO[code3] || code3.slice(0, 2);
}

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
  const headers = parseCsvLine(lines.shift()).map(h => h.replace(/^﻿/, ''));
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

// Normalise un nom pour matching ITTF ↔ scraped (insensible à la casse,
// aux accents, à l'ordre prénom/nom et à la ponctuation).
function normalizeName(s = '') {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
    .toUpperCase()
    .replace(/[^A-Z\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Clé pour matching ordre-indépendant : "Felix LEBRUN" et "LEBRUN Felix"
// produisent la même clé (tokens triés).
function nameKey(s = '') {
  return normalizeName(s).split(' ').filter(Boolean).sort().join(' ');
}

function capitalize(s = '') {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
}

// ITTF rank → world ELO. Décroissance log dans la strate correspondant au
// sexe (MS = 3000-2500, WS = 2499-2000). Le résultat : le classement mondial
// affiche d'abord le top MS officiel (Lebrun #4, #12) puis les WS, puis les
// non-ITTF — exactement comme le site officiel ITTF.
function eloFromIttfRank(rank, sex = 'M') {
  if (!rank || rank < 1) return sex === 'F' ? ITTF_WS_BOTTOM : ITTF_MS_BOTTOM;
  const r = Math.min(rank, 1000);
  const top = sex === 'F' ? ITTF_WS_TOP : ITTF_MS_TOP;
  const bottom = sex === 'F' ? ITTF_WS_BOTTOM : ITTF_MS_BOTTOM;
  return Math.round(top - (top - bottom) * Math.log10(r) / 3);
}

// ---- Chargement classement ITTF (top mondial officiel) ----
async function loadIttfRanking() {
  try {
    const res = await fetch('/data/classement_ITTF.csv');
    if (!res.ok) return [];
    const text = await res.text();
    const rows = parsePlayersCsv(text);
    return rows
      .filter(r => r.epreuve === 'MS' || r.epreuve === 'WS')  // singles uniquement
      .map(r => {
        const rank = toInt(r.rang);
        if (!rank || rank < 1) return null;
        const iso = ittfCountryToIso(r.pays_code || '');
        return {
          ittf_rank: rank,
          name_raw: r.joueur || '',
          name_key: nameKey(r.joueur || ''),
          country: iso,
          country_label: r.pays || '',
          points_ittf: toFloat(r.points),
          sex: r.epreuve === 'WS' ? 'F' : 'M',
          evolution: toInt(r.evolution),
        };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Index : clé nom (tokens triés) → entrée ITTF.
// Si doublon (même nom matche MS et WS, peu probable), garde le meilleur rang.
function buildIttfIndex(ittf) {
  const idx = new Map();
  for (const p of ittf) {
    const prev = idx.get(p.name_key);
    if (!prev || p.ittf_rank < prev.ittf_rank) idx.set(p.name_key, p);
  }
  return idx;
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

// Normalise une fédération. Si un joueur matche le classement ITTF,
// son ELO mondial vient du rang ITTF (pas de la normalisation percentile).
function normalizeCountry({ country, label, rows }, ittfIndex) {
  const sorted = [...rows].sort((a, b) => {
    const ka = sortKey(a); const kb = sortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  });
  const n = sorted.length;
  const strength = FED_STRENGTH[country] ?? 0.7;

  return sorted.map((row, i) => {
    const fullName = `${capitalize(row.prenom)} ${row.nom}`.trim() || row.nom || '—';
    const key = nameKey(fullName);
    const ittfMatch = ittfIndex.get(key);

    let worldElo;
    let world_rank_ittf = null;
    let displayName = fullName;
    let pointsIttf = null;
    let effectiveCountry = country;
    let effectiveCountryLabel = label;
    if (ittfMatch) {
      worldElo = eloFromIttfRank(ittfMatch.ittf_rank, ittfMatch.sex);
      world_rank_ittf = ittfMatch.ittf_rank;
      // ITTF formate mieux les noms internationaux (WANG Chuqin vs Chuqin WANG)
      displayName = ittfMatch.name_raw || fullName;
      pointsIttf = ittfMatch.points_ittf;
      // ITTF donne la vraie nationalité : Matsushima/Harimoto sont JP même s'ils
      // figurent dans players_chine.csv (ils jouent en Super League chinoise).
      effectiveCountry = ittfMatch.country || country;
      effectiveCountryLabel = ittfMatch.country_label || label;
    } else {
      const pct = n > 1 ? 1 - i / (n - 1) : 1;
      worldElo = Math.round(ELO_BASE + strength * ELO_SPREAD * pct);
    }

    const played = toInt(row.nombre_matchs);
    const won = toInt(row.victoires);
    return {
      id: `scraped:${country}:${row.licence || row.nom + i}`,
      display_name: displayName,
      points_ittf: pointsIttf,
      country: effectiveCountry,
      country_label: effectiveCountryLabel,
      club: row.club_nom || null,
      current_elo: worldElo,
      peak_elo: worldElo,
      fed_elo: toFloat(row.points_elo),
      national_rank: toInt(row.rang_national),
      ittf_rank: world_rank_ittf,
      official_class: row.classement_officiel || null,
      matches_played: played ?? 0,
      matches_won: won ?? 0,
      current_streak: 0,
      sex: row.sexo || null,
      source: world_rank_ittf ? 'ittf+scraped' : 'scraped',
    };
  });
}

// Joueurs ITTF qui n'ont AUCUN match dans les CSV scrapés : on les ajoute
// comme entrées indépendantes. Ainsi WANG Chuqin (#1 mondial) apparaît au
// top même s'il n'est pas dans notre players_chine.csv.
function ittfStandalone(ittf, matchedKeys) {
  return ittf
    .filter(p => !matchedKeys.has(p.name_key))
    .map(p => ({
      id: `ittf:${p.ittf_rank}:${p.name_key}`,
      display_name: p.name_raw,
      country: p.country,
      country_label: p.country_label,
      club: null,
      current_elo: eloFromIttfRank(p.ittf_rank, p.sex),
      peak_elo: eloFromIttfRank(p.ittf_rank, p.sex),
      points_ittf: p.points_ittf,
      fed_elo: p.points_ittf,
      national_rank: null,
      ittf_rank: p.ittf_rank,
      official_class: null,
      matches_played: 0,
      matches_won: 0,
      current_streak: 0,
      sex: p.sex,
      source: 'ittf',
    }));
}

// Dédoublonne les joueurs par (nameKey, sex). Garde l'entrée la plus
// pertinente : ITTF-matchée > non-matchée, puis ELO le plus haut.
// Certains joueurs apparaissent plusieurs fois dans un même CSV (ex: WEN
// Ruibo joue à la fois en Super League et en Major League chinoises) ou
// dans plusieurs fédés (joueurs internationaux en clubs étrangers).
function dedupePlayers(players) {
  const best = new Map();
  for (const p of players) {
    const key = `${nameKey(p.display_name)}|${p.sex || ''}`;
    const prev = best.get(key);
    if (!prev) { best.set(key, p); continue; }
    const score = (q) => (q.ittf_rank ? 1e6 - q.ittf_rank : 0) + (q.current_elo ?? 0);
    if (score(p) > score(prev)) best.set(key, p);
  }
  return Array.from(best.values());
}

// Charge + normalise les 6 CSV de fédérations en parallèle.
export async function loadScrapedWorldPlayers() {
  const ittf = await loadIttfRanking();
  const ittfIndex = buildIttfIndex(ittf);

  const fedResults = await Promise.all(
    COUNTRY_FILES.map(async ({ country, label, file }) => {
      try {
        const res = await fetch(`/data/${file}`);
        if (!res.ok) return [];
        const text = await res.text();
        const rows = parsePlayersCsv(text);
        return normalizeCountry({ country, label, rows }, ittfIndex);
      } catch {
        return [];
      }
    })
  );
  const fedPlayers = dedupePlayers(fedResults.flat());

  // Joueurs ITTF déjà matchés (pour éviter doublons avec ittfStandalone)
  const matchedKeys = new Set();
  for (const p of fedPlayers) {
    if (p.ittf_rank) matchedKeys.add(nameKey(p.display_name));
  }

  return [...fedPlayers, ...ittfStandalone(ittf, matchedKeys)];
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
// Tie-break sur les points ITTF (pour départager MS#4 et WS#4 au même ELO),
// puis sur le rang ITTF asc (le plus petit gagne), puis stable par display_name.
export function mergeAndRank(scraped, app) {
  const all = [...app, ...scraped];
  all.sort((a, b) =>
    (b.current_elo ?? 0) - (a.current_elo ?? 0) ||
    (b.points_ittf ?? -1) - (a.points_ittf ?? -1) ||
    (a.ittf_rank ?? 9999) - (b.ittf_rank ?? 9999) ||
    String(a.display_name || '').localeCompare(String(b.display_name || ''))
  );
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
// Sert au filtre "Par club" du Leaderboard.
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
