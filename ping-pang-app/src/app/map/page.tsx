"use client";

import React from "react";
import styles from "../page.module.css";
import { MapIcon, Search } from "lucide-react";

export default function MapPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Map & Clubs</h1>
          <p style={{ color: 'var(--text-muted)' }}>Découvre les tables et clubs de Ping Pang autour de toi.</p>
        </div>
      </header>

      <div className={`${styles.card} ${styles.mapCard}`} style={{ height: '600px' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', zIndex: 10, position: 'relative', backgroundColor: 'rgba(10, 10, 10, 0.85)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Search size={20} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Rechercher un lieu ou une adresse..." 
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '1rem', width: '300px' }}
              />
            </div>
            <div className={styles.tag} style={{ backgroundColor: 'rgba(15, 76, 58, 0.3)' }}>
              124 Tables trouvées
            </div>
          </div>
        </div>
        <div className={styles.mapPlaceholder} style={{ height: 'calc(100% - 73px)' }}>
          <p style={{ color: 'var(--primary)', fontWeight: 'bold', zIndex: 10 }}>[ Intégration de maps_table.geojson à venir ]</p>
        </div>
      </div>
    </main>
  );
}
