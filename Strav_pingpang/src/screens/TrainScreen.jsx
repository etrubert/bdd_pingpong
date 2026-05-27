import { useState } from 'react';
import { C, fontDisplay, fontSans, kicker } from '../theme';
import { Icon } from '../icons';
import { useUI } from '../components/uiContext';
import Card from '../components/Card';
import Chip from '../components/Chip';
import { ArenaSVG, TrajectorySVG } from '../components/SVGIllustrations';
import { SESSIONS, SESSION_PHASES } from '../lib/sessions';

const DRILLS = {
  attacker: { title: '15 MIN POWER TOP-SPIN DRILL', intensity: 'HIGH', total: '15:00 TOTAL', steps: [
    { t: 'WARM-UP: SHADOW STROKES', d: '3 minutes of full-range motion without ball contact to align shoulder rotation.' },
    { t: 'RHYTHMIC REPETITION', d: '8 minutes: Forehand top-spin against backspin feed. Focus on contact point.' },
    { t: 'DYNAMIC TRANSITION', d: '4 minutes: Alternating backhand block and forehand power loop from mid-distance.' },
  ]},
  defender: { title: '18 MIN BLOCK & COUNTER DRILL', intensity: 'MEDIUM', total: '18:00 TOTAL', steps: [
    { t: 'CLOSE-TABLE STANCE', d: '4 minutes of low-bounce returns from feeder. Stay compact and reactive.' },
    { t: 'CHOP REPETITION',    d: '8 minutes: Long backhand chop with consistent depth and underspin.' },
    { t: 'COUNTER-LOOP STEP',  d: '6 minutes: Switch from defense to mid-distance counter-loop on cue.' },
  ]},
  blocker:  { title: '12 MIN PUNCH-BLOCK DRILL', intensity: 'MEDIUM', total: '12:00 TOTAL', steps: [
    { t: 'PADDLE SET-UP',   d: '3 minutes of half-volley positioning at the table edge.' },
    { t: 'BLOCK PLACEMENT', d: '6 minutes: Alternate cross-court and down-the-line blocks against top-spin feed.' },
    { t: 'PUNCH FINISH',    d: '3 minutes: Punch-block close to the net to end rallies fast.' },
  ]},
};

