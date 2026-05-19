import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { C, fontDisplay, fontSans, fontItalic, kicker, iconBtn } from '../theme';
import { Icon } from '../icons';
import { useUI } from './uiContext';
import { useSharing } from '../lib/sharing';
import { useAuth } from '../lib/auth';
import { useAcceptedChallenges, useIncomingChallenges } from '../lib/challenges';
import { SELF_PROFILE_ID, loadChatBundle, saveChallenge, saveMessage, searchProfiles, startDmWith, updateChallenge } from '../lib/chatData';

// Marker icon for individual tables (small crème dot)
const tableIcon = L.divIcon({
  className: 'pp-table-pin',
  html: `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" fill="#EFE5C8" stroke="#0C211A" stroke-width="1.4"/>
    <circle cx="8" cy="8" r="2.4" fill="#0C211A"/>
  </svg>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

const TABLES_COUNTRY_BBOX = {
  France:    { lon: [-5.5, 9.8],  lat: [41, 51.5] },
  Allemagne: { lon: [5.5, 15.5],  lat: [47, 55.5] },
  Espagne:   { lon: [-9.5, 4.5],  lat: [35.5, 44] },
  Portugal:  { lon: [-10, -6],    lat: [36.5, 42.5] },
  Chine:     { lon: [73, 135],    lat: [18, 54] },
  USA:       { lon: [-125, -66],  lat: [24, 50] },
};
const COUNTRY_CENTER = {
  Tous:      { center: [30, 10],        zoom: 2 },
  France:    { center: [46.6, 2.4],     zoom: 6 },
  Allemagne: { center: [51.16, 10.45],  zoom: 6 },
  Espagne:   { center: [40.46, -3.74],  zoom: 6 },
  Portugal:  { center: [39.5, -8.0],    zoom: 7 },
  Chine:     { center: [35.86, 104.19], zoom: 4 },
  USA:       { center: [39.5, -98.35],  zoom: 4 },
};

// Cluster layer for tables — picks a table on click
function TableClusterLayer({ tables, onPick }) {
  const map = useMap();
  useEffect(() => {
    if (!tables.length) return undefined;
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 80,
      chunkDelay: 16,
      maxClusterRadius: 60,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        let size = 36, bg = '#9BC9AE';
        if (count >= 1000)     { size = 60; bg = '#E89B8B'; }
        else if (count >= 250) { size = 52; bg = '#E8C99B'; }
        else if (count >= 50)  { size = 44; bg = '#EFE5C8'; }
        const label = count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count);
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:${bg};color:#0C211A;
            display:flex;align-items:center;justify-content:center;
            font-family:Inter,system-ui,sans-serif;font-weight:800;
            font-size:${size > 50 ? 14 : 13}px;
            border:2px solid rgba(12,33,26,0.85);
            box-shadow:0 4px 12px rgba(0,0,0,0.35);
          ">${label}</div>`,
          className: 'pp-cluster',
          iconSize: [size, size],
        });
      },
    });
    const markers = tables.map(t => {
      const m = L.marker([t.lat, t.lon], { icon: tableIcon });
      m.on('click', () => onPick(t));
      return m;
    });
    group.addLayers(markers);
    map.addLayer(group);
    return () => { map.removeLayer(group); };
  }, [tables, map, onPick]);
  return null;
}

function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.6 });
  }, [center, zoom, map]);
  return null;
}

const FRIENDS_TOTAL = 42;

const COLOR_BLUE   = ['#a8c2db', '#3b5a7a', '#0d1a2a'];
const COLOR_RED    = ['#d6a8a8', '#7a3b3b', '#2a0d0d'];
const COLOR_GREEN  = ['#bedba8', '#5a7a3b', '#1a2a0d'];
const COLOR_BROWN  = ['#d6c0a8', '#7a5e3b', '#2a1f0d'];
const COLOR_INDIGO = ['#a8b8d6', '#3b4d7a', '#0d142a'];
const COLOR_OCHRE  = ['#d6b890', '#6b4a2e', '#1c100a'];
const COLOR_GREY   = ['#cccccc', '#666666', '#222222'];

const FRIENDS = [
  { name: 'Marc L.',   full: 'Marc Leclerc',   elo: 1520, online: true,  color: COLOR_BLUE   },
  { name: 'Sophie M.', full: 'Sophie Martin',  elo: 1380, online: false, color: COLOR_RED    },
  { name: 'Theo R.',   full: 'Theo Rousseau',  elo: 1612, online: true,  color: COLOR_GREEN  },
  { name: 'Lea P.',    full: 'Lea Petit',      elo: 1290, online: false, color: COLOR_BROWN  },
];

const FRIENDS_ALL = [
  ...FRIENDS,
  { name: 'Karim B.',   full: 'Karim Benali',    elo: 1475, online: true,  color: COLOR_INDIGO },
  { name: 'Julie D.',   full: 'Julie Dupont',    elo: 1340, online: false, color: COLOR_OCHRE  },
  { name: 'Hugo T.',    full: 'Hugo Tran',       elo: 1580, online: false, color: COLOR_BLUE   },
  { name: 'Ines F.',    full: 'Ines Fernandez',  elo: 1410, online: true,  color: COLOR_RED    },
  { name: 'Pierre G.',  full: 'Pierre Garnier',  elo: 1655, online: false, color: COLOR_GREEN  },
  { name: 'Camille V.', full: 'Camille Vidal',   elo: 1225, online: false, color: COLOR_BROWN  },
  { name: 'Lucas B.',   full: 'Lucas Bernard',   elo: 1495, online: true,  color: COLOR_INDIGO },
  { name: 'Manon S.',   full: 'Manon Simon',     elo: 1360, online: false, color: COLOR_OCHRE  },
];

const MATCHES_ALL = [
  { opp: 'Marc Leclerc',   eloOpp: 1520, score: '3-1', delta: +18, win: true,  loc: 'Le Marais Ping · Table 3',  when: 'Hier · 19h30',  color: COLOR_BLUE  },
  { opp: 'Sophie Martin',  eloOpp: 1380, score: '3-0', delta: +12, win: true,  loc: 'Bastille TT · Table 1',     when: 'Dim. · 14h00',  color: COLOR_RED   },
  { opp: 'Theo Rousseau',  eloOpp: 1612, score: '1-3', delta: -9,  win: false, loc: 'Le Marais Ping · Table 1',  when: 'Sam. · 20h15',  color: COLOR_GREEN },
  { opp: 'Lea Petit',      eloOpp: 1290, score: '3-2', delta: +8,  win: true,  loc: 'Cafe Oberkampf · Loisir',   when: 'Ven. · 18h45',  color: COLOR_BROWN },
  { opp: 'Karim Benali',   eloOpp: 1475, score: '3-2', delta: +11, win: true,  loc: 'Le Marais Ping · Table 2',  when: 'Jeu. · 20h00',  color: COLOR_INDIGO},
  { opp: 'Pierre Garnier', eloOpp: 1655, score: '0-3', delta: -14, win: false, loc: 'Levallois TT',              when: 'Mer. · 19h15',  color: COLOR_GREEN },
  { opp: 'Julie Dupont',   eloOpp: 1340, score: '3-1', delta: +9,  win: true,  loc: 'Bastille TT · Table 3',     when: 'Mar. · 19h30',  color: COLOR_OCHRE },
  { opp: 'Hugo Tran',      eloOpp: 1580, score: '2-3', delta: -7,  win: false, loc: 'Le Marais Ping · Table 1',  when: 'Lun. · 18h45',  color: COLOR_BLUE  },
  { opp: 'Ines Fernandez', eloOpp: 1410, score: '3-0', delta: +10, win: true,  loc: 'Cafe Oberkampf · Loisir',   when: '11 mai · 14h',  color: COLOR_RED   },
  { opp: 'Lucas Bernard',  eloOpp: 1495, score: '3-1', delta: +13, win: true,  loc: 'Le Marais Ping · Table 2',  when: '09 mai · 20h',  color: COLOR_INDIGO},
];

const CONVERSATIONS = [
  { full: 'Marc Leclerc',   color: COLOR_BLUE,   online: true,  preview: 'Defi propose · Samedi 14h',                  when: '2 min', unread: true,  isDefi: true,  isClub: false, fromMe: false },
  { full: 'Theo Rousseau',  color: COLOR_GREEN,  online: true,  preview: 'GG pour hier ! Revanche quand tu veux 🏓',   when: '12 min',unread: true,  isDefi: false, isClub: false, fromMe: false },
  { full: 'Sophie Martin',  color: COLOR_RED,    online: false, preview: 'Defi a confirmer · Dim. 11h',                when: '1 h',   unread: true,  isDefi: true,  isClub: false, fromMe: false },
  { full: 'Karim Benali',   color: COLOR_INDIGO, online: true,  preview: 'Toi : Ok ca marche, a demain 👌',            when: '3 h',   unread: false, isDefi: false, isClub: false, fromMe: true  },
  { full: 'Lea Petit',      color: COLOR_BROWN,  online: false, preview: 'Message vocal · 0:24',                       when: 'Hier',  unread: false, isDefi: false, isClub: false, fromMe: false, voice: true },
  { full: 'Equipe 2 · Marais', color: COLOR_OCHRE,colorB: COLOR_GREEN, online: false, preview: 'Coach : Entrainement jeudi 19h confirme', when: 'Hier', unread: false, isDefi: false, isClub: true, fromMe: false },
  { full: 'Antoine D.',     color: COLOR_GREY,   online: false, preview: "Salut, j'ai vu ton profil sur l'app...",     when: '2 j',   unread: false, isDefi: false, isClub: false, fromMe: false, isDemande: true },
];

const MY_CLUBS = [
  { name: 'Le Marais Ping', sub: 'Club principal · 38 membres', color: COLOR_OCHRE, active: true },
  { name: 'Bastille TT',    sub: 'Loisir · 24 membres',          color: COLOR_BLUE, active: false },
];

const COACH_ANNOUNCE = {
  author: 'Coach Bernard',
  color: COLOR_OCHRE,
  message: "Entraînement de jeudi décalé à 20h00 (au lieu de 19h). Pensez à vos chaussures propres 🏓",
  when: "Aujourd'hui",
  vus: 28, comments: 12, likes: 4,
};

const NEXT_TRAINING = {
  dayLabel: 'JEU', dayNum: 23,
  title: 'Prochain entraînement',
  details: '20h00 · Le Marais Ping · Salle 1',
};

const TEAM_GROUPS = [
  { name: 'Équipe 2 · Marais', tag: 'TON ÉQUIPE', preview: 'Coach : Match dimanche à 14h, soyez là 🔥', meta: '8 membres · D3 départementale', when: '2h',   unread: true,  extra: 5,  colors: [COLOR_OCHRE, COLOR_GREEN] },
  { name: 'Équipe 1 · Marais', tag: null,         preview: 'Théo : GG pour la victoire hier !',          meta: '6 membres · R3 régionale',     when: 'Hier', unread: false, extra: 3,  colors: [COLOR_BLUE, COLOR_RED] },
  { name: 'Groupe Loisir',     tag: null,         preview: "Léa : Quelqu'un dispo demain soir ?",        meta: '21 membres',                   when: '3j',   unread: false, extra: 18, colors: [COLOR_BROWN, COLOR_INDIGO] },
];

const CHALLENGES_INCOMING = [
  {
    from: 'Marc', full: 'Marc Leclerc', elo: 1520, rank: '#18 Paris', online: true, color: COLOR_BLUE,
    when: '2 min', isNew: true,
    date: 'Sam 21 · 14h', venue: 'Marais · T3',
    format: 'BO5', enjeu: 'Classé', gainW: 18, lossL: 12,
  },
];

const CHALLENGES_OUTGOING = [
  {
    full: 'Karim Benali', from: 'Karim', color: COLOR_INDIGO, online: true,
    when: 'il y a 1h',
    summary: 'Dim 22 · 11h · Bastille TT · BO3 amical',
    status: 'sent',
  },
  {
    full: 'Hugo Tran', from: 'Hugo', color: COLOR_BLUE, online: false,
    when: 'il y a 1h',
    summary: 'Sam 21 · 16h · Le Marais · BO5 classé',
    status: 'seen', seenAgo: '30 min',
  },
  {
    full: 'Sophie Martin', from: 'Sophie', color: COLOR_RED, online: true,
    when: "à l'instant",
    summary: 'Dim 22 · 11h · Bastille TT · BO3 amical',
    status: 'typing',
  },
  {
    full: 'Lea Petit', from: 'Lea', color: COLOR_BROWN, online: false,
    when: 'il y a 5 min',
    summary: 'Sam 21 · 19h · Cafe Oberkampf · BO3 amical',
    status: 'refused', refusalReason: 'Pas dispo ce jour-là',
  },
  {
    full: 'Theo Rousseau', from: 'Theo', color: COLOR_GREEN, online: true,
    when: 'il y a 10 min',
    summary: 'Dim 22 · 11h',
    status: 'counter',
    counter: { you: 'Dim 22 · 11h', them: 'Lun 23 · 19h', message: "Le matin c'est compliqué, ça te va lundi soir ?" },
  },
];

