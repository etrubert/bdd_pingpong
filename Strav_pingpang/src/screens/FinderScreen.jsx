import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { C, fontDisplay, fontSans, kicker, inputStyle } from '../theme';
import Card from '../components/Card';
import AddTableSheet from '../components/AddTableSheet';
import { useSharing } from '../lib/sharing';
import { useLiveLocation } from '../lib/liveLocation';
import { FRIEND_POSITIONS } from '../lib/friendsPositions';
import { listCommunityTables } from '../lib/communityTables';

// Liste des amis (dupliquée ici depuis TopBar pour éviter import circulaire)
const FRIENDS_FOR_MAP = [
  { full: 'Marc Leclerc',    elo: 1520, online: true,  color: ['#a8c2db','#3b5a7a','#0d1a2a'] },
  { full: 'Theo Rousseau',   elo: 1612, online: true,  color: ['#bedba8','#5a7a3b','#1a2a0d'] },
  { full: 'Karim Benali',    elo: 1475, online: true,  color: ['#a8b8d6','#3b4d7a','#0d142a'] },
  { full: 'Ines Fernandez',  elo: 1410, online: true,  color: ['#d6a8a8','#7a3b3b','#2a0d0d'] },
  { full: 'Lucas Bernard',   elo: 1495, online: true,  color: ['#a8b8d6','#3b4d7a','#0d142a'] },
  { full: 'Sophie Martin',   elo: 1380, online: false, color: ['#d6a8a8','#7a3b3b','#2a0d0d'] },
  { full: 'Lea Petit',       elo: 1290, online: false, color: ['#d6c0a8','#7a5e3b','#2a1f0d'] },
];

function friendDivIcon(color, online) {
  const [light, mid, dark] = color;
  return L.divIcon({
    className: 'friend-pin',
    html: `<div style="position: relative; width: 38px; height: 38px;">
      <div style="position: absolute; inset: 0; border-radius: 50%;
        background: radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%);
        border: 2.5px solid #EFE5C8;
        box-shadow: 0 3px 8px rgba(0,0,0,0.5);"></div>
      ${online ? `<div style="position: absolute; bottom: -1px; right: -1px;
        width: 12px; height: 12px; border-radius: 50%;
        background: #3DD16B; border: 2px solid #0C211A;"></div>` : ''}
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}

// Fix Leaflet marker icons (Vite ne bundle pas les assets statiques de leaflet par defaut)
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
});

const PARIS = [48.8566, 2.3522];
const WORLD_CENTER = [30, 10];
const WORLD_ZOOM = 2;
const DEFAULT_ZOOM = 12;
const FOCUS_ZOOM = 16;

// Centre + zoom par pays (centre geographique approx.)
const COUNTRY_VIEW = {
  France:    { center: [46.6, 2.4],      zoom: 6 },
  Allemagne: { center: [51.16, 10.45],   zoom: 6 },
  Espagne:   { center: [40.46, -3.74],   zoom: 6 },
  Portugal:  { center: [39.5, -8.0],     zoom: 7 },
  Chine:     { center: [35.86, 104.19],  zoom: 4 },
  USA:       { center: [39.5, -98.35],   zoom: 4 },
};

// Bounding boxes par pays (utilises pour filtrer les tables : champ country du CSV mostly empty)
const COUNTRY_BBOX = {
  France:    { lon: [-5.5, 9.8],  lat: [41, 51.5] },
  Allemagne: { lon: [5.5, 15.5],  lat: [47, 55.5] },
  Espagne:   { lon: [-9.5, 4.5],  lat: [35.5, 44] },
  Portugal:  { lon: [-10, -6],    lat: [36.5, 42.5] },
  Chine:     { lon: [73, 135],    lat: [18, 54] },
  USA:       { lon: [-125, -66],  lat: [24, 50] },
};

