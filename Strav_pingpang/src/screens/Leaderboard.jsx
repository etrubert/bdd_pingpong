// =====================================================================
// PING PANG PARIS — Leaderboard
// DA : top 3 en podium, top 10 + bouton "voir tout", TA POSITION en carte
// dorée, stats du joueur en bas. Donnees vues `world_ranking` + Finder.
// =====================================================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { C, fontDisplay, fontSans, kicker } from '../theme';
import { supabase } from '../lib/supabase';
import { useWorldRanking, listClubs } from '../lib/worldPlayers';

// ----- Filtres disponibles (gardent toute la logique précédente) -----
const FILTERS = [
  { value: 'world',    label: 'Monde',      flag: '🌍' },
  { value: 'france',   label: 'France',     flag: '🇫🇷', country: 'FR' },
  { value: 'portugal', label: 'Portugal',   flag: '🇵🇹', country: 'PT' },
  { value: 'spain',    label: 'Espagne',    flag: '🇪🇸', country: 'ES' },
  { value: 'germany',  label: 'Allemagne',  flag: '🇩🇪', country: 'DE' },
  { value: 'china',    label: 'Chine',      flag: '🇨🇳', country: 'CN' },
  { value: 'usa',      label: 'USA',        flag: '🇺🇸', country: 'US' },
  { value: 'region',   label: 'Ma région',  flag: '📍' },
  { value: 'club',     label: 'Mon club',   flag: '🏓' },
];

const TOP_N = 10;
const FULL_LIMIT = 200;
const REGION_RADIUS_KM = 50;
const PARIS_FALLBACK = [48.8566, 2.3522];

const PALETTE = [
  ['#a8c2db', '#3b5a7a'], ['#d6a8a8', '#7a3b3b'],
  ['#bedba8', '#5a7a3b'], ['#d6c0a8', '#7a5e3b'],
  ['#a8b8d6', '#3b4d7a'], ['#d6b890', '#6b4a2e'],
  ['#b0a8d6', '#4a3b7a'], ['#d6a8c8', '#7a3b5e'],
];

