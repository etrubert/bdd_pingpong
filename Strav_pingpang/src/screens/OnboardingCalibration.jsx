// =====================================================================
// PING PANG PARIS — Étape 4 : calibration ELO (400 → 1500)
// =====================================================================

import { useMemo, useState } from 'react';
import { C, fontDisplay, fontSans, kicker } from '../theme';
import {
  calculateInitialElo,
  deriveCalibrationDefaults,
  getEloRange,
  ELO_MIN,
  ELO_MAX,
} from '../lib/eloCalibration';

const EXPERIENCES = [
  { value: '<1y',   label: 'Je débute',           hint: 'Premiers échanges' },
  { value: '1-3y',  label: 'Moins de 3 ans',      hint: 'Quelques mois / saisons' },
  { value: '3-5y',  label: '3 à 5 ans',           hint: 'Joueur régulier loisir' },
  { value: '5-10y', label: '5 à 10 ans',          hint: 'Solide en club' },
  { value: '10+y',  label: '10 ans et plus',      hint: 'Longue pratique' },
];

const FREQUENCIES = [
  { value: 'rare',     label: 'Rarement',        hint: 'Occasionnel' },
  { value: 'monthly',  label: '1× / mois',       hint: 'Loisir léger' },
  { value: 'weekly',   label: '1× / semaine',    hint: 'Régulier' },
  { value: '2-3week',  label: '2–3× / semaine',  hint: 'Sérieux' },
  { value: 'daily',    label: 'Quasi quotidien', hint: 'Intensif' },
];

const LEVELS = [
  { value: 'leisure',      label: 'Uniquement entre amis',              hint: '~400–650' },
  { value: 'tournament',   label: 'Tournois loisir / opens de club',    hint: '~650–900' },
  { value: 'departmental', label: 'Championnat départemental (D1–D4)', hint: '~900–1150' },
  { value: 'regional',     label: 'Régional (R1–R4)',                   hint: '~1150–1350' },
  { value: 'national',     label: 'National / haut niveau',             hint: '~1350–1500' },
];

function Stepper({ total = 4, current = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < current ? C.warm : 'rgba(245,246,243,0.10)',
        }} />
      ))}
    </div>
  );
}

function FieldLabel({ children, sub }) {
  return (
    <div style={{ marginTop: 18, marginBottom: 10 }}>
      <div style={kicker}>{children}</div>
      {sub && (
        <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 4, lineHeight: 1.4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Pill({ active, onClick, children, hint }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      padding: hint ? '10px 14px' : '8px 16px',
      borderRadius: 12,
      border: `1px solid ${active ? C.warm : C.border}`,
      background: active ? C.warm : 'rgba(8,22,17,0.45)',
      color: active ? '#092C25' : C.ink,
      fontFamily: fontSans, fontWeight: 700, fontSize: 13,
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
      maxWidth: '100%',
    }}>
      <span>{children}</span>
      {hint && (
        <span style={{
          fontSize: 10.5, fontWeight: 500, opacity: active ? 0.75 : 0.65,
          color: active ? '#092C25' : C.inkDim,
        }}>{hint}</span>
      )}
    </button>
  );
}

function LevelRow({ active, onClick, children, hint }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      width: '100%', boxSizing: 'border-box',
      padding: '14px 16px', borderRadius: 12,
      border: `1px solid ${active ? C.warm : C.border}`,
      background: active ? C.warm : 'rgba(8,22,17,0.55)',
      color: active ? '#092C25' : C.ink,
      fontFamily: fontSans, fontSize: 14,
      fontWeight: active ? 700 : 500,
      textAlign: 'left',
    }}>
      <div>{children}</div>
      {hint && (
        <div style={{
          marginTop: 4, fontSize: 11.5, fontWeight: 500,
          opacity: active ? 0.8 : 0.65,
          color: active ? '#092C25' : C.inkDim,
        }}>{hint}</div>
      )}
    </button>
  );
}

