import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { PremiumStar } from '../components/PremiumStar';
import { VideoPlaceholder } from '../components/VideoPlaceholder';
import { ArrowRight, Star, Clock, MapPin, ShoppingBag, MessageCircle, Phone, ExternalLink } from 'lucide-react';
import { MenuItemCard } from '../components/MenuItemCard';
import { useSettings } from '../hooks/useSettings';
import { CouponSlider } from '../components/CouponSlider';
import { useMenuStore } from '../store/menuStore';

export function Home() {
  const { settings, loading } = useSettings();
  const { items: allMenuItems, loading: menuLoading } = useMenuStore();

  const featuredItems = useMemo(() => {
    return allMenuItems
      .filter(item => item.isFeaturedHome)
      .sort((a, b) => (a.homeOrder || Number.MAX_SAFE_INTEGER) - (b.homeOrder || Number.MAX_SAFE_INTEGER))
      .slice(0, 4);
  }, [allMenuItems]);

  return (
    <div className="flex flex-col min-h-screen bg-black/70 relative z-10">
      <div className="flex-1 relative">
        {/* Full Width Hero */}
        <section className="relative w-full min-h-[100dvh] pb-[80px] flex flex-col items-center justify-center bg-transparent section" style={{ overflow: 'hidden' }}>

          <div className="hero-content relative z-[1] flex flex-col justify-center items-center w-full h-full p-6 sm:p-10 text-white text-center mt-[60px] md:mt-[80px]">
            <div className="mb-4 mt-10 md:mt-0">
              <span className="inline-block bg-gradient-to-r from-[#FF7A00] to-[#E23744] text-white px-4 py-1.5 text-[11px] sm:text-xs font-bold rounded-full uppercase tracking-widest shadow-sm">
                {settings.isOpen ? 'OPEN NOW' : 'CLOSED'} • {settings.openingTime} - {settings.closingTime}
              </span>
            </div>
            
            <h1 
              className="font-display font-[800] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#E23744] via-[#FF7A00] to-[#E23744] mb-4 lg:mb-6"
              style={{
                fontSize: 'clamp(32px, 6vw, 80px)',
                lineHeight: '1.1',
                filter: 'drop-shadow(0px 2px 4px rgba(226, 55, 68, 0.2))'
              }}
            >
              BARBIC RESTAURANT
            </h1>

            <div className="w-full max-w-[95%] md:max-w-2xl lg:max-w-4xl mx-auto mb-8 space-y-4 sm:space-y-6">
              {/* Cuisine Tags */}
              <div className="flex items-center justify-center gap-2.5 md:gap-4 text-white/90 font-medium text-[0.95rem] md:text-lg tracking-wide drop-shadow-md">
                <span>Indian</span>
                <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white/60 rounded-full"></span>
                <span>Chinese</span>
                <span className="w-1 h-1 md:w-1.5 md:h-1.5 bg-white/60 rounded-full"></span>
                <span>Fast Food</span>
              </div>

              {/* Trust Badge Grid */}
              <div className="flex flex-col md:flex-row justify-center gap-3 sm:gap-4 lg:gap-6 mt-4 md:mt-6">
                <div className="flex-1 max-w-[280px] mx-auto w-full bg-black/60 rounded-2xl p-4 md:p-6 border border-white/10 flex flex-col justify-center items-center transition-all hover:bg-black/70 hover:-translate-y-0.5">
                  <div className="flex items-center gap-1.5 mb-1.5 text-white">
                    <svg className="w-5 h-5 md:w-6 md:h-6 shadow-sm" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <PremiumStar className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="font-bold text-xl md:text-3xl leading-none">4.8</span>
                  </div>
                  <span className="text-[11px] md:text-xs text-white/70 font-bold uppercase tracking-widest">Google Rating</span>
                </div>

                <div className="flex-1 max-w-[280px] mx-auto w-full bg-black/60 rounded-2xl p-4 md:p-6 border border-white/10 flex flex-col justify-center items-center transition-all hover:bg-black/70 hover:-translate-y-0.5">
                  <div className="flex items-center gap-1.5 mb-1.5 text-white">
                    <span className="text-[1.2rem] md:text-2xl">🛵</span>
                    <span className="font-bold text-xl md:text-3xl leading-none">15-20</span>
                  </div>
                  <span className="text-[11px] md:text-xs text-white/70 font-bold uppercase tracking-widest">Mins Delivery</span>
                </div>
              </div>

              {/* Location & Status Info */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[0.95rem] text-white bg-black/60 py-3.5 px-5 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-[1.1rem]">📍</span>
                  <span>Sujapur, Kaliachak</span>
                </div>
                <div className="hidden sm:block w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                <div className="flex items-center gap-2.5 font-bold tracking-wide">
                  {settings.isOpen ? (
                    <><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[#25D366]"></span></span><span className="text-[#25D366]">Open Now</span></>
                  ) : (
                    <><span className="relative flex h-3 w-3"><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span><span className="text-red-400">Closed</span></>
                  )}
                </div>
              </div>

              {/* Social Proof */}
              <div className="flex items-center justify-center gap-2.5 font-semibold bg-gradient-to-r from-orange-500/30 to-red-500/30 py-3 px-5 rounded-full w-fit mx-auto border border-orange-500/30 text-white">
                <span className="text-lg leading-none">🔥</span> 
                <span className="text-[0.95rem]">Loved by local foodies</span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3.5 mt-8 md:mt-12 mb-8 w-full max-w-[280px] md:max-w-3xl mx-auto justify-center relative z-[3]">
              <Link 
                to="/menu" 
                className="btn-primary group h-[48px] md:h-[56px] text-[14px] md:text-[15px] uppercase flex items-center justify-center px-6 md:px-8 w-full md:w-auto min-w-[220px] shadow-md hover:shadow-lg rounded-xl"
              >
                <ShoppingBag className="absolute left-5 md:static md:mr-3 w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-transform duration-300 group-hover:-translate-y-[2px] group-hover:rotate-[-8deg] group-hover:scale-110 animate-[icon-bounce_3s_ease-in-out_infinite]" />
                <span className="ml-5 md:ml-0 text-white font-bold tracking-wide">ORDER ONLINE NOW</span>
              </Link>
              
              {settings.whatsapp && (
                <a 
                  href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hello BARBIC, I want to order food.')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-whatsapp group h-[48px] md:h-[56px] text-[14px] md:text-[15px] uppercase flex items-center justify-center px-6 md:px-8 w-full md:w-auto min-w-[220px] shadow-md hover:shadow-lg rounded-xl"
                >
                  <MessageCircle className="absolute left-5 md:static md:mr-3 w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-transform duration-300 group-hover:-translate-y-[2px] group-hover:rotate-[8deg] group-hover:scale-110 animate-[icon-pulse_2.5s_ease-in-out_infinite] fill-white/10" />
                  <span className="ml-5 md:ml-0 text-white font-bold tracking-wide">WHATSAPP ORDER</span>
                </a>
              )}
              
              <a 
                href={`tel:${settings.phone.replace(/\s+/g, '')}`} 
                className="btn-call group h-[48px] md:h-[56px] text-[14px] md:text-[15px] uppercase flex items-center justify-center px-6 md:px-8 w-full md:w-auto min-w-[220px] shadow-md hover:shadow-lg rounded-xl"
              >
                <Phone className="absolute left-5 md:static md:mr-3 w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-transform duration-300 group-hover:-translate-y-[2px] group-hover:rotate-[15deg] group-hover:scale-110 animate-[icon-bounce_3.5s_ease-in-out_infinite] fill-white/10" />
                <span className="ml-5 md:ml-0 text-white font-bold tracking-wide">CALL TO ORDER</span>
              </a>
            </div>
            <div className="text-[11px] md:text-[13px] font-medium text-white/50 text-center mt-3 md:mt-4 w-full tracking-wider">{settings.phone}</div>
          </div>
        </section>

        {/* Main Content Area */}
        <div className="flex flex-col min-w-0 relative z-10 bg-transparent">
          <CouponSlider />
          {/* Signature Dishes Section */}
          <section className="p-6 sm:p-10 lg:p-12 flex-1 bg-neutral-800/80 mt-4 mx-4 md:mx-6 lg:mx-8 rounded-3xl border border-white/5 shadow-lg relative z-20 text-center">
            <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center mb-8 lg:mb-10 gap-4">
              <div className="hidden sm:block w-[120px]"></div> {/* Spacer for perfect centering */}
              <h2 className="font-display text-3xl md:text-4xl text-white font-bold tracking-wide">Signature Dishes</h2>
              <Link to="/menu" className="btn-view-all w-[120px] px-4 py-2.5 text-sm font-medium tracking-wide rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 transition-all ml-auto sm:ml-0 flex items-center justify-center">View All &rarr;</Link>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 text-left">
              {featuredItems.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white border border-gray-100 p-3 h-[380px] shadow-sm animate-pulse flex flex-col">
                    <div className="w-full aspect-[4/3] bg-gray-200 rounded-lg mb-3" />
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-5 bg-gray-200 rounded w-1/4 mb-4" />
                    <div className="mt-auto flex gap-2">
                      <div className="h-10 bg-gray-200 rounded-full flex-1" />
                      <div className="h-10 bg-gray-200 rounded-full flex-1" />
                    </div>
                  </div>
                ))
              ) : (
                featuredItems.map(item => (
                  <MenuItemCard key={item.id} item={item} priority={true} />
                ))
              )}
            </div>
          </section>

          {/* Google Review Call-to-Action Section */}
          <section className="py-16 bg-transparent relative overflow-hidden group">
            {/* Ambient Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent pointer-events-none" />
            
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
              <div className="inline-flex items-center gap-2.5 bg-[#1a1a1a]/80 px-5 py-2.5 rounded-full border border-white/10 text-white mb-8 shadow-2xl">
                <div className="flex -space-x-2">
                  {[
                    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80'
                  ].map((url, i) => (
                    <img 
                      key={i}
                      src={url} 
                      className="w-7 h-7 rounded-full border-2 border-[#1a1a1a] object-cover bg-gray-800"
                      alt={`Happy Customer ${i + 1}`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold tracking-wide ml-1">Join 500+ happy customers</span>
              </div>

              <h2 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tight mb-6 leading-[1.1]">
                Love our food?<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">Share your experience!</span>
              </h2>
              
              <p className="text-lg text-white/60 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                Your feedback helps us grow. Please take a moment to rate us on Google and help others discover the taste of BARBIC.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                  href="https://search.google.com/local/writereview?placeid=ChIJtxdjS2n5-jkRQGdxR5IgeY4"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-3 px-8 py-4 bg-white text-black font-black text-lg rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.1)] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <Star className="w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
                  </div>
                  <span>Review us on Google</span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-50 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </a>
              </div>

              {/* Verified Trust Badges */}
              <div className="mt-12 flex items-center justify-center gap-8 transition-all duration-500">
                <div className="flex flex-col items-center">
                  <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">Verified</div>
                </div>
                <div className="h-8 w-px bg-white/20"></div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <PremiumStar className="w-5 h-5" />
                    <div className="text-white font-bold text-xl">4.8</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] font-black text-white/70">Avg Rating</div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="pt-16 bg-transparent border-t border-white/10 relative z-10 last-section mb-0 pb-0">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-0 mb-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  whileHover={{ y: -5 }}
                  className="flex items-center p-6 bg-[#1a1a1a]/80 border border-white/20 rounded-2xl shadow-xl transition-all duration-300"
                >
                  <motion.div 
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex-shrink-0 bg-gradient-to-br from-orange-400 to-red-500 p-3.5 rounded-2xl shadow-[0_0_20px_rgba(255,122,0,0.3)] ring-1 ring-white/30"
                  >
                    <PremiumStar className="w-7 h-7 text-white drop-shadow-md" />
                  </motion.div>
                  <div className="ml-5">
                    <h3 className="text-xl font-display font-bold text-white tracking-wide">Premium Quality</h3>
                    <p className="text-sm text-white/60 font-medium mt-0.5">Finest ingredients & authentic recipes</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  whileHover={{ y: -5 }}
                  className="flex items-center p-6 bg-[#1a1a1a]/80 border border-white/20 rounded-2xl shadow-xl transition-all duration-300"
                >
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="flex-shrink-0 bg-gradient-to-br from-orange-400 to-red-500 p-3.5 rounded-2xl shadow-[0_0_20px_rgba(255,122,0,0.3)] ring-1 ring-white/30"
                  >
                    <Clock className="w-7 h-7 text-white drop-shadow-md" />
                  </motion.div>
                  <div className="ml-5">
                    <h3 className="text-xl font-display font-bold text-white tracking-wide">Fast Delivery</h3>
                    <p className="text-sm text-white/60 font-medium mt-0.5">Hot & fresh food delivered quickly</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  whileHover={{ y: -5 }}
                  className="flex items-center p-6 bg-[#1a1a1a]/80 border border-white/20 rounded-2xl shadow-xl transition-all duration-300"
                >
                  <motion.div 
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="flex-shrink-0 bg-gradient-to-br from-orange-400 to-red-500 p-3.5 rounded-2xl shadow-[0_0_20px_rgba(255,122,0,0.3)] ring-1 ring-white/30"
                  >
                    <MapPin className="w-7 h-7 text-white drop-shadow-md" />
                  </motion.div>
                  <div className="ml-5">
                    <h3 className="text-xl font-display font-bold text-white tracking-wide">Prime Location</h3>
                    <p className="text-sm text-white/60 font-medium mt-0.5">Sujapur Main Rd, Kaliachak, Malda</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
