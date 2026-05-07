import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Package, ShieldCheck, Plus, Sparkles, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { SURVIVAL_KIT_CHECKLIST } from '../constants';
import { getGoBagSuggestions } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../translations';

interface ChecklistItem {
  id: string;
  item: string;
  category: string;
  isCustom?: boolean;
}

export const SurvivalKit: React.FC<{ onBack?: () => void, language?: 'en' | 'tl' }> = ({ onBack, language = 'en' }) => {
  const t = translations[language];

  const [customItems, setCustomItems] = useState<ChecklistItem[]>(() => {
    const saved = localStorage.getItem('survival_kit_custom_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [checked, setChecked] = useState<string[]>(() => {
    const saved = localStorage.getItem('survival_kit_checked');
    return saved ? JSON.parse(saved) : [];
  });

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Essentials');
  const [disasterType, setDisasterType] = useState('Flood');
  const [aiSuggestions, setAiSuggestions] = useState<ChecklistItem[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    localStorage.setItem('survival_kit_checked', JSON.stringify(checked));
  }, [checked]);

  useEffect(() => {
    localStorage.setItem('survival_kit_custom_items', JSON.stringify(customItems));
  }, [customItems]);

  const allItems = [...SURVIVAL_KIT_CHECKLIST, ...customItems];

  const toggle = (id: string) => {
    setChecked(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const addCustomItem = (item: string, category: string) => {
    if (!item.trim()) return;
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      item: item.trim(),
      category,
      isCustom: true
    };
    setCustomItems(prev => [...prev, newItem]);
    setNewItemName('');
  };

  const removeCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(i => i.id !== id));
    setChecked(prev => prev.filter(i => i !== id));
  };

  const fetchAiSuggestions = async () => {
    setIsLoadingAi(true);
    try {
      const suggestions = await getGoBagSuggestions(disasterType);
      const formattedSuggestions = suggestions.map((s: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        item: s.item,
        category: s.category
      }));
      setAiSuggestions(formattedSuggestions);
      setShowAiPanel(true);
    } catch (error: any) {
      const isQuota = error.message?.toLowerCase().includes("quota") || error.message?.includes("429") || error.message?.includes("Failed to fetch");
      if (isQuota) {
        const fallbackSuggestions = [
          { item: 'Waterproof pouch for documents', category: 'Essentials' },
          { item: 'Extra batteries', category: 'Tools' },
          { item: 'Whistle', category: 'Essentials' }
        ];
        const formattedSuggestions = fallbackSuggestions.map((s: any, index: number) => ({
          id: `ai-${Date.now()}-${index}`,
          item: s.item,
          category: s.category
        }));
        setAiSuggestions(formattedSuggestions);
        setShowAiPanel(true);
      } else {
        console.error("AI Error:", error);
      }
    } finally {
      setIsLoadingAi(false);
    }
  };

  const addAiSuggestion = (suggestion: ChecklistItem) => {
    const newItem: ChecklistItem = {
      ...suggestion,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isCustom: true
    };
    setCustomItems(prev => [...prev, newItem]);
    setAiSuggestions(prev => prev.filter(s => s.item !== suggestion.item));
  };

  const progress = allItems.length > 0 ? Math.round((checked.length / allItems.length) * 100) : 0;

  const categories = [
    { id: 'Essentials', label: t.essentials },
    { id: 'Medical', label: t.medical },
    { id: 'Sanitation', label: t.sanitation },
    { id: 'Tools', label: t.tools },
    { id: 'Personal', label: t.personal }
  ];

  const disasterTypes = [
    { id: 'Flood', label: t.flood },
    { id: 'Earthquake', label: t.earthquake },
    { id: 'Fire', label: t.fire },
    { id: 'Typhoon', label: t.typhoon },
    { id: 'Volcanic Eruption', label: t.volcanicEruption }
  ];

  return (
    <div className="space-y-6 p-4 pb-32 bg-white dark:bg-slate-900 transition-colors">
      <div className="bg-[#002147] dark:bg-slate-800 text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Package size={120} />
        </div>
        <div className="flex items-center gap-4 mb-4">
          {onBack && (
            <button onClick={onBack} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <ChevronDown className="rotate-90" size={20} />
            </button>
          )}
          <h2 className="text-3xl font-black">{t.survivalKitTitle}</h2>
        </div>
        <p className="text-blue-100 text-sm mb-6">{t.survivalKitDesc}</p>
        
        <div className="flex items-center gap-4">
          <div className="flex-grow bg-white/10 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-teal-400 h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-right">
            <span className="font-black text-teal-300 text-lg block">{progress}%</span>
            <span className="text-[10px] font-bold text-teal-100 uppercase tracking-widest block">
              {progress === 100 ? t.fullyPrepared : t.preparednessLevel}
            </span>
          </div>
        </div>
      </div>

      {/* AI Suggestions Section */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-black text-indigo-900 dark:text-indigo-100">{t.aiGoBagAssistant}</h3>
            <p className="text-xs font-bold text-indigo-400 dark:text-indigo-500 uppercase tracking-wider">{t.smartRecommendations}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <select 
            value={disasterType}
            onChange={(e) => setDisasterType(e.target.value)}
            className="flex-grow bg-white dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/30 p-3 rounded-2xl font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all text-sm"
          >
            {disasterTypes.map(type => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
          <button 
            onClick={fetchAiSuggestions}
            disabled={isLoadingAi}
            className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoadingAi ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {t.suggest}
          </button>
        </div>

        <AnimatePresence>
          {showAiPanel && aiSuggestions.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-2">
                <p className="text-xs font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest ml-1">{t.aiRecommendedItems}</p>
                <div className="grid grid-cols-1 gap-2">
                  {aiSuggestions.map((suggestion) => (
                    <button 
                      key={suggestion.id}
                      onClick={() => addAiSuggestion(suggestion)}
                      className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between group hover:border-indigo-300 dark:hover:border-indigo-500 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-400" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{suggestion.item}</span>
                      </div>
                      <Plus size={16} className="text-indigo-400 group-hover:text-indigo-600" />
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setShowAiPanel(false)}
                  className="w-full text-center py-2 text-xs font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  {t.closeSuggestions}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Custom Item */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">{t.addCustomItem}</h3>
        <div className="flex flex-col gap-2">
          <input 
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={t.whatElseDoYouNeed}
            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 transition-all"
          />
          <div className="flex gap-2">
            <select 
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="flex-grow bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-slate-700 dark:text-white outline-none focus:border-blue-500 transition-all text-sm"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <button 
              onClick={() => addCustomItem(newItemName, newItemCategory)}
              className="bg-[#002147] dark:bg-blue-600 text-white px-8 rounded-2xl font-black shadow-lg active:scale-95 transition-all"
            >
              {t.add}
            </button>
          </div>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-6">
        {categories.map(category => {
          const categoryItems = allItems.filter(i => i.category === category.id);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category.id} className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">{category.label}</h3>
              <div className="grid grid-cols-1 gap-2">
                {categoryItems.map((item: ChecklistItem) => (
                  <div key={item.id} className="relative group">
                    <button 
                      onClick={() => toggle(item.id)}
                      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
                        checked.includes(item.id) 
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/30' 
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                      } border`}
                    >
                      {checked.includes(item.id) ? (
                        <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle className="text-slate-200 dark:text-slate-700" />
                      )}
                      <span className={`text-sm font-bold flex-grow text-left ${checked.includes(item.id) ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-700 dark:text-slate-200'}`}>
                        {item.item}
                      </span>
                    </button>
                    {item.isCustom && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeCustomItem(item.id); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {progress === 100 && allItems.length > 0 && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 bg-emerald-600 dark:bg-emerald-500 text-white rounded-3xl flex items-center gap-4 shadow-lg shadow-emerald-200 dark:shadow-none"
        >
          <ShieldCheck size={32} />
          <div>
            <p className="font-black text-lg">{t.missionComplete}</p>
            <p className="text-sm opacity-80">{t.fullyPrepared}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
