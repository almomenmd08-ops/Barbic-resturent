import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock } from 'lucide-react';
import { menuData } from '../data/menuData';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const SearchModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cart_app_search_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  const saveToHistory = (searchTerm: string) => {
    const updated = [searchTerm, ...history.filter(h => h !== searchTerm)].slice(0, 5);
    setHistory(updated);
    try {
      localStorage.setItem('cart_app_search_history', JSON.stringify(updated));
    } catch (e) {}
  };

  const removeHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = history.filter(h => h !== item);
    setHistory(updated);
    try {
      localStorage.setItem('cart_app_search_history', JSON.stringify(updated));
    } catch(e) {}
  };

  const handleSelect = (item: any) => {
    saveToHistory(query || item.name);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length > 0) {
      const lowerQuery = query.toLowerCase();
      const filtered = menuData.filter(
        item => 
          item.name.toLowerCase().includes(lowerQuery) || 
          item.category.toLowerCase().includes(lowerQuery)
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 sm:top-20 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl bg-white sm:rounded-2xl shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[80vh]"
          >
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400" />
              <input 
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for dishes, categories..."
                className="flex-1 bg-transparent border-none outline-none text-lg text-gray-800 placeholder:text-gray-300"
              />
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              {query && results.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No results found for "{query}"
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {!query && history.length > 0 && (
                    <div className="mb-2">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Recent Searches</h4>
                      <div className="flex flex-wrap gap-2">
                        {history.map(h => (
                          <div 
                            key={h} 
                            onClick={() => setQuery(h)}
                            className="bg-white border text-sm border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-1 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-gray-700">{h}</span>
                            <button 
                              onClick={(e) => removeHistoryItem(e, h)}
                              className="ml-1 text-gray-400 hover:text-red-500 p-0.5 rounded-full"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {results.slice(0, 15).map(item => (
                    <Link
                      key={item.id}
                      to={`/menu#${item.id}`}
                      onClick={() => handleSelect(item)}
                      className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-[#E23744]/30 hover:shadow-md transition-all active:scale-[0.98] group"
                    >
                      <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-100">
                        <img 
                          src={item.imageUrl || item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm p-0.5 rounded-full shadow-sm">
                          <div className={`w-2 h-2 rounded-full border border-white ${item.type === 'veg' ? 'bg-green-500' : item.type === 'non-veg' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{item.category}</p>
                      </div>
                      <div className="font-bold text-[#E23744] whitespace-nowrap bg-red-50 px-2 py-1 rounded-lg">
                        ₹{item.price}
                      </div>
                    </Link>
                  ))}
                  {query.trim().length === 0 && history.length === 0 && (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Type something to start searching...<br/>
                      <span className="text-xs text-gray-400 mt-2 block">Try "Biriyani", "Zinger Chicken", "Special Chicken Briyani"</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
