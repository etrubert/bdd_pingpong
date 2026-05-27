// =====================================================================
// PING PANG PARIS — Étape 3 : calibration ELO (DA capture utilisateur)
// =====================================================================

import { useState, useMemo } from 'react';
import { C, fontDisplay, fontSans, kicker } from '../theme';
import { calculateInitialElo, getEloRange } from '../lib/eloCalibration';

const EXPERIENCES = [
  { value: '<1y',   label: '< 1 an' },
  { value: '1-3y',  label: '1-3 ans' },
  { value: '3-5y',  label: '3-5 ans' },
  { value: '5-10y', label: '5-10 ans' },
  { value: '10+y',  label: '10+ ans' },
];

const FREQUENCIES = [
  { value: 'rare',     label: 'Rarement' },
  { value: 'monthly',  label: '1×/mois' },
  { value: 'weekly',   label: '1×/sem' },
  { value: '2-3week',  label: '2-3×/sem' },
  { value: 'daily',    label: 'Quotidien' },
];

const LEVELS = [
  { value: 'leisure',      label: 'Loisir / entre amis uniquement' },
  { value: 'tournament',   label: 'Tournois loisir / club ouvert' },
  { value: 'departmental', label: 'Championnat départemental (D1-D4)' },
  { value: 'regional',     label: 'Régional (R1-R4)' },
  { value: 'national',     label: 'National / Pro' },
];

// ----- Sous-composants UI -----

function Stepper({ total = 4, current = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < current ? C.warm : 'rgba(184,220,197,0.10)',
        }} />
      ))}
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ ...kicker, marginTop: 18, marginBottom: 10 }}>{children}</div>;
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      padding: '8px 16px', borderRadius: 999,
      border: `1px solid ${active ? C.warm : C.border}`,
      background: active ? C.warm : 'rgba(8,22,17,0.45)',
      color: active ? '#0C211A' : C.ink,
      fontFamily: fontSans, fontWeight: 700, fontSize: 13,
    }}>{children}</button>
  );
}

function LevelRow({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      width: '100%', boxSizing: 'border-box',
      padding: '14px 16px', borderRadius: 12,
      border: `1px solid ${active ? C.warm : C.border}`,
      background: active ? C.warm : 'rgba(8,22,17,0.55)',
      color: active ? '#0C211A' : C.ink,
      fontFamily: fontSans, fontSize: 14,
      fontWeight: active ? 700 : 500,
    }}>{children}</button>
  );
}

