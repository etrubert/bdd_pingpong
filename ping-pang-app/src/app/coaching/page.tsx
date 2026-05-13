"use client";

import React from "react";
import styles from "../page.module.css";
import { Play, Video } from "lucide-react";

export default function CoachingPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Coaching & Vidéo</h1>
          <p style={{ color: 'var(--text-muted)' }}>Améliorez votre technique grâce à l'IA et aux coachs certifiés.</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <Video size={20} />
                Mes vidéos à analyser
              </h2>
            </div>
            <div className={styles.chartPlaceholder} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
              <p>Aucune vidéo pour le moment</p>
              <button className={`${styles.btn} ${styles.btnPrimary}`}>
                Uploader une vidéo
              </button>
            </div>
          </div>
        </div>
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <Play size={20} />
                Programmes de Coaching
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>Drills et exercices recommandés pour votre niveau apparaîtront ici.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
