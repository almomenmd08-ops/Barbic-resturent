import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import React, { useState, lazy, Suspense, useEffect, useRef } from 'react';
import Player from '@vimeo/player';
import { useCartSync } from './hooks/useCartSync';
import { useFavoritesSync } from './hooks/useFavoritesSync';
import { useMenuStore } from './store/menuStore';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { ScrollToTop } from './components/ScrollToTop';
import { BackButton } from './components/BackButton';

import { Home } from './pages/Home';
import { Menu } from './pages/Menu';
import { Checkout } from './pages/Checkout';
import { Profile } from './pages/Profile';
import { Favorites } from './pages/Favorites';
import { Login } from './pages/Login';
import { Contact } from './pages/Contact';
import { About } from './pages/About';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLogin } from './pages/admin/AdminLogin';

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

function MainLayout({ children, onOpenCart }: { children: React.ReactNode, onOpenCart: () => void }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isAdminRoute) {
    return <>{children}</>;
  }

  const isCheckoutRoute = location.pathname === '/checkout';

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      <Navbar onOpenCart={onOpenCart} />
      <main className="relative flex-grow w-full">
        <BackButton />
        {children}
      </main>
      <div className="w-full">
        {!isCheckoutRoute && <Footer />}
      </div>
    </div>
  );
}

export default function App() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const initSettings = React.useMemo(() => import('./store/settingsStore').then(m => m.useSettingsStore.getState().initSettings()), []);
  const initMenu = useMenuStore(state => state.initMenu);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    initMenu();
  }, [initMenu]);

  useEffect(() => {
    if (iframeRef.current) {
      const player = new Player(iframeRef.current);
      
      let playAttempts = 0;
      const maxAttempts = 3;

      const tryPlay = () => {
        if (playAttempts < maxAttempts) {
          playAttempts++;
          player.play().catch((err) => {
            console.log("Autoplay failed:", err);
            setTimeout(tryPlay, 2000);
          });
        }
      };

      player.ready().then(() => {
        tryPlay();
      });

      player.on('pause', () => {
        // Standard background loop should remain playing. If it pauses, maybe the user tabbed out.
        // We only try to resume if we are visible, but limit attempts to avoid API rate limits.
        if (document.visibilityState === 'visible') {
           player.play().catch(() => {});
        }
      });
      
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
           player.play().catch(() => {});
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, []);

  useCartSync();
  useFavoritesSync();

  return (
    <Router>
      <div 
        className="video-bg fixed inset-0 z-0 overflow-hidden pointer-events-none"
        style={{ 
          backgroundColor: '#111', 
          backgroundImage: 'url("https://vumbnail.com/1188350700.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <iframe
          ref={iframeRef}
          src="https://player.vimeo.com/video/1188350700?background=1&autoplay=1&loop=1&muted=1&playsinline=1&autopause=0&controls=0&dnt=1"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope"
          title="Background Video"
          className="absolute top-1/2 left-1/2 w-[100vw] min-h-[100vh] pointer-events-none"
          style={{ 
            height: '56.25vw', 
            minWidth: '178vh', 
            transform: 'translate(-50%, -50%) scale(1.05)',
            willChange: 'transform'
          }}
        ></iframe>
      </div>
      <div className="relative z-10 min-h-screen">
        <ScrollToTop />
        <MainLayout onOpenCart={() => setIsCartOpen(true)}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/about" element={<About />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/login" element={<Login />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/*" element={<AdminLayout />} />
          </Routes>
        </MainLayout>
        
        <CartDrawer 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
        />
        
        <Toaster position="bottom-center" />
      </div>
    </Router>
  );
}


