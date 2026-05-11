export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  type: 'veg' | 'non-veg' | 'drink';
  image?: string;
  imageUrl?: string;
  description?: string;
  rating?: number | string;
  reviewCount?: number | string;
  isFeaturedHome?: boolean;
  homeOrder?: number;
  isActive?: boolean;
  order?: number;
}

export const menuData: MenuItem[] = [
  // Starters - Chinese
  { id: 'c1', name: 'Zinger Chicken', price: 219, category: 'Chinese Starters', type: 'non-veg', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=400', description: 'Crispy fried chicken strips' },
  { id: 'c2', name: 'Hot Garlic Chicken', price: 229, category: 'Chinese Starters', type: 'non-veg', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&q=80&w=400', description: 'Spicy chicken tossed in hot garlic sauce' },
  { id: 'c3', name: 'Chicken Lollipop', price: 239, category: 'Chinese Starters', type: 'non-veg', image: 'https://images.unsplash.com/photo-1569058242253-1df34b062b89?auto=format&fit=crop&q=80&w=400', description: 'Crispy fried chicken wings' },
  { id: 'c4', name: 'Crispy Chilly Baby Corn', price: 149, category: 'Chinese Starters', type: 'veg', image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=400', description: 'Crispy fried baby corn tossed in chilly sauce' },
  { id: 'c5', name: 'Crispy Paneer', price: 199, category: 'Chinese Starters', type: 'veg', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=400', description: 'Crispy fried paneer cubes' },
  
  // Tandoor
  { id: 't1', name: 'Chicken Tikka (6Pcs)', price: 211, category: 'Tandoor Special', type: 'non-veg', image: 'https://images.unsplash.com/photo-1599487405702-3e28dfa49d5b?auto=format&fit=crop&q=80&w=400', description: 'Classic chicken tikka roasted in tandoor' },
  { id: 't2', name: 'Tandoori Chicken (Half)', price: 211, category: 'Tandoor Special', type: 'non-veg', image: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&q=80&w=400', description: 'Half portion of classic tandoori chicken' },
  { id: 't3', name: 'Paneer Tikka (6Pcs)', price: 229, category: 'Tandoor Special', type: 'veg', image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&q=80&w=400', description: 'Marinated paneer cubes roasted in tandoor' },
  
  // Indian Main Course
  { id: 'i1', name: 'Chicken Bharta', price: 189, category: 'Indian Main Course', type: 'non-veg', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&q=80&w=400', description: 'Shredded chicken cooked in rich gravy' },
  { id: 'i2', name: 'Kadhai Chicken', price: 199, category: 'Indian Main Course', type: 'non-veg', image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&q=80&w=400', description: 'Spicy chicken cooked with bell peppers' },
  { id: 'i3', name: 'Dal Makhni', price: 211, category: 'Indian Main Course', type: 'veg', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&q=80&w=400', description: 'Creamy black lentils cooked overnight' },
  { id: 'i4', name: 'Paneer Butter Masala', price: 211, category: 'Indian Main Course', type: 'veg', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc0?auto=format&fit=crop&q=80&w=400', description: 'Paneer cubes in rich tomato buttery gravy' },
  
  // Breads
  { id: 'b1', name: 'Butter Naan', price: 44, category: 'Breads', type: 'veg', image: 'https://images.unsplash.com/photo-1626082895617-2c6b3879101c?auto=format&fit=crop&q=80&w=400', description: 'Soft Indian bread with butter' },
  { id: 'b2', name: 'Garlic Naan', price: 49, category: 'Breads', type: 'veg', image: 'https://images.unsplash.com/photo-1626082895617-2c6b3879101c?auto=format&fit=crop&q=80&w=400', description: 'Soft Indian bread with garlic and butter' },
  { id: 'b3', name: 'Lacchha Tandoori Roti', price: 34, category: 'Breads', type: 'veg', image: 'https://images.unsplash.com/photo-1626082895617-2c6b3879101c?auto=format&fit=crop&q=80&w=400', description: 'Layered whole wheat bread' },

  // Rice & Biryani
  { id: 'r1', name: 'Special Chicken Briyani', price: 229, category: 'Rice & Biryani', type: 'non-veg', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400', description: 'Aromatic basmati rice cooked with special chicken pieces' },
  { id: 'r2', name: 'Chicken Fried Rice', price: 139, category: 'Rice & Biryani', type: 'non-veg', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&q=80&w=400', description: 'Wok tossed rice with chicken and veggies' },
  { id: 'r3', name: 'Veg Fried Rice', price: 89, category: 'Rice & Biryani', type: 'veg', image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&q=80&w=400', description: 'Wok tossed rice with mixed veggies' },
  { id: 'r4', name: 'BARBIC SPECIAL BRIYANI THALI', price: 719, category: 'Rice & Biryani', type: 'non-veg', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=400', description: '3 Plate Briyani + 6 Pcs Kabab + 1 Leg Piece + 1 Breast Piece (For 4 Persons)' },

  // Chinese Main Course
  { id: 'cm1', name: 'Chilly Chicken', price: 189, category: 'Chinese Main Course', type: 'non-veg', image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&q=80&w=400', description: 'Classic spicy chilly chicken gravy' },
  { id: 'cm2', name: 'Chicken Chow', price: 139, category: 'Chinese Main Course', type: 'non-veg', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=400', description: 'Stir fried noodles with chicken' },
  { id: 'cm3', name: 'Veg Chow', price: 99, category: 'Chinese Main Course', type: 'veg', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=400', description: 'Stir fried noodles with vegetables' },

  // Drinks & Soups
  { id: 'd1', name: 'Pineapple Mojito', price: 99, category: 'Drinks & Soups', type: 'drink', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&q=80&w=400', description: 'Refreshing pineapple mocktail' },
  { id: 'd2', name: 'Mango Shake', price: 89, category: 'Drinks & Soups', type: 'drink', image: 'https://images.unsplash.com/photo-1572490122747-3968b75bb699?auto=format&fit=crop&q=80&w=400', description: 'Thick and creamy mango shake' },
  { id: 'd3', name: 'Hot & Sour Soup (Chicken)', price: 129, category: 'Drinks & Soups', type: 'non-veg', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=400', description: 'Spicy and tangy chicken soup' },
];