const MATCHES = [
  { opp: 'Marc Leclerc',   eloOpp: 1520, score: '3-1', delta: +18, win: true,  loc: 'Le Marais Ping · Table 3',  when: 'Hier · 19h30',  color: ['#a8c2db', '#3b5a7a', '#0d1a2a'] },
  { opp: 'Sophie Martin',  eloOpp: 1380, score: '3-0', delta: +12, win: true,  loc: 'Bastille TT · Table 1',     when: 'Dim. · 14h00',  color: ['#d6a8a8', '#7a3b3b', '#2a0d0d'] },
  { opp: 'Theo Rousseau',  eloOpp: 1612, score: '1-3', delta: -9,  win: false, loc: 'Le Marais Ping · Table 1',  when: 'Sam. · 20h15',  color: ['#bedba8', '#5a7a3b', '#1a2a0d'] },
  { opp: 'Lea Petit',      eloOpp: 1290, score: '3-2', delta: +8,  win: true,  loc: 'Cafe Oberkampf · Loisir',   when: 'Ven. · 18h45',  color: ['#d6c0a8', '#7a5e3b', '#2a1f0d'] },
];

const BADGES = [
  { label: "Tournoi Marais '24", featured: true },
  { label: '100 matchs',         featured: false },
  { label: 'Serie x5',           featured: false },
];

const STATS = {
  total:    100,
  wins:     68,
  losses:   32,
  winrate:  68,
};

function FriendAvatar({ color, online, size = 56 }) {
  const [light, mid, dark] = color;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
        border: `1.5px solid ${C.borderHi}`,
      }} />
      {online && (
        <div style={{
          position: 'absolute', right: 1, bottom: 1,
          width: 12, height: 12, borderRadius: '50%',
          background: '#3DD16B', border: '2px solid #143226',
        }} />
      )}
    </div>
  );
}

const CTA_URL = 'https://pingpang.paris/account/login';

function SectionHeader({ label, badge, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={kicker}>{label}</span>
        {badge !== undefined && (
          <span style={{
            fontFamily: fontSans, fontWeight: 800, fontSize: 11,
            color: C.warm, background: 'rgba(232,201,155,0.14)',
            border: '1px solid rgba(232,201,155,0.32)',
            padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em',
          }}>{badge}</span>
        )}
      </div>
      <button onClick={onClick} style={{
        all: 'unset', cursor: 'pointer',
        fontFamily: fontSans, fontSize: 13, fontWeight: 600,
        color: C.warm,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>Tout voir
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
          <path d="M9 6l6 6-6 6"/>
        </svg>
      </button>
    </div>
  );
}

function StatTile({ value, label, color, bg }) {
  return (
    <div style={{
      flex: 1, padding: '16px 8px', textAlign: 'center',
      borderRadius: 14, background: bg, border: `1px solid ${C.border}`,
    }}>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 26,
        color, letterSpacing: '0.02em', lineHeight: 1,
      }}>{value}</div>
      <div style={{
        marginTop: 6,
        fontFamily: fontSans, fontSize: 10.5, fontWeight: 700,
        color: C.inkDim, letterSpacing: '0.18em',
      }}>{label}</div>
    </div>
  );
}

function MatchRow({ m }) {
  const accent = m.win ? '#3DD16B' : '#E89B8B';
  const [light, mid, dark] = m.color;
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: C.card, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
          border: `1.5px solid ${C.borderHi}`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>vs {m.opp}</div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>{m.eloOpp} ELO</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: fontSans, fontWeight: 800, fontSize: 16, color: accent }}>{m.score}</div>
          <div style={{ fontFamily: fontSans, fontSize: 11, color: accent, marginTop: 2, fontWeight: 700 }}>
            {m.delta > 0 ? '+' : ''}{m.delta} ELO
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', borderTop: `1px solid ${C.border}`,
        background: 'rgba(8,22,17,0.35)',
        fontFamily: fontSans, fontSize: 11.5, color: C.inkDim,
      }}>
        <span>{m.loc}</span>
        <span>{m.when}</span>
      </div>
    </div>
  );
}

// ---------- Helper icons ----------
const ChatIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12c0 4.5-4 8-9 8-1.4 0-2.7-.3-3.9-.8L3 21l1.8-5.1C3.7 14.6 3 13.4 3 12c0-4.5 4-8 9-8s9 3.5 9 8z"/>
  </svg>
);
const SwordsIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 17.5l4 4 3-3-4-4"/>
    <path d="M3 5l6 6 4-4-6-6L3 3v2z"/>
    <path d="M11 13l-8 8"/>
    <path d="M9.5 17.5l-4 4-3-3 4-4"/>
    <path d="M21 5l-6 6-4-4 6-6 2-2v2z"/>
    <path d="M13 13l8 8"/>
  </svg>
);
const SearchIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>
  </svg>
);
const MicIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
  </svg>
);

// ---------- Reusable bits ----------
function SearchInput({ placeholder, value, onChange, onFocus, onBlur }) {
  const controlled = typeof value === 'string';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 999,
      background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
    }}>
      <span style={{ color: C.inkFaint, display: 'flex' }}><SearchIcon /></span>
      <input
        type="text"
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        {...(controlled ? { value, onChange: (e) => onChange?.(e.target.value) } : {})}
        style={{
          all: 'unset', flex: 1, fontFamily: fontSans, fontSize: 14, color: C.ink,
        }}
      />
    </div>
  );
}

function BackToProfileBtn() {
  const { openSheet } = useUI();
  return (
    <button onClick={() => openSheet({ title: 'EUGENIA SOREL', body: <ProfileSheet /> })}
            style={{
              all: 'unset', cursor: 'pointer',
              fontFamily: fontSans, fontSize: 13, fontWeight: 700,
              color: C.mint, letterSpacing: '0.08em',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 6l-6 6 6 6"/>
      </svg>
      Profil
    </button>
  );
}

// ---------- Views ----------
function FriendRowItem({ f, actionIcon, actionLabel, onClickAction }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 14,
      background: C.card, border: `1px solid ${C.border}`,
    }}>
      <FriendAvatar color={f.color} online={f.online} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.full || f.name}</div>
        <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
          {f.elo} ELO{f.online ? ' · en ligne' : ''}
        </div>
      </div>
      <button onClick={onClickAction} style={{
        all: 'unset', cursor: 'pointer',
        padding: '8px 12px', borderRadius: 10,
        border: `1px solid ${C.borderHi}`, color: C.cream,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: fontSans, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
      }}>{actionIcon}{actionLabel}</button>
    </div>
  );
}

function FriendsListView({ friends: friendsProp }) {
  const { openSheet } = useUI();
  const { userId } = useAuth();
  const [friends, setFriends] = useState(friendsProp || []);
  useEffect(() => {
    if (friendsProp) return undefined;
    let cancelled = false;
    loadChatBundle(userId).then(b => { if (!cancelled && b) setFriends(b.friends); }).catch(() => {});
    return () => { cancelled = true; };
  }, [friendsProp, userId]);
  const onlineCount = friends.filter(f => f.online).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackToProfileBtn />
      <div>
        <div style={kicker}>AMIS</div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 36, lineHeight: 1, color: C.ink, marginTop: 4 }}>
          {friends.length} {friends.length === 1 ? 'ami' : 'amis'}
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6 }}>
          {friends.length === 0
            ? 'Tu n\'as pas encore d\'amis. Cherche-en !'
            : <><span style={{ color: '#3DD16B' }}>●</span> {onlineCount} en ligne · prêts à jouer</>}
        </div>
      </div>
      <SearchInput placeholder="Rechercher un ami..." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {friends.map(f => (
          <FriendRowItem
            key={f.id || f.name}
            f={f}
            actionIcon={<ChatIcon size={14} />}
            actionLabel="Message"
            onClickAction={() => openSheet({ title: f.full || f.name, body: <ChatView contact={f} /> })}
          />
        ))}
      </div>
    </div>
  );
}

function MatchesListView() {
  const [filter, setFilter] = useState('all'); // all | wins | losses
  const filtered = MATCHES_ALL.filter(m => filter === 'all' || (filter === 'wins' ? m.win : !m.win));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackToProfileBtn />
      <div>
        <div style={kicker}>HISTORIQUE</div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 36, lineHeight: 1, color: C.ink, marginTop: 4 }}>
          {STATS.total} matchs
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6 }}>
          {STATS.wins}V / {STATS.losses}D · {STATS.winrate}% winrate
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: 'all',    label: 'Tous' },
          { id: 'wins',   label: 'Victoires' },
          { id: 'losses', label: 'Defaites' },
        ].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
              padding: '10px', borderRadius: 12,
              border: `1px solid ${active ? C.cream : C.border}`,
              background: active ? 'rgba(239,229,200,0.14)' : 'rgba(8,22,17,0.45)',
              color: active ? C.cream : C.ink,
              fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em',
            }}>{t.label}</button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((m, i) => <MatchRow key={i} m={m} />)}
      </div>
    </div>
  );
}