function colorFromId(id) {
  if (!id) return PALETTE[0];
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function countryFlag(code) {
  const f = { FR: '🇫🇷', US: '🇺🇸', CN: '🇨🇳', JP: '🇯🇵', KR: '🇰🇷', DE: '🇩🇪', ES: '🇪🇸', PT: '🇵🇹' };
  return f[code] || '🌍';
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * 111;
  const dLon = (lon2 - lon1) * 111 * Math.cos((lat1 * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function readUserPos() {
  try { const raw = localStorage.getItem('pp_user_pos'); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

function parseClubsCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines.shift().split(',').map(h => h.replace(/^﻿/, '').trim());
  return lines.map(line => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return row;
  });
}

// ELO variation : tant que l'historique des matchs n'est pas alimenté,
// on dérive une variation déterministe à partir de l'id du joueur pour
// avoir le même look que la maquette (env. 60% positives, 30% négatives, 10% stables).
// Quand le trigger ELO commencera à tourner et que `peak_elo` divergera de
// `current_elo`, cette valeur sera remplacée par la vraie variation.
function variationOf(player) {
  if (player.peak_elo != null && player.current_elo != null && player.peak_elo !== player.current_elo) {
    return player.current_elo - player.peak_elo;
  }
  // Hash déterministe de l'id → [0, 99]
  let h = 0;
  for (const c of String(player.id || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bucket = h % 100;
  if (bucket < 10) return null;             // 10% stables
  if (bucket < 35) return -((h % 9) + 1);   // 25% ↓ entre -1 et -9
  return (h % 22) + 1;                      // 65% ↑ entre +1 et +22
}

// =====================================================================

// ---------- Sélecteur de club (changement 6) ----------
function ClubSelector({ clubs, selected, onSelect }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const base = n ? clubs.filter(c => c.name.toLowerCase().includes(n)) : clubs;
    return base.slice(0, 40);
  }, [clubs, q]);

  return (
    <div style={{
      padding: 14, borderRadius: 16,
      background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
    }}>
      <div style={{ ...kicker, color: C.warm, marginBottom: 10 }}>CHOISIR UN CLUB</div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Rechercher un club…"
        style={{
          width: '100%', boxSizing: 'border-box', padding: '11px 14px',
          borderRadius: 10, background: 'rgba(8,22,17,0.6)',
          border: `1px solid ${C.border}`, color: C.ink,
          fontFamily: fontSans, fontSize: 13.5, outline: 'none', marginBottom: 10,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 230, overflowY: 'auto' }}>
        {filtered.map(c => {
          const active = selected === c.name;
          return (
            <button key={c.name} onClick={() => onSelect(c.name)} style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px', borderRadius: 10,
              background: active ? 'rgba(232,201,155,0.12)' : 'rgba(8,22,17,0.5)',
              border: `1px solid ${active ? 'rgba(232,201,155,0.45)' : C.border}`,
            }}>
              <span style={{
                fontFamily: fontSans, fontWeight: 700, fontSize: 13, color: active ? C.warm : C.ink,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0,
              }}>{countryFlag(c.country)} {c.name}</span>
              <span style={{
                flexShrink: 0, marginLeft: 10,
                fontFamily: fontSans, fontSize: 11.5, color: C.inkDim,
              }}>{c.count} {c.count > 1 ? 'joueurs' : 'joueur'}</span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '14px 0', textAlign: 'center', fontFamily: fontSans, fontSize: 12.5, color: C.inkDim }}>
            Aucun club ne correspond
          </div>
        )}
      </div>
    </div>
  );
}

// Sélecteur de classement (menu déroulant). Remplace la rangée de pills :
// un bouton qui affiche le choix courant + un panneau déroulant groupé.
function ScopeDropdown({ filter, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = FILTERS.find(f => f.value === filter) || FILTERS[0];

  // Fermeture au clic extérieur / touche Échap
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // Groupes : pays vs perso (région / club)
  const groups = [
    { title: 'GÉNÉRAL', items: FILTERS.filter(f => f.value === 'world') },
    { title: 'PAYS',    items: FILTERS.filter(f => f.country) },
    { title: 'PERSO',   items: FILTERS.filter(f => f.value === 'region' || f.value === 'club') },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 30 }}>
      {/* Bouton déclencheur */}
      <button onClick={() => setOpen(o => !o)} style={{
        all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', borderRadius: 14,
        background: 'rgba(8,22,17,0.55)',
        border: `1px solid ${open ? C.warm : C.borderHi}`,
        transition: 'border-color .15s ease',
      }}>
        <span style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(232,201,155,0.16)', border: `1px solid ${C.streakBd || 'rgba(232,201,155,0.4)'}`,
          fontSize: 17,
        }}>{current.flag}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...kicker, color: C.inkDim, fontSize: 9.5 }}>CLASSEMENT</div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 19, color: C.ink, letterSpacing: '0.02em', lineHeight: 1.1, marginTop: 2 }}>
            {current.label}
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.warm} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Panneau déroulant */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
          background: C.card, border: `1px solid ${C.borderHi}`, borderRadius: 16,
          boxShadow: '0 16px 40px rgba(0,0,0,0.45)', overflow: 'hidden',
          padding: '6px',
        }}>
          {groups.map((g, gi) => g.items.length > 0 && (
            <div key={g.title}>
              <div style={{ ...kicker, color: C.inkFaint, fontSize: 9.5, padding: '10px 12px 6px' }}>{g.title}</div>
              {g.items.map(f => {
                const active = f.value === filter;
                return (
                  <button key={f.value} onClick={() => { onSelect(f.value); setOpen(false); }} style={{
                    all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 12px', borderRadius: 10,
                    background: active ? 'rgba(232,201,155,0.14)' : 'transparent',
                  }}>
                    <span style={{ fontSize: 18, width: 22, textAlign: 'center' }}>{f.flag}</span>
                    <span style={{ flex: 1, fontFamily: fontSans, fontWeight: active ? 800 : 600, fontSize: 14.5, color: active ? C.warm : C.ink }}>
                      {f.label}
                    </span>
                    {active && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.warm} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
              {gi < groups.length - 1 && g.items.length > 0 && (
                <div style={{ height: 1, background: C.border, margin: '6px 8px' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Leaderboard({ currentUserId }) {
  const [filter, setFilter] = useState('world');
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nearbyClubNames, setNearbyClubNames] = useState(null);
  const [myProfileClub, setMyProfileClub] = useState(null);
  const [myCountryRank, setMyCountryRank] = useState(null);
  const [selectedClub, setSelectedClub] = useState(null); // club choisi pour le filtre "club" (ch.6)

  // Profil utilisateur (club + country rank + fallback ELO si pas encore dans le ranking)
  const [myProfile, setMyProfile] = useState(null);
  useEffect(() => {
    if (!currentUserId) return;
    supabase.from('profiles')
      .select('id, display_name, club_name, country, region, current_elo, peak_elo, matches_played, matches_won, current_streak, best_streak')
      .eq('id', currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setMyProfile(data);
        setMyProfileClub(data.club_name || null);
        if (data.country) {
          supabase.from('country_ranking').select('country_rank').eq('id', currentUserId).maybeSingle()
            .then(({ data: cr }) => { if (cr) setMyCountryRank(cr.country_rank); });
        }
      });
  }, [currentUserId]);

  // Clubs proches (pour le filtre "Ma région")
  useEffect(() => {
    if (filter !== 'region' || nearbyClubNames !== null) return;
    let cancelled = false;
    fetch('/data/maps_clubs.csv').then(r => r.text()).then(text => {
      if (cancelled) return;
      const [ulat, ulon] = readUserPos() || PARIS_FALLBACK;
      const near = parseClubsCsv(text)
        .filter(r => r.club_nom && Number.isFinite(parseFloat(r.latitude)) && Number.isFinite(parseFloat(r.longitude)))
        .filter(r => distanceKm(ulat, ulon, parseFloat(r.latitude), parseFloat(r.longitude)) <= REGION_RADIUS_KM)
        .map(r => r.club_nom);
      setNearbyClubNames(near);
    }).catch(() => setNearbyClubNames([]));
    return () => { cancelled = true; };
  }, [filter, nearbyClubNames]);

  // Classement mondial unifié (CSV scrapés normalisés + joueurs app Supabase)
  const { ranking: worldRanking, loading: worldLoading } = useWorldRanking();
  const totalPlayers = worldRanking.length;
  const clubs = useMemo(() => listClubs(worldRanking), [worldRanking]); // ch.6

  useEffect(() => { setExpanded(false); }, [filter]);

  // Filtrage + ré-attribution du rang selon le filtre actif.
  // On range sur le classement mondial complet déjà trié par ELO.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      if (worldLoading) return;
      try {
        const filterDef = FILTERS.find(f => f.value === filter);
        let pool = worldRanking;

        if (filterDef?.country) {
          pool = worldRanking.filter(p => p.country === filterDef.country);
        } else if (filter === 'region') {
          if (nearbyClubNames === null) return;
          const set = new Set(nearbyClubNames);
          pool = worldRanking.filter(p => p.club && set.has(p.club));
        } else if (filter === 'club') {
          const club = selectedClub || myProfileClub;
          if (!club) { if (!cancelled) { setRows([]); setLoading(false); } return; }
          pool = worldRanking.filter(p => p.club === club);
        }

        // Rang local au filtre (1..n) tout en gardant l'ELO mondial
        const limit = expanded ? FULL_LIMIT : TOP_N;
        const ranked = pool.map((p, i) => ({ ...p, world_rank: p.world_rank, local_rank: i + 1 }));
        if (cancelled) return;
        setRows(ranked.slice(0, limit));

        // Ma position : on cherche le user courant dans le classement complet
        if (currentUserId) {
          const mine = worldRanking.find(p => p.id === currentUserId);
          setMe(mine || null);
        }
      } catch (err) {
        console.error('Leaderboard filter error:', err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [filter, expanded, currentUserId, nearbyClubNames, myProfileClub, selectedClub, worldRanking, worldLoading]);

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);
  const visibleRest = expanded ? rest : rest.slice(0, TOP_N - 3);

  const emptyMessage = filter === 'region' && nearbyClubNames?.length === 0
    ? 'Aucun club Finder dans ton rayon (50 km). Active la géolocalisation dans Finder.'
    : filter === 'club' && !selectedClub && !myProfileClub
      ? 'Choisis un club ci-dessus pour voir son classement.'
      : rows.length === 0 && !loading && !(filter === 'club' && !selectedClub && !myProfileClub)
        ? 'Aucun joueur pour ce filtre.'
        : null;

  return (
    <div style={{
      padding: '20px 18px 130px',
      display: 'flex', flexDirection: 'column', gap: 22,
      color: C.ink, fontFamily: fontSans,
    }}>
      {/* --- Header --- */}
      <div>
        <div style={{ ...kicker, color: C.warm }}>CLASSEMENT MONDIAL</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 44, lineHeight: 1,
          color: C.ink, marginTop: 6, letterSpacing: '0.02em',
        }}>LEADERBOARD</div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6 }}>
          {totalPlayers.toLocaleString('fr-FR')} joueurs · saison en cours
        </div>
      </div>

      {/* --- Sélecteur de classement (menu déroulant) --- */}
      <ScopeDropdown filter={filter} onSelect={setFilter} />

      {/* --- Sélecteur de club (changement 6) --- */}
      {filter === 'club' && (
        <ClubSelector
          clubs={clubs}
          selected={selectedClub}
          onSelect={setSelectedClub}
        />
      )}

      {emptyMessage && (
        <div style={{
          padding: '28px 16px', textAlign: 'center',
          fontFamily: fontSans, fontSize: 13.5, color: C.inkDim, lineHeight: 1.5,
        }}>{emptyMessage}</div>
      )}

      {/* --- Podium top 3 --- */}
      {top3.length === 3 && <Podium players={top3} />}

      {/* --- TOP 10 MONDIAL section --- */}
      {rows.length > 3 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ ...kicker, color: C.warm, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${C.warm}`,
              }} />
              TOP 10 {filter === 'world' ? 'MONDIAL' : (FILTERS.find(f => f.value === filter)?.label || '').toUpperCase()}
            </span>
            <span style={{ ...kicker, color: C.inkDim, textTransform: 'none', fontSize: 11.5, letterSpacing: '0.04em' }}>Élite</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleRest.slice(0, expanded ? FULL_LIMIT : TOP_N - 3).map(p => (
              <RankRow key={`${p.source}-${p.id}`} player={p} isCurrentUser={p.id === currentUserId} />
            ))}
          </div>
        </>
      )}

      {/* --- "Suite du classement" séparation quand on est en mode étendu --- */}
      {expanded && rest.length > TOP_N - 3 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          margin: '4px 0 -4px',
        }}>
          <span style={{
            ...kicker, textTransform: 'uppercase',
            color: C.inkDim, fontSize: 10.5, letterSpacing: '0.16em',
            whiteSpace: 'pre-line', lineHeight: 1.25,
          }}>SUITE DU{'\n'}CLASSEMENT</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
      )}

      {/* --- Bouton "Voir tout" / "Réduire" --- */}
      {rest.length > TOP_N - 3 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
          <button onClick={() => setExpanded(v => !v)} style={{
            all: 'unset', cursor: 'pointer',
            padding: expanded ? '10px 22px' : '12px 28px',
            borderRadius: 12,
            background: expanded ? 'rgba(245,246,243,0.06)' : 'rgba(232,201,155,0.14)',
            border: `1px solid ${expanded ? C.border : 'rgba(232,201,155,0.45)'}`,
            color: expanded ? C.mint : C.warm,
            fontFamily: fontSans, fontWeight: 700,
            fontSize: expanded ? 12 : 13,
            letterSpacing: '0.14em',
          }}>
            {expanded ? 'RÉDUIRE' : 'VOIR LE CLASSEMENT COMPLET'}
          </button>
        </div>
      )}

      {/* --- TA POSITION --- */}
      {(me || myProfile) && (
        <MyPositionCard
          me={me || {
            id: myProfile.id,
            display_name: myProfile.display_name,
            country: myProfile.country,
            club: myProfile.club_name,
            current_elo: myProfile.current_elo,
            peak_elo: myProfile.peak_elo,
            matches_played: myProfile.matches_played,
            current_streak: myProfile.current_streak,
            world_rank: null, // pas encore classé
          }}
          totalPlayers={totalPlayers}
          countryRank={myCountryRank}
          unranked={!me}
        />
      )}

      {/* --- Stats du joueur en bas --- */}
      {(me || myProfile) && (
        <StatBoxes
          me={me || {
            country: myProfile.country,
            current_streak: myProfile.current_streak,
            world_rank: null,
          }}
          totalPlayers={totalPlayers}
          countryRank={myCountryRank}
        />
      )}
    </div>
  );
}

// ---------- Podium ----------
function Podium({ players }) {
  const [p2, p1, p3] = [players[1], players[0], players[2]];
  return (
    <div style={{
      position: 'relative', marginTop: 4,
      padding: '24px 18px 18px', borderRadius: 18,
      background: 'rgba(8,22,17,0.45)',
      border: `1px solid ${C.border}`,
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr',
        alignItems: 'end', gap: 12,
      }}>
        <PodiumSpot p={p2} rank={2} accent="silver" size={70} />
        <PodiumSpot p={p1} rank={1} accent="gold" size={92} crown />
        <PodiumSpot p={p3} rank={3} accent="bronze" size={70} />
      </div>
    </div>
  );
}

function PodiumSpot({ p, rank, accent, size, crown }) {
  if (!p) return <div />;
  const [light, dark] = colorFromId(p.id);
  const isGold = accent === 'gold';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {crown && (
        <div style={{ fontSize: 22, marginBottom: -4 }}>👑</div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${dark} 70%, #092C25 100%)`,
          border: `2px solid ${isGold ? C.warm : 'rgba(245,246,243,0.30)'}`,
          boxShadow: isGold ? '0 0 32px rgba(232,201,155,0.45)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#092C25', fontFamily: fontSans, fontWeight: 800,
          fontSize: size * 0.30, letterSpacing: '0.02em',
        }}>{initialsOf(p.display_name)}</div>
        <div style={{
          position: 'absolute', bottom: -4, right: -4,
          width: 22, height: 22, borderRadius: '50%',
          background: isGold ? C.warm : C.card,
          border: isGold ? 'none' : `1px solid ${C.border}`,
          color: isGold ? '#092C25' : C.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fontSans, fontWeight: 800, fontSize: 11,
        }}>{rank}</div>
      </div>
      <div style={{
        fontFamily: fontSans, fontWeight: 700,
        fontSize: isGold ? 14 : 13, color: C.ink,
        textAlign: 'center', lineHeight: 1.15,
        maxWidth: size + 26, wordWrap: 'break-word',
      }}>{shortenName(p.display_name)}</div>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800,
        fontSize: isGold ? 24 : 20,
        color: isGold ? C.warm : C.ink,
      }}>{p.current_elo}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontFamily: fontSans, fontSize: 11, color: C.inkDim,
      }}>
        <span>{countryFlag(p.country)}</span>
        {isGold && <span>· {p.matches_played} matchs</span>}
      </div>
    </div>
  );
}

