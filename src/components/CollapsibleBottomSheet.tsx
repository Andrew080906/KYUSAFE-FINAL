import React, { useState, useEffect } from 'react';
import { motion, PanInfo, AnimatePresence } from 'motion/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: (isExpanded: boolean) => React.ReactNode;
  header: (isExpanded: boolean) => React.ReactNode;
  collapsedHeight?: number;
  expandedHeight?: string;
  onExpandChange?: (isExpanded: boolean) => void;
}

export const CollapsibleBottomSheet: React.FC<BottomSheetProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  header,
  collapsedHeight = 120,
  expandedHeight = '80vh',
  onExpandChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset expansion state when closed
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
      onExpandChange?.(false);
    }
  }, [isOpen, onExpandChange]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    // If dragged up significantly
    if (info.offset.y < -50) {
      setIsExpanded(true);
      onExpandChange?.(true);
    } 
    // If dragged down significantly
    else if (info.offset.y > 50) {
      if (isExpanded) {
        setIsExpanded(false);
        onExpandChange?.(false);
      } else {
        // Optional: Close if dragged down while collapsed
        // onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ 
        y: 0, 
        height: isExpanded ? expandedHeight : collapsedHeight 
      }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      className="fixed bottom-0 left-0 right-0 z-[3000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-t-[40px] shadow-[0_-20px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden touch-none"
    >
      {/* Drag Handle Area */}
      <div 
        className="w-full flex flex-col items-center pt-4 pb-2 cursor-grab active:cursor-grabbing"
        onClick={() => {
          const next = !isExpanded;
          setIsExpanded(next);
          onExpandChange?.(next);
        }}
      >
        <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mb-4" />
        
        {/* Header (Always Visible) */}
        <div className="w-full px-6">
          {header(isExpanded)}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-10 scrollbar-hide">
        {children(isExpanded)}
      </div>
    </motion.div>
  );
};
