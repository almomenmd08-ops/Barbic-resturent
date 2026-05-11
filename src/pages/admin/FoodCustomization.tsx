import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { ArrowUp, ArrowDown, Eye, EyeOff, Star } from 'lucide-react';

export function FoodCustomization() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'menu'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by order initially
      items.sort((a, b) => (a.order || Number.MAX_SAFE_INTEGER) - (b.order || Number.MAX_SAFE_INTEGER));
      setMenuItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateItem = async (id: string, data: any) => {
    try {
      await updateDoc(doc(db, 'menu', id), data);
      toast.success('Updated successfully');
    } catch (error) {
      console.error('Error updating:', error);
      toast.error('Failed to update');
    }
  };

  const handleOrderChange = async (id: string, newOrder: number) => {
    if (saving) return;
    const oldIndex = menuItems.findIndex(i => i.id === id);
    const newIndex = newOrder - 1;
    if (oldIndex === newIndex || oldIndex === -1) return;

    setSaving(true);
    try {
      const newItems = [...menuItems];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);

      const batch = writeBatch(db);
      newItems.forEach((item, i) => {
        batch.update(doc(db, 'menu', item.id), { order: i + 1 });
      });
      await batch.commit();
      toast.success('Display order updated');
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const homeItems = menuItems.filter(item => item.isFeaturedHome).sort((a, b) => (a.homeOrder || 0) - (b.homeOrder || 0));

  const handleHomeOrderChange = async (id: string, newOrder: number) => {
    if (saving) return;
    
    setSaving(true);
    try {
      const newHomeItems = [...homeItems];
      const oldIndex = newHomeItems.findIndex(i => i.id === id);
      const newIndex = newOrder - 1;
      
      if (oldIndex !== -1 && oldIndex !== newIndex) {
        const [movedItem] = newHomeItems.splice(oldIndex, 1);
        newHomeItems.splice(newIndex, 0, movedItem);
        
        const batch = writeBatch(db);
        newHomeItems.forEach((item, i) => {
          batch.update(doc(db, 'menu', item.id), { homeOrder: i + 1 });
        });
        await batch.commit();
        toast.success('Home position updated');
      }
    } catch (error) {
       toast.error('Failed to update home position');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return <div className="p-8">Loading customization...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Food Customization</h1>
        <p className="mt-1 text-sm text-gray-500">Control how food items appear on your website</p>
      </div>

      {/* 1. Home Food Items Customize */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">(1) Home Food Items Customize</h3>
          <p className="mt-1 text-sm text-gray-500">Select exactly 4 items to appear on the homepage. Assign positions 1 to 4.</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {homeItems.map((item, index) => (
              <div key={item.id} className="border border-green-200 bg-green-50 rounded-lg p-4 relative">
                <button 
                  onClick={() => {
                    const remaining = homeItems.filter(i => i.id !== item.id);
                    const batch = writeBatch(db);
                    batch.update(doc(db, 'menu', item.id), { isFeaturedHome: false, homeOrder: null });
                    remaining.forEach((remItem, i) => {
                      batch.update(doc(db, 'menu', remItem.id), { homeOrder: i + 1 });
                    });
                    batch.commit().then(() => toast.success('Removed from home items'));
                  }}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Remove
                </button>
                <div className="flex items-center gap-3">
                   {item.imageUrl || item.image ? (
                     <img src={item.imageUrl || item.image} alt="" className="w-12 h-12 rounded object-cover" />
                   ) : (
                     <div className="w-12 h-12 rounded bg-gray-200" />
                   )}
                   <div>
                     <p className="font-medium text-gray-900 text-sm truncate w-28">{item.name}</p>
                     <div className="mt-1 flex flex-col gap-1">
                       <label className="text-[10px] uppercase font-bold text-gray-500">Display Order</label>
                       <select 
                         value={index + 1}
                         onChange={(e) => handleHomeOrderChange(item.id, parseInt(e.target.value))}
                         disabled={saving}
                         className="text-[13px] border-gray-300 rounded p-[3px] w-14 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 font-medium"
                       >
                         {homeItems.map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                       </select>
                     </div>
                   </div>
                </div>
              </div>
            ))}
            {homeItems.length < 4 && (
               <div className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-sm text-gray-500 flex-col gap-2 bg-gray-50">
                  <span>{4 - homeItems.length} slot(s) available</span>
                  <span className="text-xs">Add from list below</span>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. All Food Items Customize */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
           <h3 className="text-lg font-medium text-gray-900">(2) All Food Items Customize</h3>
           <p className="mt-1 text-sm text-gray-500">Manage visibility, order, and feature status for all menu items</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Home Featured
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibility
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {menuItems.map((item, index) => (
                <tr key={item.id} className={!item.isActive ? 'bg-gray-50 opacity-75' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-start">
                      <label className="text-[10px] uppercase font-bold text-gray-400">Display Order</label>
                      <select
                        value={index + 1}
                        onChange={(e) => handleOrderChange(item.id, parseInt(e.target.value))}
                        disabled={saving}
                        className="border border-gray-300 rounded-md text-sm py-1.5 px-3 focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50 min-w-[70px]"
                      >
                        {menuItems.map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {item.imageUrl || item.image ? (
                          <img className="h-10 w-10 rounded-md object-cover" src={item.imageUrl || item.image} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-200" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                    ₹{item.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => {
                        if (!item.isFeaturedHome && homeItems.length >= 4) {
                           toast.error('You already have 4 items featured on home.');
                           return;
                        }
                        if (item.isFeaturedHome) {
                           const remaining = homeItems.filter(i => i.id !== item.id);
                           const batch = writeBatch(db);
                           batch.update(doc(db, 'menu', item.id), { isFeaturedHome: false, homeOrder: null });
                           remaining.forEach((remItem, i) => {
                              batch.update(doc(db, 'menu', remItem.id), { homeOrder: i + 1 });
                           });
                           batch.commit().then(() => toast.success('Removed from home items'));
                        } else {
                           handleUpdateItem(item.id, { 
                             isFeaturedHome: true,
                             homeOrder: homeItems.length + 1
                           });
                        }
                      }}
                      className={`inline-flex items-center p-2 rounded-full transition-colors ${
                        item.isFeaturedHome 
                          ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={item.isFeaturedHome ? "Remove from Homepage" : "Add to Homepage"}
                    >
                      <Star className={`w-5 h-5 ${item.isFeaturedHome ? 'fill-current' : ''}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleUpdateItem(item.id, { isActive: !item.isActive })}
                      className={`inline-flex items-center p-2 rounded-full transition-colors ${
                        item.isActive 
                          ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                          : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                      title={item.isActive ? "Hide Item" : "Show Item"}
                    >
                      {item.isActive ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
