import { C, fontDisplay, fontSans, kicker } from '../theme';
import { Icon } from '../icons';
import { useUI } from '../components/uiContext';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { SESSIONS, SESSION_PHASES } from '../lib/sessions';

// =====================================================================
// SÉANCES GUIDÉES (changement 3)
// Vignette média : affiche une vidéo, une image, ou un placeholder
// "média à venir" tant qu'aucun fichier n'est renseigné dans sessions.js.
// =====================================================================
function SessionMedia({ image, video, height = 150, rounded = 14 }) {
  if (video) {
    const isEmbed = /youtube|youtu\.be|vimeo/.test(video);
    return (
      <div style={{ width: '100%', height, borderRadius: rounded, overflow: 'hidden', background: '#10251d' }}>
        {isEmbed ? (
          <iframe
            src={video} title="Vidéo séance" allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <video src={video} controls playsInline preload="metadata"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>
    );
  }
  if (image) {
    return (
      <div style={{ width: '100%', height, borderRadius: rounded, overflow: 'hidden', background: '#10251d' }}>
        <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  // Placeholder élégant : emplacement média à remplir plus tard.
  return (
    <div style={{
      width: '100%', height, borderRadius: rounded,
      background: 'repeating-linear-gradient(45deg, rgba(184,220,197,0.05) 0px, rgba(184,220,197,0.05) 10px, rgba(8,22,17,0.4) 10px, rgba(8,22,17,0.4) 20px)',
      border: `1px dashed ${C.borderHi}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      color: C.inkFaint,
    }}>
      <span style={{ color: C.mint, opacity: 0.7 }}>{Icon.bolt(22)}</span>
      <span style={{ fontFamily: fontSans, fontSize: 11, fontWeight: 700, letterSpacing: '0.10em' }}>PHOTO / VIDÉO À VENIR</span>
    </div>
  );
}

function SessionDetail({ session }) {
  return (
    <div style={{ fontFamily: fontSans, color: C.ink }}>
      <SessionMedia image={session.cover} video={null} height={160} rounded={16} />
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <Chip>{session.level}</Chip>
        <Chip><span style={{ color: C.cream }}>{Icon.clock(13)}</span> {session.duration}</Chip>
      </div>
      <div style={{ marginTop: 12, fontFamily: fontSans, fontSize: 13.5, color: C.inkDim, lineHeight: 1.5 }}>
        {session.focus}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
        {session.steps.map((step, i) => {
          const phase = SESSION_PHASES[step.phase] || {};
          return (
            <div key={i} style={{
              borderRadius: 16, overflow: 'hidden',
              background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
            }}>
              <SessionMedia image={step.image} video={step.video} height={140} rounded={0} />
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: fontSans, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.10em',
                    color: '#0C211A', background: phase.color || C.mint,
                    padding: '3px 8px', borderRadius: 999,
                  }}>{phase.label}</span>
                  <span style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim }}>{step.duration}</span>
                </div>
                <div style={{ marginTop: 8, fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>
                  {step.title}
                </div>
                <div style={{ marginTop: 4, fontFamily: fontSans, fontSize: 13, color: C.inkDim, lineHeight: 1.45 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionsLibrary() {
  const { openSheet } = useUI();
  return (
    <Card style={{ padding: 20 }}>
      <div style={kicker}>SÉANCES GUIDÉES</div>
      <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.inkDim, marginTop: 6, lineHeight: 1.45 }}>
        Échauffement → exercices → récupération. Chaque étape avec sa démo vidéo.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {SESSIONS.map(session => {
          const counts = session.steps.reduce((acc, s) => { acc[s.phase] = (acc[s.phase] || 0) + 1; return acc; }, {});
          return (
            <button key={session.id}
              onClick={() => openSheet({ title: session.title.toUpperCase(), body: <SessionDetail session={session} /> })}
              style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
              <div style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
              }}>
                <SessionMedia image={session.cover} video={null} height={120} rounded={0} />
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: fontSans, fontWeight: 800, fontSize: 16, color: C.ink }}>{session.title}</span>
                    <span style={{ fontFamily: fontSans, fontSize: 11, color: C.warm, fontWeight: 700 }}>{session.duration}</span>
                  </div>
                  <div style={{ marginTop: 4, fontFamily: fontSans, fontSize: 12.5, color: C.inkDim }}>{session.focus}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: fontSans, fontSize: 10.5, fontWeight: 700, color: C.ink, background: 'rgba(8,22,17,0.5)', border: `1px solid ${C.border}`, padding: '3px 8px', borderRadius: 7 }}>{session.level}</span>
                    {Object.entries(counts).map(([ph, n]) => (
                      <span key={ph} style={{
                        fontFamily: fontSans, fontSize: 10.5, fontWeight: 700,
                        color: '#0C211A', background: SESSION_PHASES[ph]?.color || C.mint,
                        padding: '3px 8px', borderRadius: 7,
                      }}>{n} {SESSION_PHASES[ph]?.label.toLowerCase()}</span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export default function TrainScreen() {
  return (
    <div style={{ padding: '4px 18px 130px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* En-tete de l'ecran Train */}
      <div>
        <div style={kicker}>TRAIN</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 50, lineHeight: 0.95,
          color: C.ink, letterSpacing: '0.02em', marginTop: 6,
        }}>SÉANCES</div>
        <div style={{
          fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 8, lineHeight: 1.5,
        }}>Programmes guidés : échauffement, exercices et récupération.</div>
      </div>

      {/* Séances guidées avec emplacements photos/vidéos */}
      <SessionsLibrary />
    </div>
  );
}
