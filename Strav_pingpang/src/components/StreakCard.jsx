// =====================================================================
// PING PANG PARIS — Carte "Streak de connexion" pour le Home (changement 2)
//
// Carte compacte : streak actuel + position dans le classement + jours
// restants avant la distribution des codes promo (fin de saison).
// Au tap : sheet avec le classement complet, le podium des récompenses
// et le code promo à copier si l'utilisateur est dans le top 3.
// =====================================================================

import { C, fontDisplay, fontSans, kicker } from '../theme';
import { useUI } from './uiContext';
import { useLoginStreak, currentSeason, daysUntilSeasonEnd } from '../lib/loginStreak';
import { buildStreakBoard, STREAK_REWARDS } from '../lib/streakBoard';

const ACCENT = { gold: C.warm, silver: 'rgba(184,220,197,0.85)', bronze: '#D9A06B' };

// Icone SVG inline par type de récompense, suffisamment générique pour passer
// dans tous les navigateurs (pas de dépendance webfont supplémentaire).
function RewardIcon({ kind, color }) {
  if (kind === 'article') {
    // Sac shopping
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 7h12l-1 13H7L6 7z" /><path d="M9 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }
  if (kind === 'giftcard') {
    // Cadeau
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="13" rx="1" /><path d="M12 8v13M3 12h18" />
        <path d="M12 8s-2-4-5-4a3 3 0 0 0 0 6h5M12 8s2-4 5-4a3 3 0 0 1 0 6h-5" />
      </svg>
    );
  }
  // promo : ticket
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9z" />
      <path d="M9 8v8" strokeDasharray="2 2" />
    </svg>
  );
}

