import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  Zap, 
  AlertTriangle,
  MapPin,
  Activity,
  Sparkles,
  Minimize2,
  Key
} from 'lucide-react';
import { getSafetyGuidance } from '../services/gemini';
import { translations } from '../translations';

// Extend window interface for AI Studio tools
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isQuotaError?: boolean;
}

interface AISafetyCoreProps {
  onBack: () => void;
  userBarangay: string;
  language?: 'en' | 'tl';
  isPremium?: boolean;
  isFloating?: boolean;
  onMinimize?: () => void;
}

export const AISafetyCore: React.FC<AISafetyCoreProps> = ({ 
  onBack, 
  userBarangay, 
  language = 'en', 
  isPremium = false,
  isFloating = false,
  onMinimize
}) => {
  const t = translations[language];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t.aiWelcomeMessage.replace('{barangay}', userBarangay),
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasOwnKey, setHasOwnKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasOwnKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasOwnKey(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Convert messages to Gemini history format
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      // Add the current user message to history
      history.push({
        role: 'user',
        parts: [{ text: input }]
      });

      const response = await getSafetyGuidance(input, userBarangay, history);
      
      const aiMsg: Message = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
        text: response || t.aiProcessingRequest,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      const isQuota = error.message?.toLowerCase().includes("quota") || error.message?.includes("429") || error.message?.includes("Failed to fetch");
      
      if (!isQuota) {
        console.error("AI Error:", error);
      }
      
      const errorMsg: Message = {
        id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
        text: isQuota 
          ? "The shared AI quota has been exceeded. To continue with uninterrupted service, please connect your own Gemini API key."
          : "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'ai',
        timestamp: new Date(),
        isQuotaError: isQuota
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (isMinimized && isFloating) {
    return (
      <motion.button
        layoutId="ai-core-container"
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-2xl z-[4000] flex items-center justify-center border-4 border-white dark:border-slate-900"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Shield size={24} />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></div>
      </motion.button>
    );
  }

  return (
    <motion.div 
      layoutId="ai-core-container"
      className={`${isFloating ? 'fixed bottom-24 right-6 left-6 top-20 sm:left-auto sm:w-96 sm:top-auto sm:bottom-24 sm:h-[600px]' : 'fixed inset-0'} bg-[#001529] dark:bg-slate-950 z-[3000] flex flex-col text-white font-sans transition-all rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border border-white/10`}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-[#002147]/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {!isFloating && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white/10 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Shield className="text-emerald-400" size={18} />
                {t.aiSafetyCoreTitle}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">{t.aiActiveStatus}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFloating && (
            <button 
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-white/10 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Minimize2 size={18} />
            </button>
          )}
          <button 
            onClick={handleSelectKey}
            className={`p-2 rounded-xl transition-colors ${hasOwnKey ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-white/10 dark:hover:bg-slate-800 text-blue-400'}`}
            title={hasOwnKey ? "Personal API Key Connected" : "Connect Personal API Key"}
          >
            <Key size={18} />
          </button>
          <div className="bg-white/10 dark:bg-slate-800 p-2 rounded-xl">
            <Activity size={18} className="text-blue-400" />
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 dark:bg-blue-500 text-white rounded-tr-none' 
                  : msg.isQuotaError 
                    ? 'bg-amber-500/20 border border-amber-500/50 text-amber-200 rounded-tl-none'
                    : 'bg-white/10 dark:bg-slate-800/50 backdrop-blur-md text-blue-50 rounded-tl-none border border-white/5 dark:border-slate-700'
              }`}>
                {msg.sender === 'ai' && (
                  <div className="flex items-center gap-2 mb-2 opacity-50">
                    <Sparkles size={12} />
                    <span className="text-[10px] font-bold uppercase">{t.aiIntelligence}</span>
                  </div>
                )}
                <div className="text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>
                    {msg.text}
                  </ReactMarkdown>
                </div>
                
                {msg.isQuotaError && (
                  <button
                    onClick={handleSelectKey}
                    className="mt-4 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Key size={14} />
                    Connect Your Own API Key
                  </button>
                )}

                <p className="text-[10px] mt-2 opacity-40 font-medium">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2 p-4 bg-white/5 dark:bg-slate-800/50 rounded-2xl w-fit"
          >
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { icon: <AlertTriangle size={14} />, label: t.floodRisk },
          { icon: <MapPin size={14} />, label: t.nearestShelter },
          { icon: <Zap size={14} />, label: t.faultLineInfo }
        ].map((action, i) => (
          <button 
            key={i}
            onClick={() => setInput(action.label)}
            className="flex-shrink-0 bg-white/5 dark:bg-slate-800 hover:bg-white/10 dark:hover:bg-slate-700 border border-white/10 dark:border-slate-700 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-[#002147]/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-white/10 dark:border-slate-800">
        <div className="relative flex items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t.aiInputPlaceholder}
            className="w-full bg-white/10 dark:bg-slate-800 border border-white/20 dark:border-slate-700 rounded-2xl py-4 pl-6 pr-16 text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-white/30 dark:placeholder:text-slate-500"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-3 bg-blue-600 dark:bg-blue-500 hover:bg-blue-500 dark:hover:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-500 rounded-xl transition-all"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-center mt-4 text-white/30 dark:text-slate-500 font-medium">
          {t.aiDisclaimer}
        </p>
      </div>
    </motion.div>
  );
};