// Marker "Moi" - cercle bleu avec halo blanc style Google Maps
const userPositionPin = L.divIcon({
  className: 'user-position-pin',
  html: `
    <div style="position: relative; width: 22px; height: 22px;">
      <div style="position: absolute; inset: -8px; border-radius: 50%; background: rgba(66,133,244,0.20); animation: pp-pulse 2s ease-out infinite;"></div>
      <div style="position: absolute; inset: 0; border-radius: 50%; background: #4285F4; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.4);"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// Pin custom style Google Maps : teardrop bleu avec point blanc au centre
const googleStylePin = L.divIcon({
  className: 'gmaps-pin',
  html: `
    <svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 28 16 28s16-16.5 16-28c0-8.84-7.16-16-16-16z" fill="#4285F4"/>
      <path d="M16 1.5C8 1.5 1.5 8 1.5 16c0 10.5 14.5 26 14.5 26s14.5-15.5 14.5-26C30.5 8 24 1.5 16 1.5z" fill="none" stroke="#fff" stroke-width="1.2"/>
      <circle cx="16" cy="16" r="5" fill="#fff"/>
    </svg>
  `,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -38],
});

function parseCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map(cell => cell.trim());
}

function parseClubsCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() || '').map(header => header.replace(/^﻿/, ''));
  return lines.map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((club, header, index) => {
      club[header] = cells[index] || '';
      return club;
    }, {});
  }).filter(club => club.club_nom);  // tous pays
}

// Composant interne pour piloter la map depuis l'exterieur via useMap()
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { animate: true, duration: 0.8 });
    }
  }, [center, zoom, map]);
  return null;
}

// Icone "table" : petit cercle avec un point au centre (style mini-pin)
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

// Icone "table communautaire" : anneau mint pour distinguer des tables CSV
const tableIconCommunity = L.divIcon({
  className: 'pp-table-pin-community',
  html: `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8.5" fill="#9BC9AE" stroke="#0C211A" stroke-width="1.6"/>
    <circle cx="10" cy="10" r="3" fill="#0C211A"/>
  </svg>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Style commun aux clusters (clubs + tables) — palette de l'app
function makeClusterIcon(count) {
  let size = 36;
  let bg = '#9BC9AE';
  if (count >= 1000)      { size = 60; bg = '#E89B8B'; }
  else if (count >= 250)  { size = 52; bg = '#E8C99B'; }
  else if (count >= 50)   { size = 44; bg = '#EFE5C8'; }
  const label = count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count);
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};color:#0C211A;
      display:flex;align-items:center;justify-content:center;
      font-family:Inter,system-ui,sans-serif;font-weight:800;
      font-size:${size > 50 ? 14 : 13}px;letter-spacing:0.02em;
      border:2px solid rgba(12,33,26,0.85);
      box-shadow:0 4px 12px rgba(0,0,0,0.35);
    ">${label}</div>`,
    className: 'pp-cluster',
    iconSize: [size, size],
  });
}

// Layer cluster pour les clubs FFTT (~3500 points → sans clustering, ça rame).
// Même look & feel que TablesClusterLayer : popup avec lien Google Maps, click
// pour sélectionner. markersRef permet d'ouvrir un popup depuis la recherche.
function ClubsClusterLayer({ clubs, markersRef, onSelect }) {
  const map = useMap();
  useEffect(() => {
    if (!clubs.length) return undefined;
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 80,
      chunkDelay: 16,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => makeClusterIcon(cluster.getChildCount()),
    });
    const markers = clubs.map((club) => {
      const lat = parseFloat(club.latitude);
      const lon = parseFloat(club.longitude);
      const m = L.marker([lat, lon], { icon: googleStylePin });
      const linkPart = club.url
        ? `<a href="${club.url}" target="_blank" rel="noopener noreferrer">Voir sur Google Maps</a>`
        : '';
      m.bindPopup(`<div style="font-family:sans-serif;font-size:13px">
        <strong>${club.club_nom}</strong><br>${linkPart}
      </div>`);
      m.on('click', () => onSelect && onSelect(club));
      if (markersRef) markersRef.current[club.club_nom] = m;
      return m;
    });
    group.addLayers(markers);
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
      if (markersRef) markersRef.current = {};
    };
  }, [clubs, map, markersRef, onSelect]);
  return null;
}

