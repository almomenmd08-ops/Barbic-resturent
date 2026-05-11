import React, { useEffect, useRef } from 'react';
import { useVideoStore } from '../store/videoStore';

interface VideoPlaceholderProps {
  id: string;
  url: string;
  poster?: string;
  isHero?: boolean;
  overlayStyle?: React.CSSProperties;
}

export const VideoPlaceholder: React.FC<VideoPlaceholderProps> = ({ id, url, poster, isHero, overlayStyle }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { registerVideo, updateVideoRect, setVideoVisibility } = useVideoStore();

  useEffect(() => {
    // Slight delay to allow the page to mount smoothly before triggering heavy video logic
    const timer = setTimeout(() => {
      registerVideo(id, url, isHero, overlayStyle, poster);
      setVideoVisibility(id, true);
    }, 50);
    
    return () => {
      clearTimeout(timer);
      setVideoVisibility(id, false);
      // We do not clear the rect or unregister, so the global layer can keep it mounted and hidden
    };
  }, [id, url, isHero, overlayStyle, registerVideo, setVideoVisibility]);

  useEffect(() => {
    const updateRect = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return; // Ignore if hidden
        
        const newRect = {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top + window.scrollY),
          left: Math.round(rect.left + window.scrollX),
        };

        // Deep equal check to avoid redundant store updates
        const currentVideo = useVideoStore.getState().videos[id];
        if (
          !currentVideo?.rect ||
          currentVideo.rect.width !== newRect.width ||
          currentVideo.rect.height !== newRect.height ||
          Math.abs(currentVideo.rect.top - newRect.top) > 2 ||
          Math.abs(currentVideo.rect.left - newRect.left) > 2
        ) {
          updateVideoRect(id, newRect);
        }
      }
    };

    updateRect();
    
    const observer = new ResizeObserver(() => updateRect());
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    window.addEventListener('resize', updateRect);
    // Extra interval to catch async image loads shifting layout after render, but less frequent to save resources
    const interval = setInterval(updateRect, 3000);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateRect);
      clearInterval(interval);
    };
  }, [id, updateVideoRect]);

  return <div ref={ref} className="absolute inset-0 w-full h-full bg-transparent pointer-events-none" />;
};
