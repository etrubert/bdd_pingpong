// =====================================================================
// PING PANG PARIS — Popup de consentement géolocalisation (changement 3)
//
// Modal affiché tant que l'utilisateur n'a pas choisi (consent === null).
// Explique le suivi en direct style Strava, puis Accepter / Refuser.
// =====================================================================

import { C, fontDisplay, fontSans } from '../theme';
import { useLiveLocation } from '../lib/liveLocation';

export default function LocationConsent() {
  const { consent, status, grant, deny } = useLiveLocation();

  // On n'affiche le popup que si aucun choix n'a encore été fait.
  if (consent === 'granted' || consent === 'denied') return null;
  if (status === 'asking') return null; // pendant la demande native, pas de modal

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(6,18,13,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 320,
        background: 'linear-gradient(180deg, #0E3A30 0%, #124638 100%)',
        border: `1px solid ${C.borderHi}`, borderRadius: 22,
        padding: 24, textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Icône localisation */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
          background: 'rgba(66,133,244,0.18)', border: '1px solid rgba(66,133,244,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7DA9F4',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        </div>

        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 24, color: C.ink,
          letterSpacing: '0.01em', lineHeight: 1.1,
        }}>SUIVI EN DIRECT</div>

        <div style={{
          fontFamily: fontSans, fontSize: 13.5, color: C.inkDim, lineHeight: 1.5,
          marginTop: 12,
        }}>
          Active ta position pour que la carte te suive en temps réel, voir les clubs
          et tables autour de toi, et apparaître auprès de tes amis qui partagent aussi
          leur position. Tu peux désactiver à tout moment.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          <button onClick={grant} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: '#4285F4', color: '#fff',
            fontFamily: fontSans, fontWeight: 700, fontSize: 13.5, letterSpacing: '0.04em',
            cursor: 'pointer',
          }}>Activer ma position</button>
          <button onClick={deny} style={{
            width: '100%', padding: '12px', borderRadius: 14,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.inkDim, fontFamily: fontSans, fontWeight: 700, fontSize: 13,
            cursor: 'pointer',
          }}>Plus tard</button>
        </div>
      </div>
    </div>
  );
}
