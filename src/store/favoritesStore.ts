import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, auth } from '../firebase';
import { doc, setDoc, deleteDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

interface FavoriteItem {
  id: string; // dishId
  name: string;
}

interface FavoritesStore {
  favorites: string[]; // dish IDs
  deviceId: string;
  initDeviceId: () => void;
  toggleFavorite: (id: string, name: string) => void;
  isFavorite: (id: string) => boolean;
  markAddedToCart: (id: string) => void;
  setFavorites: (favorites: string[]) => void;
  syncUserFavorites: (uid: string) => Promise<void>;
}

// Generate an anonymous ID if none exists
const generateDeviceId = () => {
  return 'device_' + Math.random().toString(36).substring(2, 15);
};

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      deviceId: '',
      initDeviceId: () => {
        if (!get().deviceId) {
          set({ deviceId: generateDeviceId() });
        }
      },
      setFavorites: (favorites: string[]) => {
        set({ favorites });
      },
      syncUserFavorites: async (uid: string) => {
        try {
          const snap = await getDocs(collection(db, 'users', uid, 'favorites'));
          const userFavorites = snap.docs.map(d => d.id);
          set({ favorites: userFavorites });
        } catch (e) {
          console.error("Failed to sync user favorites:", e);
        }
      },
      toggleFavorite: async (id: string, name: string) => {
        const isFav = get().favorites.includes(id);
        const { deviceId } = get();
        
        let newFavorites;
        if (isFav) {
          newFavorites = get().favorites.filter((fid) => fid !== id);
          set({ favorites: newFavorites });
          
          const userId = auth.currentUser?.uid;
          if (userId) {
            try {
              await deleteDoc(doc(db, 'users', userId, 'favorites', id));
            } catch (e) {
              console.error('Error removing favorite', e);
            }
          }
        } else {
          newFavorites = [...get().favorites, id];
          set({ favorites: newFavorites });
          
          const userId = auth.currentUser?.uid;
          if (userId) {
            try {
               await setDoc(doc(db, 'users', userId, 'favorites', id), {
                 dishId: id,
                 dishName: name,
                 createdAt: new Date().toISOString()
               });
            } catch (e) {
              console.error('Error adding favorite', e);
            }
          }
        }
      },
      isFavorite: (id: string) => get().favorites.includes(id),
      markAddedToCart: (id: string) => {
        if (!get().favorites.includes(id)) return;
        
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        import('firebase/firestore').then(async ({ updateDoc, doc }) => {
          try {
             await updateDoc(doc(db, 'users', userId, 'favorites', id), {
               addedToCartAt: new Date().toISOString()
             });
          } catch (e) {
            console.error('Error updating favorite added to cart time', e);
          }
        });
      },
    }),
    {
      name: 'favorites-storage',
    }
  )
);
