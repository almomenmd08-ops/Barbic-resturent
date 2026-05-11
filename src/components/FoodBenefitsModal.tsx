import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Globe2, Activity, Zap, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MenuItem } from '../data/menuData';
import { fallbackTranslations } from './translations';
import { OptimizedImage } from './OptimizedImage';

const languages = [
  'English', 'Hindi', 'Bengali', 'Arabic', 'French', 'Spanish', 'Urdu'
];

interface FoodBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem;
}

// Global cache to prevent re-fetching and to persist across component unmounts
const globalBenefitsCache: Record<string, any> = {};

// Helper to generate dynamic, pseudo-random but deterministic fallback nutrition
const generateFallbackNutrition = (item: MenuItem, language: string) => {
  const currentFallback = fallbackTranslations[language] || fallbackTranslations['English'];
  // Clone the nutrition array to prevent mutating the original fallback object
  const nutrition = JSON.parse(JSON.stringify(currentFallback.nutrition));
  
  // Use length of name to slightly alter percentages deterministically
  const offset = (item.name.length % 5) * 2; 

  if (nutrition.length >= 2) {
    if (item.type === 'drink') {
      nutrition[0].value = 65 - offset;
      nutrition[1].value = 20 + offset;
    } else {
      nutrition[0].value = 40 + offset;
      nutrition[1].value = 20 - offset;
    }
  }

  return nutrition;
};

// Helper to generate dynamic fallback text
const generateFallbackBenefits = (item: MenuItem, language: string) => {
  const name = item.name;
  
  const currentFallback = fallbackTranslations[language] || fallbackTranslations['English'];
  
  // Create a deep copy to manipulate
  const benefitsText = JSON.parse(JSON.stringify(currentFallback.benefits));
  
  // Inject item name into the content to make it unique per item
  if (benefitsText.length > 0) {
    benefitsText[0].title = `${benefitsText[0].title}: ${name}`;
  }
  if (benefitsText.length > 1) {
    benefitsText[1].description = `${name} - ${benefitsText[1].description}`;
  }
  
  const summary = `${currentFallback.summary} (${name})`;
  
  return { 
    benefitsText, 
    summary 
  };
};

export const FoodBenefitsModal: React.FC<FoodBenefitsModalProps> = ({ isOpen, onClose, item }) => {
  const [language, setLanguage] = useState('English');
  const [benefitsData, setBenefitsData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    if (isOpen && item) {
      document.body.style.overflow = 'hidden';
      
      const loadBenefits = async () => {
        const cacheKey = `benefits_${item.id}_${language}`;
        
        if (globalBenefitsCache[cacheKey]) {
          setBenefitsData(globalBenefitsCache[cacheKey]);
          setLoading(false);
          return;
        }

        setLoading(true);
        setBenefitsData(null);
        setErrorMsg('');
        
        try {
          const response = await fetch('/api/food-benefits', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              name: item.name, 
              language,
              category: item.category,
              type: item.type,
              description: item.description || ''
            })
          });
          const data = await response.json();
          
          if (!isMounted) return;
          
          if (response.status === 429 || !response.ok) {
            // If we get rate limited or API fails, use fallback data instead of showing an error
            const fallbackData = generateFallbackBenefits(item, language);
            setBenefitsData(fallbackData);
            // Do not cache fallback data so we can retry the AI when it's fixed
            if (isMounted) {
              setLoading(false);
            }
            return;
          }

          if (response.ok && data.nutritionData && data.benefitsText) {
            setBenefitsData(data);
            globalBenefitsCache[cacheKey] = data;
          } else {
            // Fallback gracefully on API failure specific to item
            const fbText = generateFallbackBenefits(item, language);
            const fallbackData = {
              nutritionData: generateFallbackNutrition(item, language),
              benefitsText: fbText.benefitsText,
              summary: fbText.summary
            };
            setBenefitsData(fallbackData);
            // Do not cache fallback data so we can retry the AI when it's fixed
            // globalBenefitsCache[cacheKey] = fallbackData;
          }
        } catch (error) {
          console.error("Benefits fetch error:", error);
          if (!isMounted) return;
          const fbText = generateFallbackBenefits(item, language);
          const fallbackData = {
            nutritionData: generateFallbackNutrition(item, language),
            benefitsText: fbText.benefitsText,
            summary: fbText.summary
          };
          setBenefitsData(fallbackData);
          // Do not cache fallback data so we can retry the AI when it's fixed
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      loadBenefits();
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      isMounted = false;
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, item, language]);

  if (!isOpen) return null;

  const currentFallback = fallbackTranslations[language] || fallbackTranslations['English'];
  const uiText = currentFallback.ui;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-8 sm:p-6 flex items-start justify-center"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-bg-main rounded-2xl shadow-2xl flex flex-col relative mt-auto mb-auto"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 bg-white/80 dark:bg-black/50 text-gray-800 dark:text-white p-2 rounded-full shadow-md hover:bg-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 py-5 border-b border-orange-200/50 flex items-center justify-between dark:border-white/10 shrink-0">
          <h3 className="text-xl font-display font-bold text-text-main flex items-center gap-2 pr-10">
            <Activity className="w-5 h-5 text-primary-500" />
            {uiText.title}
          </h3>
        </div>

        <div className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-orange-100 shadow-sm shrink-0">
              <OptimizedImage src={item.imageUrl || item.image || ''} alt={item.name} className="w-full h-full" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-text-main">{item.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Globe2 className="w-4 h-4 text-text-muted" />
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-sm font-medium bg-transparent border-b border-primary-500 text-primary-600 focus:outline-none cursor-pointer pb-0.5"
                >
                  {languages.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-sm border border-orange-100/50 min-h-[150px] relative overflow-hidden"
            dir={['Arabic', 'Urdu'].includes(language) ? 'rtl' : 'ltr'}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-orange-200 border-t-primary-500 rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-text-muted mt-3">{uiText.analyzing}</span>
                </div>
              </div>
            ) : errorMsg ? (
              <div className="p-5 text-red-500 text-sm">{errorMsg}</div>
            ) : benefitsData ? (
              <div className="p-5 flex flex-col gap-6">
                
                {/* Chart Section */}
                <div className="w-full h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={benefitsData.nutritionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {benefitsData.nutritionData?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#f59e0b'} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value}%`, '']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Benefits Section */}
                <div className="space-y-4">
                  {benefitsData.benefitsText?.map((benefit: any, idx: number) => (
                    <div key={idx} className="flex gap-3 items-start">
                      <CheckCircle2 className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-text-main text-sm">{benefit.title}</h4>
                        <p className="text-sm text-text-muted mt-1 leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Psychological Push Summary */}
                {benefitsData.summary && (
                  <div className="bg-orange-50 p-4 rounded-lg flex gap-3 items-start border border-orange-100">
                    <Zap className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-orange-900 leading-snug">
                      {benefitsData.summary}
                    </p>
                  </div>
                )}
                
              </div>
            ) : null}
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-text-muted italic">
              {uiText.footer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
