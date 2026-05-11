import { memo } from 'react';

interface PremiumStarProps {
  className?: string;
  active?: boolean;
}

export const PremiumStar = memo(function PremiumStar({ className = "w-5 h-5", active = true }: PremiumStarProps) {
  return (
    <div className={`relative inline-flex transition-transform duration-300 hover:scale-[1.15] group ${className}`}>
      {/* The actual star */}
      {active ? (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Subtle glow layer behind the star, active on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-80 transition-opacity duration-300 blur-[10px] bg-yellow-400 rounded-full scale-150" />
          
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24"
            className="w-full h-full relative z-10 drop-shadow-[0_0_12px_rgba(255,180,0,0.8)] animate-star-pop"
          >
            <defs>
              <linearGradient id="gold-gradient-star" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFF9C4" />
                <stop offset="20%" stopColor="#FFD700" />
                <stop offset="50%" stopColor="#FFA500" />
                <stop offset="80%" stopColor="#FF8C00" />
                <stop offset="100%" stopColor="#B45309" />
              </linearGradient>
              <filter id="star-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <polygon 
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              fill="url(#gold-gradient-star)"
              stroke="#92400E"
              strokeWidth="0.5"
              strokeLinejoin="round"
              style={{ filter: active ? 'url(#star-glow)' : 'none' }}
              className="drop-shadow-[0_0_8px_rgba(255,180,0,0.6)]"
            />
          </svg>
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24"
            className="w-full h-full text-gray-300 drop-shadow-sm transition-colors duration-300"
          >
            <defs>
              <linearGradient id="grey-gradient-star" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F3F4F6" />
                <stop offset="100%" stopColor="#E5E7EB" />
              </linearGradient>
            </defs>
            <polygon 
              points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              fill="url(#grey-gradient-star)"
              stroke="#9CA3AF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
});
