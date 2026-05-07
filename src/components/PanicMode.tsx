import React, { useState, useEffect, useRef } from 'react';
import { AlertOctagon, MapPin, Heart, ShieldCheck, MessageCircle, Navigation, Phone } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { translations } from '../translations';
import { QC_EMERGENCY_CONTACTS } from '../constants';

interface PanicModeProps {
  language?: 'en' | 'tl';
}

export const PanicMode: React.FC<PanicModeProps> = ({ language = 'en' }) => {
  const t = translations[language];
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const updateLocationInDB = async (lat: number, lng: number) => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        if (error.message.includes('Refresh Token')) {
          await supabase.auth.signOut().catch(() => {});
        }
        return;
      }
      if (!user) return;

      await supabase.from('emergency_tracking').insert({
        user_id: user.id,
        latitude: lat,
        longitude: lng,
        status: isSafe === false ? 'help_needed' : 'sos_triggered',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch')) console.warn('Network Error: Failed to update location in DB');
      else console.error('Failed to update location in DB:', err);
    }
  };

  const handleGeolocationError = (err: GeolocationPositionError) => {
    let errorMessage = t.unknownLocationError;
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = t.locationAccessDenied;
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = t.locationUnavailable;
        break;
      case err.TIMEOUT:
        errorMessage = t.locationTimeout;
        break;
      default:
        errorMessage = t.unknownLocationError;
        break;
    }
    setError(errorMessage);
    console.error('Geolocation error:', err);
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError(t.geolocationNotSupported);
      return;
    }

    if (watchId.current !== null) return;

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        updateLocationInDB(latitude, longitude);
        setError(null);
      },
      handleGeolocationError,
      {
        enableHighAccuracy: false,
        timeout: 60000,
        maximumAge: 300000
      }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  useEffect(() => {
    if (isSending || isSafe === false) {
      startTracking();
    } else if (isSafe === true) {
      stopTracking();
    }

    return () => stopTracking();
  }, [isSending, isSafe]);

  const [pressProgress, setPressProgress] = useState(0);
  const pressTimer = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    if (isSending) return;
    setPressProgress(0);
    pressTimer.current = setInterval(() => {
      setPressProgress(prev => {
        if (prev >= 100) {
          clearInterval(pressTimer.current!);
          handleSOS();
          return 100;
        }
        return prev + 2;
      });
    }, 20);
  };

  const endPress = () => {
    if (pressTimer.current) {
      clearInterval(pressTimer.current);
      if (pressProgress < 100) {
        setPressProgress(0);
      }
    }
  };

  const handleSOS = () => {
    setIsSending(true);
    setPressProgress(0);
    
    if (!navigator.geolocation) {
      setError(t.geolocationNotSupported);
      setIsSending(false);
      return;
    }

    const options = { enableHighAccuracy: true, timeout: 60000, maximumAge: 300000 };

    const success = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lng: longitude });
      updateLocationInDB(latitude, longitude);
      setError(null);
      
      setTimeout(() => {
        setIsSending(false);
        alert(t.sosSent);
      }, 2000);
    };

    const error = (err: GeolocationPositionError) => {
      if (err.code === err.TIMEOUT && options.enableHighAccuracy) {
        console.warn("SOS location timeout with high accuracy, retrying with low accuracy...");
        navigator.geolocation.getCurrentPosition(success, (e) => {
          handleGeolocationError(e);
          setIsSending(false);
          alert(t.failedToGetLocation);
        }, { ...options, enableHighAccuracy: false });
      } else {
        handleGeolocationError(err);
        setIsSending(false);
        alert(t.failedToGetLocation);
      }
    };

    // Initial location grab
    navigator.geolocation.getCurrentPosition(success, error, options);
  };

  return (
    <div className="space-y-8 p-4">
      {/* Big Red Button */}
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative">
          {/* Progress Ring */}
          <svg className="absolute -inset-4 w-72 h-72 -rotate-90">
            <circle
              cx="144"
              cy="144"
              r="136"
              fill="none"
              stroke="rgba(220, 20, 60, 0.1)"
              strokeWidth="8"
            />
            <motion.circle
              cx="144"
              cy="144"
              r="136"
              fill="none"
              stroke="#DC143C"
              strokeWidth="8"
              strokeDasharray="854.5"
              animate={{ strokeDashoffset: 854.5 - (854.5 * pressProgress) / 100 }}
              transition={{ type: "spring", bounce: 0, duration: 0.1 }}
            />
          </svg>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onMouseDown={startPress}
            onMouseUp={endPress}
            onMouseLeave={endPress}
            onTouchStart={startPress}
            onTouchEnd={endPress}
            disabled={isSending}
            className="w-64 h-64 rounded-full bg-[#DC143C] shadow-[0_0_50px_rgba(220,20,60,0.3)] flex flex-col items-center justify-center text-white border-8 border-white/20 hover:bg-[#B22222] transition-colors disabled:opacity-50 relative z-10"
          >
            {isSending && (
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-full bg-white/20"
              />
            )}
            <AlertOctagon size={80} />
            <span className="text-4xl font-black mt-2 tracking-tighter">SOS</span>
            <span className="text-xs font-bold uppercase mt-1">
              {isSending ? t.sending : t.holdToTrigger}
            </span>
          </motion.button>
        </div>
        
        {location && (
          <div className="mt-4 flex items-center gap-2 text-[#002147] font-bold text-xs bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm">
            <Navigation size={14} className="text-[#DC143C] animate-pulse" />
            <span>{t.tracking}: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl max-w-xs text-center">
            <p className="text-red-600 text-xs font-bold uppercase tracking-wider mb-1">
              {t.locationError}
            </p>
            <p className="text-red-500 text-xs font-medium">
              {error}
            </p>
          </div>
        )}

        <p className="text-slate-500 text-sm mt-6 font-medium text-center max-w-xs">
          {t.panicModeDesc}
        </p>
      </div>

      {/* I'm Safe / Help Me */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setIsSafe(true)}
          className={`p-8 rounded-3xl flex flex-col items-center gap-3 transition-all ${
            isSafe === true ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-emerald-600 border-2 border-emerald-100'
          }`}
        >
          <ShieldCheck size={40} />
          <span className="text-2xl font-bold">{t.imSafe}</span>
          <span className="text-[10px] uppercase font-bold opacity-70">{t.stopsGPSTracking}</span>
        </button>
        
        <button 
          onClick={() => setIsSafe(false)}
          className={`p-8 rounded-3xl flex flex-col items-center gap-3 transition-all ${
            isSafe === false ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'bg-white text-amber-600 border-2 border-amber-100'
          }`}
        >
          <MessageCircle size={40} />
          <span className="text-2xl font-bold">{t.needHelp}</span>
          <span className="text-[10px] uppercase font-bold opacity-70">{t.sharesLocation}</span>
        </button>
      </div>

      {/* Emergency Hotlines */}
      <div className="mt-8">
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Phone size={24} className="text-[#DC143C]" />
          {t.emergencyHotlines}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {QC_EMERGENCY_CONTACTS.map((contact, i) => (
            <a 
              key={i} 
              href={`tel:${contact.number.replace(/[^0-9]/g, '')}`}
              className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between hover:border-[#DC143C] hover:shadow-md transition-all group"
            >
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">{contact.name}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{contact.description}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 text-[#DC143C] px-3 py-1.5 rounded-xl font-black text-sm group-hover:bg-[#DC143C] group-hover:text-white transition-colors flex items-center gap-2">
                <Phone size={14} />
                {contact.number}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
