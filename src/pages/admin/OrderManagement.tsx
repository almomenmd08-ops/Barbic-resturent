import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Package, Clock, CheckCircle, XCircle, Search, Eye, Trash2, RefreshCw, Printer, Download, Loader2 } from 'lucide-react';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useSettingsStore } from '../../store/settingsStore';

export function OrderManagement() {
  const { settings } = useSettingsStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
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

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'orders'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Admin should still see all orders per requirements, but we map them out of user views
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort locally
      ordersData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refreshKey]);

  const formatOrderDate = (createdAt: any) => {
    if (!createdAt) return 'N/A';
    if (createdAt.toDate) return createdAt.toDate().toLocaleString();
    return new Date(createdAt).toLocaleString();
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const getInvoiceHTML = (order: any) => {
    const addressParts = [
      order.customerDetails?.houseNo,
      order.customerDetails?.area,
      order.customerDetails?.landmark ? `Near ${order.customerDetails.landmark}` : '',
      order.customerDetails?.city,
      order.customerDetails?.pincode
    ].filter(Boolean).join(', ');
    
    const finalAddress = addressParts || order.customerDetails?.address || 'Address not provided';

    return `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; background: #fff;">
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px dashed #eee; padding-bottom: 20px;">
          <h1 style="font-size: 28px; font-weight: 800; margin: 0 0 5px 0; color: #FF7A00; text-transform: uppercase; letter-spacing: 1px;">${settings?.name || 'BARBIC'}</h1>
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #555;">${settings?.address || 'Near Mukul khadi, jolamor, Near Mukul khadi'}</p>
          <p style="margin: 0; font-size: 14px; color: #555;">Phone: ${settings?.phone || '+91 8438793586'}</p>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div style="width: 48%;">
            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0; color: #777; border-bottom: 1px solid #eee; padding-bottom: 5px;">Order Details</h3>
            <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>Order ID:</strong> #${order.id?.slice(-6)?.toUpperCase() || 'UNKNOWN'}</p>
            <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>Date:</strong> ${formatOrderDate(order.createdAt)}</p>
            <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>Payment Method:</strong> ${order.paymentMethod}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Payment Status:</strong> ${order.paymentStatus || 'Pending'}</p>
          </div>
          
          <div style="width: 48%;">
            <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0; color: #777; border-bottom: 1px solid #eee; padding-bottom: 5px;">Customer Details</h3>
            <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>Name:</strong> ${order.customerDetails?.name || 'N/A'}</p>
            <p style="margin: 0 0 5px 0; font-size: 14px;"><strong>Phone:</strong> ${order.customerDetails?.phone || 'N/A'}</p>
            <p style="margin: 0; font-size: 14px;"><strong>Address:</strong> ${finalAddress}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
          <thead>
            <tr style="background-color: #fafafa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-size: 14px; font-weight: bold; color: #333;">Item</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; font-size: 14px; font-weight: bold; color: #333;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; font-size: 14px; font-weight: bold; color: #333;">Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #ddd; font-size: 14px; font-weight: bold; color: #333;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((item: any) => `
              <tr>
                <td style="padding: 12px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; color: #444;">${item.name}</td>
                <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; font-size: 14px; color: #444;">${item.quantity}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; font-size: 14px; color: #444;">₹${item.price}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; font-size: 14px; font-weight: 500; color: #111;">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="width: 100%; display: flex; justify-content: flex-end;">
          <div style="width: 250px;">
            <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; color: #555;">
              <span>Subtotal</span>
              <span>₹${order.subTotal || order.totalAmount}</span>
            </div>
            ${order.discount > 0 ? `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; color: #22c55e;">
                <span>Discount</span>
                <span>-₹${order.discount}</span>
              </div>
            ` : ''}
            ${order.deliveryCharge !== undefined ? `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; color: #555;">
                <span>Delivery Fee</span>
                <span>${order.deliveryCharge === 0 ? 'Free' : `₹${order.deliveryCharge}`}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 800; border-top: 2px solid #111; margin-top: 5px; color: #000;">
              <span>Grand Total</span>
              <span>₹${order.totalAmount}</span>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 60px; font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 20px;">
          <p style="margin: 0 0 5px 0;">Thank you for ordering with BARBIC!</p>
          <p style="margin: 0; font-weight: 500;">Enjoy your meal.</p>
        </div>
      </div>
    `;
  };

  const handlePrint = () => {
    if (!selectedOrder) return;
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - Order #${selectedOrder.id?.slice(-6)?.toUpperCase() || 'UNKNOWN'}</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #333; }
              @media print { body { -webkit-print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            ${getInvoiceHTML(selectedOrder)}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 250);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    try {
      setIsGeneratingPDF(true);
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '800px';
      container.style.backgroundColor = '#ffffff';
      container.innerHTML = getInvoiceHTML(selectedOrder);
      document.body.appendChild(container);
      
      // Give DOM time to render before canvas takes snapshot
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`BARBIC_Invoice_Order_${selectedOrder.id?.slice(-6)?.toUpperCase() || 'UNKNOWN'}.pdf`);
      
      document.body.removeChild(container);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const timestampKey = newStatus === 'out_for_delivery' ? 'outForDeliveryAt' : `${newStatus}At`;
      await setDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        [timestampKey]: serverTimestamp(),
        statusTimestamps: {
          [newStatus]: serverTimestamp()
        }
      }, { merge: true });
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error: any) {
      console.error("Error updating order status (details):", error);
      toast.error(error?.message || "Failed to update status");
    }
  };

  const handlePaymentStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await setDoc(doc(db, 'orders', orderId), {
        paymentStatus: newStatus
      }, { merge: true });
      toast.success(`Payment status updated to ${newStatus}`);
    } catch (error: any) {
      console.error("Error updating payment status (details):", error);
      toast.error(error?.message || "Failed to update payment status");
    }
  };

  const confirmAdminDelete = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'orders', orderToDelete));
      toast.success(`Order permanently deleted.`);
      setOrders((prev) => prev.filter(o => o.id !== orderToDelete));
    } catch (error) {
      console.error("Error marking as deleted:", error);
      toast.error("Delete failed");
    } finally {
      setIsDeleting(false);
      setOrderToDelete(null);
      setDeleteModalOpen(false);
    }
  };

  const openDeleteModal = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteModalOpen(true);
  };

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getOrderTime = (order: any) => {
    return order.createdAt?.toDate ? order.createdAt.toDate().getTime() : new Date(order.createdAt || 0).getTime();
  };

  const TEN_MINUTES_MS = 10 * 60 * 1000;

  const filteredOrders = orders.filter(order => {
    if (order.isDeleted) return false;
    
    return (
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerDetails?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerDetails?.phone?.includes(searchTerm)
    );
  });

  const recentOrders = filteredOrders.filter(order => {
    return (now - getOrderTime(order)) <= TEN_MINUTES_MS;
  });

  const pastOrders = filteredOrders.filter(order => {
    return (now - getOrderTime(order)) > TEN_MINUTES_MS;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const renderOrderTable = (ordersToRender: any[], title: string, isRecent: boolean = false) => {
    if (ordersToRender.length === 0 && isRecent) return null;

    return (
      <div className="mb-8">
        <h3 className={`text-lg font-bold mb-4 ${isRecent ? 'text-red-600 flex items-center' : 'text-gray-900'}`}>
          {isRecent && <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>}
          {title}
        </h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID & Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersToRender.map((order) => (
                  <tr key={order.id} className={isRecent ? 'bg-red-50/30' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.id?.slice(-6)?.toUpperCase() || 'N/A'}
                            {isRecent && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">New Order</span>}
                            {order.isDeleted && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Deleted (Soft)</span>}
                          </div>
                          <div className="text-sm text-gray-500">{formatOrderDate(order.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{order.customerDetails?.name || 'Guest'}</div>
                      <div className="text-sm text-gray-500">{order.customerDetails?.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{order.totalAmount}</div>
                      <div className="text-xs text-gray-500">{order.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className={`text-sm font-semibold rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-primary-500 ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-indigo-100 text-indigo-800' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'out_for_delivery' ? 'bg-orange-100 text-orange-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={order.paymentStatus || 'Pending'}
                        onChange={(e) => handlePaymentStatusChange(order.id, e.target.value)}
                        className={`text-sm font-semibold rounded-full px-3 py-1 border-0 focus:ring-2 focus:ring-primary-500 ${
                          order.paymentStatus === 'Successfully' ? 'bg-green-100 text-green-800' :
                          order.paymentStatus === 'Failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Successfully">Successfully</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <Eye className="w-5 h-5 mr-1" /> View
                        </button>
                        <button
                          onClick={() => openDeleteModal(order.id)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                          title="Delete Order"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {ordersToRender.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Package className="w-6 h-6 mr-2 text-primary-500" />
          Order Management
        </h2>
        <div className="flex w-full sm:w-auto items-center space-x-4">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              placeholder="Search orders..."
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

      {renderOrderTable(recentOrders, "Recent Orders (Last 10 mins)", true)}
      {renderOrderTable(pastOrders, "All Past Orders", false)}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto pointer-events-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity pointer-events-auto" aria-hidden="true" onClick={() => setSelectedOrder(null)}></div>

          <div className="relative bg-white rounded-lg text-left shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto z-10 flex flex-col">
            <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex-1">
                <div className="flex justify-between items-center mb-5 border-b pb-4">
                  <h3 className="text-xl leading-6 font-bold text-gray-900">
                    Order Details #{selectedOrder.id?.slice(-6)?.toUpperCase() || 'UNKNOWN'}
                  </h3>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button 
                      onClick={handleDownloadPDF} 
                      disabled={isGeneratingPDF}
                      className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors border border-gray-200 disabled:opacity-50"
                      title="Download PDF"
                    >
                      {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="hidden sm:inline">{isGeneratingPDF ? 'Generating...' : 'PDF'}</span>
                    </button>
                    <button 
                      onClick={handlePrint} 
                      className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-medium rounded-lg transition-colors border border-gray-200"
                      title="Print Invoice"
                    >
                      <Printer className="w-4 h-4" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                    <div className="hidden sm:block w-px h-6 bg-gray-300 mx-1"></div>
                    <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-500 ml-1">
                      <XCircle className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Customer Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm text-gray-800">
                      <p><span className="font-medium text-gray-500 block mb-0.5">Name:</span> {selectedOrder.customerDetails?.name}</p>
                      <p><span className="font-medium text-gray-500 block mb-0.5 mt-2">Phone:</span> {selectedOrder.customerDetails?.phone}</p>
                      <div>
                        <span className="font-medium text-gray-500 block mb-0.5 mt-2">Address:</span>
                        {selectedOrder.customerDetails?.houseNo || selectedOrder.customerDetails?.area ? (
                          <div className="text-gray-800 space-y-0.5">
                            {selectedOrder.customerDetails?.houseNo && <p>{selectedOrder.customerDetails.houseNo}</p>}
                            {selectedOrder.customerDetails?.area && <p>{selectedOrder.customerDetails.area}</p>}
                            {selectedOrder.customerDetails?.landmark && <p>Near {selectedOrder.customerDetails.landmark}</p>}
                            <p>{[selectedOrder.customerDetails?.city, selectedOrder.customerDetails?.pincode].filter(Boolean).join(', ')}</p>
                          </div>
                        ) : (
                          <p>{selectedOrder.customerDetails?.address || 'Address not provided'}</p>
                        )}
                      </div>
                      {selectedOrder.customerDetails?.instructions && (
                        <p className="mt-2"><span className="font-medium text-gray-500 block mb-0.5">Instructions:</span> {selectedOrder.customerDetails.instructions}</p>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">Order Summary</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                      <p className="flex justify-between"><span className="font-medium text-gray-500">Date:</span> <span>{formatOrderDate(selectedOrder.createdAt)}</span></p>
                      <p className="flex justify-between"><span className="font-medium text-gray-500">Payment:</span> <span>{selectedOrder.paymentMethod}</span></p>
                      
                      <div className="w-full h-px bg-gray-200 my-2"></div>
                      
                      <p className="flex justify-between"><span className="font-medium text-gray-500">Subtotal:</span> <span>₹{selectedOrder.subTotal || selectedOrder.totalAmount}</span></p>
                      
                      {selectedOrder.discount > 0 && (
                        <p className="flex justify-between text-green-600"><span className="font-medium">Discount:</span> <span>-₹{selectedOrder.discount}</span></p>
                      )}
                      
                      {selectedOrder.deliveryCharge !== undefined && (
                        <p className="flex justify-between"><span className="font-medium text-gray-500">Delivery Charge:</span> <span>{selectedOrder.deliveryCharge === 0 ? 'Free' : `₹${selectedOrder.deliveryCharge}`}</span></p>
                      )}
                      
                      <div className="w-full h-px bg-gray-200 my-2"></div>
                      
                      <p className="flex justify-between text-base font-bold"><span className="text-gray-900">Total Amount:</span> <span>₹{selectedOrder.totalAmount}</span></p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-bold text-gray-900 mb-2">Items</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedOrder.items?.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-500 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right">₹{item.price * item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
        </div>
      )}

      <DeleteConfirmationModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmAdminDelete}
        title="Delete Order"
        message="Are you sure you want to delete this item?"
        isDeleting={isDeleting}
      />
    </div>
  );
}