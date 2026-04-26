import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Film, ArrowLeft, Plus, Settings } from 'lucide-react';
import MatchSelector from './MatchSelector';
import EventExplorer from './EventExplorer';
import { OPTAVISION_API_URL } from '../../config';

const OptaVisionDashboard = () => {
  const [view, setView] = useState('SELECTION'); // SELECTION, EDITOR
  const [selectedMatch, setSelectedMatch] = useState(null);

  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
    setView('EDITOR');
  };

  const handleBackToSelection = () => {
    setView('SELECTION');
    setSelectedMatch(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-[1700px] mx-auto w-full p-8 md:p-12"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-[#3cffd0] text-black rounded-[4px] flex items-center justify-center">
              <Film size={20} />
            </div>
            <h1 className="verge-h1 text-white uppercase tracking-tighter">
              OPTA<span className="text-[#3cffd0]">VISION</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 bg-[#3cffd0] animate-pulse rounded-full" />
             <p className="verge-label-mono text-[10px] text-[#949494] tracking-[0.3em] font-black uppercase">
               Independent Video Intelligence • {view === 'SELECTION' ? 'Exploration Data' : 'Configuration Clip'}
             </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {view === 'EDITOR' && (
            <button 
              onClick={handleBackToSelection}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-full verge-label-mono text-[10px] text-white hover:bg-white/10 transition-all flex items-center gap-3 group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
              RETOUR À LA SÉLECTION
            </button>
          )}
          <button className="p-3 bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-[#3cffd0] transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {view === 'SELECTION' ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex justify-between items-center mb-10">
              <h2 className="verge-h2 text-white/60 uppercase">SÉLECTIONNER UN <span className="text-white">MATCH OPTA</span></h2>
              <button 
                onClick={() => setView('EDITOR')}
                className="btn-verge-primary px-8 py-3 text-[10px] flex items-center gap-3"
              >
                <Plus size={16} /> CONFIGURATION MANUELLE
              </button>
            </div>
            <MatchSelector onSelect={handleMatchSelect} />
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
          >
            {selectedMatch ? (
              <div className="space-y-12">
                 <div className="bg-[#131313] border border-[#3cffd0]/20 rounded-[24px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3cffd0 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                    <div className="flex items-center gap-6 relative z-10">
                       <div className="w-14 h-14 bg-white/5 rounded-[16px] flex items-center justify-center border border-white/10">
                          <Plus className="text-[#3cffd0] rotate-45" size={24} />
                       </div>
                       <div>
                          <h2 className="verge-h2 text-white uppercase tracking-tight">{selectedMatch.match_name}</h2>
                          <p className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-[0.2em] font-black">
                            {selectedMatch.id} • OPTA F24 DATA FEED • R2 SYNCED
                          </p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                       <div className="text-right hidden xl:block">
                          <p className="verge-label-mono text-[9px] text-[#3cffd0] uppercase font-black tracking-widest mb-1">Moteur Vidéo</p>
                          <p className="verge-label-mono text-[11px] text-white">READY FOR RENDER</p>
                       </div>
                       <div className="w-[1px] h-10 bg-white/10 hidden xl:block mx-4" />
                       <button className="btn-verge-primary px-8 py-3 text-[10px]">CONFIGURER PARAMÈTRES</button>
                    </div>
                 </div>
                 <EventExplorer matchId={selectedMatch.id} matchName={selectedMatch.match_name} />
              </div>
            ) : (
              <div className="bg-[#131313] border border-white/10 rounded-[24px] p-20 text-center">
                 <p className="verge-label-mono text-[14px] text-[#949494]">Formulaire de configuration manuelle à implémenter...</p>
                 <button onClick={handleBackToSelection} className="mt-8 btn-verge-primary px-12 py-4 text-[12px]">RETOUR</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default OptaVisionDashboard;
