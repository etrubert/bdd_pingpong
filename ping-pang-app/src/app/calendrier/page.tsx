"use client";

import React, { useState } from "react";
import styles from "../page.module.css";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";

export default function CalendrierPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // May 2026

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  // Adjust so Monday is the first day of the week (0)
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - startingDay + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
  });

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  // Mock events
  const events: Record<number, { title: string, time: string, type: string }[]> = {
    14: [{ title: "Entraînement Top-spin", time: "18:00", type: "train" }],
    18: [{ title: "Match de ligue", time: "20:00", type: "match" }],
    22: [{ title: "Drills avec Coach", time: "10:00", type: "coach" }]
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>Calendrier</h1>
          <p style={{ color: 'var(--text-muted)' }}>Planifie tes prochaines séances et matchs.</p>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`}>
          <Plus size={18} />
          Planifier une séance
        </button>
      </header>

      <div className={styles.grid}>
        <div className={styles.col} style={{ flex: 2 }}>
          <div className={styles.card}>
            <div className={styles.cardHeader} style={{ marginBottom: '1.5rem' }}>
              <h2 className={styles.cardTitle} style={{ fontSize: '1.5rem' }}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={prevMonth} className={styles.btnOutline} style={{ padding: '0.5rem', borderRadius: '50%' }}>
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextMonth} className={styles.btnOutline} style={{ padding: '0.5rem', borderRadius: '50%' }}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>
              <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div><div>Sam</div><div>Dim</div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
              {days.map((day, i) => (
                <div key={i} style={{ 
                  minHeight: '80px', 
                  backgroundColor: day ? 'var(--background)' : 'transparent',
                  border: day ? '1px solid var(--border)' : 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  opacity: day === 14 ? 1 : 0.8
                }}>
                  {day && (
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: day === 14 ? 'var(--primary)' : 'inherit' }}>
                      {day}
                    </span>
                  )}
                  {day && events[day] && events[day].map((ev, j) => (
                    <div key={j} style={{ 
                      fontSize: '0.7rem', 
                      backgroundColor: ev.type === 'match' ? '#f42c2c' : 'rgba(15, 76, 58, 0.5)', 
                      color: 'white', 
                      padding: '2px 4px', 
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ev.time} {ev.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.col} style={{ flex: 1 }}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <CalendarIcon size={20} />
                Prochaines Séances
              </h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
                <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Entraînement Top-spin</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <Clock size={14} /> 14 Mai, 18:00 - 19:30
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <MapPin size={14} /> Ping Pang Café
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid #f42c2c' }}>
                <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Match de ligue</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                  <Clock size={14} /> 18 Mai, 20:00
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <MapPin size={14} /> Gymnase Jules Ferry
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