function ChallengeView({ friends: friendsProp }) {
  const { userId } = useAuth();
  const [friends, setFriends] = useState(friendsProp || []);
  useEffect(() => {
    if (friendsProp) return undefined;
    let cancelled = false;
    loadChatBundle(userId).then(b => { if (!cancelled && b) setFriends(b.friends); }).catch(() => {});
    return () => { cancelled = true; };
  }, [friendsProp, userId]);
  const { openSheet } = useUI();
  const openChallenge = (opp) => openSheet({ title: 'Nouveau defi', body: <NewChallengeView opponent={opp} /> });
  const SUGGESTED = [
    { name: 'Nicolas R.', full: 'Nicolas Roux',   elo: 1465, online: true,  color: COLOR_BLUE   },
    { name: 'Emma C.',    full: 'Emma Chevalier', elo: 1432, online: false, color: COLOR_RED    },
    { name: 'Yanis M.',   full: 'Yanis Mahmoudi', elo: 1488, online: true,  color: COLOR_INDIGO },
  ];
  const STRANGER = { name: 'Joueur inconnu', full: 'Joueur a inviter', elo: 1450, online: false, color: COLOR_GREY };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackToProfileBtn />
      <div>
        <div style={kicker}>DEFIER</div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 36, lineHeight: 1, color: C.ink, marginTop: 4 }}>
          Trouver un adversaire
        </div>
      </div>

      {friends.length > 0 && (
        <div>
          <div style={{ ...kicker, marginBottom: 10 }}>MES AMIS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {friends.slice(0, 6).map(f => (
              <FriendRowItem
                key={f.id || f.name}
                f={f}
                actionIcon={<SwordsIcon size={14} />}
                actionLabel="Defier"
                onClickAction={() => openChallenge(f)}
              />
            ))}
          </div>
        </div>
      )}
      {friends.length === 0 && (
        <div style={{
          padding: '14px 16px', borderRadius: 12,
          background: 'rgba(184,220,197,0.06)', border: `1px solid ${C.border}`,
          fontFamily: fontSans, fontSize: 13, color: C.inkDim, lineHeight: 1.5,
        }}>
          Tu n'as pas encore d'amis. Utilise la recherche pour trouver des joueurs.
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <div style={{ ...kicker, marginBottom: 10 }}>RECHERCHER UN ADVERSAIRE</div>
        <SearchInput placeholder="Nom, ELO, club..." />
        <div style={{ marginTop: 10, fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>
          Suggestions pres de ton niveau (1400-1500 ELO) :
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {SUGGESTED.map(p => (
            <FriendRowItem
              key={p.name}
              f={p}
              actionIcon={<SwordsIcon size={14} />}
              actionLabel="Defier"
              onClickAction={() => openChallenge(p)}
            />
          ))}

          {/* + Defier un joueur externe (non-ami) */}
          <button onClick={() => openChallenge(STRANGER)} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14,
            background: 'transparent', border: `1.5px dashed ${C.warm}`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: `1.5px dashed ${C.warm}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.warm, fontSize: 22, fontWeight: 700,
            }}>+</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.warm }}>
                Defier un joueur externe
              </div>
              <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
                Envoyer une invitation a quelqu'un qui n'est pas encore ami
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Mock venues for challenge form
const VENUES = [
  { name: 'Le Marais Ping',  addr: '12 rue des Tournelles', km: 1.2, tables: 'Table 3 dispo',  hint: 'Vous y jouez tous les deux', online: true },
  { name: 'Bastille TT',     addr: '8 tables',              km: 1.8, tables: null,              hint: null },
  { name: 'Cafe Oberkampf',  addr: 'Bar avec table',        km: 2.1, tables: null,              hint: null },
];

// Draft module-level : permet de naviguer vers le picker et revenir sans perdre le formulaire
let challengeDraft = null;

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function VenuePickerView({ onPick, currentOpponent }) {
  const { openSheet } = useUI();
  const [mode, setMode] = useState('clubs');
  const [clubs, setClubs]   = useState([]);
  const [tables, setTables] = useState([]);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [query, setQuery]   = useState('');
  const [country, setCountry] = useState('France');
  const [status, setStatus] = useState('Chargement des lieux...');

  useEffect(() => {
    fetch('/data/maps_clubs.csv')
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(text => {
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = lines.shift().split(',').map(h => h.replace(/^﻿/, '').trim());
        const parsed = [];
        for (const line of lines) {
          const cells = line.split(',').map(c => c.trim());
          const row = {};
          headers.forEach((h, i) => { row[h] = cells[i] || ''; });
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);
          if (row.club_nom && Number.isFinite(lat) && Number.isFinite(lon)) {
            parsed.push({ name: row.club_nom, pays: row.pays, lat, lon, url: row.url });
          }
        }
        setClubs(parsed);
        setStatus('');
      })
      .catch(() => setStatus('Impossible de charger les lieux'));
  }, []);

  useEffect(() => {
    if (mode !== 'tables' || tablesLoaded) return;
    fetch('/data/pingpong_tables_world.csv')
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(text => {
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = lines.shift().split(',').map(h => h.replace(/^﻿/, '').trim());
        const parsed = [];
        for (const line of lines) {
          const cells = line.split(',').map(c => c.trim());
          const row = {};
          headers.forEach((h, i) => { row[h] = cells[i] || ''; });
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            parsed.push({
              lat, lon,
              name: row.name || '',
              type: row.type_lieu || '',
              nb: parseInt(row.nombre_tables, 10) || 1,
              indoor: row.indoor || '',
              city: row.city || '',
            });
          }
        }
        setTables(parsed);
        setTablesLoaded(true);
      })
      .catch(() => {});
  }, [mode, tablesLoaded]);

  const countries = useMemo(() => {
    const set = new Set();
    clubs.forEach(c => { if (c.pays) set.add(c.pays); });
    return Array.from(set).sort();
  }, [clubs]);

  const tablesFiltered = useMemo(() => {
    if (country === 'Tous') return tables;
    const bb = TABLES_COUNTRY_BBOX[country];
    if (!bb) return tables;
    return tables.filter(t => t.lon >= bb.lon[0] && t.lon <= bb.lon[1] && t.lat >= bb.lat[0] && t.lat <= bb.lat[1]);
  }, [tables, country]);

  const mapView = COUNTRY_CENTER[country] || COUNTRY_CENTER.France;

  const onPickTable = (t) => {
    const placeName = t.name || (t.city ? `Table publique · ${t.city}` : `Table publique (${t.lat.toFixed(3)}, ${t.lon.toFixed(3)})`);
    onPick({
      name: placeName,
      pays: t.city || '',
      lat: t.lat, lon: t.lon,
      km: distanceKm(48.8566, 2.3522, t.lat, t.lon),
    });
  };

  const PARIS_LAT = 48.8566, PARIS_LON = 2.3522;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let src = country === 'Tous' ? clubs : clubs.filter(c => c.pays === country);
    if (q) src = src.filter(c => c.name.toLowerCase().includes(q));
    // sort by distance to Paris (proxy for "near you")
    src = src.map(c => ({ ...c, km: distanceKm(PARIS_LAT, PARIS_LON, c.lat, c.lon) }))
             .sort((a, b) => a.km - b.km);
    return src.slice(0, 50);
  }, [clubs, country, query]);

  const backToChallenge = () => {
    openSheet({ title: 'Nouveau defi', body: <NewChallengeView opponent={currentOpponent} /> });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button onClick={backToChallenge} style={{
        all: 'unset', cursor: 'pointer', alignSelf: 'flex-start',
        fontFamily: fontSans, fontSize: 13, fontWeight: 700,
        color: C.mint, letterSpacing: '0.08em',
        display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
        Defi
      </button>

      <div>
        <div style={kicker}>CHOISIR UN LIEU</div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 4 }}>
          {mode === 'clubs' ? `${clubs.length} clubs partout dans le monde` : `${tables.length || '...'} tables publiques dans le monde`}
        </div>
      </div>

      {/* Toggle Clubs / Tables */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: 'clubs',  label: 'CLUBS' },
          { id: 'tables', label: 'TABLES' },
        ].map(opt => {
          const active = mode === opt.id;
          return (
            <button key={opt.id} onClick={() => setMode(opt.id)} style={{
              all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
              padding: '11px', borderRadius: 12,
              border: `1px solid ${active ? C.cream : C.border}`,
              background: active ? 'rgba(239,229,200,0.14)' : 'rgba(8,22,17,0.45)',
              color: active ? C.cream : C.ink,
              fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.16em',
            }}>{opt.label}</button>
          );
        })}
      </div>

      {mode === 'clubs' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 999,
          background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
        }}>
          <span style={{ color: C.inkFaint, display: 'flex' }}><SearchIcon /></span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nom du club, ville..."
            style={{
              all: 'unset', flex: 1, fontFamily: fontSans, fontSize: 14, color: C.ink,
            }}
          />
        </div>
      )}

      {countries.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Tous', ...countries].map(c => {
            const active = country === c;
            return (
              <button key={c} onClick={() => setCountry(c)} style={{
                all: 'unset', cursor: 'pointer',
                padding: '6px 12px', borderRadius: 999,
                border: `1px solid ${active ? C.cream : C.border}`,
                background: active ? 'rgba(239,229,200,0.14)' : 'rgba(8,22,17,0.45)',
                color: active ? C.cream : C.ink,
                fontFamily: fontSans, fontWeight: 700, fontSize: 11.5, letterSpacing: '0.08em',
              }}>{c}</button>
            );
          })}
        </div>
      )}

      {mode === 'clubs' && status ? (
        <div style={{
          padding: '40px 16px', textAlign: 'center',
          fontFamily: fontSans, fontSize: 13, color: C.inkDim,
        }}>{status}</div>
      ) : mode === 'clubs' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => (
            <button key={c.name} onClick={() => onPick(c)} style={{
              all: 'unset', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 14,
              background: C.card, border: `1px solid ${C.border}`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: 'rgba(232,201,155,0.14)',
                border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.warm,
              }}>{Icon.pin(18)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
                  {c.pays}{Number.isFinite(c.km) ? ` · ${c.km.toFixed(1)} km de Paris` : ''}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: C.inkDim, fontFamily: fontSans, fontSize: 13 }}>
              Aucun lieu ne correspond
            </div>
          )}
        </div>
      ) : (
        <>
          {/* TABLES : carte avec clustering */}
          <div style={{ height: 420, borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            {!tablesLoaded ? (
              <div style={{
                height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#10251d',
                fontFamily: fontSans, fontSize: 13, color: C.inkDim,
              }}>Chargement des tables...</div>
            ) : (
              <MapContainer
                center={mapView.center}
                zoom={mapView.zoom}
                scrollWheelZoom
                worldCopyJump
                minZoom={2}
                maxBounds={[[-85, -200], [85, 200]]}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapCenterUpdater center={mapView.center} zoom={mapView.zoom} />
                <TableClusterLayer tables={tablesFiltered} onPick={onPickTable} />
              </MapContainer>
            )}
          </div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, textAlign: 'center' }}>
            {tablesLoaded ? `${tablesFiltered.length.toLocaleString('fr-FR')} tables · zoom pour eclater les clusters, clique sur une table pour la choisir` : ''}
          </div>
        </>
      )}
    </div>
  );
}

function getNextDays(n = 5) {
  const days = [];
  const labels = ['DIM','LUN','MAR','MER','JEU','VEN','SAM'];
  const today = new Date();
  for (let i = 1; i <= n; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({ label: labels[d.getDay()], num: d.getDate(), iso: d.toISOString().slice(0,10) });
  }
  return days;
}

function NewChallengeView({ opponent }) {
  const { openSheet, showToast, closeSheet } = useUI();
  const oppKey = opponent.full || opponent.name;
  const draft = (challengeDraft && challengeDraft.oppKey === oppKey) ? challengeDraft : null;
  const days = useMemo(() => getNextDays(5), []);
  const [format,        setFormat]        = useState(draft?.format ?? 'BO5');
  const [enjeu,         setEnjeu]         = useState(draft?.enjeu ?? 'classe');
  const [day,           setDay]           = useState(draft?.day ?? days[2].iso);
  const [hour,          setHour]          = useState(draft?.hour ?? '14h');
  const [customVenues,  setCustomVenues]  = useState(draft?.customVenues ?? []);
  const [venue,         setVenue]         = useState(draft?.venue ?? VENUES[0].name);
  const [message,       setMessage]       = useState(draft?.message ?? '');
  const allVenues = useMemo(() => [...customVenues, ...VENUES], [customVenues]);

  // Save state to module-level draft on every change
  useEffect(() => {
    challengeDraft = { oppKey, format, enjeu, day, hour, venue, message, customVenues };
  }, [oppKey, format, enjeu, day, hour, venue, message, customVenues]);

  const openVenuePicker = () => {
    openSheet({
      title: 'Choisir un lieu',
      body: <VenuePickerView
        currentOpponent={opponent}
        onPick={(c) => {
          const newVenue = {
            name: c.name,
            addr: c.pays || '',
            km: Number.isFinite(c.km) ? Number(c.km.toFixed(1)) : null,
            tables: null, hint: null,
          };
          const newCustom = [newVenue, ...customVenues.filter(v => v.name !== c.name)];
          challengeDraft = { ...challengeDraft, customVenues: newCustom, venue: c.name };
          openSheet({ title: 'Nouveau defi', body: <NewChallengeView opponent={opponent} /> });
        }}
      />,
    });
  };

  const dayObj = days.find(d => d.iso === day) || days[0];
  const recap = `${dayObj.label[0] + dayObj.label.slice(1).toLowerCase()} ${dayObj.num} · ${hour} · ${venue}`;

  const ELO_GAIN = 14;
  const ELO_LOSS = 12;
  const PRONO = 52;

  const FORMATS = [
    { id: 'BO3',   sub: '~20 min' },
    { id: 'BO5',   sub: '~35 min' },
    { id: 'BO7',   sub: '~50 min' },
    { id: 'Libre', sub: 'A voir'  },
  ];
  const HOURS = ['10h','11h','14h','16h','19h','Autre'];

  const submit = async () => {
    if (opponent.profileId || opponent.id) {
      try {
        await saveChallenge({
          selfId: opponent.selfId || SELF_PROFILE_ID,
          opponentId: opponent.profileId || opponent.id,
          matchDate: recap,
          venue,
          format,
          enjeu: enjeu === 'classe' ? 'Classe' : 'Amical',
          message,
          gainW: ELO_GAIN,
          lossL: ELO_LOSS,
          fromElo: 1450,
          toElo: opponent.elo,
        });
      } catch (error) {
        console.error(error);
        showToast({ text: 'Défi affiché, mais pas sauvegardé dans Supabase.', duration: 2600 });
        return;
      }
    }
    showToast(`Defi envoye a ${opponent.full || opponent.name}`);
    setTimeout(closeSheet, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <button onClick={() => openSheet({ title: 'Defier', body: <ChallengeView /> })}
              style={{
                all: 'unset', cursor: 'pointer', alignSelf: 'flex-start',
                fontFamily: fontSans, fontSize: 13, fontWeight: 700,
                color: C.mint, letterSpacing: '0.08em',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
        Defier
      </button>

      {/* ADVERSAIRE */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>ADVERSAIRE</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px', borderRadius: 14,
          background: C.card, border: `1px solid ${C.border}`,
        }}>
          <FriendAvatar color={opponent.color} online={opponent.online} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 16, color: C.ink }}>{opponent.full || opponent.name}</div>
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 4 }}>
              {opponent.elo} ELO{opponent.style ? ` · ${opponent.style}` : ' · Attaquant'}{opponent.rank ? ` · ${opponent.rank}` : ' · #24'}
            </div>
          </div>
        </div>
        {/* ELO impact tiles */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <StatTile value={`+${ELO_GAIN} ELO`}  label="SI TU GAGNES" color="#3DD16B" bg="rgba(61,209,107,0.06)" />
          <StatTile value={`-${ELO_LOSS} ELO`}  label="SI TU PERDS"  color="#E89B8B" bg="rgba(232,155,139,0.06)" />
          <StatTile value={`${PRONO}%`}         label="PRONOSTIC"    color={C.warm}   bg="rgba(232,201,155,0.06)" />
        </div>
      </div>

      {/* FORMAT */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>FORMAT</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {FORMATS.map(f => {
            const active = format === f.id;
            return (
              <button key={f.id} onClick={() => setFormat(f.id)} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                padding: '12px 6px', borderRadius: 12,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? 'rgba(232,201,155,0.14)' : 'rgba(8,22,17,0.45)',
                color: active ? C.warm : C.ink,
                fontFamily: fontSans, fontWeight: 800, fontSize: 14,
              }}>
                <div>{f.id}</div>
                <div style={{ fontWeight: 500, fontSize: 11, color: C.inkDim, marginTop: 4 }}>{f.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ENJEU */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>ENJEU</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'classe',  label: 'Classe',  sub: "Compte pour l'ELO" },
            { id: 'amical',  label: 'Amical',  sub: 'Pas de gain/perte' },
          ].map(e => {
            const active = enjeu === e.id;
            return (
              <button key={e.id} onClick={() => setEnjeu(e.id)} style={{
                all: 'unset', cursor: 'pointer', flex: 1,
                padding: '12px 16px', borderRadius: 12,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? 'rgba(232,201,155,0.14)' : 'rgba(8,22,17,0.45)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: fontSans, fontWeight: 800, fontSize: 14,
                  color: active ? C.warm : C.ink,
                }}>
                  <span style={{ fontSize: 8 }}>●</span> {e.label}
                </div>
                <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>{e.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DATE */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>DATE PROPOSEE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {days.map(d => {
            const active = day === d.iso;
            return (
              <button key={d.iso} onClick={() => setDay(d.iso)} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                padding: '12px 4px', borderRadius: 12,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? C.warm : 'rgba(8,22,17,0.45)',
                color: active ? '#0C211A' : C.ink,
                fontFamily: fontSans,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.8 }}>{d.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{d.num}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* HORAIRE */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>HORAIRE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {HOURS.map(h => {
            const active = hour === h;
            return (
              <button key={h} onClick={() => setHour(h)} style={{
                all: 'unset', cursor: 'pointer',
                padding: '8px 16px', borderRadius: 999,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? C.warm : 'rgba(8,22,17,0.45)',
                color: active ? '#0C211A' : C.ink,
                fontFamily: fontSans, fontWeight: 700, fontSize: 13,
              }}>{h}</button>
            );
          })}
        </div>
        <div style={{ marginTop: 8, fontFamily: fontSans, fontSize: 12, color: '#3DD16B' }}>
          ● Creneau correspondant a vos dispos
        </div>
      </div>

      {/* LIEU */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={kicker}>LIEU</span>
          <button onClick={openVenuePicker} style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: fontSans, fontSize: 13, fontWeight: 600, color: C.warm,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {Icon.map(14)} Voir sur la carte
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allVenues.map(v => {
            const active = venue === v.name;
            return (
              <button key={v.name} onClick={() => setVenue(v.name)} style={{
                all: 'unset', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 14,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? 'rgba(232,201,155,0.10)' : C.card,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(232,201,155,0.14)',
                  border: `1px solid ${active ? C.warm : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: active ? C.warm : C.inkFaint,
                }}>{Icon.pin(18)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>{v.name}</div>
                  <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
                    {v.addr} · {v.km} km
                  </div>
                  {(v.tables || v.hint) && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {v.tables && (
                        <span style={{
                          fontFamily: fontSans, fontSize: 11, fontWeight: 700,
                          color: '#3DD16B', background: 'rgba(61,209,107,0.14)',
                          border: '1px solid rgba(61,209,107,0.32)',
                          padding: '2px 8px', borderRadius: 999,
                        }}>{v.tables}</span>
                      )}
                      {v.hint && <span style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>{v.hint}</span>}
                    </div>
                  )}
                </div>
                {active && <span style={{ color: C.warm }}>{Icon.check(20)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* MESSAGE */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>MESSAGE <span style={{ color: C.inkFaint, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span></div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Hate de retenter ma chance apres notre dernier match ! 🔥"
          rows={3}
          style={{
            all: 'unset', width: '100%', boxSizing: 'border-box',
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(8,22,17,0.55)', border: `1px solid ${C.border}`,
            fontFamily: fontItalic, fontStyle: 'italic',
            fontSize: 14, color: C.ink, lineHeight: 1.5,
          }}
        />
      </div>

      {/* Recap + submit */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, borderTop: `1px solid ${C.border}`,
        fontFamily: fontSans, fontSize: 13,
      }}>
        <span style={{ color: C.inkDim }}>Recap</span>
        <span style={{ color: C.ink, fontWeight: 700 }}>{recap}</span>
      </div>

      <button onClick={submit} style={{
        all: 'unset', cursor: 'pointer', textAlign: 'center',
        padding: '17px', borderRadius: 14,
        background: C.warm, color: '#0C211A',
        fontFamily: fontSans, fontWeight: 800, fontSize: 14,
        letterSpacing: '0.18em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <SwordsIcon size={18} />
        ENVOYER LE DEFI
      </button>

      <div style={{
        fontFamily: fontSans, fontSize: 12, color: C.inkDim, textAlign: 'center',
        marginTop: -8,
      }}>
        {opponent.full || opponent.name} recevra une notification et pourra accepter, modifier ou refuser
      </div>
    </div>
  );
}

// Mock thread per contact (id by full name)
const MOCK_THREADS = {
  default: [
    { from: 'them', text: 'Salut !', when: '10:24' },
    { from: 'me',   text: 'Hey, ca va ?', when: '10:25' },
    { from: 'them', text: 'Tres bien, et toi ? On se fait un match cette semaine ?', when: '10:26' },
  ],
  'Marc Leclerc': [
    { from: 'them', text: 'Yo, dispo samedi 14h pour un set ?', when: '12:14' },
    { from: 'me',   text: 'Carrement, Le Marais ?', when: '12:18' },
    { from: 'them', text: 'Defi propose · Samedi 14h', when: '12:20', isDefi: true },
  ],
  'Theo Rousseau': [
    { from: 'them', text: 'GG pour hier !', when: '09:02' },
    { from: 'them', text: 'Revanche quand tu veux 🏓', when: '09:02' },
    { from: 'me',   text: 'Avec plaisir, t\'as bien joue', when: '09:10' },
  ],
  'Sophie Martin': [
    { from: 'them', text: 'Defi a confirmer · Dim. 11h', when: '08:30', isDefi: true },
  ],
  'Karim Benali': [
    { from: 'them', text: 'On se voit demain a 19h ?', when: 'Hier' },
    { from: 'me',   text: 'Ok ca marche, a demain 👌', when: 'Hier' },
  ],
  'Lea Petit': [
    { from: 'them', text: '[Message vocal · 0:24]', when: 'Hier' },
  ],
  'Antoine D.': [
    { from: 'them', text: "Salut, j'ai vu ton profil sur l'app. Tu joues au Marais ? On pourrait se faire un match.", when: '15/05' },
  ],
};

function ChatView({ contact, onBack, backLabel = 'Messages' }) {
  const { openSheet, closeSheet, showToast } = useUI();
  const initialMessages = useMemo(
    () => (contact.messages?.length ? contact.messages : (MOCK_THREADS[contact.full] || MOCK_THREADS.default)),
    [contact.conversationId, contact.full, contact.messages],
  );
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const when = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setMessages(m => [...m, { from: 'me', text, when }]);
    setDraft('');
    if (!contact.conversationId) return;
    try {
      await saveMessage({
        conversationId: contact.conversationId,
        senderId: contact.selfId || SELF_PROFILE_ID,
        text,
      });
    } catch (error) {
      console.error(error);
      showToast({ text: 'Message gardé à l’écran, mais pas sauvegardé dans Supabase.', duration: 2600 });
    }
  };

  const handleBack = onBack || closeSheet;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* Back + contact header */}
      <button onClick={handleBack}
              style={{
                all: 'unset', cursor: 'pointer',
                fontFamily: fontSans, fontSize: 13, fontWeight: 700,
                color: C.mint, letterSpacing: '0.08em',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
        {backLabel}
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 14,
        background: C.card, border: `1px solid ${C.border}`,
      }}>
        <FriendAvatar color={contact.color} online={contact.online} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>{contact.full || contact.name}</div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
            {contact.online ? <><span style={{ color: '#3DD16B' }}>●</span> en ligne</> : 'hors ligne'}
          </div>
        </div>
        <button onClick={() => openSheet({ title: 'Nouveau defi', body: <NewChallengeView opponent={contact} /> })} style={{
          all: 'unset', cursor: 'pointer',
          padding: '8px 10px', borderRadius: 10,
          border: `1px solid ${C.borderHi}`, color: C.cream,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: fontSans, fontSize: 12, fontWeight: 700,
        }}><SwordsIcon size={14} />Defier</button>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: 8,
        overflowY: 'auto', paddingBottom: 8, minHeight: 200,
      }}>
        {messages.map((m, i) => {
          const mine = m.from === 'me';
          return (
            <div key={i} style={{
              alignSelf: mine ? 'flex-end' : 'flex-start',
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: 16,
              background: mine ? C.warm : C.card,
              color: mine ? '#0C211A' : C.ink,
              border: mine ? 'none' : `1px solid ${C.border}`,
              borderBottomRightRadius: mine ? 4 : 16,
              borderBottomLeftRadius: mine ? 16 : 4,
              fontFamily: fontSans, fontSize: 14, lineHeight: 1.4,
            }}>
              {m.isDefi && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4,
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                  color: mine ? '#0C211A' : C.warm,
                }}><SwordsIcon size={12} />DEFI</div>
              )}
              <div>{m.text}</div>
              <div style={{
                marginTop: 4, fontSize: 10, opacity: 0.65,
                textAlign: 'right',
              }}>{m.when}</div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '8px',
        borderRadius: 999,
        background: 'rgba(8,22,17,0.55)',
        border: `1px solid ${C.border}`,
      }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Ecrire un message..."
          style={{
            all: 'unset', flex: 1, padding: '8px 12px',
            fontFamily: fontSans, fontSize: 14, color: C.ink,
          }}
        />
        <button onClick={send} disabled={!draft.trim()} style={{
          all: 'unset', cursor: draft.trim() ? 'pointer' : 'not-allowed',
          width: 38, height: 38, borderRadius: '50%',
          background: draft.trim() ? C.warm : 'rgba(232,201,155,0.25)',
          color: '#0C211A',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/>
            <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Small icons for clubs view stats
const EyeIcon  = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>;
const HeartIcon = ({ size = 13 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C.5 8.4 2.5 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 4 0 6 4.4 4 8-2.5 4.5-9.5 9-9.5 9z"/></svg>;
const PencilIcon = ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4l6 6L9 21H3v-6z"/></svg>;

function ClubChip({ club, onClick }) {
  const [light, mid, dark] = club.color;
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer', flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 16,
      background: club.active ? 'rgba(232,201,155,0.10)' : 'rgba(8,22,17,0.45)',
      border: `1.5px solid ${club.active ? C.warm : C.border}`,
      minWidth: 220,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
        border: `1.5px solid ${C.borderHi}`,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>{club.name}</div>
        <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginTop: 2 }}>{club.sub}</div>
      </div>
      {club.active && <span style={{ color: C.warm, display: 'flex' }}>{Icon.check(16)}</span>}
    </button>
  );
}

function GroupAvatars({ colors, extra }) {
  const [a, b] = colors;
  return (
    <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 40, height: 40, borderRadius: '50%',
        background: `radial-gradient(60% 60% at 35% 30%, ${a[0]} 0%, ${a[1]} 60%, ${a[2]} 100%)`,
        border: `1.5px solid ${C.borderHi}`,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 40, height: 40, borderRadius: '50%',
        background: `radial-gradient(60% 60% at 35% 30%, ${b[0]} 0%, ${b[1]} 60%, ${b[2]} 100%)`,
        border: '2px solid #143226',
      }} />
      {extra > 0 && (
        <div style={{
          position: 'absolute', top: -2, right: -4,
          minWidth: 22, height: 18, padding: '0 5px',
          borderRadius: 999, background: C.warm, color: '#0C211A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fontSans, fontWeight: 800, fontSize: 10,
        }}>+{extra}</div>
      )}
    </div>
  );
}

function TeamGroupRow({ g, onClick }) {
  const accent = g.tag ? C.warm : 'transparent';
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 14,
      background: C.card, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${accent}`,
    }}>
      <GroupAvatars colors={g.colors} extra={g.extra} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>{g.name}</span>
          {g.tag && (
            <span style={{
              fontFamily: fontSans, fontWeight: 800, fontSize: 9,
              color: C.warm, background: 'rgba(232,201,155,0.16)',
              border: '1px solid rgba(232,201,155,0.32)',
              padding: '2px 8px', borderRadius: 999, letterSpacing: '0.12em',
            }}>{g.tag}</span>
          )}
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: g.unread ? C.warm : C.inkDim, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {g.preview}
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 11, color: C.inkFaint, marginTop: 4 }}>{g.meta}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ fontFamily: fontSans, fontSize: 12, fontWeight: g.unread ? 700 : 500, color: g.unread ? C.warm : C.inkDim }}>{g.when}</span>
        {g.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.warm }} />}
      </div>
    </button>
  );
}

function ClubsTabContent({ clubs = [], announcements = [], training = null, teamGroups = [] }) {
  const { openSheet, showToast } = useUI();
  const { profile } = useAuth();
  const isClubPlayer = profile?.player_type === 'competition';
  const hasClubs = clubs.length > 0;

  // Suggestions : clubs proches (depuis maps_clubs.csv) si user pas en club
  const [nearbyClubs, setNearbyClubs] = useState([]);
  useEffect(() => {
    if (hasClubs || isClubPlayer) return undefined;
    let cancelled = false;
    fetch('/data/maps_clubs.csv')
      .then(r => r.text())
      .then(text => {
        if (cancelled) return;
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = lines.shift().split(',').map(h => h.replace(/^﻿/, '').trim());
        const userPos = (() => {
          try {
            const raw = localStorage.getItem('pp_user_pos');
            return raw ? JSON.parse(raw) : [48.8566, 2.3522]; // Paris fallback
          } catch { return [48.8566, 2.3522]; }
        })();
        const [ulat, ulon] = userPos;
        const parsed = [];
        for (const line of lines) {
          const cells = line.split(',');
          const row = {};
          headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);
          if (row.club_nom && Number.isFinite(lat) && Number.isFinite(lon)) {
            const dlat = (lat - ulat) * 111;
            const dlon = (lon - ulon) * 111 * Math.cos(ulat * Math.PI / 180);
            const km = Math.sqrt(dlat * dlat + dlon * dlon);
            parsed.push({ name: row.club_nom, pays: row.pays, url: row.url, km });
          }
        }
        parsed.sort((a, b) => a.km - b.km);
        setNearbyClubs(parsed.slice(0, 6));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [hasClubs, isClubPlayer]);

  // Si pas membre de club ET joueur non-competition → afficher uniquement les suggestions
  if (!hasClubs && !isClubPlayer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={kicker}>SUGGESTIONS</div>
          <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 24, lineHeight: 1.1, color: C.ink, marginTop: 6 }}>
            Clubs proches de toi
          </div>
          <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6, lineHeight: 1.5 }}>
            Tu n'es membre d'aucun club. Voici des clubs autour de toi si tu veux te lancer.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {nearbyClubs.length === 0 ? (
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, padding: '14px 0', textAlign: 'center' }}>
              Chargement des clubs…
            </div>
          ) : nearbyClubs.map(c => (
            <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
               style={{
                 textDecoration: 'none',
                 display: 'flex', alignItems: 'center', gap: 12,
                 padding: '12px 14px', borderRadius: 14,
                 background: C.card, border: `1px solid ${C.border}`,
               }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: 'rgba(232,201,155,0.14)', border: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.warm,
              }}>{Icon.pin(18)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
                  {c.pays} · {c.km.toFixed(1)} km
                </div>
              </div>
              <span style={{ color: C.warm, fontFamily: fontSans, fontSize: 12, fontWeight: 700 }}>Voir →</span>
            </a>
          ))}
        </div>

        <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
          Données issues de la carte Finder · ouvre Finder pour explorer la carte complète.
        </div>
      </div>
    );
  }

  // Cas user club mais sans rien de seede : message neutre
  if (!hasClubs) {
    return (
      <div style={{
        padding: '40px 16px', textAlign: 'center',
        fontFamily: fontSans, fontSize: 14, color: C.inkDim, lineHeight: 1.5,
      }}>
        Tu n'es membre d'aucun club pour le moment.<br />
        Va dans Finder pour en trouver un.
      </div>
    );
  }

  // A partir d'ici : user a au moins un club -> affichage classique
  const a = announcements[0];
  const [light, mid, dark] = a ? a.color : ['#cccccc','#666666','#222222'];
  const t = training;

  const openCoachChat = () => {
    const coach = { full: a.author, name: a.author, color: a.color, online: false };
    openSheet({ title: a.author, body: <ChatView contact={coach} /> });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* MES CLUBS */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>MES CLUBS</div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {clubs.map(c => (
            <ClubChip
              key={c.name}
              club={c}
              onClick={() => showToast(c.active ? `${c.name} · club principal` : `Bascule sur ${c.name}`)}
            />
          ))}
        </div>
      </div>

      {/* ANNONCE DU COACH */}
      {a && (
      <div style={{
        padding: '14px 16px', borderRadius: 16,
        background: 'rgba(232,201,155,0.06)', border: `1px solid rgba(232,201,155,0.30)`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: fontSans, fontSize: 11, fontWeight: 800, color: C.warm, letterSpacing: '0.16em' }}>ANNONCE DU COACH</span>
          <span style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>{a.when}</span>
        </div>
        <button onClick={openCoachChat} style={{
          all: 'unset', cursor: 'pointer', width: '100%',
          display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
            border: `1.5px solid ${C.borderHi}`,
          }} />
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>{a.author}</div>
            <div style={{ fontFamily: fontSans, fontSize: 13.5, color: C.ink, marginTop: 4, lineHeight: 1.45 }}>
              ⚠️ {a.message.split('20h00').map((part, i, arr) => i < arr.length - 1 ? <>{part}<strong style={{ color: C.warm }}>20h00</strong></> : part)}
            </div>
          </div>
        </button>
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: `1px solid rgba(232,201,155,0.18)`,
          display: 'flex', gap: 16, fontFamily: fontSans, fontSize: 12, color: C.inkDim,
        }}>
          <button onClick={() => showToast(`${a.vus} membres ont vu l'annonce`)} style={{
            all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
          }}><EyeIcon /> {a.vus} vus</button>
          <button onClick={openCoachChat} style={{
            all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
          }}><ChatIcon size={13} /> {a.comments}</button>
          <button onClick={() => showToast('Annonce likee')} style={{
            all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: '#E89B8B',
          }}><HeartIcon /> {a.likes}</button>
        </div>
      </div>
      )}

      {/* Prochain entraînement */}
      {t && (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px', borderRadius: 16,
        background: 'rgba(61,209,107,0.06)', border: `1px solid rgba(61,209,107,0.30)`,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: 'rgba(61,209,107,0.14)', border: '1px solid rgba(61,209,107,0.40)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#3DD16B',
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em' }}>{t.dayLabel}</div>
          <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{t.dayNum}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>{t.title}</div>
          <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.inkDim, marginTop: 3 }}>{t.details}</div>
        </div>
        <button onClick={() => showToast('Presence confirmee · Jeu 23 20h')} style={{
          all: 'unset', cursor: 'pointer',
          padding: '9px 16px', borderRadius: 10,
          background: 'rgba(61,209,107,0.14)', border: '1px solid rgba(61,209,107,0.50)',
          color: '#3DD16B',
          fontFamily: fontSans, fontWeight: 700, fontSize: 13,
        }}>Je viens</button>
      </div>
      )}

      {/* ÉQUIPES & GROUPES */}
      {teamGroups.length > 0 && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ ...kicker, lineHeight: 1.2 }}>ÉQUIPES &amp; GROUPES</span>
          <button onClick={() => showToast('Toutes les equipes')} style={{
            all: 'unset', cursor: 'pointer',
            fontFamily: fontSans, fontSize: 13, fontWeight: 600, color: C.warm,
          }}>Voir tout</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {teamGroups.map((g) => {
            const fakeContact = {
              ...g,
              full: g.name, online: false, color: g.colors[0],
            };
            return (
              <TeamGroupRow
                key={g.name}
                g={g}
                onClick={() => openSheet({ title: g.name, body: <ChatView contact={fakeContact} backLabel="Messages" /> })}
              />
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

function IncomingChallengeCard({ c, onAccept, onDecline, onModify }) {
  const { openSheet } = useUI();
  const [light, mid, dark] = c.color;

  const openProfileChat = () => {
    const full = c.full || `${c.from} Leclerc`;
    const opp = { ...c, full, name: c.from, elo: c.elo, online: c.online, color: c.color };
    openSheet({ title: full, body: <ChatView contact={opp} /> });
  };
  const accept  = onAccept  || (() => {});
  const decline = onDecline || (() => {});
  const modify  = onModify  || (() => {});
  return (
    <div style={{
      position: 'relative',
      padding: '16px 16px 14px', borderRadius: 18,
      background: 'rgba(232,201,155,0.05)', border: '1px solid rgba(232,201,155,0.35)',
      overflow: 'hidden',
    }}>
      {/* NOUVEAU badge */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        background: C.warm, color: '#0C211A',
        padding: '5px 12px', borderRadius: '0 18px 0 14px',
        fontFamily: fontSans, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em',
      }}>NOUVEAU · {c.when}</div>

      {/* Header */}
      <button onClick={openProfileChat} style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, marginTop: 4, width: '100%',
      }}>
        <FriendAvatar color={c.color} online={c.online} size={56} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 17, color: C.ink }}>{c.from} te défie</div>
          <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 2 }}>{c.elo} ELO · {c.rank}</div>
        </div>
      </button>

      {/* Details */}
      <div style={{
        padding: '10px 12px', borderRadius: 12,
        background: 'rgba(8,22,17,0.55)', border: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontFamily: fontSans, fontSize: 13.5, color: C.ink, fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.warm }}>{Icon.calendar(14)} <span style={{ color: C.ink }}>{c.date}</span></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.warm }}>{Icon.pin(14)} <span style={{ color: C.ink }}>{c.venue}</span></span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.ink,
            background: 'rgba(8,22,17,0.6)', border: `1px solid ${C.border}`,
            padding: '5px 10px', borderRadius: 8,
          }}>{c.format}</span>
          <span style={{
            fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.warm,
            background: 'rgba(232,201,155,0.10)', border: '1px solid rgba(232,201,155,0.30)',
            padding: '5px 10px', borderRadius: 8,
          }}>{c.enjeu}</span>
          <span style={{
            fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: '#3DD16B',
            background: 'rgba(61,209,107,0.10)', border: '1px solid rgba(61,209,107,0.30)',
            padding: '5px 10px', borderRadius: 8,
          }}>+{c.gainW} si W</span>
          <span style={{
            fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: '#E89B8B',
            background: 'rgba(232,155,139,0.10)', border: '1px solid rgba(232,155,139,0.30)',
            padding: '5px 10px', borderRadius: 8,
          }}>-{c.lossL} si L</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={accept} style={{
          all: 'unset', cursor: 'pointer', flex: 2, textAlign: 'center',
          padding: '12px', borderRadius: 12,
          background: '#3DD16B', color: '#0C211A',
          fontFamily: fontSans, fontWeight: 800, fontSize: 14,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>{Icon.check(16)} Accepter</button>
        <button onClick={modify} style={{
          all: 'unset', cursor: 'pointer', flex: 1.4, textAlign: 'center',
          padding: '12px', borderRadius: 12,
          background: 'rgba(242,247,242,0.10)', color: C.ink,
          border: `1px solid ${C.borderHi}`,
          fontFamily: fontSans, fontWeight: 700, fontSize: 14,
        }}>Modifier</button>
        <button onClick={decline} aria-label="Refuser" style={{
          all: 'unset', cursor: 'pointer',
          width: 46, padding: '12px 0', textAlign: 'center', borderRadius: 12,
          background: 'rgba(232,155,139,0.10)', color: '#E89B8B',
          border: '1px solid rgba(232,155,139,0.35)',
          fontFamily: fontSans, fontWeight: 800, fontSize: 18,
        }}>×</button>
      </div>
    </div>
  );
}

