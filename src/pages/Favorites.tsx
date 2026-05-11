import React, { useMemo } from 'react';
import { useFavoritesStore } from '../store/favoritesStore';
import { menuData } from '../data/menuData';
import { MenuItemCard } from '../components/MenuItemCard';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Favorites() {
  const { favorites } = useFavoritesStore();

  const favoriteItems = useMemo(() => {
    return menuData.filter((item) => favorites.includes(item.id));
  }, [favorites]);

  return (
    <div className="min-h-screen bg-bg-main pt-16 sm:pt-24 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-ink">Your Favorites</h1>
            <p className="text-gray-500 text-sm mt-1">Food you love across our menu</p>
          </div>
        </div>

        {favoriteItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm text-center px-4">
            <Heart className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No favorite items yet ❤️</h3>
            <p className="text-gray-500 max-w-sm mb-6">Explore the menu and tap the heart icon to save the dishes you love.</p>
            <Link 
              to="/menu"
              className="bg-primary-500 text-white font-bold py-3 px-8 rounded-full shadow-[0_4px_14px_rgba(255,107,0,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,0,0.4)] transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Explore Menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {favoriteItems.map((item, index) => (
              <MenuItemCard key={item.id} item={item} priority={index < 4} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
