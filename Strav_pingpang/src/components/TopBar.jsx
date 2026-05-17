import { useEffect, useRef, useState } from 'react';
import { C, fontDisplay, fontSans, kicker, iconBtn } from '../theme';
import { Icon } from '../icons';
import { useUI } from './uiContext';

function ProfileSheet() {
  const fields = [
    ['Member since', 'March 2023'],
    ['Club', 'Le Marais Ping'],
    ['Style', 'Attacker'],
    ['Rubbers', 'Hurricane 3 / Tenergy 05'],
    ['Blade', 'Viscaria FL'],
    ['Region', 'Paris \u2014 11e'],
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 99, flexShrink: 0,
          background: 'radial-gradient(60% 60% at 35% 30%, #d6b890 0%, #6b4a2e 60%, #1c100a 100%)',
          border: `1.5px solid ${C.borderHi}`,
        }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>1450 ELO · #24 PARIS</div>
          <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim }}>Streak: 5 days</div>
        </div>
      </div>
      {fields.map(([k,v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ ...kicker }}>{k.toUpperCase()}</span>
          <span style={{ fontFamily: fontSans, fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export { ProfileSheet };

export default function TopBar({ topInset = 0 }) {
  const { openSheet } = useUI();
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scroller = el.parentElement;
    if (!scroller) return;
    let lastY = scroller.scrollTop;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        const dy = y - lastY;
        if (Math.abs(dy) > 4) {
          if (dy > 0 && y > 64) setHidden(true);
          else if (dy < 0) setHidden(false);
          lastY = y;
        }
        ticking = false;
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} style={{
      paddingTop: `max(${topInset}px, env(safe-area-inset-top, 0px))`,
      height: `calc(64px + max(${topInset}px, env(safe-area-inset-top, 0px)))`,
      boxSizing: 'border-box',
      paddingLeft: 22, paddingRight: 22,
      display: 'flex', alignItems: 'center',
      background: 'rgba(8,22,17,0.92)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      position: 'sticky', top: 0, zIndex: 5,
      color: C.ink,
      transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
      transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      willChange: 'transform',
    }}>
      <div style={{
        flex: 1,
        display: 'grid', alignItems: 'center',
        gridTemplateColumns: '44px 1fr 44px',
        height: 64,
      }}>
      <div />
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '0.05em',
        fontSize: 18, color: C.ink, whiteSpace: 'nowrap', textAlign: 'center',
      }}>PING PANG PARIS</div>
      <button onClick={() => openSheet({
        title: 'EUGENIA SOREL',
        body: <ProfileSheet />,
      })} style={iconBtn}>{Icon.user(26)}</button>
      </div>
    </div>
  );
}
