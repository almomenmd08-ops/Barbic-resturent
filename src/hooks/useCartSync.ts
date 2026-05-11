import { useEffect, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useCartStore } from '../store/cartStore';

export function useCartSync() {
  const [user] = useAuthState(auth);
  const { items, setItems } = useCartStore();
  const isInitialLoad = useRef(true);

  const prevItemsRef = useRef(items);

  // Sync from Firestore on login
  useEffect(() => {
    if (!user) {
      isInitialLoad.current = false;
      return;
    }

    const loadCart = async () => {
      try {
        const cartRef = doc(db, 'carts', user.uid);
        const cartDoc = await getDoc(cartRef);
        
        if (cartDoc.exists()) {
          const firestoreItems = cartDoc.data().items || [];
          const localItems = useCartStore.getState().items;
          
          if (localItems.length > 0) {
            // Priority to local items if they exist (guest added to cart then logged in)
            await setDoc(cartRef, {
              userId: user.uid,
              userEmail: user.email,
              userName: user.displayName || 'User',
              items: localItems,
              status: 'active',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } else {
            // Load firestore cart
            setItems(firestoreItems);
          }
        } else {
          // If doc doesn't exist, check localItems
          const localItems = useCartStore.getState().items;
          if (localItems.length > 0) {
            await setDoc(cartRef, {
              userId: user.uid,
              userEmail: user.email,
              userName: user.displayName || 'User',
              items: localItems,
              status: 'active',
              updatedAt: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error("Error loading cart from Firestore:", error);
      } finally {
        isInitialLoad.current = false;
      }
    };

    loadCart();
  }, [user, setItems]);

  // Sync to Firestore on cart change
  useEffect(() => {
    if (!user || isInitialLoad.current) return;

    const saveCart = async () => {
      try {
        const cartRef = doc(db, 'carts', user.uid);
        
        // --- cartItems Collection Tracking ---
        import('firebase/firestore').then(async ({ collection, query, where, getDocs, updateDoc, addDoc }) => {
          try {
            const activeItemsQuery = query(
              collection(db, 'cartItems'),
              where('userId', '==', user.uid),
              where('status', '==', 'active')
            );
            const activeSnap = await getDocs(activeItemsQuery);
            
            const activeDbMap = new Map();
            activeSnap.docs.forEach(doc => {
              activeDbMap.set(doc.data().itemName, { docId: doc.id, ...doc.data() });
            });

            const currentLocalMap = new Map(items.map(i => [i.name, i]));

            // Check for removed items
            for (const [itemName, dbItem] of activeDbMap.entries()) {
              if (!currentLocalMap.has(itemName)) {
                // Item was removed from cart
                await updateDoc(doc(db, 'cartItems', dbItem.docId), {
                  status: 'removed',
                  updatedAt: new Date().toISOString()
                });
              }
            }

            // Check for added or updated items
            for (const item of items) {
              const payload = {
                userId: user.uid,
                userName: user.displayName || 'User',
                userEmail: user.email,
                itemName: item.name,
                quantity: item.quantity,
                status: 'active',
                updatedAt: new Date().toISOString()
              };
              
              if (activeDbMap.has(item.name)) {
                // Update quantity if changed
                const dbItem = activeDbMap.get(item.name);
                if (dbItem.quantity !== item.quantity) {
                  await updateDoc(doc(db, 'cartItems', dbItem.docId), {
                    quantity: item.quantity,
                    updatedAt: new Date().toISOString()
                  });
                }
              } else {
                // Add new
                await addDoc(collection(db, 'cartItems'), {
                  ...payload,
                  createdAt: new Date().toISOString(),
                });
              }
            }
          } catch (trackingError) {
             console.error("Failed to track cart items:", trackingError);
          }
        });
        // -------------------------------------


        if (items.length === 0) {
          // They cleared their cart, mark as updated/cleared
          await setDoc(cartRef, {
            userId: user.uid,
            userEmail: user.email,
            userName: user.displayName || 'User',
            items: [],
            status: 'updated',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          prevItemsRef.current = items;
          return;
        }

        const prevCount = prevItemsRef.current.reduce((acc, item) => acc + item.quantity, 0);
        const newCount = items.reduce((acc, item) => acc + item.quantity, 0);
        
        let newStatus = 'active';
        let sessionStartTime = undefined;

        if (newCount < prevCount) {
          newStatus = 'updated'; // Items removed
        } else if (newCount > prevCount) {
          // User added an item, reset session start time
          sessionStartTime = new Date().toISOString();
        }

        const updateData: any = {
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || 'User',
          items,
          status: newStatus,
          updatedAt: new Date().toISOString()
        };

        if (sessionStartTime) {
          updateData.sessionStartTime = sessionStartTime;
        }

        await setDoc(cartRef, updateData, { merge: true });
        
        prevItemsRef.current = items;
      } catch (error) {
        console.error("Error saving cart to Firestore:", error);
      }
    };

    const timeoutId = setTimeout(saveCart, 500); // debounce saving to firestore

    return () => clearTimeout(timeoutId);
  }, [items, user]);
}
