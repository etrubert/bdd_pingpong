import { useEffect, useMemo, useRef, useState } from 'react';
import { C, fontDisplay, fontSans, fontItalic, kicker, iconBtn } from '../theme';
import { Icon } from '../icons';
import { useUI } from './uiContext';

const FRIENDS_TOTAL = 42;

const COLOR_BLUE   = ['#a8c2db', '#3b5a7a', '#0d1a2a'];
const COLOR_RED    = ['#d6a8a8', '#7a3b3b', '#2a0d0d'];
const COLOR_GREEN  = ['#bedba8', '#5a7a3b', '#1a2a0d'];
const COLOR_BROWN  = ['#d6c0a8', '#7a5e3b', '#2a1f0d'];
const COLOR_INDIGO = ['#a8b8d6', '#3b4d7a', '#0d142a'];
const COLOR_OCHRE  = ['#d6b890', '#6b4a2e', '#1c100a'];
const COLOR_GREY   = ['#cccccc', '#666666', '#222222'];

const FRIENDS = [
  { name: 'Marc L.',   full: 'Marc Leclerc',   elo: 1520, online: true,  color: COLOR_BLUE   },
  { name: 'Sophie M.', full: 'Sophie Martin',  elo: 1380, online: false, color: COLOR_RED    },
  { name: 'Theo R.',   full: 'Theo Rousseau',  elo: 1612, online: true,  color: COLOR_GREEN  },
  { name: 'Lea P.',    full: 'Lea Petit',      elo: 1290, online: false, color: COLOR_BROWN  },
];

const FRIENDS_ALL = [
  ...FRIENDS,
  { name: 'Karim B.',   full: 'Karim Benali',    elo: 1475, online: true,  color: COLOR_INDIGO },
  { name: 'Julie D.',   full: 'Julie Dupont',    elo: 1340, online: false, color: COLOR_OCHRE  },
  { name: 'Hugo T.',    full: 'Hugo Tran',       elo: 1580, online: false, color: COLOR_BLUE   },
  { name: 'Ines F.',    full: 'Ines Fernandez',  elo: 1410, online: true,  color: COLOR_RED    },
  { name: 'Pierre G.',  full: 'Pierre Garnier',  elo: 1655, online: false, color: COLOR_GREEN  },
  { name: 'Camille V.', full: 'Camille Vidal',   elo: 1225, online: false, color: COLOR_BROWN  },
  { name: 'Lucas B.',   full: 'Lucas Bernard',   elo: 1495, online: true,  color: COLOR_INDIGO },
  { name: 'Manon S.',   full: 'Manon Simon',     elo: 1360, online: false, color: COLOR_OCHRE  },
];

const MATCHES_ALL = [
  { opp: 'Marc Leclerc',   eloOpp: 1520, score: '3-1', delta: +18, win: true,  loc: 'Le Marais Ping · Table 3',  when: 'Hier · 19h30',  color: COLOR_BLUE  },
  { opp: 'Sophie Martin',  eloOpp: 1380, score: '3-0', delta: +12, win: true,  loc: 'Bastille TT · Table 1',     when: 'Dim. · 14h00',  color: COLOR_RED   },
  { opp: 'Theo Rousseau',  eloOpp: 1612, score: '1-3', delta: -9,  win: false, loc: 'Le Marais Ping · Table 1',  when: 'Sam. · 20h15',  color: COLOR_GREEN },
  { opp: 'Lea Petit',      eloOpp: 1290, score: '3-2', delta: +8,  win: true,  loc: 'Cafe Oberkampf · Loisir',   when: 'Ven. · 18h45',  color: COLOR_BROWN },
  { opp: 'Karim Benali',   eloOpp: 1475, score: '3-2', delta: +11, win: true,  loc: 'Le Marais Ping · Table 2',  when: 'Jeu. · 20h00',  color: COLOR_INDIGO},
  { opp: 'Pierre Garnier', eloOpp: 1655, score: '0-3', delta: -14, win: false, loc: 'Levallois TT',              when: 'Mer. · 19h15',  color: COLOR_GREEN },
  { opp: 'Julie Dupont',   eloOpp: 1340, score: '3-1', delta: +9,  win: true,  loc: 'Bastille TT · Table 3',     when: 'Mar. · 19h30',  color: COLOR_OCHRE },
  { opp: 'Hugo Tran',      eloOpp: 1580, score: '2-3', delta: -7,  win: false, loc: 'Le Marais Ping · Table 1',  when: 'Lun. · 18h45',  color: COLOR_BLUE  },
  { opp: 'Ines Fernandez', eloOpp: 1410, score: '3-0', delta: +10, win: true,  loc: 'Cafe Oberkampf · Loisir',   when: '11 mai · 14h',  color: COLOR_RED   },
  { opp: 'Lucas Bernard',  eloOpp: 1495, score: '3-1', delta: +13, win: true,  loc: 'Le Marais Ping · Table 2',  when: '09 mai · 20h',  color: COLOR_INDIGO},
];

