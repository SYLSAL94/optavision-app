import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const GlobalVideoPlayer = ({ url, onClose, title = "OptaVision Elite Video Feed" }) => {
  return (
    <AnimatePresence>
      {url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-12"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-6xl bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
          >
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="verge-label-mono text-[10px] text-white font-black uppercase tracking-[0.2em]">{title}</span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-red-500 rounded-full text-white transition-all group"
              >
                <X size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
              <span className="verge-label-mono text-[8px] text-[#949494] uppercase tracking-[0.4em] opacity-50">
                Cloudflare R2 Zero-Disk Streaming
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalVideoPlayer;
