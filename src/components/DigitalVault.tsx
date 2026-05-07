import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Download, 
  Lock, 
  FileDigit, 
  UserPlus,
  X,
  Loader2,
  AlertCircle,
  Share2,
  Camera,
  Image as ImageIcon,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { translations } from '../translations';

interface VaultItem {
  id: string;
  user_id: string;
  name: string;
  type: 'ID' | 'Certificate' | 'Contact' | 'Image' | 'Other';
  content: string;
  created_at: any;
}

export const DigitalVault: React.FC<{ 
  user: any, 
  onBack: () => void, 
  language?: 'en' | 'tl',
  subscriptionStatus?: 'free' | 'premium',
  onUpgradeNeeded?: () => void
}> = ({ 
  user, 
  onBack, 
  language = 'en',
  subscriptionStatus = 'free',
  onUpgradeNeeded
}) => {
  const t = translations[language];
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState<{ name: string; type: VaultItem['type']; content: string }>({ 
    name: '', 
    type: 'ID', 
    content: '' 
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      if (err?.message?.includes('Refresh Token')) {
        await supabase.auth.signOut().catch(() => {});
        return;
      }
      if (err?.message?.includes('Failed to fetch')) console.warn('Network Error fetching vault items');
      else console.error('Error fetching vault items:', err);
      const msg = typeof err.message === 'string' && err.message.includes('Failed to fetch')
        ? 'Network error: Unable to connect to the digital vault server.' 
        : err.message || 'Failed to load vault items. Please check your permissions.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subscriptionStatus === 'free') {
      onUpgradeNeeded?.();
      return;
    }
    if (!newItem.name || (!newItem.content && !selectedImage)) return;
    if (!user) return;

    try {
      setIsSubmitting(true);
      const finalContent = newItem.type === 'Image' ? (selectedImage || '') : newItem.content;
      
      const { error } = await supabase
        .from('vault_items')
        .insert([{
          user_id: user.id,
          name: newItem.name,
          type: newItem.type,
          content: finalContent
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setNewItem({ name: '', type: 'ID', content: '' });
      setSelectedImage(null);
      fetchItems();
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch')) console.warn('Network Error adding vault item');
      else console.error('Error adding vault item:', err);
      alert('Error adding item: ' + (err?.message?.includes('Failed to fetch') ? 'Network error' : err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm(t.deleteConfirm)) return;

    try {
      const { error } = await supabase
        .from('vault_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchItems();
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch')) console.warn('Network Error deleting vault item');
      else console.error('Error deleting vault item:', err);
      alert('Error deleting item: ' + (err?.message?.includes('Failed to fetch') ? 'Network error' : err.message));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ID': return <FileDigit size={20} />;
      case 'Certificate': return <FileText size={20} />;
      case 'Contact': return <UserPlus size={20} />;
      case 'Image': return <Camera size={20} />;
      default: return <ShieldCheck size={20} />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'ID': return t.vaultTypeID;
      case 'Certificate': return t.vaultTypeCertificate;
      case 'Contact': return t.vaultTypeContact;
      case 'Image': return t.vaultTypeImage;
      default: return t.vaultTypeOther;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setNewItem(prev => ({ ...prev, type: 'Image' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-8 pb-32 bg-white dark:bg-slate-900 transition-colors">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95 transition-all"
        >
          <X size={20} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-[#002147] dark:text-white flex items-center gap-3">
            <Lock className="text-blue-600 dark:text-blue-400" />
            {t.vaultTitle}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{t.vaultSubtitle}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-md group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Search size={18} />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.vaultSearchPlaceholder}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white dark:focus:bg-slate-800 rounded-2xl py-4 pl-14 pr-6 font-bold text-slate-800 dark:text-white transition-all outline-none"
          />
        </div>
        <button 
          onClick={() => subscriptionStatus === 'free' ? onUpgradeNeeded?.() : setShowAddModal(true)}
          className="w-full sm:w-auto bg-blue-600 dark:bg-blue-500 text-white p-4 rounded-2xl shadow-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2 font-bold shrink-0"
        >
          <Plus size={20} />
          {t.addItem}
        </button>
      </div>

      {subscriptionStatus === 'free' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[32px] p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <ShieldCheck size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Premium Feature
              </span>
            </div>
            <h3 className="text-xl font-black mb-2">{t.pitchVaultTitle}</h3>
            <p className="text-sm text-blue-100 font-medium mb-6 max-w-md">
              {t.upsellVault}
            </p>
            <button
              onClick={onUpgradeNeeded}
              className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-50 transition-colors active:scale-95"
            >
              {t.upgradeNow}
            </button>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400">
          <AlertCircle className="shrink-0" size={20} />
          <div className="text-sm font-medium">
            <p className="font-bold">Database Setup Required</p>
            <p className="opacity-80">{error}</p>
            <div className="mt-3 bg-white/50 dark:bg-black/20 p-3 rounded-xl font-mono text-[10px] overflow-x-auto">
              CREATE TABLE vault_items (<br/>
              &nbsp;&nbsp;id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,<br/>
              &nbsp;&nbsp;user_id UUID REFERENCES auth.users(id),<br/>
              &nbsp;&nbsp;name TEXT NOT NULL,<br/>
              &nbsp;&nbsp;type TEXT CHECK (type IN ('ID', 'Certificate', 'Contact', 'Image', 'Other')),<br/>
              &nbsp;&nbsp;content TEXT NOT NULL,<br/>
              &nbsp;&nbsp;created_at TIMESTAMPTZ DEFAULT NOW()<br/>
              );
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">{t.accessingVault}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[40px] py-20 flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-sm flex items-center justify-center text-slate-300 dark:text-slate-600 mb-6">
            <ShieldCheck size={40} />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white">
            {searchQuery ? t.noMatchingItems : t.vaultEmpty}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mt-2 font-medium">
            {searchQuery ? t.tryDifferentSearch : t.vaultEmptySubtitle}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <motion.div 
              layout
              key={item.id}
              className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${
                  item.type === 'ID' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                  item.type === 'Certificate' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                  item.type === 'Contact' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                  item.type === 'Image' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' :
                  'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                }`}>
                  {getTypeIcon(item.type)}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: item.name,
                          text: `Secure Document Info: ${item.name}\n${item.content}`,
                        }).catch((error) => console.log('Share error:', error));
                      } else {
                        alert(t.copiedToClipboard);
                        navigator.clipboard.writeText(`${item.name}: ${item.content}`);
                      }
                    }}
                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Share2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <h4 className="font-black text-slate-800 dark:text-white text-lg">{item.name}</h4>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">{getTypeText(item.type)}</p>
              
              {item.type === 'Image' ? (
                <div 
                  className="mb-4 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer group/img relative"
                  onClick={() => setSelectedImage(item.content)}
                >
                  <img src={item.content} alt={item.name} className="w-full h-48 object-cover transition-transform group-hover/img:scale-105" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <Search className="text-white" size={24} />
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-sm font-medium text-slate-600 dark:text-slate-300 break-all line-clamp-3">
                  {item.content}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">
                  {t.addedOn} {new Date(item.created_at).toLocaleDateString()}
                </span>
                <button 
                  onClick={() => {
                    if (item.type === 'Image') {
                      const link = document.createElement('a');
                      link.href = item.content;
                      link.download = `${item.name}.png`;
                      link.click();
                    } else {
                      const blob = new Blob([item.content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${item.name}.txt`;
                      a.click();
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 font-black text-xs flex items-center gap-1 hover:underline"
                >
                  <Download size={14} />
                  {t.export}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[40px] p-8 shadow-2xl space-y-6 border border-slate-100 dark:border-slate-700"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-[#002147] dark:text-white">{t.addToVault}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.documentName}</label>
                  <input 
                    type="text" 
                    required
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder={t.documentNamePlaceholder}
                    className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.type}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ID', 'Certificate', 'Contact', 'Image', 'Other'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewItem({ ...newItem, type })}
                        className={`py-3 rounded-xl font-bold text-sm transition-all ${
                          newItem.type === type 
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {getTypeText(type)}
                      </button>
                    ))}
                  </div>
                </div>

                {newItem.type === 'Image' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.uploadPicture}</label>
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="vault-image-upload"
                      />
                      <label 
                        htmlFor="vault-image-upload"
                        className="w-full aspect-video bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden"
                      >
                        {selectedImage ? (
                          <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Camera className="text-slate-300 dark:text-slate-600 mb-2" size={32} />
                            <span className="text-xs font-bold text-slate-400">{t.clickToUpload}</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.infoContent}</label>
                    <textarea 
                      required
                      value={newItem.content}
                      onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                      placeholder={t.infoContentPlaceholder}
                      className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-white min-h-[120px]"
                    />
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 dark:bg-blue-500 text-white py-5 rounded-2xl font-black shadow-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
                  {t.saveToVault}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Screen Image Viewer */}
      <AnimatePresence>
        {selectedImage && !showAddModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/95 flex flex-col items-center justify-center p-4"
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Full view" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            />
            <div className="mt-6 flex gap-4">
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedImage;
                  link.download = `vault_image_${Date.now()}.png`;
                  link.click();
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2"
              >
                <Download size={20} />
                {t.downloadImage}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
