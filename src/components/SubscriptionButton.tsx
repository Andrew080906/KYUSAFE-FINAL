import React, { useState } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Ensure this path is correct

export const SubscriptionButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Get the current logged-in user from Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Please log in to upgrade to Premium.");
      }

      // 2. Your Specific Stripe Payment Link
      const stripeLink = "https://buy.stripe.com/test_7sY28q0rY1J29Pf5xKfbq01"; 
      
      // 3. Attach the userId so the Edge Function knows who paid
      // This creates the link: https://buy.stripe.com/...01?client_reference_id=UUID
      const finalUrl = `${stripeLink}?client_reference_id=${user.id}`;

      // 4. Redirect to Stripe (Bypasses Vercel 405 error)
      window.location.href = finalUrl;
      
    } catch (err: any) {
      const msg = typeof err.message === 'string' && err.message.includes('Failed to fetch')
        ? 'Network error: Unable to connect verification server.'
        : err.message || "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={24} />
        ) : (
          <Zap className="group-hover:scale-110 transition-transform" size={24} fill="currentColor" />
        )}
        <div className="text-left">
          <div className="text-sm uppercase tracking-widest opacity-80">Upgrade to Premium</div>
          <div className="text-xl">₱79.00 <span className="text-xs opacity-80">/ month</span></div>
        </div>
      </button>

      {error && (
        <p className="text-red-500 text-xs mt-2 font-bold text-center bg-red-50 p-2 rounded-lg italic">
          {error}
        </p>
      )}

      <p className="text-[10px] text-slate-500 mt-3 text-center font-medium leading-relaxed">
        Unlock advanced AI routing, offline maps, and priority emergency alerts.
      </p>
    </div>
  );
};