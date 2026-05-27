import { C, fontDisplay, fontSans, kicker, btnPrimary, btnGhost } from '../theme';
import { Icon } from '../icons';
import { useUI } from '../components/uiContext';
import { ProfileSheet } from '../components/TopBar';
import Card from '../components/Card';
import { PaddleSVG } from '../components/SVGIllustrations';
import { useAcceptedChallenges, useIncomingChallenges } from '../lib/challenges';
import { useMatches } from '../lib/matches';
import { useAuth } from '../lib/auth';
import StreakCard from '../components/StreakCard';
import { useLoginStreak } from '../lib/loginStreak';
import { MERCH_CATEGORIES, useMerchCatalog } from '../lib/merchCatalog';
import MerchScreen from './MerchScreen';

function StatRow({ label, value, valueFont = fontSans }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={{ ...kicker }}>{label}</div>
      <div style={{
        fontFamily: valueFont, fontWeight: valueFont === fontDisplay ? 800 : 700,
        fontSize: valueFont === fontDisplay ? 19 : 17,
        color: C.ink, letterSpacing: valueFont === fontDisplay ? '0.02em' : '0',
      }}>{value}</div>
    </div>
  );
}

function MerchPreviewCard({ category, products, onOpen, wide = false }) {
  const product = products.find(item => item.isAvailable && item.main_image_url) || products.find(item => item.main_image_url);
  const count = products.length;

  return (
    <button onClick={() => onOpen(category.id)} style={{
      all: 'unset', cursor: 'pointer', display: 'block', minWidth: 0,
      gridColumn: wide ? '1 / -1' : 'auto',
    }}>
      <Card style={{
        position: 'relative',
        minHeight: wide ? 112 : 124,
        padding: 16,
        overflow: 'hidden',
        borderRadius: 14,
        background: `radial-gradient(80% 80% at 86% 10%, ${category.accent}22 0%, rgba(20,50,38,0) 58%), linear-gradient(180deg, #0E3A30 0%, #124638 100%)`,
        display: 'flex',
        alignItems: 'flex-end',
      }}>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: wide ? 58 : 36, height: wide ? 58 : 36,
          borderRadius: wide ? 16 : 12,
          overflow: 'hidden',
          background: `${category.accent}33`,
          border: `1px solid ${category.accent}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {product ? (
            <img src={product.main_image_url} alt="" loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{
              width: wide ? 28 : 18, height: wide ? 34 : 22,
              borderRadius: '45% 45% 6px 6px',
              background: category.accent,
              display: 'block',
            }} />
          )}
        </div>

        <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: fontSans, fontWeight: 900, fontSize: 12,
            color: C.ink, letterSpacing: '0.04em',
          }}>{category.label}</div>
          <div style={{
            fontFamily: fontSans, fontSize: 11,
            color: C.inkDim, marginTop: 3,
          }}>{count || '...'} {count > 1 ? 'pièces' : 'pièce'}</div>
          {wide && (
            <div style={{
              fontFamily: fontSans, fontSize: 10.5,
              color: C.inkDim, marginTop: 8,
              maxWidth: 185, lineHeight: 1.35,
            }}>{category.description}</div>
          )}
        </div>
      </Card>
    </button>
  );
}

function HomeBoutiquePreview() {
  const { byCategory } = useMerchCatalog();
  const { openSheet } = useUI();
  const openMerchPopup = (categoryId = 'apparel') => {
    openSheet({
      title: 'BOUTIQUE',
      closeAll: true,
      body: <MerchScreen initialCategory={categoryId} standalone />,
    });
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 26,
          color: C.ink, letterSpacing: '0.08em',
        }}>BOUTIQUE</div>
        <button onClick={() => openMerchPopup('apparel')} style={{
          all: 'unset', cursor: 'pointer',
          fontFamily: fontSans, fontWeight: 800, fontSize: 10.5,
          color: C.warm,
        }}>Voir tout →</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {MERCH_CATEGORIES.map((category, index) => (
          <MerchPreviewCard
            key={category.id}
            category={category}
            products={byCategory[category.id] || []}
            onOpen={() => openMerchPopup(category.id)}
            wide={index === 2}
          />
        ))}
      </div>
    </section>
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
  // ELO RATING : toujours la vraie valeur du profil.
  const eloDisplay = `${elo}`;
  const fftt = profile?.fftt_classification || (isClubPlayer ? '—' : 'Non classé');
  // Streak : valeur réelle du hook de connexion, cohérente avec la carte Streak.
  const { current: streakDays } = useLoginStreak();
  // Daily goal : basé sur l'activité (profil ou matchs enregistrés)
  const hasActivity = hasMatches || matches.length > 0;
  const dailyGoalPct = hasActivity ? 75 : 0;
  const nextChallenge = acceptedChallenges[0];        // priorité 1 : défi accepté
  const pendingChallenge = incomingChallenges[0];     // priorité 2 : défi en attente
  const lastMatch = matches[0];                       // match le plus récent
  // Stats joueur : on utilise les compteurs du profil, sinon on retombe sur la liste de matchs.
  const playedCount = hasMatches ? matchesPlayed : matches.length;
  const wonCount = hasMatches ? (profile?.matches_won ?? 0) : matches.filter(m => m.win).length;
  const winRatePct = playedCount ? Math.round((wonCount / playedCount) * 100) : 0;
  return (
    <div style={{ padding: '20px 18px 130px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Active player */}
      <button onClick={() => openSheet({ title: displayName, body: <ProfileSheet /> })}
        style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
      <Card style={{ padding: '16px 18px' }}>
        <div style={kicker}>ACTIVE PLAYER</div>
        <div style={{
          fontFamily: fontDisplay, fontWeight: 800, fontSize: 42, lineHeight: 0.95,
          color: C.mint, letterSpacing: '0.01em', marginTop: 4, marginBottom: 14,
        }}>{firstName}</div>

        <StatRow label="ELO RATING" value={eloDisplay} />
        <div style={{ height: 1, background: C.border, margin: '10px 0' }} />
        <StatRow label="GLOBAL RANK" value={fftt} valueFont={fontDisplay} />

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          marginTop: 12,
          padding: '6px 14px', borderRadius: 999,
          background: 'rgba(239,229,200,0.12)',
          border: '1px solid rgba(239,229,200,0.32)',
          color: C.cream,
          fontFamily: fontSans, fontWeight: 700, fontSize: 11, letterSpacing: '0.10em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: C.cream }} />
          STREAK: {streakDays} {streakDays === 1 ? 'DAY' : 'DAYS'}
        </div>
      </Card>
      </button>

      {/* Streak de connexion (changement 2) — incite au retour quotidien */}
      <StreakCard displayName={firstName} />

      {/* CTA */}
      <div style={{
        position: 'relative', borderRadius: 22, overflow: 'hidden',
        border: `1px solid ${C.border}`,
        background: C.card,
      }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <PaddleSVG />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(60% 50% at 50% 35%, rgba(245,246,243,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, rgba(20,50,38,0) 40%, rgba(20,50,38,0.85) 90%)',
          }} />
        </div>
        <div style={{ position: 'relative', padding: 14 }}>
          <button onClick={() => onNav('train')} style={{
            width: '100%', padding: '18px 20px', borderRadius: 16,
            background: C.mint, border: 'none',
            color: '#092C25',
            fontFamily: fontSans, fontWeight: 700, fontSize: 14,
            letterSpacing: '0.18em', cursor: 'pointer',
            boxShadow: '0 0 32px rgba(245,246,243,0.35), 0 10px 30px rgba(0,0,0,0.3)',
          }}>QUICK START TRAINING</button>
        </div>
      </div>

      {/* Last match + Daily goal — design enrichi (changement 4) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* LAST MATCH : avatar adverse, score, delta ELO, h2h, lieu, format */}
        <button onClick={() => onNav('matches')} style={{ all: 'unset', cursor: 'pointer' }}>
        <Card style={{
          padding: 14,
          background: lastMatch
            ? (lastMatch.win
                ? 'linear-gradient(180deg, rgba(245,246,243,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, #0E3A30 0%, #124638 100%)'
                : 'linear-gradient(180deg, rgba(232,155,139,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, #0E3A30 0%, #124638 100%)')
            : undefined,
          border: lastMatch
            ? `1px solid ${lastMatch.win ? 'rgba(245,246,243,0.30)' : 'rgba(232,155,139,0.30)'}`
            : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={kicker}>LAST MATCH</div>
            {lastMatch && (
              <span style={{
                fontFamily: fontSans, fontWeight: 800, fontSize: 9.5,
                color: lastMatch.win ? '#092C25' : '#fff',
                background: lastMatch.win ? C.mint : C.loss,
                padding: '2px 7px', borderRadius: 999, letterSpacing: '0.08em',
              }}>{lastMatch.win ? 'WIN' : 'LOSS'}</span>
            )}
          </div>

          {lastMatch ? (
            <>
              {/* Adversaire : avatar coloré + initiales */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: `radial-gradient(60% 60% at 35% 30%, ${lastMatch.color?.[0] || C.mint} 0%, ${lastMatch.color?.[1] || C.mintDeep} 70%, #092C25 100%)`,
                  border: `1.5px solid ${C.borderHi}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#092C25', fontFamily: fontSans, fontWeight: 800, fontSize: 11,
                }}>{lastMatch.initials || (lastMatch.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: fontSans, fontWeight: 700, fontSize: 12.5, color: C.ink,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{(lastMatch.name || '').replace('.', '').split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ')}</div>
                  <div style={{ fontFamily: fontSans, fontSize: 10.5, color: C.inkDim, marginTop: 1 }}>
                    {lastMatch.when || 'récemment'}{lastMatch.format ? ` · ${lastMatch.format}` : ''}
                  </div>
                </div>
              </div>

              {/* Score + delta ELO */}
              <div style={{
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
                marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`,
              }}>
                <div style={{
                  fontFamily: fontDisplay, fontWeight: 800, fontSize: 26,
                  color: C.ink, letterSpacing: '0.01em',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>{lastMatch.score}</div>
                {Number.isFinite(lastMatch.elo) && (
                  <div style={{
                    fontFamily: fontSans, fontWeight: 800, fontSize: 13,
                    color: lastMatch.elo >= 0 ? C.mint : C.loss,
                    whiteSpace: 'nowrap',
                  }}>{lastMatch.elo >= 0 ? '+' : ''}{lastMatch.elo} ELO</div>
                )}
              </div>

              {/* H2H si dispo, sinon lieu */}
              <div style={{
                marginTop: 8, fontFamily: fontSans, fontSize: 10.5, color: C.inkDim,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {lastMatch.h2h
                  ? <>H2H {lastMatch.h2h.record} · {lastMatch.h2h.winRate}% win</>
                  : (lastMatch.where && <><span style={{ color: C.warm }}>{Icon.pin(11)}</span> {lastMatch.where}</>)}
              </div>
            </>
          ) : (
            <div style={{ marginTop: 14, color: C.inkDim, fontFamily: fontSans, fontSize: 12.5, lineHeight: 1.45 }}>
              Aucun match récent.
            </div>
          )}
        </Card>
        </button>

        {/* DAILY GOAL : stats profil + progression jour */}
        <button onClick={() => showToast(`Daily goal: ${dailyGoalPct}%`)} style={{ all: 'unset', cursor: 'pointer' }}>
        <Card style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={kicker}>STATS JOUEUR</div>
            <span style={{
              fontFamily: fontSans, fontWeight: 800, fontSize: 9.5,
              color: C.warm, background: 'rgba(232,201,155,0.12)',
              border: '1px solid rgba(232,201,155,0.35)',
              padding: '2px 7px', borderRadius: 999, letterSpacing: '0.08em',
            }}>{profile?.player_type === 'competition' ? 'CLUB' : 'AMATEUR'}</span>
          </div>

          {/* Grand chiffre : ELO actuel */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <div style={{
              fontFamily: fontDisplay, fontWeight: 800, fontSize: 32, color: C.ink, lineHeight: 1,
            }}>{elo}</div>
            <div style={{ fontFamily: fontSans, fontSize: 10.5, color: C.inkDim }}>ELO</div>
          </div>

          {/* Win rate + matchs joués en deux mini-stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <div>
              <div style={{ fontFamily: fontSans, fontSize: 9.5, color: C.inkDim, letterSpacing: '0.10em', fontWeight: 700 }}>WIN RATE</div>
              <div style={{ fontFamily: fontSans, fontWeight: 800, fontSize: 14, color: C.ink, marginTop: 2 }}>
                {playedCount ? `${winRatePct}%` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: fontSans, fontSize: 9.5, color: C.inkDim, letterSpacing: '0.10em', fontWeight: 700 }}>MATCHS</div>
              <div style={{ fontFamily: fontSans, fontWeight: 800, fontSize: 14, color: C.ink, marginTop: 2 }}>
                {playedCount}
              </div>
            </div>
          </div>

          {/* Mini barre objectif quotidien */}
          <div style={{ marginTop: 12 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: fontSans, fontSize: 9.5, color: C.inkDim,
              letterSpacing: '0.08em', fontWeight: 700,
            }}>
              <span>OBJECTIF DU JOUR</span>
              <span style={{ color: dailyGoalPct >= 100 ? C.mint : C.inkDim }}>{dailyGoalPct}%</span>
            </div>
            <div style={{
              height: 5, background: 'rgba(245,246,243,0.18)',
              borderRadius: 99, marginTop: 6, overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(100, dailyGoalPct)}%`, height: '100%',
                background: `linear-gradient(90deg, ${C.mintDeep}, ${C.mint})`, borderRadius: 99,
              }} />
            </div>
          </div>
        </Card>
        </button>
      </div>

      {/* Next session — défi accepté > défi en attente > club session */}
      {nextChallenge ? (
        <button onClick={() => onNav('chat')}
          style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
          <Card style={{
            padding: 18,
            background: 'linear-gradient(180deg, rgba(232,201,155,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, #0E3A30 0%, #124638 100%)',
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
            background: 'linear-gradient(180deg, rgba(66,133,244,0.10) 0%, rgba(20,50,38,0) 70%), linear-gradient(180deg, #0E3A30 0%, #124638 100%)',
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

      <HomeBoutiquePreview />
    </div>
  );
}