// Layer Leaflet.markercluster avec style sur-mesure dans le theme de l'app
function TablesClusterLayer({ tables }) {
  const map = useMap();
  useEffect(() => {
    if (!tables.length) return undefined;
    const group = L.markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 80,
      chunkDelay: 16,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => makeClusterIcon(cluster.getChildCount()),
    });
    const markers = tables.map(t => {
      const m = L.marker([t.lat, t.lon], { icon: t.community ? tableIconCommunity : tableIcon });
      const namePart = t.name ? `<strong>${t.name}</strong><br>` : '';
      const typePart = t.type ? `${t.type}${t.indoor === 'yes' ? ' &middot; indoor' : ''}<br>` : '';
      const gm = t.gmaps || `https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lon}`;
      const photoPart = t.community && t.photo
        ? `<img src="${t.photo}" alt="" style="width:100%;max-width:200px;border-radius:8px;margin:4px 0;display:block" />`
        : '';
      const badge = t.community
        ? `<div style="margin-top:4px;font-size:11px;color:#3b7a55;font-weight:700">● ajoutée par la communauté</div>`
        : '';
      m.bindPopup(`<div style="font-family:sans-serif;font-size:13px">
        ${namePart}${photoPart}<strong>${t.nb} table${t.nb > 1 ? 's' : ''}</strong><br>
        ${typePart}<a href="${gm}" target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps</a>
        ${badge}
      </div>`);
      return m;
    });
    group.addLayers(markers);
    map.addLayer(group);
    return () => { map.removeLayer(group); };
  }, [tables, map]);
  return null;
}

