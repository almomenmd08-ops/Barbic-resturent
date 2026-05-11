import React, { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { ShieldCheck, Leaf, Clock, MapPin } from 'lucide-react';

const HERO_IMAGES = [
  'https://wsrv.nl/?url=i.ibb.co/4Zphp23y/A-luxurious-premium-restaurant-interior-202604302325.jpg&w=1200&output=webp&q=70',
  'https://wsrv.nl/?url=i.ibb.co/S4pryHjX/A-luxurious-premium-restaurant-interior-202604302325-1.jpg&w=1200&output=webp&q=70',
  'https://wsrv.nl/?url=i.ibb.co/sv2F3q37/A-premium-luxury-fine-dining-202604302338.jpg&w=1200&output=webp&q=70'
];

export function About() {
  const { settings, loading } = useSettings();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [previousImageIndex, setPreviousImageIndex] = useState(HERO_IMAGES.length - 1);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Preload images
    HERO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    // Auto slide
    const interval = setInterval(() => {
      setPreviousImageIndex(currentImageIndex);
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % HERO_IMAGES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const aboutText = settings.aboutText || `Welcome to ${settings.name}, your trusted local restaurant for the best authentic Indian and Chinese cuisine. We proudly serve our community with flavors that excite the palate and warm the soul.`;
  const yearsExp = settings.yearsExperience || '5';

  return (
    <div className="min-h-screen flex flex-col bg-black/70 relative z-10">
      {/* Hero Section */}
      <section className="relative w-full aspect-[3/4] md:aspect-[16/9] lg:aspect-[21/9] max-h-[80vh] min-h-[400px] overflow-hidden flex items-center justify-center bg-transparent">
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/40 z-10 transition-colors"></div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center justify-center h-full">
          <h1 
            className="font-display font-[800] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#E23744] via-[#FF7A00] to-[#E23744] mb-4 w-full uppercase"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
              lineHeight: '1.2',
              whiteSpace: 'normal',
              wordBreak: 'keep-all',
              overflow: 'visible',
              paddingBottom: '0.15em',
              filter: 'drop-shadow(0px 2px 4px rgba(226, 55, 68, 0.2))'
            }}
          >
            ABOUT {settings.name}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto text-white drop-shadow-md font-medium px-4">
            Delivering the finest authentic Indian taste and culinary excellence to your doorstep.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl font-bold text-text-main mb-6">Our Story & Mission</h2>
            <div className="prose prose-orange text-text-muted leading-relaxed whitespace-pre-wrap">
              {aboutText}
            </div>
            
            <div className="mt-8 p-6 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-center text-center">
              <div>
                <span className="block font-display text-4xl font-bold text-primary-500 mb-1">{yearsExp}+</span>
                <span className="text-sm font-bold uppercase tracking-wider text-text-main">Years of Experience</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50">
              <Leaf className="w-8 h-8 text-green-500 mb-4" />
              <h3 className="font-bold text-lg text-text-main mb-2">Fresh Ingredients</h3>
              <p className="text-sm text-text-muted">We source only the freshest, highest-quality local ingredients for our daily preparations to ensure the best Indian taste.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50">
              <ShieldCheck className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="font-bold text-lg text-text-main mb-2">Hygienic Kitchen</h3>
              <p className="text-sm text-text-muted">Our professional chefs maintain the highest standards of cleanliness and food safety in our state-of-the-art kitchen.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50">
              <Clock className="w-8 h-8 text-accent-500 mb-4" />
              <h3 className="font-bold text-lg text-text-main mb-2">Fast Delivery</h3>
              <p className="text-sm text-text-muted">Hot, fresh, and on time. Our dedicated delivery team ensures your meal arrives perfectly packaged and ready to eat.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100/50">
              <MapPin className="w-8 h-8 text-primary-500 mb-4" />
              <h3 className="font-bold text-lg text-text-main mb-2">Trusted Local</h3>
              <p className="text-sm text-text-muted">A top-rated restaurant near you, trusted by thousands of happy customers for outstanding customer satisfaction.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <section className="py-16 md:py-24 bg-[#111] border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#E23744]/10 to-[#FF7A00]/10 rounded-full blur-[100px] pointer-events-none opacity-50" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E23744]/10 mb-6 border border-[#E23744]/20">
            <MapPin className="w-6 h-6 text-[#E23744]" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
            Serving Sujapur & Nearby Areas
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-base md:text-lg leading-relaxed font-medium">
            We prepare fresh BARBIC favorites in Sujapur and deliver quickly to nearby neighborhoods with trusted local service and fast doorstep delivery.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4 max-w-3xl mx-auto">
            {['Gayeshbari', 'Boromottor', 'Chamagaram', 'Boro Sujapur', 'Choto Sujapur', 'Bakhorpur'].map((area) => (
              <span 
                key={area} 
                className="px-5 py-2.5 bg-black/40 backdrop-blur-sm border border-white/10 hover:border-[#E23744]/40 rounded-full text-sm md:text-base font-semibold text-gray-300 hover:text-white transition-all duration-300 shadow-xl flex items-center justify-center gap-2 group cursor-default"
              >
                <div className="w-2 h-2 rounded-full bg-[#FF7A00]/70 group-hover:bg-[#E23744] transition-colors shadow-[0_0_8px_rgba(255,122,0,0.5)] group-hover:shadow-[0_0_8px_rgba(226,55,68,0.8)]" />
                {area}
              </span>
            ))}
          </div>
          
          {/* SEO Hidden Keywords */}
          <div className="sr-only">
            Sujapur food delivery, Nearby restaurant delivery, Fast local food delivery, Best restaurant in Sujapur, Order food online Sujapur.
          </div>
        </div>
      </section>
    </div>
  );
}