function SelfRatingSlider({ value, onChange }) {
  const label =
    value < 20 ? 'Débutant' :
    value < 40 ? 'Loisir' :
    value < 60 ? 'Intermédiaire' :
    value < 80 ? 'Confirmé' :
                 'Très avancé';

  const approxElo = Math.round(ELO_MIN + (value / 100) * (ELO_MAX - ELO_MIN));

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ position: 'relative', height: 38, display: 'flex', alignItems: 'center' }}>
        <input
          type="range" min="0" max="100" value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: '100%', appearance: 'none', height: 4,
            background: `linear-gradient(to right, ${C.warm} 0%, ${C.warm} ${value}%, rgba(245,246,243,0.18) ${value}%, rgba(245,246,243,0.18) 100%)`,
            borderRadius: 999, outline: 'none',
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 18px; height: 18px; border-radius: 50%;
            background: ${C.warm};
            border: 2px solid #092C25;
            cursor: pointer;
            box-shadow: 0 0 12px rgba(232,201,155,0.45);
          }
          input[type="range"]::-moz-range-thumb {
            width: 18px; height: 18px; border-radius: 50%;
            background: ${C.warm};
            border: 2px solid #092C25;
            cursor: pointer;
          }
        `}</style>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 6, fontFamily: fontSans, fontSize: 12, color: C.inkDim,
      }}>
        <span>{ELO_MIN}</span>
        <span style={{ color: C.warm, fontWeight: 700 }}>
          {label} · ~{approxElo} pts
        </span>
        <span>{ELO_MAX}</span>
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
          Échelle {ELO_MIN}–{ELO_MAX}. Tes premiers matchs affinent rapidement le score.
        </div>
      </div>
    </div>
  );
}

export default function OnboardingCalibration({ userId, onComplete, initialAnswers }) {
  const defaults = useMemo(
    () => deriveCalibrationDefaults(initialAnswers || {}),
    [initialAnswers]
  );

  const [experience, setExperience] = useState(
    initialAnswers?.experience || defaults.experience || null
  );
  const [frequency, setFrequency] = useState(
    initialAnswers?.frequency || defaults.frequency || null
  );
  // `initialAnswers.level` = auto-éval « Je progresse » (Débutant, Loisir…)
  // Le niveau compétitif (leisure, regional…) est saisi uniquement ici.
  const [compLevel, setCompLevel] = useState(
    initialAnswers?.calibLevel || defaults.calibLevel || null
  );
  const [selfRating, setSelfRating] = useState(
    initialAnswers?.selfRating ?? defaults.selfRating ?? 50
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const progressHint = initialAnswers?.level
    ? `Profil « ${initialAnswers.level} » : ajuste les réponses ci-dessous si besoin.`
    : null;

  const estimation = useMemo(() => {
    if (!experience || !frequency || !compLevel) return null;
    return calculateInitialElo({ experience, frequency, level: compLevel, selfRating });
  }, [experience, frequency, compLevel, selfRating]);

  const canSubmit = !!experience && !!frequency && !!compLevel;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await onComplete?.(estimation.elo, {
        experience, frequency, calibLevel: compLevel, selfRating,
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
      <div style={kicker}>ÉTAPE 4 / 4 · CALIBRAGE ELO</div>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 32, lineHeight: 1.05,
        color: C.ink, marginTop: 8, letterSpacing: '0.04em',
      }}>TON EXPÉRIENCE</div>
      <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6, lineHeight: 1.45 }}>
        On estime ton ELO entre <strong style={{ color: C.ink }}>{ELO_MIN}</strong> et{' '}
        <strong style={{ color: C.ink }}>{ELO_MAX}</strong> selon tes réponses.
      </div>
      {progressHint && (
        <div style={{
          marginTop: 10, padding: '10px 12px', borderRadius: 10,
          background: 'rgba(232,201,155,0.08)', border: `1px solid ${C.border}`,
          fontFamily: fontSans, fontSize: 12.5, color: C.inkDim, lineHeight: 1.45,
        }}>{progressHint}</div>
      )}

      <FieldLabel sub="Plus tu débutes, plus l'ELO de départ est bas.">
        DEPUIS QUAND TU JOUES ?
      </FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {EXPERIENCES.map(opt => (
          <Pill key={opt.value}
            active={experience === opt.value}
            onClick={() => setExperience(opt.value)}
            hint={opt.hint}>
            {opt.label}
          </Pill>
        ))}
      </div>

      <FieldLabel sub="La régularité fait monter l'estimation.">
        TU JOUES À QUELLE FRÉQUENCE ?
      </FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FREQUENCIES.map(opt => (
          <Pill key={opt.value}
            active={frequency === opt.value}
            onClick={() => setFrequency(opt.value)}
            hint={opt.hint}>
            {opt.label}
          </Pill>
        ))}
      </div>

      <FieldLabel sub="Le niveau compétitif le plus élevé que tu as pratiqué.">
        NIVEAU LE PLUS ÉLEVÉ ATTEINT
      </FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {LEVELS.map(opt => (
          <LevelRow key={opt.value}
            active={compLevel === opt.value}
            onClick={() => setCompLevel(opt.value)}
            hint={opt.hint}>
            {opt.label}
          </LevelRow>
        ))}
      </div>

      <FieldLabel sub="Ajuste si tu te sens au-dessus ou en-dessous des choix précédents.">
        HONNÊTEMENT, TU TE SITUES OÙ ?
      </FieldLabel>
      <SelfRatingSlider value={selfRating} onChange={setSelfRating} />

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
        color: '#092C25',
        fontFamily: fontSans, fontWeight: 800, fontSize: 14, letterSpacing: '0.16em',
        opacity: (!canSubmit || submitting) ? 0.5 : 1,
      }}>{submitting ? 'SAUVEGARDE...' : "LET'S PLAY"}</button>
    </div>
  );
}
