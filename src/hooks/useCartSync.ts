import { useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';
import { useCartStore, CartItem } from '../store/cartStore';
import { API_BASE } from '../utils/api';

/**
 * useCartSync – keeps Zustand cart store ↔ Render Backend in sync.
 *
 * Key behaviours:
 *  1. On login  → fetch the user's saved cart from the Render backend.
 *  2. On change → debounce-write the local cart back to the Render backend.
 *  3. On logout → clear the local cart so no data bleeds to the next user.
 */
export function useCartSync() {
  const [user] = useAuthState(auth);
  const { items, setItems, clearCart } = useCartStore();

  const isInitialLoad = useRef(true);
  const prevUidRef = useRef<string | null>(null);
  const suppressNextWrite = useRef(false);

  // ── Fetch from Backend ──────────────────────
  useEffect(() => {
    // If no user is logged in (guest), keep the cart strictly in LocalStorage.
    // Only clear the cart if a user was previously logged in (on logout).
    if (!user || !user.uid) {
      if (prevUidRef.current !== null) {
        clearCart();
      }
      prevUidRef.current = null;
      isInitialLoad.current = true;
      return;
    }

    // If user switched (different UID), clear stale local data first.
    if (prevUidRef.current && prevUidRef.current !== user.uid) {
      clearCart();
    }
    prevUidRef.current = user.uid;
    isInitialLoad.current = true;

    const loadCartFromBackend = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE}/api/cart`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const backendItems: CartItem[] = data.items || [];
          const localItems = useCartStore.getState().items;

          if (localItems.length > 0 && backendItems.length === 0) {
            // Guest had items → push them to Backend
            await fetch(`${API_BASE}/api/cart`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ items: localItems })
            });
          } else if (backendItems.length > 0) {
            // Backend has items → load them into local store
            suppressNextWrite.current = true;
            setItems(backendItems);
          }
        } else {
          // If backend fetch failed but it's the first load, try to push local if any
          const localItems = useCartStore.getState().items;
          if (localItems.length > 0) {
            await fetch(`${API_BASE}/api/cart`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ items: localItems })
            });
          }
        }
      } catch (error) {
        console.error('useCartSync: error loading cart from backend', error);
      } finally {
        isInitialLoad.current = false;
      }
    };

    loadCartFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── Write-back: local store → Backend ──────────────────────────────
  useEffect(() => {
    if (!user || !user.uid || isInitialLoad.current) return;

    if (suppressNextWrite.current) {
      suppressNextWrite.current = false;
      return;
    }

    const saveCartToBackend = async () => {
      try {
        const token = await user.getIdToken();
        await fetch(`${API_BASE}/api/cart`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ items })
        });
      } catch (error) {
        console.error('useCartSync: error saving cart to backend', error);
      }
    };

    const timeoutId = setTimeout(saveCartToBackend, 500);
    return () => clearTimeout(timeoutId);
  }, [items, user]);
}

