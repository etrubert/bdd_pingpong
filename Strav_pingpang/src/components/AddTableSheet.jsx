// =====================================================================
// PING PANG PARIS — Ajout d'une table publique par photo (Finder › Tables)
//
// Flux en panneau plein écran :
//   1. Photo (input file + capture caméra sur mobile) → aperçu
//   2. Confirmation de l'emplacement : mini-carte avec un pin DÉPLAÇABLE,
//      pré-placé sur la position GPS (useLiveLocation) ou le centre courant.
//      L'utilisateur ajuste le pin → coordonnées fiables même sans GPS.
//   3. Champs (nom, nb de tables, indoor, type)
//   4. Anti-doublon : alerte si une table existe déjà dans un rayon ~50 m
//   5. Soumission : upload photo (Storage) + insert (community_tables)
// =====================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

import { C, fontDisplay, fontSans, kicker, inputStyle, btnPrimary, btnGhost } from '../theme';
import { useUI } from './uiContext';
import {
  isSupabaseConfigured,
  findNearbyTables,
  uploadTablePhoto,
  addCommunityTable,
} from '../lib/communityTables';
import { awardTableBonus, POINTS_PER_TABLE } from '../lib/loginStreak';

const PARIS = [48.8566, 2.3522];

// Pin déplaçable (réplique du tableIcon du Finder, accentué en cream)
const draggablePin = L.divIcon({
  className: 'pp-add-table-pin',
  html: `<svg width="34" height="46" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.45));">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 28 16 28s16-16.5 16-28c0-8.84-7.16-16-16-16z" fill="#EFE5C8"/>
    <circle cx="16" cy="16" r="5.5" fill="#092C25"/>
  </svg>`,
  iconSize: [34, 46],
  iconAnchor: [17, 46],
});

// Recentre la mini-carte une seule fois sur la position initiale
function InitialCenter({ center }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!done.current && center) {
      map.setView(center, 17);
      done.current = true;
    }
  }, [center, map]);
  return null;
}

const TYPE_PRESETS = ['Parc', 'Gymnase', 'École', 'Place publique', 'Autre'];

