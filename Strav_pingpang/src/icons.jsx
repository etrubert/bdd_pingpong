import { C } from './theme';

export const Icon = {
  menu:     (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7h18M3 12h18M3 17h18"/></svg>,
  user:     (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3.2"/><path d="M5.5 19c1.5-3 4-4.2 6.5-4.2S17 16 18.5 19"/></svg>,
  home:     (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 4l-8 6.5V20h5v-5.5h6V20h5v-9.5L12 4z"/></svg>,
  brain:    (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4.5C7 4.5 5.5 6 5.5 8c-1.5.5-2.5 2-2.5 3.7 0 1.4.7 2.6 1.8 3.3-.2.5-.3 1-.3 1.5 0 2 1.5 3.5 3.5 3.5.7 0 1.3-.2 1.9-.5"/><path d="M15 4.5c2 0 3.5 1.5 3.5 3.5 1.5.5 2.5 2 2.5 3.7 0 1.4-.7 2.6-1.8 3.3.2.5.3 1 .3 1.5 0 2-1.5 3.5-3.5 3.5-.7 0-1.3-.2-1.9-.5"/><path d="M12 5v15"/></svg>,
  map:      (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>,
  trophy:   (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/><path d="M9 20h6M12 13v7"/></svg>,
  bag:      (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M5 8h14l-1.2 12H6.2L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>,
  calendar: (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>,
  clock:    (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2.5" strokeLinecap="round"/></svg>,
  history:  (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/></svg>,
  bolt:     (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M13 3 5 14h6l-1 7 8-11h-6l1-7z"/></svg>,
  pin:      (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  filter:   (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M7 12h10M10 17h4"/></svg>,
  check:    (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 10 18l10-12"/></svg>,
  arrowR:   (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
  plus:     (s=22) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  verify:   (s=18) => <svg width={s} height={s} viewBox="0 0 24 24" fill={C.mint}><path d="M12 1.5l2.4 1.9 3 .2 1.1 2.8 2.6 1.6-.5 3 .9 2.9-2.1 2.2-.8 2.9-3 .5-2.2 2.1-2.9-.9-2.9.9-2.2-2.1-3-.5-.8-2.9L1.5 14l.9-2.9-.5-3 2.6-1.6 1.1-2.8 3-.2L12 1.5z"/><path d="M8 12.2l2.8 2.8L16 9.5" stroke={C.bg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>,
  trend:    (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M3 17l6-6 4 4 8-9"/><path d="M14 6h7v7"/></svg>,
};
