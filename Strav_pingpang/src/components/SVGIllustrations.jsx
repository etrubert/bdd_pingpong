export function PaddleSVG() {
  return (
    <svg width="100%" height="280" viewBox="0 0 360 280" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="pg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#2a5b48" />
          <stop offset="60%" stopColor="#124638" />
          <stop offset="100%" stopColor="#092C25" />
        </radialGradient>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.7" fill="#000" opacity="0.3" />
        </pattern>
      </defs>
      <ellipse cx="180" cy="135" rx="115" ry="95" fill="url(#pg)" />
      <ellipse cx="180" cy="135" rx="115" ry="95" fill="url(#dots)" />
      <rect x="172" y="220" width="16" height="60" rx="4" fill="#0d1f17" />
      <rect x="160" y="225" width="40" height="14" rx="3" fill="#7a5a3a" />
    </svg>
  );
}

export function ArenaSVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 140" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1d4636" />
          <stop offset="100%" stopColor="#0a1b14" />
        </linearGradient>
        <radialGradient id="lamp" cx="50%" cy="0%" r="60%">
          <stop offset="0%" stopColor="rgba(232,201,155,0.45)" />
          <stop offset="100%" stopColor="rgba(232,201,155,0)" />
        </radialGradient>
      </defs>
      <rect width="360" height="140" fill="url(#ar)" />
      <rect width="360" height="140" fill="url(#lamp)" />
      <g opacity="0.85">
        <polygon points="100,110 260,110 320,135 40,135" fill="#0e2d23" stroke="#3a6a55" strokeWidth="1"/>
        <line x1="180" y1="110" x2="180" y2="135" stroke="#3a6a55" strokeWidth="1"/>
        <line x1="80" y1="120" x2="280" y2="120" stroke="#3a6a55" strokeWidth="0.7" strokeDasharray="4 4"/>
        <rect x="170" y="100" width="20" height="10" fill="#3a6a55" opacity="0.4"/>
      </g>
      <circle cx="60" cy="20" r="3" fill="#e8c99b" opacity="0.8"/>
      <circle cx="180" cy="14" r="3" fill="#e8c99b" opacity="0.9"/>
      <circle cx="300" cy="20" r="3" fill="#e8c99b" opacity="0.8"/>
    </svg>
  );
}

export function TrajectorySVG() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="tj" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1d4636" />
          <stop offset="100%" stopColor="#0a1b14" />
        </linearGradient>
        <linearGradient id="arc" x1="0" x2="1">
          <stop offset="0%" stopColor="#f6c562" />
          <stop offset="100%" stopColor="#e8c99b" />
        </linearGradient>
      </defs>
      <rect width="360" height="170" fill="url(#tj)" />
      <g stroke="#2a5b48" strokeWidth="0.5" opacity="0.6">
        {Array.from({length:8}).map((_,i)=>(<line key={`h${i}`} x1="0" y1={20*i+10} x2="360" y2={20*i+10}/>))}
        {Array.from({length:12}).map((_,i)=>(<line key={`v${i}`} x1={30*i} y1="0" x2={30*i} y2="170"/>))}
      </g>
      <g fill="#0a1b14" stroke="#2a5b48" strokeWidth="1">
        <ellipse cx="130" cy="60" rx="9" ry="11"/>
        <path d="M120 70 L100 110 L110 130 L130 130 L145 95 L160 80 L150 70 Z"/>
        <path d="M145 95 L175 70 L180 78 L150 105 Z"/>
      </g>
      <path d="M 100 140 Q 200 -20 320 130" fill="none" stroke="url(#arc)" strokeWidth="3.5" strokeLinecap="round" filter="drop-shadow(0 0 6px rgba(246,197,98,0.6))"/>
      <circle cx="320" cy="130" r="4" fill="#f6c562"/>
    </svg>
  );
}
