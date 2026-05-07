import React, { useEffect, useRef } from 'react';
import { HeartPulse, ShieldAlert, QrCode, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { translations } from '../translations';

export const SeniorMode: React.FC<{ 
  language?: 'en' | 'tl';
  user?: {
    name: string;
    barangay: string;
    contact: string;
    bloodType?: string;
    address?: string;
    medications?: string;
    allergies?: string;
  } | null;
}> = ({ language = 'en', user }) => {
  const t = translations[language];
  const handleCallHelp = () => {
    window.location.href = 'tel:122'; // QC DRRMO
  };

  const handleSafe = () => {
    alert(t.safetyStatusUpdated);
  };

  const [showQR, setShowQR] = React.useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (showQR && qrCanvasRef.current && user) {
      const medicalData = `
KyuSafe Medical ID
Name: ${user.name}
Blood Type: ${user.bloodType || t.notSpecified}
Emergency Contact: ${user.contact}
Address: ${user.address || t.notSpecified}, Brgy. ${user.barangay}
Medications: ${user.medications || t.noneListed}
Allergies: ${user.allergies || t.noneListed}
      `.trim();
      
      QRCode.toCanvas(qrCanvasRef.current, medicalData, { 
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    }
  }, [showQR, user]);

  return (
    <div className="space-y-10 p-6 bg-black min-h-screen text-white transition-colors">
      {/* High Contrast Header */}
      <div className="py-6 border-b-4 border-yellow-400">
        <h2 className="text-7xl font-black text-yellow-400 leading-none">{t.easyModeTitle}</h2>
        <p className="text-3xl text-white mt-4 font-bold">{t.easyModeSubtitle}</p>
      </div>

      {/* Chunky Action Buttons */}
      <div className="grid grid-cols-1 gap-8">
        <button 
          onClick={handleCallHelp}
          className="bg-yellow-400 text-black p-12 rounded-[40px] flex items-center justify-between shadow-[0_15px_0_rgb(202,138,4)] active:translate-y-2 active:shadow-none transition-all"
        >
          <span className="text-6xl font-black">{t.callForHelp}</span>
          <Phone size={80} />
        </button>

        <button 
          onClick={handleSafe}
          className="bg-white text-black p-12 rounded-[40px] flex items-center justify-between shadow-[0_15px_0_rgb(200,200,200)] active:translate-y-2 active:shadow-none transition-all"
        >
          <span className="text-6xl font-black">{t.iAmSafe}</span>
          <ShieldAlert size={80} />
        </button>
      </div>

      {/* Medical ID Vault */}
      <section className="bg-white/10 p-10 rounded-[40px] border-4 border-white">
        <div className="flex items-center gap-6 mb-10">
          <HeartPulse className="text-red-500 w-16 h-16" />
          <h3 className="text-5xl font-black text-white">{t.medicalID}</h3>
        </div>
        
        <div className="space-y-8">
          <div className="bg-black p-8 rounded-3xl border-2 border-white shadow-sm">
            <p className="text-yellow-400 text-2xl font-bold uppercase tracking-widest">{t.bloodType}</p>
            <p className="text-6xl font-black text-white mt-2">{user?.bloodType || 'N/A'}</p>
          </div>
          
          <div className="bg-black p-8 rounded-3xl border-2 border-white shadow-sm">
            <p className="text-yellow-400 text-2xl font-bold uppercase tracking-widest">{t.medications}</p>
            <div className="text-4xl font-bold mt-4 text-white">
              {user?.medications ? (
                <ul className="space-y-4">
                  {user.medications.split(',').map((m, i) => (
                    <li key={i}>• {m.trim()}</li>
                  ))}
                </ul>
              ) : (
                <p>{t.noneListed}</p>
              )}
            </div>
          </div>

          <div className="bg-black p-8 rounded-3xl border-2 border-white shadow-sm">
            <p className="text-yellow-400 text-2xl font-bold uppercase tracking-widest">{t.allergies}</p>
            <p className="text-4xl font-bold mt-4 text-white">{user?.allergies || t.noneListed}</p>
          </div>
        </div>

        <button 
          onClick={() => setShowQR(true)}
          className="w-full mt-12 bg-yellow-400 text-black py-10 rounded-[40px] flex items-center justify-center gap-6 font-black text-4xl shadow-lg active:scale-95 transition-all"
        >
          <QrCode size={60} />
          {t.showQRCode}
        </button>
      </section>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[40px] p-12 space-y-8 shadow-2xl text-center"
            >
              <h3 className="text-5xl font-black text-black">{t.emergencyMedicalID}</h3>
              <div className="bg-slate-100 p-8 rounded-3xl border-4 border-black flex justify-center">
                <canvas ref={qrCanvasRef} className="w-full max-w-sm" />
              </div>
              <p className="text-black text-3xl font-bold">
                {t.showToResponders}
              </p>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full bg-black text-white py-8 rounded-3xl font-black text-3xl"
              >
                {t.close}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
