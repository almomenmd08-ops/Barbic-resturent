import { create } from 'zustand';

export interface VideoRect {
  width: number;
  height: number;
  top: number;
  left: number;
}

interface VideoState {
  videos: Record<string, { url: string; poster?: string; rect: VideoRect | null; visible: boolean; isHero?: boolean; overlayStyle?: any }>;
  registerVideo: (id: string, url: string, isHero?: boolean, overlayStyle?: any, poster?: string) => void;
  updateVideoRect: (id: string, rect: VideoRect | null) => void;
  setVideoVisibility: (id: string, visible: boolean) => void;
}

export const useVideoStore = create<VideoState>((set) => ({
  videos: {},
  registerVideo: (id, url, isHero, overlayStyle, poster) => set(state => ({
    videos: { 
      ...state.videos, 
      [id]: { 
        ...state.videos[id], 
        url, 
        poster,
        isHero, 
        overlayStyle, 
        visible: state.videos[id]?.visible || false,
        rect: state.videos[id]?.rect || null
      } 
    }
  })),
  updateVideoRect: (id, rect) => set(state => ({
    videos: { ...state.videos, [id]: { ...state.videos[id], rect } }
  })),
  setVideoVisibility: (id, visible) => set(state => ({
    videos: { ...state.videos, [id]: { ...state.videos[id], visible } }
  }))
}));
