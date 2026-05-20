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
import MerchScreen from './screens/MerchScreen';
import ChatScreen from './screens/ChatScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PlaceholderScreen from './screens/PlaceholderScreen';
import Leaderboard from './screens/Leaderboard';
import { useOnboarding } from './lib/onboarding';
import { supabase } from './lib/supabase';

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
  const { completed: onboardingDone } = useOnboarding();
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  // iPhone aspect ratio (402:874 ≈ 0.46) — fit to viewport with some breathing room
  const PHONE_RATIO = 402 / 874;
  const maxByHeight = vh - 48;
  const maxByWidth = vw - 48;
  const deviceHeight = Math.min(maxByHeight, maxByWidth / PHONE_RATIO);
  const deviceWidth = deviceHeight * PHONE_RATIO;

  const screen = useMemo(() => {
    switch (tab) {
      case 'home':        return <HomeScreen onNav={setTab} />;
      case 'train':       return <TrainScreen />;
      case 'matches':     return <MatchesScreen />;
      case 'leaderboard': return <Leaderboard currentUserId={currentUserId} />;
      case 'finder':      return <FinderScreen />;
      case 'chat':        return <ChatScreen />;
      case 'merch':       return <MerchScreen />;
      default:            return <HomeScreen onNav={setTab} />;
    }
  }, [tab, currentUserId]);

  // Pas de status bar dans le mockup. Sur mobile reel, env(safe-area-inset-top) est applique cote TopBar.
  const mockTopInset = 0;

  const scrollRef = useRef(null);

  // Reset scroll to top whenever the active tab changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab]);

  const inner = (
    <UIProvider isMobile={isMobile}>
      <div style={{
        position: 'relative', height: '100%', width: '100%',
        background: C.bgGrad, color: C.ink, overflow: 'hidden',
      }}>
        {!onboardingDone ? (
          <div style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
            <OnboardingScreen />
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
      backgroundImage: 'radial-gradient(60% 50% at 50% 0%, rgba(184,220,197,0.04) 0%, rgba(0,0,0,0) 70%)',
    }}>
      <IOSDevice width={deviceWidth} height={deviceHeight} dark={true}>
        {inner}
      </IOSDevice>
    </div>
  );
}
