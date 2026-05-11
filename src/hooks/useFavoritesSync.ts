import { useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { useFavoritesStore } from '../store/favoritesStore';

export function useFavoritesSync() {
  const [user, loading] = useAuthState(auth);
  const syncUserFavorites = useFavoritesStore((state) => state.syncUserFavorites);
  const setFavorites = useFavoritesStore((state) => state.setFavorites);
  
  const wasLoggedIn = useRef<boolean>(false);

  useEffect(() => {
    if (loading) return;
    
    if (user) {
      wasLoggedIn.current = true;
      syncUserFavorites(user.uid);
    } else if (wasLoggedIn.current) {
      // Clear favorites only on explicit logout, not on initial guests
      setFavorites([]);
      wasLoggedIn.current = false;
    }
  }, [user, loading, syncUserFavorites, setFavorites]);
}

