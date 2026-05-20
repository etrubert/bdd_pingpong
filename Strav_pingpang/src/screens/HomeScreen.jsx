import { C, fontDisplay, fontSans, fontItalic, kicker, btnPrimary, btnGhost } from '../theme';
import { Icon } from '../icons';
import { useUI } from '../components/uiContext';
import { ProfileSheet } from '../components/TopBar';
import Card from '../components/Card';
import { PaddleSVG } from '../components/SVGIllustrations';
import { useAcceptedChallenges, useIncomingChallenges } from '../lib/challenges';
import { useMatches } from '../lib/matches';
import { useAuth } from '../lib/auth';

function StatRow({ label, value, valueFont = fontSans }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ ...kicker }}>{label}</div>
      <div style={{
        fontFamily: valueFont, fontWeight: valueFont === fontDisplay ? 800 : 700,
        fontSize: valueFont === fontDisplay ? 24 : 22,
        color: C.ink, letterSpacing: valueFont === fontDisplay ? '0.02em' : '0',
      }}>{value}</div>
    </div>
  );
}

function SessionSheet() {
  const { showToast, closeSheet } = useUI();
  return (
    <div style={{ fontFamily: fontSans, color: C.ink }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>LE MARAIS PING</div>
      <div style={{ color: C.inkDim, fontSize: 13, marginBottom: 16 }}>Tomorrow &bull; 18:30 &ndash; 20:30</div>
      {[
        ['Coach','Vincent M.'],
        ['Tables','2 reserved'],
        ['Partners','Marc-Andre, Sofia'],
        ['Focus','Backhand counter-loop'],
      ].map(([k,v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ ...kicker }}>{k.toUpperCase()}</span>
          <span style={{ fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button onClick={() => { closeSheet(); showToast('Session confirmed \u2713'); }} style={btnPrimary}>CONFIRM</button>
        <button onClick={() => { closeSheet(); showToast('Reschedule sent to club'); }} style={btnGhost}>RESCHEDULE</button>
      </div>
    </div>
  );
}

export default function HomeScreen({ onNav }) {
  const { showToast, openSheet } = useUI();
  const [acceptedChallenges] = useAcceptedChallenges();
  const [incomingChallenges] = useIncomingChallenges();
  const [matches] = useMatches();
  const { profile } = useAuth();
  const displayName = (profile?.display_name || profile?.email?.split('@')[0] || 'Joueur').toUpperCase();
  const firstName = displayName.split(' ')[0];
  // Joueur club -> on affiche elo. Sinon (fun/progress) -> "—" tant qu'aucun match joue.
  const matchesPlayed = profile?.matches_played ?? 0;
  const isClubPlayer = profile?.player_type === 'competition';
  const hasMatches = matchesPlayed > 0;
  const elo = profile?.elo_rating ?? 0;
  const eloDisplay = hasMatches ? `${elo} (Glicko-2)` : '— (à jouer)';
  const fftt = profile?.fftt_classification || (isClubPlayer ? '—' : 'Non classé');
  // Streak / volume / daily goal : zero par defaut tant qu'aucun match
  const streakDays = hasMatches ? 5 : 0;
  const dailyGoalPct = hasMatches ? 75 : 0;
  const trainingHours = hasMatches ? 12.4 : 0;
  const nextChallenge = acceptedChallenges[0];        // priorité 1 : défi accepté
  const pendingChallenge = incomingChallenges[0];     // priorité 2 : défi en attente
  const lastMatch = matches[0];                       // match le plus récent
  return (
    <div style={{ padding: '20px 18px 130px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Active player */}
      <button onClick={() => openSheet({ title: displayName, body: <ProfileSheet /> })}
        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
      <Card style={{ padding: '24px 24px 26px' }}>
        <div style={kicker}>ACTIVE PLAYER</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 66, lineHeight: 0.95,
          color: C.mint, letterSpacing: '0.01em', marginTop: 6, marginBottom: 22,
        }}>{firstName}</div>

        <StatRow label="ELO RATING" value={eloDisplay} />
        <div style={{ height: 1, background: C.border, margin: '14px 0' }} />
        <StatRow label="GLOBAL RANK" value={fftt} valueFont={fontDisplay} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          marginTop: 18,
          padding: '8px 16px', borderRadius: 999,
          background: 'rgba(239,229,200,0.12)',
          border: '1px solid rgba(239,229,200,0.32)',
          color: C.cream,
          fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.10em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: C.cream }} />
          STREAK: {streakDays} {streakDays === 1 ? 'DAY' : 'DAYS'}
        </div>
      </Card>
      </button>

      {/* Quote + CTA */}
      <div style={{
        position: 'relative', borderRadius: 22, overflow: 'hidden',
        border: `1px solid ${C.border}`,
        background: C.card,
      }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <PaddleSVG />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(60% 50% at 50% 35%, rgba(184,220,197,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, rgba(20,50,38,0) 40%, rgba(20,50,38,0.85) 90%)',
          }} />
        </div>
        <div style={{ position: 'relative', padding: '26px 24px 24px' }}>
          <div style={{
            fontFamily: fontItalic, fontStyle: 'italic',
            fontSize: 21, lineHeight: 1.25, color: C.ink,
            textWrap: 'pretty',
          }}>
            &ldquo;Precision is not an accident. It is the result of high-intent training.&rdquo;
          </div>
          <div style={{ height: 130 }} />
          <button onClick={() => onNav('train')} style={{
            width: '100%', padding: '18px 20px', borderRadius: 16,
            background: C.mint, border: 'none',
            color: '#0C211A',
            fontFamily: fontSans, fontWeight: 700, fontSize: 14,
            letterSpacing: '0.18em', cursor: 'pointer',
            boxShadow: '0 0 32px rgba(184,220,197,0.35), 0 10px 30px rgba(0,0,0,0.3)',
          }}>QUICK START TRAINING</button>
        </div>
      </div>

      {/* Last match + Daily goal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <button onClick={() => onNav('matches')} style={{ all: 'unset', cursor: 'pointer' }}>
        <Card style={{ padding: 18 }}>
          <div style={kicker}>LAST MATCH</div>
          {lastMatch ? (
            <>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 18 }}>
                <span style={{ color: lastMatch.win ? C.mint : C.loss }}>{Icon.history(16)}</span>
                {lastMatch.score} {lastMatch.win ? 'WIN' : 'LOSS'}
              </div>
              <div style={{ marginTop: 6, color: C.inkDim, fontFamily: fontSans, fontSize: 13 }}>
                vs. {lastMatch.name
                  .replace('.', '')
                  .split(' ')
                  .map(w => w[0] + w.slice(1).toLowerCase())
                  .join(' ')}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 12, color: C.inkDim, fontFamily: fontSans, fontSize: 13 }}>
              Aucun match récent
            </div>
          )}
        </Card>
        </button>
        <button onClick={() => showToast(`Daily goal: ${dailyGoalPct}% \u2014 ${dailyGoalPct === 0 ? 'commence !' : 'keep going!'}`)} style={{ all: 'unset', cursor: 'pointer' }}>
        <Card style={{ padding: 18 }}>
          <div style={kicker}>DAILY GOAL</div>
          <div style={{ height: 6, background: 'rgba(184,220,197,0.18)', borderRadius: 99, marginTop: 18, overflow: 'hidden' }}>
            <div style={{ width: `${dailyGoalPct}%`, height: '100%', background: `linear-gradient(90deg, ${C.mintDeep}, ${C.mint})`, borderRadius: 99 }} />
          </div>
          <div style={{ marginTop: 10, color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 14, letterSpacing: '0.06em' }}>{dailyGoalPct}% COMPLETE</div>
        </Card>
        </button>
      </div>

      {/* Next session — défi accepté > défi en attente > club session */}
      {nextChallenge ? (
        <button onClick={() => onNav('chat')}
          style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
          <Card style={{
            padding: 18,
            background: 'linear-gradient(180deg, rgba(232,201,155,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, #193E2F 0%, #143226 100%)',
            border: '1px solid rgba(232,201,155,0.35)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={kicker}>NEXT MATCH</div>
              <span style={{
                fontFamily: fontSans, fontWeight: 800, fontSize: 10,
                color: C.warm, background: 'rgba(232,201,155,0.18)',
                border: '1px solid rgba(232,201,155,0.40)',
                padding: '3px 9px', borderRadius: 999, letterSpacing: '0.10em',
              }}>DÉFI ACCEPTÉ</span>
            </div>
            <div style={{
              marginTop: 4, color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 16,
            }}>vs {nextChallenge.full || `${nextChallenge.from}${nextChallenge.from === 'Marc' ? ' Leclerc' : ''}`}</div>
            <div style={{
              marginTop: 6, color: C.inkDim, fontFamily: fontSans, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.warm }}>
                {Icon.calendar(13)} <span style={{ color: C.ink }}>{nextChallenge.date}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.warm }}>
                {Icon.pin(13)} <span style={{ color: C.ink }}>{nextChallenge.venue}</span>
              </span>
            </div>
            {(nextChallenge.format || nextChallenge.enjeu) && (
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                {nextChallenge.format && <span style={{
                  fontFamily: fontSans, fontSize: 11, fontWeight: 700, color: C.ink,
                  background: 'rgba(8,22,17,0.5)', border: `1px solid ${C.border}`,
                  padding: '4px 9px', borderRadius: 7,
                }}>{nextChallenge.format}</span>}
                {nextChallenge.enjeu && <span style={{
                  fontFamily: fontSans, fontSize: 11, fontWeight: 700, color: C.warm,
                  background: 'rgba(232,201,155,0.10)', border: '1px solid rgba(232,201,155,0.30)',
                  padding: '4px 9px', borderRadius: 7,
                }}>{nextChallenge.enjeu}</span>}
              </div>
            )}
          </Card>
        </button>
      ) : pendingChallenge ? (
        <button onClick={() => onNav('chat')}
          style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
          <Card style={{
            padding: 18,
            background: 'linear-gradient(180deg, rgba(66,133,244,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, #193E2F 0%, #143226 100%)',
            border: '1px solid rgba(66,133,244,0.40)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={kicker}>DÉFI EN ATTENTE</div>
              <span style={{
                fontFamily: fontSans, fontWeight: 800, fontSize: 10,
                color: '#7DA9F4', background: 'rgba(66,133,244,0.18)',
                border: '1px solid rgba(66,133,244,0.40)',
                padding: '3px 9px', borderRadius: 999, letterSpacing: '0.10em',
              }}>À TRAITER</span>
            </div>
            <div style={{
              marginTop: 4, color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 16,
            }}>{pendingChallenge.from} te défie</div>
            <div style={{
              marginTop: 6, color: C.inkDim, fontFamily: fontSans, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#7DA9F4' }}>
                {Icon.calendar(13)} <span style={{ color: C.ink }}>{pendingChallenge.date}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#7DA9F4' }}>
                {Icon.pin(13)} <span style={{ color: C.ink }}>{pendingChallenge.venue}</span>
              </span>
            </div>
            <div style={{
              marginTop: 10, color: '#7DA9F4', fontFamily: fontSans, fontSize: 12, fontWeight: 700,
              letterSpacing: '0.04em',
            }}>Tape ici pour répondre →</div>
          </Card>
        </button>
      ) : (
        <button onClick={() => openSheet({ title: 'NEXT CLUB SESSION', body: <SessionSheet /> })}
          style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
          <Card style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={kicker}>NEXT CLUB SESSION</div>
                <div style={{ marginTop: 8, color: C.ink, fontFamily: fontSans, fontWeight: 700, fontSize: 16, letterSpacing: '0.04em' }}>LE MARAIS PING</div>
                <div style={{ color: C.inkDim, fontFamily: fontSans, fontSize: 13, marginTop: 2 }}>Tomorrow, 18:30</div>
              </div>
              <div style={{ color: C.inkDim }}>{Icon.calendar(26)}</div>
            </div>
          </Card>
        </button>
      )}

      {/* Training volume */}
      <button onClick={() => showToast(`Training volume: ${trainingHours}h this week`)}
        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
      <Card style={{ padding: 18 }}>
        <div style={kicker}>TRAINING VOLUME</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{
            fontFamily: fontDisplay, fontWeight: 800, fontSize: 46,
            color: C.ink, letterSpacing: '0.01em', lineHeight: 1,
          }}>{trainingHours}H</div>
          <div style={{ color: C.cream, fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.14em' }}>THIS WEEK</div>
        </div>
      </Card>
      </button>
    </div>
  );
}
