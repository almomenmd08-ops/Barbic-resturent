import React, { useState, useEffect, useRef } from 'react';
import { collection, query, addDoc, updateDoc, deleteDoc, doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { Plus, Edit2, Trash2, Image as ImageIcon, X, RefreshCw, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { getConsistentRandoms } from '../../utils/ratingUtils';
import { menuData as initialMenuData } from '../../data/menuData';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import imageCompression from 'browser-image-compression';

export function MenuManagement() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadProgress(0);
      const options = {
        maxSizeMB: 0.15, // Highly compress for fast loading
        maxWidthOrHeight: 800,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      const filename = `menu_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `menu/${filename}`);
      
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error('Upload failed:', error);
          toast.error('Image upload failed');
          setUploadProgress(-1);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData(prev => ({ ...prev, image: downloadURL }));
          setUploadProgress(-1);
          toast.success('Image compressed and uploaded seamlessly!');
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      );
    } catch (error) {
      console.error('Compression failed:', error);
      toast.error('Image processing failed');
      setUploadProgress(-1);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    type: 'veg',
    image: '',
    rating: '',
    reviewCount: ''
  });

  useEffect(() => {
    const url = formData.image.trim();
    if (!url) return;
    
    const isDirectImage = /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url);
    if (!isDirectImage && (url.includes('ibb.co') || url.includes('imgbb.com'))) {
      const extractImage = async () => {
        setIsExtracting(true);
        try {
          const response = await fetch('/api/extract-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          const data = await response.json();
          if (data.imageUrl) {
            setFormData(prev => ({ ...prev, image: data.imageUrl }));
            toast.success('Extracted direct image link successfully');
          } else {
            toast.error("Could not extract image. Try another link.");
          }
        } catch (error) {
          toast.error("Could not extract image. Try another link.");
        } finally {
          setIsExtracting(false);
        }
      };
      
      const timer = setTimeout(extractImage, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.image]);

  const seedDatabase = async () => {
    setIsSeeding(true);
    const toastId = toast.loading('Seeding menu data...');
    try {
      for (const item of initialMenuData) {
        const { id, ...itemData } = item;
        await setDoc(doc(db, 'menu', id), {
          ...itemData,
          isActive: true
        });
      }
      toast.success('Menu data seeded successfully!', { id: toastId });
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed menu data', { id: toastId });
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'menu'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched admin menu items:", items);
      
      // Auto-seed if empty
      if (snapshot.empty && !isSeeding && items.length === 0) {
        seedDatabase();
      }

      setMenuItems(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching menu:", error);
      toast.error("Failed to load menu items");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSeeding, refreshKey]);

  const handleOpenModal = (item?: any, prefillCategory?: string) => {
    if (item) {
      setEditingItem(item);
      const randoms = getConsistentRandoms(item.id);
      setFormData({
        name: item.name || '',
        price: item.price ? item.price.toString() : '0',
        category: item.category || '',
        type: item.type || 'veg',
        image: item.imageUrl || item.image || '',
        rating: (item.rating !== undefined && item.rating !== null && item.rating !== '') ? item.rating.toString() : randoms.rating,
        reviewCount: (item.reviewCount !== undefined && item.reviewCount !== null && item.reviewCount !== '') ? item.reviewCount.toString() : randoms.count.toString()
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        price: '',
        category: prefillCategory || '',
        type: 'veg',
        image: '',
        rating: '',
        reviewCount: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate image URL
      let finalImageUrl = formData.image ? formData.image.trim() : '';
      if (!finalImageUrl) {
        toast.error('Image URL is required');
        return;
      }
      if (finalImageUrl && !finalImageUrl.startsWith('http://') && !finalImageUrl.startsWith('https://')) {
        toast.error('Please enter a valid direct image link');
        return;
      }

      if (finalImageUrl) {
        const isExtValid = /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(finalImageUrl);
        if (!isExtValid) {
          // Additional validation via Image object
          const isValidImage = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = finalImageUrl;
          });
          if (!isValidImage) {
            toast.error('Please enter a valid direct image link');
            return;
          }
        }
      }

      let finalCategory = formData.category.trim();
      let finalName = formData.name.trim();

      if (!finalName) {
        toast.error('Name is required');
        return;
      }

      if (!finalCategory) {
        toast.error('Category is required');
        return;
      }
      
      if (finalImageUrl) {
        if (!finalImageUrl.includes('firebasestorage.googleapis.com') && !finalImageUrl.includes('ibb.co')) {
          try {
            const urlObj = new URL(finalImageUrl);
            urlObj.searchParams.set('v', Date.now().toString());
            finalImageUrl = urlObj.toString();
          } catch(e) {}
        }
      }

      const itemData: any = {
        name: finalName,
        type: formData.type,
        image: finalImageUrl,
        imageUrl: finalImageUrl,
        category: finalCategory,
        price: parseFloat(formData.price) || 0,
        isActive: true,
        updatedAt: new Date().toISOString()
      };

      if (formData.rating) {
        itemData.rating = parseFloat(formData.rating);
      } else {
        itemData.rating = deleteField(); // remove to allow fallback
      }

      if (formData.reviewCount) {
        itemData.reviewCount = parseInt(formData.reviewCount, 10);
      } else {
        itemData.reviewCount = deleteField(); // remove to allow fallback
      }

      if (editingItem) {
        await updateDoc(doc(db, 'menu', editingItem.id), itemData);
        toast.success('Menu item saved');
      } else {
        itemData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'menu'), itemData);
        toast.success('Menu item saved');
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Failed to save item");
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'menu', itemToDelete));
      toast.success('Menu item deleted');
      setMenuItems((prev) => prev.filter(i => i.id !== itemToDelete));
    } catch (error) {
      console.error("Error deleting menu item:", error);
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

  const categories = Array.from(new Set(menuItems.map(item => item.category)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center text-sm px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {menuItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 text-center py-16">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No menu items found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new menu item.</p>
          <div className="mt-6">
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Add Item
            </button>
          </div>
        </div>
      ) : (
        categories.map(category => (
          <div key={category as string} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">{category as string}</h3>
              <button
                onClick={() => handleOpenModal(null, category as string)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                title={`Add Item to ${category}`}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Add Item
              </button>
            </div>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {menuItems.filter(item => item.category === category).map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 flex-shrink-0">
                          {(item.imageUrl || item.image) ? (
                            <img 
                              className="w-12 h-auto aspect-[4/3] rounded-md object-cover object-center" 
                              src={(item.imageUrl || item.image).startsWith('http') ? (item.imageUrl || item.image) : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400"} 
                              alt="" 
                              onError={(e: any) => {
                                e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400";
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{item.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.type === 'veg' ? 'bg-green-100 text-green-800' : 
                        item.type === 'non-veg' ? 'bg-red-100 text-red-800' : 
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )))}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto pointer-events-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity pointer-events-auto" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>

          <div className="relative bg-white rounded-lg text-left shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto z-10 flex flex-col">
            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price (₹)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      >
                        <option value="veg">Veg</option>
                        <option value="non-veg">Non-Veg</option>
                        <option value="drink">Drink</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      list="category-suggestions"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="e.g., Starters, Main Course (type to create new)"
                    />
                    <datalist id="category-suggestions">
                      {categories.map((cat, index) => (
                        <option key={index} value={cat as string} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">Image URL or Upload</label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium bg-primary-50 px-2 py-1 rounded-md"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload File
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                      />
                    </div>
                    
                    {uploadProgress >= 0 ? (
                      <div className="mt-2 text-center p-4 border border-dashed rounded-md bg-gray-50 border-gray-300">
                        <div className="text-sm font-medium text-gray-500 mb-2">Compressing & Uploading ({Math.round(uploadProgress)}%)</div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-primary-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="url"
                        required
                        value={formData.image}
                        onChange={(e) => setFormData({...formData, image: e.target.value.trim()})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder="https://... or click Upload File"
                      />
                    )}
                    
                    {isExtracting && (
                      <p className="text-sm mt-2 text-primary-600 animate-pulse">Extracting image URL...</p>
                    )}
                    {formData.image && (
                      <div className="mt-2 text-center">
                        <img 
                          src={formData.image} 
                          alt="Preview" 
                          className="w-32 h-auto aspect-[4/3] object-cover rounded-md border border-gray-200 inline-block"
                          onError={(e: any) => {
                            e.target.style.display = 'none';
                          }}
                          onLoad={(e: any) => {
                            e.target.style.display = 'inline-block';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Rating (Optional)</label>
                      <input
                        type="number"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={formData.rating}
                        onChange={(e) => setFormData({...formData, rating: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder={editingItem ? `e.g. ${getConsistentRandoms(editingItem.id).rating}` : "e.g. 4.6"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Order Count (Optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.reviewCount}
                        onChange={(e) => setFormData({...formData, reviewCount: e.target.value})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        placeholder={editingItem ? `e.g. ${getConsistentRandoms(editingItem.id).count}` : "e.g. 500"}
                      />
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      disabled={isExtracting}
                      className="w-full inline-flex justify-center flex-row items-center gap-2 rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                    >
                      {isExtracting && <RefreshCw className="w-4 h-4 animate-spin" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      disabled={isExtracting}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:col-start-1 sm:text-sm disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
        </div>
      )}

      <DeleteConfirmationModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Menu Item"
        message="Are you sure you want to delete this item?"
        isDeleting={isDeleting}
      />
    </div>
  );
}