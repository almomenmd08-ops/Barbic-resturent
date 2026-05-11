import { useEffect, useState, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, logout } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { LogOut, Package, Edit2, Trash2, RefreshCw, Lock, AlertTriangle, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useSettingsStore } from '../store/settingsStore';
import { OrderTracker } from '../components/OrderTracker';
import { OptimizedImage } from '../components/OptimizedImage';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let cachedOrders: any[] | null = null;
let cachedOrdersUserId: string | null = null;

export const clearOrdersCache = () => {
  cachedOrders = null;
  cachedOrdersUserId = null;
};

export function Profile() {
  const { settings } = useSettingsStore();
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { state: { from: { pathname: '/profile' } } });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    
    // Fetch user profile data
    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        if (!isEditingProfile) {
          setProfileForm({
            name: data.name || user.displayName || '',
            email: data.email || user.email || '',
            phone: data.phone || ''
          });
        }
      } else {
        if (!isEditingProfile) {
          setProfileForm({
            name: user.displayName || '',
            email: user.email || '',
            phone: ''
          });
        }
      }
    }, (error) => {
      console.error("Error fetching user data:", error);
    });

    setLoadingOrders(true);
    
    const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubscribeOrders = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((order: any) => !order.isHiddenForUser && !order.isDeleted);
      
      // Sort locally since we don't have a composite index yet
      ordersData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setOrders(ordersData);
      setLoadingOrders(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
      setLoadingOrders(false);
      handleFirestoreError(error, OperationType.GET, 'orders');
    });

    return () => {
      unsubscribeUser();
      unsubscribeOrders();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const timestampKey = newStatus === 'out_for_delivery' ? 'outForDeliveryAt' : `${newStatus}At`;
      await setDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        [timestampKey]: serverTimestamp(),
        statusTimestamps: {
          [newStatus]: serverTimestamp()
        }
      }, { merge: true });
      
      // Update local state and cache
      const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
      setOrders(updatedOrders);
      if (cachedOrders) cachedOrders = updatedOrders;
      
      toast.success(newStatus === 'cancelled' ? 'Order cancelled' : 'Order status updated');
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error(error?.message || "Failed to update order status");
      handleFirestoreError(error, OperationType.UPDATE, `orders/${updatingOrderId}`);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const { clearCart, addItem, updateQuantity } = useCartStore();
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const handleReorder = (order: any) => {
    clearCart();
    order.items.forEach((item: any) => {
      addItem({
        id: item.id || item.name, // fallback id if missing
        name: item.name,
        price: item.price,
        type: item.type || 'veg',
      });
      if (item.quantity > 1) {
        updateQuantity(item.id || item.name, item.quantity);
      }
    });
    toast.success('Items added to cart');
    navigate('/checkout');
  };

  const handleDeleteOrder = async (orderId: string) => {
    setOrderToDelete(orderId);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    setDeletingOrderId(orderToDelete);
    try {
      // Soft delete: hide from user view only
      await updateDoc(doc(db, 'orders', orderToDelete), {
        isHiddenForUser: true
      });
      
      // Update local state and cache
      const updatedOrders = orders.filter(o => o.id !== orderToDelete);
      setOrders(updatedOrders);
      if (cachedOrders) cachedOrders = updatedOrders;
      
      toast.success('Order removed from history');
    } catch (error) {
      console.error("Error hiding order:", error);
      toast.error("Failed to remove order string");
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderToDelete}`);
    } finally {
      setDeletingOrderId(null);
      setOrderToDelete(null);
    }
  };

  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    const currentPhone = userData?.phone || '';
    const newPhone = profileForm.phone.trim();

    if (newPhone !== currentPhone && !isOtpStep) {
      setIsOtpStep(true);
      toast.success('OTP sent (Mock Mode)');
      return;
    }

    if (isOtpStep && otpCode !== '123456') {
      toast.error('Invalid OTP. Please try again.');
      return;
    }

    setSavingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      const currentName = userData?.name || user.displayName || '';
      const newName = profileForm.name.trim();
      
      const updates: any = {
        name: newName,
        email: profileForm.email.trim(),
        phone: newPhone,
        profileUpdatedAt: new Date().toISOString()
      };

      if (newName !== currentName) {
        updates.previousName = currentName;
        updates.nameUpdatedAt = new Date().toISOString();
      }

      await setDoc(userRef, updates, { merge: true });
      toast.success('Profile updated successfully');
      setIsEditingProfile(false);
      setIsOtpStep(false);
      setOtpCode('');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Failed to update profile');
      // If the document doesn't exist, we might need to create it (setDoc instead of updateDoc),
      // but usually the user doc is created on login. Handled here natively.
    } finally {
      setSavingProfile(false);
    }
  };

  const formatOrderDate = (createdAt: any) => {
    if (!createdAt) return 'N/A';
    if (createdAt.toDate) return createdAt.toDate().toLocaleString();
    return new Date(createdAt).toLocaleString();
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async (order: any) => {
    setUpdatingOrderId(order.id);
    const res = await loadRazorpayScript();
    
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      setUpdatingOrderId(null);
      return;
    }
    
    const options = {
      key: 'rzp_test_Sg4m4XT5gjMXQD',
      amount: Math.round(order.totalAmount * 100),
      currency: 'INR',
      name: 'Restaurant',
      description: 'Order Payment',
      handler: async function (response: any) {
        try {
          await updateDoc(doc(db, 'orders', order.id), {
            paymentStatus: 'Successfully',
            paymentMethod: 'ONLINE',
            razorpayPaymentId: response.razorpay_payment_id
          });
          
          const updatedOrders = orders.map(o => o.id === order.id ? { ...o, paymentStatus: 'Successfully', paymentMethod: 'ONLINE', razorpayPaymentId: response.razorpay_payment_id } : o);
          setOrders(updatedOrders);
          if (cachedOrders) cachedOrders = updatedOrders;
          toast.success('Payment successful!');
        } catch (err) {
          console.error(err);
          toast.error('Payment verified but system update failed.');
        } finally {
          setUpdatingOrderId(null);
        }
      },
      prefill: {
        name: order.customerDetails?.name || user?.displayName || '',
        email: user?.email || '',
        contact: order.customerDetails?.phone || ''
      },
      theme: { color: '#ea580c' },
      modal: {
        ondismiss: function() {
          setUpdatingOrderId(null);
          toast.error('Payment cancelled');
        }
      }
    };
    
    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', function (response: any) {
      setUpdatingOrderId(null);
      toast.error(response.error.description || 'Payment failed');
    });
    rzp.open();
  };

  const processedOrders = useMemo(() => {
    let result = [...orders];

    if (filterStatus !== 'all') {
      result = result.filter(order => order.status === filterStatus);
    }

    result.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();

      if (sortBy === 'date-desc') {
        return timeB - timeA;
      } else if (sortBy === 'date-asc') {
        return timeA - timeB;
      } else if (sortBy === 'amount-desc') {
        return b.totalAmount - a.totalAmount;
      } else if (sortBy === 'amount-asc') {
        return a.totalAmount - b.totalAmount;
      }
      return 0;
    });

    return result;
  }, [orders, filterStatus, sortBy]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const profileUpdatedAt = userData?.profileUpdatedAt;
  let isLocked = false;
  let daysLeft = 0;
  if (profileUpdatedAt) {
    const updatedMs = new Date(profileUpdatedAt).getTime();
    const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
    if (Date.now() - updatedMs < SIXTY_DAYS_MS) {
      isLocked = true;
      daysLeft = Math.ceil((SIXTY_DAYS_MS - (Date.now() - updatedMs)) / (1000 * 60 * 60 * 24));
    }
  }

  return (
    <div className="min-h-screen bg-bg-main py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start w-full">
              {user.photoURL ? (
                <OptimizedImage src={user.photoURL} alt={userData?.name || user.displayName || (user.email ? user.email.split('@')[0] : 'User')} className="h-16 w-16 rounded-full border-2 border-primary-100 mt-1" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-primary-500 font-bold text-xl min-w-[4rem] mt-1">
                  {userData?.name?.charAt(0) || user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              
              <div className="ml-6 flex-1 max-w-lg">
                {isEditingProfile ? (
                  isOtpStep ? (
                    <div className="space-y-4">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                         <input
                           type="text"
                           value={otpCode}
                           onChange={(e) => setOtpCode(e.target.value)}
                           className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                           placeholder="123456"
                         />
                         <p className="mt-1 text-xs text-gray-500">A mock OTP (123456) has been sent to verify your phone number.</p>
                       </div>
                       <div className="flex items-center space-x-3 pt-2">
                         <button
                           onClick={handleSaveProfile}
                           disabled={savingProfile || !otpCode}
                           className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                         >
                           {savingProfile ? 'Verifying...' : 'Verify & Save'}
                         </button>
                         <button
                           onClick={() => {
                             setIsOtpStep(false);
                             setOtpCode('');
                           }}
                           disabled={savingProfile}
                           className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                         >
                           Back
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
                          placeholder="Your full name"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
                          placeholder="Your email address"
                          disabled={isLocked}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
                          placeholder="Your phone number"
                          disabled={isLocked}
                        />
                      </div>
                      <div className="flex flex-col space-y-3 pt-2">
                        {isLocked ? (
                          <div className="text-sm font-medium text-orange-700 bg-orange-50 px-3 py-2 rounded-md border border-orange-100 flex items-start">
                            <Lock className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                            <span>You cannot edit your profile for 60 days after saving changes. ({daysLeft} days left)</span>
                          </div>
                        ) : (
                          <div className="w-full mt-2.5 p-3 rounded-lg border border-red-500 bg-red-50 text-red-700 flex items-start">
                            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                            <span className="text-sm font-medium">You can edit your profile only once in 60 days.</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          {!isLocked && (
                            <button
                              onClick={handleSaveProfile}
                              disabled={savingProfile}
                              className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                            >
                              {savingProfile ? 'Saving...' : 'Save Changes'}
                            </button>
                          )}
                          <button
                            onClick={() => setIsEditingProfile(false)}
                            disabled={savingProfile}
                            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                          >
                            {isLocked ? 'Close' : 'Cancel'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-ink truncate">{userData?.name || user.displayName || (user.email ? user.email.split('@')[0] : 'User')}</h1>
                    <p className="text-gray-500 truncate">{userData?.email || user.email}</p>
                    {userData?.phone && <p className="text-gray-500 truncate">{userData.phone}</p>}
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="mt-3 text-sm text-primary-600 flex items-center hover:text-primary-700 font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit Profile
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="btn-secondary flex items-center justify-center w-full sm:w-auto mt-4 sm:mt-0 px-6 py-2 border border-gray-300 rounded-xl text-sm uppercase tracking-wider shrink-0 self-start sm:self-center"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-xl font-bold text-ink flex items-center">
            <Package className="w-6 h-6 mr-2 text-primary-500" />
            Your Orders
          </h2>
          {orders.length > 0 && (
            <div className="flex items-center space-x-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 bg-white rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 shadow-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 bg-white rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 shadow-sm"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">High to Low</option>
                <option value="amount-asc">Low to High</option>
              </select>
            </div>
          )}
        </div>

        {loadingOrders ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
            <button
              onClick={() => navigate('/menu')}
              className="btn-primary px-8 py-3 rounded-xl uppercase tracking-wider text-sm shadow-md"
            >
              Browse Menu
            </button>
          </div>
        ) : processedOrders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No orders match the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {processedOrders.map((order) => {
              const isCurrent = order.status !== 'delivered' && order.status !== 'cancelled';
              const isExpanded = expandedOrders[order.id] !== undefined ? expandedOrders[order.id] : isCurrent;
              
              return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleOrderExpansion(order.id)}
                      className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                      aria-label={isExpanded ? "Collapse Order" : "Expand Order"}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    <div>
                      <p className="text-sm text-gray-500">Order ID: <span className="font-mono text-gray-900">{order.id}</span></p>
                      <p className="text-sm text-gray-500">Date: {formatOrderDate(order.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col items-end space-y-1">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                          disabled={updatingOrderId === order.id}
                          className="text-xs text-red-600 hover:text-red-800 font-medium underline disabled:opacity-50 mb-1"
                        >
                          Cancel Order
                        </button>
                      )}
                      <div className="text-xs text-gray-500 font-medium">
                        Payment: {order.paymentMethod || 'COD'} (
                        <span className={`
                          ${order.paymentStatus === 'Successfully' ? 'text-green-600' : 
                            order.paymentStatus === 'Failed' ? 'text-red-600' : 'text-yellow-600'}
                        `}>
                          {order.paymentStatus || 'Pending'}
                        </span>
                        )
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">₹{order.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
                
                {isExpanded && (
                  <>
                    <div className="px-6 py-4">
                      <ul className="divide-y divide-gray-100">
                        {order.items.map((item: any, index: number) => (
                          <li key={index} className="py-2 flex justify-between">
                            <span className="text-gray-700">{item.quantity}x {item.name}</span>
                            <span className="text-gray-500">₹{item.price * item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <OrderTracker order={order} />
                  </>
                )}

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-2">
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <span className="text-xs text-gray-500 mr-auto hidden sm:block">
                      You can delete this order after it is delivered or cancelled.
                    </span>
                  )}
                  {(order.status === 'delivered' || order.status === 'cancelled') && (
                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      disabled={deletingOrderId === order.id}
                      className="p-1.5 rounded-full text-[#E23744] hover:bg-red-50 disabled:opacity-50 transition-colors flex-shrink-0"
                      title="Delete Order"
                    >
                      {deletingOrderId === order.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-[1.5px] border-[#E23744]"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  {(!order.paymentStatus || order.paymentStatus === 'Pending' || order.paymentStatus === 'Failed') && order.status !== 'cancelled' && (
                    <button
                      onClick={() => handlePayNow(order)}
                      disabled={updatingOrderId === order.id}
                      className="btn-whatsapp flex items-center px-3 py-1.5 text-xs shadow-sm disabled:opacity-50 rounded-lg"
                    >
                      {updatingOrderId === order.id ? (
                         <div className="animate-spin rounded-full h-3 w-3 border-b-[1.5px] border-white mr-1.5"></div>
                      ) : null}
                      Pay Now
                    </button>
                  )}
                  {settings.whatsapp && (
                    <button
                      onClick={() => {
                        const text = encodeURIComponent(`Hi ${settings.name}, I need help with my Order #${order.id}`);
                        const whatsappNum = settings.whatsapp.replace(/\D/g, '');
                        window.open(`https://wa.me/${whatsappNum}?text=${text}`, '_blank');
                      }}
                      className="btn-whatsapp flex items-center px-2.5 py-1.5 text-xs shadow-sm rounded-lg"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1" /> Support
                    </button>
                  )}
                  <button
                    onClick={() => handleReorder(order)}
                    className="btn-primary flex items-center px-3 py-1.5 text-xs rounded-lg shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Reorder
                  </button>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto pointer-events-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50 pointer-events-auto" onClick={() => setOrderToDelete(null)}></div>
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 z-10 pointer-events-auto">
            <h3 className="text-lg font-bold text-ink mb-2">Delete Order</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this order from your history? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteOrder}
                disabled={deletingOrderId === orderToDelete}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
              >
                {deletingOrderId === orderToDelete ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
