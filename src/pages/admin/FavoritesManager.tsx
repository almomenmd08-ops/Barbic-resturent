import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy, writeBatch, doc, getDocs, deleteDoc, collectionGroup } from 'firebase/firestore';
import { Heart, Search, Filter, Trash2, TrendingUp, BarChart3, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';

interface FavoriteLog {
  id: string;
  userId?: string;
  deviceId?: string;
  dishId: string;
  dishName: string;
  createdAt: string;
  addedToCartAt?: string;
  path: string; // Add path for deletion
}

export function FavoritesManager() {
  const [logs, setLogs] = useState<FavoriteLog[]>([]);
  const logsRef = useRef<FavoriteLog[]>(logs);
  const [usersCache, setUsersCache] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users')));
        const uDict: Record<string, any> = {};
        usersSnap.forEach(d => {
          uDict[d.id] = d.data();
        });
        setUsersCache(uDict);
      } catch (err) {
        console.error("Failed to load users lookup:", err);
      }
    };
    fetchUsers();

    const q = collectionGroup(db, 'favorites');

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: FavoriteLog[] = [];
      const now = Date.now();
      
      snapshot.forEach((docSnap) => {
        const logData = docSnap.data() as FavoriteLog;
        
        // Auto-delete if added to cart more than 5 mins ago
        if (logData.addedToCartAt) {
          const addedTime = new Date(logData.addedToCartAt).getTime();
          if (now - addedTime > 5 * 60 * 1000) {
            deleteDoc(docSnap.ref).catch(console.error);
            return; // skip adding to local state
          }
        }
        
        // Infer userId from the parent document path if missing
        const parentPath = docSnap.ref.parent.parent;
        const inferredUserId = logData.userId || parentPath?.id;

        data.push({ 
          id: docSnap.id, 
          ...logData, 
          userId: inferredUserId,
          path: docSnap.ref.path 
        });
      });

      // Sort in memory by newest
      data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      setLogs(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites data');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Set up periodic check for 5-minute cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      logsRef.current.forEach(log => {
        if (log.addedToCartAt) {
          const addedTime = new Date(log.addedToCartAt).getTime();
          if (now - addedTime > 5 * 60 * 1000) {
            deleteDoc(doc(db, log.path)).catch(console.error);
          }
        }
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const totalFavorites = logs.length;
  
  const itemCounts = logs.reduce((acc, log) => {
    acc[log.dishName] = (acc[log.dishName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topItems = Object.entries(itemCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  const filteredLogs = logs.filter(log => 
    log.dishName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usersCache[log.userId || '']?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.deviceId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group favorites by user for display
  const groupedFavorites: Array<{ userId?: string, deviceId?: string, items: FavoriteLog[] }> = Object.values(
    filteredLogs.reduce((acc, log) => {
      const uId = log.userId || log.deviceId || 'unknown';
      if (!acc[uId]) {
        acc[uId] = {
           userId: log.userId,
           deviceId: log.deviceId,
           items: []
        };
      }
      acc[uId].items.push(log);
      return acc;
    }, {} as Record<string, { userId?: string, deviceId?: string, items: FavoriteLog[] }>)
  );

  const handleClearLogsClick = () => {
    setItemToDelete('all');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === 'all') {
      try {
        const batch = writeBatch(db);
        logs.forEach(log => {
          batch.delete(doc(db, log.path));
        });
        await batch.commit();
        toast.success('All logs cleared successfully');
      } catch (error) {
        console.error('Error clearing logs:', error);
        toast.error('Failed to clear logs');
      }
    } else if (itemToDelete) {
      try {
        // Find the specific log to get its path
        const logToDelete = logs.find(l => l.id === itemToDelete);
        if (logToDelete) {
          await deleteDoc(doc(db, logToDelete.path));
          toast.success('Favorite log removed');
        } else {
          toast.error('Log not found');
        }
      } catch (err) {
        console.error('Error removing log', err);
        toast.error('Failed to remove log');
      }
    }
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

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
          Favorites Link View
        </h1>
        <p className="text-sm text-gray-500 mt-1">Monitor real-time food favorites by customers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Favorites</p>
              <h3 className="text-2xl font-bold text-gray-900">{totalFavorites}</h3>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Trending Items</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {topItems.map(([name, count], index) => (
              <div key={name} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-bold text-gray-400">#{index + 1}</span>
                <span className="text-sm font-medium text-gray-900">{name}</span>
                <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded-full">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search dishes, users, or IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white border focus:border-red-500 rounded-xl focus:outline-none focus:ring-0 transition-all"
            />
          </div>
          <button 
             onClick={handleClearLogsClick}
             className="px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 whitespace-nowrap self-end sm:self-auto"
          >
            <Trash2 className="w-4 h-4" /> Clear Logs
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Favorites & Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groupedFavorites.map(group => {
                const user = group.userId ? usersCache[group.userId] : null;
                const email = user?.email || '';
                const phone = user?.phone || 'N/A';
                const uIdKey = group.userId || group.deviceId || 'unknown';

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
                  <tr key={uIdKey}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">{user?.name || 'Guest'}</div>
                        {isNewUser && (
                          <span className="px-2 inline-flex text-xs leading-5 font-bold rounded bg-green-100 text-green-800 border border-green-200">
                            NEW USER
                          </span>
                        )}
                      </div>
                      {previousNameInfo}
                      <div className="text-sm text-gray-500 mt-0.5">ID: {uIdKey.slice(-6).replace('vice_', 'Dev: ')}</div>
                    </td>
                    <td className="px-6 py-4">
                      {email && <div className="text-sm text-gray-500">{email}</div>}
                      <div className="text-sm text-gray-500">{phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-3">
                        {group.items.map(log => {
                          const date = new Date(log.createdAt);
                          const isAddedToCart = !!log.addedToCartAt;
                          
                          return (
                            <div key={log.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-md border border-gray-100">
                              <div className="flex items-center space-x-3">
                                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                <span className="font-medium text-gray-900">{log.dishName}</span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-gray-500 text-xs">{date.toLocaleDateString()} {date.toLocaleTimeString()}</span>
                                {isAddedToCart ? (
                                  <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    In Cart
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                    Favorite
                                  </span>
                                )}
                                <button
                                  onClick={() => {
                                    setItemToDelete(log.id);
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors ml-2"
                                  title="Delete Favorite Log"
                                >
                                  <Trash2 className="w-4 h-4" />
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
              {groupedFavorites.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No favorites found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={itemToDelete === 'all' ? "Clear All Favorite Logs" : "Delete Favorite Log"}
        message={itemToDelete === 'all' 
          ? "Are you sure you want to clear all favorite logs? This action cannot be undone." 
          : "Are you sure you want to delete this favorite log? This action cannot be undone."}
      />
    </div>
  );
}
