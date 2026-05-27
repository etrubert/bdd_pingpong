import { C, fontSans } from '../theme';
import { Icon } from '../icons';

export default function BottomNav({ tab, onTab }) {
  const items = [
    { id: 'home',    label: 'HOME',    icon: Icon.home },
    { id: 'train',   label: 'TRAIN',   icon: Icon.brain },
    { id: 'finder',  label: 'FINDER',  icon: Icon.map },
    { id: 'leaderboard', label: 'RANKING', icon: Icon.trend },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      paddingTop: 10,
      paddingLeft: 4, paddingRight: 4,
      background: 'linear-gradient(to top, #081610 70%, rgba(8,22,17,0.0))',
      display: 'flex',
      borderTop: `1px solid ${C.border}`,
      zIndex: 4,
    }}>
      {items.map(it => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => onTab(it.id)} style={{
            flex: 1, minWidth: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, padding: '6px 2px 4px', borderRadius: 10,
            color: active ? C.cream : 'rgba(242,247,242,0.78)',
            position: 'relative',
          }}>
            {active && <div style={{
              position: 'absolute', inset: '-2px 4px', borderRadius: 14,
              background: 'rgba(239,229,200,0.07)',
              border: '1px solid rgba(239,229,200,0.22)',
              zIndex: -1,
            }} />}
            {it.icon(20)}
            <span style={{
              fontFamily: fontSans, fontSize: 9, letterSpacing: '0.06em',
              fontWeight: 600,
            }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
