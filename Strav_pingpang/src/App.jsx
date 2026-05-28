import { useState, useMemo, useEffect, useRef } from 'react';
import { C, fontSans } from './theme';
import UIProvider from './components/UIProvider';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import IOSDevice from './components/IOSDevice';
import HomeScreen from './screens/HomeScreen';
import TrainScreen from './screens/TrainScreen';
import MatchesScreen from './screens/MatchesScreen';
import FinderScreen from './screens/FinderScreen';
import ChatScreen from './screens/ChatScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import Leaderboard from './screens/Leaderboard';
import LocationConsent from './components/LocationConsent';
import CoachBubble from './components/CoachBubble';
import { useAuth } from './lib/auth';

function useViewport() {
  const [vp, setVp] = useState({
    vw: typeof window !== 'undefined' ? window.innerWidth : 1024,
    vh: typeof window !== 'undefined' ? window.innerHeight : 800,
  });
  useEffect(() => {
    const onR = () => setVp({ vw: window.innerWidth, vh: window.innerHeight });
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return { vw: vp.vw, vh: vp.vh, isMobile: vp.vw < 640 };
}

export default function App() {
  const [tab, setTab] = useState('home');
  const { vw, vh, isMobile } = useViewport();
  const { isAuthed, profile, userId } = useAuth();

  // À chaque (re)chargement de l'app, on veut TOUJOURS atterrir sur l'écran
  // de connexion. Ce flag in-memory (non persisté) bascule sur true uniquement
  // quand l'utilisateur clique explicitement CONTINUER ou termine l'onboarding.
  const [hasEnteredApp, setHasEnteredApp] = useState(false);

  const onboardingDone = !!(profile?.region && profile?.player_type);
  const showApp = hasEnteredApp && isAuthed && onboardingDone;

  const PHONE_RATIO = 402 / 874;
  const maxByHeight = vh - 48;
  const maxByWidth = vw - 48;
  const deviceHeight = Math.min(maxByHeight, maxByWidth / PHONE_RATIO);
  const deviceWidth = deviceHeight * PHONE_RATIO;

  const screen = useMemo(() => {
    switch (tab) {
      case 'home':
        return <HomeScreen onNav={setTab} />;
      case 'train':       return <TrainScreen />;
      case 'matches':     return <MatchesScreen />;
      case 'leaderboard': return <Leaderboard currentUserId={userId} />;
      case 'finder':      return <FinderScreen />;
      case 'chat':        return <ChatScreen />;
      default:
        return <HomeScreen onNav={setTab} />;
    }
  }, [tab, userId]);

  const mockTopInset = 0;
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab]);

  const inner = (
    <UIProvider isMobile={isMobile}>
      <div style={{
        position: 'relative', height: '100%', width: '100%',
        background: C.bgGrad, color: C.ink, overflow: 'hidden',
      }}>
        {!showApp ? (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
            <OnboardingScreen onComplete={() => setHasEnteredApp(true)} />
          </div>
        ) : (
          <>
            <div ref={scrollRef} style={{
              position: 'absolute', inset: 0, overflowY: 'auto',
            }}>
              <TopBar topInset={mockTopInset} />
              {screen}
            </div>
            <BottomNav tab={tab} onTab={setTab} />
            {/* Coach IA flottant : balle ping-pong en bas à droite */}
            <CoachBubble />
            {/* Popup de consentement géoloc (changement 3) — couvre toute l'app */}
            <LocationConsent />
          </>
        )}
      </div>
    </UIProvider>
  );

  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: C.bg,
        fontFamily: fontSans,
      }}>
        {inner}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      boxSizing: 'border-box',
      background: '#06120D',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      backgroundImage: 'radial-gradient(60% 50% at 50% 0%, rgba(245,246,243,0.04) 0%, rgba(0,0,0,0) 70%)',
    }}>
      <IOSDevice width={deviceWidth} height={deviceHeight} dark={true}>
        {inner}
      </IOSDevice>
    </div>
  );
}
