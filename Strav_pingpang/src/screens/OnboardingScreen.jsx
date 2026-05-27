import { useState, useEffect } from 'react';
import { C, fontDisplay, fontSans, fontItalic, kicker } from '../theme';
import { useOnboarding } from '../lib/onboarding';
import OnboardingCalibration from './OnboardingCalibration';
import { signUp, signIn, signOut, refreshProfile, updateProfile, useAuth } from '../lib/auth';

// ----- Atomes UI -----
function Pill({ active, onClick, children, full }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      padding: '8px 16px', borderRadius: 999,
      border: `1px solid ${active ? C.warm : C.border}`,
      background: active ? C.warm : 'rgba(8,22,17,0.45)',
      color: active ? '#092C25' : C.ink,
      fontFamily: fontSans, fontWeight: 700, fontSize: 13,
      textAlign: 'center',
      ...(full ? { flex: 1 } : {}),
    }}>{children}</button>
  );
}

function PrimaryBtn({ onClick, children, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      all: 'unset', cursor: disabled ? 'not-allowed' : 'pointer',
      width: '100%', padding: '15px', textAlign: 'center',
      borderRadius: 12,
      background: disabled ? 'rgba(232,201,155,0.30)' : C.warm,
      color: '#092C25',
      fontFamily: fontSans, fontWeight: 800, fontSize: 14, letterSpacing: '0.16em',
      opacity: disabled ? 0.5 : 1,
    }}>{children}</button>
  );
}

function GhostBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset', cursor: 'pointer',
      width: '100%', padding: '13px', textAlign: 'center',
      borderRadius: 12,
      background: 'transparent', color: C.ink,
      border: `1px solid ${C.borderHi}`,
      fontFamily: fontSans, fontWeight: 700, fontSize: 13, letterSpacing: '0.12em',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      boxSizing: 'border-box',
    }}>{children}</button>
  );
}

function TextField({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        all: 'unset', boxSizing: 'border-box', width: '100%',
        padding: '13px 16px', borderRadius: 12,
        background: 'rgba(8,22,17,0.55)', border: `1px solid ${C.border}`,
        fontFamily: fontSans, fontSize: 14, color: C.ink,
      }}
    />
  );
}

