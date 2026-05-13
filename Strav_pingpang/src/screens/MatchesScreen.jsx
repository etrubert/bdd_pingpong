import { useState } from 'react';
import { C, fontDisplay, fontSans, kicker, iconBtn, btnPrimary, inputStyle } from '../theme';
import { Icon } from '../icons';
import { useUI } from '../components/uiContext';
import Card from '../components/Card';
import Avatar from '../components/Avatar';

const MATCHES = [
  { id:'julien', name:'JULIEN B.',  when:'2 hours ago', where:'Canal St-Martin',     score:'11 : 09', elo:14,  verified:true,  hue:140 },
  { id:'marie',  name:'MARIE L.',   when:'Yesterday',   where:'Parc de la Villette', score:'11 : 05', elo:12,  verified:false, hue:0   },
  { id:'thomas', name:'THOMAS R.',  when:'3 days ago',  where:'Place de la Bastille',score:'08 : 11', elo:-8,  verified:false, hue:30  },
  { id:'clara',  name:'CLARA D.',   when:'Last Week',   where:'Luxembourg Gardens',  score:'11 : 02', elo:18,  verified:true,  hue:200 },
];

function FilterSheet() {
  const [active, setActive] = useState('All');
  const opts = ['All','Wins','Losses','This week','This month'];
  const { showToast, closeSheet } = useUI();
  return (
    <div>
      <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginBottom: 14 }}>Filter your recent encounters.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {opts.map(o => (
          <button key={o} onClick={() => setActive(o)} style={{
            padding: '10px 16px', borderRadius: 999,
            background: active === o ? C.mint : 'transparent',
            color: active === o ? '#0C211A' : C.ink,
            border: `1px solid ${active === o ? C.mint : C.borderHi}`,
            fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.10em',
            cursor: 'pointer',
          }}>{o.toUpperCase()}</button>
        ))}
      </div>
      <button onClick={() => { closeSheet(); showToast(`Filter applied: ${active}`); }}
        style={{ ...btnPrimary, marginTop: 20, width: '100%' }}>APPLY</button>
    </div>
  );
}

