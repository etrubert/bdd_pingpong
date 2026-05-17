import { useState, useRef } from 'react';
import { C, fontDisplay, fontSans } from '../theme';
import { UICtx } from './uiContext';

export default function UIProvider({ children, isMobile }) {
  const [toast, setToast] = useState(null);
  const [sheet, setSheet] = useState(null);
  const tRef = useRef(0);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), 1800);
  };
  const openSheet = (s) => setSheet(s);
  const closeSheet = () => setSheet(null);

  return (
    <UICtx.Provider value={{ showToast, openSheet, closeSheet, isMobile }}>
      {children}
      <ToastLayer toast={toast} />
      <Sheet sheet={sheet} onClose={closeSheet} />
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
    <div style={{
      position: 'absolute', inset: 0, zIndex: 90,
      pointerEvents: open ? 'auto' : 'none',
      background: '#143226',
      opacity: open ? 1 : 0,
      transform: `translateY(${open ? 0 : 100}%)`,
      transition: 'transform .32s cubic-bezier(.2,.8,.2,1), opacity .25s ease',
      display: 'flex', flexDirection: 'column',
      color: '#F2F7F2',
      overflow: 'auto',
      paddingTop: 'env(safe-area-inset-top, 0px)',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
    }}>
      {sheet && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 22px 8px',
          }}>
            <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 28, letterSpacing: '0.02em' }}>
              {sheet.title}
            </div>
            <button onClick={onClose} aria-label="Close" style={{
              all: 'unset', cursor: 'pointer',
              width: 36, height: 36, borderRadius: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(242,247,242,0.08)',
              color: C.ink, fontSize: 22, lineHeight: 1,
            }}>×</button>
          </div>
          <div style={{ padding: '12px 22px 0', flex: 1 }}>
            {sheet.body}
          </div>
        </>
      )}
    </div>
  );
}
