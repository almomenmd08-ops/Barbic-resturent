import { useEffect, useRef, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useCartStore, CartItem } from '../store/cartStore';

/**
 * useCartSync – keeps Zustand cart store ↔ Firestore `carts/{uid}` in sync.
 *
 * Key behaviours:
 *  1. On login  → fetch the user's saved cart from Firestore (real-time listener).
 *  2. On change → debounce-write the local cart back to Firestore.
 *  3. On logout → clear the local cart so no data bleeds to the next user.
 *  4. Real-time → uses onSnapshot so changes from other devices / admin
 *                 are reflected immediately.
 */
export function useCartSync() {
  const [user] = useAuthState(auth);
  const { items, setItems, clearCart } = useCartStore();

  // Tracks whether we are still loading the initial snapshot from Firestore.
  // While true, we suppress writing local changes back to Firestore.
  const isInitialLoad = useRef(true);

  // Keep track of the previous user UID so we can detect user switches.
  const prevUidRef = useRef<string | null>(null);

  // Prevent Firestore writes that are triggered by the snapshot itself.
  const suppressNextWrite = useRef(false);

  // Store the latest items for the write-back effect without re-running the listener.
  const latestItemsRef = useRef<CartItem[]>(items);
  useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

  // ── Real-time listener: Firestore → local store ──────────────────────
  useEffect(() => {
    // If no user is logged in, clear the cart and reset state.
    if (!user) {
      // Only clear if we previously had a user (actual logout, not initial page load)
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

    const cartRef = doc(db, 'carts', user.uid);

    // Subscribe to real-time updates on the user's cart document.
    const unsubscribe = onSnapshot(
      cartRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const firestoreItems: CartItem[] = snapshot.data().items || [];

          if (isInitialLoad.current) {
            // First load after login: Firestore is the source of truth.
            // However, if there are local items (guest added items before logging in),
            // merge them into the Firestore cart.
            const localItems = useCartStore.getState().items;

            if (localItems.length > 0 && firestoreItems.length === 0) {
              // Guest had items → push them to Firestore (will trigger another snapshot)
              setDoc(cartRef, {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || 'User',
                items: localItems,
                status: 'active',
                updatedAt: new Date().toISOString(),
              }, { merge: true }).catch(console.error);
            } else if (firestoreItems.length > 0) {
              // Firestore has items → load them into local store
              suppressNextWrite.current = true;
              setItems(firestoreItems);
            }
            // If both are empty, nothing to do.
            isInitialLoad.current = false;
          } else {
            // Subsequent real-time updates (e.g. from another tab/device).
            // Only update local store if the Firestore data actually differs
            // to avoid infinite loops.
            const localItems = useCartStore.getState().items;
            if (!arraysEqual(localItems, firestoreItems)) {
              suppressNextWrite.current = true;
              setItems(firestoreItems);
            }
          }
        } else {
          // Cart document doesn't exist in Firestore.
          if (isInitialLoad.current) {
            const localItems = useCartStore.getState().items;
            if (localItems.length > 0) {
              // Push guest cart to Firestore for the first time.
              setDoc(cartRef, {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || 'User',
                items: localItems,
                status: 'active',
                updatedAt: new Date().toISOString(),
              }).catch(console.error);
            }
            isInitialLoad.current = false;
          }
        }
      },
      (error) => {
        console.error('useCartSync: onSnapshot error', error);
        isInitialLoad.current = false;
      },
    );

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── Write-back: local store → Firestore ──────────────────────────────
  useEffect(() => {
    if (!user || isInitialLoad.current) return;

    // If this change was caused by the snapshot listener, skip writing back.
    if (suppressNextWrite.current) {
      suppressNextWrite.current = false;
      return;
    }

    const saveCart = async () => {
      try {
        const cartRef = doc(db, 'carts', user.uid);

        await setDoc(cartRef, {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || 'User',
          items,
          status: items.length === 0 ? 'updated' : 'active',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (error) {
        console.error('useCartSync: error saving cart to Firestore', error);
      }
    };

    // Debounce writes to avoid hammering Firestore on rapid add/remove.
    const timeoutId = setTimeout(saveCart, 500);
    return () => clearTimeout(timeoutId);
  }, [items, user]);

  // ── Also sync individual cartItems collection for admin visibility ───
  useEffect(() => {
    if (!user || isInitialLoad.current) return;
    if (suppressNextWrite.current) return;

    const syncCartItems = async () => {
      try {
        const { collection, query, where, getDocs, updateDoc, addDoc } = await import('firebase/firestore');

        const activeItemsQuery = query(
          collection(db, 'cartItems'),
          where('userId', '==', user.uid),
          where('status', '==', 'active'),
        );
        const activeSnap = await getDocs(activeItemsQuery);

        const activeDbMap = new Map<string, { docId: string; quantity: number }>();
        activeSnap.docs.forEach((d) => {
          activeDbMap.set(d.data().itemName, { docId: d.id, quantity: d.data().quantity });
        });

        const currentLocalMap = new Map(items.map((i) => [i.name, i]));

        // Mark removed items
        for (const [itemName, dbItem] of activeDbMap.entries()) {
          if (!currentLocalMap.has(itemName)) {
            await updateDoc(doc(db, 'cartItems', dbItem.docId), {
              status: 'removed',
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Add / update items
        for (const item of items) {
          const payload = {
            userId: user.uid,
            userName: user.displayName || 'User',
            userEmail: user.email,
            itemName: item.name,
            quantity: item.quantity,
            status: 'active' as const,
            updatedAt: new Date().toISOString(),
          };

          if (activeDbMap.has(item.name)) {
            const dbItem = activeDbMap.get(item.name)!;
            if (dbItem.quantity !== item.quantity) {
              await updateDoc(doc(db, 'cartItems', dbItem.docId), {
                quantity: item.quantity,
                updatedAt: new Date().toISOString(),
              });
            }
          } else {
            await addDoc(collection(db, 'cartItems'), {
              ...payload,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch (error) {
        console.error('useCartSync: error syncing cartItems collection', error);
      }
    };

    const timeoutId = setTimeout(syncCartItems, 800);
    return () => clearTimeout(timeoutId);
  }, [items, user]);
}

// ── Helpers ──────────────────────────────────────────────────────────────
function arraysEqual(a: CartItem[], b: CartItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id || a[i].quantity !== b[i].quantity) return false;
  }
  return true;
}
