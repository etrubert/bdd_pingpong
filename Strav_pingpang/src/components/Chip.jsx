import { C, fontSans } from '../theme';

export default function Chip({ children }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '8px 14px', borderRadius: 999,
      background: 'rgba(8,22,17,0.45)',
      border: `1px solid ${C.border}`,
      fontFamily: fontSans, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.12em',
      color: C.ink,
    }}>{children}</div>
  );
}
