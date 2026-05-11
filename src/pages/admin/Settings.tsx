import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { db, auth } from '../../firebase';
import { 
  Save, Phone, MapPin, Clock, MessageCircle, 
  Store, Mail, Map, CreditCard, Truck, Tag, Bell,
  Shield, Image as ImageIcon, Key, Edit2, X, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';
import { DEFAULT_SETTINGS, RestaurantSettings } from '../../hooks/useSettings';

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS);

  const currentUser = auth.currentUser;

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const docRef = doc(db, 'settings', 'restaurant');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as RestaurantSettings;
        setSettings(data);
        setDraftSettings(data);
      }
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Updated successfully');
    } catch (e) {
      toast.error('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchSettings = async () => {
    if (!settings.name) {
      setLoading(true);
    }

    try {
      const docRef = doc(db, 'settings', 'restaurant');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as RestaurantSettings;
        setSettings(prev => ({...prev, ...data}));
        setDraftSettings(prev => ({...prev, ...data}));
      } else {
        await setDoc(docRef, DEFAULT_SETTINGS);
        setSettings(DEFAULT_SETTINGS);
        setDraftSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleEdit = (section: string) => {
    if (editingSection && editingSection !== section) {
      toast.error("Please save or cancel the current section first.");
      return;
    }
    setDraftSettings(settings);
    setEditingSection(section);
  };

  const handleCancel = () => {
    setDraftSettings(settings);
    setEditingSection(null);
  };

  const handleSave = async (sectionId: string) => {
    // Validation
    if (sectionId === 'info' && (!draftSettings.name.trim())) {
      toast.error('Restaurant name is required');
      return;
    }
    if (sectionId === 'contact' && (!draftSettings.phone.trim())) {
      toast.error('Phone number is required');
      return;
    }
    if (sectionId === 'location' && (!draftSettings.address.trim())) {
      toast.error('Address is required');
      return;
    }

    setSavingSection(sectionId);
    try {
      const fieldsToUpdate: Partial<RestaurantSettings> = {};
      
      switch (sectionId) {
        case 'info':
          fieldsToUpdate.name = draftSettings.name;
          fieldsToUpdate.description = draftSettings.description;
          break;
        case 'contact':
          fieldsToUpdate.phone = draftSettings.phone;
          fieldsToUpdate.whatsapp = draftSettings.whatsapp;
          fieldsToUpdate.email = draftSettings.email;
          break;
        case 'about':
          fieldsToUpdate.aboutText = draftSettings.aboutText || '';
          fieldsToUpdate.yearsExperience = draftSettings.yearsExperience || '';
          break;
        case 'location':
          fieldsToUpdate.address = draftSettings.address;
          fieldsToUpdate.googleMapsLink = draftSettings.googleMapsLink;
          break;
        case 'hours':
          fieldsToUpdate.openingTime = draftSettings.openingTime;
          fieldsToUpdate.closingTime = draftSettings.closingTime;
          fieldsToUpdate.isOpen = draftSettings.isOpen;
          break;
        case 'payment':
          fieldsToUpdate.cashOnDelivery = draftSettings.cashOnDelivery;
          fieldsToUpdate.onlinePayment = draftSettings.onlinePayment;
          break;
        case 'delivery':
          fieldsToUpdate.deliveryCharge = draftSettings.deliveryCharge;
          fieldsToUpdate.freeDeliveryMin = draftSettings.freeDeliveryMin;
          break;
        case 'offers':
          fieldsToUpdate.couponsEnabled = draftSettings.couponsEnabled;
          break;
        case 'notifications':
          fieldsToUpdate.orderAlerts = draftSettings.orderAlerts;
          fieldsToUpdate.notificationsEnabled = draftSettings.notificationsEnabled;
          break;
      }

      await setDoc(doc(db, 'settings', 'restaurant'), fieldsToUpdate, { merge: true });
      
      setSettings(prev => ({ ...prev, ...fieldsToUpdate }));
      setEditingSection(null);
      toast.success('Section saved successfully');
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSavingSection(null);
    }
  };

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [oldDashPassword, setOldDashPassword] = useState('');
  const [newDashPassword, setNewDashPassword] = useState('');
  const [isChangingDashPassword, setIsChangingDashPassword] = useState(false);

  const handleDashboardPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldDashPassword || !newDashPassword) {
      toast.error('Please enter both current and new password');
      return;
    }

    setIsChangingDashPassword(true);
    try {
      const adminDoc = await getDoc(doc(db, 'settings', 'admin'));
      let actualPassword = '12345678';
      if (adminDoc.exists() && adminDoc.data().dashboardPassword) {
        actualPassword = adminDoc.data().dashboardPassword;
      }

      if (oldDashPassword !== actualPassword) {
        toast.error('Incorrect current password');
        return;
      }

      await setDoc(doc(db, 'settings', 'admin'), { dashboardPassword: newDashPassword }, { merge: true });
      toast.success('Dashboard password updated successfully');
      setOldDashPassword('');
      setNewDashPassword('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to change password');
    } finally {
      setIsChangingDashPassword(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('New password must be different from current');
      return;
    }

    setIsChangingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        toast.error('Current password incorrect');
      } else {
        toast.error(error.message || 'Failed to change password');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const renderSectionHeader = (id: string, title: string, icon: React.ReactNode) => {
    const isEditing = editingSection === id;
    const isSaving = savingSection === id;
    const isDisabled = editingSection !== null && !isEditing;

    return (
      <div className="flex justify-between items-center mb-4 border-b pb-3">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          {icon}
          {title}
        </h3>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-1" /> Cancel
              </button>
              <button
                onClick={() => handleSave(id)}
                disabled={isSaving}
                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => handleEdit(id)}
              disabled={isDisabled}
              className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none disabled:opacity-40 transition-colors"
            >
              <Edit2 className="w-4 h-4 mr-1" /> Edit
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Restaurant Settings</h2>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing || editingSection !== null}
          className="flex items-center text-sm px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-6">
        {/* A. Restaurant Info */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'info' ? 'opacity-60' : ''}`}>
          {renderSectionHeader('info', 'Restaurant Info', <Store className="w-5 h-5 mr-2 text-primary-500" />)}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name *</label>
              <input
                type="text"
                disabled={editingSection !== 'info'}
                value={editingSection === 'info' ? draftSettings.name : settings.name}
                onChange={(e) => setDraftSettings({...draftSettings, name: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                disabled={editingSection !== 'info'}
                value={editingSection === 'info' ? draftSettings.description : settings.description}
                onChange={(e) => setDraftSettings({...draftSettings, description: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* About Page Content */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'about' ? 'opacity-60' : ''}`}>
          {renderSectionHeader('about', 'About Page Content', <Store className="w-5 h-5 mr-2 text-primary-500" />)}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">About Text</label>
              <textarea
                rows={4}
                disabled={editingSection !== 'about'}
                value={editingSection === 'about' ? (draftSettings.aboutText || '') : (settings.aboutText || '')}
                onChange={(e) => setDraftSettings({...draftSettings, aboutText: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
              <input
                type="text"
                disabled={editingSection !== 'about'}
                value={editingSection === 'about' ? (draftSettings.yearsExperience || '') : (settings.yearsExperience || '')}
                onChange={(e) => setDraftSettings({...draftSettings, yearsExperience: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* B. Contact */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'contact' ? 'opacity-60' : ''}`}>
          {renderSectionHeader('contact', 'Contact', <Phone className="w-5 h-5 mr-2 text-primary-500" />)}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                <Phone className="w-4 h-4 mr-2" /> Phone Number *
              </label>
              <input
                type="text"
                disabled={editingSection !== 'contact'}
                value={editingSection === 'contact' ? draftSettings.phone : settings.phone}
                onChange={(e) => setDraftSettings({...draftSettings, phone: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp Number
              </label>
              <input
                type="text"
                disabled={editingSection !== 'contact'}
                value={editingSection === 'contact' ? draftSettings.whatsapp : settings.whatsapp}
                onChange={(e) => setDraftSettings({...draftSettings, whatsapp: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                <Mail className="w-4 h-4 mr-2" /> Email
              </label>
              <input
                type="email"
                disabled={editingSection !== 'contact'}
                value={editingSection === 'contact' ? draftSettings.email : settings.email}
                onChange={(e) => setDraftSettings({...draftSettings, email: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* C. Location */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'location' ? 'opacity-60' : ''}`}>
          {renderSectionHeader('location', 'Location', <MapPin className="w-5 h-5 mr-2 text-primary-500" />)}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Address *</label>
              <textarea
                rows={2}
                disabled={editingSection !== 'location'}
                value={editingSection === 'location' ? draftSettings.address : settings.address}
                onChange={(e) => setDraftSettings({...draftSettings, address: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                <Map className="w-4 h-4 mr-2" /> Google Maps Link
              </label>
              <input
                type="text"
                disabled={editingSection !== 'location'}
                value={editingSection === 'location' ? draftSettings.googleMapsLink : settings.googleMapsLink}
                onChange={(e) => setDraftSettings({...draftSettings, googleMapsLink: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* D. Business Hours */}
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'hours' ? 'opacity-60' : ''}`}>
          {renderSectionHeader('hours', 'Business Hours', <Clock className="w-5 h-5 mr-2 text-primary-500" />)}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
              <input
                type="time"
                disabled={editingSection !== 'hours'}
                value={editingSection === 'hours' ? draftSettings.openingTime : settings.openingTime}
                onChange={(e) => setDraftSettings({...draftSettings, openingTime: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
              <input
                type="time"
                disabled={editingSection !== 'hours'}
                value={editingSection === 'hours' ? draftSettings.closingTime : settings.closingTime}
                onChange={(e) => setDraftSettings({...draftSettings, closingTime: e.target.value})}
                className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                id="isOpen"
                disabled={editingSection !== 'hours'}
                checked={editingSection === 'hours' ? draftSettings.isOpen : settings.isOpen}
                onChange={(e) => setDraftSettings({...draftSettings, isOpen: e.target.checked})}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
              />
              <label htmlFor="isOpen" className="ml-2 block text-sm font-medium text-gray-900">
                Restaurant is Open (Accepting Orders)
              </label>
            </div>
          </div>
        </div>

        {/* E. Payment & F. Delivery */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'payment' ? 'opacity-60' : ''}`}>
            {renderSectionHeader('payment', 'Payment Settings', <CreditCard className="w-5 h-5 mr-2 text-primary-500" />)}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Cash on Delivery</span>
                <label className={`relative inline-flex items-center ${editingSection === 'payment' ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}>
                  <input type="checkbox" className="sr-only peer" disabled={editingSection !== 'payment'} checked={editingSection === 'payment' ? draftSettings.cashOnDelivery : settings.cashOnDelivery} onChange={(e) => setDraftSettings({...draftSettings, cashOnDelivery: e.target.checked})} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Online Payment</span>
                <label className={`relative inline-flex items-center ${editingSection === 'payment' ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}>
                  <input type="checkbox" className="sr-only peer" disabled={editingSection !== 'payment'} checked={editingSection === 'payment' ? draftSettings.onlinePayment : settings.onlinePayment} onChange={(e) => setDraftSettings({...draftSettings, onlinePayment: e.target.checked})} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'delivery' ? 'opacity-60' : ''}`}>
            {renderSectionHeader('delivery', 'Delivery Settings', <Truck className="w-5 h-5 mr-2 text-primary-500" />)}
            <div className="space-y-4">
              <div className="flex justify-between items-center gap-4">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Delivery Charge (₹)</label>
                <input disabled={editingSection !== 'delivery'} type="number" min="0" value={editingSection === 'delivery' ? draftSettings.deliveryCharge : settings.deliveryCharge} onChange={(e) => setDraftSettings({...draftSettings, deliveryCharge: Number(e.target.value)})} className="block w-24 border border-gray-300 rounded-md py-1 px-3 text-right sm:text-sm disabled:bg-gray-50" />
              </div>
              <div className="flex justify-between items-center gap-4">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Free Delivery Min. Order (₹)</label>
                <input disabled={editingSection !== 'delivery'} type="number" min="0" value={editingSection === 'delivery' ? draftSettings.freeDeliveryMin : settings.freeDeliveryMin} onChange={(e) => setDraftSettings({...draftSettings, freeDeliveryMin: Number(e.target.value)})} className="block w-24 border border-gray-300 rounded-md py-1 px-3 text-right sm:text-sm disabled:bg-gray-50" />
              </div>
            </div>
          </div>
        </div>

        {/* G. Offers & H. Notifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'offers' ? 'opacity-60' : ''}`}>
            {renderSectionHeader('offers', 'Offers', <Tag className="w-5 h-5 mr-2 text-primary-500" />)}
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm font-medium text-gray-700">Enable Coupons</span>
              <label className={`relative inline-flex items-center ${editingSection === 'offers' ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}>
                <input type="checkbox" disabled={editingSection !== 'offers'} className="sr-only peer" checked={editingSection === 'offers' ? draftSettings.couponsEnabled : settings.couponsEnabled} onChange={(e) => setDraftSettings({...draftSettings, couponsEnabled: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-opacity ${editingSection !== null && editingSection !== 'notifications' ? 'opacity-60' : ''}`}>
            {renderSectionHeader('notifications', 'Notifications', <Bell className="w-5 h-5 mr-2 text-primary-500" />)}
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Order Alerts</span>
                <label className={`relative inline-flex items-center ${editingSection === 'notifications' ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}>
                  <input type="checkbox" disabled={editingSection !== 'notifications'} className="sr-only peer" checked={editingSection === 'notifications' ? draftSettings.orderAlerts : settings.orderAlerts} onChange={(e) => setDraftSettings({...draftSettings, orderAlerts: e.target.checked})} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Cart Notifications</span>
                <label className={`relative inline-flex items-center ${editingSection === 'notifications' ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}>
                  <input type="checkbox" disabled={editingSection !== 'notifications'} className="sr-only peer" checked={editingSection === 'notifications' ? draftSettings.notificationsEnabled : settings.notificationsEnabled} onChange={(e) => setDraftSettings({...draftSettings, notificationsEnabled: e.target.checked})} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* I. Security (Not editable through standard mechanism) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-3 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-primary-500" />
            Security Settings
          </h3>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Account Email</label>
            <input
              type="text"
              readOnly
              value={currentUser?.email || ''}
              className="block w-full max-w-md bg-gray-50 border border-gray-300 text-gray-500 rounded-md py-2 px-3 sm:text-sm cursor-not-allowed"
            />
          </div>
          
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <Key className="w-4 h-4 mr-2 text-primary-500" />
                Change Password
              </h4>
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                {showPassword ? <><EyeOff className="w-4 h-4 mr-1" /> Hide</> : <><Eye className="w-4 h-4 mr-1" /> Show</>}
              </button>
            </div>
            <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="At least 8 characters"
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Type new password again"
                  minLength={8}
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isChangingPassword ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

          <div className="border-t mt-6 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Key className="w-4 h-4 mr-2 text-primary-500" />
              Dashboard Reset Password
            </h4>
            <p className="text-sm text-gray-500 mb-4">This secondary password is required when resetting the dashboard analytics overview tallies back to zero. By default, it is '12345678'.</p>
            <form onSubmit={handleDashboardPasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Old Password *</label>
                <input
                  type="password"
                  value={oldDashPassword}
                  onChange={(e) => setOldDashPassword(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter current..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input
                  type="password"
                  value={newDashPassword}
                  onChange={(e) => setNewDashPassword(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter new..."
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isChangingDashPassword}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {isChangingDashPassword ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
