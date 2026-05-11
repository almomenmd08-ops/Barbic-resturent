import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { ChevronLeft, ChevronRight, Ticket, ClipboardCopy, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { OptimizedImage } from './OptimizedImage';

export function CouponSlider() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'coupons'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((coupon: any) => coupon.active && new Date(coupon.expiryDate) >= new Date());

      // Re-sort locally just in case displayOrder didn't trigger correctly due to indexes
      items.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
      
      setCoupons(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching active coupons:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code ${code} copied!`);
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="animate-pulse bg-gray-200 h-48 w-full rounded-2xl"></div>
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="w-full bg-[#1A1A1A] py-8 lg:py-12 border-t border-b border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <Ticket className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h2 className="font-display text-xl lg:text-2xl font-black text-gray-500 uppercase tracking-tight">
            No Active Offers
          </h2>
          <p className="text-gray-600 mt-2 text-sm lg:text-base">Check back later for new delicious deals!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#1A1A1A] py-8 lg:py-12 border-t border-b border-white/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
         <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[150%] bg-[#E23744]/20 rounded-full mix-blend-screen"></div>
         <div className="absolute bottom-[-50%] right-[-10%] w-[50%] h-[150%] bg-[#FF7A00]/20 rounded-full mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="font-display text-2xl lg:text-3xl font-black text-white uppercase tracking-tight flex items-center">
              <Ticket className="w-6 h-6 lg:w-8 lg:h-8 text-[#FF7A00] mr-3" />
              Exclusive Offers
            </h2>
            <p className="text-gray-400 mt-1 text-sm lg:text-base">Grap the best deals on your favorite meals today.</p>
          </div>
          
          {coupons.length > 2 && (
            <div className="hidden lg:flex gap-2">
              <button 
                onClick={scrollLeft}
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={scrollRight}
                className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

        <div className="relative -mx-4 sm:mx-0">
           <div 
             ref={scrollContainerRef}
             className="flex overflow-x-auto gap-4 sm:gap-6 px-4 sm:px-0 pb-6 snap-x snap-mandatory no-scrollbar"
             style={{ paddingRight: '20px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
           >
             {coupons.map((coupon) => (
               <div 
                 key={coupon.id} 
                 className="flex-none w-[280px] sm:w-[320px] lg:w-[380px] snap-center snap-always bg-white rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] group hover:shadow-[0_12px_40px_rgba(255,122,0,0.15)] transition-all duration-300 relative border border-gray-100 flex flex-col h-full"
               >
                 {/* Top section: Background / Banner */}
                 <div className="h-[120px] sm:h-[140px] relative w-full bg-gradient-to-br from-[#1A1A1A] to-[#0F0F12] overflow-hidden flex-shrink-0">
                   {coupon.imageUrl ? (
                     <>
                      <OptimizedImage 
                         src={coupon.imageUrl} 
                         alt={coupon.title} 
                         className="w-full h-full opacity-90 group-hover:scale-105 transition-transform duration-700" 
                         priority={true}
                       />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                     </>
                   ) : (
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/food.png')] opacity-10"></div>
                   )}
                   
                   {/* Promo tag */}
                   <div className="absolute top-4 left-4 bg-white text-ink px-3 py-1 font-black text-xs uppercase tracking-widest rounded shadow-lg">
                     {coupon.discountType === 'percentage' && `${coupon.discountValue}% OFF`}
                     {coupon.discountType === 'flat' && `₹${coupon.discountValue} OFF`}
                     {coupon.discountType === 'free_item' && `FREE ITEM`}
                     {coupon.discountType === 'free_delivery' && `FREE DELIVERY`}
                   </div>

                   {/* Title floating on banner */}
                   <div className="absolute bottom-4 left-4 right-4">
                     <h3 className="text-white font-black text-lg sm:text-xl leading-tight drop-shadow-md">
                       {coupon.title}
                     </h3>
                   </div>
                 </div>

                 {/* Wave separator */}
                 <div className="absolute top-[115px] sm:top-[135px] left-0 w-full overflow-hidden leading-none z-10 flex text-white justify-between px-4">
                    <div className="w-4 h-4 bg-white rotate-45 transform -translate-x-6"></div>
                    <div className="w-4 h-4 bg-[#1A1A1A] rotate-45 transform translate-y-3 shadow-inner"></div>
                    <div className="w-4 h-4 bg-white rotate-45 transform translate-x-6"></div>
                 </div>

                 {/* Bottom section: Content & Action */}
                 <div className="p-5 flex-grow flex flex-col justify-between pt-6 bg-white relative z-0 border-t-2 border-dashed border-gray-200">
                    <div className="absolute -top-3 -left-3 w-6 h-6 bg-[#1A1A1A] rounded-full border border-white/5"></div>
                    <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#1A1A1A] rounded-full border border-white/5"></div>

                    <div>
                      {coupon.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                          {coupon.description}
                        </p>
                      )}
                      <div className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                        <Info className="w-3.5 h-3.5 mr-1" />
                        Min Order: ₹{coupon.minOrderValue}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 mt-auto">
                      <div 
                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-grow cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => copyToClipboard(coupon.code)}
                      >
                        <span className="font-mono font-bold text-ink tracking-wider text-sm sm:text-base">
                          {coupon.code}
                        </span>
                        <ClipboardCopy className="w-4 h-4 text-primary-500" />
                      </div>
                      <Link 
                        to="/menu" 
                        className="flex-shrink-0 bg-gradient-to-r from-[#FF7A00] to-[#E23744] hover:from-[#E23744] hover:to-[#FF7A00] text-white px-5 py-2.5 rounded-xl font-bold uppercase tracking-wide shadow-[0_4px_15px_rgba(226,55,68,0.3)] hover:shadow-[0_6px_20px_rgba(226,55,68,0.4)] transition-all duration-300 text-sm sm:text-base cursor-pointer"
                      >
                        Apply
                      </Link>
                    </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