export default function AddTableSheet({ open, onClose, userPos, existingTables, onAdded }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [pos, setPos] = useState(null); // [lat, lon]
  const [name, setName] = useState('');
  const [nbTables, setNbTables] = useState(1);
  const [indoor, setIndoor] = useState('no');
  const [type, setType] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [nearby, setNearby] = useState(null); // null = pas vérifié, [] = ok, [..] = doublon
  const fileInputRef = useRef(null);
  const { showToast } = useUI() || {};

  // Position initiale du pin : GPS si dispo, sinon centre par défaut.
  const initialCenter = useMemo(() => userPos || PARIS, [userPos]);

  // (Ré)initialise le formulaire à chaque ouverture.
  useEffect(() => {
    if (open) {
      setFile(null);
      setPreview('');
      setPos(userPos || PARIS);
      setName('');
      setNbTables(1);
      setIndoor('no');
      setType('');
      setSubmitting(false);
      setError('');
      setNearby(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Aperçu photo (révoque l'object URL au changement / démontage)
  useEffect(() => {
    if (!file) {
      setPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!open) return null;

  function handleFile(e) {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setFile(f);
      setError('');
    }
  }

  function onDragEnd(e) {
    const ll = e.target.getLatLng();
    setPos([ll.lat, ll.lng]);
    setNearby(null); // on revérifie après déplacement
  }

  async function doSubmit(skipDupCheck = false) {
    setError('');
    if (!file) {
      setError('Ajoute une photo de la table.');
      return;
    }
    if (!pos) {
      setError('Place le pin sur la carte.');
      return;
    }
    if (!isSupabaseConfigured) {
      setError("Supabase n'est pas configuré : impossible d'enregistrer la table.");
      return;
    }

    // Anti-doublon : alerte si une table existe déjà dans un rayon ~50 m
    if (!skipDupCheck) {
      const near = findNearbyTables(pos[0], pos[1], existingTables, 50);
      if (near.length > 0) {
        setNearby(near);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { photo_url, photo_path } = await uploadTablePhoto(file);
      const row = await addCommunityTable({
        lat: pos[0],
        lon: pos[1],
        name: name.trim(),
        nb_tables: Number(nbTables) || 1,
        indoor,
        type: type.trim(),
        photo_url,
        photo_path,
      });
      // Table acceptée → +5 points au classement de streak (anti-double-comptage par id)
      const awarded = awardTableBonus(row.id);
      onAdded(row);
      onClose();
      if (showToast) {
        showToast(awarded
          ? `Table ajoutée ✓ +${POINTS_PER_TABLE} pts streak`
          : 'Table ajoutée ✓');
      }
    } catch (err) {
      setError(err?.message || "Échec de l'enregistrement.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: C.bgGrad,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ padding: '20px 18px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={kicker}>FINDER · TABLES</div>
            <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 38, lineHeight: 0.95, color: C.ink, letterSpacing: '0.02em', marginTop: 6 }}>
              AJOUTER UNE TABLE
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ all: 'unset', cursor: 'pointer', padding: 8, color: C.ink }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {!isSupabaseConfigured && (
          <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(232,155,139,0.10)', border: '1px solid rgba(232,155,139,0.4)', fontFamily: fontSans, fontSize: 12.5, color: C.ink }}>
            Supabase n'est pas configuré : tu peux préparer la table mais l'enregistrement échouera.
          </div>
        )}

        {/* 1. Photo */}
        <div>
          <div style={{ ...kicker, marginBottom: 10 }}>1 · PHOTO DE LA TABLE</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
          {preview ? (
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              <img src={preview} alt="Aperçu" style={{ width: '100%', display: 'block', maxHeight: 280, objectFit: 'cover' }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ all: 'unset', cursor: 'pointer', position: 'absolute', bottom: 10, right: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(12,33,26,0.82)', color: C.cream, fontFamily: fontSans, fontWeight: 700, fontSize: 11.5, letterSpacing: '0.08em' }}
              >
                CHANGER
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', boxSizing: 'border-box', height: 150, borderRadius: 16, border: `1.5px dashed ${C.borderHi}`, background: 'rgba(8,22,17,0.4)', color: C.inkDim }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>Prendre une photo</span>
            </button>
          )}
        </div>

        {/* 2. Emplacement */}
        <div>
          <div style={{ ...kicker, marginBottom: 6 }}>2 · EMPLACEMENT</div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginBottom: 10 }}>
            {userPos ? 'Pin pré-placé sur ta position GPS. ' : 'Position GPS indisponible. '}
            Déplace le pin sur la table exacte.
          </div>
          <div style={{ borderRadius: 16, overflow: 'hidden', height: 240, border: `1px solid ${C.border}` }}>
            <MapContainer center={initialCenter} zoom={17} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <InitialCenter center={initialCenter} />
              {pos && (
                <Marker position={pos} icon={draggablePin} draggable eventHandlers={{ dragend: onDragEnd }} />
              )}
            </MapContainer>
          </div>
          {pos && (
            <div style={{ marginTop: 6, fontFamily: fontSans, fontSize: 11, color: C.inkFaint, textAlign: 'center' }}>
              {pos[0].toFixed(5)}, {pos[1].toFixed(5)}
            </div>
          )}
        </div>

        {/* 3. Détails */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={kicker}>3 · DÉTAILS</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du lieu (optionnel)" style={inputStyle} />

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginBottom: 6 }}>Nombre de tables</div>
              <input type="number" min={1} max={50} value={nbTables} onChange={(e) => setNbTables(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginBottom: 6 }}>Intérieur ?</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ id: 'no', label: 'Extérieur' }, { id: 'yes', label: 'Intérieur' }].map((o) => {
                  const active = indoor === o.id;
                  return (
                    <button key={o.id} onClick={() => setIndoor(o.id)} style={{ all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center', padding: '12px 4px', borderRadius: 12, border: `1px solid ${active ? C.cream : C.border}`, background: active ? 'rgba(239,229,200,0.12)' : 'rgba(8,22,17,0.45)', color: active ? C.cream : C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 12 }}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginBottom: 6 }}>Type de lieu</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TYPE_PRESETS.map((t) => {
                const active = type === t;
                return (
                  <button key={t} onClick={() => setType(active ? '' : t)} style={{ all: 'unset', cursor: 'pointer', padding: '8px 14px', borderRadius: 10, border: `1px solid ${active ? C.cream : C.border}`, background: active ? 'rgba(239,229,200,0.12)' : 'rgba(8,22,17,0.45)', color: active ? C.cream : C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 12 }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerte anti-doublon */}
        {nearby && nearby.length > 0 && (
          <div style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(232,201,155,0.10)', border: '1px solid rgba(232,201,155,0.45)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 13.5, color: C.ink }}>
              Une table existe peut-être déjà ici
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.inkDim }}>
              {nearby.length === 1 ? 'Une table' : `${nearby.length} tables`} à moins de {Math.round(nearby[0].distance)} m
              {nearby[0].name ? ` (${nearby[0].name})` : ''}. Ajoute-la quand même si c'en est une différente.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setNearby(null)} disabled={submitting} style={btnGhost}>ANNULER</button>
              <button onClick={() => doSubmit(true)} disabled={submitting} style={btnPrimary}>
                {submitting ? '...' : 'AJOUTER QUAND MÊME'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.loss }}>{error}</div>
        )}

        {/* Actions */}
        {!(nearby && nearby.length > 0) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} disabled={submitting} style={btnGhost}>ANNULER</button>
            <button onClick={() => doSubmit(false)} disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'ENVOI...' : 'AJOUTER LA TABLE'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
