import { useState, useRef } from 'react';
import { C, fontDisplay, fontSans } from '../theme';
import { UICtx } from './uiContext';

export default function UIProvider({ children, isMobile }) {
  const [toast, setToast] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const tRef = useRef(0);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), 1800);
  };
  const openSheet = (s) => setSheet(s);
  const closeSheet = () => setSheet(null);

  return (
    <UICtx.Provider value={{ showToast, openSheet, closeSheet, drawer, setDrawer, isMobile }}>
      {children}
      <ToastLayer toast={toast} />
      <Sheet sheet={sheet} onClose={closeSheet} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
    </UICtx.Provider>
  );
}

function ToastLayer({ toast }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 100, zIndex: 100,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
    }}>
      <div style={{
        opacity: toast ? 1 : 0, transform: `translateY(${toast ? 0 : 8}px)`,
        transition: 'all .25s ease',
        padding: '12px 20px', borderRadius: 999,
        background: 'rgba(8,22,17,0.92)', color: '#F2F7F2',
        border: '1px solid rgba(184,220,197,0.32)',
        fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 600,
        fontSize: 13, letterSpacing: '0.06em',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        maxWidth: '85%', textAlign: 'center',
      }}>{toast}</div>
    </div>
  );
}

function Sheet({ sheet, onClose }) {
  const open = !!sheet;
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 90,
      pointerEvents: open ? 'auto' : 'none',
      background: open ? 'rgba(0,0,0,0.55)' : 'transparent',
      transition: 'background .25s ease',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxHeight: '78%', overflow: 'auto',
        background: '#143226', borderTopLeftRadius: 26, borderTopRightRadius: 26,
        borderTop: '1px solid rgba(184,220,197,0.22)',
        transform: `translateY(${open ? 0 : 100}%)`,
        transition: 'transform .3s cubic-bezier(.2,.8,.2,1)',
        padding: '14px 22px 110px',
        color: '#F2F7F2',
      }}>
        <div style={{ width: 44, height: 4, borderRadius: 99, background: 'rgba(242,247,242,0.25)', margin: '4px auto 18px' }} />
        {sheet && (
          <>
            <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 28, letterSpacing: '0.02em', marginBottom: 10 }}>{sheet.title}</div>
            {sheet.body}
            <button onClick={onClose} style={{
              marginTop: 24, width: '100%', padding: '14px 20px', borderRadius: 12,
              background: 'transparent', border: '1px solid rgba(184,220,197,0.32)',
              color: C.cream, fontFamily: fontSans,
              fontWeight: 700, fontSize: 12, letterSpacing: '0.18em', cursor: 'pointer',
            }}>CLOSE</button>
          </>
        )}
      </div>
    </div>
  );
}

function Drawer({ open, onClose }) {
  const items = ['Profile','Achievements','Equipment','Coaching','Subscriptions','Settings','Sign out'];
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 95,
      pointerEvents: open ? 'auto' : 'none',
      background: open ? 'rgba(0,0,0,0.55)' : 'transparent',
      transition: 'background .25s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 280,
        background: '#0E2820', borderRight: '1px solid rgba(184,220,197,0.18)',
        transform: `translateX(${open ? 0 : -100}%)`,
        transition: 'transform .3s cubic-bezier(.2,.8,.2,1)',
        padding: '70px 22px 30px', color: '#F2F7F2',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 24, letterSpacing: '0.04em', color: C.mint, marginBottom: 20 }}>MENU</div>
        {items.map(it => (
          <button key={it} onClick={onClose} style={{
            textAlign: 'left', padding: '14px 4px',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: '1px solid rgba(184,220,197,0.10)',
            color: '#F2F7F2', fontFamily: fontSans,
            fontWeight: 600, fontSize: 14, letterSpacing: '0.04em',
          }}>{it}</button>
        ))}
      </div>
    </div>
  );
}
