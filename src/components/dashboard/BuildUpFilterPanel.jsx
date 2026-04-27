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

/**
 * BuildUpFilterPanel - Squelette du panneau de filtrage latéral pour les séquences
 */
const BuildUpFilterPanel = ({ onClose }) => {
  const [openSection, setOpenSection] = useState('sequential');

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
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
          <button className="verge-label-mono text-[10px] text-[#949494] hover:text-white uppercase font-black transition-colors flex items-center gap-2">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="verge-label-mono text-[8px] text-[#949494]">Min. Passes</label>
                <input type="number" placeholder="5" className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white" />
              </div>
              <div className="space-y-2">
                <label className="verge-label-mono text-[8px] text-[#949494]">Min. Actions</label>
                <input type="number" placeholder="8" className="w-full bg-[#131313] border border-white/10 p-3 verge-label-mono text-[10px] text-white" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="verge-label-mono text-[9px] text-white uppercase font-black">Score xT Séquence</label>
                <span className="verge-label-mono text-[10px] text-[#5200ff] font-black">0.250+</span>
              </div>
              <input type="range" className="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-[#5200ff]" />
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
             {[
               'Départ Zone Défensive',
               'Atteint Zone Offensive',
               'Séquence avec Tir',
               'Contre-attaques'
             ].map(opt => (
               <div key={opt} className="flex items-center justify-between p-4 bg-[#2d2d2d]/30 border border-white/5 rounded-[2px] group cursor-pointer hover:border-[#5200ff]/30 transition-all">
                 <span className="verge-label-mono text-[10px] text-white uppercase">{opt}</span>
                 <div className="w-4 h-4 border border-white/20 rounded-[2px] group-hover:border-[#5200ff]" />
               </div>
             ))}
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
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#949494]" />
              <input type="text" placeholder="JOUEURS IMPLIQUÉS..." className="w-full bg-[#131313] border border-white/10 py-4 pl-12 pr-4 verge-label-mono text-[10px] text-white outline-none" />
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#949494]" />
              <input type="text" placeholder="JOUEURS EXCLUS..." className="w-full bg-[#131313] border border-white/10 py-4 pl-12 pr-4 verge-label-mono text-[10px] text-white outline-none" />
            </div>
          </div>
        </AccordionSection>

      </div>

      {/* FOOTER : APPLY BUTTON */}
      <div className="p-10 bg-[#131313] border-t border-white/10">
        <button className="w-full bg-[#5200ff] text-white py-6 rounded-[2px] verge-label-mono text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-white hover:text-black transition-all">
          Analyser les séquences
          <Check size={18} />
        </button>
      </div>
    </aside>
  );
};

export default BuildUpFilterPanel;