function MetricsSheet() {
  const m = [
    ['Avg. impact angle', '38.4\u00B0'],
    ['RPM gain', '+14%'],
    ['Top spin consistency', '82%'],
    ['Reaction time', '0.31s'],
    ['Mid-distance accuracy', '76%'],
    ['Stamina index', 'A\u2212'],
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
        {m.map(([k,v]) => (
          <div key={k} style={{
            padding: 14, borderRadius: 14,
            background: 'rgba(8,22,17,0.45)',
            border: `1px solid ${C.border}`,
          }}>
            <div style={{ ...kicker, fontSize: 10 }}>{k.toUpperCase()}</div>
            <div style={{ marginTop: 6, fontFamily: fontDisplay, fontWeight: 800, fontSize: 24, color: C.ink, letterSpacing: '0.02em' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const { showToast, openSheet } = useUI();
  const [style, setStyle] = useState('attacker');
  const [focus, setFocus] = useState('');
  const [generated, setGenerated] = useState('attacker');
  const [done, setDone] = useState({});
  const drill = DRILLS[generated];

  const toggleStep = (i) => setDone(d => ({ ...d, [`${generated}-${i}`]: !d[`${generated}-${i}`] }));
  const isDone = (i) => !!done[`${generated}-${i}`];

  return (
    <div style={{ padding: '4px 18px 130px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Hero */}
      <div style={{
        position: 'relative', borderRadius: 22, overflow: 'hidden',
        border: `1px solid ${C.border}`, background: C.card,
        padding: '22px 22px 22px',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '7px 16px', borderRadius: 999,
          border: `1px solid ${C.borderHi}`,
          background: 'rgba(184,220,197,0.05)',
          color: C.mint,
          fontFamily: fontSans, fontWeight: 700, fontSize: 11, letterSpacing: '0.18em',
        }}>TRAINING MODULE</div>

        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 64, lineHeight: 0.92,
          color: C.ink, letterSpacing: '0.005em', marginTop: 14,
        }}>IA DRILL<br/>MASTER</div>

        <div style={{
          color: C.inkDim, fontFamily: fontSans, fontSize: 14, lineHeight: 1.45,
          marginTop: 12, textWrap: 'pretty',
        }}>Precision-engineered drills tailored to your specific mechanical profile. Elevate your ELO through rhythmic repetition.</div>

        <div style={{
          marginTop: 18, height: 130, borderRadius: 14, overflow: 'hidden',
          border: `1px solid ${C.border}`, position: 'relative',
        }}>
          <ArenaSVG />
        </div>
      </div>

      {/* Player style */}
      <Card style={{ padding: 20 }}>
        <div style={kicker}>01. PLAYER STYLE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
          {['attacker','defender','blocker'].map(opt => (
            <label key={opt} onClick={() => setStyle(opt)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '10px 4px',
              cursor: 'pointer', color: C.ink,
              userSelect: 'none',
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: 99,
                border: `1.5px solid ${style === opt ? C.mint : 'rgba(242,247,242,0.45)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {style === opt && <span style={{ width: 11, height: 11, background: C.mint, borderRadius: 99 }} />}
              </span>
              <span style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, letterSpacing: '0.12em' }}>
                {opt.toUpperCase()}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Focus point */}
      <Card style={{ padding: 20 }}>
        <div style={kicker}>02. FOCUS POINT</div>
        <input
          value={focus} onChange={e => setFocus(e.target.value)}
          placeholder="e.g. Backhand Speed"
          style={{
            marginTop: 12, width: '100%', boxSizing: 'border-box',
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(8,22,17,0.55)',
            border: `1px solid ${C.border}`,
            color: C.ink, fontFamily: fontSans, fontSize: 14,
            outline: 'none',
          }}
        />
        <button onClick={() => { setGenerated(style); setDone({}); showToast(`Drill generated for ${style.toUpperCase()}${focus ? ' \u2014 focus: ' + focus : ''}`); }} style={{
          marginTop: 14, width: '100%', padding: '15px 20px', borderRadius: 12,
          background: C.mint, border: 'none', color: '#0C211A',
          fontFamily: fontSans, fontWeight: 700, fontSize: 13, letterSpacing: '0.18em',
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(184,220,197,0.18)',
        }}>GENERATE DRILL</button>
      </Card>

      {/* Output */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={kicker}>RECOMMENDED OUTPUT</div>
          <div style={{ color: C.inkDim }}>{Icon.pin(16)}</div>
        </div>
        <div style={{
          marginTop: 6, fontFamily: fontDisplay, fontWeight: 800, fontSize: 19,
          color: C.ink, letterSpacing: '0.02em',
        }}>{drill.title}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {drill.steps.map((s, i) => {
            const d = isDone(i);
            return (
            <button key={i} onClick={() => toggleStep(i)} style={{
              all: 'unset', cursor: 'pointer',
              padding: '14px 16px', borderRadius: 14,
              background: d ? 'rgba(184,220,197,0.08)' : 'rgba(8,22,17,0.45)',
              border: `1px solid ${d ? C.borderHi : C.border}`,
              display: 'flex', gap: 14, alignItems: 'flex-start',
              transition: 'all .2s ease',
            }}>
              <div style={{
                fontFamily: fontDisplay, fontWeight: 800, fontSize: 22,
                color: C.mint, lineHeight: 1, minWidth: 26, letterSpacing: '0.02em',
                opacity: d ? 0.5 : 1,
              }}>{String(i+1).padStart(2,'0')}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 13.5, color: C.ink, letterSpacing: '0.08em', textDecoration: d ? 'line-through' : 'none', opacity: d ? 0.55 : 1 }}>{s.t}</div>
                <div style={{ marginTop: 6, fontFamily: fontSans, fontSize: 12.5, color: C.inkDim, lineHeight: 1.45 }}>{s.d}</div>
              </div>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                border: `1.5px solid ${d ? C.mint : 'rgba(242,247,242,0.35)'}`,
                background: d ? C.mint : 'transparent',
                color: '#0C211A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{d && Icon.check(14)}</div>
            </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <Chip><span style={{ color: C.cream }}>{Icon.clock(13)}</span> {drill.total}</Chip>
          <Chip><span style={{ color: C.cream }}>{Icon.trend(13)}</span> INTENSITY: {drill.intensity}</Chip>
        </div>
      </Card>

      {/* Trajectory */}
      <div style={{
        position: 'relative', borderRadius: 22, overflow: 'hidden',
        border: `1px solid ${C.border}`, background: C.card,
      }}>
        <div style={{ height: 170, position: 'relative', overflow: 'hidden' }}>
          <TrajectorySVG />
        </div>
        <div style={{ padding: '4px 22px 22px' }}>
          <div style={{
            fontFamily: fontDisplay, fontWeight: 800, fontSize: 28, color: C.ink,
            letterSpacing: '0.01em',
          }}>TRAJECTORY ANALYSIS</div>
          <div style={{ color: C.inkDim, fontFamily: fontSans, fontSize: 13.5, lineHeight: 1.5, marginTop: 8, textWrap: 'pretty' }}>
            Our AI analyzes your impact angle to ensure maximum rotation. This specific drill increases your RPM by an average of 14%.
          </div>
          <button onClick={() => openSheet({ title: 'TRAJECTORY METRICS', body: <MetricsSheet /> })} style={{
            marginTop: 16, padding: '12px 20px', borderRadius: 12,
            background: 'transparent', border: `1px solid ${C.borderHi}`,
            color: C.cream, fontFamily: fontSans, fontWeight: 700, fontSize: 12,
            letterSpacing: '0.18em', cursor: 'pointer',
          }}>VIEW FULL METRICS</button>
        </div>
      </div>

      {/* Séances guidées avec emplacements photos/vidéos (changement 3) */}
      <SessionsLibrary />
    </div>
  );
}
