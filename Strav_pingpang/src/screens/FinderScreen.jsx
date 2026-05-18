import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { C, fontDisplay, fontSans, kicker, inputStyle } from '../theme';
import Card from '../components/Card';

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
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
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
      },
    });
    const markers = tables.map(t => {
      const m = L.marker([t.lat, t.lon], { icon: tableIcon });
      const namePart = t.name ? `<strong>${t.name}</strong><br>` : '';
      const typePart = t.type ? `${t.type}${t.indoor === 'yes' ? ' &middot; indoor' : ''}<br>` : '';
      const gm = t.gmaps || `https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lon}`;
      m.bindPopup(`<div style="font-family:sans-serif;font-size:13px">
        ${namePart}<strong>${t.nb} table${t.nb > 1 ? 's' : ''}</strong><br>
        ${typePart}<a href="${gm}" target="_blank" rel="noopener noreferrer">Ouvrir dans Google Maps</a>
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
  const [tablesStatus, setTablesStatus] = useState('');
  const [selectedClub, setSelectedClub] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [status, setStatus] = useState('Chargement des clubs...');
  const mapCardRef = useRef(null);
  const markersRef = useRef({});

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

  // Tables filtrees par pays (bbox)
  const tablesFiltered = useMemo(() => {
    if (!selectedCountry) return tables;
    const bbox = COUNTRY_BBOX[selectedCountry];
    if (!bbox) return tables;
    return tables.filter(t =>
      t.lon >= bbox.lon[0] && t.lon <= bbox.lon[1] &&
      t.lat >= bbox.lat[0] && t.lat <= bbox.lat[1]
    );
  }, [tables, selectedCountry]);

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
    return PARIS;
  }, [selectedClub, selectedCountry]);

  const mapZoom = selectedClub
    ? FOCUS_ZOOM
    : (selectedCountry && COUNTRY_VIEW[selectedCountry] ? COUNTRY_VIEW[selectedCountry].zoom : DEFAULT_ZOOM);

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
                {mode === 'clubs' && clubsGeoloc.map((club) => {
                  const lat = parseFloat(club.latitude);
                  const lon = parseFloat(club.longitude);
                  return (
                    <Marker
                      key={club.club_nom}
                      position={[lat, lon]}
                      icon={googleStylePin}
                      ref={(ref) => {
                        if (ref) markersRef.current[club.club_nom] = ref;
                      }}
                      eventHandlers={{
                        click: () => setSelectedClub(club),
                      }}
                    >
                      <Popup>
                        <div style={{ fontFamily: 'sans-serif', fontSize: 13 }}>
                          <strong>{club.club_nom}</strong>
                          <br />
                          {club.url && (
                            <a href={club.url} target="_blank" rel="noopener noreferrer">
                              Voir sur Google Maps
                            </a>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
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
              : (tablesStatus || `${tablesFiltered.length}${tables.length !== tablesFiltered.length ? `/${tables.length}` : ''} tables sur la carte`)}
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
    </div>
  );
}