const CONVERSATIONS = [
  { full: 'Marc Leclerc',   color: COLOR_BLUE,   online: true,  preview: 'Defi propose · Samedi 14h',                  when: '2 min', unread: true,  isDefi: true,  isClub: false, fromMe: false },
  { full: 'Theo Rousseau',  color: COLOR_GREEN,  online: true,  preview: 'GG pour hier ! Revanche quand tu veux 🏓',   when: '12 min',unread: true,  isDefi: false, isClub: false, fromMe: false },
  { full: 'Sophie Martin',  color: COLOR_RED,    online: false, preview: 'Defi a confirmer · Dim. 11h',                when: '1 h',   unread: true,  isDefi: true,  isClub: false, fromMe: false },
  { full: 'Karim Benali',   color: COLOR_INDIGO, online: true,  preview: 'Toi : Ok ca marche, a demain 👌',            when: '3 h',   unread: false, isDefi: false, isClub: false, fromMe: true  },
  { full: 'Lea Petit',      color: COLOR_BROWN,  online: false, preview: 'Message vocal · 0:24',                       when: 'Hier',  unread: false, isDefi: false, isClub: false, fromMe: false, voice: true },
  { full: 'Equipe 2 · Marais', color: COLOR_OCHRE,colorB: COLOR_GREEN, online: false, preview: 'Coach : Entrainement jeudi 19h confirme', when: 'Hier', unread: false, isDefi: false, isClub: true, fromMe: false },
  { full: 'Antoine D.',     color: COLOR_GREY,   online: false, preview: "Salut, j'ai vu ton profil sur l'app...",     when: '2 j',   unread: false, isDefi: false, isClub: false, fromMe: false, isDemande: true },
];

const MATCHES = [
  { opp: 'Marc Leclerc',   eloOpp: 1520, score: '3-1', delta: +18, win: true,  loc: 'Le Marais Ping · Table 3',  when: 'Hier · 19h30',  color: ['#a8c2db', '#3b5a7a', '#0d1a2a'] },
  { opp: 'Sophie Martin',  eloOpp: 1380, score: '3-0', delta: +12, win: true,  loc: 'Bastille TT · Table 1',     when: 'Dim. · 14h00',  color: ['#d6a8a8', '#7a3b3b', '#2a0d0d'] },
  { opp: 'Theo Rousseau',  eloOpp: 1612, score: '1-3', delta: -9,  win: false, loc: 'Le Marais Ping · Table 1',  when: 'Sam. · 20h15',  color: ['#bedba8', '#5a7a3b', '#1a2a0d'] },
  { opp: 'Lea Petit',      eloOpp: 1290, score: '3-2', delta: +8,  win: true,  loc: 'Cafe Oberkampf · Loisir',   when: 'Ven. · 18h45',  color: ['#d6c0a8', '#7a5e3b', '#2a1f0d'] },
];

const BADGES = [
  { label: "Tournoi Marais '24", featured: true },
  { label: '100 matchs',         featured: false },
  { label: 'Serie x5',           featured: false },
];

const STATS = {
  total:    100,
  wins:     68,
  losses:   32,
  winrate:  68,
};

function FriendAvatar({ color, online, size = 56 }) {
  const [light, mid, dark] = color;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
        border: `1.5px solid ${C.borderHi}`,
      }} />
      {online && (
        <div style={{
          position: 'absolute', right: 1, bottom: 1,
          width: 12, height: 12, borderRadius: '50%',
          background: '#3DD16B', border: '2px solid #143226',
        }} />
      )}
    </div>
  );
}

const CTA_URL = 'https://pingpang.paris/account/login';

function SectionHeader({ label, badge, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={kicker}>{label}</span>
        {badge !== undefined && (
          <span style={{
            fontFamily: fontSans, fontWeight: 800, fontSize: 11,
            color: C.warm, background: 'rgba(232,201,155,0.14)',
            border: '1px solid rgba(232,201,155,0.32)',
            padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em',
          }}>{badge}</span>
        )}
      </div>
      <button onClick={onClick} style={{
        all: 'unset', cursor: 'pointer',
        fontFamily: fontSans, fontSize: 13, fontWeight: 600,
        color: C.warm,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>Tout voir
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1 }}>
          <path d="M9 6l6 6-6 6"/>
        </svg>
      </button>
    </div>
  );
}

function StatTile({ value, label, color, bg }) {
  return (
    <div style={{
      flex: 1, padding: '16px 8px', textAlign: 'center',
      borderRadius: 14, background: bg, border: `1px solid ${C.border}`,
    }}>
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, fontSize: 26,
        color, letterSpacing: '0.02em', lineHeight: 1,
      }}>{value}</div>
      <div style={{
        marginTop: 6,
        fontFamily: fontSans, fontSize: 10.5, fontWeight: 700,
        color: C.inkDim, letterSpacing: '0.18em',
      }}>{label}</div>
    </div>
  );
}

function MatchRow({ m }) {
  const accent = m.win ? '#3DD16B' : '#E89B8B';
  const [light, mid, dark] = m.color;
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: C.card, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
          border: `1.5px solid ${C.borderHi}`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>vs {m.opp}</div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>{m.eloOpp} ELO</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: fontSans, fontWeight: 800, fontSize: 16, color: accent }}>{m.score}</div>
          <div style={{ fontFamily: fontSans, fontSize: 11, color: accent, marginTop: 2, fontWeight: 700 }}>
            {m.delta > 0 ? '+' : ''}{m.delta} ELO
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 14px', borderTop: `1px solid ${C.border}`,
        background: 'rgba(8,22,17,0.35)',
        fontFamily: fontSans, fontSize: 11.5, color: C.inkDim,
      }}>
        <span>{m.loc}</span>
        <span>{m.when}</span>
      </div>
    </div>
  );
}

