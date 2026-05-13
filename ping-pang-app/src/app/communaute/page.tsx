"use client";

import React from "react";
import styles from "../page.module.css";
import { Users, Flame } from "lucide-react";

export default function CommunautePage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Communauté</h1>
          <p style={{ color: 'var(--text-muted)' }}>Découvrez les clubs digitaux et l'activité de vos amis.</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <Users size={20} />
                Clubs Digitaux
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>Groupes auxquels vous appartenez : "Les habitués du Canal", etc.</p>
          </div>
        </div>
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <Flame size={20} />
                Classement
              </h2>
            </div>
            <p style={{ color: 'var(--text-muted)' }}>Classement de la communauté en temps réel.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