function shortenName(name = '') {
  // Réduit à "Prénom NOM" max — coupe les middle names trop longs
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

// ---------- Rank row ----------
function RankRow({ player, isCurrentUser }) {
  const [light, dark] = colorFromId(player.id);
  const variation = variationOf(player);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 16,
      background: isCurrentUser ? 'rgba(232,201,155,0.10)' : 'rgba(8,22,17,0.45)',
      border: `1px solid ${isCurrentUser ? 'rgba(232,201,155,0.40)' : C.border}`,
    }}>
      <div style={{
        width: 28, textAlign: 'center',
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 22,
        color: C.warm, letterSpacing: '0.02em',
      }}>{player.local_rank ?? player.world_rank}</div>

      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${dark} 70%, #092C25 100%)`,
        border: `1.5px solid ${C.borderHi}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#092C25', fontFamily: fontSans, fontWeight: 800, fontSize: 13,
      }}>{initialsOf(player.display_name)}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: fontSans, fontSize: 14, fontWeight: 700, color: C.ink,
        }}>
          <span style={{
            flex: 1, minWidth: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {player.display_name}
          </span>
          {player.current_streak >= 5 && (
            <span style={{
              flexShrink: 0,
              padding: '2px 8px', borderRadius: 999,
              background: 'rgba(232,155,139,0.16)',
              border: '1px solid rgba(232,155,139,0.40)',
              color: C.loss, fontSize: 10.5, fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>🔥 {player.current_streak}</span>
          )}
          {isCurrentUser && (
            <span style={{
              flexShrink: 0,
              padding: '2px 8px', borderRadius: 999,
              background: C.warm, color: '#092C25',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            }}>TOI</span>
          )}
        </div>
        <div style={{
          fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {countryFlag(player.country)} {player.club || player.country} · {player.matches_played} matchs
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, color: C.ink }}>
          {player.current_elo}
        </div>
        <div style={{
          fontFamily: fontSans, fontSize: 11.5, fontWeight: 700,
          color: variation == null ? C.inkFaint : variation > 0 ? '#9BC9AE' : C.loss,
        }}>
          {variation == null ? '—' : variation > 0 ? `↑ ${variation}` : `↓ ${-variation}`}
        </div>
      </div>
    </div>
  );
}

// ---------- TA POSITION ----------
function MyPositionCard({ me, totalPlayers, countryRank, unranked }) {
  const [light, dark] = colorFromId(me.id);
  const variation = unranked ? null : variationOf(me);
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        margin: '0 0 10px',
      }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ ...kicker, color: C.warm, fontSize: 11 }}>· · ·  TA POSITION  · · ·</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '16px 18px', borderRadius: 18,
        background: 'rgba(232,201,155,0.08)',
        border: `1.5px solid ${C.warm}`,
        boxShadow: '0 0 32px rgba(232,201,155,0.10)',
      }}>
        <div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 24, color: C.warm }}>
            {unranked ? '—' : `#${me.world_rank}`}
          </div>
          <div style={{ ...kicker, color: C.inkDim, fontSize: 10, marginTop: 2 }}>
            {unranked ? 'Non classé' : 'Mondial'}
          </div>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${dark} 70%, #092C25 100%)`,
          border: `1.5px solid ${C.warm}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#092C25', fontFamily: fontSans, fontWeight: 800, fontSize: 14,
        }}>{initialsOf(me.display_name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{me.display_name}</span>
            <span style={{
              padding: '2px 8px', borderRadius: 999,
              background: C.warm, color: '#092C25',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            }}>TOI</span>
          </div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 3 }}>
            {countryFlag(me.country)} {me.club || me.country} · {me.matches_played} matchs
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 22, color: C.warm }}>
            {me.current_elo}
          </div>
          <div style={{
            fontFamily: fontSans, fontSize: 11.5, fontWeight: 700,
            color: variation == null ? C.inkFaint : variation > 0 ? '#9BC9AE' : C.loss,
          }}>
            {variation == null ? '—' : variation > 0 ? `↑ ${variation}` : `↓ ${-variation}`}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Stat boxes ----------
function StatBoxes({ me, totalPlayers, countryRank }) {
  const percentile = totalPlayers > 0 && me.world_rank
    ? Math.max(1, Math.round((me.world_rank / totalPlayers) * 100))
    : null;
  const streak = me.current_streak ?? 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
      <StatBox label="TOP MONDIAL" value={percentile != null ? `${percentile}%` : '—'} accent={C.warm} />
      <StatBox
        label={(<span>RANG {countryFlag(me.country)}</span>)}
        value={countryRank != null ? `#${countryRank}` : '—'}
      />
      <StatBox label="STREAK" value={(<span>🔥 {streak}</span>)} accent={streak >= 5 ? C.loss : undefined} />
    </div>
  );
}

function StatBox({ label, value, accent }) {
  return (
    <div style={{
      padding: '12px 10px 14px', borderRadius: 14,
      background: 'rgba(8,22,17,0.55)',
      border: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    }}>
      <div style={{ ...kicker, fontSize: 10, color: C.inkDim }}>{label}</div>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 22,
        color: accent || C.ink,
      }}>{value}</div>
    </div>
  );
}
