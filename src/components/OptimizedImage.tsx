import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

const getOptimizedUrl = (url: string, width: number = 800) => {
  if (!url) return '';
  if (url.includes('unsplash.com')) {
    if (!url.includes('w=')) {
      return url.includes('?') ? `${url}&w=${width}&q=80` : `${url}?w=${width}&q=80`;
    }
    return url;
  }
  if (url.startsWith('data:') || url.endsWith('.svg')) return url;
  
  // ImgBB directly serves fast CDN images but doesn't resize on the fly natively
  // We can let it load directly to avoid proxy latency
  if (url.includes('ibb.co') || url.includes('imgbb.com')) {
     return url; 
  }

  // Firebase storage URLs
  if (url.includes('firebasestorage.googleapis.com')) {
     return url;
  }
  
  // For other external links, return as is
  return url;
};

export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({ src, alt, className = '', priority = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(getOptimizedUrl(src, priority ? 1200 : 800));
  const imgRef = useRef<HTMLImageElement>(null);

  // Update src if prop changes
  useEffect(() => {
    setCurrentSrc(getOptimizedUrl(src, priority ? 1200 : 800));
    setIsLoaded(false);
  }, [src, priority]);

  // If priority is true, preload it using a link tag dynamically
  useEffect(() => {
    if (priority && currentSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = currentSrc;
      document.head.appendChild(link);
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [currentSrc, priority]);

  // Handle cached images
  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Shimmer skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 bg-gray-200 animate-pulse skeleton-shimmer" />
      )}
      
      {/* Image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover object-center transition-opacity duration-300 ease-in-out z-10 relative ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          // If the proxy fails or image fails, fallback to original src, then to placeholder
          if (currentSrc !== src && !currentSrc.includes('unsplash.com')) {
              setCurrentSrc(src);
              return;
          }
          if (currentSrc !== 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=60') {
             setCurrentSrc('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=60');
          }
        }}
      />
    </div>
  );
});
