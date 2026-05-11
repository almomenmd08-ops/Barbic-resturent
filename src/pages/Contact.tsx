import { MapPin, Phone, MessageCircle, Clock } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export function Contact() {
  const { settings, loading } = useSettings();

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent py-12 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Extract a suitable embed src if they put a standard URL. We can try to use a default robust Maps embed link mapped to the location text if they didn't provide an embed link. But we'll leave as is conceptually or use an iframe.
  
  return (
    <div className="min-h-screen py-12 relative z-10 bg-black/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 
            className="font-display font-[800] tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#E23744] via-[#FF7A00] to-[#E23744] mb-4 w-full uppercase mx-auto"
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
            CONTACT {settings.name}
          </h1>
          <p className="text-text-muted max-w-2xl mx-auto">
            We'd love to hear from you! Whether you have a question about our menu, want to make a reservation, or need help with an order.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-2xl font-semibold text-text-main mb-6">Get in Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-primary-500/10 p-3 rounded-full">
                  <MapPin className="w-6 h-6 text-primary-500" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-text-main">Location</h3>
                  <p className="mt-1 text-text-muted">
                    {settings.address}
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-primary-500/10 p-3 rounded-full">
                  <Phone className="w-6 h-6 text-primary-500" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-text-main">Phone</h3>
                  <p className="mt-1 text-text-muted">
                    <a href={`tel:${settings.phone.replace(/\s+/g, '')}`} className="hover:text-primary-500 transition-colors">{settings.phone}</a>
                  </p>
                </div>
              </div>

              {settings.whatsapp && (
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-wa/10 p-3 rounded-full">
                    <MessageCircle className="w-6 h-6 text-wa" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-text-main">WhatsApp</h3>
                    <p className="mt-1 text-text-muted">
                      <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hello BARBIC, I want to order food.')}`} target="_blank" rel="noopener noreferrer" className="hover:text-wa transition-colors">{settings.whatsapp}</a>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-primary-500/10 p-3 rounded-full">
                  <Clock className="w-6 h-6 text-primary-500" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-text-main">Hours</h3>
                  <p className="mt-1 text-text-muted">
                    Monday - Sunday<br />
                    {settings.openingTime} - {settings.closingTime}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-[400px] md:h-auto">
            <iframe 
              src={`https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${encodeURIComponent(settings.address)}&t=&z=14&ie=UTF8&iwloc=B&output=embed`} 
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
              title={`${settings.name} Restaurant Location`}
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
