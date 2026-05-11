import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { Ticket, Plus, Trash2, X, RefreshCw, Edit2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';

export function CouponManagement() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    imageUrl: '',
    discountType: 'percentage', // percentage, flat, free_item, free_delivery
    discountValue: '',
    minOrderValue: '',
    expiryDate: '',
    active: true,
    displayOrder: 0
  });

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'coupons'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      items.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setCoupons(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching coupons:", error);
      toast.error("Failed to load coupons");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    // With onSnapshot, refresh isn't strictly necessary for data, but can be kept for UI feedback
    if (isRefreshing) return;
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Updated successfully');
    }, 500);
  };

  const handleEdit = (coupon: any) => {
    setEditingId(coupon.id);
    setFormData({
      title: coupon.title || '',
      code: coupon.code || '',
      description: coupon.description || '',
      imageUrl: coupon.imageUrl || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue?.toString() || '',
      minOrderValue: coupon.minOrderValue?.toString() || '',
      expiryDate: coupon.expiryDate || '',
      active: coupon.active ?? true,
      displayOrder: coupon.displayOrder || 0
    });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({
      title: '',
      code: '',
      description: '',
      imageUrl: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderValue: '',
      expiryDate: '',
      active: true,
      displayOrder: coupons.length
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const couponData = {
        title: formData.title,
        code: formData.code.toUpperCase(),
        description: formData.description,
        imageUrl: formData.imageUrl,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        minOrderValue: parseFloat(formData.minOrderValue) || 0,
        expiryDate: formData.expiryDate,
        active: formData.active,
        displayOrder: Number(formData.displayOrder) || 0,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'coupons', editingId), couponData);
        toast.success('Coupon updated successfully');
      } else {
        await addDoc(collection(db, 'coupons'), {
          ...couponData,
          createdAt: new Date().toISOString()
        });
        toast.success('Coupon added successfully');
      }
      
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error("Failed to save coupon");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'coupons', id), {
        active: !currentStatus,
        updatedAt: new Date().toISOString()
      });
      setCoupons(coupons.map(c => c.id === id ? { ...c, active: !currentStatus } : c));
      toast.success(`Coupon ${!currentStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'coupons', itemToDelete));
      toast.success('Coupon deleted');
      setCoupons(coupons.filter((c) => c.id !== itemToDelete));
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Delete failed");
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const openDeleteModal = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
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
        <h2 className="text-2xl font-bold text-gray-900">Coupon Offers Management</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={async () => {
              try {
                const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
                const expiry = new Date();
                expiry.setMonth(expiry.getMonth() + 1);
                await addDoc(collection(db, 'coupons'), {
                  title: 'WELCOME 50% OFF',
                  code: 'WELCOME50',
                  description: 'Get Flat ₹50 OFF on your first order. Use code at checkout.',
                  imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
                  discountType: 'flat',
                  discountValue: 50,
                  minOrderValue: 200,
                  expiryDate: expiry.toISOString().split('T')[0],
                  active: true,
                  displayOrder: 0,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                });
                toast.success('Sample Coupon Added!');
              } catch (e: any) {
                toast.error('Failed to add coupon.');
              }
            }}
            className="flex items-center text-sm px-4 py-2 bg-green-600 text-white border border-green-600 rounded-md shadow-sm hover:bg-green-700 font-bold transition-colors shrink-0"
          >
            Create Test Coupon
          </button>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center text-sm px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Offer
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Banner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title/Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coupons.map((coupon) => {
                const isExpired = new Date(coupon.expiryDate) < new Date();
                return (
                  <tr key={coupon.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {coupon.imageUrl ? (
                        <img src={coupon.imageUrl} alt={coupon.title} className="h-10 w-16 object-cover rounded shadow-sm" />
                      ) : (
                        <div className="h-10 w-16 bg-gray-100 flex items-center justify-center rounded shadow-sm">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{coupon.title || 'Untitled Offer'}</span>
                        <div className="flex items-center mt-1">
                          <Ticket className="w-3 h-3 text-primary-500 mr-1" />
                          <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{coupon.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium whitespace-pre-wrap">
                      {coupon.discountType === 'percentage' && `${coupon.discountValue}% OFF`}
                      {coupon.discountType === 'flat' && `₹${coupon.discountValue} OFF`}
                      {coupon.discountType === 'free_item' && `Free Item`}
                      {coupon.discountType === 'free_delivery' && `Free Delivery`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{coupon.minOrderValue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex flex-col gap-1 items-start">
                      <button 
                        onClick={() => toggleStatus(coupon.id, coupon.active)}
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer transition-colors ${
                        coupon.active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}>
                        {coupon.active ? 'Active' : 'Disabled'}
                      </button>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        isExpired ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {isExpired ? 'Expired' : new Date(coupon.expiryDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="p-1.5 text-blue-600 hover:text-blue-900 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(coupon.id)}
                          className="p-1.5 text-red-600 hover:text-red-900 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No active offers or coupons found. Add one to show on the website.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto pointer-events-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity pointer-events-auto" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>

          <div className="relative bg-white rounded-xl text-left shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto z-10 flex flex-col">
            <div className="px-4 py-4 sm:px-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-20">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Offer' : 'Add New Offer'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1 rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="px-4 py-5 sm:p-6 flex-1">
                <form id="couponForm" onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Offer Title</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        placeholder="e.g., Weekend Special, 50% Off First Order"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Coupon Code</label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm uppercase font-mono"
                        placeholder="e.g., WELCOME50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Display Order</label>
                      <input
                        type="number"
                        value={formData.displayOrder}
                        onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        placeholder="0, 1, 2..."
                      />
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Banner Image URL</label>
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        placeholder="https://..."
                      />
                      <p className="mt-1 text-xs text-gray-500">Leave blank for default brand gradient banner.</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Short Description</label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                        placeholder="e.g., Valid on all orders above ₹299..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Type</label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({...formData, discountType: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat Amount (₹)</option>
                        <option value="free_item">Free Item</option>
                        <option value="free_delivery">Free Delivery</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Discount Value 
                        {formData.discountType === 'percentage' && ' (%)'}
                        {formData.discountType === 'flat' && ' (₹)'}
                        {formData.discountType === 'free_item' && ' (Item Name)'}
                      </label>
                      {formData.discountType === 'free_item' ? (
                        <input
                          type="text"
                          required
                          value={formData.discountValue}
                          onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          placeholder="e.g., Chicken Fry"
                        />
                      ) : formData.discountType === 'free_delivery' ? (
                         <input
                          type="text"
                          disabled
                          value="Free Delivery"
                          className="w-full bg-gray-100/50 text-gray-500 border border-gray-200 rounded-lg shadow-sm py-2 px-3 sm:text-sm cursor-not-allowed"
                        />
                      ) : (
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={formData.discountValue}
                          onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                          className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                          placeholder="e.g., 50"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Min Order Value (₹)</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.minOrderValue}
                        onChange={(e) => setFormData({...formData, minOrderValue: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        required
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      />
                    </div>
                    
                    <div className="sm:col-span-2 pt-2">
                       <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={(e) => setFormData({...formData, active: e.target.checked})}
                          className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-900">Active (Visible on website)</span>
                      </label>
                    </div>
                  </div>
                </form>
              </div>
              <div className="px-4 py-4 sm:px-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="couponForm"
                  className="px-6 py-2.5 bg-primary-600 border border-transparent rounded-lg text-sm font-bold text-white hover:bg-primary-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                   {editingId ? 'Save Changes' : 'Create Offer'}
                </button>
              </div>
            </div>
        </div>
      )}

      <DeleteConfirmationModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Offer"
        message="Are you sure you want to delete this offer? This cannot be undone."
        isDeleting={isDeleting}
      />
    </div>
  );
}
