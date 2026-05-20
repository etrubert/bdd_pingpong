// =====================================================================
// PING PANG PARIS — Page Leaderboard (classement mondial)
// À placer dans : Strav_pingpang/src/screens/Leaderboard.jsx
// =====================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const FILTERS = [
  { value: 'world', label: '🌍 Monde' },
  { value: 'france', label: '🇫🇷 France' },
  { value: 'region', label: 'Ma région' },
  { value: 'club', label: 'Mon club' },
  { value: 'friends', label: 'Amis' },
];

export default function Leaderboard({ currentUserId }) {
  const [filter, setFilter] = useState('world');
  const [top3, setTop3] = useState([]);
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRanking();
  }, [filter]);

  async function fetchRanking() {
    setLoading(true);
    try {
      let query = supabase.from('world_ranking').select('*').limit(100);

      if (filter === 'france') {
        query = supabase.from('world_ranking').select('*').eq('country', 'FR').limit(100);
      } else if (filter === 'region') {
        // À adapter selon ta logique de région
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('region')
          .eq('id', currentUserId)
          .single();
        if (myProfile?.region) {
          query = supabase.from('world_ranking').select('*').eq('region', myProfile.region).limit(100);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Top 3 pour le podium
      setTop3(data.slice(0, 3));
      // Reste
      setRows(data.slice(3, 50));

      // Ma position (peut être hors top 50)
      const myPos = data.find((r) => r.id === currentUserId);
      if (!myPos) {
        // Aller la chercher séparément
        const { data: myData } = await supabase
          .from('world_ranking')
          .select('*')
          .eq('id', currentUserId)
          .single();
        setMe(myData);
      } else {
        setMe(myPos);
      }
    } catch (err) {
      console.error('Erreur fetch ranking:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="ppp-loading">Chargement...</div>;

  return (
    <div className="ppp-screen">
      <h1 className="ppp-h1">LEADERBOARD</h1>
      <p className="ppp-subtitle">Classement mondial des joueurs Ping Pang</p>

      {/* Filtres */}
      <div className="ppp-filter-tags">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            className={`ppp-filter-tag ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Podium top 3 */}
      {top3.length === 3 && (
        <div className="ppp-podium">
          {/* 2e */}
          <div className="ppp-podium-spot place-2">
            <div className="avatar" />
            <p className="name">{top3[1].display_name}</p>
            <p className="elo">{top3[1].current_elo}</p>
            <div className="podium-bar">2</div>
          </div>
          {/* 1er */}
          <div className="ppp-podium-spot place-1">
            <div className="crown">👑</div>
            <div className="avatar" />
            <p className="name">{top3[0].display_name}</p>
            <p className="elo gold">{top3[0].current_elo}</p>
            <div className="podium-bar gold">1</div>
          </div>
          {/* 3e */}
          <div className="ppp-podium-spot place-3">
            <div className="avatar" />
            <p className="name">{top3[2].display_name}</p>
            <p className="elo">{top3[2].current_elo}</p>
            <div className="podium-bar">3</div>
          </div>
        </div>
      )}

      {/* Liste des autres */}
      <div className="ppp-ranking-list">
        {rows.map((p) => (
          <RankRow key={p.id} player={p} isCurrentUser={p.id === currentUserId} />
        ))}
      </div>

      {/* Ma position si pas dans le top */}
      {me && !rows.some((r) => r.id === currentUserId) && (
        <>
          <div className="ppp-divider-text">· · ·  TA POSITION  · · ·</div>
          <RankRow player={me} isCurrentUser highlighted />
        </>
      )}
    </div>
  );
}

function RankRow({ player, isCurrentUser, highlighted }) {
  return (
    <div className={`ppp-rank-row ${highlighted ? 'highlighted' : ''}`}>
      <span className="rank">
        {highlighted ? `#${player.world_rank}` : player.world_rank}
      </span>
      <div className="avatar" />
      <div className="info">
        <p className="name">
          {player.display_name}
          {isCurrentUser && <span className="me-badge">TOI</span>}
        </p>
        <p className="meta">
          {countryFlag(player.country)} {player.country} · {player.matches_played} matchs
        </p>
      </div>
      <div className="elo-info">
        <p className="elo">{player.current_elo}</p>
        {/* TODO: variation depuis dernier match */}
      </div>
    </div>
  );
}

function countryFlag(code) {
  const flags = { FR: '🇫🇷', US: '🇺🇸', CN: '🇨🇳', JP: '🇯🇵', KR: '🇰🇷', DE: '🇩🇪', ES: '🇪🇸', PT: '🇵🇹' };
  return flags[code] || '🌍';
}
