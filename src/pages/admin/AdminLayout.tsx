import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ClipboardList, 
  Ticket, 
  ShoppingCart,
  Settings as SettingsIcon, 
  Users,
  LogOut,
  Menu as MenuIcon,
  X,
  ListOrdered,
  LogIn,
  Heart,
  Star
} from 'lucide-react';
import { Dashboard } from './Dashboard';
import { MenuManagement } from './MenuManagement';
import { OrderManagement } from './OrderManagement';
import { CouponManagement } from './CouponManagement';
import { Settings } from './Settings';
import { UserManagement } from './UserManagement';
import { CartManagement } from './CartManagement';
import { CustomerInterestManager } from './CustomerInterest';
import { FavoritesManager } from './FavoritesManager';
import { FoodCustomization } from './FoodCustomization';
import { useSettings } from '../../hooks/useSettings';

export function AdminLayout() {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { settings } = useSettings();

  const [unreadOrders, setUnreadOrders] = useState(0);
  const [activeCarts, setActiveCarts] = useState(false);
  const locationRef = useRef(location.pathname);
  const audioUnlocked = useRef(false);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  const isAdmin = user?.email?.toLowerCase().trim() === 'almominsk72@gmail.com' || user?.email?.toLowerCase().trim() === 'almomensk72@gmail.com';

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const handleLogin = () => {
    navigate('/admin/login');
  };

  useEffect(() => {
    // Initialize audio element once
    if (!audioElement.current) {
      audioElement.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioElement.current.volume = 0.5;
    }

    const unlockAudio = () => {
      if (!audioUnlocked.current && audioElement.current) {
        audioUnlocked.current = true;
        // Load the audio to unlock it for future unattended plays
        audioElement.current.load();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      }
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login', { state: { from: { pathname: location.pathname } } });
    }
  }, [user, loading, isAdmin, navigate, location]);

  useEffect(() => {
    locationRef.current = location.pathname;
    if (location.pathname === '/admin/orders') {
      setUnreadOrders(0);
    }
    if (location.pathname === '/admin/carts') {
      setActiveCarts(false);
    }
  }, [location.pathname]);

  // Carts Listener
  useEffect(() => {
    if (!user || !isAdmin || !settings.notificationsEnabled) return;

    // Listen to strictly active carts for the dot
    const q = query(collection(db, 'carts'));
    let initialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      
      let cartChanged = false;
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
           const data = change.doc.data();
           if (data.items && data.items.length > 0) {
             cartChanged = true;
           }
        }
      });

      if (cartChanged && locationRef.current !== '/admin/carts') {
        setActiveCarts(true);
      }
    });

    return () => unsubscribe();
  }, [settings.notificationsEnabled, user, isAdmin]);

  useEffect(() => {
    if (!user || !isAdmin || !settings.orderAlerts) return;

    const q = query(collection(db, 'orders'));
    let initialLoad = true;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`[Orders Listener] Snapshot received. Total docs: ${snapshot.docs.length}. IsInitialLoad: ${initialLoad}`);
      
      let isNew = false;
      let count = 0;
      
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          if (!initialLoad) {
            console.log("New order detected:", change.doc.id);
            isNew = true;
            count++;
          }
        }
      });

      if (initialLoad) {
        initialLoad = false;
        return;
      }

      if (isNew) {
        if (locationRef.current !== '/admin/orders') {
          setUnreadOrders(prev => prev + count);
        }
        
        try {
          if (audioElement.current) {
            audioElement.current.currentTime = 0;
            const playPromise = audioElement.current.play();
            if (playPromise !== undefined) {
               playPromise.catch((e) => console.log("Autoplay blocked. User needs to interact with the page first.", e));
            }
          }
        } catch(e) {
          console.log("Sound play error:", e);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [settings.orderAlerts, user, isAdmin]);

  const [hasNewUsers, setHasNewUsers] = useState(false);
  
  useEffect(() => {
    if (!user || !isAdmin) return;

    // Track real-time new users
    const q = query(collection(db, 'users'));
    
    // Periodically re-evaluate existing users to see if their 5 minutes expired
    let interval: NodeJS.Timeout;

    const evaluateUsers = (docs: any[]) => {
      const now = Date.now();
      const hasNew = docs.some(doc => {
        const data = doc.data();
        if (data.createdAt) {
          const createdMs = new Date(data.createdAt).getTime();
          return (now - createdMs < 5 * 60 * 1000);
        }
        return false;
      });
      setHasNewUsers(hasNew);
    };

    let currentDocs: any[] = [];
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      currentDocs = snapshot.docs;
      evaluateUsers(currentDocs);
    });
    
    // Evaluate every 10 seconds to auto clear indicator
    interval = setInterval(() => {
      evaluateUsers(currentDocs);
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [user, isAdmin]);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Menu', href: '/admin/menu', icon: UtensilsCrossed },
    { name: 'Food Customization', href: '/admin/food-customization', icon: ListOrdered },
    { name: 'Orders', href: '/admin/orders', icon: ClipboardList, badge: unreadOrders },
    { name: 'Carts', href: '/admin/carts', icon: ShoppingCart, badgeDot: activeCarts },
    { name: 'Favorites', href: '/admin/favorites', icon: Heart },
    { name: 'Customer Interest', href: '/admin/customer-interest', icon: Heart },
    { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
    { name: 'Users', href: '/admin/users', icon: Users, badgeDot: hasNewUsers },
    { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
  ];

  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="px-6 py-8 flex items-center justify-between shrink-0">
            <h1 className="text-2xl font-bold text-ink tracking-tight">Admin<span className="text-primary-500">Panel</span></h1>
            <button className="lg:hidden text-gray-500" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto min-h-0">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary-50 text-primary-600' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  <span className="flex-1">{item.name} {item.badge && item.badge > 0 ? `(${item.badge})` : ''}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-auto bg-red-500 text-white min-w-[20px] h-5 rounded-full flex items-center justify-center text-xs font-bold px-1.5">
                      {item.badge}
                    </span>
                  ) : null}
                  {(item as any).badgeDot ? (
                    <span className="ml-auto bg-red-500 w-2.5 h-2.5 rounded-full shadow-sm"></span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 shrink-0 space-y-2">
            <Link
              to="/"
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors w-full"
            >
              <LogOut className="w-5 h-5 mr-3 text-gray-400" />
              Back to Website
            </Link>
            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5 mr-3 text-red-500" />
                Logout
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center px-4 py-3 text-sm font-medium text-primary-600 rounded-lg hover:bg-primary-50 transition-colors w-full text-left"
              >
                <LogIn className="w-5 h-5 mr-3 text-primary-500" />
                Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-100">
        {/* Mobile header */}
        <div className="lg:hidden shrink-0 bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-ink">Admin<span className="text-primary-500">Panel</span></h1>
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-500 relative">
            <MenuIcon className="w-6 h-6" />
            {unreadOrders > 0 && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/food-customization" element={<FoodCustomization />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/carts" element={<CartManagement />} />
            <Route path="/favorites" element={<FavoritesManager />} />
            <Route path="/customer-interest" element={<CustomerInterestManager />} />
            <Route path="/coupons" element={<CouponManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}