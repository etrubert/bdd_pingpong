import { useState, useMemo, useEffect } from 'react';
import { C, fontSans } from './theme';
import UIProvider from './components/UIProvider';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import IOSDevice from './components/IOSDevice';
import HomeScreen from './screens/HomeScreen';
import TrainScreen from './screens/TrainScreen';
import MatchesScreen from './screens/MatchesScreen';
import FinderScreen from './screens/FinderScreen';
import PlaceholderScreen from './screens/PlaceholderScreen';

function useViewport() {
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  useEffect(() => {
    const onR = () => setVw(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return { vw, isMobile: vw < 640 };
}

export default function App() {
  const [tab, setTab] = useState('home');
  const { isMobile } = useViewport();

  const screen = useMemo(() => {
    switch (tab) {
      case 'home':    return <HomeScreen onNav={setTab} />;
      case 'train':   return <TrainScreen />;
      case 'matches': return <MatchesScreen />;
      case 'finder':  return <FinderScreen />;
      case 'merch':   return <PlaceholderScreen title="MERCH" blurb="Paddles, rubbers, apparel \u2014 curated for the active player." />;
      default:        return <HomeScreen onNav={setTab} />;
    }
  }, [tab]);

  const inner = (
    <UIProvider isMobile={isMobile}>
      <div style={{
        position: 'relative', height: '100%', width: '100%',
        background: C.bgGrad, color: C.ink, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, overflowY: 'auto',
          paddingTop: isMobile ? 0 : 44,
        }}>
          <TopBar />
          {screen}
        </div>
        <BottomNav tab={tab} onTab={setTab} />
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
      padding: '32px 16px',
      backgroundImage: 'radial-gradient(60% 50% at 50% 0%, rgba(184,220,197,0.04) 0%, rgba(0,0,0,0) 70%)',
    }}>
      <IOSDevice width={402} height={874} dark={true}>
        {inner}
      </IOSDevice>
    </div>
  );
}
