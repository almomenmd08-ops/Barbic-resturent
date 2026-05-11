import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, deleteField, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Users, Search, ShoppingBag, Trash2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      setRefreshKey(prev => prev + 1);
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Updated successfully');
    } catch (e) {
      toast.error('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every 10 seconds to auto-hide NEW USER labels
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    let ordersList: any[] = [];
    
    // First fetch orders
    const fetchOrdersAndSubscribeUsers = async () => {
      try {
        const ordersSnapshot = await getDocs(query(collection(db, 'orders')));
        ordersList = ordersSnapshot.docs.map(doc => doc.data());
      } catch (e) {
        console.error("Failed to load orders");
      }

      const unsubscribe = onSnapshot(query(collection(db, 'users')), async (snapshot) => {
        const usersData: any[] = snapshot.docs.map(d => ({
          uid: d.id,
          ...d.data(),
          totalOrders: 0,
          totalSpent: 0
        }));

        const now = Date.now();
        const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

        for (const u of usersData) {
          // Compute correct order stats
          ordersList.forEach(order => {
            if (order.userId === u.uid) {
              u.totalOrders += 1;
              u.totalSpent += (order.totalAmount || 0);
            }
          });

          // Check name expiration
          if (u.previousName && u.nameUpdatedAt) {
            const updatedAtMs = new Date(u.nameUpdatedAt).getTime();
            if (now - updatedAtMs > FORTY_EIGHT_HOURS) {
              // Expired, clear it from firestore
              try {
                await updateDoc(doc(db, 'users', u.uid), {
                  previousName: deleteField(),
                  nameUpdatedAt: deleteField()
                });
                delete u.previousName;
                delete u.nameUpdatedAt;
              } catch (e) {}
            }
          }
        }

        usersData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUsers(usersData);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
        setLoading(false);
      });

      return unsubscribe;
    };

    let unsub: any;
    fetchOrdersAndSubscribeUsers().then(res => { unsub = res; });

    return () => {
      if (unsub) unsub();
    };
  }, [refreshKey]);

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    try {
      // 1. Delete from Firebase Authentication via backend API
      const response = await fetch(`/api/admin/delete-user/${userToDelete}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        // Special case: If we fail because of credentials on auth deletion, proceed with DB deletion so the admin isn't fully blocked
        if (errorData?.details?.includes('Generate New Private Key')) {
          console.warn("Could not delete from Auth due to missing FIREBASE_SERVICE_ACCOUNT_KEY. Proceeding to delete from Firestore.");
          toast.success("User deleted from Firestore. (Warning: Could not delete from Auth. Configure Service Account Key in settings.)", { duration: 6000 });
        } else {
           throw new Error(errorData?.error || 'Failed to delete user from Auth');
        }
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'users', userToDelete));
      
      if (response.ok) {
        toast.success('User deleted successfully');
      }
      
      setUsers((prev) => prev.filter(u => u.uid !== userToDelete));
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error('Delete failed');
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <div className="flex w-full sm:w-auto items-center space-x-4">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center text-sm px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => {
                let isNewUser = false;
                if (user?.createdAt) {
                  const createdMs = new Date(user.createdAt).getTime();
                  if (currentTime - createdMs < 5 * 60 * 1000) {
                    isNewUser = true;
                  }
                }

                return (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold shrink-0">
                          {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </div>
                        <div className="ml-4 flex flex-col">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">{user.name || 'Unknown'}</span>
                            {isNewUser && (
                              <span className="px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded bg-green-100 text-green-800 border border-green-200 uppercase">
                                NEW USER
                              </span>
                            )}
                          </div>
                          {user.previousName && user.nameUpdatedAt && (
                            <div className="text-xs text-orange-500 mt-0.5">
                              Old: {user.previousName} → New: {user.name}
                            </div>
                          )}
                          <div className="text-sm text-gray-500 mt-0.5">Role: {user.role || 'customer'}</div>
                        </div>
                      </div>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    <div className="text-sm text-gray-500">{user.phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <ShoppingBag className="w-3 h-3 mr-1" />
                      {user.totalOrders}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ₹{user.totalSpent.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setUserToDelete(user.uid);
                        setDeleteModalOpen(true);
                      }}
                      className="text-red-600 hover:text-red-900 focus:outline-none"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this item?"
        isDeleting={isDeleting}
      />
    </div>
  );
}