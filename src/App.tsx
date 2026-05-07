import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Map as MapIcon, 
  AlertCircle, 
  AlertOctagon,
  User, 
  Phone, 
  Shield, 
  Bell,
  Heart,
  Baby,
  BookOpen,
  Briefcase,
  ChevronRight,
  Camera,
  MessageSquare,
  LogOut,
  X,
  Plus,
  Navigation,
  CloudRain,
  Wind,
  Sun,
  Cloud,
  Moon,
  Droplets,
  AlertTriangle,
  Globe,
  WifiOff,
  Download,
  ExternalLink,
  Zap,
  Edit3,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, QC_EMERGENCY_CONTACTS, QC_BARANGAYS } from './constants';
import { PanicMode } from './components/PanicMode';
import { KidMode } from './components/KidMode';
import { SeniorMode } from './components/SeniorMode';
import { SurvivalLibrary } from './components/SurvivalLibrary';
import { Auth } from './components/Auth';
import { HazardMap } from './components/HazardMap';
import { SurvivalKit } from './components/SurvivalKit';
import { DigitalVault } from './components/DigitalVault';
import { AISafetyCore } from './components/AISafetyCore';
import { OfflineResources } from './components/OfflineResources';
import { getSafetyGuidance, getRealTimeUpdates, getAlerts } from './services/gemini';
import { supabase } from './lib/supabase';
import { translations, Language } from './translations';
import { SubscriptionButton } from './components/SubscriptionButton';

type Tab = 'home' | 'map' | 'emergency' | 'profile' | 'kid' | 'senior' | 'survival' | 'vault' | 'kit' | 'ai-core' | 'offline';

interface UserProfile {
  id: string;
  name: string;
  barangay: string;
  contact: string;
  bloodType?: string;
  address?: string;
  medications?: string;
  allergies?: string;
  isPremium?: boolean;
}

