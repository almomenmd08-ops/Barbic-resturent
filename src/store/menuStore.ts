import { create } from 'zustand';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { MenuItem } from '../data/menuData';

interface MenuState {
  items: MenuItem[];
  loading: boolean;
  initialized: boolean;
  initMenu: () => void;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  items: [],
  loading: true,
  initialized: false,
  initMenu: () => {
    if (get().initialized) return;
    
    set({ loading: true, initialized: true });
    const q = query(collection(db, 'menu'));
    
    onSnapshot(q, (snapshot) => {
      let fetchedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MenuItem[];
      fetchedItems = fetchedItems.filter((item) => item.isActive !== false);
      fetchedItems.sort((a, b) => (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER));
      set({ items: fetchedItems, loading: false });
    }, (error) => {
      console.error("Error fetching menu:", error);
      set({ loading: false });
    });
  }
}));
