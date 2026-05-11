import { MapPin, Phone, MessageCircle, Star } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export function Footer() {
  const { settings, loading } = useSettings();

  if (loading) return null;

  return (
    <footer className="relative bg-transparent border-t border-white/10 text-white pt-12 pb-0 mb-0 overflow-hidden footer-video-section">
      <div className="absolute inset-0 bg-[#111] z-0 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
              {settings.logo ? (
                <img src={settings.logo} alt={settings.name} className="h-8 mb-4 object-contain" />
              ) : (
                <h3 className="font-display text-2xl font-bold text-[#E23744] mb-4">{settings.name}</h3>
              )}
              <p className="text-white/70 mb-4 text-sm">
                {settings.description}
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Contact Us</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 text-accent-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-white/70">{settings.address}</span>
                </li>
                <li className="flex items-center">
                  <Phone className="w-5 h-5 text-accent-500 mr-2 flex-shrink-0" />
                  <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="text-white/70 hover:text-white transition-colors">{settings.phone}</a>
                </li>
                <li className="flex items-center pt-2">
                  <a 
                    href="https://search.google.com/local/writereview?placeid=ChIJtxdjS2n5-jkRQGdxR5IgeY4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-[#FFD700] border border-white/10 bg-white/5 px-2.5 py-1 rounded-lg hover:bg-white/10 hover:text-[#FFC107] font-bold transition-all group"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <Star className="w-4 h-4 fill-current transition-transform group-hover:scale-125" />
                    <span>Review us on Google</span>
                  </a>
                </li>
                {settings.whatsapp && (
                  <li className="flex items-center">
                    <MessageCircle className="w-5 h-5 text-wa mr-2 flex-shrink-0" />
                    <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hello BARBIC, I want to order food.')}`} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white transition-colors">WhatsApp Us</a>
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4 text-white">Opening Hours</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li className="flex justify-between">
                  <span>Monday - Sunday</span>
                  <span>{settings.openingTime} - {settings.closingTime}</span>
                </li>
              </ul>
            {settings.googleMapsLink && (
              <div className="mt-6">
                <a 
                  href={settings.googleMapsLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none"
                >
                  Get Directions
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/50 text-[12px] tracking-[1px] uppercase">
          {settings.address.split(',')[0]} © {new Date().getFullYear()} {settings.name}
        </div>
      </div>
    </footer>
  );
}
