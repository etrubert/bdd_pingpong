"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { 
  Activity, Map as MapIcon, Play, Users, 
  Target, Plus
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.avatar}>P</div>
        Ping Pang <span>Paris</span>
      </div>
      
      <nav className={styles.nav}>
        <Link href="/" className={`${styles.navItem} ${isActive("/") ? styles.active : ""}`}>
          <Activity size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/journal" className={`${styles.navItem} ${isActive("/journal") ? styles.active : ""}`}>
          <Target size={20} />
          <span>Journal</span>
        </Link>
        <Link href="/map" className={`${styles.navItem} ${isActive("/map") ? styles.active : ""}`}>
          <MapIcon size={20} />
          <span>Map & Clubs</span>
        </Link>
        <Link href="/coaching" className={`${styles.navItem} ${isActive("/coaching") ? styles.active : ""}`}>
          <Play size={20} />
          <span>Coaching</span>
        </Link>
        <Link href="/communaute" className={`${styles.navItem} ${isActive("/communaute") ? styles.active : ""}`}>
          <Users size={20} />
          <span>Communauté</span>
        </Link>
      </nav>
      
      <div style={{ marginTop: 'auto' }}>
        <button className={`${styles.btn} ${styles.btnPrimary}`}>
          <Plus size={18} />
          Nouvelle Session
        </button>
      </div>
    </aside>
  );
}