function MatchDetailSheet({ m }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <Avatar hue={m.hue} verified={m.verified} initials={m.name.split(' ')[0][0] + m.name.split(' ')[1][0]} />
        <div>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 16 }}>{m.name}</div>
          <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.inkDim }}>{m.when} &bull; {m.where}</div>
        </div>
      </div>
      <div style={{
        textAlign: 'center', padding: '22px 0', borderRadius: 16,
        background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 56, color: C.ink, letterSpacing: '0.04em', lineHeight: 1 }}>{m.score}</div>
        <div style={{ marginTop: 10, fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.14em', color: m.elo >= 0 ? C.mint : C.loss }}>
          {m.elo >= 0 ? '+' : '\u2212'}{String(Math.abs(m.elo)).padStart(2,'0')} ELO
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        {[['Sets','11-9 / 8-11 / 11-7 / 11-6'],['Aces','4'],['Unforced errors','7'],['Longest rally','22 hits']].map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ ...kicker }}>{k.toUpperCase()}</span>
            <span style={{ fontFamily: fontSans, fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordMatchSheet() {
  const [opp, setOpp] = useState('');
  const [score, setScore] = useState('11 - 0');
  const { showToast, closeSheet } = useUI();
  return (
    <div>
      <div style={{ ...kicker, marginBottom: 8 }}>OPPONENT</div>
      <input value={opp} onChange={e => setOpp(e.target.value)} placeholder="e.g. Marc-Andre"
        style={inputStyle} />
      <div style={{ ...kicker, marginTop: 16, marginBottom: 8 }}>SCORE</div>
      <input value={score} onChange={e => setScore(e.target.value)}
        style={inputStyle} />
      <div style={{ ...kicker, marginTop: 16, marginBottom: 8 }}>LOCATION</div>
      <input placeholder="e.g. Canal St-Martin" style={inputStyle} />
      <button onClick={() => { closeSheet(); showToast(`Match logged: ${opp || 'opponent'} ${score}`); }}
        style={{ ...btnPrimary, marginTop: 20, width: '100%' }}>SAVE MATCH</button>
    </div>
  );
}

export default function MatchesScreen() {
  const { showToast, openSheet } = useUI();
  return (
    <div style={{ padding: '24px 18px 130px', display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
      {/* Season Stats heading */}
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 28,
        color: C.cream, letterSpacing: '0.04em',
      }}>SEASON STATS</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { v: '42',    l: 'TOTAL\nWINS',  msg: 'Total wins this season: 42 (best run +6)' },
          { v: '68%',   l: 'WIN RATE',     msg: 'Win rate: 68% over 62 games' },
          { v: '10.4',  l: 'AVG\nSCORE',   msg: 'Average score per set: 10.4' },
        ].map((s,i)=>(
          <button key={i} onClick={() => showToast(s.msg)} style={{
            all: 'unset', cursor: 'pointer',
            borderRadius: 18, padding: '18px 12px 16px',
            background: 'rgba(184,220,197,0.06)',
            border: `1px solid ${C.border}`,
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 30, color: C.ink, letterSpacing: '0.02em', lineHeight: 1 }}>{s.v}</div>
            <div style={{ marginTop: 10, fontFamily: fontSans, fontWeight: 600, fontSize: 12, color: C.inkDim, letterSpacing: '0.12em', whiteSpace: 'pre-line', lineHeight: 1.25 }}>{s.l}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 21, color: C.ink, letterSpacing: '0.04em' }}>RECENT ENCOUNTERS</div>
        <button onClick={() => openSheet({ title: 'FILTER MATCHES', body: <FilterSheet /> })} style={{ ...iconBtn, color: C.cream }}>{Icon.filter(22)}</button>
      </div>

      <Card style={{ padding: 4 }}>
        {MATCHES.map((m, i) => (
          <button key={m.id} onClick={() => openSheet({ title: m.name, body: <MatchDetailSheet m={m} /> })}
            style={{
              all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 14px',
              borderBottom: i < MATCHES.length-1 ? `1px solid ${C.border}` : 'none',
            }}>
            <Avatar hue={m.hue} verified={m.verified} initials={m.name.split(' ')[0][0] + m.name.split(' ')[1][0]} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink, letterSpacing: '0.04em' }}>{m.name}</div>
              <div style={{ marginTop: 3, fontFamily: fontSans, fontSize: 13, color: C.inkDim, lineHeight: 1.35 }}>
                {m.when} &bull; {m.where}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, color: C.ink, letterSpacing: '0.02em' }}>{m.score}</div>
              <div style={{
                marginTop: 4, fontFamily: fontSans, fontWeight: 600, fontSize: 11,
                color: m.elo >= 0 ? C.inkDim : C.loss,
                letterSpacing: '0.10em',
              }}>{m.elo >= 0 ? '+' : '\u2212'}{String(Math.abs(m.elo)).padStart(2,'0')} ELO</div>
            </div>
          </button>
        ))}
      </Card>

      <button onClick={() => showToast('Loading full history\u2026')} style={{
        marginTop: 4, padding: '18px 24px', borderRadius: 16,
        background: 'rgba(239,229,200,0.05)',
        border: '1px solid rgba(239,229,200,0.25)',
        color: C.cream, fontFamily: fontSans, fontWeight: 700, fontSize: 13,
        letterSpacing: '0.18em', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
      }}>VIEW FULL HISTORY {Icon.arrowR(18)}</button>

      {/* FAB */}
      <button onClick={() => openSheet({ title: 'RECORD MATCH', body: <RecordMatchSheet /> })} style={{
        position: 'absolute', right: 18, bottom: 6,
        width: 60, height: 60, borderRadius: 99,
        background: C.cream, border: 'none', color: '#1A3A2E',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 32px rgba(239,229,200,0.35), 0 4px 12px rgba(0,0,0,0.4)',
      }}>{Icon.plus(26)}</button>
    </div>
  );
}