function StepHeader({ step, total, kickerLabel, title, subtitle }) {
  return (
    <div>
      {/* Stepper bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < step ? C.warm : 'rgba(245,246,243,0.10)',
          }} />
        ))}
      </div>
      <div style={kicker}>{kickerLabel || `ÉTAPE ${step} / ${total}`}</div>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 32, lineHeight: 1.05,
        color: C.ink, marginTop: 8, letterSpacing: '0.04em',
      }}>{title}</div>
      {subtitle && (
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6, lineHeight: 1.4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ ...kicker, marginTop: 22, marginBottom: 10 }}>{children}</div>;
}

// ----- Step 0 : Création de compte OU connexion -----
function StepConnexion({ onSignedUp, onSignedIn, currentSession, onContinueAsCurrent, onSignOutCurrent }) {
  const [mode, setMode] = useState('signup'); // 'signup' | 'signin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSignup = mode === 'signup';

  const submit = async () => {
    setError('');
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isSignup) {
        const result = await signUp({ email, password });
        if (!result?.session) {
          try { await signIn({ email, password }); }
          catch (e) {
            throw new Error(e.message || 'Compte créé mais connexion impossible (confirmation email requise ?)');
          }
        }
        await onSignedUp({ email });
      } else {
        // Connexion : on vérifie email + mot de passe contre Supabase auth.
        await signIn({ email, password });
        await onSignedIn({ email });
      }
    } catch (e) {
      const msg = e.message || 'Erreur';
      // Message plus clair pour l'utilisateur sur les cas d'erreur fréquents.
      if (/invalid login credentials/i.test(msg) || /invalid_grant/i.test(msg)) {
        setError('Email ou mot de passe incorrect.');
      } else if (/email not confirmed/i.test(msg)) {
        setError('Email non confirmé. Vérifie ta boîte mail.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 30 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 70, height: 70, borderRadius: '50%',
          background: 'radial-gradient(60% 60% at 35% 30%, #d6b890 0%, #6b4a2e 60%, #1c100a 100%)',
          border: `1.5px solid ${C.borderHi}`,
          boxShadow: '0 0 32px rgba(232,201,155,0.20)',
        }} />
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 28, color: C.ink,
          letterSpacing: '0.06em', textAlign: 'center',
        }}>PING PANG<br />PARIS</div>
        <div style={{ ...kicker, color: C.warm }}>TROUVE TON MATCH</div>
      </div>

      {/* Toggle Inscription / Connexion */}
      <div style={{
        display: 'flex', gap: 6, padding: 4, borderRadius: 999,
        background: 'rgba(8,22,17,0.55)', border: `1px solid ${C.border}`,
      }}>
        {[
          { id: 'signup', label: 'Créer un compte' },
          { id: 'signin', label: 'Se connecter' },
        ].map(opt => {
          const active = mode === opt.id;
          return (
            <button key={opt.id} onClick={() => { setMode(opt.id); setError(''); }} style={{
              all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
              padding: '10px 0', borderRadius: 999,
              background: active ? C.warm : 'transparent',
              color: active ? '#092C25' : C.ink,
              fontFamily: fontSans, fontWeight: 700, fontSize: 12.5, letterSpacing: '0.08em',
            }}>{opt.label}</button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <TextField value={email} onChange={setEmail} placeholder="Email" type="email" />
        <TextField
          value={password}
          onChange={setPassword}
          placeholder={isSignup ? 'Mot de passe (8 caractères min.)' : 'Mot de passe'}
          type="password"
        />
        {error && (
          <div style={{ fontFamily: fontSans, fontSize: 12, color: '#E89B8B', padding: '6px 4px' }}>
            {error}
          </div>
        )}
        <PrimaryBtn onClick={submit} disabled={!email || !password || loading}>
          {loading ? '...' : (isSignup ? 'CRÉER MON COMPTE' : 'SE CONNECTER')}
        </PrimaryBtn>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.inkDim, fontSize: 11.5 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span>OU</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <GhostBtn onClick={() => setError('Google OAuth — bientôt')}><GoogleIcon /> Google</GhostBtn>
        <GhostBtn onClick={() => setError('Apple OAuth — bientôt')}><AppleIcon /> Apple</GhostBtn>
      </div>
    </div>
  );
}

const GoogleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 12.04c-.03-2.83 2.31-4.19 2.41-4.25-1.32-1.92-3.36-2.19-4.08-2.21-1.74-.18-3.4 1.02-4.28 1.02-.88 0-2.24-1-3.69-.97-1.9.03-3.65 1.1-4.62 2.8-1.97 3.42-.5 8.48 1.42 11.27.93 1.36 2.04 2.89 3.5 2.83 1.41-.06 1.94-.91 3.65-.91 1.7 0 2.18.91 3.67.88 1.51-.03 2.47-1.39 3.39-2.75 1.07-1.59 1.51-3.13 1.53-3.21-.03-.01-2.93-1.12-2.96-4.44zM14.5 4.46c.78-.94 1.3-2.25 1.16-3.55-1.12.05-2.48.75-3.28 1.69-.72.83-1.35 2.16-1.18 3.44 1.25.1 2.52-.63 3.3-1.58z"/>
  </svg>
);

// ----- Step 1 : Identité -----
function StepIdentity({ onNext, onBack, initial, currentEmail, onSignOut }) {
  const [fullName, setFullName] = useState(initial.fullName || '');
  const [region, setRegion] = useState(initial.region || 'Paris — 11e');
  const [handedness, setHandedness] = useState(initial.handedness || 'Droitier');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {currentEmail && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(8,22,17,0.55)', border: `1px solid ${C.border}`,
          fontFamily: fontSans, fontSize: 12, color: C.inkDim,
        }}>
          <span>Connecté en tant que <strong style={{ color: C.ink }}>{currentEmail}</strong></span>
          <button onClick={onSignOut} style={{
            all: 'unset', cursor: 'pointer',
            color: C.warm, fontWeight: 700, fontSize: 11, letterSpacing: '0.06em',
          }}>SE DÉCONNECTER</button>
        </div>
      )}
      <StepHeader step={1} total={4} title="COMMENÇONS" subtitle="Les bases pour t'afficher" />

      <div>
        <FieldLabel>NOM AFFICHÉ</FieldLabel>
        <TextField value={fullName} onChange={setFullName} placeholder="Ton nom" />
      </div>

      <div>
        <FieldLabel>RÉGION</FieldLabel>
        <TextField value={region} onChange={setRegion} placeholder="Paris — 11e" />
      </div>

      <div>
        <FieldLabel>MAIN DOMINANTE</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill active={handedness === 'Droitier'} onClick={() => setHandedness('Droitier')} full>Droitier</Pill>
          <Pill active={handedness === 'Gaucher'} onClick={() => setHandedness('Gaucher')} full>Gaucher</Pill>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <PrimaryBtn
          onClick={() => onNext({ fullName, region, handedness })}
          disabled={!fullName.trim()}
        >Suivant</PrimaryBtn>
      </div>
    </div>
  );
}