// ---------- Helper icons ----------
const ChatIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12c0 4.5-4 8-9 8-1.4 0-2.7-.3-3.9-.8L3 21l1.8-5.1C3.7 14.6 3 13.4 3 12c0-4.5 4-8 9-8s9 3.5 9 8z"/>
  </svg>
);
const SwordsIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 17.5l4 4 3-3-4-4"/>
    <path d="M3 5l6 6 4-4-6-6L3 3v2z"/>
    <path d="M11 13l-8 8"/>
    <path d="M9.5 17.5l-4 4-3-3 4-4"/>
    <path d="M21 5l-6 6-4-4 6-6 2-2v2z"/>
    <path d="M13 13l8 8"/>
  </svg>
);
const SearchIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>
  </svg>
);
const MicIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
  </svg>
);

// ---------- Reusable bits ----------
function SearchInput({ placeholder }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 999,
      background: 'rgba(8,22,17,0.45)', border: `1px solid ${C.border}`,
    }}>
      <span style={{ color: C.inkFaint, display: 'flex' }}><SearchIcon /></span>
      <input type="text" placeholder={placeholder} style={{
        all: 'unset', flex: 1, fontFamily: fontSans, fontSize: 14, color: C.ink,
      }} />
    </div>
  );
}

function BackToProfileBtn() {
  const { openSheet } = useUI();
  return (
    <button onClick={() => openSheet({ title: 'EUGENIA SOREL', body: <ProfileSheet /> })}
            style={{
              all: 'unset', cursor: 'pointer',
              fontFamily: fontSans, fontSize: 13, fontWeight: 700,
              color: C.mint, letterSpacing: '0.08em',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 6l-6 6 6 6"/>
      </svg>
      Profil
    </button>
  );
}

// ---------- Views ----------
function FriendRowItem({ f, actionIcon, actionLabel, onClickAction }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 14,
      background: C.card, border: `1px solid ${C.border}`,
    }}>
      <FriendAvatar color={f.color} online={f.online} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.full || f.name}</div>
        <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
          {f.elo} ELO{f.online ? ' · en ligne' : ''}
        </div>
      </div>
      <button onClick={onClickAction} style={{
        all: 'unset', cursor: 'pointer',
        padding: '8px 12px', borderRadius: 10,
        border: `1px solid ${C.borderHi}`, color: C.cream,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: fontSans, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
      }}>{actionIcon}{actionLabel}</button>
    </div>
  );
}

function FriendsListView() {
  const { openSheet } = useUI();
  const onlineCount = FRIENDS_ALL.filter(f => f.online).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackToProfileBtn />
      <div>
        <div style={kicker}>AMIS</div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 36, lineHeight: 1, color: C.ink, marginTop: 4 }}>
          {FRIENDS_ALL.length} amis
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6 }}>
          <span style={{ color: '#3DD16B' }}>●</span> {onlineCount} en ligne · prets a jouer
        </div>
      </div>
      <SearchInput placeholder="Rechercher un ami..." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FRIENDS_ALL.map(f => (
          <FriendRowItem
            key={f.name}
            f={f}
            actionIcon={<ChatIcon size={14} />}
            actionLabel="Message"
            onClickAction={() => openSheet({ title: f.full || f.name, body: <ChatView contact={f} /> })}
          />
        ))}
      </div>
    </div>
  );
}

function MatchesListView() {
  const [filter, setFilter] = useState('all'); // all | wins | losses
  const filtered = MATCHES_ALL.filter(m => filter === 'all' || (filter === 'wins' ? m.win : !m.win));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackToProfileBtn />
      <div>
        <div style={kicker}>HISTORIQUE</div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 36, lineHeight: 1, color: C.ink, marginTop: 4 }}>
          {STATS.total} matchs
        </div>
        <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 6 }}>
          {STATS.wins}V / {STATS.losses}D · {STATS.winrate}% winrate
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: 'all',    label: 'Tous' },
          { id: 'wins',   label: 'Victoires' },
          { id: 'losses', label: 'Defaites' },
        ].map(t => {
          const active = filter === t.id;
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
              padding: '10px', borderRadius: 12,
              border: `1px solid ${active ? C.cream : C.border}`,
              background: active ? 'rgba(239,229,200,0.14)' : 'rgba(8,22,17,0.45)',
              color: active ? C.cream : C.ink,
              fontFamily: fontSans, fontWeight: 700, fontSize: 12, letterSpacing: '0.08em',
            }}>{t.label}</button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((m, i) => <MatchRow key={i} m={m} />)}
      </div>
    </div>
  );
}

