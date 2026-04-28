import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const AccordionSection = ({ id, title, children, icon, isOpen, onToggle, badge, subtitle }) => {
  return (
    <div className="border-b border-hazard-white/10 last:border-0">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 md:py-5 text-left transition-colors group"
      >
        <div className="flex items-center gap-4">
          <span className={isOpen ? "text-jelly-mint" : "text-secondary-text group-hover:text-hazard-white"}>{icon}</span>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`verge-label-mono text-[10px] ${isOpen ? 'text-hazard-white' : 'text-secondary-text group-hover:text-hazard-white'}`}>{title}</span>
              {badge > 0 && (
                <span className="bg-jelly-mint text-absolute-black text-[9px] font-black px-2 py-0.5 rounded-[2px] leading-none">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && !isOpen && (
              <span className="verge-label-mono text-[8px] text-secondary-text mt-1 lowercase truncate max-w-[180px]">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className={isOpen ? "text-jelly-mint" : "text-secondary-text"}>
          <ChevronDown size={14} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0, overflow: "hidden" }} 
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: "visible" } }} 
            exit={{ height: 0, opacity: 0, overflow: "hidden" }}
          >
            <div className="pb-8 pt-2 h-full">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccordionSection;
