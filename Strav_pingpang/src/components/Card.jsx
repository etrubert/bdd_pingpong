import { C } from '../theme';

export default function Card({ children, style }) {
  return (
    <div style={{
      background: `linear-gradient(180deg, ${C.cardHi} 0%, ${C.card} 100%)`,
      border: `1px solid ${C.border}`,
      borderRadius: 22,
      padding: 22,
      ...style,
    }}>{children}</div>
  );
}