function ChallengeView() {
  const { openSheet } = useUI();
  const openChallenge = (opp) => openSheet({ title: 'Nouveau defi', body: <NewChallengeView opponent={opp} /> });
  const SUGGESTED = [
    { name: 'Nicolas R.', full: 'Nicolas Roux',   elo: 1465, online: true,  color: COLOR_BLUE   },
    { name: 'Emma C.',    full: 'Emma Chevalier', elo: 1432, online: false, color: COLOR_RED    },
    { name: 'Yanis M.',   full: 'Yanis Mahmoudi', elo: 1488, online: true,  color: COLOR_INDIGO },
  ];
  const STRANGER = { name: 'Joueur inconnu', full: 'Joueur a inviter', elo: 1450, online: false, color: COLOR_GREY };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BackToProfileBtn />
      <div>
        <div style={kicker}>DEFIER</div>
        <div style={{ fontFamily: fontDisplay, fontWeight: 800, fontSize: 36, lineHeight: 1, color: C.ink, marginTop: 4 }}>
          Trouver un adversaire
        </div>
      </div>

      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>MES AMIS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FRIENDS_ALL.slice(0, 6).map(f => (
            <FriendRowItem
              key={f.name}
              f={f}
              actionIcon={<SwordsIcon size={14} />}
              actionLabel="Defier"
              onClickAction={() => openChallenge(f)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ ...kicker, marginBottom: 10 }}>RECHERCHER UN ADVERSAIRE</div>
        <SearchInput placeholder="Nom, ELO, club..." />
        <div style={{ marginTop: 10, fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>
          Suggestions pres de ton niveau (1400-1500 ELO) :
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {SUGGESTED.map(p => (
            <FriendRowItem
              key={p.name}
              f={p}
              actionIcon={<SwordsIcon size={14} />}
              actionLabel="Defier"
              onClickAction={() => openChallenge(p)}
            />
          ))}

          {/* + Defier un joueur externe (non-ami) */}
          <button onClick={() => openChallenge(STRANGER)} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 14px', borderRadius: 14,
            background: 'transparent', border: `1.5px dashed ${C.warm}`,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: `1.5px dashed ${C.warm}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.warm, fontSize: 22, fontWeight: 700,
            }}>+</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.warm }}>
                Defier un joueur externe
              </div>
              <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
                Envoyer une invitation a quelqu'un qui n'est pas encore ami
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Mock venues for challenge form
const VENUES = [
  { name: 'Le Marais Ping',  addr: '12 rue des Tournelles', km: 1.2, tables: 'Table 3 dispo',  hint: 'Vous y jouez tous les deux', online: true },
  { name: 'Bastille TT',     addr: '8 tables',              km: 1.8, tables: null,              hint: null },
  { name: 'Cafe Oberkampf',  addr: 'Bar avec table',        km: 2.1, tables: null,              hint: null },
];

function getNextDays(n = 5) {
  const days = [];
  const labels = ['DIM','LUN','MAR','MER','JEU','VEN','SAM'];
  const today = new Date();
  for (let i = 1; i <= n; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({ label: labels[d.getDay()], num: d.getDate(), iso: d.toISOString().slice(0,10) });
  }
  return days;
}

function NewChallengeView({ opponent }) {
  const { openSheet, showToast, closeSheet } = useUI();
  const [format, setFormat] = useState('BO5');
  const [enjeu,  setEnjeu]  = useState('classe');
  const days = useMemo(() => getNextDays(5), []);
  const [day,    setDay]    = useState(days[2].iso);
  const [hour,   setHour]   = useState('14h');
  const [venue,  setVenue]  = useState(VENUES[0].name);
  const [message,setMessage]= useState('');

  const dayObj = days.find(d => d.iso === day) || days[0];
  const recap = `${dayObj.label[0] + dayObj.label.slice(1).toLowerCase()} ${dayObj.num} · ${hour} · ${venue}`;

  const ELO_GAIN = 14;
  const ELO_LOSS = 12;
  const PRONO = 52;

  const FORMATS = [
    { id: 'BO3',   sub: '~20 min' },
    { id: 'BO5',   sub: '~35 min' },
    { id: 'BO7',   sub: '~50 min' },
    { id: 'Libre', sub: 'A voir'  },
  ];
  const HOURS = ['10h','11h','14h','16h','19h','Autre'];

  const submit = () => {
    showToast(`Defi envoye a ${opponent.full || opponent.name}`);
    setTimeout(closeSheet, 300);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <button onClick={() => openSheet({ title: 'Defier', body: <ChallengeView /> })}
              style={{
                all: 'unset', cursor: 'pointer', alignSelf: 'flex-start',
                fontFamily: fontSans, fontSize: 13, fontWeight: 700,
                color: C.mint, letterSpacing: '0.08em',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
        Defier
      </button>

      {/* ADVERSAIRE */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>ADVERSAIRE</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px', borderRadius: 14,
          background: C.card, border: `1px solid ${C.border}`,
        }}>
          <FriendAvatar color={opponent.color} online={opponent.online} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 16, color: C.ink }}>{opponent.full || opponent.name}</div>
            <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim, marginTop: 4 }}>
              {opponent.elo} ELO{opponent.style ? ` · ${opponent.style}` : ' · Attaquant'}{opponent.rank ? ` · ${opponent.rank}` : ' · #24'}
            </div>
          </div>
        </div>
        {/* ELO impact tiles */}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <StatTile value={`+${ELO_GAIN} ELO`}  label="SI TU GAGNES" color="#3DD16B" bg="rgba(61,209,107,0.06)" />
          <StatTile value={`-${ELO_LOSS} ELO`}  label="SI TU PERDS"  color="#E89B8B" bg="rgba(232,155,139,0.06)" />
          <StatTile value={`${PRONO}%`}         label="PRONOSTIC"    color={C.warm}   bg="rgba(232,201,155,0.06)" />
        </div>
      </div>

      {/* FORMAT */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>FORMAT</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {FORMATS.map(f => {
            const active = format === f.id;
            return (
              <button key={f.id} onClick={() => setFormat(f.id)} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                padding: '12px 6px', borderRadius: 12,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? 'rgba(232,201,155,0.14)' : 'rgba(8,22,17,0.45)',
                color: active ? C.warm : C.ink,
                fontFamily: fontSans, fontWeight: 800, fontSize: 14,
              }}>
                <div>{f.id}</div>
                <div style={{ fontWeight: 500, fontSize: 11, color: C.inkDim, marginTop: 4 }}>{f.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ENJEU */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>ENJEU</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'classe',  label: 'Classe',  sub: "Compte pour l'ELO" },
            { id: 'amical',  label: 'Amical',  sub: 'Pas de gain/perte' },
          ].map(e => {
            const active = enjeu === e.id;
            return (
              <button key={e.id} onClick={() => setEnjeu(e.id)} style={{
                all: 'unset', cursor: 'pointer', flex: 1,
                padding: '12px 16px', borderRadius: 12,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? 'rgba(232,201,155,0.14)' : 'rgba(8,22,17,0.45)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: fontSans, fontWeight: 800, fontSize: 14,
                  color: active ? C.warm : C.ink,
                }}>
                  <span style={{ fontSize: 8 }}>●</span> {e.label}
                </div>
                <div style={{ fontSize: 12, color: C.inkDim, marginTop: 4 }}>{e.sub}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DATE */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>DATE PROPOSEE</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {days.map(d => {
            const active = day === d.iso;
            return (
              <button key={d.iso} onClick={() => setDay(d.iso)} style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                padding: '12px 4px', borderRadius: 12,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? C.warm : 'rgba(8,22,17,0.45)',
                color: active ? '#0C211A' : C.ink,
                fontFamily: fontSans,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', opacity: 0.8 }}>{d.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{d.num}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* HORAIRE */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>HORAIRE</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {HOURS.map(h => {
            const active = hour === h;
            return (
              <button key={h} onClick={() => setHour(h)} style={{
                all: 'unset', cursor: 'pointer',
                padding: '8px 16px', borderRadius: 999,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? C.warm : 'rgba(8,22,17,0.45)',
                color: active ? '#0C211A' : C.ink,
                fontFamily: fontSans, fontWeight: 700, fontSize: 13,
              }}>{h}</button>
            );
          })}
        </div>
        <div style={{ marginTop: 8, fontFamily: fontSans, fontSize: 12, color: '#3DD16B' }}>
          ● Creneau correspondant a vos dispos
        </div>
      </div>

      {/* LIEU */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={kicker}>LIEU</span>
          <span style={{ fontFamily: fontSans, fontSize: 13, fontWeight: 600, color: C.warm }}>Voir sur la carte</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {VENUES.map(v => {
            const active = venue === v.name;
            return (
              <button key={v.name} onClick={() => setVenue(v.name)} style={{
                all: 'unset', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 14,
                border: `1px solid ${active ? C.warm : C.border}`,
                background: active ? 'rgba(232,201,155,0.10)' : C.card,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(232,201,155,0.14)',
                  border: `1px solid ${active ? C.warm : C.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: active ? C.warm : C.inkFaint,
                }}>{Icon.pin(18)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>{v.name}</div>
                  <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
                    {v.addr} · {v.km} km
                  </div>
                  {(v.tables || v.hint) && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {v.tables && (
                        <span style={{
                          fontFamily: fontSans, fontSize: 11, fontWeight: 700,
                          color: '#3DD16B', background: 'rgba(61,209,107,0.14)',
                          border: '1px solid rgba(61,209,107,0.32)',
                          padding: '2px 8px', borderRadius: 999,
                        }}>{v.tables}</span>
                      )}
                      {v.hint && <span style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim }}>{v.hint}</span>}
                    </div>
                  )}
                </div>
                {active && <span style={{ color: C.warm }}>{Icon.check(20)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* MESSAGE */}
      <div>
        <div style={{ ...kicker, marginBottom: 10 }}>MESSAGE <span style={{ color: C.inkFaint, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span></div>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Hate de retenter ma chance apres notre dernier match ! 🔥"
          rows={3}
          style={{
            all: 'unset', width: '100%', boxSizing: 'border-box',
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(8,22,17,0.55)', border: `1px solid ${C.border}`,
            fontFamily: fontItalic, fontStyle: 'italic',
            fontSize: 14, color: C.ink, lineHeight: 1.5,
          }}
        />
      </div>

      {/* Recap + submit */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 10, borderTop: `1px solid ${C.border}`,
        fontFamily: fontSans, fontSize: 13,
      }}>
        <span style={{ color: C.inkDim }}>Recap</span>
        <span style={{ color: C.ink, fontWeight: 700 }}>{recap}</span>
      </div>

      <button onClick={submit} style={{
        all: 'unset', cursor: 'pointer', textAlign: 'center',
        padding: '17px', borderRadius: 14,
        background: C.warm, color: '#0C211A',
        fontFamily: fontSans, fontWeight: 800, fontSize: 14,
        letterSpacing: '0.18em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <SwordsIcon size={18} />
        ENVOYER LE DEFI
      </button>

      <div style={{
        fontFamily: fontSans, fontSize: 12, color: C.inkDim, textAlign: 'center',
        marginTop: -8,
      }}>
        {opponent.full || opponent.name} recevra une notification et pourra accepter, modifier ou refuser
      </div>
    </div>
  );
}

// Mock thread per contact (id by full name)
const MOCK_THREADS = {
  default: [
    { from: 'them', text: 'Salut !', when: '10:24' },
    { from: 'me',   text: 'Hey, ca va ?', when: '10:25' },
    { from: 'them', text: 'Tres bien, et toi ? On se fait un match cette semaine ?', when: '10:26' },
  ],
  'Marc Leclerc': [
    { from: 'them', text: 'Yo, dispo samedi 14h pour un set ?', when: '12:14' },
    { from: 'me',   text: 'Carrement, Le Marais ?', when: '12:18' },
    { from: 'them', text: 'Defi propose · Samedi 14h', when: '12:20', isDefi: true },
  ],
  'Theo Rousseau': [
    { from: 'them', text: 'GG pour hier !', when: '09:02' },
    { from: 'them', text: 'Revanche quand tu veux 🏓', when: '09:02' },
    { from: 'me',   text: 'Avec plaisir, t\'as bien joue', when: '09:10' },
  ],
  'Sophie Martin': [
    { from: 'them', text: 'Defi a confirmer · Dim. 11h', when: '08:30', isDefi: true },
  ],
  'Karim Benali': [
    { from: 'them', text: 'On se voit demain a 19h ?', when: 'Hier' },
    { from: 'me',   text: 'Ok ca marche, a demain 👌', when: 'Hier' },
  ],
  'Lea Petit': [
    { from: 'them', text: '[Message vocal · 0:24]', when: 'Hier' },
  ],
  'Antoine D.': [
    { from: 'them', text: "Salut, j'ai vu ton profil sur l'app. Tu joues au Marais ? On pourrait se faire un match.", when: '15/05' },
  ],
};

function ChatView({ contact }) {
  const { openSheet } = useUI();
  const [messages, setMessages] = useState(MOCK_THREADS[contact.full] || MOCK_THREADS.default);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const when = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    setMessages(m => [...m, { from: 'me', text, when }]);
    setDraft('');
  };

  const [light, mid, dark] = contact.color;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      {/* Back + contact header */}
      <button onClick={() => openSheet({ title: 'Messages', body: <MessagesView /> })}
              style={{
                all: 'unset', cursor: 'pointer',
                fontFamily: fontSans, fontSize: 13, fontWeight: 700,
                color: C.mint, letterSpacing: '0.08em',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l-6 6 6 6"/>
        </svg>
        Messages
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 14,
        background: C.card, border: `1px solid ${C.border}`,
      }}>
        <FriendAvatar color={contact.color} online={contact.online} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: C.ink }}>{contact.full}</div>
          <div style={{ fontFamily: fontSans, fontSize: 12, color: C.inkDim, marginTop: 2 }}>
            {contact.online ? <><span style={{ color: '#3DD16B' }}>●</span> en ligne</> : 'hors ligne'}
          </div>
        </div>
        <button onClick={() => openSheet({ title: 'Nouveau defi', body: <NewChallengeView opponent={contact} /> })} style={{
          all: 'unset', cursor: 'pointer',
          padding: '8px 10px', borderRadius: 10,
          border: `1px solid ${C.borderHi}`, color: C.cream,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: fontSans, fontSize: 12, fontWeight: 700,
        }}><SwordsIcon size={14} />Defier</button>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: 8,
        overflowY: 'auto', paddingBottom: 8, minHeight: 200,
      }}>
        {messages.map((m, i) => {
          const mine = m.from === 'me';
          return (
            <div key={i} style={{
              alignSelf: mine ? 'flex-end' : 'flex-start',
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: 16,
              background: mine ? C.warm : C.card,
              color: mine ? '#0C211A' : C.ink,
              border: mine ? 'none' : `1px solid ${C.border}`,
              borderBottomRightRadius: mine ? 4 : 16,
              borderBottomLeftRadius: mine ? 16 : 4,
              fontFamily: fontSans, fontSize: 14, lineHeight: 1.4,
            }}>
              {m.isDefi && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4,
                  fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
                  color: mine ? '#0C211A' : C.warm,
                }}><SwordsIcon size={12} />DEFI</div>
              )}
              <div>{m.text}</div>
              <div style={{
                marginTop: 4, fontSize: 10, opacity: 0.65,
                textAlign: 'right',
              }}>{m.when}</div>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '8px',
        borderRadius: 999,
        background: 'rgba(8,22,17,0.55)',
        border: `1px solid ${C.border}`,
      }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Ecrire un message..."
          style={{
            all: 'unset', flex: 1, padding: '8px 12px',
            fontFamily: fontSans, fontSize: 14, color: C.ink,
          }}
        />
        <button onClick={send} disabled={!draft.trim()} style={{
          all: 'unset', cursor: draft.trim() ? 'pointer' : 'not-allowed',
          width: 38, height: 38, borderRadius: '50%',
          background: draft.trim() ? C.warm : 'rgba(232,201,155,0.25)',
          color: '#0C211A',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13"/>
            <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

function MessagesView() {
  const { openSheet } = useUI();
  const [tab, setTab] = useState('tous');
  const tabs = [
    { id: 'tous',  label: 'Tous',  count: CONVERSATIONS.filter(c => c.unread).length },
    { id: 'defis', label: 'Defis', count: CONVERSATIONS.filter(c => c.isDefi).length },
    { id: 'clubs', label: 'Clubs', count: null },
  ];
  const shown = CONVERSATIONS.filter(c => {
    if (tab === 'defis') return c.isDefi;
    if (tab === 'clubs') return c.isClub;
    return true;
  });

  const stories = [
    { name: 'Toi',   color: COLOR_OCHRE, online: false, isMe: true },
    ...FRIENDS_ALL.slice(0, 5).map(f => ({ ...f, name: f.name.replace(/\s.+$/, '') })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <BackToProfileBtn />
      <SearchInput placeholder="Rechercher un ami..." />

      {/* Stories-like row */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {stories.map(s => (
          <div key={s.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{
              padding: 2, borderRadius: '50%',
              border: `2px solid ${s.isMe ? C.cream : C.warm}`,
            }}>
              <FriendAvatar color={s.color} online={s.online} size={56} />
              {s.isMe && (
                <div style={{
                  position: 'relative', marginTop: -16, marginRight: -4,
                  width: 18, height: 18, borderRadius: 4,
                  background: C.warm, marginLeft: 'auto',
                  border: '2px solid #143226',
                }} />
              )}
            </div>
            <div style={{ fontFamily: fontSans, fontSize: 12, color: C.ink, fontWeight: 600 }}>{s.name}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 22, borderBottom: `1px solid ${C.border}`, paddingBottom: 2 }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              all: 'unset', cursor: 'pointer',
              fontFamily: fontSans, fontSize: 15, fontWeight: active ? 800 : 600,
              color: active ? C.ink : C.inkDim,
              paddingBottom: 10,
              borderBottom: active ? `2px solid ${C.warm}` : '2px solid transparent',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontFamily: fontSans, fontWeight: 800, fontSize: 11,
                  color: C.warm, background: 'rgba(232,201,155,0.18)',
                  border: '1px solid rgba(232,201,155,0.32)',
                  padding: '2px 8px', borderRadius: 999,
                }}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conversations */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {shown.map((c, idx) => (
          <button key={idx} onClick={() => openSheet({ title: c.full, body: <ChatView contact={c} /> })}
                  style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>
            <ConversationRow c={c} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationRow({ c }) {
  const [light, mid, dark] = c.color;
  const previewColor = c.unread ? C.warm : C.inkDim;
  const nameColor = C.ink;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 0',
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Avatar (single or double) */}
      <div style={{ position: 'relative', width: 50, height: 50, flexShrink: 0 }}>
        {c.colorB ? (
          <>
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: 36, height: 36, borderRadius: '50%',
              background: `radial-gradient(60% 60% at 35% 30%, ${c.color[0]} 0%, ${c.color[1]} 60%, ${c.color[2]} 100%)`,
              border: `1.5px solid ${C.borderHi}`,
            }} />
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 36, height: 36, borderRadius: '50%',
              background: `radial-gradient(60% 60% at 35% 30%, ${c.colorB[0]} 0%, ${c.colorB[1]} 60%, ${c.colorB[2]} 100%)`,
              border: '2px solid #143226',
            }} />
          </>
        ) : (
          <>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: `radial-gradient(60% 60% at 35% 30%, ${light} 0%, ${mid} 60%, ${dark} 100%)`,
              border: `1.5px solid ${C.borderHi}`,
            }} />
            {c.online && (
              <div style={{
                position: 'absolute', right: 1, bottom: 1,
                width: 12, height: 12, borderRadius: '50%',
                background: '#3DD16B', border: '2px solid #143226',
              }} />
            )}
          </>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: fontSans, fontWeight: 700, fontSize: 15, color: nameColor,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{c.full}</span>
          {c.isDemande && (
            <span style={{
              fontFamily: fontSans, fontWeight: 800, fontSize: 10,
              color: C.inkDim, background: 'rgba(184,220,197,0.10)',
              border: `1px solid ${C.border}`,
              padding: '2px 8px', borderRadius: 999, letterSpacing: '0.14em',
            }}>DEMANDE</span>
          )}
        </div>
        <div style={{
          fontFamily: fontSans, fontSize: 13, color: previewColor, marginTop: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {c.voice && <MicIcon size={12} />}
          {c.isDefi && !c.voice && (
            <SwordsIcon size={12} />
          )}
          {c.preview}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <div style={{
          fontFamily: fontSans, fontSize: 12, fontWeight: c.unread ? 700 : 500,
          color: c.unread ? C.warm : C.inkDim,
        }}>{c.when}</div>
        {c.unread && (
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.warm }} />
        )}
      </div>
    </div>
  );
}

function ProfileSheet() {
  const { openSheet } = useUI();
  const openFriends   = () => openSheet({ title: 'Amis',      body: <FriendsListView /> });
  const openHistory   = () => openSheet({ title: 'Historique',body: <MatchesListView /> });
  const openChallenge = () => openSheet({ title: 'Defier',    body: <ChallengeView /> });
  const openMessages  = () => openSheet({ title: 'Messages',  body: <MessagesView /> });
  const fields = [
    ['MAIN',   'Droitiere'],
    ['DISPOS', 'Soirs sem. \u00b7 Weekends'],
    ['CLUB',   'Le Marais Ping'],
    ['STYLE',  'Attaquant'],
    ['REGION', 'Paris \u2014 11e'],
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Identite */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 99, flexShrink: 0,
          background: 'radial-gradient(60% 60% at 35% 30%, #d6b890 0%, #6b4a2e 60%, #1c100a 100%)',
          border: `1.5px solid ${C.borderHi}`,
        }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontFamily: fontSans, fontWeight: 700, fontSize: 14, color: C.ink }}>1450 ELO · #24 PARIS</div>
          <div style={{ fontFamily: fontSans, fontSize: 13, color: C.inkDim }}>
            <span style={{ color: C.warm }}>● </span>Streak : 5 jours · Classement 15/B5
          </div>
        </div>
      </div>

      {/* Bio */}
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'rgba(8,22,17,0.35)',
        borderLeft: `3px solid ${C.warm}`,
        fontFamily: fontItalic, fontStyle: 'italic',
        fontSize: 14.5, lineHeight: 1.5, color: C.ink,
      }}>
        "10 ans de ping, cherche partenaires niveau intermediaire+ pour entrainements du soir."
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {BADGES.map(b => (
          <div key={b.label} style={{
            padding: '8px 14px', borderRadius: 999,
            fontFamily: fontSans, fontSize: 12, fontWeight: 700,
            color: b.featured ? C.warm : C.ink,
            background: b.featured ? 'rgba(232,201,155,0.18)' : 'rgba(8,22,17,0.45)',
            border: `1px solid ${b.featured ? 'rgba(232,201,155,0.4)' : C.border}`,
            letterSpacing: '0.04em',
          }}>● {b.label}</div>
        ))}
      </div>

      {/* Fields */}
      <div>
        {fields.map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={kicker}>{k}</span>
            <span style={{ fontFamily: fontSans, fontSize: 14, color: C.ink, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* AMIS */}
      <div>
        <SectionHeader label="AMIS" badge={FRIENDS_TOTAL} onClick={openFriends} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          {FRIENDS.map(f => (
            <div key={f.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
              <FriendAvatar color={f.color} online={f.online} />
              <div style={{
                fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.ink,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
              }}>{f.name}</div>
              <div style={{ fontFamily: fontSans, fontSize: 11, color: C.inkDim, fontWeight: 600 }}>{f.elo}</div>
            </div>
          ))}
          <button onClick={openFriends} style={{
            all: 'unset', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            flex: 1, minWidth: 0,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: `1.5px dashed ${C.warm}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.warm, fontSize: 22, fontWeight: 700,
            }}>+</div>
            <div style={{
              fontFamily: fontSans, fontSize: 12, fontWeight: 700, color: C.warm,
            }}>Ajouter</div>
            <div style={{ fontSize: 11, color: 'transparent' }}>—</div>
          </button>
        </div>
      </div>

      {/* HISTORIQUE */}
      <div>
        <SectionHeader label="HISTORIQUE" badge={STATS.total} onClick={openHistory} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <StatTile value={STATS.wins}    label="VICTOIRES" color="#3DD16B" bg="rgba(61,209,107,0.08)" />
          <StatTile value={STATS.losses}  label="DEFAITES"  color="#E89B8B" bg="rgba(232,155,139,0.08)" />
          <StatTile value={`${STATS.winrate}%`} label="WINRATE" color={C.warm} bg="rgba(232,201,155,0.08)" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MATCHES.map((m, i) => <MatchRow key={i} m={m} />)}
        </div>
      </div>

      {/* CTA */}
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button onClick={openChallenge} style={{
          flex: 1, padding: '15px', borderRadius: 12, cursor: 'pointer',
          background: C.warm, color: '#0C211A',
          fontFamily: fontSans, fontWeight: 700, fontSize: 16,
          border: 'none',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <SwordsIcon size={18} />
          Défier
        </button>
        <button onClick={openMessages} style={{
          flex: 1, padding: '15px', borderRadius: 12, cursor: 'pointer',
          background: 'transparent', color: C.ink,
          fontFamily: fontSans, fontWeight: 700, fontSize: 16,
          border: `1px solid ${C.borderHi}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <ChatIcon size={18} />
          Message
        </button>
      </div>
    </div>
  );
}

export { ProfileSheet };

export default function TopBar({ topInset = 0 }) {
  const { openSheet } = useUI();
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scroller = el.parentElement;
    if (!scroller) return;
    let lastY = scroller.scrollTop;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        const dy = y - lastY;
        if (Math.abs(dy) > 4) {
          if (dy > 0 && y > 64) setHidden(true);
          else if (dy < 0) setHidden(false);
          lastY = y;
        }
        ticking = false;
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} style={{
      paddingTop: `max(${topInset}px, env(safe-area-inset-top, 0px))`,
      height: `calc(64px + max(${topInset}px, env(safe-area-inset-top, 0px)))`,
      boxSizing: 'border-box',
      paddingLeft: 22, paddingRight: 22,
      display: 'flex', alignItems: 'center',
      background: 'rgba(8,22,17,0.92)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      position: 'sticky', top: 0, zIndex: 5,
      color: C.ink,
      transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
      transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      willChange: 'transform',
    }}>
      <div style={{
        flex: 1,
        display: 'grid', alignItems: 'center',
        gridTemplateColumns: '44px 1fr 44px',
        height: 64,
      }}>
      <div />
      <div style={{
        fontFamily: fontDisplay, fontWeight: 800, letterSpacing: '0.05em',
        fontSize: 18, color: C.ink, whiteSpace: 'nowrap', textAlign: 'center',
      }}>PING PANG PARIS</div>
      <button onClick={() => openSheet({
        title: 'EUGENIA SOREL',
        body: <ProfileSheet />,
      })} style={iconBtn}>{Icon.user(26)}</button>
      </div>
    </div>
  );
}
