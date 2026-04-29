import React, { useState } from 'react';
import { 
  TrendingUp, 
  RotateCcw, 
  Check,
  Search,
  ChevronDown,
  Users,
  Database,
  Zap,
  Layout
} from 'lucide-react';
import AccordionSection from './AccordionSection';
import MultiSelectWithChips from '../ui/MultiSelectWithChips';

/**
 * BuildUpFilterPanel - Squelette du panneau de filtrage latéral pour les séquences
 */
const BuildUpFilterPanel = ({ matchId, playersList = [], onApply, onClose }) => {
  const [openSection, setOpenSection] = useState('sequential');
  const [pendingFilters, setPendingFilters] = useState({
    min_passes: 0,
    min_score: 0.0,
    has_shot: false,
    is_fast_break: false,
    silo: null
  });

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  const updateFilter = (key, value) => {
    setPendingFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <aside className="w-[450px] h-full flex flex-col bg-[#131313] border-l border-white/10 shadow-2xl">
      
      {/* HEADER SECTION */}
      <div className="p-10 pb-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-10">
          <div className="flex flex-col">
            <h3 className="verge-h3 text-white flex items-center gap-4">
              <TrendingUp size={22} className="text-[#5200ff]" />
              FILTRAGE SÉQUENCES
            </h3>
            <p className="verge-label-mono text-[9px] text-[#949494] mt-2 uppercase tracking-widest">Analyse du Build-up collectif</p>
          </div>
          <button 
            onClick={() => setPendingFilters({ min_passes: 0, min_score: 0.0, has_shot: false, is_fast_break: false, silo: null })}
            className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black transition-colors flex items-center gap-2"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* CONTENT : ACCORDIONS */}
      <div className="flex-1 overflow-y-auto p-10 pt-6 space-y-2 scrollbar-verge">
        
        {/* SECTION 1 : SÉQUENTIEL */}
        <AccordionSection 
          id="sequential" 
          title="Métriques de Chaîne" 
          icon={<Database size={18} />}
          isOpen={openSection === 'sequential'}
          onToggle={() => toggleSection('sequential')}
          subtitle="VOLUME & DÉBIT"
        >
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="verge-label-mono text-[9px] text-[#949494]">Min. Passes</label>
                <span className="verge-label-mono text-[10px] text-white font-black">{pendingFilters.min_passes}</span>
              </div>
              <input 
                type="range" min="0" max="30" step="1" 
                value={pendingFilters.min_passes} 
                onChange={(e) => updateFilter('min_passes', parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-[#5200ff]" 
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="verge-label-mono text-[9px] text-[#949494]">Min. Actions</label>
                <span className="verge-label-mono text-[10px] text-white font-black">{pendingFilters.min_actions}</span>
              </div>
              <input 
                type="range" min="0" max="30" step="1" 
                value={pendingFilters.min_actions} 
                onChange={(e) => updateFilter('min_actions', parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-[#5200ff]" 
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="verge-label-mono text-[9px] text-[#949494]">Min. Actions Progressives</label>
                <span className="verge-label-mono text-[10px] text-white font-black">{pendingFilters.min_prog}</span>
              </div>
              <input 
                type="range" min="0" max="15" step="1" 
                value={pendingFilters.min_prog} 
                onChange={(e) => updateFilter('min_prog', parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-[#5200ff]" 
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="verge-label-mono text-[9px] text-white uppercase font-black">Score xT Séquence (Min)</label>
                <span className="verge-label-mono text-[10px] text-[#5200ff] font-black">{pendingFilters.min_score.toFixed(1)}</span>
              </div>
              <input 
                type="range" min="0" max="50" step="0.5" 
                value={pendingFilters.min_score} 
                onChange={(e) => updateFilter('min_score', parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-[#5200ff]" 
              />
            </div>
          </div>
        </AccordionSection>

        {/* SECTION 2 : TACTIQUE */}
        <AccordionSection 
          id="tactical" 
          title="Contexte Tactique" 
          icon={<Layout size={18} />}
          isOpen={openSection === 'tactical'}
          onToggle={() => toggleSection('tactical')}
          subtitle="PHASES DE JEU"
        >
          <div className="space-y-4">
             {/* Séquence avec Tir Toggle */}
             <div 
               onClick={() => updateFilter('has_shot', !pendingFilters.has_shot)}
               className={`flex items-center justify-between p-4 border rounded-[2px] cursor-pointer transition-all ${pendingFilters.has_shot ? 'bg-[#5200ff]/20 border-[#5200ff]' : 'bg-[#2d2d2d]/30 border-white/5 hover:border-white/20'}`}
             >
               <span className="verge-label-mono text-[10px] text-white uppercase">Séquence avec Tir / But</span>
               <div className={`w-4 h-4 border rounded-[2px] flex items-center justify-center ${pendingFilters.has_shot ? 'bg-[#5200ff] border-[#5200ff]' : 'border-white/20'}`}>
                 {pendingFilters.has_shot && <Check size={12} className="text-white" />}
               </div>
             </div>
             
             {/* Départ Zone Défensive Toggle */}
             <div 
               onClick={() => updateFilter('starts_own', !pendingFilters.starts_own)}
               className={`flex items-center justify-between p-4 border rounded-[2px] cursor-pointer transition-all ${pendingFilters.starts_own ? 'bg-[#5200ff]/20 border-[#5200ff]' : 'bg-[#2d2d2d]/30 border-white/5 hover:border-white/20'}`}
             >
               <span className="verge-label-mono text-[10px] text-white uppercase">Départ Zone Défensive</span>
               <div className={`w-4 h-4 border rounded-[2px] flex items-center justify-center ${pendingFilters.starts_own ? 'bg-[#5200ff] border-[#5200ff]' : 'border-white/20'}`}>
                 {pendingFilters.starts_own && <Check size={12} className="text-white" />}
               </div>
             </div>
             
             {/* Atteint Zone Offensive Toggle */}
             <div 
               onClick={() => updateFilter('reaches_opp', !pendingFilters.reaches_opp)}
               className={`flex items-center justify-between p-4 border rounded-[2px] cursor-pointer transition-all ${pendingFilters.reaches_opp ? 'bg-[#5200ff]/20 border-[#5200ff]' : 'bg-[#2d2d2d]/30 border-white/5 hover:border-white/20'}`}
             >
               <span className="verge-label-mono text-[10px] text-white uppercase">Atteint Zone Offensive</span>
               <div className={`w-4 h-4 border rounded-[2px] flex items-center justify-center ${pendingFilters.reaches_opp ? 'bg-[#5200ff] border-[#5200ff]' : 'border-white/20'}`}>
                 {pendingFilters.reaches_opp && <Check size={12} className="text-white" />}
               </div>
             </div>
             
             {/* Contre-attaques Toggle */}
             <div 
               onClick={() => updateFilter('is_fast_break', !pendingFilters.is_fast_break)}
               className={`flex items-center justify-between p-4 border rounded-[2px] cursor-pointer transition-all ${pendingFilters.is_fast_break ? 'bg-[#5200ff]/20 border-[#5200ff]' : 'bg-[#2d2d2d]/30 border-white/5 hover:border-white/20'}`}
             >
               <span className="verge-label-mono text-[10px] text-white uppercase">Contre-attaques Rapides</span>
               <div className={`w-4 h-4 border rounded-[2px] flex items-center justify-center ${pendingFilters.is_fast_break ? 'bg-[#5200ff] border-[#5200ff]' : 'border-white/20'}`}>
                 {pendingFilters.is_fast_break && <Check size={12} className="text-white" />}
               </div>
             </div>

             {/* Filtrage SILOS */}
             <div className="pt-6 space-y-4">
                <div className="flex items-center gap-4">
                   <div className="w-1 h-3 bg-[#5200ff]" />
                   <label className="verge-label-mono text-[9px] text-[#949494] uppercase tracking-widest">Silos Tactiques</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                   {['Build-Up', 'Progression', 'Danger', 'Finish'].map(s => (
                     <button 
                       key={s}
                       onClick={() => updateFilter('silo', pendingFilters.silo === s ? null : s)}
                       className={`py-4 px-2 border rounded-[2px] verge-label-mono text-[9px] uppercase font-black transition-all ${pendingFilters.silo === s ? 'bg-[#5200ff] border-[#5200ff] text-white' : 'bg-white/5 border-white/10 text-[#949494] hover:border-white/30'}`}
                     >
                       {s}
                     </button>
                   ))}
                </div>
             </div>
          </div>
        </AccordionSection>

        {/* SECTION 3 : JOUEURS */}
        <AccordionSection 
          id="players" 
          title="Implication Joueurs" 
          icon={<Users size={18} />}
          isOpen={openSection === 'players'}
          onToggle={() => toggleSection('players')}
          subtitle="RÔLES INDIVIDUELS"
        >
          <div className="space-y-6">
            <MultiSelectWithChips 
              label="Joueurs Impliqués" 
              options={playersList} 
              selected={pendingFilters.involved_player_id || []} 
              onChange={(vals) => updateFilter('involved_player_id', vals)} 
              placeholder="Chercher joueur..." 
            />
            <MultiSelectWithChips 
              label="Joueurs Exclus" 
              options={playersList} 
              selected={pendingFilters.excluded_player_id || []} 
              onChange={(vals) => updateFilter('excluded_player_id', vals)} 
              placeholder="Chercher joueur..." 
            />
          </div>
        </AccordionSection>
      </div>

      {/* FOOTER : APPLY BUTTON */}
      <div className="p-10 bg-[#131313] border-t border-white/10">
        <button 
          onClick={() => {
            if (onApply) onApply(pendingFilters);
            if (onClose) onClose();
          }}
          className="w-full bg-[#5200ff] text-white py-6 rounded-[2px] verge-label-mono text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-white hover:text-black transition-all"
        >
          Analyser les séquences
          <Check size={18} />
        </button>
      </div>
    </aside>
  );
};

export default BuildUpFilterPanel;
