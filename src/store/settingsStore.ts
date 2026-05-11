import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface RestaurantSettings {
  name: string;
  logo: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  googleMapsLink: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
  cashOnDelivery: boolean;
  onlinePayment: boolean;
  deliveryCharge: number;
  freeDeliveryMin: number;
  couponsEnabled: boolean;
  orderAlerts: boolean;
  notificationsEnabled: boolean;
  aboutText?: string;
  yearsExperience?: string;
}

export const DEFAULT_SETTINGS: RestaurantSettings = {
  name: "BARBIC",
  logo: "",
  description: "Authentic Indian & Chinese cuisine in Sujapur. Experience the taste of tradition with every bite.",
  phone: "+91 7031876786",
  whatsapp: "917031876786",
  email: "",
  address: "Bus Stand, Sujapur Main Rd, near Sujapur, Kaliachak, Malda, West Bengal 732206",
  googleMapsLink: "https://maps.app.goo.gl/5uTQuLqNobP9CbEu5",
  openingTime: "11:00",
  closingTime: "23:00",
  isOpen: true,
  cashOnDelivery: true,
  onlinePayment: true,
  deliveryCharge: 0,
  freeDeliveryMin: 0,
  couponsEnabled: true,
  orderAlerts: true,
  notificationsEnabled: true,
  aboutText: "Welcome to BARBIC, your trusted local restaurant for the best authentic Indian and Chinese cuisine. We proudly serve our community with flavors that excite the palate and warm the soul.",
  yearsExperience: "5"
};

interface SettingsState {
  settings: RestaurantSettings;
  loading: boolean;
  initialized: boolean;
  initSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loading: true,
  initialized: false,
  initSettings: () => {
    if (get().initialized) return;
    
    set({ initialized: true });
    const docRef = doc(db, 'settings', 'restaurant');
    onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        set({ 
          settings: { 
            ...DEFAULT_SETTINGS, 
            ...(docSnap.data() as Partial<RestaurantSettings>),
            description: (docSnap.data()?.description || DEFAULT_SETTINGS.description).replace('in Malda', 'in Sujapur')
          }, 
          loading: false 
        });
      } else {
        set({ loading: false });
      }
    }, (error) => {
      console.error("Error fetching settings:", error);
      set({ loading: false });
    });
  }
}));
