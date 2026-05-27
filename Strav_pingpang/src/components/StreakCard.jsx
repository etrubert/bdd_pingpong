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

function RewardRow({ reward, unlocked }) {
  const color = ACCENT[reward.color] || C.warm;
  const { showToast } = useUI();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 14,
      background: 'rgba(8,22,17,0.45)',
      border: `1px solid ${unlocked ? color : C.border}`,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: color, color: '#0C211A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: fontSans, fontWeight: 800, fontSize: 13,
      }}>{reward.rank}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>
          {reward.label} · {reward.discount} boutique
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 11.5, color: C.inkDim, marginTop: 1 }}>
          {unlocked ? 'Code débloqué — tape pour copier' : 'Réservé au podium de fin de saison'}
        </div>
      </div>
      {unlocked && (
        <button
          onClick={() => {
            try { navigator.clipboard?.writeText(reward.code); } catch { /* ignore */ }
            showToast(`Code ${reward.code} copié \u2713`);
          }}
          style={{
            all: 'unset', cursor: 'pointer',
            padding: '6px 12px', borderRadius: 8,
            background: color, color: '#0C211A',
            fontFamily: fontSans, fontWeight: 800, fontSize: 11, letterSpacing: '0.04em',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {board.slice(0, 12).map(p => {
          const isPodium = p.rank <= 3;
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
