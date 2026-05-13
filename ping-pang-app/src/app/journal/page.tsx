"use client";

import React from "react";
import styles from "../page.module.css";
import { Target, Plus } from "lucide-react";

export default function JournalPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Journal de bord</h1>
          <p style={{ color: 'var(--text-muted)' }}>Retrouve toutes tes sessions et ton évolution.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`}>
          <Plus size={18} />
          Ajouter une session
        </button>
      </header>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Target size={20} />
            Historique des Sessions
          </h2>
        </div>
        <p style={{ color: 'var(--text-muted)' }}>
          Historique de tes matchs et entraînements à venir ici.
        </p>
      </div>
    </main>
  );
}