function RewardRow({ reward, unlocked }) {
  const color = ACCENT[reward.color] || C.warm;
  const { showToast } = useUI();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 14px', borderRadius: 14,
      background: 'rgba(8,22,17,0.45)',
      border: `1px solid ${unlocked ? color : C.border}`,
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(8,22,17,0.6)',
          border: `1.5px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RewardIcon kind={reward.kind} color={color} />
        </div>
        <div style={{
          position: 'absolute', bottom: -3, right: -3,
          width: 18, height: 18, borderRadius: '50%',
          background: color, color: '#0C211A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fontSans, fontWeight: 800, fontSize: 10,
        }}>{reward.rank}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 13.5, color: C.ink }}>
          {reward.title}
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginTop: 2 }}>
          {unlocked ? 'Récompense débloquée — tape pour copier le code' : reward.detail}
        </div>
      </div>
      {unlocked && (
        <button
          onClick={() => {
            try { navigator.clipboard?.writeText(reward.code); } catch { /* ignore */ }
            showToast(`Code ${reward.code} copié \u2713`);
          }}
          style={{
            all: 'unset', cursor: 'pointer', flexShrink: 0,
            padding: '6px 10px', borderRadius: 8,
            background: color, color: '#0C211A',
            fontFamily: fontSans, fontWeight: 800, fontSize: 10.5, letterSpacing: '0.04em',
          }}
        >{reward.code}</button>
      )}
    </div>
  );
}

function StreakSheet({ board, myRank }) {
  const season = currentSeason();
  const daysLeft = daysUntilSeasonEnd();
  return (
    <div style={{ fontFamily: fontSans, color: C.ink }}>
      {/* Bandeau saison */}
      <div style={{
        padding: '12px 14px', borderRadius: 14, marginBottom: 16,
        background: 'rgba(232,201,155,0.10)', border: '1px solid rgba(232,201,155,0.35)',
      }}>
        <div style={{ ...kicker, color: C.warm, fontSize: 10.5 }}>SAISON {season.label}</div>
        <div style={{ fontSize: 13.5, color: C.ink, marginTop: 4 }}>
          Plus que <strong style={{ color: C.warm }}>{daysLeft} jours</strong> avant la remise des codes promo aux 3 meilleurs streaks.
        </div>
      </div>

      {/* Récompenses */}
      <div style={{ ...kicker, marginBottom: 10 }}>RÉCOMPENSES DU PODIUM</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {STREAK_REWARDS.map(r => (
          <RewardRow key={r.rank} reward={r} unlocked={myRank === r.rank} />
        ))}
      </div>

      {/* Classement */}
      <div style={{ ...kicker, marginBottom: 10 }}>CLASSEMENT STREAK</div>

      {/* Podium top 3 (changement 1) */}
      {board.length >= 3 && <StreakPodium players={board.slice(0, 3)} />}

      {/* Reste du classement à partir du 4e */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: board.length >= 3 ? 16 : 0 }}>
        {board.slice(3, 12).map(p => {
          const isPodium = false;
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 12,
              background: p.isMe ? 'rgba(232,201,155,0.10)' : 'rgba(8,22,17,0.45)',
              border: `1px solid ${p.isMe ? 'rgba(232,201,155,0.40)' : C.border}`,
            }}>
              <div style={{
                width: 24, textAlign: 'center',
                fontFamily: fontDisplay, fontWeight: 800, fontSize: 18,
                color: isPodium ? C.warm : C.inkDim,
              }}>{p.rank}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  {p.isMe && <span style={{
                    flexShrink: 0, padding: '2px 8px', borderRadius: 999,
                    background: C.warm, color: '#0C211A', fontSize: 10, fontWeight: 800,
                  }}>TOI</span>}
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontFamily: fontSans, fontWeight: 800, fontSize: 15,
                color: isPodium ? C.warm : C.ink,
              }}>🔥 {p.streak}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Podium top 3 du streak (2e à gauche, 1er surélevé au centre, 3e à droite).
function StreakPodium({ players }) {
  const [p2, p1, p3] = [players[1], players[0], players[2]];
  return (
    <div style={{
      padding: '20px 14px 14px', borderRadius: 18,
      background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', alignItems: 'end', gap: 10 }}>
        <StreakPodiumSpot p={p2} rank={2} size={62} />
        <StreakPodiumSpot p={p1} rank={1} size={80} crown />
        <StreakPodiumSpot p={p3} rank={3} size={62} />
      </div>
    </div>
  );
}

function StreakPodiumSpot({ p, rank, size, crown }) {
  if (!p) return <div />;
  const isGold = rank === 1;
  const accent = isGold ? C.warm : 'rgba(184,220,197,0.55)';
  const initials = (p.name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      {crown && <div style={{ fontSize: 20, marginBottom: -3 }}>👑</div>}
      <div style={{ position: 'relative' }}>
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'radial-gradient(60% 60% at 35% 30%, #2A4D3E 0%, #143226 70%, #0C211A 100%)',
          border: `2px solid ${accent}`,
          boxShadow: isGold ? '0 0 26px rgba(232,201,155,0.40)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.ink, fontFamily: fontSans, fontWeight: 800, fontSize: size * 0.30,
        }}>{initials}</div>
        <div style={{
          position: 'absolute', bottom: -4, right: -4,
          width: 20, height: 20, borderRadius: '50%',
          background: isGold ? C.warm : C.card,
          border: isGold ? 'none' : `1px solid ${C.border}`,
          color: isGold ? '#0C211A' : C.ink,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fontSans, fontWeight: 800, fontSize: 10,
        }}>{rank}</div>
      </div>
      <div style={{
        fontFamily: fontSans, fontWeight: 700, fontSize: isGold ? 13 : 12, color: C.ink,
        textAlign: 'center', lineHeight: 1.15, maxWidth: size + 22,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
        {p.isMe && <span style={{
          flexShrink: 0, padding: '1px 5px', borderRadius: 999,
          background: C.warm, color: '#0C211A', fontSize: 8, fontWeight: 800,
        }}>TOI</span>}
      </div>
      <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: isGold ? 22 : 18, color: isGold ? C.warm : C.ink }}>
        🔥 {p.streak}
      </div>
    </div>
  );
}

export default function StreakCard({ displayName }) {
  const { openSheet } = useUI();
  const { current } = useLoginStreak();
  const board = buildStreakBoard(current, displayName || 'Toi');
  const me = board.find(p => p.isMe);
  const myRank = me?.rank ?? null;
  const daysLeft = daysUntilSeasonEnd();
  const inPodium = myRank != null && myRank <= 3;

  return (
    <button
      onClick={() => openSheet({ title: 'STREAK DE CONNEXION', body: <StreakSheet board={board} myRank={myRank} /> })}
      style={{ all: 'unset', cursor: 'pointer', display: 'block' }}
    >
      <div style={{
        padding: 18, borderRadius: 22,
        background: 'linear-gradient(180deg, rgba(232,201,155,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, #193E2F 0%, #143226 100%)',
        border: '1px solid rgba(232,201,155,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...kicker, color: C.warm }}>STREAK DE CONNEXION</div>
          <span style={{
            fontFamily: fontSans, fontWeight: 800, fontSize: 10,
            color: C.warm, background: 'rgba(232,201,155,0.16)',
            border: '1px solid rgba(232,201,155,0.40)',
            padding: '3px 9px', borderRadius: 999, letterSpacing: '0.06em',
          }}>{myRank != null ? `#${myRank}` : '—'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
          <div style={{
            fontFamily: fontDisplay, fontWeight: 800, fontSize: 46, lineHeight: 1,
            color: C.ink,
          }}>🔥 {current}</div>
          <div style={{
            fontFamily: fontSans, fontSize: 13, color: C.inkDim, paddingBottom: 6,
          }}>{current <= 1 ? 'jour' : 'jours d\u2019affilée'}</div>
        </div>

        <div style={{
          marginTop: 12, fontFamily: fontSans, fontSize: 12.5, lineHeight: 1.45,
          color: inPodium ? C.warm : C.inkDim,
        }}>
          {inPodium
            ? `Tu es sur le podium ! Garde ta place : codes promo dans ${daysLeft} j.`
            : `Reviens chaque jour pour grimper. Top 3 = codes promo boutique dans ${daysLeft} j.`}
        </div>
      </div>
    </button>
  );
}
