"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import { 
  Activity, MapPin, Play, Trophy, Users, 
  Video, Flame, Plus, ChevronRight, TrendingUp,
  Map as MapIcon, Target, Search
} from "lucide-react";

export default function Home() {
  const [timeView, setTimeView] = useState("Mois");

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Bonjour, Amaury 👋</h1>
          <p style={{ color: 'var(--text-muted)' }}>Voici ton résumé d'activité Ping Pang.</p>
        </div>
        
        <div className={styles.headerControls}>
          <div className={styles.timeToggle}>
            {["Jour", "Semaine", "Mois"].map(view => (
              <button 
                key={view}
                className={`${styles.timeToggleBtn} ${timeView === view ? styles.active : ""}`}
                onClick={() => setTimeView(view)}
              >
                {view}
              </button>
            ))}
          </div>

          <div className={styles.profile}>
            <button className={styles.btnOutline} style={{ padding: '0.5rem', borderRadius: '50%' }}>
              <Flame size={20} color="var(--primary)" />
            </button>
            <div className={styles.avatar}>A</div>
          </div>
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
              <span className={styles.tag}>Vue : {timeView}</span>
            </div>
            
            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <div className={styles.statValue}>1,450</div>
                <div className={styles.statLabel}>Points Elo</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue}>
                  {timeView === "Jour" ? "1h" : timeView === "Semaine" ? "5h" : "12h"}
                </div>
                <div className={styles.statLabel}>Temps de jeu</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statValue} style={{ color: '#1ed760' }}>
                  {timeView === "Jour" ? "+5" : timeView === "Semaine" ? "+15" : "+45"}
                </div>
                <div className={styles.statLabel}>Gain Elo</div>
              </div>
            </div>

            {/* Big Stats Squares */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
              <div style={{ 
                backgroundColor: 'rgba(15, 76, 58, 0.1)', 
                border: '1px solid var(--primary)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Niveau ELO</div>
                <div style={{ fontSize: '3rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: 'var(--foreground)' }}>1450</div>
                <div style={{ fontSize: '0.85rem', color: '#1ed760', marginTop: '0.5rem', fontWeight: 600 }}>Top 15%</div>
              </div>

              <div style={{ 
                backgroundColor: 'var(--background)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '1.5rem', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Heures d'entraînement</div>
                <div style={{ fontSize: '3rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, color: 'var(--primary)' }}>
                  {timeView === "Jour" ? "1h" : timeView === "Semaine" ? "5h" : "12h"}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Cumul {timeView.toLowerCase()}</div>
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
                  <strong>Thomas</strong> a battu son record de vitesse de balle : <span style={{ color: '#1ed760', fontWeight: 'bold' }}>85 km/h</span> 🚀
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
                Challenge {timeView === "Mois" ? "du mois" : timeView === "Semaine" ? "de la semaine" : "du jour"}
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Faire 1000 top-spins pour gagner un badge et 20% chez Ping Pang Paris.
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
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', zIndex: 10, position: 'relative', backgroundColor: 'rgba(10, 10, 10, 0.85)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 className={styles.cardTitle}>
                    <MapPin size={20} />
                    Map des Tables & Clubs
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    124 tables détectées autour de vous
                  </p>
                </div>
                <button className={styles.btnOutline} style={{ padding: '0.5rem', borderRadius: '50%' }}>
                  <Search size={16} />
                </button>
              </div>
            </div>
            <div className={styles.mapPlaceholder}>
              {/* Fake markers simulating map data */}
              <MapPin className={styles.mapMarker} style={{ top: '30%', left: '40%' }} size={32} />
              <MapPin className={styles.mapMarker} style={{ top: '60%', left: '70%', color: 'var(--primary)', animationDelay: '1s' }} size={24} />
              <MapPin className={styles.mapMarker} style={{ top: '20%', left: '80%', color: '#888', animationDelay: '0.5s' }} size={24} />
              
              <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', zIndex: 10 }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  Ouvrir la Map
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
  );
}
