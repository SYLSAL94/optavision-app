import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const AccordionSection = ({ id, title, icon, isOpen, onToggle, badge, subtitle, children }) => {
  return (
    <div className={`border-b border-white/5 last:border-0 pb-4 ${isOpen ? 'mb-4' : ''}`}>
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between py-6 group text-left"
      >
        <div className="flex items-center gap-6">
          <div className={`w-12 h-12 flex items-center justify-center rounded-[2px] transition-all duration-300 ${
            isOpen ? 'bg-[#3cffd0] text-black shadow-[0_0_20px_rgba(60,255,208,0.2)]' : 'bg-[#2d2d2d] text-[#949494] border border-white/5 group-hover:border-[#3cffd0]/50 group-hover:text-white'
          }`}>
            {icon}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <h4 className={`verge-label-mono text-[11px] font-black uppercase tracking-widest transition-colors ${isOpen ? 'text-[#3cffd0]' : 'text-white'}`}>
                {title}
              </h4>
              {badge > 0 && (
                <span className="bg-[#3cffd0] text-black text-[9px] font-black px-2 py-0.5 rounded-[1px] min-w-[18px] text-center">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <span className="verge-label-mono text-[8px] text-[#949494] mt-1.5 uppercase tracking-wider opacity-60">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <motion.div 
          animate={{ rotate: isOpen ? 180 : 0 }}
          className={isOpen ? "text-[#3cffd0]" : "text-[#949494] group-hover:text-white"}
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="w-full"
          >
            <div className="pt-4 pb-8 space-y-8 pl-[72px]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccordionSection;
