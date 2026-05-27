import { useState, useRef, useEffect } from 'react';
import { C, fontDisplay, fontSans } from '../theme';
import { UICtx } from './uiContext';

export default function UIProvider({ children, isMobile }) {
  const [toast, setToast] = useState(null);
  // Pile de sheets : on empile à chaque openSheet, on dépile au close.
  // Permet de revenir à la sheet précédente (ex : fermer le chat → profil)
  // plutôt que de tout fermer d'un coup.
  const [sheetStack, setSheetStack] = useState([]);
  const sheet = sheetStack[sheetStack.length - 1] || null;
  const tRef = useRef(0);

  const showToast = (msg) => {
    const config = (msg && typeof msg === 'object') ? msg : { text: msg };
    setToast(config);
    clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(null), config.duration || 1800);
  };
  const hideToast = () => { clearTimeout(tRef.current); setToast(null); };
  const openSheet     = (s) => setSheetStack(stack => [...stack, s]);
  const closeSheet    = () => setSheetStack(stack => stack.slice(0, -1));
  const closeAllSheets = () => setSheetStack([]);

  // Si la sheet courante a `closeAll: true`, le X ferme TOUTE la pile.
  // Sinon il dépile seulement (back navigation).
  const handleClose = sheet?.closeAll ? closeAllSheets : closeSheet;

  return (
    <UICtx.Provider value={{ showToast, hideToast, openSheet, closeSheet, closeAllSheets, isMobile }}>
      {children}
      <ToastLayer toast={toast} onDismiss={hideToast} />
      <Sheet sheet={sheet} onClose={handleClose} />
    </UICtx.Provider>
  );
}

function ToastLayer({ toast, onDismiss }) {
  const hasAction = toast && toast.action;
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 100, zIndex: 100,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      padding: '0 18px',
    }}>
      <div style={{
        opacity: toast ? 1 : 0, transform: `translateY(${toast ? 0 : 8}px)`,
        transition: 'all .25s ease',
        padding: hasAction ? '12px 8px 12px 18px' : '12px 20px',
        borderRadius: hasAction ? 16 : 999,
        background: 'rgba(8,22,17,0.94)', color: '#F2F7F2',
        border: '1px solid rgba(245,246,243,0.32)',
        fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 600,
        fontSize: 13, letterSpacing: '0.04em',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
        maxWidth: '85%',
        display: 'flex', alignItems: 'center', gap: 12,
        pointerEvents: hasAction ? 'auto' : 'none',
      }}>
        <div style={{ flex: 1 }}>{toast?.text}</div>
        {hasAction && (
          <button onClick={() => { toast.action.onClick(); onDismiss(); }}
                  style={{
                    all: 'unset', cursor: 'pointer',
                    padding: '6px 12px', borderRadius: 10,
                    color: '#EFE5C8', fontWeight: 800, fontSize: 12,
                    letterSpacing: '0.10em',
                  }}>{toast.action.label.toUpperCase()}</button>
        )}
      </div>
    </div>
  );
}

function Sheet({ sheet, onClose }) {
  const open = !!sheet;
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current && sheet) scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [sheet]);
  return (
    <div ref={scrollRef} style={{
      position: 'absolute', inset: 0, zIndex: 90,
      pointerEvents: open ? 'auto' : 'none',
      background: '#124638',
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
            padding: '14px 22px 8px', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              {sheet.leftAction}
              <div style={{
                fontFamily: fontDisplay, fontWeight: 800, fontSize: 28, letterSpacing: '0.02em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{sheet.title}</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{
              all: 'unset', cursor: 'pointer', flexShrink: 0,
              width: 36, height: 36, borderRadius: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(245,246,243,0.08)',
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
