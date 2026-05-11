import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { useState } from 'react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clearCart, total } = useCartStore();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const deliveryCharge = total() > 0 && total() < settings.freeDeliveryMin ? settings.deliveryCharge : 0;
  const finalTotal = total() + deliveryCharge;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md transform transition ease-in-out duration-300">
          <div className="h-full flex flex-col bg-white shadow-xl">
            <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Your Order
                </h2>
                <div className="ml-3 h-7 flex items-center space-x-2">
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => clearCart()}
                      className="text-sm font-medium text-red-600 hover:text-red-500 mr-2"
                    >
                      Clear Cart
                    </button>
                  )}
                  <button
                    type="button"
                    className="-m-2 p-2 text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <div className="flow-root">
                  {items.length === 0 ? (
                    <div className="text-center py-12">
                      <ShoppingBag className="mx-auto h-12 w-12 text-gray-300" />
                      <p className="mt-4 text-gray-500">Your cart is empty</p>
                    </div>
                  ) : (
                    <ul className="-my-6 divide-y divide-gray-200">
                      {items.map((item) => (
                        <li key={item.id} className="py-6 flex">
                          <div className="flex-1 flex flex-col">
                            <div>
                              <div className="flex justify-between text-base font-medium text-gray-900">
                                <h3>
                                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${item.type === 'veg' ? 'bg-green-500' : item.type === 'non-veg' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                  {item.name}
                                </h3>
                                <p className="ml-4">₹{item.price * item.quantity}</p>
                              </div>
                            </div>
                            <div className="flex-1 flex items-end justify-between text-sm">
                              <div className="flex items-center border border-gray-300 rounded-md">
                                <button
                                  onClick={() => {
                                    if (item.quantity === 1) {
                                      removeItem(item.id);
                                    } else {
                                      updateQuantity(item.id, item.quantity - 1);
                                    }
                                  }}
                                  className="p-1 text-gray-600 hover:text-primary-600"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-2 font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-1 text-gray-600 hover:text-primary-600"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="flex">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.id)}
                                  className="font-medium text-red-600 hover:text-red-500"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {items.length > 0 && (
              <div className="border-t border-gray-200 py-6 px-4 sm:px-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <p>Subtotal</p>
                  <p>₹{total()}</p>
                </div>
                {deliveryCharge > 0 && (
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <p>Delivery Charge</p>
                    <p>₹{deliveryCharge.toFixed(2)}</p>
                  </div>
                )}
                {settings.freeDeliveryMin > 0 && settings.deliveryCharge > 0 && (
                  <div className={`mt-3 mb-4 p-3 rounded-lg text-sm font-medium text-center border ${total() < settings.freeDeliveryMin ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {total() < settings.freeDeliveryMin ? (
                      <>Add ₹{(settings.freeDeliveryMin - total()).toFixed(2)} more to get FREE delivery</>
                    ) : (
                      <>🎉 Your delivery is totally FREE!</>
                    )}
                  </div>
                )}
                <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
                  <p>Total</p>
                  <p>₹{finalTotal.toFixed(2)}</p>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/checkout');
                    }}
                    className="btn-primary w-full h-[54px] text-base uppercase tracking-wider"
                  >
                    Checkout
                  </button>
                </div>
                <div className="mt-6 flex justify-center text-sm text-center text-gray-500">
                  <p>
                    or{' '}
                    <button
                      type="button"
                      className="text-primary-600 font-medium hover:text-primary-500"
                      onClick={onClose}
                    >
                      Continue Shopping<span aria-hidden="true"> &rarr;</span>
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
