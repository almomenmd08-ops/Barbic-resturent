import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, getDocs, doc, deleteDoc, collectionGroup } from 'firebase/firestore';
import { Heart, Search, Users, Eye, X, Filter } from 'lucide-react';
import { OptimizedImage } from '../../components/OptimizedImage';

interface FavoriteLog {
  id: string;
  userId?: string;
  deviceId?: string;
  dishId: string;
  dishName: string;
  createdAt: string;
  addedToCartAt?: string;
}

interface UserData {
  name?: string;
  email?: string;
  phone?: string;
}

interface MenuItemData {
  id: string;
  name: string;
  type: string;
  price: number | string;
  imageUrl?: string;
  image?: string;
}

export function CustomerInterestManager() {
  const [logs, setLogs] = useState<FavoriteLog[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItemData>>({});
  const [usersCache, setUsersCache] = useState<Record<string, UserData>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'highest' | 'newest'>('highest');
  
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  const openModal = (dishId: string) => {
    setSelectedDishId(dishId);
    setModalSearchTerm('');
  };

  const closeModal = () => {
    setSelectedDishId(null);
    setModalSearchTerm('');
  };

  useEffect(() => {
    if (selectedDishId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedDishId]);

  useEffect(() => {
    // Fetch users
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users')));
        const uDict: Record<string, UserData> = {};
        usersSnap.forEach(d => {
          uDict[d.id] = d.data() as UserData;
        });
        setUsersCache(uDict);
      } catch (err) {
        console.error("Failed to load users lookup:", err);
      }
    };
    fetchUsers();

    // Fetch menu
    const fetchMenu = async () => {
      try {
        const menuSnap = await getDocs(query(collection(db, 'menu')));
        const mDict: Record<string, MenuItemData> = {};
        menuSnap.forEach(d => {
          mDict[d.id] = { id: d.id, ...d.data() } as MenuItemData;
        });
        setMenuItems(mDict);
      } catch (err) {
        console.error("Failed to load menu lookup:", err);
      }
    };
    fetchMenu();

    // Listen to favorites using collectionGroup
    const q = collectionGroup(db, 'favorites');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: FavoriteLog[] = [];
      const now = Date.now();
      
      snapshot.forEach((docSnap) => {
        const logData = docSnap.data() as FavoriteLog;
        // Infer userId from the parent document path if missing
        const parentPath = docSnap.ref.parent.parent;
        const inferredUserId = logData.userId || parentPath?.id;
        
        data.push({ 
          id: docSnap.id, 
          ...logData,
          userId: inferredUserId 
        });
      });
      // Sort in memory by newest
      data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLogs(data);
      console.log(`Successfully fetched ${data.length} favorites logs via collectionGroup!`);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching favorites:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Combine menu items and logs, so we always show all menu items
  const menuWithLogs = (Object.values(menuItems) as MenuItemData[]).map(menuItem => {
    // Collect all logs for this dish
    const dishLogs = logs.filter(log => log.dishId === menuItem.id);
    return {
      dishId: menuItem.id,
      dishName: menuItem.name,
      menuData: menuItem,
      logs: dishLogs
    };
  });

  // Filter and sort the combined array
  const filteredDishes = menuWithLogs
    .filter(group => {
      const name = group.menuData?.name || group.dishName;
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'highest') {
        return b.logs.length - a.logs.length;
      } else {
        // Newest: max createdAt in the logs
        const maxA = a.logs.length > 0 ? Math.max(...a.logs.map(l => new Date(l.createdAt).getTime())) : 0;
        const maxB = b.logs.length > 0 ? Math.max(...b.logs.map(l => new Date(l.createdAt).getTime())) : 0;
        return maxB - maxA;
      }
    });

  const selectedDishFavorites = selectedDishId ? menuWithLogs.find(m => m.dishId === selectedDishId)?.logs || [] : [];
  
  const filteredPopupLogs = selectedDishFavorites.filter(log => {
    if (!modalSearchTerm) return true;
    const user = log.userId ? usersCache[log.userId] : null;
    const q = modalSearchTerm.toLowerCase();
    const nameMatch = user?.name?.toLowerCase().includes(q);
    const phoneMatch = user?.phone?.toLowerCase().includes(q);
    const emailMatch = user?.email?.toLowerCase().includes(q);
    return nameMatch || phoneMatch || emailMatch;
  });

  const selectedDishMenuData = selectedDishId ? menuItems[selectedDishId] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500" />
          Customer Interest
        </h1>
        <p className="text-gray-500 mt-1">Track which customers have favorited specific food items</p>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search food item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50/50"
          />
        </div>
        
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'highest' | 'newest')}
            className="border-gray-200 rounded-lg text-sm focus:ring-red-500 border p-2"
          >
            <option value="highest">Highest Favorites</option>
            <option value="newest">Newest Interest</option>
          </select>
        </div>
      </div>

      {filteredDishes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No customer interest yet</h3>
          <p className="text-gray-500">When customers favorite items, they will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDishes.map((group) => {
            const menuData = group.menuData;
            return (
              <div key={group.dishId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow relative">
                <div className="aspect-video relative bg-gray-100">
                  {/* Permanent Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-2" style={{ zIndex: 100, pointerEvents: 'auto' }}>
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md border border-gray-200">
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                      <span className="text-sm font-bold text-gray-900 leading-none">{group.logs.length}</span>
                    </div>
                    <button 
                      onClick={() => openModal(group.dishId)}
                      className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-md hover:bg-gray-50 transition-colors text-gray-700 border border-gray-200"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium">View</span>
                    </button>
                  </div>
                  
                   {(menuData?.imageUrl || menuData?.image) ? (
                     <OptimizedImage
                        src={menuData.imageUrl || menuData.image || ''}
                        alt={menuData?.name || group.dishName}
                        className="w-full h-full object-cover"
                     />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-400">
                       <Heart className="w-8 h-8" />
                     </div>
                   )}
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{menuData?.name || group.dishName}</h3>
                      <p className="text-sm text-gray-500 capitalize">{menuData?.type || 'Dish'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-bold text-gray-900 text-lg">
                      ₹{menuData?.price || '-'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Users Modal */}
      {selectedDishId && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Users who favorited {selectedDishMenuData?.name || menuWithLogs.find(m => m.dishId === selectedDishId)?.dishName}
                </h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-500 fill-red-500" /> 
                  {selectedDishFavorites.length} {selectedDishFavorites.length === 1 ? 'Customer' : 'Customers'} interested
                </p>
              </div>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="px-4 pt-4 sm:px-6 sm:pt-6 bg-gray-50/30">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customer by name, email or mobile..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white shadow-sm"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/30">
              <div className="space-y-4">
                {filteredPopupLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {modalSearchTerm ? "No matching customers found." : "No customers have favorited this item yet."}
                  </div>
                ) : (
                  filteredPopupLogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(log => {
                  const uIdKey = log.userId || log.deviceId || 'unknown';
                  const user = log.userId ? usersCache[log.userId] : null;
                  const date = new Date(log.createdAt);
                  const isAddedToCart = !!log.addedToCartAt;
                  
                  return (
                    <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{user?.name || 'Guest User'}</h4>
                          <div className="text-sm text-gray-500 flex flex-col sm:flex-row sm:gap-4 mt-0.5">
                            {user?.phone && <span>{user.phone}</span>}
                            {user?.email && <span>{user.email}</span>}
                            {!user?.phone && !user?.email && <span className="font-mono text-xs">ID: {uIdKey.slice(-6).replace('vice_', 'Dev: ')}</span>}
                          </div>
                        </div>
                      </div>
                      
                        <div className="flex flex-col items-end text-sm">
                        <span className="text-gray-500">{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        {isAddedToCart ? (
                          <span className="mt-1 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            In Cart
                          </span>
                        ) : (
                          <span className="mt-1 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Favorite
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
