import { useMemo, useState } from 'react';
import { C, fontDisplay, fontSans, kicker } from '../theme';
import { Icon } from '../icons';
import { useUI } from '../components/uiContext';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { SESSIONS, SESSION_PHASES } from '../lib/sessions';

// =====================================================================
// SÉANCES GUIDÉES
// - Sur la carte de séance : miniature YouTube cliquable (ouvre le sheet)
// - Dans le sheet : vraie iframe YouTube qui lit la vidéo dans l'app
// =====================================================================

// Extrait l'ID YouTube d'une URL embed/watch/youtu.be. Renvoie null sinon.
function youtubeIdFrom(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

// Miniature YouTube HD : sert d'aperçu sur les cartes cliquables.
// On NE met PAS l'iframe ici pour ne pas casser le clic du <button> parent.
function VideoThumbnail({ video, image, height = 150, rounded = 14 }) {
  const ytId = youtubeIdFrom(video);
  const thumbUrl = image || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
  if (!thumbUrl) return <MediaPlaceholder height={height} rounded={rounded} />;
  return (
    <div style={{
      position: 'relative', width: '100%', height, borderRadius: rounded,
      overflow: 'hidden', background: '#10251d',
    }}>
      <img src={thumbUrl} alt="" loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(9,44,37,0) 40%, rgba(9,44,37,0.55) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          background: 'rgba(9,44,37,0.78)',
          border: `2px solid ${C.ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.ink,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function MediaPlaceholder({ height, rounded }) {
  return (
    <div style={{
      width: '100%', height, borderRadius: rounded,
      background: 'repeating-linear-gradient(45deg, rgba(245,246,243,0.05) 0px, rgba(245,246,243,0.05) 10px, rgba(8,22,17,0.4) 10px, rgba(8,22,17,0.4) 20px)',
      border: `1px dashed ${C.borderHi}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
      color: C.inkFaint,
    }}>
      <span style={{ color: C.mint, opacity: 0.7 }}>{Icon.bolt(22)}</span>
      <span style={{ fontFamily: fontSans, fontSize: 11, fontWeight: 700, letterSpacing: '0.10em' }}>PHOTO / VIDÉO À VENIR</span>
    </div>
  );
}

// SessionMedia "vraie lecture" : utilisé DANS le sheet pour les étapes.
// L'iframe YouTube se charge et est lisible en cliquant play, dans l'app.
function SessionMedia({ image, video, height = 150, rounded = 14 }) {
  if (video) {
    const isEmbed = /youtube|youtu\.be|vimeo/.test(video);
    return (
      <div style={{ width: '100%', height, borderRadius: rounded, overflow: 'hidden', background: '#10251d' }}>
        {isEmbed ? (
          <iframe
            src={video} title="Vidéo séance" allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
  return <MediaPlaceholder height={height} rounded={rounded} />;
}

function SessionDetail({ session }) {
  const firstVideo = session.steps.find(s => s.video)?.video || null;
  return (
    <div style={{ fontFamily: fontSans, color: C.ink }}>
      <SessionMedia image={session.cover} video={firstVideo} height={200} rounded={16} />
      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        <Chip>{session.level}</Chip>
        <Chip><span style={{ color: C.cream }}>{Icon.clock(13)}</span> {session.duration}</Chip>
      </div>
      <div style={{ marginTop: 12, fontFamily: fontSans, fontSize: 13.5, color: C.inkDim, lineHeight: 1.5 }}>
        {session.focus}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
        {session.steps.map((step, i) => {
          const phase = SESSION_PHASES[step.phase] || {};
          const hasVideo = !!step.video;
          return (
            <div key={i} style={{
              borderRadius: 16, overflow: 'hidden',
              background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
            }}>
              <SessionMedia image={step.image} video={step.video} height={hasVideo ? 200 : 140} rounded={0} />
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: fontSans, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.10em',
                    color: '#092C25', background: phase.color || C.mint,
                    padding: '3px 8px', borderRadius: 999,
                  }}>{phase.label}</span>
                  <span style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim }}>{step.duration}</span>
                </div>
                <div style={{ marginTop: 8, fontFamily: fontSans, fontWeight: 800, fontSize: 16, color: C.ink, lineHeight: 1.25 }}>
                  {step.title}
                </div>
                <div style={{
                  marginTop: 8,
                  paddingTop: hasVideo ? 10 : 0,
                  borderTop: hasVideo ? `1px solid ${C.border}` : 'none',
                  fontFamily: fontSans, fontSize: 13.5, color: C.ink,
                  lineHeight: 1.55, opacity: 0.92,
                }}>
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
  const TABS = ['DÉBUTANT', 'INTERMÉDIAIRE', 'EXPERT'];
  const [tab, setTab] = useState('DÉBUTANT');

  const filtered = useMemo(
    () => SESSIONS.filter(s => s.level === tab),
    [tab]
  );

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 0' }}>
        <div style={kicker}>SÉANCES GUIDÉES</div>
        <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.inkDim, marginTop: 6, lineHeight: 1.45 }}>
          Échauffement → exercices → récupération. Vidéos pédagogiques à chaque étape.
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        marginTop: 16, borderBottom: `1px solid ${C.border}`,
      }}>
        {TABS.map(t => {
          const active = tab === t;
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              all: 'unset', cursor: 'pointer', textAlign: 'center',
              fontFamily: fontSans, fontSize: 11.5, fontWeight: 700,
              letterSpacing: '0.10em',
              color: active ? C.ink : C.inkDim,
              padding: '14px 6px 12px',
              borderBottom: `2px solid ${active ? C.mint : 'transparent'}`,
              transition: 'color 120ms, border-color 120ms',
            }}>{t}</button>
          );
        })}
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '24px 0', textAlign: 'center',
            fontFamily: fontSans, fontSize: 13, color: C.inkDim,
          }}>Aucune séance pour ce niveau.</div>
        ) : filtered.map(session => {
          const counts = session.steps.reduce((acc, s) => { acc[s.phase] = (acc[s.phase] || 0) + 1; return acc; }, {});
          const videoCount = session.steps.filter(s => s.video).length;
          const firstVideo = session.steps.find(s => s.video)?.video || null;
          return (
            <button key={session.id}
              onClick={() => openSheet({ title: session.title.toUpperCase(), body: <SessionDetail session={session} /> })}
              style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
              <div style={{
                borderRadius: 16, overflow: 'hidden',
                background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
              }}>
                <VideoThumbnail image={session.cover} video={firstVideo} height={140} rounded={0} />
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: fontSans, fontWeight: 800, fontSize: 16, color: C.ink }}>{session.title}</span>
                    <span style={{ fontFamily: fontSans, fontSize: 11, color: C.warm, fontWeight: 700 }}>{session.duration}</span>
                  </div>
                  <div style={{ marginTop: 4, fontFamily: fontSans, fontSize: 12.5, color: C.inkDim }}>{session.focus}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {videoCount > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontFamily: fontSans, fontSize: 10.5, fontWeight: 700, color: C.mint,
                        background: 'rgba(155,201,174,0.10)', border: '1px solid rgba(155,201,174,0.30)',
                        padding: '3px 8px', borderRadius: 7,
                      }}>▶ {videoCount} vidéo{videoCount > 1 ? 's' : ''}</span>
                    )}
                    {Object.entries(counts).map(([ph, n]) => (
                      <span key={ph} style={{
                        fontFamily: fontSans, fontSize: 10.5, fontWeight: 700,
                        color: '#092C25', background: SESSION_PHASES[ph]?.color || C.mint,
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

      <SessionsLibrary />
    </div>
  );
}