function StatusPill({ color, bg, border, children }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: 10,
      background: bg, border: `1px solid ${border}`,
      fontFamily: fontSans, fontSize: 12, fontWeight: 700, color,
      letterSpacing: '0.02em',
    }}>{children}</div>
  );
}

function CornerBadge({ color, bg, label }) {
  return (
    <div style={{
      position: 'absolute', top: 0, right: 0,
      background: bg, color, textAlign: 'right',
      padding: '5px 12px 6px', borderRadius: '0 14px 0 14px',
      fontFamily: fontSans, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em',
      lineHeight: 1.35,
    }}>{label}</div>
  );
}

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginRight: 2 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: '50%', background: C.warm,
          opacity: 0.8,
          animation: `pp-typing 1.2s ${i * 0.15}s infinite ease-in-out`,
        }} />
      ))}
    </span>
  );
}

function OutgoingChallengeRow({ c, onAcceptCounter, onProposeNew, onDiscuss }) {
  const { openSheet } = useUI();
  const [light, mid, dark] = c.color;
  const open = () => openSheet({ title: c.full, body: <ChatView contact={c} /> });

  const isRefused = c.status === 'refused';
  const isCounter = c.status === 'counter';
  const isAccepted = c.status === 'accepted';

  const cornerBadge = (() => {
    if (isAccepted) return { label: 'ACCEPTÉ ✓', bg: 'rgba(61,209,107,0.92)', color: '#0C211A' };
    if (isRefused) return { label: 'REFUSÉ',     bg: 'rgba(232,155,139,0.92)', color: '#0C211A' };
    if (isCounter) return { label: 'CONTRE-PROPOSITION', bg: C.warm, color: '#0C211A' };
    return null;
  })();

  const cardBorderColor = isRefused ? 'rgba(232,155,139,0.45)'
                       : isCounter ? 'rgba(232,201,155,0.45)'
                       : isAccepted ? 'rgba(61,209,107,0.45)'
                       : C.border;
  const cardBg = isRefused ? 'rgba(232,155,139,0.06)'
              : isCounter ? 'rgba(232,201,155,0.05)'
              : isAccepted ? 'rgba(61,209,107,0.06)'
              : C.card;

  return (
    <div style={{
      position: 'relative',
      padding: cornerBadge ? '14px 14px 14px' : '12px 14px',
      paddingTop: cornerBadge ? 30 : 12,
      borderRadius: 14,
      background: cardBg, border: `1px solid ${cardBorderColor}`,
      overflow: 'hidden',
    }}>
      {cornerBadge && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: cornerBadge.bg, color: cornerBadge.color, textAlign: 'right',
          padding: '5px 12px 6px', borderRadius: '0 14px 0 14px',
          fontFamily: fontSans, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em',
          lineHeight: 1.35,
        }}>
          {cornerBadge.label}<br />
          <span style={{ fontWeight: 600, fontSize: 10, opacity: 0.85 }}>{c.when}</span>
        </div>
      )}

      <button onClick={open} style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
          border: `1.5px solid ${C.borderHi}`,
          opacity: isRefused ? 0.55 : 1,
        }} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>{c.full}</span>
            {!cornerBadge && (
              <span style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, flexShrink: 0 }}>{c.when}</span>
            )}
          </div>
          {!isCounter && (
            <div style={{
              fontFamily: fontSans, fontSize: 13,
              color: isRefused ? C.inkFaint : C.inkDim,
              marginTop: 4,
              textDecoration: isRefused ? 'line-through' : 'none',
            }}>{c.summary}</div>
          )}
        </div>
      </button>

      {/* Status pill par état */}
      <div style={{ marginTop: 8 }}>
        {c.status === 'sent' && (
          <StatusPill
            color={C.inkDim}
            bg="rgba(184,220,197,0.06)"
            border={C.border}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            Envoyé · pas encore vu
          </StatusPill>
        )}
        {c.status === 'seen' && (
          <StatusPill
            color={C.warm}
            bg="rgba(232,201,155,0.12)"
            border="rgba(232,201,155,0.40)"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Vu il y a {c.seenAgo} · réfléchit
          </StatusPill>
        )}
        {c.status === 'typing' && (
          <StatusPill
            color={C.warm}
            bg="rgba(232,201,155,0.10)"
            border="rgba(232,201,155,0.35)"
          >
            <TypingDots />
            {c.from} répond…
          </StatusPill>
        )}
        {c.status === 'accepted' && (
          <StatusPill
            color="#3DD16B"
            bg="rgba(61,209,107,0.12)"
            border="rgba(61,209,107,0.40)"
          >
            {Icon.check(13)} {c.from} a accepté · rangé dans Acceptés ↑
          </StatusPill>
        )}
        {isRefused && (
          <>
            <StatusPill color="#E89B8B" bg="rgba(232,155,139,0.12)" border="rgba(232,155,139,0.40)">
              <span style={{ fontWeight: 800 }}>×</span>
              {c.from} a refusé · "{c.refusalReason}"
            </StatusPill>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={onProposeNew} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                padding: '11px', borderRadius: 12,
                background: 'rgba(232,201,155,0.14)', color: C.warm,
                border: '1px solid rgba(232,201,155,0.40)',
                fontFamily: fontSans, fontWeight: 700, fontSize: 13,
              }}>Proposer un autre créneau</button>
              <button onClick={open} aria-label="Discuter" style={{
                all: 'unset', cursor: 'pointer',
                width: 44, padding: '11px 0', textAlign: 'center', borderRadius: 12,
                background: 'transparent', border: `1px solid ${C.borderHi}`,
                color: C.ink,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}><ChatIcon size={16} /></button>
            </div>
          </>
        )}
        {isCounter && (
          <>
            <div style={{
              padding: '10px 12px', borderRadius: 12,
              background: 'rgba(8,22,17,0.55)', border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: 4, alignItems: 'center', fontFamily: fontSans, fontSize: 13 }}>
                <span style={{ ...kicker, fontSize: 10 }}>TOI</span>
                <span style={{ color: C.inkFaint, textDecoration: 'line-through' }}>{c.counter.you}</span>
                <span style={{ ...kicker, fontSize: 10, color: C.warm }}>ELLE</span>
                <span style={{ color: C.warm, fontWeight: 800 }}>{c.counter.them}</span>
              </div>
            </div>
            <div style={{
              marginTop: 8,
              fontFamily: fontItalic, fontStyle: 'italic',
              fontSize: 13, color: C.ink,
            }}>"{c.counter.message}"</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={onAcceptCounter} style={{
                all: 'unset', cursor: 'pointer', flex: 1.4, textAlign: 'center',
                padding: '11px', borderRadius: 12,
                background: C.warm, color: '#0C211A',
                fontFamily: fontSans, fontWeight: 800, fontSize: 13,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>{Icon.check(14)} Accepter {c.counter.them.split('·')[0].trim()}</button>
              <button onClick={onDiscuss || open} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                padding: '11px', borderRadius: 12,
                background: 'transparent', border: `1px solid ${C.borderHi}`,
                color: C.ink,
                fontFamily: fontSans, fontWeight: 700, fontSize: 13,
              }}>Discuter</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AcceptedView({ challenge: c }) {
  const { closeSheet, showToast } = useUI();
  const [lightOpp, midOpp, darkOpp] = c.color;

  const onAddCalendar = () => showToast('Ajoute a Google Calendar');
  const onMessage = () => {
    const contact = { full: `${c.from} Leclerc`, name: c.from, elo: c.elo, online: c.online, color: c.color };
    showToast(`Message envoye a ${c.from}`);
    setTimeout(closeSheet, 400);
  };
  const onSeeMatches = () => { showToast('Defi range dans Mes Matchs'); setTimeout(closeSheet, 400); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 8 }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(232,201,155,0.16)',
          border: `2px solid ${C.warm}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.warm,
          boxShadow: '0 8px 28px rgba(232,201,155,0.25)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5 10 18l10-12"/>
          </svg>
        </div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 32, letterSpacing: '0.04em',
          color: C.ink, marginTop: 6,
        }}>DÉFI ACCEPTÉ</div>
        <div style={{ fontFamily: fontItalic, fontStyle: 'italic', fontSize: 16, color: C.ink }}>Que le meilleur gagne !</div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim }}>
          {c.from} reçoit ta confirmation à l'instant.
        </div>
      </div>

      {/* VS card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '14px 16px', borderRadius: 16,
        background: C.card, border: `1px solid ${C.border}`,
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%', margin: '0 auto',
            background: 'radial-gradient(60% 60% at 35% 30%, #d6b890 0%, #6b4a2e 60%, #1c100a 100%)',
            border: `1.5px solid ${C.borderHi}`,
          }} />
          <div style={{ marginTop: 8, fontFamily: fontSans, fontWeight: 700, fontSize: 13, color: C.ink }}>Toi</div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>1450</div>
        </div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 22, color: C.warm,
          letterSpacing: '0.06em',
        }}>VS</div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            width: 50, height: 50, borderRadius: '50%', margin: '0 auto',
            background: `radial-gradient(60% 60% at 35% 30%, ${lightOpp} 0%, ${midOpp} 60%, ${darkOpp} 100%)`,
            border: `1.5px solid ${C.borderHi}`,
          }} />
          <div style={{ marginTop: 8, fontFamily: fontSans, fontWeight: 700, fontSize: 13, color: C.ink }}>{c.from}</div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>{c.elo}</div>
        </div>
      </div>

      {/* Info card */}
      <div style={{
        padding: '4px 16px', borderRadius: 16,
        background: C.card, border: `1px solid ${C.border}`,
      }}>
        {[
          ['DATE',   `Samedi 21 · 14h00`],
          ['LIEU',   `Marais · Table 3`],
          ['FORMAT', `${c.format} · ${c.enjeu}`],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={kicker}>{k}</span>
            <span style={{ fontFamily: fontSans, fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <span style={kicker}>ENJEU</span>
          <span style={{ fontFamily: fontSans, fontSize: 14, fontWeight: 700, textAlign: 'right' }}>
            <span style={{ color: '#3DD16B' }}>+{c.gainW}</span>
            <span style={{ color: C.inkDim }}> / </span>
            <span style={{ color: '#E89B8B' }}>-{c.lossL}</span>
            <span style={{ color: C.inkDim, fontWeight: 500, fontSize: 12, marginLeft: 4 }}>ELO</span>
          </span>
        </div>
      </div>

      {/* PROCHAINES ETAPES */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>PROCHAINES ÉTAPES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onAddCalendar} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 14,
            background: C.card, border: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(232,201,155,0.14)', border: '1px solid rgba(232,201,155,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.warm,
            }}>{Icon.calendar(18)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>Ajouter à mon agenda</div>
              <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>Google Cal · Apple Calendar</div>
            </div>
            <span style={{ color: C.inkFaint }}>›</span>
          </button>
          <button onClick={onMessage} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', borderRadius: 14,
            background: C.card, border: `1px solid ${C.border}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(184,220,197,0.10)', border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.mint,
            }}><ChatIcon size={18} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>Envoyer un message à {c.from}</div>
              <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>Discuter, ajuster un détail...</div>
            </div>
            <span style={{ color: C.inkFaint }}>›</span>
          </button>
        </div>
      </div>

      <button onClick={onSeeMatches} style={{
        all: 'unset', cursor: 'pointer', textAlign: 'center',
        padding: '17px', borderRadius: 14,
        background: C.warm, color: '#0C211A',
        fontFamily: fontSans, fontWeight: 800, fontSize: 14, letterSpacing: '0.18em',
      }}>VOIR DANS MES MATCHS</button>
    </div>
  );
}

