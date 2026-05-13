import { C, fontDisplay, fontSans, kicker } from '../theme';
import Card from '../components/Card';

export default function PlaceholderScreen({ title, blurb }) {
  return (
    <div style={{ padding: '60px 28px 140px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 56, lineHeight: 0.95, color: C.ink, letterSpacing: '0.02em' }}>{title}</div>
      <div style={{ fontFamily: fontSans, fontSize: 14, color: C.inkDim, lineHeight: 1.5 }}>{blurb}</div>
      <Card>
        <div style={kicker}>COMING SOON</div>
        <div style={{ marginTop: 12, color: C.inkDim, fontFamily: fontSans, fontSize: 14, lineHeight: 1.5 }}>
          This module is part of the Ping Pang Paris ecosystem. Tap the bottom tabs to explore HOME, TRAIN and MATCHES.
        </div>
      </Card>
    </div>
  );
}
