import React from "react";
import styles from "./page.module.css";
import { 
  Activity, MapPin, Play, Trophy, Users, 
  Video, Flame, Plus, ChevronRight, TrendingUp,
  Map as MapIcon, Target
} from "lucide-react";

export default function Home() {
  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.avatar} style={{ width: '32px', height: '32px', fontSize: '1rem' }}>P</div>
          Ping Pang <span>Paris</span>
        </div>
        
        <nav className={styles.nav}>
          <a href="#" className={`${styles.navItem} ${styles.active}`}>
            <Activity size={20} />
            Dashboard
          </a>
          <a href="#" className={styles.navItem}>
            <Target size={20} />
            Journal (Logbook)
          </a>
          <a href="#" className={styles.navItem}>
            <MapIcon size={20} />
            Map & Clubs
          </a>
          <a href="#" className={styles.navItem}>
            <Play size={20} />
            Coaching & Vidéo
          </a>
          <a href="#" className={styles.navItem}>
            <Users size={20} />
            Communauté
          </a>
        </nav>
        
        <div style={{ marginTop: 'auto' }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: '100%' }}>
            <Plus size={18} />
            Nouvelle Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.headerTitle}>Bonjour, Amaury 👋</h1>
          <div className={styles.profile}>
            <button className={styles.btnOutline} style={{ padding: '0.5rem', borderRadius: '50%' }}>
              <Flame size={20} color="var(--primary)" />
            </button>
            <div className={styles.avatar}>A</div>
          </div>
        </header>

        <div className={styles.grid}>
          {/* Column 1: Stats & Feed */}
          <div className={styles.col}>
            {/* Stats Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <TrendingUp size={20} color="var(--primary)" />
                  Progression (Volume vs Elo)
                </h2>
                <span className={styles.tag}>Ce mois</span>
              </div>
              
              <div className={styles.statGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>1,450</div>
                  <div className={styles.statLabel}>Points Elo</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>12h</div>
                  <div className={styles.statLabel}>Temps de jeu</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>+45</div>
                  <div className={styles.statLabel}>Gain Elo</div>
                </div>
              </div>

              {/* Chart Placeholder */}
              <div className={styles.chartPlaceholder}>
                <div className={styles.chartBars}>
                  <div className={styles.bar} style={{ height: '30%' }}></div>
                  <div className={styles.bar} style={{ height: '50%' }}></div>
                  <div className={styles.bar} style={{ height: '40%' }}></div>
                  <div className={styles.bar} style={{ height: '70%' }}></div>
                  <div className={styles.bar} style={{ height: '60%' }}></div>
                  <div className={styles.bar} style={{ height: '90%' }}></div>
                  <div className={styles.bar} style={{ height: '100%' }}></div>
                </div>
              </div>
            </div>

            {/* Social Feed */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <Users size={20} />
                  Feed de la communauté
                </h2>
              </div>
              
              <div className={styles.feedItem}>
                <div className={styles.feedAvatar}>T</div>
                <div className={styles.feedContent}>
                  <p className={styles.feedText}>
                    <strong>Thomas</strong> a battu son record de vitesse de balle : <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>85 km/h</span> 🚀
                  </p>
                  <p className={styles.feedTime}>Il y a 2 heures</p>
                </div>
              </div>

              <div className={styles.feedItem}>
                <div className={styles.feedAvatar}>M</div>
                <div className={styles.feedContent}>
                  <p className={styles.feedText}>
                    <strong>Marie</strong> a check-in au <strong>Ping Pang Café</strong> avec 3 amis.
                  </p>
                  <p className={styles.feedTime}>Il y a 4 heures</p>
                </div>
              </div>

              <div className={styles.feedItem}>
                <div className={styles.feedAvatar}>L</div>
                <div className={styles.feedContent}>
                  <p className={styles.feedText}>
                    <strong>Lucas</strong> a terminé le drill <em>"Top-spin coup droit niveau avancé"</em>.
                  </p>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <span className={styles.tag}>Top-spin</span>
                    <span className={styles.tag}>Technique</span>
                  </div>
                  <p className={styles.feedTime}>Hier</p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Challenges & Map */}
          <div className={styles.col}>
            {/* Challenge Card */}
            <div className={`${styles.card} ${styles.challengeCard}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle} style={{ color: 'white' }}>
                  <Trophy size={20} color="var(--primary)" />
                  Challenge du mois
                </h2>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Faire 1000 top-spins en mai pour gagner 20% de réduction chez Ping Pang Paris.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'white' }}>
                <span>Progression</span>
                <strong>750 / 1000</strong>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: '75%' }}></div>
              </div>
            </div>

            {/* Interactive Map Snippet */}
            <div className={`${styles.card} ${styles.mapCard}`}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h2 className={styles.cardTitle}>
                  <MapPin size={20} />
                  Tables & Clubs autour de vous
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Canal Saint-Martin - Affluence estimée: <span style={{ color: '#fbbf24' }}>Moyenne</span>
                </p>
              </div>
              <div className={styles.mapPlaceholder}>
                <MapPin className={styles.mapMarker} size={40} />
                <div style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                    Check-in ici
                  </button>
                </div>
              </div>
            </div>

            {/* Video / Coach Card */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>
                  <Video size={20} />
                  Analyse Vidéo IA
                </h2>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Uploadez votre dernière séance pour une analyse de votre gestuelle (revers, posture).
              </p>
              <button className={`${styles.btn} ${styles.btnOutline}`} style={{ width: '100%', justifyContent: 'space-between' }}>
                Uploader une vidéo
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