function SelfRatingSlider({ value, onChange }) {
  // Étiquette dynamique selon la position
  const label =
    value < 25 ? 'Débutant+' :
    value < 50 ? 'Loisir+' :
    value < 70 ? 'Intermédiaire+' :
    value < 85 ? 'Confirmé+' :
                 'Expert+';
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ position: 'relative', height: 38, display: 'flex', alignItems: 'center' }}>
        <input
          type="range" min="0" max="100" value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: '100%', appearance: 'none', height: 4,
            background: `linear-gradient(to right, ${C.warm} 0%, ${C.warm} ${value}%, rgba(184,220,197,0.18) ${value}%, rgba(184,220,197,0.18) 100%)`,
            borderRadius: 999, outline: 'none',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px; height: 18px; border-radius: 50%;
            background: ${C.warm};
            border: 2px solid #0C211A;
            cursor: pointer;
            box-shadow: 0 0 12px rgba(232,201,155,0.45);
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px; height: 18px; border-radius: 50%;
            background: ${C.warm};
            border: 2px solid #0C211A;
            cursor: pointer;
          }
        `}</style>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 4, fontFamily: fontSans, fontSize: 12, color: C.inkDim,
      }}>
        <span>Débutant</span>
        <span style={{ color: C.warm, fontWeight: 700 }}>{label}</span>
        <span>Expert</span>
      </div>
    </div>
  );
}

function EloPreviewCard({ estimation }) {
  const range = getEloRange(estimation.confidence);
  return (
    <div style={{
      marginTop: 22,
      padding: '16px 18px', borderRadius: 16,
      background: 'rgba(61,209,107,0.06)',
      border: '1px solid rgba(61,209,107,0.30)',
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: 'rgba(61,209,107,0.14)',
        border: '1px solid rgba(61,209,107,0.40)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>🎯</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...kicker, color: '#3DD16B' }}>ELO DE DÉPART ESTIMÉ</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <span style={{
            fontFamily: fontDisplay, fontWeight: 800, fontSize: 32,
            color: C.ink, lineHeight: 1,
          }}>{estimation.elo}</span>
          <span style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim }}>
            ±{range}
          </span>
        </div>
        <div style={{
          marginTop: 8, fontFamily: fontSans, fontSize: 12.5,
          color: C.inkDim, lineHeight: 1.5,
        }}>
          Tes 5 premiers matchs auront un coefficient renforcé pour affiner rapidement.
        </div>
      </div>
    </div>
  );
}

// ----- Composant principal -----

export default function OnboardingCalibration({ userId, onComplete, initialAnswers }) {
  const [experience, setExperience] = useState(initialAnswers?.experience || null);
  const [frequency,  setFrequency]  = useState(initialAnswers?.frequency  || null);
  const [level,      setLevel]      = useState(initialAnswers?.level      || null);
  const [selfRating, setSelfRating] = useState(initialAnswers?.selfRating ?? 50);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const estimation = useMemo(() => {
    if (!experience || !frequency || !level) return null;
    return calculateInitialElo({ experience, frequency, level, selfRating });
  }, [experience, frequency, level, selfRating]);

  const canSubmit = !!experience && !!frequency && !!level;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      // La sauvegarde Supabase (profil + ELO) est gérée par le parent
      // qui dispose du token d'auth via lib/auth.js
      await onComplete?.(estimation.elo, {
        experience, frequency, level, selfRating,
        initialElo: estimation.elo,
      });
    } catch (err) {
      console.error('Erreur sauvegarde calibration:', err);
      setError(err.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Stepper total={4} current={4} />
      <div style={kicker}>ÉTAPE 4 / 4 · QUESTION CALIBRAGE</div>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 32, lineHeight: 1.05,
        color: C.ink, marginTop: 8, letterSpacing: '0.04em',
      }}>TON EXPÉRIENCE</div>
      <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6 }}>
        On calibre ton ELO de départ
      </div>

      {/* Q1 — Expérience */}
      <FieldLabel>DEPUIS QUAND TU JOUES ?</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {EXPERIENCES.map(opt => (
          <Pill key={opt.value}
                active={experience === opt.value}
                onClick={() => setExperience(opt.value)}>
            {opt.label}
          </Pill>
        ))}
      </div>

      {/* Q2 — Fréquence */}
      <FieldLabel>TU JOUES À QUELLE FRÉQUENCE ?</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FREQUENCIES.map(opt => (
          <Pill key={opt.value}
                active={frequency === opt.value}
                onClick={() => setFrequency(opt.value)}>
            {opt.label}
          </Pill>
        ))}
      </div>

      {/* Q3 — Niveau le plus élevé atteint */}
      <FieldLabel>NIVEAU LE PLUS ÉLEVÉ ATTEINT</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LEVELS.map(opt => (
          <LevelRow key={opt.value}
                    active={level === opt.value}
                    onClick={() => setLevel(opt.value)}>
            {opt.label}
          </LevelRow>
        ))}
      </div>

      {/* Q4 — Auto-évaluation */}
      <FieldLabel>HONNÊTEMENT, TU TE SITUES OÙ ?</FieldLabel>
      <SelfRatingSlider value={selfRating} onChange={setSelfRating} />

      {/* Estimation ELO live */}
      {estimation && <EloPreviewCard estimation={estimation} />}

      {error && (
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 12,
          background: 'rgba(232,155,139,0.08)', border: '1px solid rgba(232,155,139,0.30)',
          color: C.loss, fontFamily: fontSans, fontSize: 12.5,
        }}>{error}</div>
      )}

      <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{
        all: 'unset', cursor: (!canSubmit || submitting) ? 'not-allowed' : 'pointer',
        marginTop: 22, padding: '15px', textAlign: 'center',
        borderRadius: 12,
        background: (!canSubmit || submitting) ? 'rgba(232,201,155,0.30)' : C.warm,
        color: '#0C211A',
        fontFamily: fontSans, fontWeight: 800, fontSize: 14, letterSpacing: '0.16em',
        opacity: (!canSubmit || submitting) ? 0.5 : 1,
      }}>{submitting ? 'SAUVEGARDE...' : "LET'S PLAY"}</button>
    </div>
  );
}
