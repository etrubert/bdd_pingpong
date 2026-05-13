import { useEffect, useMemo, useRef, useState } from 'react';
import { C, fontDisplay, fontSans, kicker, inputStyle } from '../theme';
import Card from '../components/Card';

const PARIS = { lat: 48.8566, lng: 2.3522 };
const MAP_SCRIPT_ID = 'google-maps-js';

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);

  const existing = document.getElementById(MAP_SCRIPT_ID);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.google.maps), { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = MAP_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=fr&region=FR`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error('Google Maps could not be loaded.'));
    document.head.appendChild(script);
  });
}

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
  const headers = parseCsvLine(lines.shift() || '').map(header => header.replace(/^\uFEFF/, ''));

  return lines.map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((club, header, index) => {
      club[header] = cells[index] || '';
      return club;
    }, {});
  }).filter(club => club.club_nom && club.pays === 'France');
}

function buildClubSearch(club) {
  return `${club.club_nom} tennis de table Paris France`;
}

export default function FinderScreen() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef(null);
  const googleMap = useRef(null);
  const markers = useRef([]);
  const infoWindow = useRef(null);
  const [clubs, setClubs] = useState([]);
  const [selectedClub, setSelectedClub] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(apiKey ? 'Chargement de la carte...' : 'Cle Google Maps manquante');

  useEffect(() => {
    fetch('/data/maps_clubs.csv')
      .then(response => {
        if (!response.ok) throw new Error('CSV introuvable');
        return response.text();
      })
      .then(text => setClubs(parseClubsCsv(text)))
      .catch(() => setStatus('Impossible de charger les clubs'));
  }, []);

  const filteredClubs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = normalizedQuery
      ? clubs.filter(club => club.club_nom.toLowerCase().includes(normalizedQuery))
      : clubs;

    return source.slice(0, 28);
  }, [clubs, query]);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return undefined;

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !mapRef.current) return;

        googleMap.current = new maps.Map(mapRef.current, {
          center: PARIS,
          zoom: 12,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          clickableIcons: false,
        });
        infoWindow.current = new maps.InfoWindow();
        setStatus('');
      })
      .catch(() => setStatus('Erreur de chargement Google Maps'));

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || !googleMap.current || !window.google?.maps || filteredClubs.length === 0) return;

    const maps = window.google.maps;
    const geocoder = new maps.Geocoder();
    let cancelled = false;

    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    filteredClubs.slice(0, 16).forEach((club, index) => {
      window.setTimeout(() => {
        if (cancelled) return;

        geocoder.geocode({ address: buildClubSearch(club), region: 'FR' }, (results, geocodeStatus) => {
          if (cancelled || geocodeStatus !== 'OK' || !results?.[0]) return;

          const marker = new maps.Marker({
            map: googleMap.current,
            position: results[0].geometry.location,
            title: club.club_nom,
          });

          marker.addListener('click', () => {
            setSelectedClub(club);
            infoWindow.current.setContent(`<strong>${club.club_nom}</strong><br>${club.pays}`);
            infoWindow.current.open({ map: googleMap.current, anchor: marker });
          });

          markers.current.push(marker);
        });
      }, index * 150);
    });

    return () => {
      cancelled = true;
    };
  }, [apiKey, filteredClubs]);

  function focusClub(club) {
    setSelectedClub(club);

    if (!apiKey || !googleMap.current || !window.google?.maps) {
      window.open(club.url, '_blank', 'noopener,noreferrer');
      return;
    }

    const maps = window.google.maps;
    const geocoder = new maps.Geocoder();

    geocoder.geocode({ address: buildClubSearch(club), region: 'FR' }, (results, geocodeStatus) => {
      if (geocodeStatus !== 'OK' || !results?.[0]) {
        window.open(club.url, '_blank', 'noopener,noreferrer');
        return;
      }

      const position = results[0].geometry.location;
      googleMap.current.panTo(position);
      googleMap.current.setZoom(15);
    });
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
        }}>PARIS CLUBS</div>
      </div>

      <Card style={{ padding: 12, overflow: 'hidden' }}>
        <div ref={mapRef} style={{
          height: 360,
          borderRadius: 16,
          overflow: 'hidden',
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
      </Card>

      <input
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Chercher un club"
        style={inputStyle}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredClubs.map(club => (
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
            }}>
              <div style={{
                fontFamily: fontSans,
                fontWeight: 700,
                fontSize: 14,
                color: C.ink,
                letterSpacing: '0.04em',
              }}>{club.club_nom}</div>
              <div style={{ marginTop: 4, fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>
                {club.pays}
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