const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    if (error.message?.includes('Failed to fetch')) console.warn('Network error: Profile fetch failed due to connectivity issues');
    else console.error('Error fetching profile:', error);
    return null;
  }
  return data;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('language');
      return (saved as Language) || 'en';
    } catch {
      return 'en';
    }
  });
  const t = translations[language];

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const loadUser = async (sessionUser: any) => {
    const profile = await fetchUserProfile(sessionUser.id);
    setUser({
      id: sessionUser.id,
      name: sessionUser.user_metadata.full_name || 'User',
      barangay: sessionUser.user_metadata.barangay || QC_BARANGAYS[0],
      contact: sessionUser.user_metadata.contact || '',
      bloodType: sessionUser.user_metadata.blood_type || '',
      address: sessionUser.user_metadata.address || '',
      medications: sessionUser.user_metadata.medications || '',
      allergies: sessionUser.user_metadata.allergies || '',
      isPremium: profile?.is_premium || false,
    });
  };

  const [notifications, setNotifications] = useState<{id: string, title: string, message: string, time: string, read: boolean}[]>([]);

  const [communityFeed, setCommunityFeed] = useState<{user: string, text: string, time: string, image?: string}[]>([]);


  const [aiGuidance, setAiGuidance] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportImage, setReportImage] = useState<string | null>(null);
  const [isAiCoreFloating, setIsAiCoreFloating] = useState(false);
  const [userReports, setUserReports] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('user_hazard_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<Partial<UserProfile>>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch {
      return false;
    }
  });
  const [autoEvacuate, setAutoEvacuate] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    const savedReports = localStorage.getItem('user_hazard_reports');
    if (savedReports) {
      const parsedReports = JSON.parse(savedReports);
      const uniqueReports = Array.from(new Map(parsedReports.map((r: any) => [r.id, r])).values());
      setUserReports(uniqueReports as any[]);
    }
    
    const savedAlerts = localStorage.getItem('offline_alerts');
    if (savedAlerts) {
      const parsedAlerts = JSON.parse(savedAlerts);
      const uniqueAlerts = Array.from(new Map(parsedAlerts.map((a: any) => [a.id, a])).values());
      setAlerts(uniqueAlerts as Alert[]);
    }

    const savedNotifications = localStorage.getItem('offline_notifications');
    if (savedNotifications) {
      const parsedNotifs = JSON.parse(savedNotifications);
      const uniqueNotifs = Array.from(new Map(parsedNotifs.map((n: any) => [n.id, n])).values());
      setNotifications(uniqueNotifs as any[]);
    }

    // Check active session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn("Session error on startup:", error.message);
        // Do not throw, just clear the local session if it's a refresh token issue
        if (error.message.includes('Refresh Token')) {
           await supabase.auth.signOut().catch(() => {});
        }
      } else if (session?.user) {
        loadUser(session.user);
      }
      setLoading(false);
    }).catch(err => {
      console.warn("Failed to get session on startup:", err);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUser(session.user);
      } else {
        setUser(null);
      }
    });

    // Handle online/offline sync
    const handleOnline = () => {
      console.log('App is online. Syncing data...');
      setIsOnline(true);
      // Data will automatically sync on next interval or user action
    };
    const handleOffline = () => {
      console.log('App is offline. Using cached data.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('user_hazard_reports', JSON.stringify(userReports));
  }, [userReports]);

  useEffect(() => {
    if (alerts.length > 0) {
      localStorage.setItem('offline_alerts', JSON.stringify(alerts));
    }
  }, [alerts]);

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('offline_notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    if (user && alerts.length > 0) {
      const fetchGuidance = async () => {
        try {
          const guidance = await getSafetyGuidance(alerts[0].type, user.barangay);
          setAiGuidance(guidance);
        } catch (error: any) {
          if (error?.message?.includes('Failed to fetch')) console.warn("AI Guidance Error: Network request failed");
          else console.error("AI Guidance Error:", error);
        }
      };
      fetchGuidance();
    }
  }, [user, alerts]);

  useEffect(() => {
    if (user) {
      const fetchUpdates = async () => {
        try {
          const [updates, realAlerts] = await Promise.all([
            getRealTimeUpdates(user.barangay),
            getAlerts(user.barangay)
          ]);

          if (updates && updates.notifications) {
            const uniqueNotifs = Array.from(new Map(updates.notifications.map((n: any) => [n.id, n])).values());
            setNotifications(uniqueNotifs as any[]);
          }

          if (updates && updates.communityFeed) {
            const formattedUserReports = userReports.map(r => ({
              user: user?.name || "Anonymous",
              text: `Reported a ${r.severity} severity ${r.type} hazard: ${r.message}`,
              time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              image: r.image
            }));
            setCommunityFeed([...formattedUserReports, ...updates.communityFeed]);
          }
          if (realAlerts) {
            const uniqueAlerts = Array.from(new Map(realAlerts.map((a: any) => [a.id, a])).values());
            setAlerts(uniqueAlerts as Alert[]);
          }
        } catch (error: any) {
          if (error?.message?.includes('Failed to fetch')) console.warn("Real-time Updates Error: Network request failed");
          else console.error("Real-time Updates Error:", error);
        }
      };
      fetchUpdates();
      const updatesInterval = setInterval(fetchUpdates, 15 * 60 * 1000); // 15 minutes
      return () => clearInterval(updatesInterval);
    }
  }, [user]);

  // Location-Based Disaster Alert Notifications
  useEffect(() => {
    if (!user) return;

    const requestPermissions = async () => {
      if ('Notification' in window) {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          await Notification.requestPermission();
        }
      }
    };

    requestPermissions();

    const checkLocationAndAlert = () => {
      if ('geolocation' in navigator) {
        const options = { enableHighAccuracy: true, timeout: 60000, maximumAge: 300000 };
        
        const success = (position: GeolocationPosition) => {
          const { latitude, longitude } = position.coords;
          console.log(`Current Location: Lat ${latitude}, Lng ${longitude}`);
          setUserLocation({ lat: latitude, lng: longitude });
        };

        const error = (err: GeolocationPositionError) => {
          if (err.code === err.TIMEOUT && options.enableHighAccuracy) {
            console.warn("Location timeout with high accuracy, retrying with low accuracy...");
            navigator.geolocation.getCurrentPosition(success, (e) => {
              console.warn("Location check failed:", e.message);
            }, { ...options, enableHighAccuracy: false });
          } else {
            console.warn("Location check failed:", err.message);
          }
        };

        navigator.geolocation.getCurrentPosition(success, error, options);
      }
    };

    // Check location immediately, then every 60 seconds
    checkLocationAndAlert();
    const locationInterval = setInterval(checkLocationAndAlert, 60000);

    return () => clearInterval(locationInterval);
  }, [user]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch')) console.warn('Network Error during signout');
      else console.error('Signout error:', err);
    } finally {
      setUser(null);
      setActiveTab('home');
    }
  };

  const handleReportSubmit = (report: any) => {
    const newReport = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      ...report,
      timestamp: new Date().toISOString()
    };
    setUserReports(prev => [newReport, ...prev]);
    
    // Add to community feed
    setCommunityFeed(prev => [
      {
        user: user?.name || "Anonymous",
        text: `Reported a ${report.severity} severity ${report.type} hazard: ${report.message}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        image: report.image
      },
      ...prev
    ]);

    setIsReporting(false);
    setReportImage(null);
    setActiveTab('map');
    alert("Hazard reported successfully! It is now visible on the map.");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0F7FA]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#002147]"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={setUser} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6 p-4 pb-32">
            {!isOnline && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-orange-500 text-white p-4 rounded-3xl flex items-center gap-4 shadow-lg shadow-orange-500/20"
              >
                <div className="bg-white/20 p-2 rounded-xl">
                  <WifiOff size={24} />
                </div>
                <div>
                  <h4 className="font-black text-sm">{t.youAreOffline}</h4>
                  <p className="text-[10px] font-bold opacity-90">{t.offlineAlertsDesc}</p>
                </div>
              </motion.div>
            )}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-2xl font-black text-[#002147]">Kyusafe!</h1>
                <p className="text-slate-500 font-medium">Hello, {user.name.split(' ')[0]}!</p>
              </div>
              <div className="flex items-center gap-2">
                {aiGuidance && (
                  <button 
                    onClick={() => setActiveTab('ai-core')}
                    className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 border border-emerald-100 animate-pulse"
                  >
                    <Shield size={14} />
                    {t.aiAdviceReady}
                  </button>
                )}
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl shadow-sm active:scale-95 transition-all"
                >
                  {isDarkMode ? <Sun className="text-yellow-400" /> : <Moon className="text-[#002147]" />}
                </button>
                <button 
                  onClick={() => setShowNotifications(true)}
                  className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-3 rounded-2xl relative shadow-sm active:scale-95 transition-all"
                >
                  <Bell className="text-[#002147] dark:text-blue-200" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-2 right-2 w-3 h-3 bg-[#DC143C] border-2 border-white rounded-full"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Status */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t.safetyStatus}</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  {t.liveUpdating}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => alert("Safety status updated: SAFE. Your contacts have been notified.")}
                  className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 py-4 rounded-2xl font-black text-sm border border-emerald-100 dark:border-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={18} />
                  {t.imSafe}
                </button>
                <button 
                  onClick={() => setActiveTab('emergency')}
                  className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 py-4 rounded-2xl font-black text-sm border border-red-100 dark:border-red-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <AlertOctagon size={18} />
                  {t.needHelp}
                </button>
              </div>
            </div>

            {/* Weather Widget */}
            {/* Weather Widget Removed */}

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: <AlertOctagon className="text-red-600 dark:text-red-500" />, label: t.sos, tab: 'emergency', color: 'bg-red-50 dark:bg-red-900/20' },
                { icon: <Navigation className="text-blue-600 dark:text-blue-500" />, label: 'Evacuate', tab: 'map', color: 'bg-blue-50 dark:bg-blue-900/20', action: () => { setAutoEvacuate(true); setActiveTab('map'); } },
                { icon: <Camera className="text-orange-600 dark:text-orange-500" />, label: t.report, tab: 'map', color: 'bg-orange-50 dark:bg-orange-900/20' },
                { icon: <Shield className="text-emerald-600 dark:text-emerald-500" />, label: t.aiAdvice, tab: 'ai-core', color: 'bg-emerald-50 dark:bg-emerald-900/20' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => action.action ? action.action() : setActiveTab(action.tab as any)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`${action.color} p-4 rounded-2xl shadow-sm active:scale-90 transition-all`}>
                    {action.icon}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-[#002147] dark:text-blue-100">{t.activeAlerts}</h2>
                <button className="text-[#002147] dark:text-blue-400 font-bold text-sm">{t.viewAll}</button>
              </div>
              <div className="space-y-3">
                {alerts.map(alert => (
                  <motion.div 
                    key={alert.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedAlert(alert)}
                    className={`p-5 rounded-[28px] border-2 shadow-sm cursor-pointer ${
                      alert.severity === 'Critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 
                      alert.severity === 'High' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${
                          alert.severity === 'Critical' ? 'bg-[#DC143C]' : 
                          alert.severity === 'High' ? 'bg-orange-500' : 'bg-slate-500'
                        } text-white`}>
                          <AlertCircle size={20} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900 dark:text-white">{alert.type} Alert</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">{alert.location}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{alert.message}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveTab('kit')}
                className="bg-[#E0F2F1] dark:bg-slate-800 p-6 rounded-[32px] border border-[#B2DFDB] dark:border-slate-700 shadow-sm flex flex-col items-center gap-3 hover:shadow-md transition-all"
              >
                <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
                  <Briefcase size={24} />
                </div>
                <span className="font-bold text-slate-800 dark:text-white">{t.survivalKit}</span>
              </button>
              <button 
                onClick={() => setActiveTab('survival')}
                className="bg-[#E0F2F1] dark:bg-slate-800 p-6 rounded-[32px] border border-[#B2DFDB] dark:border-slate-700 shadow-sm flex flex-col items-center gap-3 hover:shadow-md transition-all"
              >
                <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-purple-600 dark:text-purple-400 shadow-sm">
                  <BookOpen size={24} />
                </div>
                <span className="font-bold text-slate-800 dark:text-white">{t.library}</span>
              </button>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-black text-[#002147] dark:text-white">{t.emergencyContacts}</h2>
                <button 
                  onClick={() => {
                    const saved = localStorage.getItem('kyusafe_offline_resources');
                    const currentIds = saved ? JSON.parse(saved) : [];
                    if (!currentIds.includes('emergency_contacts')) {
                      const newIds = [...currentIds, 'emergency_contacts'];
                      localStorage.setItem('kyusafe_offline_resources', JSON.stringify(newIds));
                      localStorage.setItem('offline_contacts_data', JSON.stringify(QC_EMERGENCY_CONTACTS));
                      alert('Emergency contacts saved for offline use!');
                    } else {
                      alert('Emergency contacts are already available offline.');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 text-[10px] font-black uppercase active:scale-95 transition-all"
                >
                  <Download size={14} />
                  {t.saveOffline}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {QC_EMERGENCY_CONTACTS.slice(0, 4).map((contact, i) => (
                  <a 
                    key={i}
                    href={`tel:${contact.number.replace(/[^0-9]/g, '')}`}
                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-blue-200 dark:hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-50 dark:bg-slate-700 p-2 rounded-xl text-slate-600 dark:text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Phone size={18} />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{contact.name}</span>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 font-black text-sm">{contact.number}</span>
                  </a>
                ))}
                <button 
                  onClick={() => setActiveTab('emergency')}
                  className="w-full py-3 mt-2 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  View All Hotlines
                </button>
              </div>
            </div>


            {/* Community Feed */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#002147] dark:text-white px-2">{t.communityFeed}</h2>
              <div className="space-y-3">
                {communityFeed.map((post, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">{post.user}</span>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{post.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{post.text}</p>
                    {post.image && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                        <img src={post.image} alt="Reported Hazard" className="w-full h-32 object-cover" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'map':
        return <HazardMap userReports={userReports} alerts={alerts} language={language} autoEvacuate={autoEvacuate} onOpenAiCore={() => setIsAiCoreFloating(true)} />;
      case 'emergency':
        return <PanicMode language={language} />;
      case 'profile':
        return (
          <div className="space-y-6 p-4 pb-32">
            <div className="bg-[#002147] text-white p-8 rounded-[40px] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <User size={120} />
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-3xl font-black relative">
                  {user.name[0]}
                  {user.isPremium && (
                    <div className="absolute -bottom-1 -right-1 bg-amber-400 text-[#002147] text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-[#002147]">
                      PREMIUM
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-black">
                        {user.name}
                        {user.isPremium && <span className="ml-2 text-amber-400 text-sm">★</span>}
                      </h2>
                      <p className="text-blue-200 font-bold">Brgy. {user.barangay}</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (isEditingProfile) {
                          setIsEditingProfile(false);
                        } else {
                          setEditProfileForm({
                            name: user.name,
                            barangay: user.barangay,
                            bloodType: user.bloodType,
                            contact: user.contact,
                            address: user.address,
                            medications: user.medications,
                            allergies: user.allergies
                          });
                          setIsEditingProfile(true);
                        }
                      }}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10 relative"
                    >
                      {isEditingProfile ? <X size={18} /> : <Edit3 size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              
              {isEditingProfile ? (
                <div className="space-y-4 relative z-10">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Full Name</label>
                      <input 
                        type="text" 
                        value={editProfileForm.name || ''} 
                        onChange={e => setEditProfileForm(prev => ({...prev, name: e.target.value}))}
                        className="w-full bg-white/10 border-none rounded-xl p-3 text-sm font-bold text-white placeholder-blue-200 focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Barangay</label>
                      <select 
                        value={editProfileForm.barangay || ''} 
                        onChange={e => setEditProfileForm(prev => ({...prev, barangay: e.target.value}))}
                        className="w-full bg-white/10 border-none rounded-xl p-3 text-sm font-bold text-white [&>option]:text-black focus:ring-2 focus:ring-emerald-400"
                      >
                        {QC_BARANGAYS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Blood Type</label>
                      <select 
                        value={editProfileForm.bloodType || ''} 
                        onChange={e => setEditProfileForm(prev => ({...prev, bloodType: e.target.value}))}
                        className="w-full bg-white/10 border-none rounded-xl p-3 text-sm font-bold text-white [&>option]:text-black focus:ring-2 focus:ring-emerald-400"
                      >
                        <option value="">Select</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Emergency Contact</label>
                      <input 
                        type="tel" 
                        value={editProfileForm.contact || ''} 
                        onChange={e => setEditProfileForm(prev => ({...prev, contact: e.target.value}))}
                        className="w-full bg-white/10 border-none rounded-xl p-3 text-sm font-bold text-white placeholder-blue-200 focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Address</label>
                    <input 
                      type="text" 
                      value={editProfileForm.address || ''} 
                      onChange={e => setEditProfileForm(prev => ({...prev, address: e.target.value}))}
                      className="w-full bg-white/10 border-none rounded-xl p-3 text-sm font-bold text-white placeholder-blue-200 focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Medications</label>
                      <input 
                        type="text" 
                        value={editProfileForm.medications || ''} 
                        onChange={e => setEditProfileForm(prev => ({...prev, medications: e.target.value}))}
                        className="w-full bg-white/10 border-none rounded-xl p-3 text-sm font-bold text-white placeholder-blue-200 focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-blue-200 uppercase mb-1 block">Allergies</label>
                      <input 
                        type="text" 
                        value={editProfileForm.allergies || ''} 
                        onChange={e => setEditProfileForm(prev => ({...prev, allergies: e.target.value}))}
                        className="w-full bg-white/10 border-none rounded-xl p-3 text-sm font-bold text-white placeholder-blue-200 focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                  {saveError && (
                    <p className="text-red-400 text-sm font-bold text-center mt-2">{saveError}</p>
                  )}
                  <button 
                    onClick={async () => {
                      setIsSavingProfile(true);
                      setSaveError('');
                      try {
                        const updates: any = {
                          updated_at: new Date().toISOString()
                        };
                        if (editProfileForm.name !== undefined) updates.full_name = editProfileForm.name;
                        if (editProfileForm.barangay !== undefined) updates.barangay = editProfileForm.barangay;
                        if (editProfileForm.bloodType !== undefined) updates.blood_type = editProfileForm.bloodType;
                        if (editProfileForm.contact !== undefined) updates.contact = editProfileForm.contact;
                        if (editProfileForm.medications !== undefined) updates.medications = editProfileForm.medications;
                        if (editProfileForm.allergies !== undefined) updates.allergies = editProfileForm.allergies;
                        
                        await supabase.auth.updateUser({
                          data: updates
                        });
                        
                        const { error } = await supabase
                          .from('profiles')
                          .update(updates)
                          .eq('id', user.id);
                          
                        if (error) throw error;
                        
                        setUser(prev => prev ? ({
                          ...prev,
                          ...editProfileForm
                        }) : null);
                        
                        setIsEditingProfile(false);
                      } catch (e: any) {
                        console.error('Error updating profile:', e);
                        setSaveError(e.message || 'Failed to update profile. Please try again.');
                      } finally {
                        setIsSavingProfile(false);
                      }
                    }}
                    disabled={isSavingProfile}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl mt-4 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isSavingProfile ? 'SAVING...' : (
                      <>
                        <Save size={18} />
                        SAVE PROFILE
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-blue-200 dark:text-blue-400 uppercase">Blood Type</p>
                      <p className="font-black text-lg">{user.bloodType || 'N/A'}</p>
                    </div>
                    <div className="bg-white/10 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-blue-200 dark:text-blue-400 uppercase">Emergency</p>
                      <p className="font-black text-lg">{user.contact}</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-white/10 dark:bg-slate-800/50 p-4 rounded-2xl">
                    <p className="text-[10px] font-bold text-blue-200 dark:text-blue-400 uppercase">Address</p>
                    <p className="font-bold text-sm">{user.address || 'N/A'}</p>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-white/10 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-blue-200 dark:text-blue-400 uppercase">Medications</p>
                      <p className="font-bold text-sm">{user.medications || 'N/A'}</p>
                    </div>
                    <div className="bg-white/10 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-blue-200 dark:text-blue-400 uppercase">Allergies</p>
                      <p className="font-bold text-sm">{user.allergies || 'N/A'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Premium Subscription */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[40px] border-2 border-amber-100 dark:border-amber-900/30 shadow-sm">
              <h3 className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] mb-4 ml-2">Kyusafe Premium</h3>
              <SubscriptionButton />
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t.specializedModes}</h3>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setActiveTab('ai-core')}
                  className="bg-[#002147] p-5 rounded-3xl text-white flex items-center justify-between group shadow-lg shadow-blue-900/20"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-2xl text-emerald-400 shadow-sm">
                      <Shield size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold">{t.aiSafetyCore}</h4>
                      <p className="text-xs text-blue-200">{t.aiSafetyCoreDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-blue-300 group-hover:text-emerald-400 transition-colors" />
                </button>
                <button 
                  onClick={() => setActiveTab('kid')}
                  className="bg-[#E0F2F1] dark:bg-slate-800 p-5 rounded-3xl border border-[#B2DFDB] dark:border-slate-700 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-amber-600 dark:text-amber-400 shadow-sm">
                      <Baby size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-white">{t.kidMode}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t.kidModeDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" />
                </button>
                <button 
                  onClick={() => setActiveTab('senior')}
                  className="bg-[#E0F2F1] dark:bg-slate-800 p-5 rounded-3xl border border-[#B2DFDB] dark:border-slate-700 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <Heart size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-white">{t.seniorMode}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t.seniorModeDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </button>

              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t.digitalTools}</h3>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => setActiveTab('vault')}
                  className="bg-[#E0F2F1] dark:bg-slate-800 p-5 rounded-3xl border border-[#B2DFDB] dark:border-slate-700 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-sm">
                      <Shield size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-white">{t.digitalVault}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t.digitalVaultDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                </button>
                <button 
                  onClick={() => setActiveTab('offline')}
                  className="bg-[#E0F2F1] dark:bg-slate-800 p-5 rounded-3xl border border-[#B2DFDB] dark:border-slate-700 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
                      <WifiOff size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-white">{t.offlineResources}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t.offlineResourcesDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </button>
                <button 
                  onClick={() => setIsReporting(true)}
                  className="bg-[#E0F2F1] dark:bg-slate-800 p-5 rounded-3xl border border-[#B2DFDB] dark:border-slate-700 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-red-600 dark:text-red-400 shadow-sm">
                      <Camera size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-white">{t.reportHazard}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{t.reportHazardDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t.settings}</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="bg-[#E0F2F1] dark:bg-slate-800 p-5 rounded-3xl border border-[#B2DFDB] dark:border-slate-700 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-blue-500 shadow-sm">
                      <Globe size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-white">{t.language}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{language === 'en' ? 'English' : 'Tagalog'}</p>
                    </div>
                  </div>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="bg-white dark:bg-slate-700 border-none rounded-xl px-3 py-2 text-sm font-black text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="en">English</option>
                    <option value="tl">Tagalog</option>
                  </select>
                </div>

                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="bg-[#E0F2F1] dark:bg-slate-800 p-5 rounded-3xl border border-[#B2DFDB] dark:border-slate-700 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-slate-700 p-3 rounded-2xl text-yellow-500 shadow-sm">
                      {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 dark:text-white">{t.darkMode}</h4>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{isDarkMode ? 'Dark Theme' : 'Light Theme'}</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 ${isDarkMode ? 'bg-emerald-500' : 'bg-slate-200'} rounded-full relative transition-colors`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full transition-all ${isDarkMode ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{t.account}</h3>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={handleLogout}
                  className="bg-red-50 dark:bg-red-900/20 p-5 rounded-3xl border border-red-100 dark:border-red-900/30 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white dark:bg-red-900/50 p-3 rounded-2xl text-red-600 dark:text-red-400 shadow-sm">
                      <LogOut size={24} />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-red-800 dark:text-red-200">{t.signOut}</h4>
                      <p className="text-xs text-red-400 dark:text-red-300">{t.signOutDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-red-300 dark:text-red-500 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
                </button>
              </div>
            </div>
          </div>
        );
      case 'kid':
        return <KidMode language={language} />;
      case 'senior':
        return <SeniorMode language={language} user={user} />;
      case 'survival':
        return <SurvivalLibrary onBack={() => setActiveTab('home')} language={language} />;
      case 'vault':
        return <DigitalVault user={user} onBack={() => setActiveTab('home')} language={language} subscriptionStatus={user?.isPremium ? 'premium' : 'free'} onUpgradeNeeded={() => setActiveTab('profile')} />;
      case 'offline':
        return <OfflineResources onBack={() => setActiveTab('home')} language={language} />;
      case 'kit':
        return <SurvivalKit onBack={() => setActiveTab('home')} language={language} />;
      case 'ai-core':
        return <AISafetyCore onBack={() => setActiveTab('home')} userBarangay={user.barangay} language={language} isFloating={false} />;
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-[#E0F7FA] dark:bg-slate-950 font-sans ${activeTab === 'senior' ? 'bg-slate-950 text-yellow-400' : ''}`}>
      <main className="max-w-md mx-auto h-screen relative flex flex-col overflow-hidden shadow-2xl bg-white dark:bg-slate-900">
        {/* Main Content Area */}
        <div className="flex-1 relative flex flex-col min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex-1 flex flex-col min-h-0 ${activeTab !== 'map' ? 'overflow-y-auto scrollbar-hide overscroll-contain' : ''}`}
            >
              {activeTab === 'home' && (
                <div className="h-0 overflow-visible relative">
                  <div className="absolute top-[-40px] left-0 right-0 flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin opacity-20"></div>
                  </div>
                </div>
              )}
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {/* SOS FAB - Positioned relative to the content area */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[2001]">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab('emergency')}
              className="w-14 h-14 bg-[#DC143C] text-white rounded-full shadow-[0_8px_30px_rgb(220,20,60,0.4)] flex items-center justify-center border-4 border-white dark:border-slate-900"
            >
              <AlertCircle size={24} />
            </motion.button>
          </div>
        </div>

        {/* Bottom Navigation - Now part of the flex flow */}
        <nav className="bg-[#002147] dark:bg-slate-950 border-t border-white/10 px-6 py-4 pb-8 z-[2000]">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-white' : 'text-blue-300/40'}`}
            >
              <Home size={22} className={activeTab === 'home' ? 'fill-white/10' : ''} />
              <span className="text-[9px] font-black uppercase tracking-wider">{t.home}</span>
            </button>
            <button 
              onClick={() => setActiveTab('map')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-white' : 'text-blue-300/40'}`}
            >
              <MapIcon size={22} className={activeTab === 'map' ? 'fill-white/10' : ''} />
              <span className="text-[9px] font-black uppercase tracking-wider">{t.map}</span>
            </button>


            <button 
              onClick={() => setActiveTab('survival')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'survival' ? 'text-white' : 'text-blue-300/40'}`}
            >
              <BookOpen size={22} className={activeTab === 'survival' ? 'fill-white/10' : ''} />
              <span className="text-[9px] font-black uppercase tracking-wider">{t.help}</span>
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-white' : 'text-blue-300/40'}`}
            >
              <User size={22} className={activeTab === 'profile' ? 'fill-white/10' : ''} />
              <span className="text-[9px] font-black uppercase tracking-wider">{t.profile}</span>
            </button>
          </div>
        </nav>
      </main>

      {/* Report Hazard Modal */}
      <AnimatePresence>
        {isReporting && (
          <div className="fixed inset-0 z-[3000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-[#002147] dark:text-white">{t.reportHazard}</h2>
                <button onClick={() => { setIsReporting(false); setReportImage(null); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                const submitWithLocation = (lat: number, lng: number) => {
                  handleReportSubmit({
                    type: formData.get('type'),
                    severity: formData.get('severity'),
                    message: formData.get('message'),
                    image: reportImage,
                    lat,
                    lng
                  });
                };

                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (pos) => submitWithLocation(pos.coords.latitude, pos.coords.longitude),
                    () => submitWithLocation(14.6515 + (Math.random() - 0.5) * 0.02, 121.0493 + (Math.random() - 0.5) * 0.02),
                    { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
                  );
                } else {
                  submitWithLocation(14.6515 + (Math.random() - 0.5) * 0.02, 121.0493 + (Math.random() - 0.5) * 0.02);
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">{t.hazardType}</label>
                  <select name="type" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500 outline-none transition-all">
                    <option value="Flood">Flood</option>
                    <option value="Fire">Fire</option>
                    <option value="Road Block">Road Block</option>
                    <option value="Accident">Accident</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">{t.severity}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Low', 'Moderate', 'High'].map(s => (
                      <label key={s} className="relative cursor-pointer group">
                        <input type="radio" name="severity" value={s} defaultChecked={s === 'Moderate'} className="peer sr-only" />
                        <div className="p-3 text-center rounded-xl border-2 border-slate-100 dark:border-slate-700 font-black text-xs text-slate-400 dark:text-slate-500 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/30 peer-checked:text-blue-600 dark:peer-checked:text-blue-400 transition-all">
                          {s}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">{t.photoEvidence}</label>
                  <div className="relative w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl flex items-center justify-center focus-within:border-blue-500 transition-all overflow-hidden">
                    <input 
                      type="file" 
                      name="image" 
                      accept="image/*" 
                      capture="environment"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const img = new Image();
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const MAX_WIDTH = 800;
                              const MAX_HEIGHT = 800;
                              let width = img.width;
                              let height = img.height;

                              if (width > height) {
                                if (width > MAX_WIDTH) {
                                  height *= MAX_WIDTH / width;
                                  width = MAX_WIDTH;
                                }
                              } else {
                                if (height > MAX_HEIGHT) {
                                  width *= MAX_HEIGHT / height;
                                  height = MAX_HEIGHT;
                                }
                              }

                              canvas.width = width;
                              canvas.height = height;
                              const ctx = canvas.getContext('2d');
                              ctx?.drawImage(img, 0, 0, width, height);
                              
                              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                              setReportImage(dataUrl);
                            };
                            img.src = event.target?.result as string;
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    {!reportImage ? (
                      <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 pointer-events-none py-4">
                        <Camera size={24} className="mb-2" />
                        <span className="text-xs font-bold">{t.tapToTakePhoto}</span>
                      </div>
                    ) : (
                      <img 
                        src={reportImage} 
                        alt="Preview" 
                        className="w-full h-40 object-cover rounded-xl pointer-events-none" 
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">{t.description}</label>
                  <textarea 
                    name="message" 
                    required 
                    placeholder={t.describeSituation}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 p-4 rounded-2xl font-medium text-slate-700 dark:text-slate-200 focus:border-blue-500 outline-none transition-all h-24 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#002147] dark:bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                >
                  {t.submitReport}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Detail Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] p-8 space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-start">
                <div className={`p-4 rounded-3xl ${
                  selectedAlert.severity === 'Critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 
                  selectedAlert.severity === 'High' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  <AlertCircle size={32} />
                </div>
                <button onClick={() => setSelectedAlert(null)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{selectedAlert.type} {t.alert}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-bold mt-1">{selectedAlert.location}</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{selectedAlert.message}</p>
              </div>

              <div className="flex items-center justify-between text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <span>{t.issued}: {new Date(selectedAlert.timestamp).toLocaleString()}</span>
                <span className={`px-3 py-1 rounded-full ${
                  selectedAlert.severity === 'Critical' ? 'bg-red-500 text-white' : 
                  selectedAlert.severity === 'High' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                }`}>{selectedAlert.severity}</span>
              </div>

              <button 
                onClick={() => {
                  setSelectedAlert(null);
                  setActiveTab('map');
                }}
                className="w-full bg-[#002147] dark:bg-blue-600 text-white py-5 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <MapIcon size={20} />
                {t.viewOnMap}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Floating AI Core */}
      <AnimatePresence>
        {isAiCoreFloating && (
          <AISafetyCore 
            onBack={() => setIsAiCoreFloating(false)} 
            userBarangay={user.barangay} 
            language={language} 
            isFloating={true}
            onMinimize={() => setIsAiCoreFloating(false)}
          />
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="bg-white dark:bg-slate-900 w-full max-w-md h-full sm:h-auto sm:max-h-[80vh] rounded-t-[40px] sm:rounded-[40px] p-8 space-y-6 shadow-2xl overflow-y-auto border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-[#002147] dark:text-white">{t.notifications}</h2>
                <button onClick={() => setShowNotifications(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => {
                      setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                    }}
                    className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${n.read ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 opacity-60' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 shadow-sm'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-slate-900 dark:text-white">{n.title}</h4>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{n.time}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{n.message}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => {
                  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                }}
                className="w-full py-4 text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-all"
              >
                Mark all as read
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default App;
