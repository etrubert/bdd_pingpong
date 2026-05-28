import { useState } from 'react';
import { C, fontDisplay, fontSans, kicker, iconBtn, btnPrimary, inputStyle } from '../theme';
import { Icon } from '../icons';
import { useUI } from '../components/uiContext';
import Card from '../components/Card';
import { useMatches, useMatchStats } from '../lib/matches';

// Donnees evolution ELO (Jul -> Auj.)
const ELO_HISTORY = [
  { month: 'Jul', elo: 1380 },
  { month: 'Aoû', elo: 1370 },
  { month: 'Sep', elo: 1395 },
  { month: 'Oct', elo: 1420 },
  { month: 'Nov', elo: 1442 },
  { month: 'Auj.', elo: 1450 },
];

function PeriodTabs({ value, onChange }) {
  const opts = [
    { id: 'saison',  label: 'Saison' },
    { id: 'mois',    label: 'Mois' },
    { id: 'semaine', label: 'Semaine' },
    { id: 'all',     label: 'Tout' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {opts.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            all: 'unset', cursor: 'pointer',
            padding: '6px 16px', borderRadius: 999,
            border: `1px solid ${active ? C.warm : C.border}`,
            background: active ? 'rgba(232,201,155,0.16)' : 'transparent',
            color: active ? C.warm : C.ink,
            fontFamily: fontSans, fontWeight: 700, fontSize: 13,
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function StatTile({ value, label }) {
  return (
    <div style={{
      padding: '18px 12px 14px', borderRadius: 14,
      background: 'rgba(245,246,243,0.04)', border: `1px solid ${C.border}`,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 28,
        color: C.ink, letterSpacing: '0.02em', lineHeight: 1,
      }}>{value}</div>
      <div style={{
        marginTop: 8, fontFamily: fontSans, fontWeight: 600, fontSize: 10.5,
        color: C.inkDim, letterSpacing: '0.16em', whiteSpace: 'pre-line', lineHeight: 1.25,
      }}>{label}</div>
    </div>
  );
}

function StreakBanner({ current, best, since }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 14,
      background: 'linear-gradient(90deg, rgba(232,201,155,0.10) 0%, rgba(232,201,155,0.03) 100%)',
      border: '1px solid rgba(232,201,155,0.35)',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(232,201,155,0.16)', border: '1px solid rgba(232,201,155,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.warm,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13.5 0.67s.74 1.94.74 3.5c0 1.5-.99 2.72-2.49 2.72S9.26 5.67 9.26 4.17l.02-.25c-1.47 1.74-2.36 3.94-2.36 6.33 0 3.31 2.69 6 6 6s6-2.69 6-6c0-4.04-1.94-7.65-5.42-9.58z"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>
          {current} victoires d'affilée
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
          Meilleure série : {best} · depuis le {since}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
        {Array.from({ length: current }).map((_, i) => (
          <div key={i} style={{
            width: 4, height: 8 + i * 4,
            background: C.warm, borderRadius: 2,
          }} />
        ))}
      </div>
    </div>
  );
}

function EloChart({ data }) {
  const W = 320, H = 160, P = 12;
  const min = Math.min(...data.map(d => d.elo));
  const max = Math.max(...data.map(d => d.elo));
  const range = max - min || 1;
  const points = data.map((d, i) => {
    const x = P + (i / (data.length - 1)) * (W - 2 * P);
    const y = H - P - ((d.elo - min) / range) * (H - 2 * P);
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H - P} L ${points[0].x} ${H - P} Z`;
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" preserveAspectRatio="none">
        <defs>
          <linearGradient id="elo-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="#E8C99B" stopOpacity="0.28"/>
            <stop offset="100%" stopColor="#E8C99B" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#elo-area)" />
        <path d={linePath} stroke="#E8C99B" strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5}
            fill={i === points.length - 1 ? '#E8C99B' : '#092C25'}
            stroke="#E8C99B" strokeWidth="1.6" />
        ))}
      </svg>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 4, padding: '0 4px',
        fontFamily: fontSans, fontSize: 11, color: C.inkDim, letterSpacing: '0.04em',
      }}>
        {data.map((d, i) => (
          <span key={i} style={{ color: i === data.length - 1 ? C.warm : C.inkDim, fontWeight: i === data.length - 1 ? 700 : 500 }}>
            {d.month}
          </span>
        ))}
      </div>
    </div>
  );
}

function MatchAvatar({ initials, color, size = 44 }) {
  const [light, mid, dark] = color;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
      border: `1.5px solid ${C.borderHi}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: fontSans, fontWeight: 800, fontSize: size > 40 ? 13 : 11,
      color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em',
    }}>{initials}</div>
  );
}

function ResultBadge({ win }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 18, height: 18, borderRadius: 4,
      fontFamily: fontSans, fontWeight: 800, fontSize: 11,
      background: win ? 'rgba(61,209,107,0.20)' : 'rgba(232,155,139,0.20)',
      color: win ? '#3DD16B' : '#E89B8B',
      border: `1px solid ${win ? 'rgba(61,209,107,0.45)' : 'rgba(232,155,139,0.45)'}`,
    }}>{win ? 'V' : 'D'}</span>
  );
}

