import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  TrendingUp, 
  ShoppingBag, 
  IndianRupee, 
  Activity,
  Calendar,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { format, subDays, isSameDay, isSameWeek, isSameMonth, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

// Convert to IST for accurate Indian day boundaries
const toIST = (date: Date) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5));
};

export function Dashboard() {
  const [stats, setStats] = useState({
    todayOrders: 0,
    weeklyOrders: 0,
    monthlyOrders: 0,
    totalOrders: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
    totalUsers: 0,
    totalMenuItems: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Reset Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      setRefreshKey(prev => prev + 1);
      // Wait for listeners to reattach
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Updated successfully');
    } catch (e) {
      toast.error('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let currentUsersCount = 0;
    let currentMenuCount = 0;
    let currentOrdersSnapshot: any = null;
    let currentResetTimestamp: any = null;

    const calculateStats = () => {
      if (!currentOrdersSnapshot) return;
      
      const now = toIST(new Date());
      let todayO = 0, weeklyO = 0, monthlyO = 0, totalO = 0;
      let todayR = 0, weeklyR = 0, monthlyR = 0, totalR = 0;

      // For chart (last 7 days)
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(now, 6 - i);
        return {
          date: format(d, 'MMM dd'),
          rawDate: d,
          orders: 0,
          revenue: 0
        };
      });

      currentOrdersSnapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        
        // Exclude cancelled and soft-deleted orders completely from stats
        if (data.status?.toLowerCase() === 'cancelled') return;
        if (data.isDeleted) return;
        
        const rawDate = data.deliveredAt || data.statusTimestamps?.delivered || data.orderedAt || data.createdAt || data.timestamp;
        if (!rawDate) {
          console.log(`Order ${docSnap.id} skipped: No valid date found`);
          return;
        }

        let localOrderDate: Date;
        if (rawDate?.toDate) {
          localOrderDate = rawDate.toDate();
        } else if (typeof rawDate === 'string') {
          localOrderDate = parseISO(rawDate);
        } else if (typeof rawDate === 'number') {
          localOrderDate = new Date(rawDate);
        } else {
          localOrderDate = new Date(rawDate);
          if (isNaN(localOrderDate.getTime()) && rawDate.seconds) {
            localOrderDate = new Date(rawDate.seconds * 1000);
          }
        }
        
        const orderDate = toIST(localOrderDate);

        if (currentResetTimestamp) {
          const resetTime = currentResetTimestamp.toDate ? currentResetTimestamp.toDate().getTime() : new Date(currentResetTimestamp).getTime();
          if (localOrderDate.getTime() < resetTime) {
            return; // skip this order as it is before reset
          }
        }
        
        // Only calculate revenue for strictly delivered orders
        const isDelivered = data.status?.toLowerCase() === 'delivered';
        const amount = isDelivered ? (data.totalAmount || 0) : 0;
        
        // According to user request: "Count delivered orders"
        if (!isDelivered) {
          console.log(`Order ${docSnap.id} ignored in stats: Status is ${data.status}`);
          return;
        }
        
        totalO++;
        totalR += amount;

        const isToday = isSameDay(orderDate, now);
        // We use { weekStartsOn: 1 } for Monday as the week start, common in India
        const isWeek = isSameWeek(orderDate, now, { weekStartsOn: 1 });
        const isMonth = isSameMonth(orderDate, now);

        console.log(`Order ${docSnap.id}: status=${data.status}, date=${format(orderDate, 'yyyy-MM-dd HH:mm:ss')} IST, isToday=${isToday}, isWeek=${isWeek}, isMonth=${isMonth}`);

        if (isToday) {
          todayO++;
          todayR += amount;
        }
        if (isWeek) {
          weeklyO++;
          weeklyR += amount;
        }
        if (isMonth) {
          monthlyO++;
          monthlyR += amount;
        }

        // Update chart data
        const chartItem = last7Days.find(item => isSameDay(item.rawDate, orderDate));
        if (chartItem) {
          chartItem.orders++;
          chartItem.revenue += amount;
        }
      });

      setStats({
        todayOrders: todayO,
        weeklyOrders: weeklyO,
        monthlyOrders: monthlyO,
        totalOrders: totalO,
        todayRevenue: todayR,
        weeklyRevenue: weeklyR,
        monthlyRevenue: monthlyR,
        totalRevenue: totalR,
        totalUsers: currentUsersCount,
        totalMenuItems: currentMenuCount
      });

      setChartData(last7Days);
      setLoading(false);
    };

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      currentUsersCount = snapshot.size;
      calculateStats();
    });

    const unsubscribeMenu = onSnapshot(collection(db, 'menu'), (snapshot) => {
      currentMenuCount = snapshot.size;
      calculateStats();
    });

    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      currentOrdersSnapshot = snapshot;
      calculateStats();
    });

    const unsubscribeAdmin = onSnapshot(doc(db, 'settings', 'admin'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().dashboardResetTimestamp) {
        currentResetTimestamp = docSnap.data().dashboardResetTimestamp;
      } else {
        currentResetTimestamp = null;
      }
      calculateStats();
    });

    return () => {
      unsubscribeUsers();
      unsubscribeMenu();
      unsubscribeOrders();
      unsubscribeAdmin();
    };
  }, [refreshKey]);

  const handleResetData = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setIsResetting(true);
    
    try {
      const adminDoc = await getDoc(doc(db, 'settings', 'admin'));
      
      let actualPassword = '12345678';
      if (adminDoc.exists() && adminDoc.data().dashboardPassword) {
        actualPassword = adminDoc.data().dashboardPassword;
      }

      if (resetPassword !== actualPassword) {
        setResetError('Incorrect password');
        setIsResetting(false);
        return;
      }

      // Add reset timestamp
      await setDoc(doc(db, 'settings', 'admin'), { 
        dashboardResetTimestamp: new Date().toISOString() 
      }, { merge: true });

      toast.success('Dashboard data reset successfully');
      setShowResetModal(false);
      setResetPassword('');
      setResetError('');
    } catch (e) {
       console.error(e);
       setResetError('Failed to verify password.');
    } finally {
       setIsResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statCards = [
    { title: 'Today Orders', value: stats.todayOrders, icon: ShoppingBag, color: 'bg-blue-500' },
    { title: 'Weekly Orders', value: stats.weeklyOrders, icon: Calendar, color: 'bg-indigo-500' },
    { title: 'Monthly Orders', value: stats.monthlyOrders, icon: Activity, color: 'bg-purple-500' },
    { title: 'Total Orders', value: stats.totalOrders, icon: TrendingUp, color: 'bg-pink-500' },
    { title: 'Today Revenue', value: `₹${stats.todayRevenue.toFixed(2)}`, icon: IndianRupee, color: 'bg-green-500' },
    { title: 'Weekly Revenue', value: `₹${stats.weeklyRevenue.toFixed(2)}`, icon: IndianRupee, color: 'bg-teal-400' },
    { title: 'Monthly Revenue', value: `₹${stats.monthlyRevenue.toFixed(2)}`, icon: IndianRupee, color: 'bg-emerald-500' },
    { title: 'Total Revenue', value: `₹${stats.totalRevenue.toFixed(2)}`, icon: IndianRupee, color: 'bg-teal-500' },
    { title: 'Total Users', value: stats.totalUsers, icon: Activity, color: 'bg-orange-500' },
    { title: 'Total Menu Items', value: stats.totalMenuItems, icon: ShoppingBag, color: 'bg-rose-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowResetModal(true)}
            className="flex items-center text-sm px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md shadow-sm hover:bg-red-100 focus:outline-none"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Reset Dashboard Data
          </button>
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center">
            <div className={`${stat.color} p-4 rounded-lg text-white mr-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue (Last 7 Days)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(val) => `₹${val}`} />
                <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Orders (Last 7 Days)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative mx-auto bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                Reset Dashboard
              </h3>
              <button 
                onClick={() => {
                  setShowResetModal(false);
                  setResetError('');
                  setResetPassword('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Enter your admin dashboard password to reset all sales and order tallies to zero. This does not delete any actual invoices or data.
            </p>

            <form onSubmit={handleResetData}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dashboard Password
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter password..."
                  autoFocus
                />
                {resetError && (
                  <p className="text-red-500 text-sm mt-1">{resetError}</p>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-50 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !resetPassword}
                  className="flex-1 bg-red-600 text-white font-medium py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none disabled:opacity-50 flex items-center justify-center"
                >
                  {isResetting ? 'Resetting...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}