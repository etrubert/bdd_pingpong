// =====================================================================
// PING PANG PARIS — Coach IA : balle flottante (FAB)
//
// PNG fond transparent : on affiche la balle telle quelle (pas de crop
// circulaire) pour respecter exactement les contours de l'image.
// =====================================================================

import { useState } from 'react';
import CoachChat from './CoachChat';

const COACH_BALL_SRC = '/media/coach-pingpong-ball.png';
const BALL_WIDTH = 76;

const BALL_SHADOW = [
  'drop-shadow(0 7px 16px rgba(0,0,0,0.50))',
  'drop-shadow(0 2px 5px rgba(255,100,0,0.22))',
].join(' ');

export default function CoachBubble() {
  const [open, setOpen] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir Coach Ping"
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          position: 'absolute',
          right: 12,
          bottom: 86,
          zIndex: 80,
          display: 'block',
          lineHeight: 0,
          transform: pressed ? 'scale(0.94)' : 'scale(1)',
          transition: 'transform 120ms ease',
        }}
      >
        <img
          src={COACH_BALL_SRC}
          alt="Coach Ping — balle de ping-pong"
          width={BALL_WIDTH}
          height={BALL_WIDTH}
          draggable={false}
          style={{
            width: BALL_WIDTH,
            height: 'auto',
            display: 'block',
            objectFit: 'contain',
            userSelect: 'none',
            WebkitUserDrag: 'none',
            filter: BALL_SHADOW,
          }}
        />
      </button>

      {open && <CoachChat onClose={() => setOpen(false)} />}
    </>
  );
}
