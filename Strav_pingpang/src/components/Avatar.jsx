import { C, fontDisplay } from '../theme';
import { Icon } from '../icons';

export default function Avatar({ hue = 140, verified = false, initials = '' }) {
  return (
    <div style={{ position: 'relative', width: 52, height: 52 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 99, overflow: 'hidden',
        background: `radial-gradient(60% 60% at 35% 30%, hsl(${hue} 45% 55%) 0%, hsl(${hue} 50% 22%) 60%, #0a1b14 100%)`,
        border: `1.5px solid ${C.borderHi}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 20, color: 'rgba(255,255,255,0.92)', letterSpacing: '0.02em' }}>{initials}</span>
      </div>
      {verified && <div style={{
        position: 'absolute', bottom: -2, right: -2, color: C.mint,
        background: C.bg, borderRadius: 99, padding: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Icon.verify(18)}</div>}
    </div>
  );
}
