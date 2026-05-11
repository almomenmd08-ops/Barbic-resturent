import React, { useState, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  isHero?: boolean;
  className?: string;
  overlayStyle?: React.CSSProperties;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, isHero = false, className = '', overlayStyle }) => {
  const [isVimeo, setIsVimeo] = useState(false);
  const [vimeoUrl, setVimeoUrl] = useState('');

  useEffect(() => {
    // Check if it's a Vimeo link
    if (src.includes('vimeo')) {
      setIsVimeo(true);
      // Extract video ID from Vimeo URL like https://vimeo.com/1188341507
      const match = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (match && match[1]) {
        setVimeoUrl(`https://player.vimeo.com/video/${match[1]}?background=1&autoplay=1&loop=1&muted=1&playsinline=1&dnt=1`);
      } else {
        setVimeoUrl(src); // Fallback
      }
    } else {
      setIsVimeo(false);
    }
  }, [src]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {isVimeo ? (
        <iframe 
          src={vimeoUrl}
          loading={isHero ? "eager" : "lazy"}
          title="Video Player"
          className="absolute top-1/2 left-1/2 w-[150vw] h-[150vh] min-h-[150vw] -translate-x-1/2 -translate-y-1/2 object-cover md:w-[150%] md:h-[150%]"
          style={{ border: 'none', pointerEvents: 'none' }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        ></iframe>
      ) : (
        <video
          src={src}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload={isHero ? "auto" : "metadata"}
          loading={isHero ? undefined : "lazy"} // standard prop is loading but some browsers use lazy
        />
      )}
      {overlayStyle && (
        <div className="absolute inset-0 z-10 transition-colors duration-300" style={overlayStyle}></div>
      )}
    </div>
  );
};
