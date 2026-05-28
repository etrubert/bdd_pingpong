// =====================================================================
// PING PANG PARIS — Fenêtre de chat du coach IA
//
// Modal qui s'ouvre depuis la balle flottante. Affiche les messages,
// permet d'envoyer un texte, et appelle Mistral pour la réponse.
// =====================================================================

import { useEffect, useRef, useState } from 'react';
import { C, fontDisplay, fontSans } from '../theme';
import { sendToCoach, hasApiKey, WELCOME_MESSAGE } from '../lib/coachAI';

const COACH_BALL_SRC = '/media/coach-pingpong-ball.png';

export default function CoachChat({ onClose }) {
  // Historique : [{ role: 'assistant' | 'user', content }]
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const scrollRef = useRef(null);
  const apiOk = hasApiKey();

  // Auto-scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  // Verrouille le scroll de la page derrière + ferme sur ESC
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      // On n'envoie que le rôle/contenu, sans le message d'accueil statique.
      const historyForApi = next
        .filter((m, i) => !(i === 0 && m.role === 'assistant'))
        .map(m => ({ role: m.role, content: m.content }));
      const reply = await sendToCoach(historyForApi);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e?.message || 'Erreur inconnue');
      setMessages(next); // on garde le message utilisateur
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label="Coach Ping"
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(6,30,24,0.78)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          height: 'min(86vh, 720px)',
          background: C.bg,
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <img
            src={COACH_BALL_SRC}
            alt=""
            width={40}
            height={40}
            style={{
              width: 40,
              height: 'auto',
              flexShrink: 0,
              display: 'block',
              objectFit: 'contain',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: fontDisplay, fontWeight: 800, fontSize: 16,
              color: C.ink, letterSpacing: '0.02em', lineHeight: 1.1,
            }}>COACH PING</div>
            {!apiOk && (
              <div style={{
                fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginTop: 2,
              }}>Clé API manquante</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              all: 'unset', cursor: 'pointer',
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(245,246,243,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.ink,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}
          {sending && (
            <MessageBubble role="assistant" content={'…'} pulsing />
          )}
          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(230,73,73,0.10)', border: '1px solid rgba(230,73,73,0.40)',
              fontFamily: fontSans, fontSize: 12, color: '#E64949',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{
          padding: 12, borderTop: `1px solid ${C.border}`,
          display: 'flex', gap: 8, alignItems: 'flex-end',
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={apiOk ? 'Parle-moi de ton dernier match…' : 'Configure VITE_MISTRAL_API_KEY dans .env'}
            rows={1}
            disabled={!apiOk}
            style={{
              flex: 1, resize: 'none',
              padding: '11px 14px', borderRadius: 18,
              background: 'rgba(8,22,17,0.55)',
              border: `1px solid ${C.border}`,
              color: C.ink,
              fontFamily: fontSans, fontSize: 14,
              outline: 'none', maxHeight: 100,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || !apiOk}
            aria-label="Envoyer"
            style={{
              all: 'unset', cursor: input.trim() && apiOk && !sending ? 'pointer' : 'not-allowed',
              width: 40, height: 40, borderRadius: '50%',
              background: input.trim() && apiOk && !sending ? C.mint : 'rgba(245,246,243,0.08)',
              color: input.trim() && apiOk && !sending ? '#092C25' : C.inkFaint,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Bulle individuelle de message — style chat moderne.
// ---------------------------------------------------------------------
function MessageBubble({ role, content, pulsing = false }) {
  const isUser = role === 'user';
  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '85%',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '10px 13px', borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? C.mint : 'rgba(245,246,243,0.08)',
        color: isUser ? '#092C25' : C.ink,
        fontFamily: fontSans, fontSize: 14, lineHeight: 1.5,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        border: isUser ? 'none' : `1px solid ${C.border}`,
        opacity: pulsing ? 0.6 : 1,
      }}>
        {content}
      </div>
    </div>
  );
}
