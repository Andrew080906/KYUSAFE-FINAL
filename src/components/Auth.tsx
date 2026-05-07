import React, { useState } from 'react';
import { Shield, MapPin, Phone, User, Lock, Mail, Heart } from 'lucide-react';
import { QC_BARANGAYS } from '../constants';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuth: (user: { 
    id: string;
    name: string; 
    email: string;
    barangay: string; 
    contact: string;
    isPremium: boolean;
    bloodType?: string;
    address?: string;
    medications?: string;
    allergies?: string;
  }) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [barangay, setBarangay] = useState(QC_BARANGAYS[0]);
  const [contact, setContact] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [address, setAddress] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // FIX: Allow both local dev and production origins
      const isLocal = event.origin.includes('localhost');
      const isProd = event.origin.endsWith('.run.app') || event.origin.includes('netlify.app');
      if (!isLocal && !isProd) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.url) {
        try {
          const url = new URL(event.data.url);
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) throw error;
            
            if (data.user) {
              onAuth({
                id: data.user.id,
                email: data.user.email || '',
                name: data.user.user_metadata.full_name || 'User',
                barangay: data.user.user_metadata.barangay || QC_BARANGAYS[0],
                contact: data.user.user_metadata.contact || '',
                isPremium: false,
                bloodType: data.user.user_metadata.blood_type || '',
                address: data.user.user_metadata.address || '',
                medications: data.user.user_metadata.medications || '',
                allergies: data.user.user_metadata.allergies || '',
              });
            }
          }
        } catch (err: any) {
          setError(err.message || 'Failed to process authentication');
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAuth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (loginError) throw loginError;
        
        if (data.user) {
          onAuth({
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata.full_name || 'User',
            barangay: data.user.user_metadata.barangay || QC_BARANGAYS[0],
            contact: data.user.user_metadata.contact || '',
            isPremium: false,
            bloodType: data.user.user_metadata.blood_type || '',
            medications: data.user.user_metadata.medications || '',
            allergies: data.user.user_metadata.allergies || '',
          });
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              barangay,
              contact,
              blood_type: bloodType,
              medications,
              allergies,
            }
          }
        });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          // Sync to profiles table
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: name,
              barangay,
              contact,
              blood_type: bloodType,
              medications,
              allergies,
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            if (profileError.message?.includes('Failed to fetch')) {
              console.warn("Network Error syncing profile to Supabase");
            } else {
              console.error("Error syncing profile to Supabase:", profileError);
            }
          }

          alert('Registration successful! Please check your email for verification.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      const msg = typeof err.message === 'string' && err.message.includes('Failed to fetch')
        ? 'Network error: Unable to connect to authentication server. Please check your internet connection.' 
        : err.message || 'An error occurred';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#E0F7FA] dark:bg-slate-950 overflow-y-auto transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl p-8 border border-slate-100 dark:border-slate-800 my-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#002147] dark:bg-blue-600 p-4 rounded-3xl shadow-lg mb-4">
            <Shield className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-[#002147] dark:text-blue-100">KyuSafe</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Community Resilience Hub</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-8">
          <button 
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${isLogin ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Login
          </button>
          <button 
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 rounded-xl font-bold transition-all ${!isLogin ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@example.com"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white dark:placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white dark:placeholder:text-slate-600"
                required
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white dark:placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">QC Barangay</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <select 
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none dark:text-white"
                  >
                    {QC_BARANGAYS.map(b => <option key={b} value={b} className="dark:bg-slate-900">{b}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Emergency Contact</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <input 
                    type="tel" 
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="0917 XXX XXXX"
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white dark:placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Blood Type</label>
                <div className="relative">
                  <Heart className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <select 
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none dark:text-white"
                    required
                  >
                    <option value="" disabled>Select Blood Type</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t} className="dark:bg-slate-900">{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Full Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <textarea 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House No., Street Name, etc."
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white dark:placeholder:text-slate-600 h-24 resize-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Medications (Optional)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={medications}
                    onChange={(e) => setMedications(e.target.value)}
                    placeholder="e.g. Amlodipine, Metformin"
                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white dark:placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Allergies (Optional)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="e.g. Penicillin, Peanuts"
                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white dark:placeholder:text-slate-600"
                  />
                </div>
              </div>
            </>
          )}

          <button 
            disabled={loading}
            className="w-full py-5 bg-[#002147] dark:bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl hover:bg-[#003366] dark:hover:bg-blue-700 transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-900 text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    // FIX: Dynamic redirect for both local and production
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                      access_type: 'offline',
                      prompt: 'select_account',
                    },
                  }
                });
                if (error) throw error;
                if (data?.url) {
                  const authWindow = window.open(data.url, 'oauth_popup', 'width=600,height=700');
                  if (!authWindow) {
                    setError('Please allow popups for this site to connect your account.');
                  }
                }
              } catch (err: any) {
                setError(err.message || 'Failed to sign in with Google');
              }
            }}
            className="mt-6 w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[24px] font-bold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>
        </div>

        <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-8">
          By continuing, you agree to the <span className="text-emerald-600 dark:text-emerald-500 font-bold">Terms of Service</span>
        </p>
      </div>
    </div>
  );
};