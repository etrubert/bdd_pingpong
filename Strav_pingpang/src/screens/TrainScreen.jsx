// =====================================================================
// PING PANG PARIS — Écran TRAIN
// 3 onglets de niveau (DÉBUTANT / INTERMÉDIAIRE / EXPERT).
// Chaque onglet affiche 5 vignettes vidéo directement, sans regroupement
// par séance. Clic sur une vignette → lightbox plein écran 16:9 horizontal.
// =====================================================================

import { useEffect, useMemo, useState } from 'react';
import { C, fontDisplay, fontSans, kicker } from '../theme';
import Card from '../components/Card';
import { VIDEOS } from '../lib/sessions';

const LEVELS = ['DÉBUTANT', 'INTERMÉDIAIRE', 'EXPERT'];

// Extrait l'ID YouTube d'une URL embed / watch / youtu.be. Sinon null.
function youtubeIdFrom(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------
// VIGNETTE VIDÉO : miniature YouTube + overlay play. Tente d'abord la
// miniature HD personnalisée (maxresdefault), bascule sur la première
// image de la vidéo (1.jpg) puis sur hqdefault si nécessaire.
// ---------------------------------------------------------------------
function VideoThumb({ video, height = 180, rounded = 14 }) {
  const ytId = youtubeIdFrom(video);
  const [src, setSrc] = useState(() => ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : null);

  const onError = () => {
    if (!ytId || !src) return;
    if (src.includes('maxresdefault')) setSrc(`https://i.ytimg.com/vi/${ytId}/1.jpg`);
    else if (src.includes('/1.jpg')) setSrc(`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`);
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height,
      borderRadius: rounded, overflow: 'hidden',
      background: '#0E3A30',
    }}>
      {src && (
        <img src={src} alt="" loading="lazy" onError={onError}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(9,44,37,0) 40%, rgba(9,44,37,0.55) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
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

// ---------------------------------------------------------------------
// LIGHTBOX VIDÉO PLEIN ÉCRAN — format 16:9 horizontal
// Couvre toute la fenêtre, fond noir, autoplay activé.
// Ferme : clic dehors / bouton X / touche Échap.
// ---------------------------------------------------------------------
function VideoLightbox({ video, onClose }) {
  useEffect(() => {
    if (!video) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [video, onClose]);

  if (!video) return null;
  const src = video.includes('?') ? `${video}&autoplay=1` : `${video}?autoplay=1`;

  return (
    <div
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label="Lecteur vidéo"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Fermer la vidéo"
        style={{
          position: 'absolute', top: 14, right: 14,
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(245,246,243,0.12)', border: `1px solid ${C.borderHi}`,
          color: C.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(95vw, calc((90vh) * 16 / 9))',
          aspectRatio: '16 / 9',
          background: '#000',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 10px 60px rgba(0,0,0,0.6)',
        }}
      >
        <iframe
          src={src} title="Vidéo" allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// CARTE D'UNE VIDÉO : vignette + titre + description courte + durée.
// Toute la carte est cliquable → ouvre la lightbox.
// ---------------------------------------------------------------------
function VideoCard({ item, onPlay }) {
  return (
    <button
      onClick={() => onPlay(item.video)}
      style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
      aria-label={`Lancer la vidéo : ${item.title}`}
    >
      <div style={{
        borderRadius: 16, overflow: 'hidden',
        background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
      }}>
        <VideoThumb video={item.video} height={180} rounded={0} />
        <div style={{ padding: '12px 14px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{
              fontFamily: fontSans, fontWeight: 800, fontSize: 15.5,
              color: C.ink, lineHeight: 1.25,
            }}>{item.title}</span>
            <span style={{
              flexShrink: 0,
              fontFamily: fontSans, fontSize: 11, fontWeight: 700,
              color: C.warm, letterSpacing: '0.04em',
            }}>{item.duration}</span>
          </div>
          <div style={{
            marginTop: 5,
            fontFamily: fontSans, fontSize: 12.5, color: C.inkDim,
            lineHeight: 1.45,
          }}>{item.desc}</div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------
// LIBRARY : onglets + grille de vignettes du niveau actif.
// ---------------------------------------------------------------------
function VideosLibrary() {
  const [tab, setTab] = useState('DÉBUTANT');
  const [openVideo, setOpenVideo] = useState(null);

  const filtered = useMemo(() => VIDEOS.filter(v => v.level === tab), [tab]);

  return (
    <>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={kicker}>VIDÉOS D'ENTRAÎNEMENT</div>
          <div style={{
            fontFamily: fontSans, fontSize: 12.5, color: C.inkDim,
            marginTop: 6, lineHeight: 1.45,
          }}>
            Apprends les gestes à ton niveau. Tape une vignette pour lancer la vidéo en grand.
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          marginTop: 16, borderBottom: `1px solid ${C.border}`,
        }}>
          {LEVELS.map(t => {
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

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '24px 0', textAlign: 'center',
              fontFamily: fontSans, fontSize: 13, color: C.inkDim,
            }}>Aucune vidéo pour ce niveau.</div>
          ) : filtered.map(item => (
            <VideoCard key={item.id} item={item} onPlay={setOpenVideo} />
          ))}
        </div>
      </Card>

      <VideoLightbox video={openVideo} onClose={() => setOpenVideo(null)} />
    </>
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
        }}>VIDÉOS</div>
        <div style={{
          fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 8, lineHeight: 1.5,
        }}>5 démos par niveau pour progresser.</div>
      </div>

      <VideosLibrary />
    </div>
  );
}