export default function FinderScreen() {
  const [mode, setMode] = useState('clubs'); // 'clubs' | 'tables'
  const [clubs, setClubs] = useState([]);
  const [tables, setTables] = useState([]); // [[lat, lon, n, type, indoor], ...]
  const [communityTables, setCommunityTables] = useState([]); // tables ajoutées via photo
  const [addOpen, setAddOpen] = useState(false); // panneau "Ajouter une table"
  const [tablesStatus, setTablesStatus] = useState('');
  const [selectedClub, setSelectedClub] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [status, setStatus] = useState('Chargement des clubs...');
  const mapCardRef = useRef(null);
  const markersRef = useRef({});

  // === Géolocalisation en direct (changement 3) ===
  // On consomme le hook partagé : le suivi continu (watchPosition) est géré
  // globalement, la carte se met à jour en temps réel partout dans l'app.
  const { pos: userPos, status: geoStatus, error: geoError, grant: requestLocation } = useLiveLocation();

  // Partage position + statut en ligne avec les amis (consentement unifié)
  const { sharing, setSharing } = useSharing();
  // Affichage des amis sur la carte : seulement si je partage moi-même
  const [showFriends, setShowFriends] = useState(true);

  // Quand la position devient active, on active aussi le partage du statut.
  useEffect(() => {
    if (geoStatus === 'granted' && !sharing) setSharing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus]);

  useEffect(() => {
    fetch('/data/maps_clubs.csv')
      .then(response => {
        if (!response.ok) throw new Error('CSV introuvable');
        return response.text();
      })
      .then(text => {
        const parsed = parseClubsCsv(text);
        setClubs(parsed);
        setStatus(parsed.length === 0 ? 'Aucun club trouve' : '');
      })
      .catch(() => setStatus('Impossible de charger les clubs'));
  }, []);

  // Charge le CSV des tables une seule fois (au premier passage en mode 'tables')
  const [tablesLoaded, setTablesLoaded] = useState(false);
  useEffect(() => {
    if (mode !== 'tables' || tablesLoaded) return;
    setTablesStatus('Chargement des tables...');
    fetch('/data/pingpong_tables_world.csv')
      .then(r => {
        if (!r.ok) throw new Error('CSV introuvable');
        return r.text();
      })
      .then(text => {
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = parseCsvLine(lines.shift() || '').map(h => h.replace(/^﻿/, ''));
        const parsed = [];
        for (const line of lines) {
          const cells = parseCsvLine(line);
          const row = {};
          for (let i = 0; i < headers.length; i += 1) row[headers[i]] = cells[i] || '';
          const lat = parseFloat(row.latitude);
          const lon = parseFloat(row.longitude);
          if (Number.isFinite(lat) && Number.isFinite(lon)) {
            parsed.push({
              lat, lon,
              name: row.name || '',
              type: row.type_lieu || '',
              nb: parseInt(row.nombre_tables, 10) || 1,
              indoor: row.indoor || '',
              gmaps: row.lien_google_maps || '',
            });
          }
        }
        setTables(parsed);
        setTablesLoaded(true);
        setTablesStatus('');
      })
      .catch(() => setTablesStatus('Impossible de charger les tables'));
  }, [mode, tablesLoaded]);

  // Charge les tables communautaires (Supabase) au premier passage en mode 'tables'
  const [communityLoaded, setCommunityLoaded] = useState(false);
  useEffect(() => {
    if (mode !== 'tables' || communityLoaded) return;
    setCommunityLoaded(true);
    listCommunityTables().then(setCommunityTables).catch(() => {});
  }, [mode, communityLoaded]);

  // Toutes les tables (CSV monde + communautaires) pour la carte et l'anti-doublon
  const allTables = useMemo(
    () => [...tables, ...communityTables],
    [tables, communityTables],
  );

  // Tables filtrees par pays (bbox)
  const tablesFiltered = useMemo(() => {
    if (!selectedCountry) return allTables;
    const bbox = COUNTRY_BBOX[selectedCountry];
    if (!bbox) return allTables;
    return allTables.filter(t =>
      t.lon >= bbox.lon[0] && t.lon <= bbox.lon[1] &&
      t.lat >= bbox.lat[0] && t.lat <= bbox.lat[1]
    );
  }, [allTables, selectedCountry]);

  // Liste des pays distincts presents dans le CSV
  const countries = useMemo(() => {
    const set = new Set();
    clubs.forEach(c => { if (c.pays) set.add(c.pays); });
    return Array.from(set).sort();
  }, [clubs]);

  // Clubs filtres par pays (base commune pour la carte + la liste)
  const clubsByCountry = useMemo(() => {
    return selectedCountry
      ? clubs.filter(c => c.pays === selectedCountry)
      : clubs;
  }, [clubs, selectedCountry]);

  // Clubs avec coordonnees valides pour les marqueurs
  const clubsGeoloc = useMemo(() => {
    return clubsByCountry.filter(c => {
      const lat = parseFloat(c.latitude);
      const lon = parseFloat(c.longitude);
      return Number.isFinite(lat) && Number.isFinite(lon);
    });
  }, [clubsByCountry]);

  const filteredClubs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = normalizedQuery
      ? clubsByCountry.filter(club => club.club_nom.toLowerCase().includes(normalizedQuery))
      : clubsByCountry;
    return source.slice(0, 50);
  }, [clubsByCountry, query]);

  // Auto-select premier resultat de recherche
  useEffect(() => {
    if (query.trim() && filteredClubs.length > 0) {
      const first = filteredClubs[0];
      const lat = parseFloat(first.latitude);
      const lon = parseFloat(first.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setSelectedClub(first);
      }
    }
  }, [query, filteredClubs]);

  // Centre de la carte
  const mapCenter = useMemo(() => {
    if (selectedClub) {
      const lat = parseFloat(selectedClub.latitude);
      const lon = parseFloat(selectedClub.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) return [lat, lon];
    }
    if (selectedCountry && COUNTRY_VIEW[selectedCountry]) {
      return COUNTRY_VIEW[selectedCountry].center;
    }
    if (userPos) return userPos;
    return PARIS;
  }, [selectedClub, selectedCountry, userPos]);

  const mapZoom = selectedClub
    ? FOCUS_ZOOM
    : (selectedCountry && COUNTRY_VIEW[selectedCountry] ? COUNTRY_VIEW[selectedCountry].zoom
       : (userPos ? 13 : DEFAULT_ZOOM));

  function focusClub(club) {
    const lat = parseFloat(club.latitude);
    const lon = parseFloat(club.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      // Pas de coordonnees -> ouvrir le lien Google Maps directement
      if (club.url) window.open(club.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setSelectedClub(club);
    // Scroll vers la carte
    if (mapCardRef.current) {
      mapCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Ouvre le popup correspondant
    setTimeout(() => {
      const marker = markersRef.current[club.club_nom];
      if (marker) marker.openPopup();
    }, 850);
  }

  return (
    <div style={{ padding: '20px 18px 130px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={kicker}>FINDER</div>
        <div style={{
          fontFamily: fontDisplay,
          fontWeight: 800,
          fontSize: 50,
          lineHeight: 0.95,
          color: C.ink,
          letterSpacing: '0.02em',
          marginTop: 6,
        }}>{mode === 'tables' ? 'WORLD TABLES' : 'WORLD CLUBS'}</div>
      </div>

      {/* Toggle Voir mes amis (visible uniquement si on partage soi-meme) */}
      {sharing && geoStatus === 'granted' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(61,209,107,0.06)', border: '1px solid rgba(61,209,107,0.30)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(61,209,107,0.18)',
            border: '1px solid rgba(61,209,107,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3DD16B',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <circle cx="9" cy="7" r="3.5"/><path d="M2 21c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5"/><circle cx="17" cy="9" r="2.5"/><path d="M14 16c1-1.5 2.5-2.5 4-2.5s3 1 4 2.5"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 13, color: C.ink }}>
              Mes amis sur la carte
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginTop: 1 }}>
              {showFriends
                ? `${FRIENDS_FOR_MAP.filter(f => f.online && FRIEND_POSITIONS[f.full]).length} amis visibles autour de toi`
                : 'Active pour voir les amis qui partagent leur position'}
            </div>
          </div>
          <button onClick={() => setShowFriends(v => !v)} aria-label="Afficher mes amis" style={{
            all: 'unset', cursor: 'pointer',
            width: 42, height: 24, borderRadius: 999,
            background: showFriends ? '#3DD16B' : 'rgba(184,220,197,0.20)',
            border: `1px solid ${showFriends ? 'rgba(61,209,107,0.5)' : C.border}`,
            position: 'relative', transition: 'background .2s ease',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute', top: 2, left: showFriends ? 20 : 2,
              width: 18, height: 18, borderRadius: '50%',
              background: '#fff', transition: 'left .2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>
      )}

      {/* Banniere geoloc */}
      {geoStatus !== 'granted' && (
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'rgba(66,133,244,0.08)', border: '1px solid rgba(66,133,244,0.35)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(66,133,244,0.18)', border: '1px solid rgba(66,133,244,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#7DA9F4',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 13.5, color: C.ink }}>
              {geoStatus === 'denied' ? 'Permission refusée' :
               geoStatus === 'unsupported' ? 'Géolocalisation non supportée' :
               geoStatus === 'asking' ? 'Localisation en cours...' :
               'Voir les clubs/tables proches de toi'}
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
              {geoError || 'Partage ta position pour recentrer la carte sur ta zone'}
            </div>
          </div>
          <button
            onClick={requestLocation}
            disabled={geoStatus === 'asking'}
            style={{
              all: 'unset', cursor: geoStatus === 'asking' ? 'wait' : 'pointer',
              padding: '10px 14px', borderRadius: 10,
              background: '#4285F4', color: '#fff',
              fontFamily: fontSans, fontWeight: 700, fontSize: 12,
              letterSpacing: '0.04em', flexShrink: 0,
              opacity: geoStatus === 'asking' ? 0.6 : 1,
            }}
          >
            {geoStatus === 'asking' ? '...' :
             geoStatus === 'denied' ? 'Réessayer' :
             'Partager'}
          </button>
        </div>
      )}

      <div ref={mapCardRef}>
        <Card style={{ padding: 12, overflow: 'hidden' }}>
          {status ? (
            <div style={{
              height: 360,
              borderRadius: 16,
              background: '#10251d',
              border: `1px solid ${C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.inkDim,
              fontFamily: fontSans,
              fontSize: 13,
              textAlign: 'center',
              padding: 18,
              boxSizing: 'border-box',
            }}>
              {status}
            </div>
          ) : (
            <div style={{ borderRadius: 16, overflow: 'hidden', height: 360 }}>
              <MapContainer
                center={PARIS}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
                worldCopyJump
                minZoom={2}
                maxBounds={[[-85, -200], [85, 200]]}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapController center={mapCenter} zoom={mapZoom} />
                {userPos && (
                  <Marker position={userPos} icon={userPositionPin}>
                    <Popup>
                      <div style={{ fontFamily: 'sans-serif', fontSize: 13 }}>
                        <strong>Ta position</strong>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {sharing && showFriends && FRIENDS_FOR_MAP.filter(f => f.online && FRIEND_POSITIONS[f.full]).map(f => {
                  const p = FRIEND_POSITIONS[f.full];
                  return (
                    <Marker
                      key={f.full}
                      position={[p.lat, p.lon]}
                      icon={friendDivIcon(f.color, f.online)}
                    >
                      <Popup>
                        <div style={{ fontFamily: 'sans-serif', fontSize: 13, minWidth: 160 }}>
                          <strong>{f.full}</strong><br />
                          {f.elo} ELO · {p.area}<br />
                          <span style={{ color: '#3DD16B' }}>● en ligne</span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {mode === 'clubs' && (
                  <ClubsClusterLayer
                    clubs={clubsGeoloc}
                    markersRef={markersRef}
                    onSelect={setSelectedClub}
                  />
                )}
                {mode === 'tables' && <TablesClusterLayer tables={tablesFiltered} />}
              </MapContainer>
            </div>
          )}
          {selectedClub && (
            <div style={{
              marginTop: 10,
              fontFamily: fontSans,
              fontSize: 13,
              color: C.inkDim,
              textAlign: 'center',
            }}>
              <strong style={{ color: C.ink }}>{selectedClub.club_nom}</strong>
            </div>
          )}
          <div style={{
            marginTop: 8,
            fontFamily: fontSans,
            fontSize: 11,
            color: C.inkDim,
            textAlign: 'center',
          }}>
            {mode === 'clubs'
              ? `${clubsGeoloc.length}/${clubsByCountry.length} clubs localises sur la carte`
              : (tablesStatus || `${tablesFiltered.length}${allTables.length !== tablesFiltered.length ? `/${allTables.length}` : ''} tables sur la carte`)}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: 'clubs', label: 'CLUBS' },
          { id: 'tables', label: 'TABLES' },
        ].map(opt => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => { setMode(opt.id); setSelectedClub(null); }}
              style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                padding: '12px',
                borderRadius: 12,
                border: `1px solid ${active ? C.cream : C.border}`,
                background: active ? 'rgba(239,229,200,0.14)' : 'rgba(8,22,17,0.45)',
                color: active ? C.cream : C.ink,
                fontFamily: fontSans, fontWeight: 700, fontSize: 12,
                letterSpacing: '0.16em',
              }}
            >{opt.label}</button>
          );
        })}
      </div>

      {mode === 'clubs' && (
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Chercher un club"
          style={inputStyle}
        />
      )}

      {mode === 'tables' && (
        <button
          onClick={() => setAddOpen(true)}
          style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '14px', borderRadius: 12,
            background: C.mint, color: '#0C211A',
            fontFamily: fontSans, fontWeight: 800, fontSize: 12.5, letterSpacing: '0.1em',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          AJOUTER UNE TABLE PUBLIQUE
        </button>
      )}

      {countries.length > 0 && (
        <Card style={{ padding: 12 }}>
          <div style={{ ...kicker, marginBottom: 10 }}>PAYS</div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            {['', ...countries].map((country) => {
              const isActive = selectedCountry === country;
              const label = country || 'Tous';
              return (
                <button
                  key={label}
                  onClick={() => {
                    setSelectedCountry(country);
                    setSelectedClub(null);
                  }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: `1px solid ${isActive ? C.cream : C.border}`,
                    background: isActive ? 'rgba(239,229,200,0.12)' : 'rgba(8,22,17,0.45)',
                    color: isActive ? C.cream : C.ink,
                    fontFamily: fontSans,
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: '0.08em',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {mode === 'clubs' && selectedCountry && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredClubs.map(club => {
          const hasCoords = Number.isFinite(parseFloat(club.latitude))
            && Number.isFinite(parseFloat(club.longitude));
          return (
            <button
              key={`${club.club_nom}-${club.pays}`}
              onClick={() => focusClub(club)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <Card style={{
                padding: '14px 16px',
                borderColor: selectedClub?.club_nom === club.club_nom ? C.cream : C.border,
                background: selectedClub?.club_nom === club.club_nom ? 'rgba(239,229,200,0.08)' : C.card,
                opacity: hasCoords ? 1 : 0.55,
              }}>
                <div style={{
                  fontFamily: fontSans,
                  fontWeight: 700,
                  fontSize: 14,
                  color: C.ink,
                  letterSpacing: '0.04em',
                }}>{club.club_nom}</div>
                <div style={{ marginTop: 4, fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>
                  {club.pays}{!hasCoords && ' · (non geolocalise)'}
                </div>
              </Card>
            </button>
          );
        })}
        {filteredClubs.length === 0 && !status && (
          <div style={{
            padding: '20px 0',
            textAlign: 'center',
            fontFamily: fontSans,
            fontSize: 13,
            color: C.inkDim,
          }}>
            Aucun club ne correspond
          </div>
        )}
      </div>
      )}

      <AddTableSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        userPos={userPos}
        existingTables={allTables}
        onAdded={(row) => setCommunityTables(prev => [row, ...prev])}
      />
    </div>
  );
}
