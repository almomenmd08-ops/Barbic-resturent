import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc, deleteDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { MapPin, CreditCard, Banknote, Edit2, CheckCircle2, ChevronRight, Home, TicketPercent, X } from 'lucide-react';

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

import { useSettings } from '../hooks/useSettings';
import { clearOrdersCache } from './Profile';

export function Checkout() {
  const { items, total, clearCart } = useCartStore();
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const { settings } = useSettings();
  
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    phone: '',
    address: '',
    houseNo: '',
    area: '',
    landmark: '',
    city: '',
    pincode: '',
    instructions: '',
  });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isEditingAddress, setIsEditingAddress] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('ONLINE');
  const [hasSavedData, setHasSavedData] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.onlinePayment) {
        setPaymentMethod('ONLINE');
      } else if (settings.cashOnDelivery) {
        setPaymentMethod('COD');
      }
    }
  }, [settings]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.name || data.phone || data.address || data.city) {
            setFormData({
              name: data.name || user.displayName || '',
              phone: data.phone || '',
              address: data.address || '',
              houseNo: data.houseNo || '',
              area: data.area || '',
              landmark: data.landmark || '',
              city: data.city || '',
              pincode: data.pincode || '',
              instructions: data.instructions || '',
            });
            if (data.name && data.phone && (data.address || (data.houseNo && data.area))) {
              setIsEditingAddress(false);
              setHasSavedData(true);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
        <button
          onClick={() => navigate('/menu')}
          className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase()));
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'coupons');
        return; // handleFirestoreError throws, but just in case
      }
      
      if (snapshot.empty) {
        setDiscount(0);
        toast.error('Invalid coupon code');
        return;
      }

      const coupon = snapshot.docs[0].data();
      
      if (!coupon.active) {
        setDiscount(0);
        toast.error('This coupon is no longer active');
        return;
      }

      if (new Date(coupon.expiryDate) < new Date()) {
        setDiscount(0);
        toast.error('This coupon has expired');
        return;
      }

      if (total() < (coupon.minOrderValue || 0)) {
        setDiscount(0);
        toast.error(`Minimum order value of ₹${coupon.minOrderValue} required`);
        return;
      }

      let calculatedDiscount = 0;
      if (coupon.discountType === 'percentage') {
        calculatedDiscount = total() * (coupon.discountValue / 100);
      } else if (coupon.discountType === 'flat') {
        calculatedDiscount = coupon.discountValue;
      } else if (coupon.discountType === 'free_delivery') {
        calculatedDiscount = 0; // We will handle delivery cost below
      } else if (coupon.discountType === 'free_item') {
        calculatedDiscount = 0; // The item comes free, value depends on integration, but flat 0 for total
      }

      setDiscount(calculatedDiscount);
      // We will need to store the applied coupon to use it for delivery discount overrides
      return coupon;
    } catch (error) {
      console.error("Error applying coupon:", error);
      toast.error('Failed to apply coupon');
      return null;
    }
  };

  const handleApplyCouponClick = async () => {
    const coupon = await handleApplyCoupon();
    if (coupon) {
      setAppliedCoupon(coupon);
      toast.success('Coupon applied successfully!');
    } else {
      setAppliedCoupon(null);
    }
  }

  const deliveryCharge = appliedCoupon?.discountType === 'free_delivery' ? 0 : (total() > 0 && total() < settings.freeDeliveryMin ? settings.deliveryCharge : 0);
  const finalTotal = Math.max(0, total() - discount + deliveryCharge);

  const handleSaveAddress = async () => {
    if (!formData.name || !formData.phone || !formData.houseNo || !formData.area || !formData.city || !formData.pincode) {
      toast.error('Please fill in all mandatory fields');
      return;
    }

    setIsSavingAddress(true);
    
    const fullAddress = [
      formData.houseNo,
      formData.area,
      formData.landmark ? `Near ${formData.landmark}` : '',
      formData.city,
      formData.pincode
    ].filter(Boolean).join(', ');

    const updatedData = { ...formData, address: fullAddress };
    setFormData(updatedData);

    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        name: updatedData.name,
        phone: updatedData.phone,
        address: updatedData.address,
        houseNo: updatedData.houseNo,
        area: updatedData.area,
        landmark: updatedData.landmark,
        city: updatedData.city,
        pincode: updatedData.pincode,
        instructions: updatedData.instructions,
      });
      setHasSavedData(true);
      setIsEditingAddress(false);
      toast.success('Address saved successfully');
    } catch (error) {
      console.error("Failed to update user profile:", error);
      toast.error('Failed to save address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const placeOrder = async (paymentStatus: string, razorpayPaymentId?: string) => {
    try {
      if (isEditingAddress && formData.name && formData.phone && formData.houseNo && formData.city) {
        const fullAddress = [
          formData.houseNo,
          formData.area,
          formData.landmark ? `Near ${formData.landmark}` : '',
          formData.city,
          formData.pincode
        ].filter(Boolean).join(', ');
        
        formData.address = fullAddress || formData.address;

        try {
          await updateDoc(doc(db, 'users', user!.uid), {
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            houseNo: formData.houseNo,
            area: formData.area,
            landmark: formData.landmark,
            city: formData.city,
            pincode: formData.pincode,
            instructions: formData.instructions,
          });
          setHasSavedData(true);
          setIsEditingAddress(false);
        } catch (updateError) {
          console.error("Failed to update user profile before order:", updateError);
        }
      }

      const orderData = {
        userId: user!.uid,
        items: items.map(item => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        totalAmount: finalTotal,
        subTotal: total(),
        discount: discount,
        appliedCoupon: appliedCoupon ? {
           code: appliedCoupon.code,
           type: appliedCoupon.discountType,
           value: appliedCoupon.discountValue
        } : null,
        deliveryCharge: deliveryCharge,
        status: 'pending',
        paymentMethod: paymentMethod,
        paymentStatus: paymentStatus,
        razorpayPaymentId: razorpayPaymentId || null,
        customerDetails: {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          houseNo: formData.houseNo,
          area: formData.area,
          landmark: formData.landmark,
          city: formData.city,
          pincode: formData.pincode,
          instructions: formData.instructions,
        },
        createdAt: serverTimestamp(),
        statusTimestamps: {
          pending: serverTimestamp()
        }
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      // Delete cart tracking
      try {
        const nowIso = new Date().toISOString();
        await updateDoc(doc(db, 'carts', user!.uid), {
          status: 'ordered',
          orderedAt: nowIso,
          updatedAt: nowIso
        });

        // Also update cartItems to ordered
        const { getDocs, query, where } = await import('firebase/firestore');
        const activeItemsQuery = query(
          collection(db, 'cartItems'),
          where('userId', '==', user!.uid),
          where('status', '==', 'active')
        );
        const activeSnap = await getDocs(activeItemsQuery);
        activeSnap.docs.forEach(async (docSnap) => {
          await updateDoc(doc(db, 'cartItems', docSnap.id), {
            status: 'ordered',
            orderedAt: nowIso,
            updatedAt: nowIso
          });
        });

      } catch (e) {
        console.error("Failed to update cart tracking", e);
      }
      
      clearOrdersCache();
      toast.success('Order placed successfully!');
      clearCart();
      navigate('/profile');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login', { state: { from: { pathname: '/checkout' } } });
      return;
    }

    if (isEditingAddress) {
      toast.error('Please save your delivery address first');
      return;
    }

    if (paymentMethod === 'ONLINE' && !settings.onlinePayment) {
      toast.error('Online payment is currently disabled');
      return;
    }

    setIsSubmitting(true);
    
    if (paymentMethod === 'ONLINE') {
      const res = await loadRazorpayScript();
      
      if (!res) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        setIsSubmitting(false);
        return;
      }
      
      const options = {
        key: 'rzp_test_Sg4m4XT5gjMXQD',
        amount: Math.round(finalTotal * 100),
        currency: 'INR',
        name: settings.name || 'Restaurant',
        description: 'Order Payment',
        handler: async function (response: any) {
          await placeOrder('Successfully', response.razorpay_payment_id);
        },
        prefill: {
          name: formData.name,
          email: user?.email || '',
          contact: formData.phone
        },
        theme: {
          color: '#ea580c'
        },
        modal: {
          ondismiss: function() {
            setIsSubmitting(false);
            toast.error('Payment cancelled');
          }
        }
      };
      
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setIsSubmitting(false);
        toast.error(response.error.description || 'Payment failed');
      });
      rzp.open();
    } else {
      await placeOrder('Pending');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8 flex items-center">
          <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 mr-3 text-primary-500 hidden sm:block" />
          Checkout
        </h1>
        
        <form id="checkout-form" onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
          
          {/* Card 1: Delivery Address */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden transition-all">
            <div className="p-5 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center">
                  <MapPin className="w-5 h-5 mr-2.5 text-primary-500" />
                  Delivery Details
                </h2>
                {!isEditingAddress && hasSavedData && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(true)}
                    className="text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </button>
                )}
              </div>
              
              {!isEditingAddress && hasSavedData ? (
                <div className="bg-orange-50/50 p-4 md:p-5 rounded-xl border border-orange-100/60 transition-all animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex gap-4 items-start">
                    <div className="mt-1 bg-white p-2 rounded-full shadow-sm border border-orange-100">
                      <Home className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{formData.name}</p>
                      <p className="text-gray-800 font-medium mt-1">{formData.phone}</p>
                      <p className="text-gray-600 text-sm mt-3 leading-relaxed">
                        {formData.address}
                      </p>
                      {formData.instructions && (
                        <p className="text-gray-500 text-xs mt-3 bg-white inline-block px-2.5 py-1.5 rounded-md border border-gray-100 shadow-sm">
                          <span className="font-semibold text-gray-700">Note:</span> {formData.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-gray-900 placeholder:font-normal"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        minLength={10}
                        maxLength={15}
                        placeholder="9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium text-gray-900 placeholder:font-normal"
                      />
                    </div>
                  </div>
                  
                  <div className="w-full h-px bg-gray-100 my-4 md:my-6"></div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">House / Flat / Floor No. *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Flat 4B, 2nd Floor"
                        value={formData.houseNo}
                        onChange={(e) => setFormData({...formData, houseNo: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Area / Locality *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. MG Road, Civil Lines"
                        value={formData.area}
                        onChange={(e) => setFormData({...formData, area: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Near Apollo Hospital"
                      value={formData.landmark}
                      onChange={(e) => setFormData({...formData, landmark: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Mumbai"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pincode *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 400001"
                        value={formData.pincode}
                        onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Delivery Instructions (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Ring the doorbell, leave at the door..."
                      value={formData.instructions}
                      onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-gray-900 resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-3">
                    <button
                      type="button"
                      onClick={handleSaveAddress}
                      disabled={isSavingAddress}
                      className="flex-[2] bg-gray-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isSavingAddress ? 'Saving...' : 'Save Address'}
                    </button>
                    {hasSavedData && (
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="flex-[1] bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-bold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Order Summary */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
            <div className="p-5 md:p-7 bg-gray-50/50 border-b border-gray-100">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Order Summary</h2>
            </div>
            <div className="p-5 md:p-7">
              <ul className="-my-3 divide-y divide-gray-100">
                {items.map((item) => (
                  <li key={item.id} className="py-3 flex justify-between items-center group">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded bg-orange-100 text-primary-700 flex items-center justify-center text-xs font-bold mr-3 border border-orange-200">
                        {item.quantity}x
                      </div>
                      <p className="text-[15px] font-semibold text-gray-900">{item.name}</p>
                    </div>
                    <p className="text-[15px] font-bold text-gray-900">₹{item.price * item.quantity}</p>
                  </li>
                ))}
              </ul>
              
              <div className="pt-6 mt-6 border-t border-gray-100 space-y-4">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl border-dashed">
                    <div className="flex items-center space-x-3 text-emerald-800">
                      <TicketPercent className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-bold">{appliedCoupon.code}</p>
                        <p className="text-xs text-emerald-600 font-medium">Coupon applied successfully</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode('');
                        setDiscount(0);
                        toast.success('Coupon removed');
                      }}
                      className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 p-1.5 rounded-full transition-colors"
                      title="Remove coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200/60 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
                    <input
                      type="text"
                      placeholder="Have a coupon code?"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 bg-transparent border-none py-2 px-3 focus:outline-none text-sm font-medium uppercase placeholder:normal-case placeholder:font-normal placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCouponClick}
                      className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-gray-900 hover:bg-black transition-colors shadow-sm"
                    >
                      Apply
                    </button>
                  </div>
                )}
                
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between text-sm text-gray-600 font-medium">
                    <p>Subtotal</p>
                    <p className="text-gray-900">₹{total()}</p>
                  </div>
                  {deliveryCharge > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 font-medium">
                      <p>Delivery Charge</p>
                      <p className="text-gray-900">₹{deliveryCharge.toFixed(2)}</p>
                    </div>
                  )}
                  {appliedCoupon?.discountType === 'free_item' && (
                    <div className="flex justify-between text-sm text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg">
                      <p>Free Item applied</p>
                      <p>{appliedCoupon.discountValue}</p>
                    </div>
                  )}
                  {appliedCoupon?.discountType === 'free_delivery' && (
                    <div className="flex justify-between text-sm text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg">
                      <p>Free Delivery applied</p>
                      <p>-₹{settings.deliveryCharge}</p>
                    </div>
                  )}
                  {discount > 0 && appliedCoupon?.discountType !== 'free_delivery' && appliedCoupon?.discountType !== 'free_item' && (
                    <div className="flex justify-between text-sm text-emerald-600 font-bold bg-emerald-50 px-3 py-2 rounded-lg">
                      <p>Discount applied</p>
                      <p>-₹{discount.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {settings.freeDeliveryMin > 0 && settings.deliveryCharge > 0 && appliedCoupon?.discountType !== 'free_delivery' && (
                  <div className={`mt-4 p-3.5 rounded-xl text-sm font-bold text-center border transition-colors ${total() < settings.freeDeliveryMin ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                    {total() < settings.freeDeliveryMin ? (
                      <>Add ₹{(settings.freeDeliveryMin - total()).toFixed(2)} more to get FREE delivery</>
                    ) : (
                      <>🎉 Your delivery is totally FREE!</>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-5 border-t border-gray-100">
                  <p className="text-gray-500 font-medium text-sm">Amount to Pay</p>
                  <p className="text-2xl font-black text-primary-600">₹{finalTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Payment Section */}
          <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
            <div className="p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-5">Pay With</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {settings.onlinePayment && (
                  <label className={`relative border-2 rounded-2xl p-4 sm:p-5 cursor-pointer flex items-center transition-all duration-300 ${
                    paymentMethod === 'ONLINE' ? 'border-primary-500 bg-gradient-to-br from-orange-50/80 to-white shadow-[0_8px_20px_-6px_rgba(234,88,12,0.15)] -translate-y-1 scale-[1.02] ring-1 ring-primary-500/20' : 'border-gray-200 hover:border-primary-200 bg-white hover:-translate-y-0.5 hover:shadow-md'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="ONLINE" 
                      checked={paymentMethod === 'ONLINE'}
                      onChange={() => setPaymentMethod('ONLINE')}
                      className="sr-only"
                    />
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 shadow-inner transition-all duration-500 ${
                      paymentMethod === 'ONLINE' ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-[0_4px_12px_rgba(234,88,12,0.3)] scale-110 rotate-3' : 'bg-gray-50 text-gray-400 border border-gray-100'
                    }`}>
                      <CreditCard className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-[16px] font-extrabold tracking-tight transition-colors ${paymentMethod === 'ONLINE' ? 'text-gray-900' : 'text-gray-700'}`}>Online Payment</p>
                      <p className="text-[12px] font-medium text-gray-500 mt-0.5 line-clamp-1">Cards, UPI & Wallets</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-[2.5px] flex items-center justify-center transition-colors shadow-sm ${paymentMethod === 'ONLINE' ? 'border-primary-500 bg-white' : 'border-gray-300'}`}>
                      {paymentMethod === 'ONLINE' && <div className="w-3 h-3 bg-primary-500 rounded-full animate-in zoom-in duration-200" />}
                    </div>
                  </label>
                )}

                {settings.cashOnDelivery && (
                  <label className={`relative border-2 rounded-2xl p-4 sm:p-5 cursor-pointer flex items-center transition-all duration-300 ${
                    paymentMethod === 'COD' ? 'border-emerald-500 bg-gradient-to-br from-emerald-50/80 to-white shadow-[0_8px_20px_-6px_rgba(16,185,129,0.15)] -translate-y-1 scale-[1.02] ring-1 ring-emerald-500/20' : 'border-gray-200 hover:border-emerald-200 bg-white hover:-translate-y-0.5 hover:shadow-md'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment_method" 
                      value="COD" 
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="sr-only"
                    />
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 shadow-inner transition-all duration-500 ${
                      paymentMethod === 'COD' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] scale-110 -rotate-3' : 'bg-gray-50 text-gray-400 border border-gray-100'
                    }`}>
                      <Banknote className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-[16px] font-extrabold tracking-tight transition-colors ${paymentMethod === 'COD' ? 'text-gray-900' : 'text-gray-700'}`}>Cash on Delivery</p>
                      <p className="text-[12px] font-medium text-gray-500 mt-0.5 line-clamp-1">Pay when order arrives</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-[2.5px] flex items-center justify-center transition-colors shadow-sm ${paymentMethod === 'COD' ? 'border-emerald-500 bg-white' : 'border-gray-300'}`}>
                      {paymentMethod === 'COD' && <div className="w-3 h-3 bg-emerald-500 rounded-full animate-in zoom-in duration-200" />}
                    </div>
                  </label>
                )}
                
                {!settings.cashOnDelivery && !settings.onlinePayment && (
                  <div className="col-span-1 sm:col-span-2 p-5 bg-amber-50 rounded-xl border border-amber-200 flex items-center">
                    <div className="text-amber-800 text-sm font-medium">
                      Payment methods are currently unavailable. Please contact support.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Bottom Action for Mobile, Standard for Desktop */}
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 md:static md:p-0 md:pt-8 bg-white md:bg-transparent border-t border-gray-100 md:border-t-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] md:shadow-none z-50">
          <button
            type="submit"
            form="checkout-form"
            disabled={isSubmitting || isEditingAddress || (!settings.cashOnDelivery && !settings.onlinePayment)}
            className="w-full bg-gradient-to-r from-[#FF7A00] to-[#FF3D00] text-white font-extrabold h-[56px] md:h-[64px] rounded-full shadow-[0_8px_20px_rgba(255,120,0,0.4)] hover:shadow-[0_14px_30px_rgba(255,120,0,0.5)] flex items-center justify-center px-6 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] active:translate-y-1 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group relative overflow-hidden"
          >
            {/* Shine effect */}
            <div className="absolute top-0 -left-[100%] h-full w-[120%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:left-[100%] transition-all duration-1000 ease-out z-0"></div>

            {isSubmitting ? (
              <span className="flex items-center text-lg md:text-xl tracking-wide relative z-10">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 md:h-6 md:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Placing Order...
              </span>
            ) : (
              <span className="flex items-center justify-center text-[18px] md:text-[20px] tracking-wide relative z-10 w-full drop-shadow-md pb-[1px]">
                Place Order <span className="mx-2 md:mx-3 opacity-60 font-medium">•</span> ₹{finalTotal.toFixed(2)}
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 ml-2 md:ml-3 opacity-80 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300" strokeWidth={2.5} />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
