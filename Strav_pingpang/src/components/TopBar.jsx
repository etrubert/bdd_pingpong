import { C, fontDisplay, fontSans, kicker, iconBtn } from '../theme';
import { Icon } from '../icons';
import { useUI } from './uiContext';

function ProfileSheet() {
  const fields = [
    ['Member since', 'March 2023'],
    ['Club', 'Le Marais Ping'],
    ['Style', 'Attacker'],
    ['Rubbers', 'Hurricane 3 / Tenergy 05'],
    ['Blade', 'Viscaria FL'],
    ['Region', 'Paris \u2014 11e'],
  ];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 99, flexShrink: 0,
          background: 'radial-gradient(60% 60% at 35% 30%, #d6b890 0%, #6b4a2e 60%, #1c100a 100%)',
          border: `1.5px solid ${C.borderHi}`,
        }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>1450 ELO · #24 PARIS</div>
          <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim }}>Streak: 5 days</div>
        </div>
      </div>
      {fields.map(([k,v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ ...kicker }}>{k.toUpperCase()}</span>
          <span style={{ fontFamily: fontSans, fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

export { ProfileSheet };

export default function TopBar() {
  const { setDrawer, openSheet } = useUI();
  return (
    <div style={{
      height: 64, padding: '0 22px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${C.border}`,
      background: 'rgba(8,22,17,0.55)',
      backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 5,
      color: C.ink,
    }}>
      <button onClick={() => setDrawer(true)} style={iconBtn}>{Icon.menu(24)}</button>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '0.05em',
        fontSize: 18, color: C.ink, whiteSpace: 'nowrap',
      }}>PING PANG PARIS</div>
      <button onClick={() => openSheet({
        title: 'EUGENIA SOREL',
        body: <ProfileSheet />,
      })} style={iconBtn}>{Icon.user(26)}</button>
    </div>
  );
}
