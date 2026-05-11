import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItemCard } from '../components/MenuItemCard';
import { VideoPlaceholder } from '../components/VideoPlaceholder';
import { useMenuStore } from '../store/menuStore';
import { motion, AnimatePresence } from 'motion/react';

const SkeletonCard = () => (
  <div className="bg-[#1a1a1a]/80 rounded-xl shadow-sm border border-white/10 overflow-hidden animate-pulse">
    <div className="h-48 bg-white/5" />
    <div className="p-5">
      <div className="flex justify-between items-start mb-2">
        <div className="h-6 bg-white/5 rounded w-2/3"></div>
      </div>
      <div className="h-4 bg-white/5 rounded w-full mb-2"></div>
      <div className="h-4 bg-white/5 rounded w-4/5 mb-4"></div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-6 bg-white/5 rounded w-16"></div>
        <div className="h-10 bg-white/5 rounded w-32"></div>
      </div>
    </div>
  </div>
);

export function Menu() {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeDiet, setActiveDiet] = useState<string>('All');
  const { items: menuItems, loading } = useMenuStore();
  const location = useLocation();

  useEffect(() => {
    if (!loading && location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-primary-500', 'ring-offset-2');
          setTimeout(() => element.classList.remove('ring-4', 'ring-primary-500', 'ring-offset-2'), 2000);
        }, 100);
      }
    }
  }, [loading, location.hash, menuItems]);
  
  const categories = useMemo(() => {
    return Array.from(new Set(menuItems.map(item => item.category)));
  }, [menuItems]);
  
  const filteredMenu = useMemo(() => {
    return menuItems.filter(item => {
      const matchCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchDiet = activeDiet === 'All' || item.type === activeDiet;
      return matchCategory && matchDiet;
    });
  }, [activeCategory, activeDiet, menuItems]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col min-h-screen bg-black/70 relative z-10"
    >
      {/* Transparent Hero Section */}
      <div className="relative w-full min-h-[40vh] sm:min-h-[50vh] flex flex-col justify-center items-center text-center overflow-hidden bg-transparent mb-8 lg:mb-12 shadow-md max-w-[1400px] mx-auto rounded-none lg:rounded-b-3xl">

        {/* Hero Content */}
        <div className="relative z-[2] flex flex-col justify-center items-center w-full h-full p-6 sm:p-8 text-white mt-10 md:mt-0">
          <h1 
            className="font-display font-[800] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#E23744] via-[#FF7A00] to-[#E23744] mb-4"
            style={{
              fontSize: 'clamp(32px, 6vw, 80px)',
              lineHeight: '1.2',
              filter: 'drop-shadow(0px 2px 4px rgba(226, 55, 68, 0.2))'
            }}
          >
            OUR MENU
          </h1>
          <p className="text-white/90 max-w-2xl mx-auto font-medium text-sm md:text-base drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            Explore our wide variety of authentic Indian and Chinese dishes, prepared with the finest ingredients and traditional spices.
          </p>
        </div>
      </div>

      <div className="flex-1 w-full bg-transparent relative z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-12 lg:pb-20">

        {/* Diet Filter Buttons */}
        <div className="flex justify-center gap-3 mb-8">
          {[
            { id: 'veg', label: 'Veg', color: 'text-green-600', activeBg: 'bg-green-50 border-green-200 text-green-700' },
            { id: 'All', label: 'All', color: 'text-amber-600', activeBg: 'bg-amber-50 border-amber-200 text-amber-700' },
            { id: 'non-veg', label: 'Non-Veg', color: 'text-red-600', activeBg: 'bg-red-50 border-red-200 text-red-700' }
          ].map((diet) => (
            <button
              key={diet.id}
              onClick={() => setActiveDiet(diet.id)}
              className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest border transition-all duration-300 ${
                activeDiet === diet.id 
                  ? diet.activeBg + ' shadow-sm scale-110 !border-white/40' 
                  : 'bg-[#1a1a1a]/80 border-white/20 text-white/70 hover:text-white hover:border-white/40'
              }`}
            >
              <span className={activeDiet === diet.id ? '' : diet.color + ' opacity-90'}>
                {diet.id === 'veg' && '🌿 '}
                {diet.id === 'non-veg' && '🍗 '}
                {diet.label}
              </span>
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex gap-2.5 overflow-x-auto whitespace-nowrap px-2 pb-4 mb-8 sm:mb-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full max-w-[100vw]" style={{ scrollBehavior: 'smooth' }}>
          {loading ? (
             Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex-none h-10 w-24 bg-[#1a1a1a]/80 rounded-[18px] animate-pulse" />
             ))
          ) : (
            categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(activeCategory === category ? 'All' : category)}
                className={`flex-none px-5 py-2.5 rounded-full text-sm font-medium uppercase tracking-wider transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-gradient-to-r from-[#FF7A00] to-[#E23744] text-white shadow-[0_4px_15px_rgba(226,55,68,0.4)] border border-transparent'
                    : 'bg-[#1a1a1a]/80 text-white/80 hover:text-white hover:bg-white/20 border border-white/20 shadow-sm'
                }`}
              >
                {category}
              </button>
            ))
          )}
        </div>

        {/* Menu Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8 mx-auto"
        >
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            ) : (
              filteredMenu.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <MenuItemCard item={item} priority={i < 4} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
        
        {!loading && filteredMenu.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No items found in this category.</p>
          </div>
        )}
        </div>
      </div>
    </motion.div>
  );
}