function H2HBar({ pattern }) {
  return (
    <div style={{ display: 'flex', gap: 4, flex: 1, height: 8 }}>
      {pattern.map((win, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 4,
          background: win ? '#3DD16B' : '#E89B8B',
          opacity: win ? 0.85 : 0.75,
        }} />
      ))}
    </div>
  );
}

function MatchCard({ m, onOpen, onRematch }) {
  const accent = m.win ? '#3DD16B' : '#E89B8B';
  const eloColor = m.win ? '#3DD16B' : '#E89B8B';
  return (
    <div style={{
      borderRadius: 16, overflow: 'hidden',
      background: C.card, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${accent}`,
    }}>
      <button onClick={onOpen} style={{
        all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
      }}>
        <MatchAvatar initials={m.initials} color={m.color} />
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: fontDisplay, fontWeight: 800, fontSize: 15,
              color: C.ink, letterSpacing: '0.06em',
            }}>{m.name}</span>
            <ResultBadge win={m.win} />
          </div>
          <div style={{
            marginTop: 4, fontFamily: fontSans, fontSize: 12.5, color: C.inkDim,
          }}>{m.when} · {m.where} · {m.format}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>{m.score}</div>
          <div style={{
            marginTop: 4, fontFamily: fontSans, fontWeight: 800, fontSize: 12,
            color: eloColor, letterSpacing: '0.02em',
          }}>{m.elo > 0 ? '+' : '−'}{Math.abs(m.elo)} ELO</div>
        </div>
      </button>

      {/* Sous-section H2H */}
      {m.h2h && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          padding: '12px 16px', gap: 8,
          borderTop: `1px solid ${C.border}`,
        }}>
          {[
            [m.h2h.count, 'MATCHS', C.ink],
            [m.h2h.record, 'BILAN', C.warm],
            [`${m.h2h.winRate}%`, 'WIN RATE', C.warm],
          ].map(([v, l, col]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, color: col }}>{v}</div>
              <div style={{ marginTop: 2, fontFamily: fontSans, fontWeight: 700, fontSize: 9.5, color: C.inkDim, letterSpacing: '0.14em' }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {m.pattern && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px',
          borderTop: `1px solid ${C.border}`,
          fontFamily: fontSans, fontSize: 12, color: C.inkDim,
        }}>
          <span>Vs {m.name.split(' ')[0]} :</span>
          <H2HBar pattern={m.pattern} />
          <span style={{ color: m.win ? '#3DD16B' : '#E89B8B', fontWeight: 800, fontSize: 13 }}>{m.record}</span>
        </div>
      )}

      {m.rematch && (
        <div style={{ padding: '0 12px 12px' }}>
          <button onClick={onRematch} style={{
            all: 'unset', cursor: 'pointer', width: '100%', textAlign: 'center',
            padding: '10px', borderRadius: 10, boxSizing: 'border-box',
            background: 'rgba(232,201,155,0.10)', border: '1px solid rgba(232,201,155,0.35)',
            color: C.warm, fontFamily: fontSans, fontWeight: 700, fontSize: 13,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 17.5l4 4 3-3-4-4"/><path d="M3 5l6 6 4-4-6-6L3 3v2z"/><path d="M11 13l-8 8"/>
              <path d="M9.5 17.5l-4 4-3-3 4-4"/><path d="M21 5l-6 6-4-4 6-6 2-2v2z"/><path d="M13 13l8 8"/>
            </svg>
            Lancer une revanche
          </button>
        </div>
      )}
    </div>
  );
}

function MatchDetailSheet({ m }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <MatchAvatar initials={m.initials} color={m.color} size={56} />
        <div>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 17 }}>{m.name}</div>
          <div style={{ fontFamily: fontSans, fontSize: 12.5, color: C.inkDim }}>{m.when} · {m.where} · {m.format}</div>
        </div>
      </div>
      <div style={{
        textAlign: 'center', padding: '22px 0', borderRadius: 16,
        background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
      }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 56, color: C.ink, letterSpacing: '0.04em', lineHeight: 1 }}>{m.score}</div>
        <div style={{ marginTop: 10, fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.14em', color: m.elo >= 0 ? '#3DD16B' : '#E89B8B' }}>
          {m.elo >= 0 ? '+' : '−'}{Math.abs(m.elo)} ELO
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        {[['Sets','11-9 / 8-11 / 11-7 / 11-6'],['Aces','4'],['Unforced errors','7'],['Longest rally','22 hits']].map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={kicker}>{k.toUpperCase()}</span>
            <span style={{ fontFamily: fontSans, fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecordMatchSheet() {
  const [opp, setOpp] = useState('');
  const [score, setScore] = useState('3 - 0');
  const [loc, setLoc] = useState('');
  const { showToast, closeSheet } = useUI();
  const [, , addMatch] = useMatches();

  const save = () => {
    const name = (opp || 'Adversaire').trim();
    const initials = name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'AD';
    const [a, b] = score.split(/[-:]/).map(s => parseInt(s.trim(), 10));
    const setsA = Number.isFinite(a) ? a : 0;
    const setsB = Number.isFinite(b) ? b : 0;
    const win = setsA >= setsB;
    // Écrit dans le store local partagé → profil, HomeScreen et cette liste
    // se mettent à jour immédiatement (même source via useMatchStats/useMatches).
    addMatch({
      name: name.toUpperCase(), initials,
      when: "À l'instant", where: loc.trim() || 'Match libre', format: 'BO5',
      score: `${setsA}-${setsB}`,
      win, elo: win ? 12 : -8,
      color: ['#a8c2db', '#3b5a7a', '#0d1a2a'],
    });
    closeSheet();
    showToast(`Match enregistré : ${name} ${setsA}-${setsB}`);
  };

  return (
    <div>
      <div style={{ ...kicker, marginBottom: 8 }}>ADVERSAIRE</div>
      <input value={opp} onChange={e => setOpp(e.target.value)} placeholder="ex. Marc-André" style={inputStyle} />
      <div style={{ ...kicker, marginTop: 16, marginBottom: 8 }}>SCORE (SETS)</div>
      <input value={score} onChange={e => setScore(e.target.value)} placeholder="3 - 1" style={inputStyle} />
      <div style={{ ...kicker, marginTop: 16, marginBottom: 8 }}>LIEU</div>
      <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="ex. Canal St-Martin" style={inputStyle} />
      <button onClick={save}
        style={{ ...btnPrimary, marginTop: 20, width: '100%' }}>ENREGISTRER LE MATCH</button>
    </div>
  );
}

export default function MatchesScreen() {
  const { showToast, openSheet } = useUI();
  const [period, setPeriod] = useState('saison');
  // Stats réelles dérivées du store local partagé (même source que le profil).
  const { played, won, winRate, streak, bestStreak, matches } = useMatchStats();

  return (
    <div style={{ padding: '24px 18px 130px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 28,
        color: C.cream, letterSpacing: '0.08em',
      }}>STATS DE LA SAISON</div>

      <PeriodTabs value={period} onChange={setPeriod} />

      {/* Stats tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <StatTile value={won} label={'TOTAL\nVICTOIRES'} />
        <StatTile value={winRate != null ? `${winRate}%` : '—'} label={'%\nVICTOIRES'} />
        <StatTile value={played} label={'MATCHS\nJOUÉS'} />
      </div>

      {/* Streak */}
      <StreakBanner current={streak} best={bestStreak} since="cette saison" />

      {/* Evolution ELO */}
      <div>
        <div style={{ ...kicker, color: C.warm, marginBottom: 8 }}>ÉVOLUTION ELO</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 38, color: C.ink, lineHeight: 1, display: 'inline-block' }}>1450</div>
            <span style={{ marginLeft: 10, fontFamily: fontSans, fontWeight: 700, fontSize: 13, color: '#3DD16B' }}>+68 ce mois</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: fontSans, fontSize: 11, color: C.inkDim, letterSpacing: '0.04em' }}>Pic saison</div>
            <div style={{ marginTop: 2, fontFamily: fontDisplay, fontWeight: 800, fontSize: 18, color: C.warm }}>1478</div>
          </div>
        </div>
        <Card style={{ padding: 14 }}>
          <EloChart data={ELO_HISTORY} />
        </Card>
      </div>

      {/* Recent encounters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 21, color: C.ink, letterSpacing: '0.06em' }}>MATCHS RÉCENTS</div>
        <button onClick={() => showToast('Filtrer')} style={{ ...iconBtn, color: C.cream }}>{Icon.filter(20)}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {matches.map(m => (
          <MatchCard
            key={m.id}
            m={m}
            onOpen={() => openSheet({ title: m.name, body: <MatchDetailSheet m={m} /> })}
            onRematch={() => showToast(`Revanche proposée à ${m.name.split(' ')[0]} `)}
          />
        ))}
      </div>

      <button onClick={() => openSheet({ title: 'NOUVEAU MATCH', body: <RecordMatchSheet /> })} style={{
        marginTop: 4, padding: '16px', borderRadius: 14,
        background: 'rgba(239,229,200,0.06)', border: '1px solid rgba(239,229,200,0.32)',
        color: C.cream, fontFamily: fontSans, fontWeight: 700, fontSize: 13,
        letterSpacing: '0.14em', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>{Icon.plus(18)} ENREGISTRER UN MATCH</button>
    </div>
  );
}
