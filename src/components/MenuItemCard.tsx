import React, { memo, useState, useEffect, useMemo } from 'react';
import { MenuItem } from '../data/menuData';
import { useCartStore } from '../store/cartStore';
import { useFavoritesStore } from '../store/favoritesStore';
import { MessageCircle, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettings } from '../hooks/useSettings';
import { flyToCartAnimation } from '../utils/cartAnimation';
import { getConsistentRandoms } from '../utils/ratingUtils';
import { FoodBenefitsModal } from './FoodBenefitsModal';
import { PremiumStar } from './PremiumStar';
import { OptimizedImage } from './OptimizedImage';
import { auth } from '../firebase';
import { useNavigate, useLocation } from 'react-router-dom';

interface MenuItemCardProps {
  item: MenuItem;
  priority?: boolean;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = memo(({ item, priority = false }) => {
  if (!item) return null;
  
  const addItem = useCartStore((state) => state.addItem);
  const { isFavorite, toggleFavorite, initDeviceId, markAddedToCart } = useFavoritesStore();
  const { settings } = useSettings();
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    initDeviceId();
  }, [initDeviceId]);

  const isFav = isFavorite(item.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!auth.currentUser) {
      toast('🔒 Login required to continue', {
        icon: null,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
          fontWeight: '500'
        },
      });
      navigate('/login', { state: { from: location } });
      return;
    }

    setIsHeartAnimating(true);
    toggleFavorite(item.id, item.name);
    setTimeout(() => setIsHeartAnimating(false), 300);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!auth.currentUser) {
      toast('🔒 Login required to continue', {
        icon: null,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
          fontWeight: '500'
        },
      });
      navigate('/login', { state: { from: location } });
      return;
    }

    const btnEl = e.currentTarget as HTMLElement;
    const cardEl = btnEl.closest('.menu-card') as HTMLElement;
    
    // Trigger visual fly animation, then update cart store after animation completes
    flyToCartAnimation(cardEl, () => {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        type: item.type,
      });
      if (isFav) {
        markAddedToCart(item.id);
      }
      toast.success(`Added ${item.name} to cart`);
    });
  };

  const handleWhatsAppOrder = () => {
    if (!settings.whatsapp) {
      toast.error('WhatsApp ordering is currently unavailable');
      return;
    }
    const text = encodeURIComponent(`Hi ${settings.name}, I would like to order: ${item.name} (₹${item.price})`);
    const whatsappNum = settings.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/${whatsappNum}?text=${text}`, '_blank');
  };

  const randoms = getConsistentRandoms(item.id);
  const displayRating = (item.rating !== undefined && item.rating !== null && item.rating !== '') ? Number(item.rating).toFixed(1) : randoms.rating;
  const displayCount = (item.reviewCount !== undefined && item.reviewCount !== null && item.reviewCount !== '') ? item.reviewCount : randoms.count;

  return (
    <>
    <div id={item.id} className="menu-card relative rounded-2xl flex flex-col bg-white overflow-hidden shadow-sm hover:shadow-md border border-gray-100 group">
      <div className="relative z-10 flex flex-col h-full p-3 md:p-3.5">
        <div className="relative w-full aspect-[4/3] bg-gray-50 rounded-lg mb-2.5 overflow-hidden flex items-center justify-center shadow-inner">
        <OptimizedImage 
          src={item.imageUrl || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=60'} 
          alt={item.name} 
          className="w-full h-full"
          priority={priority}
        />
        
        {/* Heart Favorite Button */}
        <button 
          onClick={handleFavoriteClick}
          className={`absolute top-2 left-2 z-20 p-2 rounded-full shadow-sm transition-all duration-300 outline-none
            ${isFav ? 'bg-white/95 text-red-500' : 'bg-black/40 w-[34px] h-[34px] flex items-center justify-center text-white/95 hover:bg-white/95 hover:text-red-500'}
            ${isHeartAnimating ? 'scale-125' : 'scale-100'}
          `}
        >
          <Heart 
            className={`w-[18px] h-[18px] transition-all duration-300 ${isFav ? 'fill-current' : 'scale-90 hover:scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'}`}
            strokeWidth={2} 
          />
        </button>
        
        {/* Rating Badge */}
        <div className="absolute bottom-2 right-2 flex flex-col items-center z-20">
          <div className="bg-black/80 px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 mb-0.5 border border-white/20">
            <PremiumStar className="w-3 h-3" />
            <span className="text-[11px] font-bold text-white leading-none tracking-wide">{displayRating}</span>
          </div>
          <div className="text-[9px] font-medium text-white tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {displayCount}+ Ordered
          </div>
        </div>

        <div className="absolute top-2 right-2 bg-white p-1 rounded-full shadow-sm z-20">
          <div className={`w-3 h-3 rounded-full border-2 p-0.5 ${item.type === 'veg' ? 'border-green-600' : item.type === 'non-veg' ? 'border-red-600' : 'border-blue-600'}`}>
            <div className={`w-full h-full rounded-full ${item.type === 'veg' ? 'bg-green-600' : item.type === 'non-veg' ? 'bg-red-600' : 'bg-blue-600'}`}></div>
          </div>
        </div>
      </div>
      
        <div className="flex-1 flex flex-col mt-0.5">
        <h3 className="text-[16px] md:text-[18px] lg:text-[19px] font-bold text-ink mb-1 line-clamp-1">{item.name}</h3>
        
        <div className="flex items-center gap-2.5 mb-3 lg:mb-4">
          <p className="font-bold text-primary-500 text-[17px] md:text-[19px] lg:text-[20px]">₹{item.price}</p>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold uppercase tracking-wider ${
            item.type === 'veg' ? 'bg-green-100/50 text-green-700 border border-green-200/50' :
            item.type === 'non-veg' ? 'bg-red-100/50 text-red-700 border border-red-200/50' :
            'bg-blue-100/50 text-blue-700 border border-blue-200/50'
          }`}>
            {item.type === 'veg' ? 'Veg' : item.type === 'non-veg' ? 'Non Veg' : item.type}
          </span>
        </div>
        
        <div className="flex items-center justify-between gap-1 mt-auto w-full flex-wrap xl:flex-nowrap">
          {settings.whatsapp && (
            <button 
              onClick={handleWhatsAppOrder}
              className="flex-shrink-0 relative overflow-hidden flex items-center justify-center h-9 sm:h-10 px-2.5 sm:px-3 text-[11px] font-bold text-white uppercase tracking-wide whitespace-nowrap rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 group"
              title="WhatsApp Order"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <MessageCircle className="w-4 h-4 fill-white/20 transition-transform group-hover:scale-110 drop-shadow-sm relative z-10" />
            </button>
          )}

          <button 
            onClick={() => setBenefitsOpen(true)}
            className="flex-shrink-0 relative overflow-hidden flex items-center justify-center h-9 sm:h-10 px-2.5 sm:px-3 text-[11px] font-bold text-white uppercase tracking-wide whitespace-nowrap rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 group"
            title="Why Choose This?"
          >
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-[16px] drop-shadow-sm relative z-10 block -mt-[1px]">✨</span>
          </button>

          <button 
            onClick={handleAddToCart}
            className="flex-1 relative overflow-hidden flex items-center justify-center h-9 sm:h-10 px-2 sm:px-3 text-[11px] sm:text-[12px] font-black text-white uppercase tracking-wide whitespace-nowrap rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-red-600 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300 group min-w-[max-content]"
          >
            <div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
            <span className="mr-1.5 text-[14px] sm:text-[16px] drop-shadow-sm relative z-10 block -mt-[1px] flex-shrink-0">🛒</span>
            <span className="relative z-10 flex-shrink-0">Add Order</span>
          </button>
        </div>
      </div>
    </div>
    </div>
    {benefitsOpen && (
      <FoodBenefitsModal 
        key={`modal-benefits-${item.id}`}
        isOpen={benefitsOpen} 
        onClose={() => setBenefitsOpen(false)} 
        item={item} 
      />
    )}
    </>
  );
});
