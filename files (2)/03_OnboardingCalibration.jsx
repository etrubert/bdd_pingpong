// =====================================================================
// PING PANG PARIS — Écran d'onboarding : calibration ELO
// À placer dans : Strav_pingpang/src/screens/OnboardingCalibration.jsx
// =====================================================================

import { useState, useMemo } from 'react';
import { calculateInitialElo, getEloRange, saveInitialElo } from '../lib/eloCalibration';
import { supabase } from '../lib/supabase'; // ton client supabase existant

const EXPERIENCES = [
  { value: '<1y', label: '< 1 an' },
  { value: '1-3y', label: '1-3 ans' },
  { value: '3-5y', label: '3-5 ans' },
  { value: '5-10y', label: '5-10 ans' },
  { value: '10+y', label: '10+ ans' },
];

const FREQUENCIES = [
  { value: 'rare', label: 'Rarement' },
  { value: 'monthly', label: '1×/mois' },
  { value: 'weekly', label: '1×/sem' },
  { value: '2-3week', label: '2-3×/sem' },
  { value: 'daily', label: 'Quotidien' },
];

const LEVELS = [
  { value: 'leisure', label: 'Loisir / entre amis uniquement' },
  { value: 'tournament', label: 'Tournois loisir / club ouvert' },
  { value: 'departmental', label: 'Championnat départemental (D1-D4)' },
  { value: 'regional', label: 'Régional (R1-R4)' },
  { value: 'national', label: 'National / Pro' },
];

export default function OnboardingCalibration({ userId, onComplete }) {
  const [experience, setExperience] = useState(null);
  const [frequency, setFrequency] = useState(null);
  const [level, setLevel] = useState(null);
  const [selfRating, setSelfRating] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  // Calcul de l'ELO estimé en live
  const estimation = useMemo(() => {
    if (!experience || !frequency || !level) return null;
    return calculateInitialElo({
      experience,
      frequency,
      level,
      selfRating,
    });
  }, [experience, frequency, level, selfRating]);

  const canSubmit = experience && frequency && level;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await saveInitialElo(supabase, userId, estimation.elo);
      onComplete?.(estimation.elo);
    } catch (err) {
      console.error('Erreur ELO save:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ppp-screen">
      {/* Stepper */}
      <div className="ppp-stepper">
        <div className="bar active" />
        <div className="bar active" />
        <div className="bar active" />
      </div>
      <p className="ppp-step-label">Étape 3 · Question calibrage</p>

      <h2 className="ppp-title">TON EXPÉRIENCE</h2>
      <p className="ppp-subtitle">On calibre ton ELO de départ</p>

      {/* Q1 : Expérience */}
      <label className="ppp-field-label">Depuis quand tu joues ?</label>
      <div className="ppp-tags">
        {EXPERIENCES.map((opt) => (
          <button
            key={opt.value}
            className={`ppp-tag ${experience === opt.value ? 'active' : ''}`}
            onClick={() => setExperience(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Q2 : Fréquence */}
      <label className="ppp-field-label">Tu joues à quelle fréquence ?</label>
      <div className="ppp-tags">
        {FREQUENCIES.map((opt) => (
          <button
            key={opt.value}
            className={`ppp-tag ${frequency === opt.value ? 'active' : ''}`}
            onClick={() => setFrequency(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Q3 : Niveau */}
      <label className="ppp-field-label">Niveau le plus élevé atteint</label>
      <div className="ppp-level-list">
        {LEVELS.map((opt) => (
          <button
            key={opt.value}
            className={`ppp-level-row ${level === opt.value ? 'active' : ''}`}
            onClick={() => setLevel(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Q4 : Slider auto-éval */}
      <label className="ppp-field-label">Honnêtement, tu te situes où ?</label>
      <div className="ppp-slider-box">
        <input
          type="range"
          min="0"
          max="100"
          value={selfRating}
          onChange={(e) => setSelfRating(Number(e.target.value))}
          className="ppp-slider"
        />
        <div className="ppp-slider-labels">
          <span>Débutant</span>
          <span>Intermédiaire</span>
          <span>Expert</span>
        </div>
      </div>

      {/* Estimation ELO en live */}
      {estimation && (
        <div className="ppp-elo-preview">
          <div className="ppp-elo-preview-icon">🎯</div>
          <div className="ppp-elo-preview-content">
            <p className="ppp-elo-preview-label">ELO de départ estimé</p>
            <p className="ppp-elo-preview-value">
              {estimation.elo}
              <span className="range">±{getEloRange(estimation.confidence)}</span>
            </p>
          </div>
          <p className="ppp-elo-preview-note">
            Tes 5 premiers matchs auront un coefficient renforcé pour affiner rapidement.
          </p>
        </div>
      )}

      <button
        className="ppp-btn-primary"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
      >
        {submitting ? 'Sauvegarde...' : "Let's play"}
      </button>
    </div>
  );
}