const REFUSE_REASONS = ['Pas dispo', 'Lieu trop loin', 'Proposer plus tard', 'Autre'];

function RefuseModalView({ challenge: c, onCancel, onConfirm }) {
  const [reason, setReason] = useState(null);
  const [light, mid, dark] = c.color;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 18, paddingTop: 40 }}>
      <div style={{
        width: 44, height: 4, borderRadius: 99, background: 'rgba(242,247,242,0.25)', margin: '0 auto 12px',
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <FriendAvatar color={c.color} online={c.online} size={60} />
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 22, color: C.ink, textAlign: 'center' }}>
          Refuser le défi de {c.from} ?
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, textAlign: 'center', lineHeight: 1.5, maxWidth: 320 }}>
          {c.from} sera notifié.<br />Tu peux ajouter un mot pour adoucir le refus.
        </div>
      </div>

      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>
          RAISON <span style={{ color: C.inkFaint, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {REFUSE_REASONS.map(r => {
            const active = reason === r;
            return (
              <button key={r} onClick={() => setReason(active ? null : r)} style={{
                all: 'unset', cursor: 'pointer',
                padding: '8px 14px', borderRadius: 999,
                border: `1px solid ${active ? C.cream : C.border}`,
                background: active ? 'rgba(239,229,200,0.14)' : 'rgba(8,22,17,0.45)',
                color: active ? C.cream : C.ink,
                fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.06em',
              }}>{r}</button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={onCancel} style={{
          all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
          padding: '15px', borderRadius: 12,
          background: 'transparent', color: C.ink,
          border: `1px solid ${C.borderHi}`,
          fontFamily: fontSans, fontWeight: 700, fontSize: 14, letterSpacing: '0.10em',
        }}>Annuler</button>
        <button onClick={() => onConfirm(reason)} style={{
          all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
          padding: '15px', borderRadius: 12,
          background: 'rgba(232,155,139,0.18)', color: '#E89B8B',
          border: '1px solid rgba(232,155,139,0.50)',
          fontFamily: fontSans, fontWeight: 800, fontSize: 14, letterSpacing: '0.10em',
        }}>Refuser</button>
      </div>
    </div>
  );
}

function AcceptedChallengeCard({ c, ageMin = 0, onAgenda, onMessage, onMore }) {
  const { openSheet } = useUI();
  const [light, mid, dark] = c.color;
  const ageLabel = ageMin === 0 ? "À L'INSTANT" : `${ageMin} min`;
  const openProfileChat = () => {
    const full = c.full || `${c.from} Leclerc`;
    const opp = { ...c, full, name: c.from, elo: c.elo, online: c.online, color: c.color };
    openSheet({ title: full, body: <ChatView contact={opp} /> });
  };
  return (
    <div style={{
      position: 'relative',
      padding: '16px 16px 14px', borderRadius: 18,
      background: 'rgba(232,201,155,0.05)', border: '1px solid rgba(232,201,155,0.35)',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, right: 0,
        background: C.warm, color: '#0C211A',
        padding: '5px 12px', borderRadius: '0 18px 0 14px',
        fontFamily: fontSans, fontWeight: 800, fontSize: 11, letterSpacing: '0.08em',
      }}>ACCEPTÉ · {ageLabel}</div>

      <button onClick={openProfileChat} style={{
        all: 'unset', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14, marginTop: 4, marginBottom: 12, width: '100%',
      }}>
        <FriendAvatar color={c.color} online={c.online} size={56} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 17, color: C.ink }}>vs {c.from} Leclerc</div>
          <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 2 }}>{c.elo} ELO · {c.format} · {c.enjeu}</div>
        </div>
      </button>

      <div style={{
        padding: '10px 12px', borderRadius: 12,
        background: 'rgba(8,22,17,0.55)', border: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontFamily: fontSans, fontSize: 13.5, color: C.ink, fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.warm }}>{Icon.calendar(14)} <span style={{ color: C.ink }}>{c.date}</span></span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.warm }}>{Icon.pin(14)} <span style={{ color: C.ink }}>{c.venue}</span></span>
        </div>
        <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>
          {Icon.clock(12)} Dans 3 jours
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onAgenda} style={{
          all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
          padding: '11px', borderRadius: 12,
          background: 'rgba(242,247,242,0.06)', border: `1px solid ${C.borderHi}`,
          color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>{Icon.calendar(14)} Agenda</button>
        <button onClick={onMessage} style={{
          all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
          padding: '11px', borderRadius: 12,
          background: 'rgba(242,247,242,0.06)', border: `1px solid ${C.borderHi}`,
          color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 13,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}><ChatIcon size={14} /> Message</button>
        <button onClick={onMore} aria-label="Plus d'options" style={{
          all: 'unset', cursor: 'pointer',
          width: 44, padding: '11px 0', textAlign: 'center', borderRadius: 12,
          background: 'rgba(242,247,242,0.06)', border: `1px solid ${C.borderHi}`,
          color: C.inkDim, fontFamily: fontSans, fontWeight: 800, fontSize: 18,
          lineHeight: 1,
        }}>⋯</button>
      </div>
    </div>
  );
}

function DefisTabContent({ incoming, setIncoming, outgoing, setOutgoing, accepted, setAccepted }) {
  const { openSheet, closeSheet, showToast } = useUI();
  const openDefier = () => openSheet({ title: 'Defier', body: <ChallengeView /> });

  const accept = (c) => {
    setIncoming(prev => prev.filter(x => x !== c));
    setAccepted(prev => [{ ...c }, ...prev]);
    if (c.challengeId) {
      updateChallenge(c.challengeId, {
        status: 'accepted',
        responded_at: new Date().toISOString(),
      }).catch((error) => {
        console.error(error);
        showToast({ text: 'Défi accepté ici, mais Supabase ne l’a pas sauvegardé.', duration: 2600 });
      });
    }
    showToast({
      text: `Défi accepté · ${c.from} a été notifié`,
      duration: 2200,
    });
  };

  const decline = (c) => {
    openSheet({
      title: '',
      body: <RefuseModalView
        challenge={c}
        onCancel={closeSheet}
        onConfirm={(reason) => {
          setIncoming(prev => prev.filter(x => x !== c));
          if (c.challengeId) {
            updateChallenge(c.challengeId, {
              status: 'refused',
              refusal_reason: reason || 'Refuse',
              responded_at: new Date().toISOString(),
            }).catch((error) => {
              console.error(error);
              showToast({ text: 'Défi refusé ici, mais Supabase ne l’a pas sauvegardé.', duration: 2600 });
            });
          }
          closeSheet();
          showToast({
            text: `Défi refusé. ${c.from} a été notifié poliment.`,
            duration: 3000,
            action: {
              label: 'Annuler',
              onClick: () => setIncoming(prev => [c, ...prev]),
            },
          });
        }}
      />,
    });
  };

  const modify = (c) => {
    const opp = { full: `${c.from} Leclerc`, name: c.from, elo: c.elo, online: c.online, color: c.color, rank: c.rank };
    openSheet({ title: 'Nouveau defi', body: <NewChallengeView opponent={opp} /> });
  };

  const aTraiterEmpty = incoming.length === 0;
  const fullyEmpty = incoming.length === 0 && outgoing.length === 0 && accepted.length === 0;

  if (fullyEmpty) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '60px 16px 80px', textAlign: 'center',
      }}>
        <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>
          Aucun défi en attente
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim }}>
          Va défier un ami pour lancer une partie !
        </div>
        <button onClick={openDefier} style={{
          marginTop: 18,
          all: 'unset', cursor: 'pointer', textAlign: 'center',
          padding: '14px 20px', borderRadius: 12,
          background: 'transparent', border: `1.5px dashed ${C.warm}`,
          color: C.warm,
          fontFamily: fontSans, fontWeight: 700, fontSize: 14,
          display: 'inline-flex', alignItems: 'center', gap: 10,
        }}>
          <SwordsIcon size={16} />
          Défier un ami
        </button>
      </div>
    );
  }

  const openAcceptedChat = (c) => {
    const full = c.full || `${c.from} Leclerc`;
    const opp = { ...c, full, name: c.from, elo: c.elo, online: c.online, color: c.color };
    openSheet({ title: full, body: <ChatView contact={opp} /> });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Defier un ami CTA — en haut */}
      <button onClick={openDefier} style={{
        all: 'unset', cursor: 'pointer', textAlign: 'center',
        padding: '16px', borderRadius: 14,
        background: 'transparent', border: `1.5px dashed ${C.warm}`,
        color: C.warm,
        fontFamily: fontSans, fontWeight: 700, fontSize: 15,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <SwordsIcon size={16} />
        Défier un ami
      </button>

      {/* A TRAITER — toujours visible */}
      <div>
        <div style={{ ...kicker, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: aTraiterEmpty ? C.inkDim : C.warm }}>
            <path d="M17 7L7 17M7 7v10h10"/>
          </svg>
          <span style={{ color: aTraiterEmpty ? C.inkDim : undefined }}>À TRAITER</span>
          <span style={{
            fontFamily: fontSans, fontWeight: 800, fontSize: 11,
            color: aTraiterEmpty ? C.inkDim : C.warm,
            background: aTraiterEmpty ? 'rgba(184,220,197,0.06)' : 'rgba(232,201,155,0.14)',
            border: `1px solid ${aTraiterEmpty ? C.border : 'rgba(232,201,155,0.32)'}`,
            padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em',
          }}>{incoming.length}</span>
        </div>
        {aTraiterEmpty ? (
          <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, fontStyle: 'italic' }}>
            Aucun défi à traiter pour le moment.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {incoming.map((c, i) => (
              <IncomingChallengeCard key={i} c={c}
                onAccept={() => accept(c)}
                onDecline={() => decline(c)}
                onModify={() => modify(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ACCEPTES · A VENIR */}
      {accepted.length > 0 && (
        <div>
          <div style={{ ...kicker, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.warm }}>
              <path d="M4 12.5 10 18l10-12"/>
            </svg>
            <span style={{ color: C.warm }}>ACCEPTÉS · À VENIR</span>
            <span style={{
              fontFamily: fontSans, fontWeight: 800, fontSize: 11,
              color: C.warm, background: 'rgba(232,201,155,0.14)',
              border: '1px solid rgba(232,201,155,0.32)',
              padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em',
            }}>{accepted.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {accepted.map((c, i) => (
              <AcceptedChallengeCard key={i} c={c}
                onAgenda={() => showToast('Ajoute a Google Calendar')}
                onMessage={() => openAcceptedChat(c)}
                onMore={() => showToast('Plus d\'options bientot dispo')}
              />
            ))}
          </div>
        </div>
      )}

      {/* EN ATTENTE DE REPONSE */}
      {outgoing.length > 0 && (
        <div>
          <div style={{ ...kicker, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.inkDim }}>
              <path d="M7 17L17 7M17 7H7m10 0v10"/>
            </svg>
            <span>EN ATTENTE DE RÉPONSE</span>
            <span style={{
              fontFamily: fontSans, fontWeight: 800, fontSize: 11,
              color: C.warm, background: 'rgba(232,201,155,0.14)',
              border: '1px solid rgba(232,201,155,0.32)',
              padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em',
            }}>{outgoing.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {outgoing.map((c, i) => (
              <OutgoingChallengeRow key={i} c={c}
                onAcceptCounter={() => {
                  setOutgoing(prev => prev.filter(x => x !== c));
                  setAccepted(prev => [{
                    from: c.from, color: c.color, online: c.online,
                    elo: 1612, format: 'BO5', enjeu: 'Classé', gainW: 14, lossL: 11,
                    date: c.counter.them, venue: 'Marais · T3',
                  }, ...prev]);
                  if (c.challengeId) {
                    updateChallenge(c.challengeId, {
                      status: 'accepted',
                      match_date: c.counter?.them || c.date,
                      responded_at: new Date().toISOString(),
                    }).catch((error) => {
                      console.error(error);
                      showToast({ text: 'Contre-proposition acceptée ici, mais Supabase ne l’a pas sauvegardée.', duration: 2800 });
                    });
                  }
                  showToast(`Créneau ${c.counter.them} accepté`);
                }}
                onProposeNew={() => {
                  const opp = { full: c.full, name: c.from, elo: 1450, online: c.online, color: c.color };
                  openSheet({ title: 'Nouveau defi', body: <NewChallengeView opponent={opp} /> });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MessagesView({ embedded = false }) {
  const { openSheet, showToast } = useUI();
  const { userId } = useAuth();
  const [tab, setTab] = useState('tous');
  // Nouveau user = tout vide. Pas de fallback sur les mocks.
  const [conversations, setConversations] = useState([]);
  const [incoming, setIncoming] = useIncomingChallenges();
  const [outgoing, setOutgoing] = useState([]);
  const [accepted, setAccepted] = useAcceptedChallenges();
  const [friends, setFriends] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [training, setTraining] = useState(null);
  const [teamGroups, setTeamGroups] = useState([]);
  const [dataStatus, setDataStatus] = useState('local');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null); // profileId en cours d'ajout
  const [searchFocused, setSearchFocused] = useState(false);

  const reloadBundle = () => {
    loadChatBundle(userId).then((bundle) => {
      if (!bundle) return;
      setConversations(bundle.conversations);
      setFriends(bundle.friends);
    }).catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    loadChatBundle(userId)
      .then((bundle) => {
        if (cancelled || !bundle) return;
        // On garde exactement ce que Supabase retourne (vide = vide).
        setConversations(bundle.conversations);
        setIncoming(bundle.incoming);
        setOutgoing(bundle.outgoing);
        setAccepted(bundle.accepted);
        setFriends(bundle.friends);
        setClubs(bundle.clubs);
        setAnnouncements(bundle.announcements);
        setTraining(bundle.training);
        setTeamGroups(bundle.teamGroups);
        setDataStatus('supabase');
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setDataStatus('error');
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Recherche debouncee de profils sur Supabase.
  // Quand l'input est focus, on charge aussi des suggestions par defaut (query vide).
  useEffect(() => {
    const q = searchQ.trim();
    if (!q && !searchFocused) { setSearchResults([]); setSearching(false); return undefined; }
    setSearching(true);
    const excludeIds = [userId, ...friends.map((f) => f.id || f.profileId)].filter(Boolean);
    const handle = setTimeout(() => {
      searchProfiles(q, { excludeIds, limit: 8 })
        .then((rows) => setSearchResults(rows))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, q ? 220 : 0);
    return () => { clearTimeout(handle); setSearching(false); };
  }, [searchQ, searchFocused, userId, friends]);

  const addAndOpen = async (profile) => {
    if (!userId) { showToast('Connecte-toi pour ajouter un ami'); return; }
    try {
      setAdding(profile.id);
      const convId = await startDmWith(userId, profile.id);
      setSearchQ('');
      setSearchResults([]);
      reloadBundle();
      const contact = { ...profile, conversationId: convId, selfId: userId };
      openSheet({ title: profile.full || profile.name, body: <ChatView contact={contact} /> });
    } catch (err) {
      console.error(err);
      showToast('Impossible d\'ajouter ce joueur');
    } finally {
      setAdding(null);
    }
  };

  const unreadCount = conversations.filter(c => c.unread).length;
  // Defis "a traiter" = incoming (entrants) + contre-propositions (a revalider)
  const pendingDefis = incoming.length + outgoing.filter(o => o.status === 'counter').length;
  const tabs = [
    { id: 'tous',  label: 'Tous',  count: unreadCount },
    { id: 'defis', label: 'Defis', count: pendingDefis },
    { id: 'clubs', label: 'Clubs', count: null },
  ];
  const shown = conversations.filter(c => {
    if (tab === 'defis') return c.isDefi;
    if (tab === 'clubs') return c.isClub;
    return true;
  });

  const openConversation = (c) => {
    if (c.unread) {
      setConversations(prev => prev.map(x => x === c ? { ...x, unread: false } : x));
    }
    openSheet({ title: c.full, body: <ChatView contact={c} /> });
  };

  const { sharing: meOnline, toggleSharing: toggleMeOnline } = useSharing();
  const stories = [
    { name: 'Toi',   color: COLOR_OCHRE, online: meOnline, isMe: true },
    ...friends.slice(0, 5).map(f => ({ ...f, name: f.name.replace(/\s.+$/, '') })),
  ];
  const onlineFriendsCount = friends.filter(f => f.online).length;

  const isClubs = tab === 'clubs';
  const isDefis = tab === 'defis';
  const searchPlaceholder = isClubs ? 'Rechercher dans le club...'
                          : isDefis ? 'Rechercher un défi...'
                          : 'Rechercher un ami...';

  const isTous = !isClubs && !isDefis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!embedded && <BackToProfileBtn />}
      {dataStatus === 'error' && (
        <div style={{
          padding: '10px 12px', borderRadius: 12,
          background: 'rgba(232,155,139,0.08)', border: '1px solid rgba(232,155,139,0.30)',
          color: '#E89B8B', fontFamily: fontSans, fontSize: 12.5,
        }}>
          Supabase indisponible, affichage des donnees locales.
        </div>
      )}
      <SearchInput
        placeholder={searchPlaceholder}
        value={searchQ}
        onChange={setSearchQ}
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
      />

      {/* Suggestions de joueurs depuis la recherche */}
      {(searchFocused || searchQ.trim()) && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: '12px', borderRadius: 14,
          background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
        }}>
          <div style={{ ...kicker, marginBottom: 4 }}>
            {searching ? 'RECHERCHE…' : searchQ.trim() ? `RÉSULTATS (${searchResults.length})` : 'SUGGESTIONS'}
          </div>
          {!searching && searchResults.length === 0 && (
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, padding: '8px 4px' }}>
              {searchQ.trim()
                ? `Aucun joueur trouvé pour « ${searchQ.trim()} ».`
                : 'Aucun joueur disponible pour le moment.'}
            </div>
          )}
          {searchResults.map((p) => (
            <FriendRowItem
              key={p.id || p.name}
              f={p}
              actionIcon={<ChatIcon size={14} />}
              actionLabel={adding === p.id ? '…' : 'Ajouter'}
              onClickAction={() => addAndOpen(p)}
            />
          ))}
        </div>
      )}

      {/* Statut en ligne — uniquement sur l'onglet Tous */}
      {isTous && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: meOnline ? 'rgba(61,209,107,0.08)' : 'rgba(184,220,197,0.04)',
          border: `1px solid ${meOnline ? 'rgba(61,209,107,0.30)' : C.border}`,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: meOnline ? '#3DD16B' : C.inkFaint,
            boxShadow: meOnline ? '0 0 0 4px rgba(61,209,107,0.18)' : 'none',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 700, color: C.ink }}>
              {meOnline ? 'Tu apparais en ligne' : 'Tu apparais hors ligne'}
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginTop: 1 }}>
              {meOnline
                ? `${onlineFriendsCount} ami${onlineFriendsCount > 1 ? 's' : ''} en ligne · tes amis voient ta pastille verte`
                : 'Tes amis ne voient pas que tu es connecté'}
            </div>
          </div>
          <button onClick={toggleMeOnline} aria-label="Basculer statut en ligne"
            style={{
              all: 'unset', cursor: 'pointer',
              width: 42, height: 24, borderRadius: 999,
              background: meOnline ? '#3DD16B' : 'rgba(184,220,197,0.20)',
              border: `1px solid ${meOnline ? 'rgba(61,209,107,0.5)' : C.border}`,
              position: 'relative', transition: 'background .2s ease',
              flexShrink: 0,
            }}>
            <div style={{
              position: 'absolute', top: 2, left: meOnline ? 20 : 2,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left .2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>
      )}

      {/* Stories row — uniquement sur l'onglet Tous, et seulement si on a au moins un ami */}
      {isTous && friends.length > 0 && (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
          {stories.map(s => {
            const handle = () => {
              if (s.isMe) {
                openSheet({ title: 'EUGENIA SOREL', body: <ProfileSheet /> });
              } else {
                const contact = friends.find(f => f.name.startsWith(s.name)) || { full: s.name, color: s.color, online: s.online };
                openSheet({ title: contact.full || s.name, body: <ChatView contact={contact} /> });
              }
            };
            return (
              <button key={s.name} onClick={handle} style={{
                all: 'unset', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0,
              }}>
                <div style={{
                  padding: 2, borderRadius: '50%',
                  border: `2px solid ${s.isMe ? C.cream : C.warm}`,
                  position: 'relative',
                }}>
                  <FriendAvatar color={s.color} online={s.online} size={56} />
                  {s.isMe && (
                    <div style={{
                      position: 'absolute', top: -2, right: -2,
                      width: 18, height: 18, borderRadius: 4,
                      background: C.warm,
                      border: '2px solid #143226',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#0C211A', fontSize: 14, fontWeight: 800, lineHeight: 1,
                    }}>+</div>
                  )}
                </div>
                <div style={{ fontFamily: fontSans, fontSize: 12, color: C.ink, fontWeight: 600 }}>{s.name}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 22, borderBottom: `1px solid ${C.border}`, paddingBottom: 2 }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              all: 'unset', cursor: 'pointer',
              fontFamily: fontSans, fontSize: 15, fontWeight: active ? 800 : 600,
              color: active ? C.ink : C.inkDim,
              paddingBottom: 10,
              borderBottom: active ? `2px solid ${C.warm}` : '2px solid transparent',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontFamily: fontSans, fontWeight: 800, fontSize: 11,
                  color: C.warm, background: 'rgba(232,201,155,0.18)',
                  border: '1px solid rgba(232,201,155,0.32)',
                  padding: '2px 8px', borderRadius: 999,
                }}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content : conversations OU vue Defis OU vue Clubs */}
      {isClubs ? (
        <ClubsTabContent clubs={clubs} announcements={announcements} training={training} teamGroups={teamGroups} />
      ) : isDefis ? (
        <DefisTabContent
          incoming={incoming} setIncoming={setIncoming}
          outgoing={outgoing} setOutgoing={setOutgoing}
          accepted={accepted} setAccepted={setAccepted}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.length === 0 ? (
            <div style={{
              padding: '32px 16px', textAlign: 'center',
              fontFamily: fontSans, fontSize: 13.5, color: C.inkDim, lineHeight: 1.55,
            }}>
              Tu n'as encore aucune conversation.<br />
              Ajoute un ami pour démarrer un échange.
            </div>
          ) : (
            shown.map((c, idx) => (
              <button key={idx} onClick={() => openConversation(c)}
                      style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
                <ConversationRow c={c} />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ConversationRow({ c }) {
  const [light, mid, dark] = c.color;
  const previewColor = c.unread ? C.warm : C.inkDim;
  const nameColor = C.ink;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 0',
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Avatar (single or double) */}
      <div style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
        {c.colorB ? (
          <>
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: 36, height: 36, borderRadius: '50%',
              background: `radial-gradient(60% 60% at 35% 30%, ${c.color[0]} 0%, ${c.color[1]} 60%, ${c.color[2]} 100%)`,
              border: `1.5px solid ${C.borderHi}`,
            }} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 36, height: 36, borderRadius: '50%',
              background: `radial-gradient(60% 60% at 35% 30%, ${c.colorB[0]} 0%, ${c.colorB[1]} 60%, ${c.colorB[2]} 100%)`,
              border: '2px solid #143226',
            }} />
          </>
        ) : (
          <>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
              border: `1.5px solid ${C.borderHi}`,
            }} />
            {c.online && (
              <div style={{
                position: 'absolute', right: 1, bottom: 1,
                width: 12, height: 12, borderRadius: '50%',
                background: '#3DD16B', border: '2px solid #143226',
              }} />
            )}
          </>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: nameColor,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{c.full}</span>
          {c.isDemande && (
            <span style={{
              fontFamily: fontSans, fontWeight: 800, fontSize: 10,
              color: C.inkDim, background: 'rgba(184,220,197,0.10)',
              border: `1px solid ${C.border}`,
              padding: '2px 8px', borderRadius: 999, letterSpacing: '0.14em',
            }}>DEMANDE</span>
          )}
        </div>
        <div style={{
          fontFamily: fontSans, fontSize: 13, color: previewColor, marginTop: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {c.voice && <MicIcon size={12} />}
          {c.isDefi && !c.voice && (
            <SwordsIcon size={12} />
          )}
          {c.preview}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{
          fontFamily: fontSans, fontSize: 12, fontWeight: c.unread ? 700 : 500,
          color: c.unread ? C.warm : C.inkDim,
        }}>{c.when}</div>
        {c.unread && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.warm }} />
        )}
      </div>
    </div>
  );
}

function ProfileSheet() {
  const { openSheet } = useUI();
  const openFriends   = () => openSheet({ title: 'Amis',      body: <FriendsListView /> });
  const openHistory   = () => openSheet({ title: 'Historique',body: <MatchesListView /> });
  const openChallenge = () => openSheet({ title: 'Defier',    body: <ChallengeView /> });
  const openMessages  = () => openSheet({ title: 'Messages',  body: <MessagesView /> });
  const fields = [
    ['MAIN',   'Droitiere'],
    ['DISPOS', 'Soirs sem. \u00b7 Weekends'],
    ['CLUB',   'Le Marais Ping'],
    ['STYLE',  'Attaquant'],
    ['REGION', 'Paris \u2014 11e'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Identite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 99, flexShrink: 0,
          background: 'radial-gradient(60% 60% at 35% 30%, #d6b890 0%, #6b4a2e 60%, #1c100a 100%)',
          border: `1.5px solid ${C.borderHi}`,
        }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>1450 ELO · #24 PARIS</div>
          <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim }}>
            <span style={{ color: C.warm }}>● </span>Streak : 5 jours · Classement 15/B5
          </div>
        </div>
      </div>

      {/* Bio */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'rgba(8,22,17,0.35)',
        borderLeft: `3px solid ${C.warm}`,
        fontFamily: fontItalic, fontStyle: 'italic',
        fontSize: 14.5, lineHeight: 1.5, color: C.ink,
      }}>
        "10 ans de ping, cherche partenaires niveau intermediaire+ pour entrainements du soir."
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {BADGES.map(b => (
          <div key={b.label} style={{
            padding: '8px 14px', borderRadius: 999,
            fontFamily: fontSans, fontSize: 12, fontWeight: 700,
            color: b.featured ? C.warm : C.ink,
            background: b.featured ? 'rgba(232,201,155,0.18)' : 'rgba(8,22,17,0.45)',
            border: `1px solid ${b.featured ? 'rgba(232,201,155,0.4)' : C.border}`,
            letterSpacing: '0.04em',
          }}>● {b.label}</div>
        ))}
      </div>

      {/* Fields */}
      <div>
        {fields.map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={kicker}>{k}</span>
            <span style={{ fontFamily: fontSans, fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export { ProfileSheet };

export default function TopBar({ topInset = 0 }) {
  const { openSheet } = useUI();
  const { profile } = useAuth();
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);
  const userName = profile?.display_name || profile?.email?.split('@')[0] || 'Toi';
  const userFirst = userName.split(' ')[0];
  const userInitial = (userFirst[0] || 'T').toUpperCase();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scroller = el.parentElement;
    if (!scroller) return;
    let lastY = scroller.scrollTop;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        const dy = y - lastY;
        if (Math.abs(dy) > 4) {
          if (dy > 0 && y > 64) setHidden(true);
          else if (dy < 0) setHidden(false);
          lastY = y;
        }
        ticking = false;
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} style={{
      paddingTop: `max(${topInset}px, env(safe-area-inset-top, 0px))`,
      height: `calc(64px + max(${topInset}px, env(safe-area-inset-top, 0px)))`,
      boxSizing: 'border-box',
      paddingLeft: 22, paddingRight: 22,
      display: 'flex', alignItems: 'center',
      background: 'rgba(8,22,17,0.92)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      position: 'sticky', top: 0, zIndex: 5,
      color: C.ink,
      transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
      transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      willChange: 'transform',
    }}>
      <div style={{
        flex: 1,
        display: 'grid', alignItems: 'center',
        gridTemplateColumns: '44px 1fr 44px',
        height: 64,
      }}>
      <div />
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '0.05em',
        fontSize: 18, color: C.ink, whiteSpace: 'nowrap', textAlign: 'center',
      }}>PING PANG PARIS</div>
      <button onClick={() => openSheet({
        title: userName.toUpperCase(),
        body: <ProfileSheet />,
      })} style={{
        ...iconBtn,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'radial-gradient(60% 60% at 35% 30%, #d6b890 0%, #6b4a2e 60%, #1c100a 100%)',
          border: `1.5px solid ${C.borderHi}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fontSans, fontWeight: 800, fontSize: 13, color: '#fff',
          letterSpacing: 0,
        }}>{userInitial}</div>
      </button>
      </div>
    </div>
  );
}
