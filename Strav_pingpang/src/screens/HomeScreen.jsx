import { C, fontDisplay, fontSans, fontItalic, kicker, btnPrimary, btnGhost } from '../theme';
import { Icon } from '../icons';
import { useUI } from '../components/uiContext';
import { ProfileSheet } from '../components/TopBar';
import Card from '../components/Card';
import { PaddleSVG } from '../components/SVGIllustrations';

function StatRow({ label, value, valueFont = fontSans }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ ...kicker }}>{label}</div>
      <div style={{
        fontFamily: valueFont, fontWeight: valueFont === fontDisplay ? 800 : 700,
        fontSize: valueFont === fontDisplay ? 24 : 22,
        color: C.ink, letterSpacing: valueFont === fontDisplay ? '0.02em' : '0',
      }}>{value}</div>
    </div>
  );
}

function SessionSheet() {
  const { showToast, closeSheet } = useUI();
  return (
    <div style={{ fontFamily: fontSans, color: C.ink }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>LE MARAIS PING</div>
      <div style={{ color: C.inkDim, fontSize: 13, marginBottom: 16 }}>Tomorrow &bull; 18:30 &ndash; 20:30</div>
      {[
        ['Coach','Vincent M.'],
        ['Tables','2 reserved'],
        ['Partners','Marc-Andre, Sofia'],
        ['Focus','Backhand counter-loop'],
      ].map(([k,v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ ...kicker }}>{k.toUpperCase()}</span>
          <span style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={() => { closeSheet(); showToast('Session confirmed \u2713'); }} style={btnPrimary}>CONFIRM</button>
        <button onClick={() => { closeSheet(); showToast('Reschedule sent to club'); }} style={btnGhost}>RESCHEDULE</button>
      </div>
    </div>
  );
}

export default function HomeScreen({ onNav }) {
  const { showToast, openSheet } = useUI();
  return (
    <div style={{ padding: '20px 18px 130px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Active player */}
      <button onClick={() => openSheet({ title: 'EUGENIA SOREL', body: <ProfileSheet /> })}
        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
      <Card style={{ padding: '24px 24px 26px' }}>
        <div style={kicker}>ACTIVE PLAYER</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 66, lineHeight: 0.95,
          color: C.mint, letterSpacing: '0.01em', marginTop: 6, marginBottom: 22,
        }}>EUGENIA</div>

        <StatRow label="ELO RATING" value="1450 (Glicko-2)" />
        <div style={{ height: 1, background: C.border, margin: '14px 0' }} />
        <StatRow label="GLOBAL RANK" value="#24 PARIS" valueFont={fontDisplay} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          marginTop: 18,
          padding: '8px 16px', borderRadius: 999,
          background: 'rgba(239,229,200,0.12)',
          border: '1px solid rgba(239,229,200,0.32)',
          color: C.cream,
          fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.10em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: C.cream }} />
          STREAK: 5 DAYS
        </div>
      </Card>
      </button>

      {/* Quote + CTA */}
      <div style={{
        position: 'relative', borderRadius: 22, overflow: 'hidden',
        border: `1px solid ${C.border}`,
        background: C.card,
      }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <PaddleSVG />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(60% 50% at 50% 35%, rgba(184,220,197,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, rgba(20,50,38,0) 40%, rgba(20,50,38,0.85) 90%)',
          }} />
        </div>
        <div style={{ position: 'relative', padding: '26px 24px 24px' }}>
          <div style={{
            fontFamily: fontItalic, fontStyle: 'italic',
            fontSize: 21, lineHeight: 1.25, color: C.ink,
            textWrap: 'pretty',
          }}>
            &ldquo;Precision is not an accident. It is the result of high-intent training.&rdquo;
          </div>
          <div style={{ height: 130 }} />
          <button onClick={() => onNav('train')} style={{
            width: '100%', padding: '18px 20px', borderRadius: 16,
            background: C.mint, border: 'none',
            color: '#0C211A',
            fontFamily: fontSans, fontWeight: 700, fontSize: 14,
            letterSpacing: '0.18em', cursor: 'pointer',
            boxShadow: '0 0 32px rgba(184,220,197,0.35), 0 10px 30px rgba(0,0,0,0.3)',
          }}>QUICK START TRAINING</button>
        </div>
      </div>

      {/* Last match + Daily goal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <button onClick={() => onNav('matches')} style={{ all: 'unset', cursor: 'pointer' }}>
        <Card style={{ padding: 18 }}>
          <div style={kicker}>LAST MATCH</div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 18 }}>
            <span style={{ color: C.mint }}>{Icon.history(16)}</span> 3-0 WIN
          </div>
          <div style={{ marginTop: 6, color: C.inkDim, fontFamily: fontSans, fontSize: 13 }}>vs. Marc-Andre</div>
        </Card>
        </button>
        <button onClick={() => showToast('Daily goal: 75% \u2014 keep going!')} style={{ all: 'unset', cursor: 'pointer' }}>
        <Card style={{ padding: 18 }}>
          <div style={kicker}>DAILY GOAL</div>
          <div style={{ height: 6, background: 'rgba(184,220,197,0.18)', borderRadius: 99, marginTop: 18, overflow: 'hidden' }}>
            <div style={{ width: '75%', height: '100%', background: `linear-gradient(90deg, ${C.mintDeep}, ${C.mint})`, borderRadius: 99 }} />
          </div>
          <div style={{ marginTop: 10, color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 14, letterSpacing: '0.06em' }}>75% COMPLETE</div>
        </Card>
        </button>
      </div>

      {/* Next session */}
      <button onClick={() => openSheet({ title: 'NEXT CLUB SESSION', body: <SessionSheet /> })}
        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
      <Card style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={kicker}>NEXT CLUB SESSION</div>
            <div style={{ marginTop: 8, color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 16, letterSpacing: '0.04em' }}>LE MARAIS PING</div>
            <div style={{ color: C.inkDim, fontFamily: fontSans, fontSize: 13, marginTop: 2 }}>Tomorrow, 18:30</div>
          </div>
          <div style={{ color: C.inkDim }}>{Icon.calendar(26)}</div>
        </div>
      </Card>
      </button>

      {/* Training volume */}
      <button onClick={() => showToast('Training volume: 12.4h this week (+1.2h)')}
        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
      <Card style={{ padding: 18 }}>
        <div style={kicker}>TRAINING VOLUME</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{
            fontFamily: fontDisplay, fontWeight: 800, fontSize: 46,
            color: C.ink, letterSpacing: '0.01em', lineHeight: 1,
          }}>12.4H</div>
          <div style={{ color: C.cream, fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.14em' }}>THIS WEEK</div>
        </div>
      </Card>
      </button>
    </div>
  );
}
