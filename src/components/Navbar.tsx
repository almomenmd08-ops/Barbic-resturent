import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Phone, User, Home, ClipboardList, Info, LogIn, Search, Utensils, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { useCartStore } from '../store/cartStore';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useSettings } from '../hooks/useSettings';
import { SearchModal } from './SearchModal';

export function Navbar({ onOpenCart }: { onOpenCart: () => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const [user] = useAuthState(auth);
  const { settings } = useSettings();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  // Desktop / Top Nav Styles
  const topNavItemClass = (active: boolean, isCart = false) => 
    `relative flex items-center justify-center flex-shrink-0 h-[40px] w-[40px] sm:h-[44px] lg:h-[48px] sm:w-[44px] lg:w-auto lg:px-4 rounded-full lg:rounded-[12px] transition-all duration-300 outline-none group ${
      active 
        ? 'text-[#FF7A00] bg-[#FF7A00]/10 shadow-[inset_0_0_0_1px_rgba(255,122,0,0.1)]' 
        : isCart && itemCount > 0
          ? 'text-[#FF7A00] bg-[#FF7A00]/5 hover:bg-[#FF7A00]/10'
          : 'text-gray-500 hover:text-[#FF7A00] hover:bg-gray-100'
    }`;

  const topIconClass = (active: boolean, isCart = false) => 
    `w-[24px] h-[24px] sm:w-[24px] sm:h-[24px] transition-all duration-300 group-hover:scale-110 flex-shrink-0 ${
      active || (isCart && itemCount > 0) ? 'text-[#FF7A00]' : 'text-gray-500'
    }`;

  const topTextClass = (active: boolean) => 
    `hidden lg:inline-block ml-2 text-[14px] font-bold tracking-wide transition-colors ${
      active ? 'text-[#FF7A00]' : 'text-gray-600 group-hover:text-[#FF7A00]'
    }`;

  // Mobile Bottom Nav Styles
  const bottomNavItemClass = (active: boolean) => 
    `relative flex flex-col items-center justify-center flex-1 h-full w-full transition-colors duration-300 outline-none ${
      active ? 'text-[#FF7A00]' : 'text-gray-500 hover:text-[#FF7A00]'
    }`;
    
  const bottomIconClass = (active: boolean) => 
    `w-[26px] h-[26px] mb-1 transition-transform duration-300 ${active ? 'scale-110' : ''}`;

  const bottomTextClass = (active: boolean) => 
    `text-[11px] font-bold tracking-wide transition-colors ${
      active ? 'text-[#FF7A00]' : 'text-gray-500'
    }`;

  const DesktopNavItem = ({ path, label, Icon }: { path: string, label: string, Icon: React.ElementType }) => (
    <Link 
      to={path} 
      className={topNavItemClass(isActive(path))}
      title={label}
    >
      <Icon strokeWidth={isActive(path) ? 2.5 : 2} className={topIconClass(isActive(path))} />
      <span className={topTextClass(isActive(path))}>
        {label}
      </span>
      {isActive(path) && (
        <motion.div 
          layoutId="nav-active-indicator-desktop"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[3px] rounded-t-full bg-[#FF7A00]"
        />
      )}
    </Link>
  );

  const MobileBottomNavItem = ({ path, label, Icon }: { path: string, label: string, Icon: React.ElementType }) => {
    const isCurrent = isActive(path);
    return (
      <Link to={path} className={bottomNavItemClass(isCurrent)}>
        <Icon strokeWidth={isCurrent ? 2.5 : 2} className={bottomIconClass(isCurrent)} />
        <span className={bottomTextClass(isCurrent)}>
          {label}
        </span>
        {isCurrent && (
          <motion.div 
            layoutId="nav-active-mobile"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[3.5px] rounded-b-full bg-[#FF7A00] shadow-[0_1px_4px_rgba(255,122,0,0.4)]"
          />
        )}
      </Link>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.04)] border-b border-gray-100 transition-all duration-300">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[60px] sm:h-[70px] lg:h-[80px] w-full">
            
            {/* Logo / Brand */}
            <div className="flex items-center flex-shrink-0 mr-2 sm:mr-6 h-full sm:w-[200px] lg:w-[240px]">
              <Link to="/" className="flex items-center h-full group outline-none">
                {settings.logo ? (
                  <img 
                    src={`https://wsrv.nl/?url=${encodeURIComponent(settings.logo)}&h=80&output=webp&q=80`} 
                    alt={settings.name} 
                    className="h-7 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105" 
                  />
                ) : (
                  <span className="font-display text-[20px] sm:text-[24px] font-black tracking-widest uppercase bg-gradient-to-r from-[#FF7A00] to-[#FF4500] text-transparent bg-clip-text transition-transform duration-300 group-hover:scale-105">
                    BARBIC
                  </span>
                )}
              </Link>
            </div>

            {/* Mobile Search Input (Center) */}
            <div className="flex-1 flex sm:hidden justify-center items-center px-2">
               <button 
                 onClick={() => setSearchOpen(true)} 
                 className="flex items-center w-full max-w-[200px] h-[36px] bg-gray-50 border border-gray-100 rounded-full px-3 text-gray-500 hover:bg-gray-100 transition-colors shadow-inner"
               >
                 <Search size={16} className="text-gray-400" />
                 <span className="ml-2 text-[13px] font-medium">Search...</span>
               </button>
            </div>
            
            {/* Desktop Nav Items (Centered) */}
            <div className="flex-1 items-center justify-center h-full gap-2 lg:gap-4 hidden sm:flex">
                <DesktopNavItem path="/" label="Home" Icon={Home} />
                <DesktopNavItem path="/menu" label="Menu" Icon={Utensils} />
                <DesktopNavItem path="/about" label="Info" Icon={Info} />
                <DesktopNavItem path="/contact" label="Call" Icon={Phone} />

                <div className="w-[1px] h-6 lg:h-8 bg-gray-200 mx-2 flex-shrink-0" />

                <button 
                  onClick={() => setSearchOpen(true)}
                  className={topNavItemClass(false)}
                  title="Search"
                >
                  <Search strokeWidth={2} className={topIconClass(false)} />
                  <span className={topTextClass(false)}>Search</span>
                </button>
            </div>

            {/* Right side (Always visible, Favorites + Cart + Profile) */}
            <div className="flex items-center justify-end w-auto sm:w-[200px] lg:w-[240px] space-x-1 sm:space-x-2 h-full ml-1 sm:ml-2">
              <Link 
                to="/favorites"
                className={topNavItemClass(isActive('/favorites'))}
                title="Favorites"
              >
                <Heart strokeWidth={isActive('/favorites') ? 2.5 : 2} className={topIconClass(isActive('/favorites'))} />
                <span className={topTextClass(isActive('/favorites'))}>Favs</span>
                
                {isActive('/favorites') && (
                  <motion.div 
                    layoutId="nav-active-indicator-desktop"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[3px] rounded-t-full bg-[#FF7A00]"
                  />
                )}
              </Link>

              <button 
                id="cart-icon"
                onClick={onOpenCart}
                className={topNavItemClass(false, true)}
                title="Cart"
              >
                <ShoppingCart strokeWidth={itemCount > 0 ? 2.5 : 2} className={topIconClass(false, true)} />
                <span className={topTextClass(false)}>Cart</span>
                
                {itemCount > 0 && (
                  <motion.div 
                    key={itemCount}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-[2px] right-[2px] lg:top-[4px] lg:right-[4px]"
                  >
                    <span className="flex items-center justify-center min-w-[18px] h-[18px] sm:min-w-[20px] sm:h-[20px] px-1 text-[10px] sm:text-[11px] font-bold leading-none text-white bg-[#FF7A00] rounded-full shadow-[0_2px_6px_rgba(255,122,0,0.5)] border-[1.5px] border-white">
                      {itemCount}
                    </span>
                  </motion.div>
                )}
              </button>

              <Link 
                to={user ? "/profile" : "/login"} 
                className={topNavItemClass(isActive('/profile') || isActive('/login'))}
                title={user ? "Profile" : "Login"}
              >
                {user ? (
                  <User strokeWidth={isActive('/profile') ? 2.5 : 2} className={topIconClass(isActive('/profile'))} />
                ) : (
                  <LogIn strokeWidth={isActive('/login') ? 2.5 : 2} className={topIconClass(isActive('/login'))} />
                )}
                <span className={topTextClass(isActive('/profile') || isActive('/login'))}>
                  {user ? "Profile" : "Login"}
                </span>
                
                {(isActive('/profile') || isActive('/login')) && (
                  <motion.div 
                    layoutId="nav-active-indicator-desktop"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[3px] rounded-t-full bg-[#FF7A00]"
                  />
                )}
              </Link>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation (Zomato/Swiggy style) - Hidden on Checkout */}
      {location.pathname !== '/checkout' && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
          <div className="flex justify-around items-center h-[65px] px-2 bg-white">
             <MobileBottomNavItem path="/" label="Home" Icon={Home} />
             <MobileBottomNavItem path="/menu" label="Menu" Icon={Utensils} />
             <MobileBottomNavItem path="/about" label="Info" Icon={Info} />
             <MobileBottomNavItem path="/contact" label="Call" Icon={Phone} />
          </div>
        </nav>
      )}

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