// ----- Step 2 : Type de joueur -----
function StepPlayerType({ onNext, initial }) {
  const [type, setType] = useState(initial.playerType || 'club');
  const options = [
    { id: 'fun',      title: 'Juste pour le fun',           sub: 'Quelques parties entre amis, au bar, en vacances. Pas de prise de tête.' },
    { id: 'progress', title: 'Régulièrement, je progresse', sub: 'Je joue souvent, je veux suivre mon niveau et trouver des partenaires de mon calibre.' },
    { id: 'club',     title: 'En club / compétition',       sub: "J'ai une licence, un classement officiel, je fais du championnat." },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepHeader step={2} total={4} title="COMMENT TU JOUES ?" subtitle="Pour t'adapter le bon parcours" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(opt => {
          const active = type === opt.id;
          return (
            <button key={opt.id} onClick={() => setType(opt.id)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '16px', borderRadius: 14,
              background: active ? 'rgba(232,201,155,0.10)' : 'rgba(8,22,17,0.45)',
              border: `1.5px solid ${active ? C.warm : C.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                border: `2px solid ${active ? C.warm : C.border}`,
                background: active ? C.warm : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#092C25' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: active ? C.warm : C.ink }}>{opt.title}</div>
                <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.inkDim, marginTop: 4, lineHeight: 1.45 }}>{opt.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 16 }}>
        <PrimaryBtn onClick={() => onNext({ playerType: type })}>Suivant</PrimaryBtn>
      </div>
    </div>
  );
}

// ----- Step 3A : Fun -----
function StepFun({ onNext, initial }) {
  const [availability, setAvailability] = useState(initial.availability || ['Soirs sem.']);
  const [lookingFor, setLookingFor] = useState(initial.lookingFor || ['Des partenaires']);
  const [ambiance, setAmbiance] = useState(initial.ambiance || 'Conviviale');
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepHeader step={3} total={4} title="QUAND TU JOUES ?" subtitle="Pour te suggérer les bons matchs" />

      <div>
        <FieldLabel>DISPONIBILITÉS</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Matins', 'Midis', 'Soirs sem.', 'Weekends'].map(v => (
            <Pill key={v} active={availability.includes(v)} onClick={() => toggle(availability, setAvailability, v)}>{v}</Pill>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>TU CHERCHES QUOI ?</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Des partenaires', 'Des lieux pour jouer', 'Des événements'].map(v => (
            <Pill key={v} active={lookingFor.includes(v)} onClick={() => toggle(lookingFor, setLookingFor, v)}>{v}</Pill>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>AMBIANCE PRÉFÉRÉE</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Détente', 'Conviviale', 'Sportive'].map(v => (
            <Pill key={v} active={ambiance === v} onClick={() => setAmbiance(v)}>{v}</Pill>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <PrimaryBtn onClick={() => onNext({ availability, lookingFor, ambiance })}>Suivant</PrimaryBtn>
      </div>
    </div>
  );
}

// ----- Step 3B : Progress -----
function StepProgress({ onNext, initial }) {
  const [level, setLevel] = useState(initial.level || 'Intermédiaire');
  const [style, setStyle] = useState(initial.style || 'Attaquant');
  const [racket, setRacket] = useState(initial.racket || 'Pré-montée');
  const [availability, setAvailability] = useState(initial.availability || ['Soirs sem.', 'Weekends']);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepHeader step={3} total={4} title="TON PROFIL" subtitle="Ton niveau et ton matos (si tu sais)" />

      <div>
        <FieldLabel>NIVEAU AUTO-ÉVALUÉ</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Débutant', 'Loisir', 'Intermédiaire', 'Confirmé'].map(v => (
            <Pill key={v} active={level === v} onClick={() => setLevel(v)}>{v}</Pill>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>STYLE DE JEU</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Attaquant', 'Défenseur', 'Polyvalent', 'Je sais pas'].map(v => (
            <Pill key={v} active={style === v} onClick={() => setStyle(v)}>{v}</Pill>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>TA RAQUETTE</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Pré-montée', 'Sur-mesure', 'Je sais pas'].map(v => (
            <Pill key={v} active={racket === v} onClick={() => setRacket(v)}>{v}</Pill>
          ))}
        </div>
        <div style={{ marginTop: 8, fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>
          Tu pourras ajuster ton matériel plus tard.
        </div>
      </div>

      <div>
        <FieldLabel>DISPONIBILITÉS</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Matins', 'Soirs sem.', 'Weekends'].map(v => (
            <Pill key={v} active={availability.includes(v)} onClick={() => toggle(availability, setAvailability, v)}>{v}</Pill>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <PrimaryBtn onClick={() => onNext({ level, style, racket, availability })}>Suivant</PrimaryBtn>
      </div>
    </div>
  );
}

// ----- Step 3C : Club / Compétition -----
function StepClub({ onFinish, initial }) {
  const [licenseNumber, setLicenseNumber] = useState(initial.licenseNumber || '');
  const [club, setClub] = useState(initial.club || '');
  const [team, setTeam] = useState(initial.team || '');
  const [style, setStyle] = useState(initial.style || 'Attaquant');
  const [wood, setWood] = useState(initial.wood || '');
  const [forehandRubber, setFR] = useState(initial.forehandRubber || '');
  const [backhandRubber, setBR] = useState(initial.backhandRubber || '');
  const [availability, setAvailability] = useState(initial.availability || ['Soirs sem.', 'Weekends']);
  const [submitting, setSubmitting] = useState(false);
  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  // FFTT considérée "valide" = licence renseignée (pas de vrai check côté API)
  const hasLicense = licenseNumber.trim().length >= 6;
  // ELO dérivé : 1450 si licence (placeholder pour points FFTT). Sera remplacé
  // par la vraie API FFTT plus tard. Sans licence on ne fournit pas d'ELO et
  // l'écran de calibration prendra le relais (step 4 ajouté côté parent).
  const derivedElo = hasLicense ? 1450 : null;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onFinish({
        licenseNumber: licenseNumber.trim() || undefined,
        club: club.trim() || undefined,
        team: team.trim() || undefined,
        style, wood: wood.trim() || undefined,
        forehandRubber: forehandRubber.trim() || undefined,
        backhandRubber: backhandRubber.trim() || undefined,
        availability,
        level: 'Compétition',
        initialElo: derivedElo, // null si pas de licence → parent fera step 4
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepHeader
        step={3} total={3}
        kickerLabel={hasLicense ? 'ÉTAPE 3 / 3 · DERNIÈRE' : 'ÉTAPE 3 / 4'}
        title="CLUB & NIVEAU"
        subtitle="On récupère ton vrai classement"
      />

      <div style={{
        padding: '14px 16px', borderRadius: 14,
        background: 'rgba(232,201,155,0.06)', border: '1px solid rgba(232,201,155,0.35)',
      }}>
        <div style={{ ...kicker, color: C.warm }}>N° DE LICENCE FFTT</div>
        <input
          value={licenseNumber}
          onChange={e => setLicenseNumber(e.target.value)}
          placeholder="Ex. 7521430"
          style={{
            all: 'unset', boxSizing: 'border-box', width: '100%',
            marginTop: 8, padding: '10px 0',
            fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, color: C.ink, letterSpacing: '0.06em',
          }}
        />
        {hasLicense ? (
          <div style={{
            marginTop: 6, fontFamily: fontSans, fontSize: 12, color: '#3DD16B', fontWeight: 600,
          }}>● Ton ELO de départ = <strong>{derivedElo} pts FFTT</strong>. Pas besoin de calibration.</div>
        ) : (
          <div style={{
            marginTop: 6, fontFamily: fontSans, fontSize: 12, color: C.inkDim,
          }}>Sans licence, on te fera passer la calibration ELO juste après.</div>
        )}
      </div>

      <div>
        <FieldLabel>TON CLUB</FieldLabel>
        <TextField value={club} onChange={setClub} placeholder="Le Marais Ping" />
      </div>

      <div>
        <FieldLabel>ÉQUIPE <span style={{ color: C.inkFaint, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span></FieldLabel>
        <TextField value={team} onChange={setTeam} placeholder="Équipe 2 — D3 départementale" />
      </div>

      <div>
        <FieldLabel>STYLE DE JEU</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Attaquant', 'Défenseur', 'Polyvalent'].map(v => (
            <Pill key={v} active={style === v} onClick={() => setStyle(v)}>{v}</Pill>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>BOIS</FieldLabel>
        <TextField value={wood} onChange={setWood} placeholder="Viscaria FL" />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <FieldLabel>COUP DROIT</FieldLabel>
          <TextField value={forehandRubber} onChange={setFR} placeholder="Hurricane 3" />
        </div>
        <div style={{ flex: 1 }}>
          <FieldLabel>REVERS</FieldLabel>
          <TextField value={backhandRubber} onChange={setBR} placeholder="Tenergy 05" />
        </div>
      </div>

      <div>
        <FieldLabel>DISPONIBILITÉS</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Soirs sem.', 'Weekends'].map(v => (
            <Pill key={v} active={availability.includes(v)} onClick={() => toggle(availability, setAvailability, v)}>{v}</Pill>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <PrimaryBtn onClick={handleSubmit} disabled={submitting}>
          {submitting ? '...' : (hasLicense ? "LET'S PLAY" : 'Suivant')}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// Map valeurs UI vers les enums Supabase
const HAND_MAP = { 'Droitier': 'droitier', 'Gaucher': 'gaucher' };
const TYPE_MAP = { 'fun': 'fun', 'progress': 'progress', 'club': 'competition' };
const LEVEL_MAP = { 'Débutant': 'debutant', 'Loisir': 'loisir', 'Intermédiaire': 'intermediaire', 'Confirmé': 'confirme', 'Compétition': 'confirme' };
const STYLE_MAP = { 'Attaquant': 'attaquant', 'Défenseur': 'defenseur', 'Polyvalent': 'polyvalent', 'Je sais pas': 'inconnu' };
const RACKET_MAP = { 'Pré-montée': 'pre_montee', 'Sur-mesure': 'sur_mesure', 'Je sais pas': 'inconnu' };

// Reverse maps (DB enum -> UI label) pour pré-remplir les forms quand un profil existe
const HAND_REVERSE = { droitier: 'Droitier', gaucher: 'Gaucher' };
const TYPE_REVERSE = { fun: 'fun', progress: 'progress', competition: 'club' };
const LEVEL_REVERSE = { debutant: 'Débutant', loisir: 'Loisir', intermediaire: 'Intermédiaire', confirme: 'Confirmé' };
const STYLE_REVERSE = { attaquant: 'Attaquant', defenseur: 'Défenseur', polyvalent: 'Polyvalent', inconnu: 'Je sais pas' };
const RACKET_REVERSE = { pre_montee: 'Pré-montée', sur_mesure: 'Sur-mesure', inconnu: 'Je sais pas' };

function profileToFormData(profile) {
  if (!profile) return {};
  const out = {
    email: profile.email,
    fullName: profile.display_name,
    region: profile.region,
    handedness: HAND_REVERSE[profile.dominant_hand],
    playerType: TYPE_REVERSE[profile.player_type],
    level: LEVEL_REVERSE[profile.self_level],
    style: STYLE_REVERSE[profile.play_style],
    racket: RACKET_REVERSE[profile.racket_type],
    licenseNumber: profile.fftt_license,
    club: profile.club_name,
    team: profile.team_name,
    wood: profile.wood_blade,
    forehandRubber: profile.forehand_rubber,
    backhandRubber: profile.backhand_rubber,
    initialElo: profile.current_elo,
  };
  // Supprime les undefined / null pour ne pas écraser les valeurs UI vides
  Object.keys(out).forEach(k => { if (out[k] == null) delete out[k]; });
  return out;
}

// Map les valeurs de la calibration vers l'enum self_level Supabase
const CALIB_LEVEL_TO_SELF = {
  leisure:      'loisir',
  tournament:   'loisir',
  departmental: 'intermediaire',
  regional:     'confirme',
  national:     'confirme',
};

async function saveProfileToSupabase(data) {
  const patch = {};
  if (data.fullName) patch.display_name = data.fullName;
  if (data.region) patch.region = data.region;
  if (HAND_MAP[data.handedness]) patch.dominant_hand = HAND_MAP[data.handedness];
  if (TYPE_MAP[data.playerType]) patch.player_type = TYPE_MAP[data.playerType];
  if (LEVEL_MAP[data.level]) patch.self_level = LEVEL_MAP[data.level];
  if (STYLE_MAP[data.style]) patch.play_style = STYLE_MAP[data.style];
  if (RACKET_MAP[data.racket]) patch.racket_type = RACKET_MAP[data.racket];
  if (data.licenseNumber) patch.fftt_license = data.licenseNumber;
  if (data.club) patch.club_name = data.club;
  if (data.team) patch.team_name = data.team;
  if (data.wood) patch.wood_blade = data.wood;
  if (data.forehandRubber) patch.forehand_rubber = data.forehandRubber;
  if (data.backhandRubber) patch.backhand_rubber = data.backhandRubber;

  // Calibration ELO -> colonnes ELO + self_level dérivé du niveau choisi
  if (typeof data.initialElo === 'number') {
    patch.current_elo = data.initialElo;
    patch.initial_elo = data.initialElo;
    patch.peak_elo    = data.initialElo;
    patch.elo_rating  = data.initialElo; // compat ancien code (chat, etc.)
  }
  if (data.level && CALIB_LEVEL_TO_SELF[data.level] && !patch.self_level) {
    patch.self_level = CALIB_LEVEL_TO_SELF[data.level];
  }

  await updateProfile(patch);
}

// ----- Composant principal -----
export default function OnboardingScreen({ onComplete }) {
  const { save } = useOnboarding();
  const { isAuthed, profile, userId } = useAuth();
  // Toujours partir de l'écran connexion au lancement.
  // Si l'utilisateur est déjà authentifié, un raccourci "Continuer en tant que X"
  // lui permet de passer directement à l'étape 1 sans retaper son mot de passe.
  const [step, setStep] = useState(0);
  const [data, setData] = useState(() => profileToFormData(profile));

  // Pré-remplit les forms quand le profil arrive / change
  // (compte existant : on récupère display_name, region, niveau, club, licence...)
  useEffect(() => {
    const fromProfile = profileToFormData(profile);
    setData(d => ({ ...fromProfile, ...d })); // privilégie la valeur saisie en cours
  }, [profile]);

  const advance = (patch) => {
    setData(d => ({ ...d, ...patch }));
    setStep(s => s + 1);
  };

  // Signup : compte tout frais → toujours questionnaire complet
  const onSignedUp = ({ email }) => {
    setData(d => ({ ...d, email }));
    setStep(1);
  };

  // Signin : si le profil existant est déjà complet (region + player_type)
  // on bypass le questionnaire et on entre direct dans l'app.
  // Sinon on poursuit le questionnaire pour compléter ce qui manque.
  const onSignedIn = async ({ email }) => {
    const fresh = await refreshProfile();
    if (fresh?.region && fresh?.player_type) {
      if (onComplete) onComplete(fresh);
    } else {
      setData(d => ({ ...d, ...profileToFormData(fresh), email }));
      setStep(1);
    }
  };

  // Permet à l'user de revenir à l'écran de connexion depuis le questionnaire
  // (utile s'il veut changer de compte)
  const handleSignOut = async () => {
    await signOut();
    setData({});
    setStep(0);
  };

  const handlePlayerType = (patch) => {
    setData(d => ({ ...d, ...patch }));
    setStep(3); // chacun arrive sur son step 3 dédié
  };

  // Fin du questionnaire : commit Supabase + persistance locale.
  const finalize = async (extra) => {
    const final = {
      ...data, ...extra,
      completed: true, completedAt: Date.now(),
    };
    await saveProfileToSupabase(final);
    await save(final);
    if (onComplete) onComplete(final);
  };

  // Step 3 → calibration OU finish (pour club avec licence)
  const handleFunNext      = (patch) => { setData(d => ({ ...d, ...patch })); setStep(4); };
  const handleProgressNext = (patch) => { setData(d => ({ ...d, ...patch })); setStep(4); };
  const handleClubFinish   = async (patch) => {
    // Si licence FFTT renseignée : initialElo dérivé → on termine
    // Sinon : on bascule sur l'écran de calibration
    if (patch.initialElo != null) {
      await finalize(patch);
    } else {
      setData(d => ({ ...d, ...patch }));
      setStep(4);
    }
  };
  const handleCalibrationComplete = async (initialElo, calibAnswers) => {
    await finalize({ ...calibAnswers, initialElo });
  };

  let content;
  // Bouton CONTINUER sur l'écran de connexion :
  // - Si l'onboarding est déjà terminé → on bypass tout et on entre dans l'app
  // - Sinon → on continue à l'étape 1 du questionnaire
  const onContinueAsCurrent = () => {
    if (profile?.region && profile?.player_type) {
      if (onComplete) onComplete(profile);
    } else {
      setStep(1);
    }
  };
  if (step === 0)      content = <StepConnexion
    onSignedUp={onSignedUp}
    onSignedIn={onSignedIn}
    currentSession={isAuthed ? (profile?.email || data.email) : null}
    onContinueAsCurrent={onContinueAsCurrent}
    onSignOutCurrent={handleSignOut}
  />;
  else if (step === 1) content = <StepIdentity
    onNext={advance}
    onBack={() => setStep(0)}
    initial={data}
    currentEmail={profile?.email || data.email}
    onSignOut={handleSignOut}
  />;
  else if (step === 2) content = <StepPlayerType onNext={handlePlayerType} initial={data} />;
  else if (step === 3) {
    if (data.playerType === 'fun')      content = <StepFun onNext={handleFunNext} initial={data} />;
    else if (data.playerType === 'progress') content = <StepProgress onNext={handleProgressNext} initial={data} />;
    else                                       content = <StepClub onFinish={handleClubFinish} initial={data} />;
  }
  else if (step === 4) {
    content = (
      <OnboardingCalibration
        userId={userId}
        initialAnswers={data}
        onComplete={handleCalibrationComplete}
      />
    );
  }

  return (
    <div style={{
      minHeight: '100%',
      padding: '32px 22px 60px',
      display: 'flex', flexDirection: 'column',
      background: C.bgGrad, color: C.ink,
      fontFamily: fontSans,
    }}>
      {content}
    </div>
  );
}
