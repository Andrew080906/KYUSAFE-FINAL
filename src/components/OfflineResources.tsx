import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Map as MapIcon, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  WifiOff,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SURVIVAL_LIBRARY, QC_EMERGENCY_CONTACTS, QC_SHELTERS } from '../constants';
import { translations } from '../translations';

interface OfflineResource {
  id: string;
  title: string;
  type: 'guide' | 'map' | 'contacts';
  size: string;
  downloadedAt?: string;
}

interface OfflineResourcesProps {
  onBack?: () => void;
  language?: 'en' | 'tl';
  isPremium?: boolean;
}

export const OfflineResources: React.FC<OfflineResourcesProps> = ({ onBack, language = 'en', isPremium = false }) => {
  const t = translations[language];
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [viewingOffline, setViewingOffline] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const downloadToDevice = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }

    let content = '';
    let filename = '';

    if (id === 'survival_guides') {
      content = "KYUSAFE SURVIVAL GUIDES\n\n" + SURVIVAL_LIBRARY.map(tip => `${tip.title.toUpperCase()}\nCategory: ${tip.category}\n\nSteps:\n${tip.steps.map(s => `- ${s}`).join('\n')}\n\nKid-Friendly Tip: ${tip.kidFriendly}\n`).join('\n----------------------------------------\n\n');
      filename = 'KyuSafe_Survival_Guides.txt';
    } else if (id === 'emergency_contacts') {
      content = "KYUSAFE EMERGENCY CONTACTS\n\n" + QC_EMERGENCY_CONTACTS.map(c => `${c.name}\nNumber: ${c.number}\nDescription: ${c.description}`).join('\n\n----------------------------------------\n\n');
      filename = 'KyuSafe_Emergency_Contacts.txt';
    } else if (id === 'qc_hazard_map') {
      content = 'KYUSAFE HAZARD MAP INFO\n\nRegion: Quezon City\nHazards: Flood, Fault Line, Fire\nLast Updated: ' + new Date().toISOString() + '\n\nNote: For full interactive map, please use the app when online.';
      filename = 'KyuSafe_Hazard_Map_Info.txt';
    } else if (id === 'recent_alerts') {
      const savedAlerts = localStorage.getItem('offline_alerts');
      const alerts = savedAlerts ? JSON.parse(savedAlerts) : [];
      content = "KYUSAFE RECENT ALERTS\n\n" + alerts.map((a: any) => `[${a.severity.toUpperCase()}] ${a.type} Alert\nLocation: ${a.location}\nTime: ${new Date(a.timestamp).toLocaleString()}\nMessage: ${a.message}`).join('\n\n----------------------------------------\n\n');
      filename = 'KyuSafe_Recent_Alerts.txt';
    } else if (id === 'evacuation_centers') {
      content = "KYUSAFE EVACUATION CENTERS (QC)\n\n" + QC_SHELTERS.map(s => `${s.name}\nType: ${s.type}\nStatus: ${s.status}\nCapacity: ${s.capacity}% full\nLocation: Lat ${s.lat}, Lng ${s.lng}`).join('\n\n----------------------------------------\n\n');
      filename = 'KyuSafe_Evacuation_Centers.txt';
    }

    if (content) {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('kyusafe_offline_resources');
    if (saved) {
      setDownloadedIds(JSON.parse(saved));
    }
  }, []);

  const saveToOffline = async (id: string) => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }

    setIsDownloading(id);
    
    if (id === 'qc_hazard_map') {
      try {
        if ('caches' in window) {
          const cache = await caches.open('map-tiles');
          // Cache QC map tiles for zoom 12 and 13.
          // Z=12 X=3424..3426, Y=1897..1899
          // Z=13 X=6848..6853, Y=3794..3799
          const tileUrls: string[] = [];
          for (let x = 3424; x <= 3426; x++) {
            for (let y = 1897; y <= 1899; y++) {
              tileUrls.push(`https://a.basemaps.cartocdn.com/light_all/12/${x}/${y}.png`);
            }
          }
          for (let x = 6848; x <= 6853; x++) {
            for (let y = 3794; y <= 3799; y++) {
              tileUrls.push(`https://a.basemaps.cartocdn.com/light_all/13/${x}/${y}.png`);
            }
          }
          await cache.addAll(tileUrls);
        }
      } catch (err) {
        console.warn('Failed to cache map tiles completely:', err);
      }
    }

    // Simulate download delay for other assets or finalize
    setTimeout(() => {
      const newIds = [...downloadedIds, id];
      setDownloadedIds(newIds);
      localStorage.setItem('kyusafe_offline_resources', JSON.stringify(newIds));
      
      // If it's the survival library or contacts, we'd ideally store the actual data
      // For this demo, we'll assume the app's bundle contains the static data, 
      // and "downloading" just marks it as available/cached for offline view logic.
      if (id === 'survival_guides') {
        localStorage.setItem('offline_survival_data', JSON.stringify(SURVIVAL_LIBRARY));
      }
      if (id === 'emergency_contacts') {
        localStorage.setItem('offline_contacts_data', JSON.stringify(QC_EMERGENCY_CONTACTS));
      }
      if (id === 'qc_hazard_map') {
        localStorage.setItem('offline_map_metadata', JSON.stringify({
          lastUpdated: new Date().toISOString(),
          region: 'Quezon City',
          hazards: ['Flood', 'Fault Line', 'Fire']
        }));
      }
      if (id === 'recent_alerts') {
        // Alerts are automatically saved in App.tsx, but we mark them as explicitly downloaded here
        // so the user knows they are available.
      }
      if (id === 'evacuation_centers') {
        localStorage.setItem('offline_evacuation_centers', JSON.stringify(QC_SHELTERS));
      }

      setIsDownloading(null);
    }, 1500);
  };

  const removeOffline = async (id: string) => {
    const newIds = downloadedIds.filter(i => i !== id);
    setDownloadedIds(newIds);
    localStorage.setItem('kyusafe_offline_resources', JSON.stringify(newIds));
    
    if (id === 'survival_guides') localStorage.removeItem('offline_survival_data');
    if (id === 'emergency_contacts') localStorage.removeItem('offline_contacts_data');
    if (id === 'qc_hazard_map') {
      localStorage.removeItem('offline_map_metadata');
      try {
        if ('caches' in window) {
          await caches.delete('map-tiles');
        }
      } catch(e) {}
    }
    if (id === 'recent_alerts') localStorage.removeItem('offline_alerts');
    if (id === 'evacuation_centers') localStorage.removeItem('offline_evacuation_centers');
  };

  const resources: OfflineResource[] = [
    { id: 'survival_guides', title: t.survivalLibraryTitle, type: 'guide', size: '1.2 MB' },
    { id: 'emergency_contacts', title: t.emergencyDirectoryTitle, type: 'contacts', size: '450 KB' },
    { id: 'qc_hazard_map', title: t.hazardMapTitle, type: 'map', size: '4.8 MB' },
    { id: 'recent_alerts', title: t.recentAlertsTitle, type: 'guide', size: '120 KB' },
    { id: 'evacuation_centers', title: t.evacuationCentersTitle, type: 'map', size: '250 KB' },
  ];

  const getTypeText = (type: string) => {
    switch (type) {
      case 'guide': return t.guideType;
      case 'map': return t.mapType;
      case 'contacts': return t.contactsType;
      default: return type;
    }
  };

  return (
    <div className="space-y-6 p-4 pb-32 bg-white dark:bg-slate-900 transition-colors">
      <div className="bg-[#002147] dark:bg-slate-800 p-8 rounded-[40px] text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
          <WifiOff size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black leading-tight">{t.offlineModeTitle}</h2>
          <p className="text-blue-200 font-bold mt-2">{t.offlineModeSubtitle}</p>
          
          <div className="mt-6 flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/10">
            <AlertCircle className="text-yellow-400 flex-shrink-0" size={20} />
            <p className="text-[10px] font-medium leading-relaxed">
              {t.offlineRecommendation}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">{t.availableResources}</h3>
        <div className="space-y-3">
          {resources.map((res) => {
            const isDownloaded = downloadedIds.includes(res.id);
            const downloading = isDownloading === res.id;

            return (
              <div 
                key={res.id}
                className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group transition-all hover:border-blue-200 dark:hover:border-blue-900"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${
                    res.type === 'guide' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                    res.type === 'map' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  }`}>
                    {res.type === 'guide' ? <FileText size={24} /> :
                     res.type === 'map' ? <MapIcon size={24} /> : <Phone size={24} />}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-white">{res.title}</h4>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                      {getTypeText(res.type)} • {res.size}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isDownloaded ? (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-emerald-500 uppercase">{t.ready}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => downloadToDevice(res.id, e)}
                            className="text-[10px] font-bold text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                          >
                            <Download size={10} />
                            {t.export}
                          </button>
                          <button 
                            onClick={() => removeOffline(res.id)}
                            className="text-[10px] font-bold text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                          >
                            {t.remove}
                          </button>
                        </div>
                      </div>
                      <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={18} />
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => saveToOffline(res.id)}
                      disabled={downloading}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all ${
                        downloading 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600' 
                          : 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-200 dark:shadow-none active:scale-95'
                      }`}
                    >
                      {downloading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-slate-400 dark:border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                          {t.saving}
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          {t.download}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Offline Viewer Section */}
      {downloadedIds.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">{t.offlineAccess}</h3>
          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => setViewingOffline(true)}
              className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-[32px] flex items-center justify-between group shadow-xl"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-2xl text-yellow-400">
                  <WifiOff size={24} />
                </div>
                <div className="text-left">
                  <h4 className="font-bold">{t.enterOfflineMode}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{t.viewDownloadedData}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      )}

      {/* Offline Mode Modal */}
      <AnimatePresence>
        {viewingOffline && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-[5000] bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-y-auto"
          >
            <div className="p-6 pb-32 max-w-md mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <WifiOff className="text-blue-600 dark:text-yellow-400" size={28} />
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{t.offlineModeTitle}</h2>
                </div>
                <button 
                  onClick={() => setViewingOffline(false)}
                  className="bg-slate-100 dark:bg-white/10 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 transition-colors text-slate-600 dark:text-white"
                >
                  <span className="font-bold text-sm px-2">{t.exit}</span>
                </button>
              </div>

              {downloadedIds.includes('survival_guides') && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
                    <FileText size={20} /> {t.offlineSurvivalGuides}
                  </h3>
                  <div className="space-y-4">
                    {SURVIVAL_LIBRARY.map(tip => (
                      <div key={tip.id} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                        <h4 className="font-bold text-lg mb-1 text-slate-800 dark:text-white">{tip.title}</h4>
                        <p className="text-xs text-emerald-600 dark:text-emerald-300 uppercase font-bold mb-3">{tip.category}</p>
                        <ul className="space-y-2 mb-3">
                          {tip.steps.map((step, i) => (
                            <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                              <span className="text-emerald-500 font-bold">•</span> {step}
                            </li>
                          ))}
                        </ul>
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">👶 {t.kidFriendlyTip}:</p>
                          <p className="text-sm text-emerald-800 dark:text-emerald-100 mt-1">{tip.kidFriendly}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {downloadedIds.includes('emergency_contacts') && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2">
                    <Phone size={20} /> {t.offlineEmergencyContacts}
                  </h3>
                  <div className="space-y-3">
                    {QC_EMERGENCY_CONTACTS.map((contact, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{contact.name}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{contact.description}</p>
                        </div>
                        <a href={`tel:${contact.number}`} className="bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold text-sm">
                          {contact.number}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {downloadedIds.includes('qc_hazard_map') && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                    <MapIcon size={20} /> {t.offlineHazardMapInfo}
                  </h3>
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/10">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Map downloaded! Close this screen and go to the Map tab to view shelter locations and hazard information, even without an internet connection.</p>
                    <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
                      <li><strong className="text-slate-800 dark:text-white">{t.region}:</strong> Quezon City</li>
                      <li><strong className="text-slate-800 dark:text-white">{t.hazardsTracked}:</strong> Flood, Fault Line, Fire</li>
                      <li><strong className="text-slate-800 dark:text-white">{t.lastSynced}:</strong> {new Date().toLocaleDateString()}</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {downloadedIds.length === 0 && (
                <div className="text-center text-slate-400 dark:text-slate-500 py-12">
                  <p>{t.noOfflineData}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700">
        <h4 className="font-black text-slate-800 dark:text-white text-sm mb-2">{t.storageUsage}</h4>
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-blue-500" 
            style={{ width: `${(downloadedIds.length / resources.length) * 15}%` }}
          ></div>
        </div>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
          {t.mbUsed.replace('{used}', (downloadedIds.length * 2.1).toString()).replace('{total}', '50')}
        </p>
      </div>

      {/* Premium Required Modal */}
      <AnimatePresence>
        {showPremiumModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[6000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl border border-amber-100 dark:border-amber-900/30"
            >
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-8 text-white text-center relative">
                <div className="absolute top-4 right-4">
                  <button onClick={() => setShowPremiumModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                    <Trash2 size={16} className="rotate-45" />
                  </button>
                </div>
                <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                  <Download size={40} />
                </div>
                <h3 className="text-2xl font-black">{t.premiumRequired}</h3>
                <p className="text-amber-100 text-sm font-bold mt-2">{t.premiumRequiredDesc}</p>
              </div>
              <div className="p-8 space-y-4">
                <div className="space-y-3">
                  {[t.advancedAIRouting, t.priorityAlerts, t.offlineMaps].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 size={18} className="text-amber-500" />
                      <span className="text-sm font-bold">{f}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setShowPremiumModal(false)}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all"
                >
                  {t.gotIt}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

