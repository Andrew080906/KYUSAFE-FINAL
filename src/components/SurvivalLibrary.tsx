import React, { useState } from 'react';
import { BookOpen, Droplets, HeartPulse, Zap, ChevronRight, Info, Search, X as XIcon, Share2, Download, CheckCircle2, MessageCircle } from 'lucide-react';
import { SURVIVAL_LIBRARY, SurvivalTip } from '../constants';
import { translations } from '../translations';
import { getSafetyGuidance } from '../services/gemini';

export const SurvivalLibrary: React.FC<{ onBack?: () => void, language?: 'en' | 'tl' }> = ({ onBack, language = 'en' }) => {
  const t = translations[language];
  const [selectedTip, setSelectedTip] = useState<SurvivalTip | null>(null);
  const [mode, setMode] = useState<'adult' | 'kid'>('adult');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(() => {
    const saved = localStorage.getItem('kyusafe_offline_resources');
    return saved ? JSON.parse(saved).includes('survival_guides') : false;
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatResponse, setChatResponse] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const askAI = async (tipTitle: string) => {
    setLoadingChat(true);
    setChatOpen(true);
    try {
      const response = await getSafetyGuidance(`Can you give me more specific tips or advice on "${tipTitle}"?`, 'Quezon City, Philippines');
      setChatResponse(response);
    } catch (e) {
      setChatResponse('Unable to get AI advice right now.');
    } finally {
      setLoadingChat(false);
    }
  };

  const handleDownloadOffline = () => {
    setIsDownloading(true);
    setTimeout(() => {
      const saved = localStorage.getItem('kyusafe_offline_resources');
      const currentIds = saved ? JSON.parse(saved) : [];
      if (!currentIds.includes('survival_guides')) {
        const newIds = [...currentIds, 'survival_guides'];
        localStorage.setItem('kyusafe_offline_resources', JSON.stringify(newIds));
        localStorage.setItem('offline_survival_data', JSON.stringify(SURVIVAL_LIBRARY));
      }
      setIsOfflineReady(true);
      setIsDownloading(false);
    }, 1500);
  };

  const filteredTips = SURVIVAL_LIBRARY.filter(tip => 
    tip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tip.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 pb-32 bg-white dark:bg-slate-900 transition-colors">
      <div className="flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <ChevronRight className="rotate-180" size={20} />
          </button>
        )}
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.survivalLibraryTitle}</h2>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadOffline}
            disabled={isDownloading || isOfflineReady}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
              isOfflineReady 
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 active:scale-95'
            }`}
          >
            {isDownloading ? (
              <div className="w-3 h-3 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            ) : isOfflineReady ? (
              <CheckCircle2 size={14} />
            ) : (
              <Download size={14} />
            )}
            {isDownloading ? t.saving : isOfflineReady ? t.offlineReady : t.saveOffline}
          </button>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setMode('adult')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'adult' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
            >
              {t.adult}
            </button>
            <button 
              onClick={() => setMode('kid')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === 'kid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}
            >
              {t.kid}
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchTipsPlaceholder}
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 pl-12 pr-4 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 dark:text-white"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <XIcon size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredTips.length > 0 ? filteredTips.map((tip) => (
          <button 
            key={tip.id}
            onClick={() => setSelectedTip(tip)}
            className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-emerald-200 dark:hover:border-emerald-900 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 group-hover:text-white transition-all">
                {tip.category === 'Water' && <Droplets />}
                {tip.category === 'First Aid' && <HeartPulse />}
                {tip.category === 'Signal' && <Zap />}
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800 dark:text-white">{tip.title}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">{tip.category}</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300 dark:text-slate-600" />
          </button>
        )) : (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
            <p className="text-slate-400 dark:text-slate-500 font-medium">{t.noTipsFound}</p>
          </div>
        )}
      </div>

      {selectedTip && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full uppercase tracking-widest">{selectedTip.category}</span>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-2">{selectedTip.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: selectedTip.title,
                          text: `${t.checkOutTip} ${selectedTip.title}`,
                          url: window.location.href
                        }).catch((error) => console.log('Share error:', error));
                      } else {
                        alert(t.linkCopied);
                        navigator.clipboard.writeText(window.location.href);
                      }
                    }}
                    className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    <Share2 size={20} />
                  </button>
                  <button onClick={() => setSelectedTip(null)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    <ChevronRight className="rotate-90" />
                  </button>
                </div>
              </div>

              {mode === 'adult' ? (
                <div className="space-y-4">
                  {selectedTip.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{step}</p>
                    </div>
                  ))}
                  <button onClick={() => askAI(selectedTip.title)} className="mt-6 flex items-center gap-2 text-emerald-600 font-black text-sm">
                    <MessageCircle size={16} /> ASK KYUSAFE FOR MORE
                  </button>
                  {chatOpen && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Kyusafe AI Advice</p>
                      {loadingChat ? <p>Thinking...</p> : <p className="text-sm text-slate-700 dark:text-slate-300">{chatResponse}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-8 rounded-[32px] border-2 border-yellow-100 dark:border-yellow-900/30">
                  <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200 leading-relaxed text-center">
                    "{selectedTip.kidFriendly}"
                  </p>
                </div>
              )}

              <button 
                onClick={() => setSelectedTip(null)}
                className="w-full mt-8 py-4 bg-[#002147] dark:bg-blue-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors"
              >
                {t.gotIt}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

