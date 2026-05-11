import React from 'react';
import { CheckCircle2, Circle, Clock, ChefHat, Truck, Home, X } from 'lucide-react';

interface OrderTrackerProps {
  order: any;
}

const statuses = [
  { id: 'pending', label: 'Order Placed', desc: 'We have received your order', icon: Clock },
  { id: 'confirmed', label: 'Order Confirmed', desc: 'Restaurant is preparing your food', icon: CheckCircle2 },
  { id: 'preparing', label: 'Preparing', desc: 'Your food is being cooked', icon: ChefHat },
  { id: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider is on the way', icon: Truck },
  { id: 'delivered', label: 'Delivered', desc: 'Enjoy your meal!', icon: Home },
];

export const OrderTracker: React.FC<OrderTrackerProps> = ({ order }) => {
  const status = order.status || 'pending';
  // Normalize status
  const currentStatus = status === 'pending' ? 'pending' 
                      : status === 'confirmed' ? 'confirmed' 
                      : status === 'preparing' ? 'preparing'
                      : status === 'out_for_delivery' ? 'out_for_delivery'
                      : status === 'delivered' ? 'delivered' 
                      : 'pending';

  const currentIndex = statuses.findIndex(s => s.id === currentStatus);
  const isCancelled = status === 'cancelled';

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return null;
    let dateObj;
    if (timestamp.toDate) {
      dateObj = timestamp.toDate();
    } else if (timestamp.seconds) {
      dateObj = new Date(timestamp.seconds * 1000);
    } else if (timestamp && typeof timestamp === 'object') {
      // Optimitic local execution for FieldValue.serverTimestamp
      dateObj = new Date();
    } else {
      dateObj = new Date(timestamp);
    }
    
    if (isNaN(dateObj.getTime())) return null;

    const formattedDate = dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    const formattedTime = dateObj.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${formattedDate} • ${formattedTime}`;
  };

  if (isCancelled) {
    return (
      <div className="py-4 px-6 bg-red-50 flex items-center">
        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3 shrink-0">
          <X className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-red-800">Order Cancelled</h4>
          <p className="text-xs text-red-600">This order has been cancelled and will not be processed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-5 px-6 bg-white relative rounded-b-xl border-t border-gray-100">
      <h4 className="text-xs font-bold text-gray-500 mb-6 uppercase tracking-widest">Live Tracking</h4>
      <div className="relative pl-3 sm:pl-4 space-y-7">
        {/* Background vertical line */}
        <div className="absolute left-[27px] sm:left-[31px] top-6 bottom-6 w-0.5 bg-gray-100 rounded-full" />
        
        {/* Active vertical line */}
        <div 
          className="absolute left-[27px] sm:left-[31px] top-6 w-0.5 bg-primary-500 rounded-full transition-all duration-1000 ease-in-out origin-top"
          style={{ height: `calc(${Math.max(0, currentIndex) * 25}% - ${currentIndex === statuses.length - 1 ? 0 : 0}px)` }}
        />

        {statuses.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = step.icon;
          
          let stepTimestamp = null;
          if (order.statusTimestamps && order.statusTimestamps[step.id]) {
            stepTimestamp = order.statusTimestamps[step.id];
          } else if (step.id === 'pending') {
            stepTimestamp = order.createdAt;
          } else if (isCompleted && order.createdAt) {
            // Fallback for old orders that lack precise timestamps in DB
            let baseTime = 0;
            if (order.createdAt.toDate) {
              baseTime = order.createdAt.toDate().getTime();
            } else if (order.createdAt.seconds) {
              baseTime = order.createdAt.seconds * 1000;
            } else if (typeof order.createdAt === 'object') {
              baseTime = Date.now();
            } else {
              baseTime = new Date(order.createdAt).getTime();
            }
            
            if (!isNaN(baseTime)) {
              // Simulate progression: +2m, +15m, +30m, +45m
              const baseDelays = [0, 2, 15, 30, 45];
              stepTimestamp = new Date(baseTime + (baseDelays[index] || 0) * 60000);
            }
          }
          const timeString = formatTimestamp(stepTimestamp);

          return (
            <div key={step.id} className="relative flex items-start group">
              <div 
                className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 shadow-sm
                  ${isCompleted ? 'bg-primary-500 text-white shadow-primary-500/30' : 'bg-white border-2 border-gray-100 text-gray-300'}`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary-500 animate-ping opacity-30"></div>
                )}
              </div>
              
              <div className="ml-4 flex flex-col justify-center min-h-[32px] sm:min-h-[40px] pt-1">
                <span className={`text-sm font-bold transition-colors duration-300 ${isCurrent ? 'text-primary-600' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                  {step.label}
                </span>
                
                {isCompleted && timeString && (
                  <span className={`text-xs mt-0.5 font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                    {timeString}
                  </span>
                )}
                
                <span className={`text-xs mt-0.5 transition-colors duration-300 ${isCurrent ? 'text-gray-600' : 'text-gray-400'} ${!isCompleted ? 'opacity-0 group-hover:opacity-100' : ''}`}>
                  {step.desc}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
