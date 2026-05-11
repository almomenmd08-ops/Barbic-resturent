import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ShoppingCart, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';

export function CartManagement() {
  const [groupedCarts, setGroupedCarts] = useState<any[]>([]);
  const [usersCache, setUsersCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Update current time every 10 seconds to auto-hide NEW labels
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      setRefreshKey(prev => prev + 1);
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const uDict: Record<string, any> = {};
      usersSnap.forEach(doc => {
        uDict[doc.id] = doc.data();
      });
      setUsersCache(uDict);
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Updated successfully');
    } catch (err) {
      console.error("Failed to refresh:", err);
      toast.error('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users')));
        const uDict: Record<string, any> = {};
        usersSnap.forEach(doc => {
          uDict[doc.id] = doc.data();
        });
        setUsersCache(uDict);
      } catch (err) {
        console.error("Failed to load users lookup:", err);
      }
    };
    fetchUsers();

    let cartsMap: Record<string, any> = {};
    let cartItemsList: any[] = [];

    const processData = () => {
      const grouped: Record<string, any> = {};

      cartItemsList.forEach(item => {
        if (!grouped[item.userId]) {
          const cData = cartsMap[item.userId] || {};
          grouped[item.userId] = {
            userId: item.userId,
            userName: item.userName || cData.userName,
            userEmail: item.userEmail || cData.userEmail,
            sessionStartTime: cData.sessionStartTime,
            items: []
          };
        }
        grouped[item.userId].items.push(item);
      });

      const groupedArray = Object.values(grouped).map(g => {
        // Sort items by updatedAt within the user group
        g.items.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return g;
      });
      
      // Sort groups by the most recently updated item
      groupedArray.sort((a: any, b: any) => {
        const aT = a.items.length > 0 ? new Date(a.items[0].updatedAt).getTime() : 0;
        const bT = b.items.length > 0 ? new Date(b.items[0].updatedAt).getTime() : 0;
        return bT - aT;
      });

      setGroupedCarts(groupedArray);
      setLoading(false);
    };

    const unsubCarts = onSnapshot(collection(db, 'carts'), (snap) => {
      cartsMap = {};
      snap.docs.forEach(d => { cartsMap[d.id] = d.data(); });
      if (cartItemsList.length > 0) processData();
    });

    const unsubCartItems = onSnapshot(query(collection(db, 'cartItems'), orderBy('updatedAt', 'desc')), (snap) => {
      cartItemsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      processData();
      if (snap.empty) setLoading(false);
    });

    return () => {
      unsubCarts();
      unsubCartItems();
    };
  }, [refreshKey]);

  const formatCartDate = (updatedAt: any) => {
    if (!updatedAt) return 'N/A';
    return new Date(updatedAt).toLocaleString();
  };

  const getCartStatus = (cart: any) => {
    if (cart.status === 'ordered') {
      return { label: 'Ordered', color: 'bg-green-100 text-green-800' };
    }
    
    if (cart.status === 'removed') {
      return { label: 'Removed', color: 'bg-gray-100 text-gray-800' };
    }
    
    // Check for pending (not ordered for 24 hours)
    const lastUpdate = new Date(cart.updatedAt).getTime();
    const now = new Date().getTime();
    if (now - lastUpdate > 86400000 && cart.status === 'active') { // 24 hours in ms
      return { label: 'Pending', color: 'bg-orange-100 text-orange-800' };
    }

    return { label: 'Active', color: 'bg-blue-100 text-blue-800' };
  };

  const isItemNew = (item: any, sessionStartTime: string | undefined | null) => {
    if (!sessionStartTime || !item.createdAt) return false;
    const sessionTime = new Date(sessionStartTime).getTime();
    const createdTime = new Date(item.createdAt).getTime();
    
    // session must be < 3 minutes
    if (currentTime - sessionTime >= 180000) return false;
    
    // do not show NEW on removed items
    if (item.status === 'removed') return false;
    
    // item must be created after (or exactly at) the session start time (allow 5 sec delay)
    return createdTime >= sessionTime - 5000;
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'cartItems', itemToDelete));
      toast.success('Successfully deleted cart history item');
    } catch (err) {
      console.error('Failed to delete item', err);
      toast.error('Delete failed');
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <ShoppingCart className="w-6 h-6 mr-2 text-primary-500" />
          Customer Cart Activity
        </h2>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center text-sm px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cart Items & statuses</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedCarts.map((group) => {
                const user = group.userId ? usersCache[group.userId] : null;
                const email = user?.email || group.userEmail;
                const phone = user?.phone || 'N/A';
                
                const groupHasNew = group.items.some((i: any) => isItemNew(i, group.sessionStartTime));
                
                let previousNameInfo = null;
                if (user?.previousName && user?.nameUpdatedAt) {
                  const now = Date.now();
                  const updatedAtMs = new Date(user.nameUpdatedAt).getTime();
                  if (now - updatedAtMs <= 48 * 60 * 60 * 1000) {
                    previousNameInfo = (
                      <div className="text-xs text-orange-500 mt-0.5">
                        Old: {user.previousName} → New: {user.name}
                      </div>
                    );
                  }
                }

                let isNewUser = false;
                if (user?.createdAt) {
                  const now = Date.now();
                  const createdMs = new Date(user.createdAt).getTime();
                  if (now - createdMs < 5 * 60 * 1000) {
                    isNewUser = true;
                  }
                }

                return (
                  <tr key={group.userId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">{user?.name || group.userName || 'Guest'}</div>
                        {isNewUser && (
                          <span className="px-2 inline-flex text-xs leading-5 font-bold rounded bg-green-100 text-green-800 border border-green-200">
                            NEW USER
                          </span>
                        )}
                        {groupHasNew && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            NEW
                          </span>
                        )}
                      </div>
                      {previousNameInfo}
                      <div className="text-sm text-gray-500 mt-0.5">ID: {group.userId?.slice(-6) || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {email && <div className="text-sm text-gray-500">{email}</div>}
                      <div className="text-sm text-gray-500">{phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-3">
                        {group.items.map((item: any) => {
                          const { label, color } = getCartStatus(item);
                          const itemIsNew = isItemNew(item, group.sessionStartTime);
                          
                          return (
                            <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-md border border-gray-100">
                              <div className="flex items-center space-x-3">
                                <span className="font-medium text-gray-900">{item.quantity}x {item.itemName}</span>
                                {itemIsNew && (
                                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded bg-indigo-500 text-white">NEW</span>
                                )}
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-gray-500 text-xs">{formatCartDate(item.updatedAt)}</span>
                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${color}`}>
                                  {label}
                                </span>
                                <button 
                                  onClick={() => {
                                    setItemToDelete(item.id);
                                    setDeleteModalOpen(true);
                                  }}
                                  className="text-red-600 hover:text-red-900 focus:outline-none"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {groupedCarts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    No cart activity found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Cart Item"
        message="Are you sure you want to delete this item?"
        isDeleting={isDeleting}
      />
    </div>
  );
}
